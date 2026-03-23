import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config';

const redisConnection = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const executionQueue = new Queue('code-execution', {
  connection: redisConnection,
});

export async function addExecutionJob(submissionId: string) {
  return executionQueue.add(
    'execute-code',
    { submissionId },
    {
      attempts: 1,
      removeOnComplete: { age: 60 },
      removeOnFail: { age: 300 },
    }
  );
}
