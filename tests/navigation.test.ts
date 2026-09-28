import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDate, parseRoute } from '../client/navigation.js';
test('navigation decodes account IDs and safely rejects malformed escapes', () => {
  assert.deepEqual(parseRoute(''), ['accounts']);
  assert.deepEqual(parseRoute('#/accounts/everyday'), ['accounts', 'everyday']);
  assert.deepEqual(parseRoute('#/accounts/a%20b'), ['accounts', 'a b']);
  assert.deepEqual(parseRoute('#/accounts/%zz'), ['not-found']);
});
test('date formatting preserves calendar dates and uses configured zone for timestamps', () => {
  assert.equal(formatDate('2026-09-28'), 'Sep 28, 2026');
  assert.equal(formatDate('2026-09-28T01:00:00Z'), 'Sep 27, 2026');
});
