import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { DomainError, type Account, type Transfer } from './domain.js';
import type { TransferInput } from './transfer-input.js';

function transferWithinLock(db: DatabaseSync, userId: string, input: TransferInput): Transfer {
  // A fixed number of indexed point lookups: O(log n), no scans or query loops.
  const previous = db.prepare('SELECT * FROM transfers WHERE userId = ? AND idempotencyKey = ?').get(userId, input.idempotencyKey) as unknown as Transfer | undefined;
  if (previous) {
    if (previous.sourceAccountId !== input.sourceAccountId || previous.destinationAccountId !== input.destinationAccountId || previous.amountCents !== input.amountCents) {
      throw new DomainError('idempotency_conflict', 'This submission key already belongs to a different transfer.', 409);
    }
    return { ...previous };
  }
  const account = db.prepare('SELECT * FROM accounts WHERE userId = ? AND id = ?');
  const source = account.get(userId, input.sourceAccountId) as unknown as Account | undefined;
  const destination = account.get(userId, input.destinationAccountId) as unknown as Account | undefined;
  if (!source || !destination) throw new DomainError('account_not_found', 'One or both transfer accounts are unavailable.', 404);
  if (source.balanceCents < input.amountCents) throw new DomainError('insufficient_funds', 'The source account has insufficient funds.', 409);
  if (!Number.isSafeInteger(destination.balanceCents + input.amountCents)) throw new DomainError('balance_limit', 'The destination account cannot accept this amount.', 409);
  const transfer: Transfer = { ...input, userId, id: randomUUID(), date: new Date().toISOString() };
  db.prepare('INSERT INTO transfers VALUES (?, ?, ?, ?, ?, ?, ?)').run(transfer.id, userId, source.id, destination.id, input.amountCents, input.idempotencyKey, transfer.date);
  const balance = db.prepare('UPDATE accounts SET balanceCents = ? WHERE id = ? AND userId = ?');
  balance.run(source.balanceCents - input.amountCents, source.id, userId);
  balance.run(destination.balanceCents + input.amountCents, destination.id, userId);
  const posting = db.prepare("INSERT INTO transactions (id, accountId, date, description, amountCents, type, category, notes, transferId) VALUES (?, ?, ?, ?, ?, 'Transfer', 'Transfer', '', ?)");
  posting.run(randomUUID(), source.id, transfer.date, `Transfer to ${destination.name}`, -input.amountCents, transfer.id);
  posting.run(randomUUID(), destination.id, transfer.date, `Transfer from ${source.name}`, input.amountCents, transfer.id);
  return transfer;
}

export function createSqliteTransfer(db: DatabaseSync, userId: string, input: TransferInput): Transfer {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = transferWithinLock(db, userId, input);
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    if (error instanceof DomainError) throw error;
    throw new Error(`Unable to transfer from account ${input.sourceAccountId} to ${input.destinationAccountId}`, { cause: error });
  }
}
