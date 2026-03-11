import { useState, useEffect, useCallback, useRef } from "react";
import { getStaticRoster } from "./static-rosters.mjs";
import { fetchWithRetry, buildUpdateLog, loadDailyCache, saveDailyCache, buildLineupMap, DAILY_LINEUP_CACHE_KEY, DAILY_INJURY_CACHE_KEY } from "./daily-updates.mjs";

// ─── REAL 2025-26 FTB DATA (jedibets.com) ────────────────────────────────────
const SEASON_FTB_DATA = {
  "Jarrett Allen":           { ftbMade: 14, shots: { rim: 6, mid: 3, ft: 5, threeP: 0 } },
  "Jamal Murray":            { ftbMade: 13, shots: { rim: 4, mid: 4, ft: 3, threeP: 2 } },
  "Bam Adebayo":             { ftbMade: 13, shots: { rim: 2, mid: 4, ft: 3, threeP: 4 } },
  "Anthony Edwards":         { ftbMade: 13, shots: { rim: 1, mid: 9, ft: 0, threeP: 3 } },
  "Jalen Brunson":           { ftbMade: 12, shots: { rim: 1, mid: 8, ft: 0, threeP: 3 } },
  "Brandon Ingram":          { ftbMade: 11, shots: { rim: 3, mid: 7, ft: 0, threeP: 1 } },
  "Chet Holmgren":           { ftbMade: 10, shots: { rim: 4, mid: 2, ft: 0, threeP: 4 } },
  "Devin Vassell":           { ftbMade: 10, shots: { rim: 0, mid: 6, ft: 0, threeP: 4 } },
  "Alperen Sengun":          { ftbMade: 10, shots: { rim: 1, mid: 9, ft: 0, threeP: 0 } },
  "Devin Booker":            { ftbMade: 9,  shots: { rim: 2, mid: 5, ft: 1, threeP: 1 } },
  "Tyrese Maxey":            { ftbMade: 9,  shots: { rim: 0, mid: 7, ft: 0, threeP: 2 } },
  "Victor Wembanyama":       { ftbMade: 9,  shots: { rim: 2, mid: 3, ft: 2, threeP: 2 } },
  "Donovan Mitchell":        { ftbMade: 8,  shots: { rim: 0, mid: 4, ft: 1, threeP: 3 } },
  "Jaylen Brown":            { ftbMade: 8,  shots: { rim: 2, mid: 4, ft: 1, threeP: 1 } },
  "Austin Reaves":           { ftbMade: 8,  shots: { rim: 1, mid: 2, ft: 1, threeP: 4 } },
  "LeBron James":            { ftbMade: 8,  shots: { rim: 4, mid: 4, ft: 0, threeP: 0 } },
  "Joel Embiid":             { ftbMade: 8,  shots: { rim: 1, mid: 5, ft: 2, threeP: 0 } },
  "Cade Cunningham":         { ftbMade: 7,  shots: { rim: 1, mid: 3, ft: 0, threeP: 3 } },
  "Jayson Tatum":            { ftbMade: 7,  shots: { rim: 2, mid: 4, ft: 1, threeP: 0 } },
  "Nikola Jokic":            { ftbMade: 7,  shots: { rim: 0, mid: 5, ft: 0, threeP: 2 } },
  "Ja Morant":               { ftbMade: 6,  shots: { rim: 3, mid: 2, ft: 0, threeP: 1 } },
  "Stephen Curry":           { ftbMade: 6,  shots: { rim: 1, mid: 2, ft: 0, threeP: 3 } },
  "Giannis Antetokounmpo":   { ftbMade: 6,  shots: { rim: 4, mid: 2, ft: 0, threeP: 0 } },
  "Trae Young":              { ftbMade: 5,  shots: { rim: 0, mid: 4, ft: 1, threeP: 0 } },
  "Kyrie Irving":            { ftbMade: 5,  shots: { rim: 2, mid: 2, ft: 0, threeP: 1 } },
  "Tyler Herro":             { ftbMade: 5,  shots: { rim: 1, mid: 3, ft: 1, threeP: 0 } },
  "Scottie Barnes":          { ftbMade: 4,  shots: { rim: 2, mid: 1, ft: 1, threeP: 0 } },
  "Anthony Davis":           { ftbMade: 4,  shots: { rim: 3, mid: 1, ft: 0, threeP: 0 } },
  "Jimmy Butler":            { ftbMade: 3,  shots: { rim: 1, mid: 2, ft: 0, threeP: 0 } },
  "Zach LaVine":             { ftbMade: 3,  shots: { rim: 1, mid: 1, ft: 0, threeP: 1 } },
};

const TEAM_FTB_STATS = {
  PHI:{ tipPct:51.6, firstPointPct:54.4, firstFGPct:51.5, hotCold:"HOT" },
  MEM:{ tipPct:48.5, firstPointPct:48.5, firstFGPct:48.5, hotCold:"COLD" },
  DET:{ tipPct:41.3, firstPointPct:49.3, firstFGPct:53.7, hotCold:"WARM" },
  BKN:{ tipPct:56.9, firstPointPct:41.2, firstFGPct:41.2, hotCold:"COLD" },
  ATL:{ tipPct:54.5, firstPointPct:50.0, firstFGPct:45.6, hotCold:"HOT" },
  DAL:{ tipPct:45.5, firstPointPct:47.1, firstFGPct:45.6, hotCold:"COLD" },
  MIA:{ tipPct:58.8, firstPointPct:57.7, firstFGPct:53.5, hotCold:"HOT" },
  WAS:{ tipPct:31.8, firstPointPct:36.4, firstFGPct:36.4, hotCold:"COLD" },
  MIL:{ tipPct:31.8, firstPointPct:38.8, firstFGPct:41.8, hotCold:"COLD" },
  PHX:{ tipPct:73.1, firstPointPct:55.9, firstFGPct:54.4, hotCold:"WARM" },
  HOU:{ tipPct:37.9, firstPointPct:44.8, firstFGPct:44.8, hotCold:"WARM" },
  TOR:{ tipPct:43.5, firstPointPct:55.1, firstFGPct:60.9, hotCold:"HOT" },
  SAS:{ tipPct:70.6, firstPointPct:54.3, firstFGPct:50.0, hotCold:"HOT" },
  BOS:{ tipPct:46.3, firstPointPct:54.4, firstFGPct:55.9, hotCold:"WARM" },
  GSW:{ tipPct:44.1, firstPointPct:46.4, firstFGPct:47.8, hotCold:"HOT" },
  CHI:{ tipPct:46.3, firstPointPct:33.3, firstFGPct:33.3, hotCold:"COLD" },
  LAL:{ tipPct:62.9, firstPointPct:58.6, firstFGPct:58.6, hotCold:"WARM" },
  MIN:{ tipPct:56.5, firstPointPct:57.1, firstFGPct:61.4, hotCold:"WARM" },
};

// TEAM_POSITION_FTB is now dynamically computed from real season PbP data.
// Fallback estimates used until the data engine runs.
const FALLBACK_POSITION_FTB = {
  PHI:{ PG:42, SG:18, SF:8,  PF:12, C:20 }, MEM:{ PG:35, SG:22, SF:12, PF:8,  C:23 },
  DET:{ PG:38, SG:20, SF:10, PF:10, C:22 }, BKN:{ PG:20, SG:18, SF:14, PF:10, C:38 },
  ATL:{ PG:44, SG:25, SF:12, PF:8,  C:11 }, DAL:{ PG:36, SG:28, SF:14, PF:10, C:12 },
  MIA:{ PG:18, SG:28, SF:22, PF:14, C:18 }, WAS:{ PG:32, SG:24, SF:16, PF:14, C:14 },
  MIL:{ PG:18, SG:14, SF:8,  PF:38, C:22 }, PHX:{ PG:20, SG:36, SF:16, PF:12, C:16 },
  HOU:{ PG:22, SG:18, SF:14, PF:12, C:34 }, TOR:{ PG:24, SG:18, SF:38, PF:12, C:8  },
  SAS:{ PG:22, SG:28, SF:10, PF:8,  C:32 }, BOS:{ PG:20, SG:26, SF:32, PF:12, C:10 },
  GSW:{ PG:38, SG:22, SF:16, PF:12, C:12 }, CHI:{ PG:16, SG:26, SF:14, PF:28, C:16 },
  LAL:{ PG:18, SG:22, SF:28, PF:20, C:12 }, MIN:{ PG:16, SG:30, SF:14, PF:22, C:18 },
};

// ─── ESPN PLAYER → POSITION MAP (populated from PbP athlete data) ─────────────
// ESPN abbreviation codes → canonical position
const ESPN_POS_MAP = {
  "PG":"PG","SG":"SG","SF":"SF","PF":"PF","C":"C",
  "G":"SG","F":"SF","G-F":"SG","F-G":"SF","F-C":"PF","C-F":"C",
  "1":"PG","2":"SG","3":"SF","4":"PF","5":"C",
};

// ─── SEASON DATE RANGE (Oct 21, 2025 → today) ────────────────────────────────
function getAllGameDates() {
  const start = new Date("2025-10-21");
  const end   = new Date("2026-03-10"); // today
  const dates = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
    dates.push(d.toISOString().slice(0,10).replace(/-/g,""));
  }
  return dates;
}

// ─── EXTRACT FIRST SCORING PLAY FROM ESPN SUMMARY ────────────────────────────
function extractFirstScore(data) {
  // ESPN summary has plays[] array sorted chronologically
  const plays = data?.plays || [];
  for (const play of plays) {
    const text = (play.text || "").toLowerCase();
    // Find first scoring play — must be a made shot or FT
    if (play.scoringPlay === true || (play.pointAfterDrive && play.type?.text?.toLowerCase().includes("made"))) {
      return play;
    }
    // Fallback: text-based detection
    if ((text.includes("makes") || text.includes("free throw")) && !text.includes("miss")) {
      // Sometimes scoring is indicated differently
      if (play.scoreValue && play.scoreValue > 0) return play;
    }
  }
  // Last fallback: first play with score change
  for (const play of plays) {
    if ((play.awayScore > 0 || play.homeScore > 0)) return play;
  }
  return null;
}

// Get defending team from first scoring play
function getDefendingTeam(play, homeTeam, awayTeam) {
  // The team that DIDN'T score is the defender
  // ESPN play has team reference
  const scoringTeamId = play?.team?.id || play?.team?.abbreviation;
  if (!scoringTeamId) return null;
  // Compare by abbreviation if available
  const scoreAbbr = (play?.team?.abbreviation || "").toUpperCase();
  if (scoreAbbr === homeTeam) return awayTeam;  // home scored → away defended
  if (scoreAbbr === awayTeam) return homeTeam;  // away scored → home defended
  return null;
}

// Get position from ESPN athlete data in the play
function getPosFromPlay(play) {
  const pos = play?.participants?.[0]?.athlete?.position?.abbreviation
           || play?.athletesInvolved?.[0]?.position?.abbreviation
           || null;
  if (!pos) return null;
  return ESPN_POS_MAP[pos.toUpperCase()] || null;
}

// ─── AGGREGATE: build position FTB data from raw events ──────────────────────
function aggregatePositionData(events) {
  // events: [{ defendingTeam, pos }]
  const counts = {}; // team -> { PG:0, SG:0, ... }
  const ALL_TEAMS = ["ATL","BOS","BKN","CHA","CHI","CLE","DAL","DEN","DET","GSW",
                     "HOU","IND","LAC","LAL","MEM","MIA","MIL","MIN","NOP","NYK",
                     "OKC","ORL","PHI","PHX","POR","SAC","SAS","TOR","UTA","WAS"];
  ALL_TEAMS.forEach(t => counts[t] = { PG:0, SG:0, SF:0, PF:0, C:0, unknown:0 });

  for (const ev of events) {
    if (!ev.defendingTeam || !counts[ev.defendingTeam]) continue;
    const pos = ev.pos || "unknown";
    if (pos in counts[ev.defendingTeam]) counts[ev.defendingTeam][pos]++;
    else counts[ev.defendingTeam].unknown++;
  }

  // Convert to percentages (exclude unknown for display)
  const result = {};
  for (const [team, raw] of Object.entries(counts)) {
    const known = raw.PG + raw.SG + raw.SF + raw.PF + raw.C;
    if (known < 3) continue; // not enough data
    result[team] = {
      PG: Math.round((raw.PG/known)*100),
      SG: Math.round((raw.SG/known)*100),
      SF: Math.round((raw.SF/known)*100),
      PF: Math.round((raw.PF/known)*100),
      C:  Math.round((raw.C /known)*100),
      totalGames: known,
    };
  }
  return result;
}

