import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { SqliteRepository } from '../server/sqlite.js';
import { createApp } from '../server/app.js';

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'banking-'));
  const path = join(dir, 'bank.sqlite');
  const repository = new SqliteRepository(path);
  const db = new DatabaseSync(path);
  db.exec(`INSERT INTO users VALUES ('alice','Alice'), ('bob','Bob');
    INSERT INTO accounts VALUES
      ('a','alice','Everyday','Checking','1001','USD',1000,1000),
      ('b','bob','Private','Savings','2001','USD',3000,3000);
    INSERT INTO transactions VALUES
      ('t1','a','2026-09-01','Opening credit',1000,'Credit','Income','',NULL),
      ('t2','b','2026-09-02','Private credit',3000,'Credit','Income','',NULL);`);
  db.close();
  return { dir, path, repository, cleanup: () => { repository.close(); rmSync(dir, { recursive: true, force: true }); } };
}

test('repository persists data across reopen and restricts reads by owner and account', async () => {
  const f = fixture();
  try {
    const reopened = new SqliteRepository(f.path);
    try { assert.equal((await reopened.listAccounts('alice'))[0].balanceCents, 1000); }
    finally { reopened.close(); }
    assert.equal((await f.repository.getUser('alice'))?.name, 'Alice');
    assert.equal(await f.repository.getUser('missing'), undefined);
    assert.equal(await f.repository.getAccount('bob', 'a'), undefined);
    assert.equal(await f.repository.getTransaction('alice', 'a', 't2'), undefined);
    assert.deepEqual(await f.repository.listTransactions('alice', 'b'), []);
    assert.equal((await f.repository.listTransactions('alice', 'a'))[0].id, 't1');
    assert.deepEqual(await f.repository.listAccounts("alice' OR 1=1 --"), []);
    assert.deepEqual(await f.repository.listAccounts(''), []);
  } finally { f.cleanup(); }
});

test('real HTTP routes enforce ownership, reject malformed bodies and serve SPA', async () => {
  const f = fixture();
  writeFileSync(join(f.dir, 'index.html'), '<!doctype html><title>Banking fixture</title>');
  const server = createApp(f.repository, 'alice', f.dir).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    assert.equal((await fetch(`${base}/api/health`)).status, 200);
    const accounts = await (await fetch(`${base}/api/accounts`)).json();
    assert.equal(accounts.length, 1);
    assert.equal(accounts[0].userId, 'alice');
    assert.equal((await fetch(`${base}/api/accounts/b/transactions`)).status, 404);
    assert.equal((await fetch(`${base}/api/accounts/a/transactions/t2`)).status, 404);
    const transaction = await (await fetch(`${base}/api/accounts/a/transactions/t1`)).json();
    assert.equal(transaction.id, 't1');
    const transactions = await (await fetch(`${base}/api/accounts/a/transactions`)).json();
    assert.equal(transactions.length, 1);
    const malformed = await fetch(`${base}/api/accounts`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json()).code, 'invalid_body');
    const large = await fetch(`${base}/api/accounts`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify('x'.repeat(70000)) });
    assert.equal(large.status, 413);
    assert.equal((await fetch(`${base}/api/missing`)).status, 404);
    assert.match(await (await fetch(`${base}/accounts`)).text(), /Banking fixture/);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); f.cleanup(); }
});

test('empty database has a healthy connection and explicit missing-customer error', async () => {
  const repository = new SqliteRepository(':memory:');
  const server = createApp(repository, 'missing').listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    assert.equal((await fetch(`${base}/api/health`)).status, 200);
    const response = await fetch(`${base}/api/accounts`);
    assert.equal(response.status, 404);
    assert.equal((await response.json()).code, 'user_not_found');
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); repository.close(); }
});
