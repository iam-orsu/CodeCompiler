import { Router, Request, Response } from 'express';
import db from '../db/knex';
import { redisConnection, executionQueue } from '../queue/queue';
import Docker from 'dockerode';
import { getPoolStatus } from '../executor/poolManager';
import { sessions } from '../terminal/ptyManager';

const router = Router();
const docker = new Docker();

router.get('/health', async (req: Request, res: Response) => {
  let postgresStatus = 'error';
  let redisStatus = 'error';
  let dockerStatus = 'error';
  
  try {
    await db.raw('SELECT 1');
    postgresStatus = 'connected';
  } catch (e) {}

  try {
    if (redisConnection.status === 'ready') {
      await redisConnection.ping();
      redisStatus = 'connected';
    }
  } catch (e) {}

  try {
    await docker.info();
    dockerStatus = 'connected';
  } catch (e) {}

  let queueDepth = 0;
  try {
    queueDepth = await executionQueue.getWaitingCount();
  } catch (e) {}

  const active_pty_sessions = sessions.size;
  const isHealthy = postgresStatus === 'connected' && redisStatus === 'connected' && dockerStatus === 'connected';
  const healthStatus = isHealthy ? 'ok' : 'degraded';

  const memory_usage_mb = Math.round(process.memoryUsage().rss / 1024 / 1024);

  res.json({
    status: healthStatus,
    postgres: postgresStatus,
    redis: redisStatus,
    docker: dockerStatus,
    active_pty_sessions,
    pool_status: getPoolStatus(),
    queue_depth: queueDepth,
    uptime_seconds: Math.floor(process.uptime()),
    memory_usage_mb
  });
});

export default router;
