const DAY_MS = 24 * 60 * 60 * 1000;

export function isSameUtcDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getUTCFullYear() === db.getUTCFullYear() && da.getUTCMonth() === db.getUTCMonth() && da.getUTCDate() === db.getUTCDate();
}

export function buildUpdateLog({ endpoint, statusCode, message, teamAbbr, updateType, attempt }) {
  return {
    timestamp: new Date().toISOString(),
    endpoint,
    statusCode,
    team: teamAbbr,
    updateType,
    attempt,
    message,
  };
}

export async function fetchWithRetry(fetcher, { retries = 2, baseDelayMs = 300 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      return await fetcher(attempt);
    } catch (e) {
      lastError = e;
      if (attempt <= retries) {
        await new Promise((r) => setTimeout(r, baseDelayMs * attempt));
      }
    }
  }
  throw lastError;
}

export function loadDailyCache(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.fetchedAt || !isSameUtcDay(parsed.fetchedAt, Date.now())) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDailyCache(storage, key, payload) {
  storage.setItem(key, JSON.stringify({ ...payload, fetchedAt: Date.now() }));
}

export function buildLineupMap(entries, staticRosterByTeam, logger = () => {}) {
  const lineupByTeam = {};

  for (const [team, lineup] of Object.entries(entries || {})) {
    const staticNames = new Set((staticRosterByTeam[team] || []).map((p) => p.name));
    lineupByTeam[team] = [];

    for (const name of lineup || []) {
      if (!staticNames.has(name)) {
        logger(`Lineup mismatch ${JSON.stringify({ timestamp: new Date().toISOString(), team, player: name, message: 'Player not found in static roster; manual review suggested.' })}`, 'warn');
        continue;
      }
      lineupByTeam[team].push(name);
    }
  }

  return lineupByTeam;
}

export const DAILY_LINEUP_CACHE_KEY = 'ftb-lineups-v1';
export const DAILY_INJURY_CACHE_KEY = 'ftb-injuries-v1';
export const DAILY_MAX_AGE_MS = DAY_MS;
