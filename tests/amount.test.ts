import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseAmount } from '../client/amount.js';
test('decimal money parsing retains exact cents through the safe integer boundary', () => {
  for (const [value, cents] of [['0.01', 1], ['10', 1000], ['10.1', 1010], [' 12.34 ', 1234], ['90071992547409.91', Number.MAX_SAFE_INTEGER]] as const) assert.equal(parseAmount(value), cents);
});
test('decimal money parsing rejects zero, negatives, exponents, excess decimals and unsafe amounts', () => {
  for (const value of ['', '0', '-1', '1.001', '1e2', '1,000', 'NaN', '90071992547409.92', '99999999999999999']) assert.equal(parseAmount(value), undefined);
});
