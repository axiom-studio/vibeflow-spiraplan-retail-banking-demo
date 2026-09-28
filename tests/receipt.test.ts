import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TransferReceipt } from '../client/transfer-receipt.js';
import type { Account, Transfer } from '../server/domain.js';

test('receipt presents source before destination, exact amount, escaped reference and source navigation', () => {
  const accounts: Account[] = ['source', 'destination'].map(id => ({ id, userId: 'u', name: id, type: 'Checking', number: '12345678', currency: 'USD', openingBalanceCents: 0, balanceCents: 0 }));
  const transfer: Transfer = { id: '<reference>', userId: 'u', sourceAccountId: 'source', destinationAccountId: 'destination', amountCents: 1001, idempotencyKey: 'key', date: '2026-09-28T00:00:00Z' };
  const html = renderToStaticMarkup(createElement(TransferReceipt, { accounts, transfer }));
  assert.match(html, /From.*source.*To.*destination.*Amount.*\$10\.01.*Transaction ID.*&lt;reference&gt;/);
  assert.doesNotMatch(html, /12345678/);
  assert.match(html, /role="status"/);
  assert.match(html, /href="#\/accounts\/source"/);
  assert.match(html, /Back to accounts/);
});
