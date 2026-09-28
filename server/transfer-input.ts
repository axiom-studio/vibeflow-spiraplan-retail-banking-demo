import { z } from 'zod';
import { DomainError } from './domain.js';

const transferInput = z.strictObject({
  sourceAccountId: z.string().min(1).max(80),
  destinationAccountId: z.string().min(1).max(80),
  amountCents: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
});
export type TransferInput = z.infer<typeof transferInput>;
export function parseTransfer(input: unknown): TransferInput {
  const result = transferInput.safeParse(input);
  if (!result.success) throw new DomainError('invalid_transfer', 'Choose both accounts, a positive whole-cent amount and a valid submission key.');
  if (result.data.sourceAccountId === result.data.destinationAccountId) throw new DomainError('same_account', 'Choose two different accounts.');
  return result.data;
}
