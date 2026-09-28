import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import type { AddressInfo } from 'node:net';
import { SqliteRepository } from '../server/sqlite.js';
import { createApp } from '../server/app.js';

const request = { sourceAccountId: 'a', destinationAccountId: 'b', amountCents: 1000, idempotencyKey: 'first' };
async function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'bank-transfer-'));
  const path = join(dir, 'bank.sqlite');
  const repository = new SqliteRepository(path);
  await repository.importFixture({ version: 1, users: [{ id: 'alice', name: 'Alice' }, { id: 'bob', name: 'Bob' }],
    accounts: [['a', 'alice', 1000], ['b', 'alice', 0], ['c', 'bob', 500], ['max', 'alice', Number.MAX_SAFE_INTEGER]].map(([id, userId, openingBalanceCents]) => ({ id, userId, name: id, type: 'Checking', number: '1001', currency: 'USD', openingBalanceCents })) });
  return { path, repository, cleanup: () => { repository.close(); rmSync(dir, { recursive: true, force: true }); } };
}

test('exact-balance transfer commits two distinct postings, retries once and persists across reopen', async () => {
  const f = await fixture();
  try {
    const result = await f.repository.createTransfer('alice', request);
    assert.deepEqual(await f.repository.createTransfer('alice', request), result);
    assert.equal((await f.repository.getAccount('alice', 'a'))?.balanceCents, 0);
    assert.equal((await f.repository.getAccount('alice', 'b'))?.balanceCents, 1000);
    const debit = (await f.repository.listTransactions('alice', 'a'))[0];
    const credit = (await f.repository.listTransactions('alice', 'b'))[0];
    assert.notEqual(debit.id, credit.id);
    assert.equal(debit.amountCents, -1000);
    assert.equal(credit.amountCents, 1000);
    assert.equal(debit.transferId, result.id);
    assert.equal(credit.transferId, result.id);
    assert.equal((await f.repository.getTransaction('alice', 'a', debit.id))?.transfer?.id, result.id);
    const reopened = new SqliteRepository(f.path);
    try { assert.deepEqual(await reopened.createTransfer('alice', request), result); }
    finally { reopened.close(); }
    await assert.rejects(f.repository.createTransfer('alice', { ...request, amountCents: 1 }), /different transfer/);
    assert.equal((await f.repository.listTransactions('alice', 'a')).length, 1);
  } finally { f.cleanup(); }
});

test('invalid input, ownership, insufficient funds and destination overflow leave balances and ledger unchanged', async () => {
  const f = await fixture();
  try {
    for (const input of [null, {}, { ...request, extra: true }, ...[0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '100'].map(amountCents => ({ ...request, amountCents })),
      { ...request, idempotencyKey: '' }, { ...request, sourceAccountId: '' }, { ...request, destinationAccountId: 'a' },
      { ...request, destinationAccountId: 'missing' }, { ...request, destinationAccountId: 'c' },
      { ...request, destinationAccountId: 'max' }, { ...request, amountCents: 1001 }]) {
      await assert.rejects(f.repository.createTransfer('alice', input));
    }
    await assert.rejects(f.repository.createTransfer('bob', request));
    assert.equal((await f.repository.getAccount('alice', 'a'))?.balanceCents, 1000);
    assert.equal((await f.repository.getAccount('alice', 'b'))?.balanceCents, 0);
    assert.deepEqual(await f.repository.listTransactions('alice', 'a'), []);
    assert.deepEqual(await f.repository.listTransactions('alice', 'b'), []);
    // Failed submissions do not consume a key; a one-cent transfer can use it.
    assert.equal((await f.repository.createTransfer('alice', { ...request, amountCents: 1 })).amountCents, 1);
  } finally { f.cleanup(); }
});

test('real HTTP boundary rejects malformed transfers and deduplicates concurrent confirmations', async () => {
  const f = await fixture();
  const server = createApp(f.repository, 'alice').listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/transfers`;
  const post = (body: unknown) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  try {
    assert.equal((await post({ ...request, amountCents: 0 })).status, 400);
    assert.equal((await post({ ...request, destinationAccountId: 'c' })).status, 404);
    const responses = await Promise.all([post(request), post(request)]);
    assert.deepEqual(responses.map(response => response.status), [200, 200]);
    const results = await Promise.all(responses.map(response => response.json()));
    assert.equal(results[0].id, results[1].id);
    const conflict = await post({ ...request, amountCents: 1 });
    assert.equal(conflict.status, 409);
    assert.equal((await conflict.json()).code, 'idempotency_conflict');
    assert.equal((await f.repository.listTransactions('alice', 'a')).length, 1);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); f.cleanup(); }
});

test('independent processes racing for the same funds cannot overdraw or partially post', async () => {
  const f = await fixture();
  const run = (key: string) => new Promise<string>((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
      import { SqliteRepository } from './server/sqlite.ts';
      const db = new SqliteRepository(process.argv[1]);
      try { await db.createTransfer('alice', { sourceAccountId:'a', destinationAccountId:'b', amountCents:1000, idempotencyKey:process.argv[2] }); console.log('committed'); }
      catch(error) { if(error.code === 'insufficient_funds') console.log('insufficient_funds'); else throw error; }
      finally { db.close(); }
    `, f.path, key]);
    let stdout = ''; let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr)));
  });
  try {
    const results = await Promise.all([run('race-1'), run('race-2'), run('race-3')]);
    assert.equal(results.filter(result => result === 'committed').length, 1);
    assert.equal(results.filter(result => result === 'insufficient_funds').length, 2);
    assert.equal((await f.repository.getAccount('alice', 'a'))?.balanceCents, 0);
    assert.equal((await f.repository.getAccount('alice', 'b'))?.balanceCents, 1000);
    assert.equal((await f.repository.listTransactions('alice', 'a')).length, 1);
    assert.equal((await f.repository.listTransactions('alice', 'b')).length, 1);
  } finally { f.cleanup(); }
});
