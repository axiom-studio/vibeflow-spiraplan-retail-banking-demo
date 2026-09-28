import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { SqliteRepository } from '../server/sqlite.js';
import { parseFixture } from '../server/fixtures.js';

const example = () => JSON.parse(readFileSync('fixtures/example.json', 'utf8'));

test('import creates once, updates cents exactly, supports transaction-only batches and skips identical replay', async () => {
  const db = new SqliteRepository(':memory:');
  try {
    assert.equal(await db.isEmpty(), true);
    assert.deepEqual(await db.importFixture(example()), { created: 8, skipped: 0, dryRun: false });
    assert.equal(await db.isEmpty(), false);
    assert.equal((await db.getAccount('demo-user', 'everyday'))?.balanceCents, 723935);
    assert.deepEqual(await db.importFixture(example()), { created: 0, skipped: 8, dryRun: false });
    const entry = { ...example().transactions[0], id: 'extra', amountCents: 1 };
    await db.importFixture({ version: 1, transactions: [entry] });
    assert.equal((await db.getAccount('demo-user', 'everyday'))?.balanceCents, 723936);
    await db.importFixture(example());
    assert.equal((await db.getAccount('demo-user', 'everyday'))?.balanceCents, 723936);
  } finally { db.close(); }
});

test('dry-run writes no rows, and reference/sign/conflict/overdraft failures roll back all rows', async () => {
  const db = new SqliteRepository(':memory:');
  try {
    assert.equal((await db.importFixture(example(), true)).created, 8);
    assert.equal(await db.isEmpty(), true);
    const bad = example();
    bad.transactions[3].userId = 'another-user';
    await assert.rejects(db.importFixture(bad), /does not belong/);
    assert.equal(await db.isEmpty(), true);
    await db.importFixture(example());
    const conflict = example();
    conflict.users.unshift({ id: 'new-user', name: 'New user' });
    conflict.accounts[0].name = 'Changed';
    await assert.rejects(db.importFixture(conflict), /Conflicting/);
    assert.equal(await db.getUser('new-user'), undefined);
    const debit = { ...example().transactions[1], id: 'overdraft', amountCents: -800000 };
    await assert.rejects(db.importFixture({ version: 1, transactions: [debit] }), /invalid balance/);
    assert.equal((await db.getAccount('demo-user', 'everyday'))?.balanceCents, 723935);
    assert.equal(await db.getTransaction('demo-user', 'everyday', 'overdraft'), undefined);
  } finally { db.close(); }
});

test('fixture boundary rejects duplicate IDs, malformed dates, unsafe cents, extra fields and type-sign mismatch', () => {
  for (const value of [null, {}, { version: 2 }, { version: 1, users: [{ id: 'a', name: 'A' }, { id: 'a', name: 'A' }] }]) {
    assert.throws(() => parseFixture(value));
  }
  for (const patch of [{ date: 'yesterday' }, { date: '2026-02-30T12:00:00Z' }, { amountCents: 1.1 }, { amountCents: Number.MAX_SAFE_INTEGER + 1 }, { amountCents: -1 }, { injected: 'bad' }]) {
    const input = example();
    Object.assign(input.transactions[0], patch);
    assert.throws(() => parseFixture(input));
  }
  assert.equal(parseFixture({ version: 1 }).users.length, 0);
});

test('CLI persists data, dry-run creates no target file, and invalid input exits nonzero', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bank-publisher-'));
  const path = join(dir, 'bank.sqlite');
  const run = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', 'tools/publish.ts', ...args], {
    encoding: 'utf8', env: { ...process.env, DATABASE_PATH: path },
  });
  try {
    const dry = run('--file', 'fixtures/example.json', '--dry-run');
    assert.equal(dry.status, 0, dry.stderr);
    assert.equal(existsSync(path), false);
    const first = run('--file', 'fixtures/example.json');
    assert.equal(first.status, 0, first.stderr);
    assert.equal(JSON.parse(first.stdout).created, 8);
    assert.equal(JSON.parse(run('--file', 'fixtures/example.json').stdout).skipped, 8);
    const db = new SqliteRepository(path);
    try { assert.equal((await db.listAccounts('demo-user')).length, 3); } finally { db.close(); }
    writeFileSync(join(dir, 'invalid.json'), '{');
    assert.equal(run('--file', join(dir, 'invalid.json')).status, 1);
    assert.equal(run().status, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