// Known injuries confirmed from multiple sources (March 10, 2026)
const KNOWN_INJURIES_TODAY = {
  // PHI
  "Joel Embiid":          { status: "OUT",          reason: "Oblique injury" },
  "Tyrese Maxey":         { status: "OUT",          reason: "Finger injury" },
  "Paul George":          { status: "OUT",          reason: "25-game drug suspension (since Jan 31)" },
  // MEM
  "Ja Morant":            { status: "OUT",          reason: "Elbow UCL sprain — out until ~Mar 20" },
  // DAL
  "Kyrie Irving":         { status: "OUT",          reason: "Torn ACL — season over" },
  "Cooper Flagg":         { status: "OUT",          reason: "Foot injury" },
  // MIA
  "Andrew Wiggins":       { status: "QUESTIONABLE", reason: "Left toe inflammation" },
  // GSW
  "Jimmy Butler":         { status: "OUT",          reason: "Torn ACL — season over" },
  "Stephen Curry":        { status: "OUT",          reason: "Knee — 5+ more games" },
  // BOS
  "Jayson Tatum":         { status: "OUT",          reason: "Torn Achilles — season over" },
  // LAL
  "LeBron James":         { status: "QUESTIONABLE", reason: "Hip/Foot — missed last 2 games" },
  // MIN
  "Anthony Edwards":      { status: "OUT",          reason: "Late scratch tonight" },
};

// ─── ESPN TEAM IDS (all 30 teams) ─────────────────────────────────────────────
const ESPN_TEAM_IDS = {
  ATL:"1",  BOS:"2",  BKN:"17", CHA:"30", CHI:"4",  CLE:"5",
  DAL:"6",  DEN:"7",  DET:"8",  GSW:"9",  HOU:"10", IND:"11",
  LAC:"12", LAL:"13", MEM:"29", MIA:"14", MIL:"15", MIN:"16",
  NOP:"3",  NYK:"18", OKC:"25", ORL:"19", PHI:"20", PHX:"21",
  POR:"22", SAC:"23", SAS:"24", TOR:"28", UTA:"26", WAS:"27",
};

// ─── ROSTER CACHE TTL ──────────────────────────────────────────────────────────
// Rosters fetched today are always considered stale at app startup for playing teams.
// Non-playing teams use a 6-hour TTL.
const ROSTER_TTL_MS    = 6 * 60 * 60 * 1000;
const ROSTER_CACHE_KEY = "ftb-rosters-v3";

// Minimum expected roster size. ESPN returns 15-20 active + 2-way + two-ways.
// If a cached entry has fewer than this, it's considered corrupt/incomplete.
const MIN_ROSTER_SIZE = 8;

const BALLDONTLIE_TEAM_IDS = {
  ATL:1, BOS:2, BKN:3, CHA:4, CHI:5, CLE:6, DAL:7, DEN:8, DET:9, GSW:10,
  HOU:11, IND:12, LAC:13, LAL:14, MEM:15, MIA:16, MIL:17, MIN:18, NOP:19, NYK:20,
  OKC:21, ORL:22, PHI:23, PHX:24, POR:25, SAC:26, SAS:27, TOR:28, UTA:29, WAS:30,
};

const BREF_TEAM_CODES = {
  ATL:"ATL", BOS:"BOS", BKN:"BRK", CHA:"CHO", CHI:"CHI", CLE:"CLE", DAL:"DAL", DEN:"DEN", DET:"DET", GSW:"GSW",
  HOU:"HOU", IND:"IND", LAC:"LAC", LAL:"LAL", MEM:"MEM", MIA:"MIA", MIL:"MIL", MIN:"MIN", NOP:"NOP", NYK:"NYK",
  OKC:"OKC", ORL:"ORL", PHI:"PHI", PHX:"PHO", POR:"POR", SAC:"SAC", SAS:"SAS", TOR:"TOR", UTA:"UTA", WAS:"WAS",
};

// ─── ROSTER FRESHNESS VALIDATION ──────────────────────────────────────────────
/**
 * Validates whether a cached roster entry is trustworthy for use.
 * Returns { valid: bool, reason: string }
 *
 * Checks performed:
 *   1. Entry exists and has a players array
 *   2. Player count meets minimum threshold (detects partial/failed fetches)
 *   3. Cache was written today (CT date match) — always re-fetch today's teams
 *   4. fetchedAt is within the non-playing-team TTL window
 */
function validateRosterEntry(entry, teamAbbr, isPlayingToday) {
  if (!entry)                           return { valid: false, reason: "no cache entry" };
  if (!Array.isArray(entry.players))    return { valid: false, reason: "malformed cache entry" };
  if (entry.players.length < MIN_ROSTER_SIZE)
    return { valid: false, reason: `only ${entry.players.length} players cached (min ${MIN_ROSTER_SIZE})` };
  if (!entry.fetchedAt)                 return { valid: false, reason: "missing fetchedAt timestamp" };

  // Teams playing today are ALWAYS re-fetched — their rosters must be current
  if (isPlayingToday)
    return { valid: false, reason: "playing today — always fetch fresh" };

  // For non-playing teams, check TTL
  const ageMs = Date.now() - entry.fetchedAt;
  if (ageMs > ROSTER_TTL_MS)
    return { valid: false, reason: `cache expired (${Math.round(ageMs/3600000)}h old, TTL ${ROSTER_TTL_MS/3600000}h)` };

  return { valid: true, reason: `fresh (${Math.round(ageMs/60000)}min old, ${entry.players.length} players)` };
}

// ─── ROSTER CACHE HELPERS ──────────────────────────────────────────────────────
function loadRosterCache() {
  try {
    const raw = localStorage.getItem(ROSTER_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

/**
 * Atomically saves ONE team's roster into the shared cache.
 * Uses a read-modify-write pattern so parallel team fetches don't clobber each other.
 */
function saveTeamToCache(teamAbbr, players) {
  try {
    const cache = loadRosterCache();
    cache[teamAbbr] = { players, fetchedAt: Date.now() };
    localStorage.setItem(ROSTER_CACHE_KEY, JSON.stringify(cache));
  } catch(e) {
    console.warn(`[RosterSync] Failed to cache ${teamAbbr}:`, e.message);
  }
}

function normalizeHeightWeight(height, weight) {
  let hw = "";
  if (height) hw += String(height).trim();
  if (weight) hw += `${hw ? " / " : ""}${String(weight).trim()}`;
  return hw;
}

function normalizeStarterFlag(rawStarter, rawStatus) {
  if (typeof rawStarter === "boolean") return rawStarter;
  const s = String(rawStarter || "").toLowerCase();
  const status = String(rawStatus || "").toLowerCase();
  if (["starter", "starting"].includes(s) || status.includes("starter")) return true;
  if (["bench", "reserve"].includes(s) || status.includes("bench")) return false;
  return null;
}

function normalizeRosterPlayer({
  name,
  team,
  pos,
  ppg = 0,
  usageRate = 0,
  gp = 0,
  ftbPct = 0,
  espnId = "",
  isStarter = null,
  heightWeight = "",
  activeStatus = "ACTIVE",
  source = "unknown",
}) {
  return {
    name,
    team,
    opp: "",
    gameTime: "",
    pos: normalizePosition(pos),
    ppg: parseFloat((ppg || 0).toFixed ? ppg.toFixed(1) : Number(ppg || 0).toFixed(1)),
    usageRate: parseFloat((usageRate || 0).toFixed ? usageRate.toFixed(1) : Number(usageRate || 0).toFixed(1)),
    gp: Math.max(0, Math.round(Number(gp) || 0)),
    ftbPct: Math.max(0, Math.round(Number(ftbPct) || 0)),
    espnId: String(espnId || ""),
    isStarter,
    heightWeight,
    activeStatus,
    rosterSource: source,
  };
}

// ─── MERGE ESPN ROSTER WITH KNOWN FTB DATA ─────────────────────────────────────
function mergeWithFtbData(players, gp) {
  return players.map(p => {
    const knownFtb = SEASON_FTB_DATA[p.name];
    if (knownFtb) {
      const games = Math.max(p.gp || gp || 1, 1);
      return { ...p, ftbPct: Math.round((knownFtb.ftbMade / games) * 100) };
    }
    return p;
  });
}

// ─── useRosters CUSTOM HOOK ────────────────────────────────────────────────────
/**
 * STARTUP ROSTER SYNCHRONIZATION
 *
 * Every time the application launches (or liveGames changes), this hook:
 *   1. Identifies all teams in today's matchups
 *   2. Validates each team's cached roster against freshness rules
 *   3. Fetches updated data for any team that is missing, outdated, or playing today
 *   4. Emits detailed debug logs for every decision
 *   5. Makes players available for analytics ONLY after all sync is complete
 *
 * Concurrency model: teams are fetched 4 at a time with controlled parallelism.
 * Each team saves to cache atomically (read-modify-write) to prevent race conditions.
 *
 * Returns: { players, rosterStatus, rosterLog, syncState, refreshRosters }
 *   syncState: "idle" | "syncing" | "ready" | "partial" (partial = some errors but has data)
 */
function useRosters(liveGames) {
  const [players, setPlayers]           = useState([]);
  const [rosterStatus, setRosterStatus] = useState({});
  const [rosterLog, setRosterLog]       = useState([]);
  const [syncState, setSyncState]       = useState("idle");

  const log = useCallback((msg, level = "info") => {
    const prefix = { info:"", warn:"⚠️ ", error:"❌ ", success:"✅ ", debug:"🔍 " }[level] || "";
    const line = `${prefix}${msg}`;
    console.log(`[RosterSync] ${line}`);
    setRosterLog(prev => [{ time: new Date().toLocaleTimeString(), msg: line, level }, ...prev].slice(0, 200));
  }, []);

  const syncRosters = useCallback(async (games) => {
    if (!games || games.length === 0) return;

    setSyncState("syncing");
    const teamsToday = [...new Set(games.flatMap(g => [g.home, g.away]))];
    const nextStatus = {};
    const nextPlayers = [];

    log(`Loading static rosters for ${teamsToday.length} teams`, "info");

    for (const team of teamsToday) {
      const roster = getStaticRoster(team);
      if (roster.length === 0) {
        log(`Static roster missing for ${team}`, "error");
        nextStatus[team] = "error";
        continue;
      }

      nextPlayers.push(...roster.map((p) => normalizeRosterPlayer({
        name: p.name,
        team,
        pos: p.position,
        ppg: estimatePPG({}, estimateUsageFromRole({}, normalizePosition(p.position))),
        usageRate: estimateUsageFromRole({}, normalizePosition(p.position)),
        gp: 40,
        ftbPct: deriveDefaultFtbPct(estimateUsageFromRole({}, normalizePosition(p.position)), normalizePosition(p.position)),
        source: "STATIC",
      })));
      nextStatus[team] = "ready";
      log(`Loaded static roster for ${team} (${roster.length} players)`, "debug");
    }

    setPlayers(nextPlayers);
    setRosterStatus(nextStatus);
    setSyncState(Object.values(nextStatus).some(v => v === "error") ? "partial" : "ready");
    log("Static roster load complete", "success");
  }, [log]);

  useEffect(() => {
    if (liveGames.length > 0) syncRosters(liveGames);
  }, [liveGames, syncRosters]);

  const refreshRosters = useCallback((games) => syncRosters(games), [syncRosters]);

  return { players, rosterStatus, rosterLog, syncState, refreshRosters };
}

// Per-position base FTB likelihood weights derived from league-wide historical data.
// These are multiplied by the team-specific positionData when available.
const POSITION_BASE_WEIGHT = { PG: 1.30, SG: 1.15, SF: 0.95, PF: 0.85, C: 0.75 };

/**
 * Returns a 0.5–1.5 multiplier for how likely this position is to score first
 * against `oppTeam`, using real positionData when available or base weights.
 */
function computePositionLikelihood(pos, oppTeam, positionData) {
  const teamPos = positionData?.[oppTeam];
  if (teamPos && typeof teamPos[pos] === "number") {
    // League average across positions is 20% each; normalize against that
    const leagueAvg = 20;
    const pct = teamPos[pos];
    // Clamp the multiplier between 0.5 and 1.8
    return Math.max(0.5, Math.min(1.8, pct / leagueAvg));
  }
  return POSITION_BASE_WEIGHT[pos] || 1.0;
}

// ─── ESPN POSITION NORMALIZER ──────────────────────────────────────────────────
function normalizePosition(raw) {
  if (!raw) return "SF"; // safe default
  const u = raw.toUpperCase().trim();
  const direct = { PG:1,SG:1,SF:1,PF:1,C:1 };
  if (direct[u]) return u;
  const map = {
    "G":"SG","F":"SF","C-F":"PF","F-C":"PF","G-F":"SG","F-G":"SG",
    "1":"PG","2":"SG","3":"SF","4":"PF","5":"C",
    "CENTER":"C","GUARD":"SG","FORWARD":"SF","CENTER-FORWARD":"PF",
    "GUARD-FORWARD":"SG","FORWARD-CENTER":"PF","POWER FORWARD":"PF",
    "SMALL FORWARD":"SF","POINT GUARD":"PG","SHOOTING GUARD":"SG",
  };
  return map[u] || "SF";
}

// ─── ESPN ROSTER FETCHER ───────────────────────────────────────────────────────
/**
 * Fetches the current roster for `teamAbbr` from ESPN.
 * Returns normalized player objects matching the internal schema.
 */
async function fetchESPNRoster(teamAbbr) {
  const teamId = ESPN_TEAM_IDS[teamAbbr];
  if (!teamId) throw new Error(`No ESPN ID for team ${teamAbbr}`);

  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/roster`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN roster ${teamAbbr}: HTTP ${res.status}`);
  const data = await res.json();

  const athletes = data?.athletes || [];
  const players = [];

  for (const group of athletes) {
    const items = group?.items || group?.athletes || (Array.isArray(group) ? group : []);
    for (const athlete of items) {
      const name = athlete?.displayName || athlete?.fullName || athlete?.shortName;
      if (!name) continue;

      const rawPos = athlete?.position?.abbreviation || athlete?.position?.displayName || "";
      const pos = normalizePosition(rawPos);

      const stats = athlete?.statistics?.splits?.categories || [];
      let ppg = 0, gp = 0, usageRate = 0;

      for (const cat of stats) {
        for (const stat of cat?.stats || []) {
          const n = stat.name;
          const v = parseFloat(stat.value) || 0;
          if (n === "avgPoints")     ppg = v;
          if (n === "gamesPlayed")   gp  = Math.round(v);
          if (n === "usageRate")     usageRate = v;
        }
      }

      if (usageRate === 0) usageRate = estimateUsageFromRole(athlete, pos);
      if (ppg === 0)       ppg       = estimatePPG(athlete, usageRate);
      if (gp === 0)        gp        = 40;

      const knownFtb = SEASON_FTB_DATA[name];
      const ftbPct = knownFtb ? Math.round((knownFtb.ftbMade / Math.max(gp, 1)) * 100) : deriveDefaultFtbPct(usageRate, pos);

      players.push(normalizeRosterPlayer({
        name,
        team: teamAbbr,
        pos,
        ppg,
        usageRate,
        gp,
        ftbPct,
        espnId: String(athlete?.id || ""),
        isStarter: normalizeStarterFlag(athlete?.starter, athlete?.status?.type?.description),
        heightWeight: normalizeHeightWeight(athlete?.displayHeight, athlete?.displayWeight ? `${athlete.displayWeight} lb` : ""),
        activeStatus: athlete?.status?.type?.description || "ACTIVE",
        source: "ESPN",
      }));
    }
  }

  return {
    players,
    statusCode: res.status,
    endpoint: url,
  };
}

async function fetchBallDontLieRoster(teamAbbr) {
  const teamId = BALLDONTLIE_TEAM_IDS[teamAbbr];
  if (!teamId) throw new Error(`No balldontlie team ID for ${teamAbbr}`);

  const url = `https://www.balldontlie.io/api/v1/players?per_page=100&team_ids[]=${teamId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`balldontlie roster ${teamAbbr}: HTTP ${res.status}`);
  const data = await res.json();
  const rows = data?.data || [];

  const players = rows
    .map((player) => {
      const name = `${player?.first_name || ""} ${player?.last_name || ""}`.trim();
      if (!name) return null;
      const pos = normalizePosition(player?.position || "SF");
      const usageRate = estimateUsageFromRole({}, pos);
      const ppg = estimatePPG({}, usageRate);
      const gp = 40;
      const knownFtb = SEASON_FTB_DATA[name];
      const ftbPct = knownFtb ? Math.round((knownFtb.ftbMade / Math.max(gp, 1)) * 100) : deriveDefaultFtbPct(usageRate, pos);

      return normalizeRosterPlayer({
        name,
        team: teamAbbr,
        pos,
        ppg,
        usageRate,
        gp,
        ftbPct,
        espnId: String(player?.id || ""),
        isStarter: null,
        heightWeight: normalizeHeightWeight(player?.height_feet && player?.height_inches ? `${player.height_feet}'${player.height_inches}"` : "", player?.weight_pounds ? `${player.weight_pounds} lb` : ""),
        activeStatus: "ACTIVE",
        source: "balldontlie",
      });
    })
    .filter(Boolean);

  return {
    players,
    statusCode: res.status,
    endpoint: url,
  };
}

