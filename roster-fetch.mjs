export const DEFAULT_RETRY_CONFIG = {
  retries: 1,
  baseDelayMs: 300,
  timeoutMs: 8000,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildStructuredRosterError({ endpoint, statusCode, message, teamAbbr, source, attempt }) {
  return {
    timestamp: new Date().toISOString(),
    endpoint,
    statusCode,
    team: teamAbbr,
    source,
    attempt,
    message,
  };
}

function assertFiniteInRange(value, min, max, field, teamAbbr) {
  if (value === null || value === undefined) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${teamAbbr} has invalid ${field}: expected number in [${min}, ${max}]`);
  }
}

export function validateRosterPayload(teamAbbr, players, minRosterSize = 8) {
  if (!Array.isArray(players)) {
    throw new Error(`Invalid roster payload for ${teamAbbr}: players must be an array`);
  }
  if (players.length < minRosterSize) {
    throw new Error(`Invalid roster payload for ${teamAbbr}: expected at least ${minRosterSize} players, got ${players.length}`);
  }

  const missingTeamRows = players.filter((p) => p?.team !== teamAbbr).length;
  if (missingTeamRows > 0) {
    throw new Error(`Invalid roster payload for ${teamAbbr}: contains ${missingTeamRows} players mapped to another team`);
  }

  if (teamAbbr === "MIN") {
    for (const [idx, player] of players.entries()) {
      if (!player || typeof player !== "object") {
        throw new Error(`MIN roster row ${idx} is not an object`);
      }
      if (typeof player.name !== "string" || player.name.trim().length === 0) {
        throw new Error(`MIN roster row ${idx} has invalid name`);
      }
      if (typeof player.pos !== "string" || player.pos.trim().length === 0) {
        throw new Error(`MIN roster row ${idx} has invalid position`);
      }

      assertFiniteInRange(player.ftbPct, 0, 100, "ftbPct", "MIN");
      assertFiniteInRange(player.usageRate, 0, 100, "usageRate", "MIN");
      assertFiniteInRange(player.ppg, 0, 100, "ppg", "MIN");
      assertFiniteInRange(player.gp, 0, 110, "gp", "MIN");
    }
  }

  return { teamAbbr, players };
}

export async function fetchAndValidateRoster({
  teamAbbr,
  source,
  log = () => {},
  retryConfig = DEFAULT_RETRY_CONFIG,
}) {
  const retries = retryConfig?.retries ?? DEFAULT_RETRY_CONFIG.retries;
  const baseDelayMs = retryConfig?.baseDelayMs ?? DEFAULT_RETRY_CONFIG.baseDelayMs;

  let lastError;

  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      const result = await source.fetch(teamAbbr, retryConfig);
      const statusCode = Number(result?.statusCode ?? 0);
      const endpoint = result?.endpoint || source.endpoint || "unknown-endpoint";

      if (statusCode < 200 || statusCode >= 300) {
        throw new Error(`HTTP ${statusCode}`);
      }

      const validated = validateRosterPayload(teamAbbr, result?.players || []);
      return {
        ...validated,
        endpoint,
        statusCode,
        source: source.name,
      };
    } catch (error) {
      lastError = error;
      const diagnostic = buildStructuredRosterError({
        endpoint: source.endpoint || "unknown-endpoint",
        statusCode: Number(error?.statusCode || 0) || undefined,
        message: error?.message || "Unknown roster fetch error",
        teamAbbr,
        source: source.name,
        attempt,
      });
      log(`Roster fetch error ${JSON.stringify(diagnostic)}`, "error");

      if (attempt <= retries) {
        await sleep(baseDelayMs * attempt);
      }
    }
  }

  throw new Error(`Failed to fetch validated roster for ${teamAbbr} from ${source.name}: ${lastError?.message || "unknown"}`);
}

export function atomicUpdateRosterCache(cache, teamAbbr, players, fetchedAt = Date.now()) {
  validateRosterPayload(teamAbbr, players);
  return {
    ...cache,
    [teamAbbr]: {
      players,
      fetchedAt,
    },
  };
}
