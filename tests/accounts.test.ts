import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterAccounts } from '../client/account-filter.js';
import type { Account } from '../server/domain.js';

const make = (id: string, name: string, type: Account['type'], balanceCents: number): Account => ({ id, name, type, balanceCents, openingBalanceCents: balanceCents, userId: 'u', number: '1234', currency: 'USD' });
const accounts = [make('b', 'Savings Blue', 'Savings', 100), make('a', 'Everyday', 'Checking', 900), make('c', 'Savings Green', 'Savings', 100)];
test('account search, type and sort compose without mutating source records', () => {
  assert.deepEqual(filterAccounts(accounts, ' SAVINGS ', 'Savings', 'name-desc').map(a => a.id), ['c', 'b']);
  assert.deepEqual(filterAccounts(accounts, '', 'All', 'balance-desc').map(a => a.id), ['a', 'b', 'c']);
  assert.deepEqual(filterAccounts(accounts, '', 'All', 'balance-asc').map(a => a.id), ['b', 'c', 'a']);
  assert.deepEqual(accounts.map(a => a.id), ['b', 'a', 'c']);
});
test('no-match, empty and singleton accounts retain deterministic results', () => {
  assert.deepEqual(filterAccounts(accounts, 'Savings', 'Checking', 'name-asc'), []);
  assert.deepEqual(filterAccounts([], '', 'All', 'name-asc'), []);
  assert.deepEqual(filterAccounts([accounts[0]], 'blue', 'Savings', 'balance-desc'), [accounts[0]]);
});
