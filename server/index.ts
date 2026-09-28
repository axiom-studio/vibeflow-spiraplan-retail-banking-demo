import { createApp } from './app.js';
import { SqliteRepository } from './sqlite.js';

const repository = new SqliteRepository(process.env.DATABASE_PATH ?? 'data/banking.sqlite');
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');
const app = createApp(repository, process.env.DEMO_USER_ID ?? 'demo-user', 'dist/client');
const server = app.listen(port, () => console.log(`Banking demo listening on port ${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.close(() => { repository.close(); process.exit(0); }));
}
