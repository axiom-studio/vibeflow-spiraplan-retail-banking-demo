import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { DomainError } from './domain.js';
import type { BankingRepository } from './repository.js';

export function createApp(repository: BankingRepository, userId: string, staticDir?: string) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));
  app.get('/api/health', async (_req, res) => {
    await repository.getUser(userId);
    res.json({ status: 'ok' });
  });
  app.use('/api', async (_req, _res, next) => {
    if (!await repository.getUser(userId)) throw new DomainError('user_not_found', 'Demo customer not found. Publish demo data first.', 404);
    next();
  });
  app.get('/api/accounts', async (_req, res) => res.json(await repository.listAccounts(userId)));
  app.get('/api/accounts/:id/transactions', async (req, res) => {
    if (!await repository.getAccount(userId, req.params.id)) throw new DomainError('not_found', 'Account not found.', 404);
    res.json(await repository.listTransactions(userId, req.params.id));
  });
  app.get('/api/accounts/:id/transactions/:transactionId', async (req, res) => {
    const transaction = await repository.getTransaction(userId, req.params.id, req.params.transactionId);
    if (!transaction) throw new DomainError('not_found', 'Transaction not found.', 404);
    res.json(transaction);
  });
  app.post('/api/transfers', async (req, res) => {
    // The repository validates the boundary before starting its atomic operation.
    res.json(await repository.createTransfer(userId, req.body));
  });
  app.use('/api', (_req, res) => res.status(404).json({ code: 'not_found', message: 'Endpoint not found.' }));
  if (staticDir && existsSync(resolve(staticDir, 'index.html'))) {
    app.use(express.static(staticDir));
    app.get('/{*path}', (_req, res) => res.sendFile(resolve(staticDir, 'index.html')));
  }
  app.use(errorHandler);
  return app;
}

const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof DomainError) { res.status(error.status).json({ code: error.code, message: error.message }); return; }
  const status = typeof error === 'object' && error && 'status' in error ? error.status : 500;
  if (status === 400 || status === 413) {
    res.status(status).json({ code: 'invalid_body', message: status === 413 ? 'Request is too large.' : 'Invalid JSON request.' });
  } else {
    console.error('Request failed:', error);
    res.status(500).json({ code: 'internal_error', message: 'Unable to complete the request.' });
  }
};
