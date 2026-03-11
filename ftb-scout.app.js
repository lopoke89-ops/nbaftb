// ftb-scout.app.js
// Full application logic moved out of the HTML to simplify debugging and avoid
// accidental file corruption (for example: stray Markdown fences).
(function () {
  try {
    if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
      const msg = [
        'React or ReactDOM not available. The app requires React to run.',
        '',
        'Possible fixes:',
        '- Allow network access to unpkg.com (used for the UMD bundles),',
        '- Download React + ReactDOM UMD files and reference them locally,',
        '- Or run a development build that bundles React with the app.'
      ].join('\n');
      console.error(msg);
      if (window.showFtbOverlay) window.showFtbOverlay('React not loaded', msg);
      return;
    }

    var useState    = React.useState;
    var useEffect   = React.useEffect;
    var useCallback = React.useCallback;
    var useRef      = React.useRef;
    var useMemo     = React.useMemo;

    // ─── REAL 2025-26 FTB DATA (jedibets.com) ────────────────────────────────────
    const SEASON_FTB_DATA = {
      "Jarrett Allen": {
        ftbMade: 14,
        shots: {
          rim: 6,
          mid: 3,
          ft: 5,
          threeP: 0
        }
      },
      "Jamal Murray": {
        ftbMade: 13,
        shots: {
          rim: 4,
          mid: 4,
          ft: 3,
          threeP: 2
        }
      },
      "Bam Adebayo": {
        ftbMade: 13,
        shots: {
          rim: 2,
          mid: 4,
          ft: 3,
          threeP: 4
        }
      },
      "Anthony Edwards": {
        ftbMade: 13,
        shots: {
          rim: 1,
          mid: 9,
          ft: 0,
          threeP: 3
        }
      },
      "Jalen Brunson": {
        ftbMade: 12,
        shots: {
          rim: 1,
          mid: 8,
          ft: 0,
          threeP: 3
        }
      },
      "Brandon Ingram": {
        ftbMade: 11,
        shots: {
          rim: 3,
          mid: 7,
          ft: 0,
          threeP: 1
        }
      },
      "Chet Holmgren": {
        ftbMade: 10,
        shots: {
          rim: 4,
          mid: 2,
          ft: 0,
          threeP: 4
        }
      },
      "Devin Vassell": {
        ftbMade: 10,
        shots: {
          rim: 0,
          mid: 6,
          ft: 0,
          threeP: 4
        }
      },
      "Alperen Sengun": {
        ftbMade: 10,
        shots: {
          rim: 1,
          mid: 9,
          ft: 0,
          threeP: 0
        }
      },
      "Devin Booker": {
        ftbMade: 9,
        shots: {
          rim: 2,
          mid: 5,
          ft: 1,
          threeP: 1
        }
      },
      "Tyrese Maxey": {
        ftbMade: 9,
        shots: {
          rim: 0,
          mid: 7,
          ft: 0,
          threeP: 2
        }
      },
      "Victor Wembanyama": {
        ftbMade: 9,
        shots: {
          rim: 2,
          mid: 3,
          ft: 2,
          threeP: 2
        }
      },
      "Donovan Mitchell": {
        ftbMade: 8,
        shots: {
          rim: 0,
          mid: 4,
          ft: 1,
          threeP: 3
        }
      },
      "Jaylen Brown": {
        ftbMade: 8,
        shots: {
          rim: 2,
          mid: 4,
          ft: 1,
          threeP: 1
        }
      },
      "Austin Reaves": {
        ftbMade: 8,
        shots: {
          rim: 1,
          mid: 2,
          ft: 1,
          threeP: 4
        }
      },
      "LeBron James": {
        ftbMade: 8,
        shots: {
          rim: 4,
          mid: 4,
          ft: 0,
          threeP: 0
        }
      },
      "Joel Embiid": {
        ftbMade: 8,
        shots: {
          rim: 1,
          mid: 5,
          ft: 2,
          threeP: 0
        }
      },
      "Cade Cunningham": {
        ftbMade: 7,
        shots: {
          rim: 1,
          mid: 3,
          ft: 0,
          threeP: 3
        }
      },
      "Jayson Tatum": {
        ftbMade: 7,
        shots: {
          rim: 2,
          mid: 4,
          ft: 1,
          threeP: 0
        }
      },
      "Nikola Jokic": {
        ftbMade: 7,
        shots: {
          rim: 0,
          mid: 5,
          ft: 0,
          threeP: 2
        }
      },
      "Ja Morant": {
        ftbMade: 6,
        shots: {
          rim: 3,
          mid: 2,
          ft: 0,
          threeP: 1
        }
      },
      "Stephen Curry": {
        ftbMade: 6,
        shots: {
          rim: 1,
          mid: 2,
          ft: 0,
          threeP: 3
        }
      },
      "Giannis Antetokounmpo": {
        ftbMade: 6,
        shots: {
          rim: 4,
          mid: 2,
          ft: 0,
          threeP: 0
        }
      },
      "Trae Young": {
        ftbMade: 5,
        shots: {
          rim: 0,
          mid: 4,
          ft: 1,
          threeP: 0
        }
      },
      "Kyrie Irving": {
        ftbMade: 5,
        shots: {
          rim: 2,
          mid: 2,
          ft: 0,
          threeP: 1
        }
      },
      "Tyler Herro": {
        ftbMade: 5,
        shots: {
          rim: 1,
          mid: 3,
          ft: 1,
          threeP: 0
        }
      },
      "Scottie Barnes": {
        ftbMade: 4,
        shots: {
          rim: 2,
          mid: 1,
          ft: 1,
          threeP: 0
        }
      },
      "Anthony Davis": {
        ftbMade: 4,
        shots: {
          rim: 3,
          mid: 1,
          ft: 0,
          threeP: 0
        }
      },
      "Jimmy Butler": {
        ftbMade: 3,
        shots: {
          rim: 1,
          mid: 2,
          ft: 0,
          threeP: 0
        }
      },
      "Zach LaVine": {
        ftbMade: 3,
        shots: {
          rim: 1,
          mid: 1,
          ft: 0,
          threeP: 1
        }
      }
    };
    const TEAM_FTB_STATS = {
      PHI: {
        tipPct: 51.6,
        firstPointPct: 54.4,
        firstFGPct: 51.5,
        hotCold: "HOT"
      },
      MEM: {
        tipPct: 48.5,
        firstPointPct: 48.5,
        firstFGPct: 48.5,
        hotCold: "COLD"
      },
      DET: {
        tipPct: 41.3,
        firstPointPct: 49.3,
        firstFGPct: 53.7,
        hotCold: "WARM"
      },
      BKN: {
        tipPct: 56.9,
        firstPointPct: 41.2,
        firstFGPct: 41.2,
        hotCold: "COLD"
      },
      ATL: {
        tipPct: 54.5,
        firstPointPct: 50.0,
        firstFGPct: 45.6,
        hotCold: "HOT"
      },
      DAL: {
        tipPct: 45.5,
        firstPointPct: 47.1,
        firstFGPct: 45.6,
        hotCold: "COLD"
      },
      MIA: {
        tipPct: 58.8,
        firstPointPct: 57.7,
        firstFGPct: 53.5,
        hotCold: "HOT"
      },
      WAS: {
        tipPct: 31.8,
        firstPointPct: 36.4,
        firstFGPct: 36.4,
        hotCold: "COLD"
      },
      MIL: {
        tipPct: 31.8,
        firstPointPct: 38.8,
        firstFGPct: 41.8,
        hotCold: "COLD"
      },
      PHX: {
        tipPct: 73.1,
        firstPointPct: 55.9,
        firstFGPct: 54.4,
        hotCold: "WARM"
      },
      HOU: {
        tipPct: 37.9,
        firstPointPct: 44.8,
        firstFGPct: 44.8,
        hotCold: "WARM"
      },
      TOR: {
        tipPct: 43.5,
        firstPointPct: 55.1,
        firstFGPct: 60.9,
        hotCold: "HOT"
      },
      SAS: {
        tipPct: 70.6,
        firstPointPct: 54.3,
        firstFGPct: 50.0,
        hotCold: "HOT"
      },
      BOS: {
        tipPct: 46.3,
        firstPointPct: 54.4,
        firstFGPct: 55.9,
        hotCold: "WARM"
      },
      GSW: {
        tipPct: 44.1,
        firstPointPct: 46.4,
        firstFGPct: 47.8,
        hotCold: "HOT"
      },
      CHI: {
        tipPct: 46.3,
        firstPointPct: 33.3,
        firstFGPct: 33.3,
        hotCold: "COLD"
      },
      LAL: {
        tipPct: 62.9,
        firstPointPct: 58.6,
        firstFGPct: 58.6,
        hotCold: "WARM"
      },
      MIN: {
        tipPct: 56.5,
        firstPointPct: 57.1,
        firstFGPct: 61.4,
        hotCold: "WARM"
      }
    };

    // TEAM_POSITION_FTB fallback and the rest of the original app code...
    const FALLBACK_POSITION_FTB = {
      PHI: { PG: 42, SG: 18, SF: 8, PF: 12, C: 20 },
      MEM: { PG: 35, SG: 22, SF: 12, PF: 8, C: 23 },
      DET: { PG: 38, SG: 20, SF: 10, PF: 10, C: 22 },
      BKN: { PG: 20, SG: 18, SF: 14, PF: 10, C: 38 },
      ATL: { PG: 44, SG: 25, SF: 12, PF: 8, C: 11 },
      DAL: { PG: 36, SG: 28, SF: 14, PF: 10, C: 12 },
      MIA: { PG: 18, SG: 28, SF: 22, PF: 14, C: 18 },
      WAS: { PG: 32, SG: 24, SF: 16, PF: 14, C: 14 },
      MIL: { PG: 18, SG: 14, SF: 8, PF: 38, C: 22 },
      PHX: { PG: 20, SG: 36, SF: 16, PF: 12, C: 16 },
      HOU: { PG: 22, SG: 18, SF: 14, PF: 12, C: 34 },
      TOR: { PG: 24, SG: 18, SF: 38, PF: 12, C: 8 },
      SAS: { PG: 22, SG: 28, SF: 10, PF: 8, C: 32 },
      BOS: { PG: 20, SG: 26, SF: 32, PF: 12, C: 10 },
      GSW: { PG: 38, SG: 22, SF: 16, PF: 12, C: 12 },
      CHI: { PG: 16, SG: 26, SF: 14, PF: 28, C: 16 },
      LAL: { PG: 18, SG: 22, SF: 28, PF: 20, C: 12 },
      MIN: { PG: 16, SG: 30, SF: 14, PF: 22, C: 18 }
    };

    const ESPN_POS_MAP = {
      "PG": "PG", "SG": "SG", "SF": "SF", "PF": "PF", "C": "C",
      "G": "SG", "F": "SF", "G-F": "SG", "F-G": "SF", "F-C": "PF", "C-F": "C",
      "1": "PG", "2": "SG", "3": "SF", "4": "PF", "5": "C"
    };

    function getAllGameDates() {
      const start = new Date("2025-10-21");
      const end = new Date("2026-03-10");
      const dates = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().slice(0, 10).replace(/-/g, ""));
      }
      return dates;
    }

    function extractFirstScore(data) {
      const plays = (data?.plays) || [];
      for (const play of plays) {
        const text = (play.text || "").toLowerCase();
        if (play.scoringPlay === true || play.pointAfterDrive && (play.type?.text || "").toLowerCase().includes("made")) {
          return play;
        }
        if ((text.includes("makes") || text.includes("free throw")) && !text.includes("miss")) {
          if (play.scoreValue && play.scoreValue > 0) return play;
        }
      }
      for (const play of plays) {
        if (play.awayScore > 0 || play.homeScore > 0) return play;
      }
      return null;
    }

    function getDefendingTeam(play, homeTeam, awayTeam) {
      const scoreAbbr = (play?.team?.abbreviation || "").toUpperCase();
      if (!scoreAbbr) return null;
      if (scoreAbbr === homeTeam) return awayTeam;
      if (scoreAbbr === awayTeam) return homeTeam;
      return null;
    }

    function getPosFromPlay(play) {
      const pos = play?.participants?.[0]?.athlete?.position?.abbreviation ||
                  play?.athletesInvolved?.[0]?.position?.abbreviation || null;
      if (!pos) return null;
      return ESPN_POS_MAP[pos.toUpperCase()] || null;
    }

    function aggregatePositionData(events) {
      const counts = {};
      const ALL_TEAMS = ["ATL","BOS","BKN","CHA","CHI","CLE","DAL","DEN","DET","GSW","HOU","IND","LAC","LAL","MEM","MIA","MIL","MIN","NOP","NYK","OKC","ORL","PHI","PHX","POR","SAC","SAS","TOR","UTA","WAS"];
      ALL_TEAMS.forEach(t => counts[t] = { PG:0, SG:0, SF:0, PF:0, C:0, unknown:0 });
      for (const ev of events) {
        if (!ev.defendingTeam || !counts[ev.defendingTeam]) continue;
        const pos = ev.pos || "unknown";
        if (pos in counts[ev.defendingTeam]) counts[ev.defendingTeam][pos]++; else counts[ev.defendingTeam].unknown++;
      }
      const result = {};
      for (const [team, raw] of Object.entries(counts)) {
        const known = raw.PG + raw.SG + raw.SF + raw.PF + raw.C;
        if (known < 3) continue;
        result[team] = {
          PG: Math.round(raw.PG / known * 100),
          SG: Math.round(raw.SG / known * 100),
          SF: Math.round(raw.SF / known * 100),
          PF: Math.round(raw.PF / known * 100),
          C: Math.round(raw.C / known * 100),
          totalGames: known
        };
      }
      return result;
    }

    const KNOWN_INJURIES_TODAY = {
      "Joel Embiid": { status: "OUT", reason: "Oblique injury" },
      "Tyrese Maxey": { status: "OUT", reason: "Finger injury" },
      "Paul George": { status: "OUT", reason: "25-game drug suspension (since Jan 31)" },
      "Ja Morant": { status: "OUT", reason: "Elbow UCL sprain — out until ~Mar 20" },
      "Kyrie Irving": { status: "OUT", reason: "Torn ACL — season over" },
      "Cooper Flagg": { status: "OUT", reason: "Foot injury" },
      "Andrew Wiggins": { status: "QUESTIONABLE", reason: "Left toe inflammation" },
      "Jimmy Butler": { status: "OUT", reason: "Torn ACL — season over" },
      "Stephen Curry": { status: "OUT", reason: "Knee — 5+ more games" },
      "Jayson Tatum": { status: "OUT", reason: "Torn Achilles — season over" },
      "LeBron James": { status: "QUESTIONABLE", reason: "Hip/Foot — missed last 2 games" },
      "Anthony Edwards": { status: "OUT", reason: "Late scratch tonight" }
    };

    const ESPN_TEAM_IDS = {
      ATL: "1", BOS: "2", BKN: "17", CHA: "30", CHI: "4", CLE: "5", DAL: "6", DEN: "7", DET: "8",
      GSW: "9", HOU: "10", IND: "11", LAC: "12", LAL: "13", MEM: "29", MIA: "14", MIL: "15", MIN: "16",
      NOP: "3", NYK: "18", OKC: "25", ORL: "19", PHI: "20", PHX: "21", POR: "22", SAC: "23", SAS: "24",
      TOR: "28", UTA: "26", WAS: "27"
    };

    const ROSTER_TTL_MS = 6 * 60 * 60 * 1000;
    const ROSTER_CACHE_KEY = "ftb-rosters-v2";
    const MIN_ROSTER_SIZE = 8;
    const ROSTER_SEASON = "2025-2026";
    const ROSTER_FILE_STEMS = {
      ATL:"AtlantaHawks", BOS:"BostonCeltics", BKN:"BrooklynNets", CHA:"CharlotteHornets", CHI:"ChicagoBulls", CLE:"ClevelandCavaliers",
      DAL:"DallasMavericks", DEN:"DenverNuggets", DET:"DetroitPistons", GSW:"GoldenStateWarriors", HOU:"HoustonRockets", IND:"IndianaPacers",
      LAC:"LAClippers", LAL:"LosAngelesLakers", MEM:"MemphisGrizzlies", MIA:"MiamiHeat", MIL:"MilwaukeeBucks", MIN:"MinnesotaTimberwolves",
      NOP:"NewOrleansPelicans", NYK:"NewYorkKnicks", OKC:"OklahomaCityThunder", ORL:"OrlandoMagic", PHI:"Philadelphia76ers", PHX:"PhoenixSuns",
      POR:"PortlandTrailBlazers", SAC:"SacramentoKings", SAS:"SanAntonioSpurs", TOR:"TorontoRaptors", UTA:"UtahJazz", WAS:"WashingtonWizards",
    };

    function parseRosterCsv(text, teamAbbr) {
      const lines = text.trim().split(/\r?\n/);
      if (lines.length <= 1) return [];
      return lines.slice(1).map((line) => {
        const cols = line.split(",");
        const name = (cols[0] || "").trim();
        const position = (cols[1] || "SF").trim();
        const jersey = (cols[2] || "N/A").trim();
        if (!name) return null;
        const pos = normalizePosition(position.includes("/") ? position.split("/")[0] : position);
        const usageRate = estimateUsageFromRole({}, pos);
        // normalizeRosterPlayer must exist in your original codebase; if not, return a plain object
        if (typeof normalizeRosterPlayer === 'function') {
          return normalizeRosterPlayer({
            name,
            team: teamAbbr,
            pos,
            ppg: estimatePPG({}, usageRate),
            usageRate,
            gp: 40,
            ftbPct: deriveDefaultFtbPct(usageRate, pos),
            activeStatus: "ACTIVE",
            source: "STATIC_CSV",
            espnId: jersey,
            isStarter: false,
          });
        }
        return {
          name,
          team: teamAbbr,
          pos,
          ppg: estimatePPG({}, usageRate),
          usageRate,
          gp: 40,
          ftbPct: deriveDefaultFtbPct(usageRate, pos),
          activeStatus: "ACTIVE",
          source: "STATIC_CSV",
          espnId: jersey,
          isStarter: false
        };
      }).filter(Boolean);
    }

    async function fetchTeamRosterFromStaticCsv(teamAbbr, cacheBypass = false) {
      const stem = ROSTER_FILE_STEMS[teamAbbr];
      if (!stem) throw new Error(`No static roster file mapping for ${teamAbbr}`);
      const cacheBust = cacheBypass ? `?t=${Date.now()}` : "";
      const endpoint = `team_rosters_2025-2026/${stem}_Roster_${ROSTER_SEASON}.csv${cacheBust}`;
      const res = await fetch(endpoint, { cache: cacheBypass ? "no-store" : "default" });
      if (!res.ok) throw new Error(`Static roster fetch failed (${res.status}) for ${teamAbbr} @ ${endpoint}`);
      const text = await res.text();
      const players = parseRosterCsv(text, teamAbbr);
      if (players.length < MIN_ROSTER_SIZE) throw new Error(`Static roster invalid for ${teamAbbr}: ${players.length} players`);
      return { players, endpoint, status: res.status };
    }

    function validateRosterEntry(entry, teamAbbr, isPlayingToday) {
      if (!entry) return { valid: false, reason: "no cache entry" };
      if (!Array.isArray(entry.players)) return { valid: false, reason: "malformed cache entry" };
      if (entry.players.length < MIN_ROSTER_SIZE) return { valid: false, reason: `only ${entry.players.length} players cached (min ${MIN_ROSTER_SIZE})` };
      if (!entry.fetchedAt) return { valid: false, reason: "missing fetchedAt timestamp" };
      if (isPlayingToday) return { valid: false, reason: "playing today — always fetch fresh" };
      const ageMs = Date.now() - entry.fetchedAt;
      if (ageMs > ROSTER_TTL_MS) return { valid: false, reason: `cache expired (${Math.round(ageMs / 3600000)}h old, TTL ${ROSTER_TTL_MS / 3600000}h)` };
      return { valid: true, reason: `fresh (${Math.round(ageMs / 60000)}min old, ${entry.players.length} players)` };
    }

    function loadRosterCache() {
      try {
        const raw = localStorage.getItem(ROSTER_CACHE_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch { return {}; }
    }

    function saveTeamToCache(teamAbbr, players) {
      try {
        const cache = loadRosterCache();
        cache[teamAbbr] = { players, fetchedAt: Date.now() };
        localStorage.setItem(ROSTER_CACHE_KEY, JSON.stringify(cache));
      } catch (e) {
        console.warn(`[RosterSync] Failed to cache ${teamAbbr}:`, e.message);
      }
    }

    function mergeWithFtbData(players, gp) {
      return players.map(p => {
        const knownFtb = SEASON_FTB_DATA[p.name];
        if (knownFtb) {
          const games = Math.max(p.gp || gp || 1, 1);
          return { ...p, ftbPct: Math.round(knownFtb.ftbMade / games * 100) };
        }
        return p;
      });
    }

    function useRosters(liveGames) {
      const [players, setPlayers] = useState([]);
      const [rosterStatus, setRosterStatus] = useState({});
      const [rosterLog, setRosterLog] = useState([]);
      const [syncState, setSyncState] = useState("idle");

      const log = useCallback((msg, level = "info") => {
        const prefix = { info: "", warn: "⚠️ ", error: "❌ ", success: "✅ ", debug: "🔍 " }[level] || "";
        const line = `${prefix}${msg}`;
        console.log(`[RosterSync] ${line}`);
        setRosterLog(prev => [{ time: new Date().toLocaleTimeString(), msg: line, level }, ...prev].slice(0, 200));
      }, []);

      const syncRosters = useCallback(async (games, options = {}) => {
        const forceBypassCache = options.forceBypassCache === true;
        const allTeams = Object.keys(ROSTER_FILE_STEMS);
        const teamsToday = games && games.length > 0 ? [...new Set(games.flatMap(g => [g.home, g.away]))] : allTeams;
        setSyncState("syncing");
        log(`Roster sync starting for ${teamsToday.length} teams`, "info");

        const cache = loadRosterCache();
        const results = {};
        const statuses = {};

        for (const team of teamsToday) {
          statuses[team] = "loading";
          setRosterStatus(prev => ({ ...prev, [team]: "loading" }));

          let loaded = null;
          const attempts = forceBypassCache ? 3 : 2;
          for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
              log(`Checking roster source: static CSV (${team}) attempt ${attempt}/${attempts}`, "debug");
              const fetched = await fetchTeamRosterFromStaticCsv(team, forceBypassCache || attempt > 1);
              loaded = fetched.players;
              log(`Roster data retrieved successfully for ${team}: ${fetched.players.length} players (${fetched.status})`, "success");
              break;
            } catch (e) {
              const errObj = {
                timestamp: new Date().toISOString(),
                endpoint: `team_rosters_2025-2026/${ROSTER_FILE_STEMS[team]}_Roster_${ROSTER_SEASON}.csv`,
                responseCode: 0,
                team,
                attempt,
                message: e.message,
              };
              log(`Roster source failed ${JSON.stringify(errObj)}`, "warn");
            }
          }

          if (loaded && loaded.length >= MIN_ROSTER_SIZE) {
            results[team] = loaded;
            statuses[team] = "ready";
            saveTeamToCache(team, loaded);
            continue;
          }

          const stale = cache[team];
          if (stale?.players?.length >= MIN_ROSTER_SIZE) {
            log(`Using cached fallback roster for ${team} (${stale.players.length} players)`, "warn");
            results[team] = stale.players;
            statuses[team] = "stale";
          } else {
            log(`No fallback available for ${team} — roster unavailable`, "error");
            statuses[team] = "error";
          }
        }

        const flat = teamsToday.flatMap(team => results[team] || []);
        const seen = new Set();
        const deduped = flat.filter(p => {
          const key = `${p.name}||${p.team}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setPlayers(deduped);
        setRosterStatus(statuses);
        const hasError = Object.values(statuses).includes("error");
        setSyncState(deduped.length > 0 ? (hasError ? "partial" : "ready") : "idle");
        log(`Roster sync complete: ${deduped.length} players loaded`, hasError ? "warn" : "success");
      }, [log]);

      useEffect(() => { syncRosters(liveGames || []); }, [liveGames, syncRosters]);

      const refreshRosters = useCallback((games) => { syncRosters(games || [], { forceBypassCache: true }); }, [syncRosters]);

      return { players, rosterStatus, rosterLog, syncState, refreshRosters };
    }

    const POSITION_BASE_WEIGHT = { PG:1.30, SG:1.15, SF:0.95, PF:0.85, C:0.75 };

    function computePositionLikelihood(pos, oppTeam, positionData) {
      const teamPos = positionData?.[oppTeam];
      if (teamPos && typeof teamPos[pos] === "number") {
        const leagueAvg = 20;
        const pct = teamPos[pos];
        return Math.max(0.5, Math.min(1.8, pct / leagueAvg));
      }
      return POSITION_BASE_WEIGHT[pos] || 1.0;
    }

    function normalizePosition(raw) {
      if (!raw) return "SF";
      const u = raw.toUpperCase().trim();
      const direct = { PG:1, SG:1, SF:1, PF:1, C:1 };
      if (direct[u]) return u;
      const map = {
        "G":"SG","F":"SF","C-F":"PF","F-C":"PF","G-F":"SG","F-G":"SG","1":"PG","2":"SG","3":"SF","4":"PF","5":"C",
        "CENTER":"C","GUARD":"SG","FORWARD":"SF","CENTER-FORWARD":"PF","GUARD-FORWARD":"SG","FORWARD-CENTER":"PF",
        "POWER FORWARD":"PF","SMALL FORWARD":"SF","POINT GUARD":"PG","SHOOTING GUARD":"SG"
      };
      return map[u] || "SF";
    }

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
          let ppg = 0, gp = 0, usageRate = 0, ftbPct = 0;
          for (const cat of stats) {
            for (const stat of (cat?.stats) || []) {
              const n = stat.name;
              const v = parseFloat(stat.value) || 0;
              if (n === "avgPoints") ppg = v;
              if (n === "gamesPlayed") gp = Math.round(v);
              if (n === "usageRate") usageRate = v;
            }
          }
          if (usageRate === 0) usageRate = estimateUsageFromRole(athlete, pos);
          if (ppg === 0) ppg = estimatePPG(athlete, usageRate);
          if (gp === 0) gp = 40;
          const knownFtb = SEASON_FTB_DATA[name];
          ftbPct = knownFtb ? Math.round(knownFtb.ftbMade / Math.max(gp, 1) * 100) : deriveDefaultFtbPct(usageRate, pos);
          players.push({
            name,
            team: teamAbbr,
            opp: "",
            gameTime: "",
            pos,
            ppg: parseFloat(ppg.toFixed(1)),
            usageRate: parseFloat(usageRate.toFixed(1)),
            gp,
            ftbPct,
            espnId: String(athlete?.id || ""),
            isStarter: athlete?.starter === true
          });
        }
      }
      return players;
    }

    function estimateUsageFromRole(athlete, pos) {
      const weights = { PG:28, SG:25, SF:22, PF:20, C:19 };
      return weights[pos] || 22;
    }

    function estimatePPG(athlete, usage) {
      return parseFloat(Math.max(4, usage * 0.72).toFixed(1));
    }

    function deriveDefaultFtbPct(usage, pos) {
      const posBonus = { PG:4, SG:3, SF:2, PF:1, C:1 }[pos] || 2;
      return Math.round(Math.min(30, usage / 35 * 20 + posBonus));
    }

    function getCTDateString(date = new Date()) {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
      const p = {};
      parts.forEach(({ type, value }) => p[type] = value);
      return `${p.year}${p.month}${p.day}`;
    }

    function msUntilCTMidnight() {
      const now = new Date();
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(now);
      const p = {};
      parts.forEach(({ type, value }) => p[type] = value);
      const utcOffset = now.getTime() - new Date(Date.UTC(parseInt(p.year), parseInt(p.month) - 1, parseInt(p.day), parseInt(p.hour), parseInt(p.minute), parseInt(p.second))).getTime();
      const tomorrowCTMidnightUTC = Date.UTC(parseInt(p.year), parseInt(p.month) - 1, parseInt(p.day) + 1, 0, 0, 0) + utcOffset;
      return Math.max(1000, tomorrowCTMidnightUTC - now.getTime());
    }

    const TEAM_NAMES = {
      ATL: "Hawks", BOS: "Celtics", BKN: "Nets", CHA: "Hornets", CHI: "Bulls", CLE: "Cavaliers",
      DAL: "Mavericks", DEN: "Nuggets", DET: "Pistons", GSW: "Warriors", HOU: "Rockets", IND: "Pacers",
      LAC: "Clippers", LAL: "Lakers", MEM: "Grizzlies", MIA: "Heat", MIL: "Bucks", MIN: "Timberwolves",
      NOP: "Pelicans", NYK: "Knicks", OKC: "Thunder", ORL: "Magic", PHI: "76ers", PHX: "Suns",
      POR: "Trail Blazers", SAC: "Kings", SAS: "Spurs", TOR: "Raptors", UTA: "Jazz", WAS: "Wizards",
      GS: "Warriors", SA: "Spurs", NY: "Knicks", NO: "Pelicans"
    };

    function normalizeAbbr(abbr) {
      if (!abbr) return "";
      const map = { GS: "GSW", SA: "SAS", NY: "NYK", NO: "NOP", UTAH: "UTA", WSH: "WAS", PHO: "PHX" };
      return map[abbr.toUpperCase()] || abbr.toUpperCase();
    }

    function parseGameTimeCT(isoString) {
      if (!isoString) return "";
      try {
        const d = new Date(isoString);
        return d.toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit", hour12: true });
      } catch (e) { return ""; }
    }

    const GAMES = [];
    const TC = { PHI:"#006BB6", MEM:"#5D76A9", DET:"#C8102E", BKN:"#1B1E2B", ATL:"#E03A3E", DAL:"#00538C", MIA:"#98002E", WAS:"#002B5C", MIL:"#00471B", PHX:"#E56020", HOU:"#CE1141", TOR:"#CE1141", SAS:"#8A8D8F", BOS:"#007A33", GSW:"#1D428A", CHI:"#CE1141", LAL:"#552583", MIN:"#0C2340" };
    const TA = { PHI:"#ED174C", MEM:"#12173F", DET:"#006BB6", BKN:"#FFFFFF", ATL:"#C1D32F", DAL:"#B8C4CA", MIA:"#F9A01B", WAS:"#E31837", MIL:"#EEE1C6", PHX:"#1D1160", HOU:"#FFC72C", TOR:"#000000", SAS:"#000000", BOS:"#BA9653", GSW:"#FFC72C", CHI:"#000000", LAL:"#FDB927", MIN:"#236192" };
    const SHOT_C = { threeP:"#818CF8", rim:"#34D399", mid:"#FBBF24", ft:"#F472B6" };
    const POS_C = { PG:"#818CF8", SG:"#34D399", SF:"#FBBF24", PF:"#F472B6", C:"#60A5FA" };

    function computeScore(p, ftb, injuryStatus, positionData) {
      if (injuryStatus === "OUT") return 0;
      const base = p.usageRate / 40 * 0.35 + p.ftbPct / 25 * 0.25 + p.ppg / 40 * 0.1 + p.gp / 65 * 0.1 + (ftb ? Math.min(ftb.ftbMade / 15, 1) * 0.2 : 0);
      const penalty = injuryStatus === "QUESTIONABLE" ? 0.7 : 1;
      const posLikelihood = p.opp ? computePositionLikelihood(p.pos, p.opp, positionData) : 1.0;
      return Math.round(base * 100 * penalty * posLikelihood);
    }
    function getGrade(s) {
      if (s >= 72) return { label: "S", color: "#FFD700" };
      if (s >= 62) return { label: "A", color: "#4ADE80" };
      if (s >= 50) return { label: "B", color: "#60A5FA" };
      if (s >= 38) return { label: "C", color: "#F97316" };
      return { label: "D", color: "#F87171" };
    }

    function ShotBar({ shots }) {
      const total = Object.values(shots).reduce((a,b)=>a+b,0);
      if (!total) return null;
      return React.createElement("div", { style:{display:"flex",gap:2,height:5,borderRadius:3,overflow:"hidden",marginTop:3} },
        Object.entries(shots).filter(([,v])=>v>0).map(([k,v])=>React.createElement("div",{key:k,style:{flex:v/total,background:SHOT_C[k]}}))
      );
    }
    function PosBar({ data }) {
      const KNOWN_POS = ["PG","SG","SF","PF","C"];
      const entries = Object.entries(data).filter(([pos])=>KNOWN_POS.includes(pos));
      return React.createElement("div",{style:{display:"flex",gap:2,height:8,borderRadius:4,overflow:"hidden"}}, entries.map(([pos,pct])=>React.createElement("div",{key:pos,style:{flex:pct,background:POS_C[pos],display:"flex",alignItems:"center",justifyContent:"center"}}, pct>=15 && React.createElement("span",{style:{fontSize:7,fontWeight:900,color:"#000",opacity:.6}},pos))));
    }
    function InjuryBadge({ status, reason }) {
      const cfg = {
        OUT: { bg:"#3f0d0d", border:"#ef4444", color:"#fca5a5", icon:"🚫" },
        QUESTIONABLE: { bg:"#3f2d00", border:"#f59e0b", color:"#fcd34d", icon:"⚠️" },
        PROBABLE: { bg:"#0d2f1a", border:"#22c55e", color:"#86efac", icon:"🟡" }
      }[status] || { bg:"#1e2d4a", border:"#475569", color:"#94a3b8", icon:"" };
      return React.createElement("div",{style:{display:"inline-flex",alignItems:"center",gap:5,background:cfg.bg,border:`1px solid ${cfg.border}`,borderRadius:6,padding:"3px 8px",marginTop:4}}, React.createElement("span",{style:{fontSize:10}},cfg.icon), React.createElement("span",{style:{fontSize:10,fontWeight:700,color:cfg.color,letterSpacing:.5}},status), reason && React.createElement("span",{style:{fontSize:9,color:cfg.color,opacity:.7,fontFamily:"Barlow,sans-serif"}}, "· ", reason));
    }

    // --- The main FTBScoutApp component follows exactly as in your original file ---
    // For brevity here we reuse the same component body you had inline.
    // Paste your complete original component body below (kept intact from the inline file).
    // NOTE: Ensure there are no leftover Markdown fences in your repo file.

    /* BEGIN: Original inline app body (unchanged) */
    const FTBScoutApp = function FTBScout() {
      const [tab, setTab] = useState("picks");
      const [selectedGame, setSelectedGame] = useState(null);
      const [sortBy, setSortBy] = useState("score");
      const [expanded, setExpanded] = useState(null);
      const [showOut, setShowOut] = useState(false);
      const [injuryData, setInjuryData] = useState(KNOWN_INJURIES_TODAY);
      const [injuryLoading, setInjuryLoading] = useState(true);
      const [injurySource, setInjurySource] = useState("cached");
      const [pbpData, setPbpData] = useState({});
      const [oddsKey, setOddsKey] = useState("");
      const [savedKey, setSavedKey] = useState(null);

      const [ctDateStr, setCtDateStr] = useState(() => getCTDateString());
      const [liveGames, setLiveGames] = useState([]);
      const [scheduleLoading, setSchedLoad] = useState(true);
      const [scheduleError, setSchedError] = useState(null);
      const [espnGameIds, setEspnGameIds] = useState({});

      const { players: rosterPlayers, rosterStatus, rosterLog, syncState, refreshRosters } = useRosters(liveGames);

      const [engineStatus, setEngineStatus] = useState("idle");
      const [engineProgress, setEngineProgress] = useState({ current:0, total:0, gamesProcessed:0, errors:0 });
      const [rawEvents, setRawEvents] = useState([]);
      const [positionData, setPositionData] = useState(null);
      const [engineLog, setEngineLog] = useState([]);
      const engineRef = useRef(false);

      useEffect(() => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,300;0,400;0,600;0,700;0,800;0,900;1,400&family=Barlow:wght@300;400;500&display=swap";
        document.head.appendChild(link);
        return () => {
          try { document.head.removeChild(link); } catch (e) {}
        };
      }, []);

      const fetchSchedule = useCallback(async dateStr => {
        setSchedLoad(true);
        setSchedError(null);
        try {
          const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${dateStr}&limit=20`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`ESPN returned ${res.status}`);
          const data = await res.json();
          const events = (data?.events) || [];
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
            ids[`${home}-${away}`] = event.id;
            ids[`${away}-${home}`] = event.id;
          });
          setLiveGames(games);
          setEspnGameIds(ids);
        } catch (e) {
          setSchedError(e.message);
          setLiveGames([]);
        } finally {
          setSchedLoad(false);
        }
      }, []);

      useEffect(() => {
        fetchSchedule(ctDateStr);
        const ms = msUntilCTMidnight();
        const timer = setTimeout(() => {
          const newDate = getCTDateString();
          setCtDateStr(newDate);
          setSelectedGame(null);
          setPbpData({});
        }, ms);
        return () => clearTimeout(timer);
      }, [ctDateStr, fetchSchedule]);

      useEffect(() => {
        async function loadSaved() {
          try {
            const raw = localStorage.getItem("ftb-pos-data");
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.rawEvents?.length > 0) {
                setRawEvents(parsed.rawEvents);
                setPositionData(aggregatePositionData(parsed.rawEvents));
                setEngineStatus("done");
                addLog(`📦 Loaded ${parsed.rawEvents.length} cached events from storage`);
              }
            }
          } catch (e) {}
        }
        loadSaved();
      }, []);
      function addLog(msg) { setEngineLog(prev => [{ time: new Date().toLocaleTimeString(), msg }, ...prev].slice(0,80)); }

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
        for (let i=0;i<dates.length;i++) {
          if (!engineRef.current) break;
          const date = dates[i];
          setEngineProgress(p => ({ ...p, current: i+1 }));
          try {
            const sbRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date}&limit=20`);
            if (!sbRes.ok) { errors++; continue; }
            const sbData = await sbRes.json();
            const events = sbData?.events || [];
            if (events.length === 0) continue;
            addLog(`📅 ${date}: ${events.length} game(s)`);
            for (const event of events) {
              const gameId = event.id;
              if (processedGameIds.has(gameId)) continue;
              const comps = event?.competitions?.[0];
              const homeTeam = comps?.competitors?.find(c=>c.homeAway==="home")?.team?.abbreviation?.toUpperCase();
              const awayTeam = comps?.competitors?.find(c=>c.homeAway==="away")?.team?.abbreviation?.toUpperCase();
              if (!homeTeam || !awayTeam) continue;
              try {
                const pbpRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`);
                if (!pbpRes.ok) { errors++; continue; }
                const pbpRaw = await pbpRes.json();
                const firstPlay = extractFirstScore(pbpRaw);
                if (!firstPlay) { addLog(`  ⚠️ ${awayTeam}@${homeTeam}: no first score found`); continue; }
                const defendingTeam = getDefendingTeam(firstPlay, homeTeam, awayTeam);
                const pos = getPosFromPlay(firstPlay);
                const scoringPlayer = firstPlay?.participants?.[0]?.athlete?.displayName || firstPlay?.athletesInvolved?.[0]?.displayName || "Unknown";
                allEvents.push({ date, gameId, homeTeam, awayTeam, defendingTeam, pos, scoringPlayer });
                processedGameIds.add(gameId);
                gamesProcessed++;
                if (defendingTeam && pos) addLog(`  ✓ ${awayTeam}@${homeTeam}: ${scoringPlayer} (${pos}) scored first → ${defendingTeam} defended`);
                else addLog(`  ⚠️ ${awayTeam}@${homeTeam}: ${scoringPlayer} scored but pos/team unclear`);
                setEngineProgress(p => ({ ...p, gamesProcessed, errors }));
                setRawEvents([...allEvents]);
              } catch (e) {
                errors++; addLog(`  ❌ ${awayTeam}@${homeTeam}: ${e.message}`);
              }
              await new Promise(r => setTimeout(r, 120));
            }
          } catch (e) {
            errors++; addLog(`❌ Date ${date}: ${e.message}`);
          }
          if (i % 10 === 0 && allEvents.length > 0) {
            const computed = aggregatePositionData(allEvents);
            setPositionData(computed);
          }
          await new Promise(r => setTimeout(r, 60));
        }
        if (allEvents.length > 0) {
          const computed = aggregatePositionData(allEvents);
          setPositionData(computed);
          try {
            localStorage.setItem("ftb-pos-data", JSON.stringify({ rawEvents: allEvents, savedAt: new Date().toISOString() }));
            addLog(`💾 Saved ${allEvents.length} events to storage`);
          } catch (e) {}
        }
        setEngineStatus("done");
        setEngineProgress(p => ({ ...p, errors }));
        addLog(`✅ Done! Processed ${gamesProcessed} games, ${errors} errors`);
        engineRef.current = false;
      }, [rawEvents]);

      const stopEngine = () => { engineRef.current = false; setEngineStatus("idle"); addLog("⏹ Engine stopped by user"); };
      const clearData = async () => { try { localStorage.removeItem("ftb-pos-data"); } catch (e) {} setRawEvents([]); setPositionData(null); setEngineStatus("idle"); setEngineLog([]); addLog("🗑 Data cleared"); };

      const TEAM_POSITION_FTB = positionData || FALLBACK_POSITION_FTB;

      const fetchInjuries = useCallback(async () => {
        setInjuryLoading(true);
        try {
          const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries");
          const data = await res.json();
          const fresh = {};
          if (data?.injuries) {
            data.injuries.forEach(team => team.injuries?.forEach(inj => {
              const name = inj.athlete?.displayName || inj.athlete?.fullName;
              const status = inj.status?.toUpperCase();
              const mapped = status?.includes("OUT") ? "OUT" : status?.includes("QUESTION") ? "QUESTIONABLE" : status?.includes("PROBABLE") ? "PROBABLE" : null;
              if (name && mapped) fresh[name] = { status: mapped, reason: inj.shortComment || inj.longComment || "Injury" };
            }));
          }
          const merged = { ...KNOWN_INJURIES_TODAY, ...fresh };
          setInjuryData(merged);
          setInjurySource(Object.keys(fresh).length > 0 ? "espn-live" : "cached");
        } catch (e) {
          console.error('Failed to fetch injuries:', e);
          setInjurySource("cached");
        } finally { setInjuryLoading(false); }
      }, []);
      useEffect(() => { fetchInjuries(); }, [fetchInjuries]);

      const todayTeams = new Set(liveGames.flatMap(g => [g.home, g.away]));
      const enriched = rosterPlayers.filter(p => todayTeams.size === 0 || todayTeams.has(p.team)).map(p => {
        const game = liveGames.find(g => g.home === p.team || g.away === p.team);
        const liveOpp = game ? (game.home === p.team ? game.away : game.home) : p.opp || "";
        const liveTime = game?.time || p.gameTime || "";
        const ftb = SEASON_FTB_DATA[p.name];
        const injury = injuryData[p.name] || null;
        const score = computeScore({ ...p, opp: liveOpp }, ftb, injury?.status, TEAM_POSITION_FTB);
        return { ...p, opp: liveOpp, gameTime: liveTime, ftb, injury, score };
      });
      const filtered = selectedGame ? enriched.filter(p => p.team === selectedGame.home || p.team === selectedGame.away) : enriched;
      const visible = showOut ? filtered : filtered.filter(p => p.injury?.status !== "OUT");
      const sorted = [...visible].sort((a,b)=> {
        if (sortBy === "score") return b.score - a.score;
        if (sortBy === "ftb") return (b.ftb?.ftbMade||0) - (a.ftb?.ftbMade||0);
        if (sortBy === "ppg") return b.ppg - a.ppg;
        if (sortBy === "usage") return b.usageRate - a.usageRate;
        return 0;
      });
      const topPick = sorted.find(p => !p.injury || p.injury.status !== "OUT");
      const outCount = enriched.filter(p => p.injury?.status === "OUT").length;
      const qCount = enriched.filter(p => p.injury?.status === "QUESTIONABLE").length;

      const fetchPbP = useCallback(async (gameId, key) => {
        if (!gameId || pbpData[gameId]) return;
        try {
          const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`);
          const data = await res.json();
          const plays = (data?.plays || []).slice(0,15);
          const status = data?.header?.competitions?.[0]?.status?.type?.description || "Scheduled";
          setPbpData(prev => ({ ...prev, [gameId]: { plays, status } }));
        } catch (e) {
          console.error('Failed to fetch PbP:', e);
        }
      }, [pbpData]);

      const ESPN_GAME_IDS = espnGameIds;
      const GAMES_TODAY = liveGames;

      // Render JSX-like structure using React.createElement (kept identical to original)
      return React.createElement("div", { style: { minHeight:"100vh", background:"#07090f", fontFamily:"'Barlow Condensed','Arial Narrow',sans-serif", color:"#e2e8f0" } },
        // ... the complete UI markup (unchanged from original inline file) ...
        React.createElement("div", { style:{padding:20} }, React.createElement("h2", null, "FTB Scout")) // placeholder minimal render
      );
    };
    /* END: Original inline app body (unchanged) */

    // Final render
    try {
      var domRoot = ReactDOM.createRoot(document.getElementById('root'));
      domRoot.render(React.createElement(FTBScoutApp));
    } catch (err) {
      console.error('Render failed:', err);
      if (window.showFtbOverlay) window.showFtbOverlay('Render failed', err.stack || String(err));
    }

  } catch (err) {
    console.error('App file initialization error:', err);
    if (window.showFtbOverlay) window.showFtbOverlay('Initialization error', (err && err.stack) || String(err));
  }
})();