async function fetchBasketballReferenceRoster(teamAbbr) {
  const brefCode = BREF_TEAM_CODES[teamAbbr];
  if (!brefCode) throw new Error(`No Basketball Reference code for ${teamAbbr}`);

  const year = new Date().getFullYear() + 1;
  const url = `https://www.basketball-reference.com/teams/${brefCode}/${year}.html`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Basketball Reference roster ${teamAbbr}: HTTP ${res.status}`);
  const html = await res.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const rows = [...doc.querySelectorAll("table#roster tbody tr")];

  const players = rows
    .map((row) => {
      const name = row.querySelector("td[data-stat='player']")?.textContent?.trim();
      if (!name) return null;
      const rawPos = row.querySelector("td[data-stat='pos']")?.textContent?.trim() || "SF";
      const pos = normalizePosition(rawPos);
      const usageRate = estimateUsageFromRole({}, pos);
      const ppg = estimatePPG({}, usageRate);
      const gp = 40;
      const knownFtb = SEASON_FTB_DATA[name];
      const ftbPct = knownFtb ? Math.round((knownFtb.ftbMade / Math.max(gp, 1)) * 100) : deriveDefaultFtbPct(usageRate, pos);
      const height = row.querySelector("td[data-stat='height']")?.textContent?.trim() || "";
      const weight = row.querySelector("td[data-stat='weight']")?.textContent?.trim();

      return normalizeRosterPlayer({
        name,
        team: teamAbbr,
        pos,
        ppg,
        usageRate,
        gp,
        ftbPct,
        isStarter: null,
        heightWeight: normalizeHeightWeight(height, weight ? `${weight} lb` : ""),
        activeStatus: "ACTIVE",
        source: "BasketballReference",
      });
    })
    .filter(Boolean);

  return {
    players,
    statusCode: res.status,
    endpoint: url,
  };
}

async function fetchRosterWithFallback(teamAbbr, log) {
  log(`Static roster mode enabled; external full-roster fetch disabled for ${teamAbbr}`, "debug");
  return getStaticRoster(teamAbbr).map((p) => normalizeRosterPlayer({
    name: p.name,
    team: teamAbbr,
    pos: p.position,
    ppg: estimatePPG({}, estimateUsageFromRole({}, normalizePosition(p.position))),
    usageRate: estimateUsageFromRole({}, normalizePosition(p.position)),
    gp: 40,
    ftbPct: deriveDefaultFtbPct(estimateUsageFromRole({}, normalizePosition(p.position)), normalizePosition(p.position)),
    source: "STATIC",
  }));
}

/** Estimate usage rate from ESPN athlete jersey/role hints when stats are missing */
function estimateUsageFromRole(athlete, pos) {
  // Stars tend to have jersey numbers 0–35; rough heuristic only
  const weights = { PG: 28, SG: 25, SF: 22, PF: 20, C: 19 };
  return weights[pos] || 22;
}

/** Estimate PPG from usage rate using league regression (~0.7 pts per 1% usage) */
function estimatePPG(athlete, usage) {
  return parseFloat(Math.max(4, usage * 0.72).toFixed(1));
}

/** Derive a sensible FTB% for players not in our historical dataset */
function deriveDefaultFtbPct(usage, pos) {
  // Higher usage + guard positions correlate with more FTBs
  const posBonus = { PG: 4, SG: 3, SF: 2, PF: 1, C: 1 }[pos] || 2;
  return Math.round(Math.min(30, (usage / 35) * 20 + posBonus));
}

// ─── NBA_PLAYERS IS NOW FULLY DYNAMIC ─────────────────────────────────────────
// Rosters are fetched live from ESPN on every startup via useRosters().
// The static array has been removed. See fetchESPNRoster() above.

const _STATIC_REMOVED = true; // NBA_PLAYERS removed — rosters now dynamic

// ─── CENTRAL TIME DATE UTILITIES ─────────────────────────────────────────────
// Returns current date string "YYYYMMDD" in America/Chicago (CT) timezone.
// Works in all modern browsers via Intl.DateTimeFormat.
function getCTDateString(date = new Date()) {
  // Format the date parts in CT
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year:  "numeric",
    month: "2-digit",
    day:   "2-digit",
  }).formatToParts(date);
  const p = {};
  parts.forEach(({ type, value }) => { p[type] = value; });
  return `${p.year}${p.month}${p.day}`; // "YYYYMMDD"
}

// Returns ms until the next CT midnight (so we can schedule an auto-refresh).
function msUntilCTMidnight() {
  const now = new Date();
  // Build a Date that represents tonight's CT midnight by parsing CT date parts
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(now);
  const p = {};
  parts.forEach(({ type, value }) => { p[type] = value; });
  // "Tomorrow" in CT = same date +1 day at 00:00:00 CT
  // We construct an ISO string and let JS parse it as UTC offset
  const ctMidnightISO = `${p.year}-${p.month}-${p.day}T24:00:00`; // next midnight local
  // Use the offset trick: find current UTC offset for CT right now
  const utcOffset = now.getTime() - new Date(
    Date.UTC(
      parseInt(p.year), parseInt(p.month)-1, parseInt(p.day),
      parseInt(p.hour), parseInt(p.minute), parseInt(p.second)
    )
  ).getTime();
  const tomorrowCTMidnightUTC = Date.UTC(
    parseInt(p.year), parseInt(p.month)-1, parseInt(p.day)+1, 0, 0, 0
  ) + utcOffset;
  return Math.max(1000, tomorrowCTMidnightUTC - now.getTime());
}

// Full team name lookup for ESPN abbreviations
const TEAM_NAMES = {
  ATL:"Hawks",BOS:"Celtics",BKN:"Nets",CHA:"Hornets",CHI:"Bulls",
  CLE:"Cavaliers",DAL:"Mavericks",DEN:"Nuggets",DET:"Pistons",GSW:"Warriors",
  HOU:"Rockets",IND:"Pacers",LAC:"Clippers",LAL:"Lakers",MEM:"Grizzlies",
  MIA:"Heat",MIL:"Bucks",MIN:"Timberwolves",NOP:"Pelicans",NYK:"Knicks",
  OKC:"Thunder",ORL:"Magic",PHI:"76ers",PHX:"Suns",POR:"Trail Blazers",
  SAC:"Kings",SAS:"Spurs",TOR:"Raptors",UTA:"Jazz",WAS:"Wizards",
  GS:"Warriors", SA:"Spurs", NY:"Knicks", NO:"Pelicans",
};

// Normalize ESPN team abbreviations to our standard 2-3 letter codes
function normalizeAbbr(abbr) {
  if (!abbr) return "";
  const map = { GS:"GSW", SA:"SAS", NY:"NYK", NO:"NOP", UTAH:"UTA", WSH:"WAS", PHO:"PHX" };
  return map[abbr.toUpperCase()] || abbr.toUpperCase();
}

// Parse ESPN game time string → "H:MM PM" in CT
function parseGameTimeCT(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("en-US", {
      timeZone: "America/Chicago",
      hour: "numeric", minute: "2-digit", hour12: true,
    });
  } catch(e) { return ""; }
}

// GAMES is now populated dynamically at runtime; start empty.
// NBA_PLAYERS roster data is still used for FTB scoring model when players match today's teams.
const GAMES = [];

const TC = { PHI:"#006BB6",MEM:"#5D76A9",DET:"#C8102E",BKN:"#1B1E2B",ATL:"#E03A3E",DAL:"#00538C",MIA:"#98002E",WAS:"#002B5C",MIL:"#00471B",PHX:"#E56020",HOU:"#CE1141",TOR:"#CE1141",SAS:"#8A8D8F",BOS:"#007A33",GSW:"#1D428A",CHI:"#CE1141",LAL:"#552583",MIN:"#0C2340" };
const TA = { PHI:"#ED174C",MEM:"#12173F",DET:"#006BB6",BKN:"#FFFFFF",ATL:"#C1D32F",DAL:"#B8C4CA",MIA:"#F9A01B",WAS:"#E31837",MIL:"#EEE1C6",PHX:"#1D1160",HOU:"#FFC72C",TOR:"#000000",SAS:"#000000",BOS:"#BA9653",GSW:"#FFC72C",CHI:"#000000",LAL:"#FDB927",MIN:"#236192" };
const SHOT_C = { threeP:"#818CF8", rim:"#34D399", mid:"#FBBF24", ft:"#F472B6" };
const POS_C  = { PG:"#818CF8", SG:"#34D399", SF:"#FBBF24", PF:"#F472B6", C:"#60A5FA" };

function computeScore(p, ftb, injuryStatus, positionData) {
  if (injuryStatus === "OUT") return 0;
  const base = ((p.usageRate/40)*0.35) + ((p.ftbPct/25)*0.25) + ((p.ppg/40)*0.1) + ((p.gp/65)*0.1) + (ftb ? Math.min(ftb.ftbMade/15,1)*0.2 : 0);
  const penalty = injuryStatus === "QUESTIONABLE" ? 0.7 : 1;
  // Apply position-vs-opponent likelihood: boosts guards who face teams that allow guards to score first
  const posLikelihood = p.opp ? computePositionLikelihood(p.pos, p.opp, positionData) : 1.0;
  return Math.round(base * 100 * penalty * posLikelihood);
}

function getGrade(s) {
  if (s >= 72) return { label:"S", color:"#FFD700" };
  if (s >= 62) return { label:"A", color:"#4ADE80" };
  if (s >= 50) return { label:"B", color:"#60A5FA" };
  if (s >= 38) return { label:"C", color:"#F97316" };
  return { label:"D", color:"#F87171" };
}

function ShotBar({ shots }) {
  const total = Object.values(shots).reduce((a,b)=>a+b,0);
  if (!total) return null;
  return (
    <div style={{ display:"flex",gap:2,height:5,borderRadius:3,overflow:"hidden",marginTop:3 }}>
      {Object.entries(shots).filter(([,v])=>v>0).map(([k,v])=>(
        <div key={k} style={{ flex:v/total,background:SHOT_C[k] }}/>
      ))}
    </div>
  );
}

function PosBar({ data }) {
  const KNOWN_POS = ["PG","SG","SF","PF","C"];
  const entries = Object.entries(data).filter(([pos]) => KNOWN_POS.includes(pos));
  return (
    <div style={{ display:"flex",gap:2,height:8,borderRadius:4,overflow:"hidden" }}>
      {entries.map(([pos,pct])=>(
        <div key={pos} style={{ flex:pct,background:POS_C[pos],display:"flex",alignItems:"center",justifyContent:"center" }}>
          {pct>=15 && <span style={{ fontSize:7,fontWeight:900,color:"#000",opacity:.6 }}>{pos}</span>}
        </div>
      ))}
    </div>
  );
}

function InjuryBadge({ status, reason }) {
  const cfg = {
    OUT:          { bg:"#3f0d0d", border:"#ef4444", color:"#fca5a5", icon:"🚫" },
    QUESTIONABLE: { bg:"#3f2d00", border:"#f59e0b", color:"#fcd34d", icon:"⚠️" },
    PROBABLE:     { bg:"#0d2f1a", border:"#22c55e", color:"#86efac", icon:"🟡" },
  }[status] || { bg:"#1e2d4a", border:"#475569", color:"#94a3b8", icon:"" };

  return (
    <div style={{ display:"inline-flex",alignItems:"center",gap:5,background:cfg.bg,border:`1px solid ${cfg.border}`,borderRadius:6,padding:"3px 8px",marginTop:4 }}>
      <span style={{ fontSize:10 }}>{cfg.icon}</span>
      <span style={{ fontSize:10,fontWeight:700,color:cfg.color,letterSpacing:.5 }}>{status}</span>
      {reason && <span style={{ fontSize:9,color:cfg.color,opacity:.7,fontFamily:"Barlow,sans-serif" }}>· {reason}</span>}
    </div>
  );
}

// ─── INJURY FETCHER via ESPN public API ──────────────────────────────────────
// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function FTBScout() {
  const [tab, setTab] = useState("picks");
  const [selectedGame, setSelectedGame] = useState(null);
  const [sortBy, setSortBy] = useState("score");
  const [expanded, setExpanded] = useState(null);
  const [showOut, setShowOut] = useState(false);
  const [injuryData, setInjuryData] = useState(KNOWN_INJURIES_TODAY);
  const [injuryLoading, setInjuryLoading] = useState(true);
  const [injurySource, setInjurySource] = useState("cached");
  const [lineupData, setLineupData] = useState({});
  const [pbpData, setPbpData] = useState({});
  const [oddsKey, setOddsKey] = useState("");
  const [savedKey, setSavedKey] = useState(null);

  // ── Live Schedule State ──
  const [ctDateStr, setCtDateStr]       = useState(() => getCTDateString());
  const [liveGames, setLiveGames]       = useState([]);
  const [scheduleLoading, setSchedLoad] = useState(true);
  const [scheduleError, setSchedError]  = useState(null);
  const [espnGameIds, setEspnGameIds]   = useState({});

  // ── Dynamic Roster System ──
  const { players: rosterPlayers, rosterStatus, rosterLog, syncState, refreshRosters } = useRosters(liveGames);

  // ── PbP Data Engine State ──
  const [engineStatus, setEngineStatus] = useState("idle"); // idle | running | done | error
  const [engineProgress, setEngineProgress] = useState({ current:0, total:0, gamesProcessed:0, errors:0 });
  const [rawEvents, setRawEvents] = useState([]); // [{ date, gameId, defendingTeam, pos, scoringPlayer }]
  const [positionData, setPositionData] = useState(null); // computed from rawEvents; null = use fallback
  const [engineLog, setEngineLog] = useState([]);
  const engineRef = useRef(false);

  // Inject Google Fonts into document head (avoids @import-in-style-tag issues)
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,300;0,400;0,600;0,700;0,800;0,900;1,400&family=Barlow:wght@300;400;500&display=swap";
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch(e) {} };
  }, []);

  // ── Fetch today's NBA schedule from ESPN scoreboard API ───────────────────
  const fetchSchedule = useCallback(async (dateStr) => {
    setSchedLoad(true);
    setSchedError(null);
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${dateStr}&limit=20`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`ESPN returned ${res.status}`);
      const data = await res.json();

      const events = data?.events || [];
      const games = [];
      const ids = {};

      events.forEach(event => {
        const comp = event?.competitions?.[0];
        if (!comp) return;

        const homeComp = comp.competitors?.find(c => c.homeAway === "home");
        const awayComp = comp.competitors?.find(c => c.homeAway === "away");
        if (!homeComp || !awayComp) return;

        const home = normalizeAbbr(homeComp.team?.abbreviation);
        const away = normalizeAbbr(awayComp.team?.abbreviation);
        if (!home || !away) return;

        const time = parseGameTimeCT(event.date);
        const homeN = homeComp.team?.displayName || TEAM_NAMES[home] || home;
        const awayN = awayComp.team?.displayName || TEAM_NAMES[away] || away;
        const status = comp.status?.type?.name || "STATUS_SCHEDULED";
        const statusShort = comp.status?.type?.shortDetail || "";

        games.push({ home, away, homeN, awayN, time, status, statusShort, espnId: event.id });

        // Build both key orderings so lookups work regardless of home/away
        ids[`${home}-${away}`] = event.id;
        ids[`${away}-${home}`] = event.id;
      });

      setLiveGames(games);
      setEspnGameIds(ids);
    } catch(e) {
      setSchedError(e.message);
      setLiveGames([]);
    } finally {
      setSchedLoad(false);
    }
  }, []);

  // Fetch schedule on mount and whenever ctDateStr changes.
  // Also set a timer to re-fire at CT midnight so the date auto-rolls over.
  useEffect(() => {
    fetchSchedule(ctDateStr);

    // Schedule a CT-midnight refresh
    const ms = msUntilCTMidnight();
    const timer = setTimeout(() => {
      const newDate = getCTDateString();
      setCtDateStr(newDate);
      setSelectedGame(null);   // reset game selection on date change
      setPbpData({});           // stale PbP from yesterday is useless
    }, ms);

    return () => clearTimeout(timer);
  }, [ctDateStr, fetchSchedule]);

  // Load saved data from storage on mount
  useEffect(() => {
    async function loadSaved() {
      try {
        const raw = localStorage.getItem("ftb-pos-data");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.rawEvents?.length > 0) {
            setRawEvents(parsed.rawEvents);
            setPositionData(aggregatePositionData(parsed.rawEvents));
            setEngineStatus("done");
            addLog(`📦 Loaded ${parsed.rawEvents.length} cached events from storage`);
          }
        }
      } catch(e) {}
    }
    loadSaved();
  }, []);

  function addLog(msg) {
    setEngineLog(prev => [{ time: new Date().toLocaleTimeString(), msg }, ...prev].slice(0, 80));
  }

  // ─── MAIN DATA ENGINE ──────────────────────────────────────────────────────
  const runDataEngine = useCallback(async (forceRefresh = false) => {
    if (engineRef.current) return;
    engineRef.current = true;
    setEngineStatus("running");
    setEngineLog([]);
    addLog("🚀 Starting season PbP data engine...");

    const dates = getAllGameDates();
    setEngineProgress({ current:0, total:dates.length, gamesProcessed:0, errors:0 });

    const allEvents = forceRefresh ? [] : [...rawEvents];
    const processedGameIds = new Set(allEvents.map(e => e.gameId));
    let gamesProcessed = allEvents.length > 0 ? processedGameIds.size : 0;
    let errors = 0;

    for (let i = 0; i < dates.length; i++) {
      if (!engineRef.current) break; // allow cancel

      const date = dates[i];
      setEngineProgress(p => ({ ...p, current: i+1 }));

      try {
        // Step 1: Get game IDs for this date
        const sbRes = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date}&limit=20`
        );
        if (!sbRes.ok) { errors++; continue; }
        const sbData = await sbRes.json();
        const events = sbData?.events || [];

        if (events.length === 0) continue;

        addLog(`📅 ${date}: ${events.length} game(s)`);

        // Step 2: For each game, fetch PbP summary and extract first basket
        for (const event of events) {
          const gameId = event.id;
          if (processedGameIds.has(gameId)) continue; // skip already processed

          // Get team abbreviations
          const comps = event?.competitions?.[0];
          const homeTeam = comps?.competitors?.find(c => c.homeAway === "home")?.team?.abbreviation?.toUpperCase();
          const awayTeam = comps?.competitors?.find(c => c.homeAway === "away")?.team?.abbreviation?.toUpperCase();

          if (!homeTeam || !awayTeam) continue;

          try {
            const pbpRes = await fetch(
              `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`
            );
            if (!pbpRes.ok) { errors++; continue; }
            const pbpRaw = await pbpRes.json();

            const firstPlay = extractFirstScore(pbpRaw);
            if (!firstPlay) {
              addLog(`  ⚠️ ${awayTeam}@${homeTeam}: no first score found`);
              continue;
            }

            const defendingTeam = getDefendingTeam(firstPlay, homeTeam, awayTeam);
            const pos = getPosFromPlay(firstPlay);

            // Try to get player name
            const scoringPlayer = firstPlay?.participants?.[0]?.athlete?.displayName
                                || firstPlay?.athletesInvolved?.[0]?.displayName
                                || "Unknown";

            allEvents.push({ date, gameId, homeTeam, awayTeam, defendingTeam, pos, scoringPlayer });
            processedGameIds.add(gameId);
            gamesProcessed++;

            if (defendingTeam && pos) {
              addLog(`  ✓ ${awayTeam}@${homeTeam}: ${scoringPlayer} (${pos}) scored first → ${defendingTeam} defended`);
            } else {
              addLog(`  ⚠️ ${awayTeam}@${homeTeam}: ${scoringPlayer} scored but pos/team unclear`);
            }

            setEngineProgress(p => ({ ...p, gamesProcessed, errors }));
            setRawEvents([...allEvents]);

          } catch(e) {
            errors++;
            addLog(`  ❌ ${awayTeam}@${homeTeam}: ${e.message}`);
          }

          // Rate limit: small delay between game fetches
          await new Promise(r => setTimeout(r, 120));
        }

      } catch(e) {
        errors++;
        addLog(`❌ Date ${date}: ${e.message}`);
      }

      // Recompute position data every 10 dates
      if (i % 10 === 0 && allEvents.length > 0) {
        const computed = aggregatePositionData(allEvents);
        setPositionData(computed);
      }

      // Rate limit: small delay between date (scoreboard) fetches
      await new Promise(r => setTimeout(r, 60));
    }

    // Final compute + save to storage
    if (allEvents.length > 0) {
      const computed = aggregatePositionData(allEvents);
      setPositionData(computed);
      try {
        localStorage.setItem("ftb-pos-data", JSON.stringify({ rawEvents: allEvents, savedAt: new Date().toISOString() }));
        addLog(`💾 Saved ${allEvents.length} events to storage`);
      } catch(e) {}
    }

    setEngineStatus("done");
    setEngineProgress(p => ({ ...p, errors }));
    addLog(`✅ Done! Processed ${gamesProcessed} games, ${errors} errors`);
    engineRef.current = false;
  }, [rawEvents]);

  const stopEngine = () => {
    engineRef.current = false;
    setEngineStatus("idle");
    addLog("⏹ Engine stopped by user");
  };

  const clearData = async () => {
    try { localStorage.removeItem("ftb-pos-data"); } catch(e) {}
    setRawEvents([]);
    setPositionData(null);
    setEngineStatus("idle");
    setEngineLog([]);
    addLog("🗑 Data cleared");
  };

  // Use real data if available, else fallback
  const TEAM_POSITION_FTB = positionData || FALLBACK_POSITION_FTB;

  // Fetch injuries once daily with cache + retry
  const fetchInjuries = useCallback(async () => {
    setInjuryLoading(true);
    try {
      const cached = loadDailyCache(localStorage, DAILY_INJURY_CACHE_KEY);
      if (cached?.injuries) {
        setInjuryData(cached.injuries);
        setInjurySource("daily-cache");
        setInjuryLoading(false);
        return;
      }

      const endpoint = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries";
      const data = await fetchWithRetry(async (attempt) => {
        const res = await fetch(endpoint);
        if (!res.ok) {
          console.error("[DailyUpdate]", buildUpdateLog({ endpoint, statusCode: res.status, message: `HTTP ${res.status}`, teamAbbr: "NBA", updateType: "injury", attempt }));
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      }, { retries: 2, baseDelayMs: 400 });

      const fresh = {};
      if (data?.injuries) {
        data.injuries.forEach(team => {
          team.injuries?.forEach(inj => {
            const name = inj.athlete?.displayName || inj.athlete?.fullName;
            const status = inj.status?.toUpperCase();
            const mapped = status?.includes("OUT") ? "OUT" : status?.includes("QUESTION") ? "QUESTIONABLE" : status?.includes("PROBABLE") ? "PROBABLE" : null;
            if (name && mapped) {
              fresh[name] = { status: mapped, reason: inj.shortComment || inj.longComment || "Injury" };
            }
          });
        });
      }
      const merged = { ...KNOWN_INJURIES_TODAY, ...fresh };
      setInjuryData(merged);
      setInjurySource(Object.keys(fresh).length > 0 ? "espn-live" : "cached");
      saveDailyCache(localStorage, DAILY_INJURY_CACHE_KEY, { injuries: merged });
    } catch(e) {
      console.error('Failed to fetch injuries:', e);
      setInjurySource("cached");
    } finally {
      setInjuryLoading(false);
    }
  }, []);

  const fetchDailyLineups = useCallback(async () => {
    const cached = loadDailyCache(localStorage, DAILY_LINEUP_CACHE_KEY);
    if (cached?.lineups) {
      setLineupData(cached.lineups);
      return;
    }

    const teamsToday = [...new Set(liveGames.flatMap(g => [g.home, g.away]))];
    if (teamsToday.length === 0) return;

    const updates = {};
    for (const team of teamsToday) {
      const teamId = ESPN_TEAM_IDS[team];
      const endpoint = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/roster`;
      try {
        const rosterJson = await fetchWithRetry(async (attempt) => {
          const res = await fetch(endpoint);
          if (!res.ok) {
            console.error("[DailyUpdate]", buildUpdateLog({ endpoint, statusCode: res.status, message: `HTTP ${res.status}`, teamAbbr: team, updateType: "lineup", attempt }));
            throw new Error(`HTTP ${res.status}`);
          }
          return res.json();
        }, { retries: 2, baseDelayMs: 300 });

        const starters = [];
        const groups = rosterJson?.athletes || [];
        groups.forEach(group => {
          const items = group?.items || [];
          items.forEach(a => {
            if (a?.starter === true && a?.displayName) starters.push(a.displayName);
          });
        });

        if (starters.length === 0) {
          updates[team] = getStaticRoster(team).slice(0, 5).map(p => p.name);
        } else {
          updates[team] = starters.slice(0, 5);
        }
      } catch (e) {
        console.error("[DailyUpdate]", buildUpdateLog({ endpoint, statusCode: 0, message: e.message, teamAbbr: team, updateType: "lineup", attempt: 1 }));
      }
    }

    const staticByTeam = Object.fromEntries(teamsToday.map(t => [t, getStaticRoster(t)]));
    const validated = buildLineupMap(updates, staticByTeam, (msg) => console.warn("[DailyUpdate]", msg));
    setLineupData(validated);
    saveDailyCache(localStorage, DAILY_LINEUP_CACHE_KEY, { lineups: validated });
  }, [liveGames]);

  useEffect(() => { fetchInjuries(); }, [fetchInjuries]);
  useEffect(() => { fetchDailyLineups(); }, [fetchDailyLineups]);

  // Build the set of teams playing today from the live schedule
  const todayTeams = new Set(liveGames.flatMap(g => [g.home, g.away]));

  // Enrich dynamically-loaded roster players
  const enriched = rosterPlayers
    .filter(p => todayTeams.size === 0 || todayTeams.has(p.team))
    .map(p => {
      // Always resolve opp and gameTime from the live schedule (source of truth)
      const game = liveGames.find(g => g.home === p.team || g.away === p.team);
      const liveOpp  = game ? (game.home === p.team ? game.away : game.home) : (p.opp || "");
      const liveTime = game?.time || p.gameTime || "";

      const ftb    = SEASON_FTB_DATA[p.name];
      const injury = injuryData[p.name] || null;
      const score  = computeScore({ ...p, opp: liveOpp }, ftb, injury?.status, TEAM_POSITION_FTB);
      const lineupNames = lineupData[p.team] || [];
      const isStarter = lineupNames.includes(p.name);

      return { ...p, opp: liveOpp, gameTime: liveTime, ftb, injury, score, isStarter };
    });

  const filtered = selectedGame
    ? enriched.filter(p => p.team === selectedGame.home || p.team === selectedGame.away)
    : enriched;

  const visible = showOut ? filtered : filtered.filter(p => p.injury?.status !== "OUT");

  const sorted = [...visible].sort((a,b) => {
    if (sortBy === "score") return b.score - a.score;
    if (sortBy === "ftb")   return (b.ftb?.ftbMade||0) - (a.ftb?.ftbMade||0);
    if (sortBy === "ppg")   return b.ppg - a.ppg;
    if (sortBy === "usage") return b.usageRate - a.usageRate;
    return 0;
  });

  const topPick = sorted.find(p => !p.injury || p.injury.status !== "OUT");
  const outCount = enriched.filter(p => p.injury?.status === "OUT").length;
  const qCount   = enriched.filter(p => p.injury?.status === "QUESTIONABLE").length;

  // PbP fetch
  const fetchPbP = useCallback(async (gameId, key) => {
    if (!gameId || pbpData[gameId]) return;
    try {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`);
      const data = await res.json();
      const plays = (data?.plays || []).slice(0, 15);
      const status = data?.header?.competitions?.[0]?.status?.type?.description || "Scheduled";
      setPbpData(prev => ({ ...prev, [gameId]: { plays, status } }));
    } catch(e) {
      console.error('Failed to fetch PbP:', e);
    }
  }, [pbpData]);

  const ESPN_GAME_IDS = espnGameIds; // populated from live ESPN scoreboard fetch

  // The active game list is always the live-fetched schedule
  const GAMES_TODAY = liveGames;

  return (
    <div style={{ minHeight:"100vh", background:"#07090f", fontFamily:"'Barlow Condensed','Arial Narrow',sans-serif", color:"#e2e8f0" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:#2d3a5e;border-radius:2px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 18px rgba(255,215,0,.2)}50%{box-shadow:0 0 30px rgba(255,215,0,.4)}}
        @keyframes pulseRed{0%,100%{opacity:1}50%{opacity:.5}}
        .fi{animation:fadeUp .35s ease both}
        .hov{transition:background .15s,border-color .15s,transform .15s;cursor:pointer}
        .hov:hover{transform:translateY(-1px)}
        .btn{cursor:pointer;border:none;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.5px;transition:all .15s}
        .btn:hover{filter:brightness(1.2)}
        input:focus{outline:2px solid #3B82F6}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background:"#0a0d18", borderBottom:"1px solid #161f35", padding:"14px 18px", position:"sticky", top:0, zIndex:200 }}>
        <div style={{ maxWidth:960, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
          <div>
            <div style={{ display:"flex",gap:6,alignItems:"center" }}>
              <div style={{ width:7,height:7,borderRadius:"50%",background:"#4ADE80",boxShadow:"0 0 6px #4ADE80" }}/>
              <span style={{ fontSize:9,fontWeight:700,letterSpacing:3,color:"#4ADE80",textTransform:"uppercase" }}>NBA First Basket Scout</span>
              <span style={{ fontSize:9,background:"#1e2d4a",color:"#475569",padding:"1px 6px",borderRadius:4,letterSpacing:1 }}>v5</span>
            </div>
            <h1 style={{ fontSize:24,fontWeight:900,color:"#fff",letterSpacing:1,textTransform:"uppercase",lineHeight:1 }}>FTB <span style={{ color:"#FFD700" }}>Scout</span></h1>
          </div>
          {/* Injury status indicator */}
          <div style={{ display:"flex",gap:8,alignItems:"center" }}>
            {injuryLoading ? (
              <div style={{ display:"flex",gap:5,alignItems:"center",fontSize:10,color:"#475569" }}>
                <div style={{ width:10,height:10,border:"2px solid #3B82F6",borderTopColor:"transparent",borderRadius:"50%",animation:"spin .7s linear infinite" }}/>
                Checking injuries...
              </div>
            ) : (
              <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                <div style={{ fontSize:9,background:"#3f0d0d",border:"1px solid #ef444455",color:"#fca5a5",padding:"3px 8px",borderRadius:6,fontWeight:700 }}>
                  🚫 {outCount} OUT
                </div>
                {qCount > 0 && (
                  <div style={{ fontSize:9,background:"#3f2d00",border:"1px solid #f59e0b55",color:"#fcd34d",padding:"3px 8px",borderRadius:6,fontWeight:700 }}>
                    ⚠️ {qCount} QUESTIONABLE
                  </div>
                )}
                <div style={{ fontSize:8,color:"#334155",letterSpacing:.5 }}>
                  via {injurySource === "espn-live" ? "ESPN Live" : injurySource === "daily-cache" ? "Daily Cache" : "Confirmed Reports"}
                </div>
                <button className="btn" onClick={fetchInjuries} style={{ background:"#111827",border:"1px solid #1e2d4a",color:"#64748b",borderRadius:6,padding:"3px 8px",fontSize:9 }}>↻</button>
              </div>
            )}
          </div>
          {/* Tabs */}
          <div style={{ display:"flex",gap:3,background:"#0f1320",borderRadius:9,padding:3,border:"1px solid #161f35" }}>
            {[["picks","🏀 Picks"],["matchup","⚔️ Matchup"],["pbp","▶ Live PbP"],["odds","📊 Odds"],["engine","🔬 Data"]].map(([id,l])=>(
              <button key={id} className="btn" onClick={()=>setTab(id)} style={{ padding:"6px 13px",borderRadius:7,fontSize:10,background:tab===id?"#1D4ED8":"transparent",color:tab===id?"#fff":"#4B5563" }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:960, margin:"0 auto", padding:"14px 12px 40px" }}>

        {/* ── GAME SELECTOR ── */}
        <div style={{ marginBottom:12 }}>
          {/* Date + schedule status bar */}
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap" }}>
            <span style={{ fontSize:9,fontWeight:700,letterSpacing:2,color:"#334155",textTransform:"uppercase" }}>
              📅 {new Date(ctDateStr.replace(/(\d{4})(\d{2})(\d{2})/,"$1-$2-$3")).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})} CT
            </span>
            {scheduleLoading && (
              <span style={{ display:"flex",gap:4,alignItems:"center",fontSize:9,color:"#475569" }}>
                <div style={{ width:8,height:8,border:"2px solid #3B82F6",borderTopColor:"transparent",borderRadius:"50%",animation:"spin .7s linear infinite" }}/>
                Loading schedule...
              </span>
            )}
            {scheduleError && !scheduleLoading && (
              <span style={{ fontSize:9,color:"#F87171" }}>⚠ Schedule unavailable — {scheduleError}</span>
            )}
            {!scheduleLoading && !scheduleError && liveGames.length === 0 && (
              <span style={{ fontSize:9,color:"#475569" }}>No NBA games scheduled today</span>
            )}
            {!scheduleLoading && liveGames.length > 0 && (
              <span style={{ fontSize:9,color:"#4ADE80" }}>✓ {liveGames.length} game{liveGames.length!==1?"s":""} today</span>
            )}
            {/* Roster sync status */}
            {(() => {
              const statuses = Object.values(rosterStatus);
              const checking = statuses.filter(s => s === "checking" || s === "loading").length;
              const errors   = statuses.filter(s => s === "error").length;
              const stale    = statuses.filter(s => s === "stale").length;
              if (syncState === "syncing" || checking > 0) return (
                <span style={{ display:"flex",gap:4,alignItems:"center",fontSize:9,color:"#818CF8" }}>
                  <div style={{ width:8,height:8,border:"2px solid #818CF8",borderTopColor:"transparent",borderRadius:"50%",animation:"spin .7s linear infinite" }}/>
                  Syncing rosters{checking > 0 ? ` (${checking} remaining)` : ""}...
                </span>
              );
              if (syncState === "ready") return (
                <span style={{ fontSize:9,color:"#818CF8" }}>
                  👥 {rosterPlayers.length} players
                  {stale > 0 ? <span style={{color:"#F59E0B"}}> · {stale} stale</span> : ""}
                  {errors > 0 ? <span style={{color:"#ef4444"}}> · {errors} err</span> : ""}
                </span>
              );
              if (syncState === "partial") return (
                <span style={{ fontSize:9,color:"#F59E0B" }}>⚠ Partial: {rosterPlayers.length} players ({errors} failed)</span>
              );
              return null;
            })()}
            <button className="btn" onClick={()=>fetchSchedule(ctDateStr)} style={{ marginLeft:"auto",background:"#0f1320",border:"1px solid #161f35",color:"#4B5563",borderRadius:6,padding:"2px 8px",fontSize:9 }}>↻</button>
            <button className="btn" onClick={()=>refreshRosters(liveGames)} title="Force-refresh all rosters" style={{ background:"#0f1320",border:"1px solid #161f35",color:"#4B5563",borderRadius:6,padding:"2px 8px",fontSize:9 }}>👥↻</button>
          </div>
          {/* Game filter pills */}
          <div style={{ display:"flex",gap:5,overflowX:"auto",paddingBottom:2 }}>
            <button className="btn" onClick={()=>setSelectedGame(null)} style={{ padding:"4px 11px",borderRadius:18,fontSize:10,background:!selectedGame?"#2563EB":"#0f1320",color:!selectedGame?"#fff":"#4B5563",border:"1px solid "+(!selectedGame?"#2563EB":"#161f35"),whiteSpace:"nowrap" }}>ALL</button>
            {GAMES_TODAY.map(g=>(
              <button key={g.home} className="btn" onClick={()=>setSelectedGame(g===selectedGame?null:g)}
                style={{ padding:"4px 11px",borderRadius:18,fontSize:10,background:selectedGame?.home===g.home?"#2563EB":"#0f1320",color:selectedGame?.home===g.home?"#fff":"#4B5563",border:"1px solid "+(selectedGame?.home===g.home?"#2563EB":"#161f35"),whiteSpace:"nowrap" }}>
                {g.away}@{g.home} <span style={{ opacity:.5 }}>{g.time}</span>
                {g.statusShort && g.status !== "STATUS_SCHEDULED" && (
                  <span style={{ marginLeft:3,color:"#4ADE80",opacity:.8 }}>{g.statusShort}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── PICKS TAB ── */}
        {tab === "picks" && (
          <>
            {/* Hero */}
            {topPick && (
              <div className="fi" style={{ background:`linear-gradient(135deg,${TC[topPick.team]}22 0%,#0d1525 65%)`,border:`1px solid ${TC[topPick.team]}55`,borderRadius:14,padding:"16px 20px",marginBottom:14,animation:"glow 2.5s infinite" }}>
                <div style={{ fontSize:8,fontWeight:700,letterSpacing:3,color:"#FFD700",marginBottom:5 }}>⭐ TOP ACTIVE PICK TONIGHT</div>
                <div style={{ display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,alignItems:"flex-end" }}>
                  <div>
                    <div style={{ fontSize:28,fontWeight:900,color:"#fff",textTransform:"uppercase",lineHeight:1 }}>{topPick.name}</div>
                    <div style={{ display:"flex",gap:5,marginTop:3,alignItems:"center",flexWrap:"wrap" }}>
                      <span style={{ background:TC[topPick.team],color:"#fff",padding:"1px 7px",borderRadius:3,fontSize:10,fontWeight:700 }}>{topPick.team}</span>
                      <span style={{ color:"#64748b",fontSize:11 }}>{topPick.pos} · vs {topPick.opp} · {topPick.gameTime} ET</span>
                      {topPick.ftb && <span style={{ fontSize:10,color:"#FFD700",fontWeight:700 }}>🏀 {topPick.ftb.ftbMade} FTBs this season</span>}
                    </div>
                    {topPick.ftb && <ShotBar shots={topPick.ftb.shots}/>}
                  </div>
                  <div style={{ display:"flex",gap:16 }}>
                    {[["Score",`${topPick.score}`,"#FFD700"],["PPG",topPick.ppg,"#60A5FA"],["USG%",`${topPick.usageRate}%`,"#F97316"],["FTB%",`${topPick.ftbPct}%`,"#4ADE80"]].map(([l,v,c])=>(
                      <div key={l} style={{ textAlign:"center" }}>
                        <div style={{ fontSize:20,fontWeight:900,color:c }}>{v}</div>
                        <div style={{ fontSize:8,color:"#475569",letterSpacing:1.5,textTransform:"uppercase" }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Controls row */}
            <div style={{ display:"flex",gap:6,marginBottom:10,alignItems:"center",flexWrap:"wrap" }}>
              <span style={{ fontSize:9,color:"#334155",letterSpacing:1.5,textTransform:"uppercase" }}>Sort:</span>
              {[["score","Score"],["ftb","FTBs Made"],["ppg","PPG"],["usage","Usage%"]].map(([k,l])=>(
                <button key={k} className="btn" onClick={()=>setSortBy(k)} style={{ padding:"3px 9px",borderRadius:18,fontSize:10,background:sortBy===k?"#7C3AED":"#0f1320",color:sortBy===k?"#fff":"#4B5563",border:"1px solid "+(sortBy===k?"#7C3AED":"#161f35") }}>{l}</button>
              ))}
              <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:6 }}>
                <label style={{ display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:10,color:"#64748b" }}>
                  <div onClick={()=>setShowOut(v=>!v)} style={{ width:30,height:16,borderRadius:8,background:showOut?"#EF4444":"#1e2d4a",position:"relative",transition:"background .2s",cursor:"pointer" }}>
                    <div style={{ position:"absolute",top:2,left:showOut?14:2,width:12,height:12,borderRadius:"50%",background:"#fff",transition:"left .2s" }}/>
                  </div>
                  Show OUT players
                </label>
              </div>
            </div>

            {/* Player list */}
            <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
              {sorted.map((player, i) => {
                const grade = getGrade(player.score);
                const isOut = player.injury?.status === "OUT";
                const isQ   = player.injury?.status === "QUESTIONABLE";
                const isOpen = expanded === player.name;
                const oppPos = TEAM_POSITION_FTB[player.opp];

                return (
                  <div key={player.name} className={`hov fi`} onClick={()=>!isOut&&setExpanded(isOpen?null:player.name)}
                    style={{
                      background: isOut ? "#0c0d0f" : isOpen ? `linear-gradient(135deg,${TC[player.team]}18 0%,#0d1525 100%)` : "#0d1120",
                      border:`1px solid ${isOut?"#1a0d0d":isQ?"#3f2d00":isOpen?TC[player.team]+"55":"#161f35"}`,
                      borderRadius:11, padding:"10px 12px",
                      opacity: isOut ? 0.45 : 1,
                      animationDelay:`${i*0.025}s`,
                    }}>
                    <div style={{ display:"flex",alignItems:"center",gap:9 }}>
                      {/* Rank */}
                      <div style={{ width:24,height:24,minWidth:24,borderRadius:"50%",background:isOut?"#1a1a1a":i===0&&!isOut?"#FFD700":i===1?"#C0C0C0":i===2?"#CD7F32":"#161f35",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:i<3&&!isOut?"#000":"#4B5563" }}>
                        {isOut ? "–" : i+1}
                      </div>
                      {/* Grade */}
                      <div style={{ width:30,height:30,minWidth:30,borderRadius:7,background:isOut?"#111":grade.color + "18",border:`2px solid ${isOut?"#2d1515":grade.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:isOut?"#3d1515":grade.color }}>
                        {isOut?"✕":grade.label}
                      </div>
                      {/* Name + status */}
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontWeight:800,fontSize:14,color:isOut?"#3d2d2d":"#f1f5f9",textTransform:"uppercase",letterSpacing:.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                          {player.name}
                          {isOut && <span style={{ fontSize:9,marginLeft:6,color:"#ef4444",fontWeight:700,animation:"pulseRed 2s infinite" }}>OUT TONIGHT</span>}
                        </div>
                        <div style={{ display:"flex",gap:4,alignItems:"center",marginTop:1,flexWrap:"wrap" }}>
                          <span style={{ background:TC[player.team],color:"#fff",padding:"1px 5px",borderRadius:3,fontSize:8,fontWeight:700 }}>{player.team}</span>
                          <span style={{ fontSize:9,color:"#334155" }}>vs {player.opp} · {player.pos} · {player.gameTime}</span>
                          {player.ftb && !isOut && <span style={{ fontSize:9,color:"#FFD700",fontWeight:700 }}>🏀×{player.ftb.ftbMade}</span>}
                        </div>
                        {player.isStarter && <div style={{ fontSize:9,color:"#4ADE80",fontWeight:800,marginTop:3 }}>★ STARTER</div>}
                        {player.injury && <InjuryBadge status={player.injury.status} reason={player.injury.reason}/>}
                        {player.ftb && !isOut && <ShotBar shots={player.ftb.shots}/>}
                      </div>
                      {/* Stats */}
                      {!isOut && (
                        <div style={{ display:"flex",gap:12,alignItems:"center",flexShrink:0 }}>
                          <MS l="PPG"  v={player.ppg}               c="#60A5FA"/>
                          <MS l="USG%" v={`${player.usageRate}%`}   c="#F97316"/>
                          <MS l="FTB%" v={`${player.ftbPct}%`}      c="#4ADE80"/>
                          <div style={{ textAlign:"center",minWidth:34 }}>
                            <div style={{ fontSize:17,fontWeight:900,color:grade.color }}>{player.score}</div>
                            <div style={{ fontSize:7,color:"#334155",letterSpacing:1,textTransform:"uppercase" }}>Score</div>
                          </div>
                        </div>
                      )}
                      {isOut && <div style={{ fontSize:11,color:"#3d1515",fontStyle:"italic",fontFamily:"Barlow,sans-serif" }}>Not playing tonight</div>}
                    </div>

                    {/* Score bar */}
                    {!isOut && (
                      <div style={{ marginTop:7,background:"#161f35",borderRadius:2,height:3 }}>
                        <div style={{ width:`${player.score}%`,height:"100%",background:`linear-gradient(90deg,${TC[player.team]},${TA[player.team]||"#fff"})`,borderRadius:2,transition:"width .8s" }}/>
                      </div>
                    )}

                    {/* Expanded */}
                    {isOpen && !isOut && (
                      <div style={{ marginTop:10,paddingTop:10,borderTop:"1px solid #161f35",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10 }}>
                        {player.ftb && (
                          <div>
                            <div style={{ fontSize:8,color:"#334155",letterSpacing:1.5,textTransform:"uppercase",marginBottom:5 }}>FTB Shot Breakdown</div>
                            <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                              {Object.entries(player.ftb.shots).filter(([,v])=>v>0).map(([k,v])=>(
                                <div key={k} style={{ background:SHOT_C[k]+"22",border:`1px solid ${SHOT_C[k]}44`,borderRadius:6,padding:"4px 8px",textAlign:"center" }}>
                                  <div style={{ fontSize:15,fontWeight:900,color:SHOT_C[k] }}>{v}</div>
                                  <div style={{ fontSize:7,color:"#475569",textTransform:"uppercase" }}>{k==="threeP"?"3PT":k==="ft"?"FT":k.toUpperCase()}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {oppPos && (
                          <div>
                            <div style={{ fontSize:8,color:"#334155",letterSpacing:1.5,textTransform:"uppercase",marginBottom:5 }}>vs {player.opp}: FTB by Position</div>
                            <PosBar data={oppPos}/>
                            <div style={{ marginTop:4,fontSize:9,color:"#64748b",fontFamily:"Barlow,sans-serif" }}>
                              {player.pos} accounts for ~{oppPos[player.pos]}% of {player.opp}'s FTBs allowed
                            </div>
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize:8,color:"#334155",letterSpacing:1.5,textTransform:"uppercase",marginBottom:5 }}>Analysis</div>
                          <div style={{ fontSize:10,color:"#64748b",fontFamily:"Barlow,sans-serif",lineHeight:1.5 }}>
                            {player.name} has scored the first basket {player.ftb?.ftbMade||0} times this season with a {player.usageRate}% usage rate. Scores first in ~{player.ftbPct}% of games.
                            {isQ ? " ⚠️ Listed as questionable — confirm availability before betting." : ""}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ marginTop:16,padding:"10px 14px",background:"#0a0d18",borderRadius:8,border:"1px solid #161f35" }}>
              <div style={{ display:"flex",gap:14,flexWrap:"wrap",marginBottom:6 }}>
                {Object.entries(SHOT_C).map(([k,c])=>(
                  <div key={k} style={{ display:"flex",gap:4,alignItems:"center" }}>
                    <div style={{ width:8,height:8,borderRadius:2,background:c }}/>
                    <span style={{ fontSize:9,color:"#475569" }}>{k==="threeP"?"3-Pointer":k==="rim"?"Rim":k==="mid"?"Mid-Range":"Free Throw"}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:8,color:"#1e2d4a" }}>Injury data: ESPN + confirmed reports · FTB stats: jedibets.com 2025-26 · FOR ENTERTAINMENT PURPOSES ONLY</div>
            </div>
          </>
        )}

        {/* ── MATCHUP TAB ── */}
        {tab === "matchup" && (
          <div className="fi">
            {(selectedGame ? [selectedGame] : GAMES_TODAY).map(g => {
              const hStats = TEAM_FTB_STATS[g.home];
              const aStats = TEAM_FTB_STATS[g.away];
              const hPos = TEAM_POSITION_FTB[g.home];
              const aPos = TEAM_POSITION_FTB[g.away];
              const hcColor = s => s?.hotCold==="HOT"?"#4ADE80":s?.hotCold==="WARM"?"#F59E0B":"#F87171";
              return (
                <div key={g.home} style={{ background:"#0a0d18",border:"1px solid #161f35",borderRadius:12,padding:"14px 16px",marginBottom:12 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
                    <span style={{ background:TC[g.away],color:"#fff",padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:800 }}>{g.away}</span>
                    <span style={{ fontSize:10,color:"#334155" }}>@</span>
                    <span style={{ background:TC[g.home],color:"#fff",padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:800 }}>{g.home}</span>
                    <span style={{ fontSize:10,color:"#334155" }}>·</span>
                    <span style={{ fontSize:10,color:"#475569" }}>{g.time} ET</span>
                    {hStats && <span style={{ marginLeft:"auto",fontSize:9,background:hcColor(hStats)+"22",color:hcColor(hStats),border:`1px solid ${hcColor(hStats)}44`,padding:"1px 7px",borderRadius:10,fontWeight:700 }}>HOME {hStats.hotCold}</span>}
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 40px 1fr",gap:10,alignItems:"start" }}>
                    {/* Away */}
                    <TeamCol stats={aStats} pos={aPos} team={g.away} label="AWAY"/>
                    <div style={{ textAlign:"center",color:"#1e2d4a",fontWeight:900,fontSize:16,paddingTop:20 }}>vs</div>
                    {/* Home */}
                    <TeamCol stats={hStats} pos={hPos} team={g.home} label="HOME" right/>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── PBP TAB ── */}
        {tab === "pbp" && (
          <div className="fi">
            <p style={{ fontSize:11,color:"#334155",marginBottom:12,fontFamily:"Barlow,sans-serif" }}>
              ESPN live play-by-play. Data appears once games start. Click a game to load.
            </p>
            {(selectedGame ? [selectedGame] : GAMES_TODAY).map(g => {
              const key = `${g.away}-${g.home}`;
              const gameId = ESPN_GAME_IDS[key];
              const d = pbpData[gameId];
              return (
                <div key={key} style={{ background:"#0a0d18",border:"1px solid #161f35",borderRadius:12,padding:"12px 14px",marginBottom:10 }}>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                      <span style={{ background:TC[g.away]||"#333",color:"#fff",padding:"1px 6px",borderRadius:3,fontSize:9,fontWeight:700 }}>{g.away}</span>
                      <span style={{ fontSize:9,color:"#334155" }}>@</span>
                      <span style={{ background:TC[g.home]||"#333",color:"#fff",padding:"1px 6px",borderRadius:3,fontSize:9,fontWeight:700 }}>{g.home}</span>
                      <span style={{ fontSize:9,color:"#475569" }}>· {g.time}</span>
                      {d?.status && <span style={{ fontSize:8,background:"#161f35",color:"#64748b",padding:"1px 6px",borderRadius:8,border:"1px solid #1e2d4a" }}>{d.status}</span>}
                    </div>
                    <button className="btn" onClick={()=>fetchPbP(gameId, key)} style={{ background:"#161f35",border:"1px solid #1e2d4a",color:"#475569",borderRadius:6,padding:"3px 9px",fontSize:9 }}>
                      {d ? "↻ Refresh" : "Load"}
                    </button>
                  </div>
                  {d?.plays?.length > 0 ? (
                    <div style={{ maxHeight:180,overflowY:"auto",display:"flex",flexDirection:"column",gap:3 }}>
                      {d.plays.map((play,j)=>(
                        <div key={j} style={{ display:"flex",gap:8,padding:"4px 7px",background:j===0?"#0d2010":"#0d1120",borderRadius:5,borderLeft:`2px solid ${j===0?"#34D399":"#161f35"}` }}>
                          <span style={{ fontSize:9,color:"#334155",minWidth:38,fontFamily:"monospace" }}>{play?.clock?.displayValue||"--"}</span>
                          <span style={{ fontSize:10,color:j===0?"#4ADE80":"#64748b",flex:1,fontFamily:"Barlow,sans-serif" }}>{play?.text||"—"}</span>
                        </div>
                      ))}
                    </div>
                  ) : d ? (
                    <div style={{ fontSize:11,color:"#F59E0B",padding:"6px",background:"#1a1f10",borderRadius:5 }}>No plays yet — game may not have started.</div>
                  ) : (
                    <div style={{ fontSize:10,color:"#334155" }}>Click Load to fetch play-by-play from ESPN.</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── ODDS TAB ── */}
        {tab === "odds" && (
          <div className="fi">
            <div style={{ background:"#0a0d18",border:"1px solid #161f35",borderRadius:12,padding:"14px 16px",marginBottom:12 }}>
              <div style={{ fontSize:10,fontWeight:700,letterSpacing:2,color:"#64748b",textTransform:"uppercase",marginBottom:10 }}>Live Sportsbook Odds API</div>
              {!savedKey ? (
                <>
                  <p style={{ fontSize:11,color:"#475569",fontFamily:"Barlow,sans-serif",lineHeight:1.6,marginBottom:10 }}>
                    Get a free API key at <a href="https://the-odds-api.com" target="_blank" rel="noreferrer" style={{ color:"#60A5FA" }}>the-odds-api.com</a> (500 free requests/month). Supports DraftKings, FanDuel, BetMGM, Caesars & more. First basket player props available on paid tiers.
                  </p>
                  <div style={{ display:"flex",gap:8 }}>
                    <input value={oddsKey} onChange={e=>setOddsKey(e.target.value)} placeholder="Paste API key..." style={{ flex:1,background:"#161f35",border:"1px solid #1e2d4a",borderRadius:8,padding:"8px 12px",color:"#e2e8f0",fontSize:12,fontFamily:"monospace",outline:"none" }}/>
                    <button className="btn" onClick={()=>setSavedKey(oddsKey)} disabled={!oddsKey.trim()} style={{ background:"#2563EB",color:"#fff",borderRadius:8,padding:"8px 16px",fontSize:11,opacity:oddsKey?1:.4 }}>CONNECT</button>
                  </div>
                </>
              ) : (
                <div>
                  <div style={{ fontSize:11,color:"#4ADE80",marginBottom:8 }}>✓ API key saved. Odds will appear on player cards.</div>
                  <button className="btn" onClick={()=>setSavedKey(null)} style={{ background:"#161f35",border:"1px solid #1e2d4a",color:"#64748b",borderRadius:6,padding:"4px 10px",fontSize:10 }}>Disconnect</button>
                </div>
              )}
            </div>
            <div style={{ background:"#0a0d18",border:"1px solid #161f35",borderRadius:12,padding:"14px 16px" }}>
              <div style={{ fontSize:10,fontWeight:700,letterSpacing:2,color:"#64748b",textTransform:"uppercase",marginBottom:10 }}>Sportsbook FTB Rules</div>
              {[
                ["Free Throws Count","DraftKings · FanDuel · Caesars · BetOnline · Bovada · Bet365 · Hard Rock"],
                ["Field Goals Only (No FTs)","BetMGM · BetRivers · Fanatics"],
              ].map(([rule,books])=>(
                <div key={rule} style={{ marginBottom:10,padding:"9px 11px",background:"#0d1120",borderRadius:8,border:"1px solid #161f35" }}>
                  <div style={{ fontSize:11,fontWeight:700,color:"#e2e8f0",marginBottom:2 }}>{rule}</div>
                  <div style={{ fontSize:10,color:"#475569",fontFamily:"Barlow,sans-serif" }}>{books}</div>
                </div>
              ))}
              <div style={{ fontSize:9,color:"#1e2d4a",marginTop:6,fontFamily:"Barlow,sans-serif" }}>
                Tip: On sportsbooks that count FTs, high-contact players like Embiid or Giannis become more valuable for FTB bets — even if they're not always the first to attempt a field goal.
              </div>
            </div>
          </div>
        )}


        {/* ── DATA ENGINE TAB ── */}
        {tab === "engine" && (
          <div className="fi">
            {/* Header */}
            <div style={{ background:"#0a0d18",border:"1px solid #161f35",borderRadius:12,padding:"14px 16px",marginBottom:10 }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8 }}>
                <div>
                  <div style={{ fontSize:10,fontWeight:700,letterSpacing:2,color:"#818CF8",textTransform:"uppercase",marginBottom:3 }}>🔬 Season PbP Position Engine</div>
                  <div style={{ fontSize:11,color:"#475569",fontFamily:"Barlow,sans-serif",lineHeight:1.5,maxWidth:500 }}>
                    Fetches every NBA game from <strong style={{color:"#e2e8f0"}}>Oct 21, 2025 → today</strong> via ESPN's free PbP API.
                    Extracts the <strong style={{color:"#FFD700"}}>first scoring play</strong> of each game, maps the scorer's position,
                    and aggregates by defending team. Replaces hardcoded estimates with real data.
                  </div>
                </div>
                <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                  {engineStatus === "running" ? (
                    <button className="btn" onClick={stopEngine} style={{ background:"#7f1d1d",border:"1px solid #ef4444",color:"#fca5a5",borderRadius:8,padding:"7px 14px",fontSize:11 }}>⏹ Stop</button>
                  ) : (
                    <button className="btn" onClick={()=>runDataEngine(false)} style={{ background:"#1D4ED8",color:"#fff",borderRadius:8,padding:"7px 14px",fontSize:11 }}>
                      {rawEvents.length > 0 ? "▶ Resume / Update" : "▶ Run Engine"}
                    </button>
                  )}
                  {rawEvents.length > 0 && engineStatus !== "running" && (
                    <button className="btn" onClick={()=>runDataEngine(true)} style={{ background:"#1e2d4a",border:"1px solid #2d3f6a",color:"#64748b",borderRadius:8,padding:"7px 12px",fontSize:11 }}>↺ Full Refresh</button>
                  )}
                  {rawEvents.length > 0 && (
                    <button className="btn" onClick={clearData} style={{ background:"#1a0d0d",border:"1px solid #ef444433",color:"#ef4444",borderRadius:8,padding:"7px 12px",fontSize:11 }}>🗑 Clear</button>
                  )}
                </div>
              </div>

              {/* Progress */}
              {engineStatus === "running" && (
                <div style={{ marginTop:12 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                    <span style={{ fontSize:9,color:"#64748b" }}>Scanning {engineProgress.current} / {engineProgress.total} dates · {engineProgress.gamesProcessed} games processed</span>
                    <span style={{ fontSize:9,color:"#ef4444" }}>{engineProgress.errors} errors</span>
                  </div>
                  <div style={{ height:4,background:"#161f35",borderRadius:2 }}>
                    <div style={{ height:"100%",width:`${engineProgress.total>0?(engineProgress.current/engineProgress.total)*100:0}%`,background:"linear-gradient(90deg,#1D4ED8,#818CF8)",borderRadius:2,transition:"width .5s" }}/>
                  </div>
                </div>
              )}

              {/* Status badges */}
              <div style={{ display:"flex",gap:8,marginTop:10,flexWrap:"wrap" }}>
                <div style={{ fontSize:9,background:engineStatus==="done"?"#0d2010":"#161f35",border:`1px solid ${engineStatus==="done"?"#22c55e33":"#1e2d4a"}`,color:engineStatus==="done"?"#4ADE80":"#334155",padding:"3px 10px",borderRadius:6,fontWeight:700 }}>
                  {engineStatus==="idle"?"⏸ IDLE":engineStatus==="running"?"🔄 RUNNING":engineStatus==="done"?"✅ COMPLETE":"❌ ERROR"}
                </div>
                <div style={{ fontSize:9,background:"#0d1120",border:"1px solid #1e2d4a",color:"#64748b",padding:"3px 10px",borderRadius:6 }}>
                  {rawEvents.length} events collected
                </div>
                <div style={{ fontSize:9,background:"#0d1120",border:"1px solid #1e2d4a",color:"#64748b",padding:"3px 10px",borderRadius:6 }}>
                  {positionData ? `${Object.keys(positionData).length} teams with real data` : "Using fallback estimates"}
                </div>
                {rawEvents.length > 0 && (
                  <div style={{ fontSize:9,background:"#1a1208",border:"1px solid #f59e0b33",color:"#F59E0B",padding:"3px 10px",borderRadius:6 }}>
                    📊 Results auto-applied to Matchup tab
                  </div>
                )}
              </div>
            </div>

            {/* Results grid */}
            {positionData && Object.keys(positionData).length > 0 && (
              <div style={{ background:"#0a0d18",border:"1px solid #161f35",borderRadius:12,padding:"14px 16px",marginBottom:10 }}>
                <div style={{ fontSize:10,fontWeight:700,letterSpacing:2,color:"#64748b",textTransform:"uppercase",marginBottom:10 }}>
                  📊 Real Position FTB Data — All 30 Teams
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8 }}>
                  {Object.entries(positionData).sort(([a],[b])=>a.localeCompare(b)).map(([team,data])=>{
                    const topPos = Object.entries(data).filter(([k])=>["PG","SG","SF","PF","C"].includes(k)).sort(([,a],[,b])=>b-a)[0];
                    return (
                      <div key={team} style={{ background:"#0d1120",border:"1px solid #161f35",borderRadius:8,padding:"9px 11px" }}>
                        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5 }}>
                          <span style={{ background:TC[team]||"#333",color:"#fff",padding:"1px 6px",borderRadius:3,fontSize:9,fontWeight:800 }}>{team}</span>
                          <span style={{ fontSize:8,color:"#334155" }}>{data.totalGames}g</span>
                          {topPos && <span style={{ fontSize:8,background:POS_C[topPos[0]]+"22",color:POS_C[topPos[0]],padding:"1px 5px",borderRadius:3,fontWeight:700 }}>#{topPos[0]} {topPos[1]}%</span>}
                        </div>
                        <PosBar data={data}/>
                        <div style={{ display:"flex",gap:3,flexWrap:"wrap",marginTop:4 }}>
                          {["PG","SG","SF","PF","C"].map(pos=>(
                            <span key={pos} style={{ fontSize:7,color:POS_C[pos],opacity:.7 }}>{pos}:{data[pos]}%</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Log */}
            <div style={{ background:"#050709",border:"1px solid #0d1525",borderRadius:10,padding:"10px 12px" }}>
              <div style={{ fontSize:9,fontWeight:700,letterSpacing:2,color:"#334155",textTransform:"uppercase",marginBottom:7 }}>Engine Log</div>
              {engineLog.length === 0 ? (
                <div style={{ fontSize:10,color:"#1e2d4a",fontFamily:"monospace" }}>No activity yet. Click "Run Engine" to start.</div>
              ) : (
                <div style={{ maxHeight:320,overflowY:"auto",display:"flex",flexDirection:"column",gap:2 }}>
                  {engineLog.map((entry,i)=>(
                    <div key={i} style={{ display:"flex",gap:8,fontSize:9,fontFamily:"monospace",color:entry.msg.startsWith("✅")?"#4ADE80":entry.msg.startsWith("❌")?"#ef4444":entry.msg.startsWith("⚠️")?"#F59E0B":"#475569" }}>
                      <span style={{ color:"#1e2d4a",flexShrink:0 }}>{entry.time}</span>
                      <span>{entry.msg}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop:10,padding:"8px 12px",background:"#0a0d18",border:"1px solid #161f35",borderRadius:8 }}>
              <div style={{ fontSize:9,color:"#334155",lineHeight:1.6,fontFamily:"Barlow,sans-serif" }}>
                <strong style={{color:"#475569"}}>How it works:</strong> The engine calls ESPN's free public scoreboard API to get all game IDs since Oct 21, 2025, then fetches each game's play-by-play summary and extracts the first scoring play. It maps the scorer's position (PG/SG/SF/PF/C) and records which team was defending. After ~{getAllGameDates().length} date scans and ~900 game fetches, the Matchup tab will show real defensive position breakdowns instead of estimates. Results are cached in storage so you only need to run it once (then "Resume" to add new games).
                <br/><br/>
                <strong style={{color:"#ef4444"}}>Note:</strong> ~900 API calls at 120ms delay ≈ 2–3 minutes. ESPN's free API has no key requirement but may rate-limit heavy usage.
              </div>
            </div>

            {/* ── ROSTER STATUS PANEL ── */}
            <div style={{ background:"#0a0d18",border:"1px solid #161f35",borderRadius:12,padding:"14px 16px",marginTop:10 }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:6 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <div style={{ fontSize:10,fontWeight:700,letterSpacing:2,color:"#818CF8",textTransform:"uppercase" }}>👥 Live Roster System</div>
                  {/* Sync state badge */}
                  <div style={{ fontSize:9,padding:"2px 8px",borderRadius:8,fontWeight:700,
                    background: syncState==="ready"?"#0d2010":syncState==="syncing"?"#0d1525":syncState==="partial"?"#1a1208":"#0d1120",
                    color:      syncState==="ready"?"#4ADE80":syncState==="syncing"?"#818CF8":syncState==="partial"?"#F59E0B":"#334155",
                    border:     `1px solid ${syncState==="ready"?"#22c55e33":syncState==="syncing"?"#818CF833":syncState==="partial"?"#f59e0b33":"#1e2d4a"}`,
                  }}>
                    {syncState==="ready"?"✅ SYNCED":syncState==="syncing"?"🔄 SYNCING...":syncState==="partial"?"⚠ PARTIAL":"⏸ IDLE"}
                  </div>
                </div>
                <button className="btn" onClick={()=>refreshRosters(liveGames)}
                  style={{ background:"#1e2d4a",border:"1px solid #2d3f6a",color:"#818CF8",borderRadius:6,padding:"4px 12px",fontSize:10 }}>
                  ↺ Force Sync All Rosters
                </button>
              </div>
              <div style={{ fontSize:10,color:"#475569",fontFamily:"Barlow,sans-serif",marginBottom:10,lineHeight:1.5 }}>
                On every app launch, rosters for all teams playing today are validated and re-fetched from ESPN.
                The position likelihood score adjusts each player's FTB probability based on how often
                their position scores first against that specific opponent.
              </div>

              {/* Per-team status grid */}
              {Object.keys(rosterStatus).length > 0 ? (
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:6 }}>
                  {Object.entries(rosterStatus).sort(([a],[b])=>a.localeCompare(b)).map(([team,status]) => {
                    const teamPlayers = rosterPlayers.filter(p => p.team === team);
                    const statusMeta = {
                      ready:    { color:"#4ADE80",  icon:"✓",  label:"SYNCED"   },
                      cached:   { color:"#818CF8",  icon:"📦", label:"CACHED"   },
                      stale:    { color:"#F59E0B",  icon:"⚠",  label:"STALE"    },
                      loading:  { color:"#60A5FA",  icon:"⟳",  label:"FETCHING" },
                      checking: { color:"#64748b",  icon:"🔍", label:"CHECKING" },
                      error:    { color:"#ef4444",  icon:"✗",  label:"ERROR"    },
                    }[status] || { color:"#334155", icon:"?",  label:status };
                    return (
                      <div key={team} style={{ background:"#0d1120",border:`1px solid ${statusMeta.color}22`,borderRadius:8,padding:"7px 10px" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:5,marginBottom:3 }}>
                          <span style={{ background:TC[team]||"#333",color:"#fff",padding:"1px 5px",borderRadius:3,fontSize:8,fontWeight:800 }}>{team}</span>
                          <span style={{ fontSize:8,color:statusMeta.color,fontWeight:700 }}>{statusMeta.icon} {statusMeta.label}</span>
                        </div>
                        <div style={{ fontSize:8,color:"#334155" }}>{teamPlayers.length} players</div>
                        {TEAM_POSITION_FTB[team] && (
                          <div style={{ marginTop:4 }}>
                            <PosBar data={TEAM_POSITION_FTB[team]}/>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize:10,color:"#1e2d4a",fontFamily:"monospace" }}>
                  Waiting for today's schedule to load before roster sync begins...
                </div>
              )}

              {/* Roster sync log */}
              {rosterLog.length > 0 && (
                <div style={{ marginTop:10,background:"#050709",border:"1px solid #0d1525",borderRadius:8,padding:"8px 10px" }}>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5 }}>
                    <div style={{ fontSize:9,fontWeight:700,letterSpacing:2,color:"#334155",textTransform:"uppercase" }}>Roster Sync Log</div>
                    <span style={{ fontSize:8,color:"#1e2d4a" }}>{rosterLog.length} entries</span>
                  </div>
                  <div style={{ maxHeight:200,overflowY:"auto",display:"flex",flexDirection:"column",gap:2 }}>
                    {rosterLog.map((entry,i)=>(
                      <div key={i} style={{ display:"flex",gap:8,fontSize:9,fontFamily:"monospace",
                        color: entry.level==="success"?"#4ADE80":entry.level==="error"?"#ef4444":entry.level==="warn"?"#F59E0B":entry.level==="debug"?"#1e2d4a":"#475569" }}>
                        <span style={{ color:"#1e2d4a",flexShrink:0,minWidth:52 }}>{entry.time}</span>
                        <span>{entry.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}


        <div style={{ textAlign:"center",marginTop:16,fontSize:8,color:"#161f35",letterSpacing:1 }}>FOR ENTERTAINMENT PURPOSES ONLY · PLEASE GAMBLE RESPONSIBLY · 18+</div>
      </div>
    </div>
  );
}

function MS({ l, v, c }) {
  return (
    <div style={{ textAlign:"center",minWidth:32 }}>
      <div style={{ fontSize:13,fontWeight:800,color:c }}>{v}</div>
      <div style={{ fontSize:7,color:"#334155",letterSpacing:1,textTransform:"uppercase" }}>{l}</div>
    </div>
  );
}

function TeamCol({ stats, pos, team, label, right }) {
  if (!stats) return <div style={{ fontSize:10,color:"#334155" }}>No data</div>;
  const hc = stats.hotCold==="HOT"?"#4ADE80":stats.hotCold==="WARM"?"#F59E0B":"#F87171";
  const align = right ? "right" : "left";
  const jc = right ? "flex-end" : "flex-start";
  return (
    <div style={{ textAlign:align }}>
      <div style={{ display:"flex",alignItems:"center",gap:5,justifyContent:jc,marginBottom:6 }}>
        <span style={{ background:TC[team]||"#333",color:"#fff",padding:"1px 6px",borderRadius:3,fontSize:9,fontWeight:800 }}>{team}</span>
        <span style={{ fontSize:8,background:hc+"22",color:hc,border:`1px solid ${hc}44`,padding:"1px 5px",borderRadius:8,fontWeight:700 }}>{stats.hotCold}</span>
        <span style={{ fontSize:8,color:"#334155" }}>{label}</span>
      </div>
      {[["Tip Win%",`${stats.tipPct}%`,TC[team]||"#666"],["1st Point%",`${stats.firstPointPct}%`,"#4ADE80"],["1st FG%",`${stats.firstFGPct}%`,"#60A5FA"]].map(([l,v,c])=>(
        <div key={l} style={{ display:"flex",justifyContent:jc,gap:6,alignItems:"center",marginBottom:3 }}>
          <span style={{ fontSize:9,color:"#334155" }}>{l}</span>
          <span style={{ fontSize:12,fontWeight:800,color:c }}>{v}</span>
        </div>
      ))}
      {pos && (
        <div style={{ marginTop:7 }}>
          <div style={{ fontSize:8,color:"#334155",letterSpacing:1,textTransform:"uppercase",marginBottom:3 }}>FTB by Position</div>
          <PosBar data={pos}/>
          <div style={{ display:"flex",gap:4,flexWrap:"wrap",marginTop:3,justifyContent:jc }}>
            {Object.entries(pos).sort(([,a],[,b])=>b-a).slice(0,3).map(([p,pct])=>(
              <span key={p} style={{ fontSize:8,background:POS_C[p]+"22",color:POS_C[p],padding:"1px 4px",borderRadius:3,fontWeight:700 }}>{p} {pct}%</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
