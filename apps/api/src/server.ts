import 'dotenv/config';

import { buildApp } from './app.js';

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '0.0.0.0';

async function startServer() {
  const app = buildApp();
  const port = readPort(process.env.PORT);
  const host = process.env.HOST || DEFAULT_HOST;

  const shutdown = async (signal: NodeJS.Signals) => {
    app.log.info({ signal }, 'Shutting down API server');

    try {
      await app.close();
      process.exit(0);
    } catch (error) {
      app.log.error({ err: error }, 'Failed to shut down cleanly');
      process.exit(1);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await app.listen({ port, host });
  } catch (error) {
    app.log.error({ err: error }, 'Failed to start API server');
    process.exit(1);
  }
}

function readPort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_PORT;
  }

  const port = Number.parseInt(value, 10);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return port;
}

void startServer();
