import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

import { config } from './config';
import logger from './utils/logger';
import db from './db/knex';
import { runMigrations } from './db/migrations/001_create_submissions';
import { initPool } from './executor/poolManager';
import { setupWebSocket } from './terminal/wsHandler';
import { killSession, sessions } from './terminal/ptyManager';

import healthRouter from './routes/health';
import submissionsRouter from './routes/submissions';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();
const server = http.createServer(app);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const reqId = (req.headers['x-request-id'] as string) || uuidv4();
  req.headers['x-request-id'] = reqId;
  res.setHeader('x-request-id', reqId);
  next();
});

app.use('/api', healthRouter);
app.use('/api', submissionsRouter);

// Undefined endpoints catchall
app.use(notFoundHandler);

// Centralized error responder
app.use(errorHandler);

// Establish WebSocket listeners natively mapping the /ws boundary natively spanning active Server scope
setupWebSocket(server);

async function startServer() {
  try {
    await runMigrations(db);
    logger.info('Database knex migrations completed successfully.');

    if (config.POOL_ENABLED) {
      await initPool();
      logger.info('Container cluster pool successfully initialized and activated.');
    }

    server.listen(config.PORT, () => {
      logger.info(`Runly.dev Backend initialized routing HTTP traffic on PORT: ${config.PORT}`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to orchestrate backend environment processes.');
    process.exit(1);
  }
}

const triggerGracefulShutdown = () => {
  logger.info('Termination cycle commenced (SIGTERM/SIGINT). Releasing all concurrent Docker/PTY pipelines securely.');
  for (const sessionId of sessions.keys()) {
    killSession(sessionId);
  }
  
  db.destroy();
  
  server.close(() => {
    logger.info('HTTP endpoints completely sealed off. Closing.');
    process.exit(0);
  });
};

process.on('SIGTERM', triggerGracefulShutdown);
process.on('SIGINT', triggerGracefulShutdown);

startServer();
