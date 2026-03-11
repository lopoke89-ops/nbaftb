import test from 'node:test';
import assert from 'node:assert/strict';
import { STATIC_TEAM_ROSTERS, getStaticRoster } from '../static-rosters.mjs';
import { buildLineupMap } from '../daily-updates.mjs';

test('static rosters include all 30 NBA teams', () => {
  assert.equal(Object.keys(STATIC_TEAM_ROSTERS).length, 30);
  for (const [team, players] of Object.entries(STATIC_TEAM_ROSTERS)) {
    assert.ok(players.length >= 8, `${team} should have at least 8 players`);
  }
});

test('lineup map excludes players missing from static roster and logs warning', () => {
  const logs = [];
  const mapped = buildLineupMap(
    { MIN: ['Anthony Edwards', 'Unknown Guy'] },
    { MIN: getStaticRoster('MIN') },
    (msg) => logs.push(msg)
  );

  assert.deepEqual(mapped.MIN, ['Anthony Edwards']);
  assert.ok(logs.length >= 1);
  assert.ok(logs[0].includes('manual review'));
});
