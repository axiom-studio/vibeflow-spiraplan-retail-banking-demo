import { z } from 'zod';
import { DomainError } from './domain.js';

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const cents = z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);
const text = z.string().trim().min(1).max(200);
const user = z.strictObject({ id, name: text });
const account = z.strictObject({
  id, userId: id, name: text, type: z.enum(['Checking', 'Savings', 'Investment']),
  number: z.string().regex(/^\d{4,20}$/), currency: z.literal('USD'), openingBalanceCents: cents.min(0),
});
const transaction = z.strictObject({
  id, userId: id, accountId: id, date: z.iso.datetime({ offset: true }), description: text,
  amountCents: cents.refine(n => n !== 0, 'Amount must be nonzero'),
  type: z.enum(['Debit', 'Credit']), category: z.enum(['Income', 'Shopping', 'Bills', 'Other']),
  notes: z.string().max(1000).default(''),
}).refine(t => t.type === 'Debit' ? t.amountCents < 0 : t.amountCents > 0, 'Amount sign must match transaction type');
const envelope = z.strictObject({
  version: z.literal(1), users: z.array(user).max(1000).default([]),
  accounts: z.array(account).max(1000).default([]), transactions: z.array(transaction).max(10000).default([]),
});
export type Fixture = z.infer<typeof envelope>;
export interface ImportResult { created: number; skipped: number; dryRun: boolean }

export function parseFixture(input: unknown): Fixture {
  const result = envelope.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new DomainError('invalid_fixture', `Invalid fixture at ${issue.path.join('.') || 'root'}: ${issue.message}`);
  }
  // O(n) duplicate detection ensures a batch cannot double-apply a transaction.
  for (const rows of [result.data.users, result.data.accounts, result.data.transactions]) {
    const ids = new Set<string>();
    for (const row of rows) {
      if (ids.has(row.id)) throw new DomainError('duplicate_id', `Duplicate fixture ID: ${row.id}`);
      ids.add(row.id);
    }
  }
  return result.data;
}
