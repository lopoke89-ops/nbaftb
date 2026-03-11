import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchAndValidateRoster,
  atomicUpdateRosterCache,
  validateRosterPayload,
} from '../roster-fetch.mjs';

function makePlayers(team = 'MIN', count = 8) {
  return Array.from({ length: count }).map((_, i) => ({
    name: `Player ${i + 1}`,
    team,
    pos: 'SG',
    ftbPct: 10,
    usageRate: 20,
    ppg: 12,
    gp: 40,
  }));
}

test('successful fetchAndValidateRoster returns validated roster and allows atomic update', async () => {
  const players = makePlayers('MIN', 10);
  const result = await fetchAndValidateRoster({
    teamAbbr: 'MIN',
    source: {
      name: 'Primary API',
      endpoint: 'https://example.test/rosters',
      fetch: async () => ({ statusCode: 200, endpoint: 'https://example.test/rosters', players }),
    },
    retryConfig: { retries: 0 },
  });

  assert.equal(result.players.length, 10);
  const updated = atomicUpdateRosterCache({}, 'MIN', result.players, 123);
  assert.equal(updated.MIN.players.length, 10);
  assert.equal(updated.MIN.fetchedAt, 123);
});

test('missing MIN roster prevents update', async () => {
  await assert.rejects(
    fetchAndValidateRoster({
      teamAbbr: 'MIN',
      source: {
        name: 'Primary API',
        endpoint: 'https://example.test/rosters',
        fetch: async () => ({ statusCode: 200, endpoint: 'https://example.test/rosters', players: makePlayers('MIN', 0) }),
      },
      retryConfig: { retries: 0 },
    }),
    /expected at least/
  );

  assert.throws(() => atomicUpdateRosterCache({}, 'MIN', makePlayers('MIN', 0)), /expected at least/);
});

test('invalid MIN type/range prevents update', async () => {
  const bad = makePlayers('MIN', 8);
  bad[0].ftbPct = 130;

  await assert.rejects(
    fetchAndValidateRoster({
      teamAbbr: 'MIN',
      source: {
        name: 'Primary API',
        endpoint: 'https://example.test/rosters',
        fetch: async () => ({ statusCode: 200, endpoint: 'https://example.test/rosters', players: bad }),
      },
      retryConfig: { retries: 0 },
    }),
    /invalid ftbPct/
  );

  assert.throws(() => validateRosterPayload('MIN', bad), /invalid ftbPct/);
});

test('network/server failures retry and do not update', async () => {
  let attempts = 0;
  const logs = [];

  await assert.rejects(
    fetchAndValidateRoster({
      teamAbbr: 'MIN',
      source: {
        name: 'Primary API',
        endpoint: 'https://example.test/rosters',
        fetch: async () => {
          attempts += 1;
          if (attempts === 1) {
            throw new Error('timeout');
          }
          return { statusCode: 500, endpoint: 'https://example.test/rosters', players: [] };
        },
      },
      log: (msg) => logs.push(msg),
      retryConfig: { retries: 1, baseDelayMs: 1 },
    }),
    /Failed to fetch validated roster/
  );

  assert.equal(attempts, 2);
  assert.ok(logs.some((line) => line.includes('"endpoint":"https://example.test/rosters"')));
  assert.ok(logs.some((line) => line.includes('"timestamp"')));
});
