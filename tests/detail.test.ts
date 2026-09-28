import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TransactionDetailView } from '../client/transaction-detail.js';
import type { Account, Transaction } from '../server/domain.js';

const account: Account = { id: 'a', userId: 'u', name: 'Everyday', type: 'Checking', number: '12345678', currency: 'USD', openingBalanceCents: 100, balanceCents: 100 };
const entry: Transaction = { id: 'txn-1', accountId: 'a', date: '2026-09-28T12:00:00Z', description: '<script>unsafe</script>', amountCents: -1234, type: 'Debit', category: 'Bills', notes: '', transferId: null };
test('detail renders required fields, escaped description and explicit no-notes value', () => {
  const html = renderToStaticMarkup(createElement(TransactionDetailView, { entry, accounts: [account] }));
  for (const value of ['txn-1', 'Sep 28, 2026', '-$12.34', 'Bills', 'No notes', 'Everyday · ending 5678']) assert.ok(html.includes(value));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('12345678'));
});
test('transfer detail identifies both accounts and both signed postings', () => {
  const transfer = { id: 'transfer-1', userId: 'u', sourceAccountId: 'a', destinationAccountId: 'b', amountCents: 1234, idempotencyKey: 'key', date: entry.date };
  const html = renderToStaticMarkup(createElement(TransactionDetailView, { entry: { ...entry, type: 'Transfer', transferId: transfer.id, transfer }, accounts: [account, { ...account, id: 'b', name: 'Savings' }] }));
  for (const value of ['From', 'To', 'transfer-1', 'Savings', '-$12.34', '+$12.34']) assert.ok(html.includes(value));
});
