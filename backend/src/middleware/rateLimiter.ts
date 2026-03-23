import { redisConnection } from '../queue/queue';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowMs;
  const redisKey = `ratelimit:${key}`;

  const pipeline = redisConnection.pipeline();
  
  // Clean up older timestamps outside the current window
  pipeline.zremrangebyscore(redisKey, 0, windowStart);
  
  // Log the current request
  pipeline.zadd(redisKey, now, now.toString());
  
  // Count remaining entities mapping to current window constraint
  pipeline.zcard(redisKey);
  
  // Automatically discard outdated sets to curb memory leakages
  pipeline.pexpire(redisKey, windowMs);

  const results = await pipeline.exec();
  
  if (!results) {
    return { allowed: true, remaining: limit, resetMs: windowMs };
  }

  // zcard returned from third pipeline operation
  const requestCount = results[2][1] as number;
  const allowed = requestCount <= limit;
  const remaining = Math.max(0, limit - requestCount);

  return { allowed, remaining, resetMs: windowMs };
}
