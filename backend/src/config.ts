import { z } from 'zod';

const configSchema = z.object({
  // Server
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.string().default('development'),
  
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DB_POOL_MIN: z.coerce.number().default(2),
  DB_POOL_MAX: z.coerce.number().default(20),
  
  // Redis
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  
  // PTY Terminal Settings
  PTY_TIMEOUT_MS: z.coerce.number().default(30000),
  PTY_GO_TIMEOUT_MS: z.coerce.number().default(60000),
  PTY_JAVA_TIMEOUT_MS: z.coerce.number().default(60000),
  PTY_CSHARP_TIMEOUT_MS: z.coerce.number().default(60000),
  MAX_PTY_SESSIONS: z.coerce.number().default(50),
  
  // Container Pool Settings
  POOL_SIZE_PER_LANGUAGE: z.coerce.number().default(3),
  POOL_ENABLED: z.string().optional().default('true').transform(val => val === 'true'),
  
  // Queue Settings
  WORKER_CONCURRENCY: z.coerce.number().default(4),
  MAX_QUEUE_DEPTH: z.coerce.number().default(500),
  
  // Rate Limiting
  RATE_LIMIT_ANON_PER_HOUR: z.coerce.number().default(60),
  RATE_LIMIT_USER_PER_HOUR: z.coerce.number().default(200),
  
  // Security
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  
  // Logging
  LOG_LEVEL: z.string().default('info')
});

function loadConfig() {
  const result = configSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error("❌ Invalid environment configuration on server startup:");
    console.error(result.error.format());
    process.exit(1);
  }
  
  return Object.freeze(result.data);
}

export const config = loadConfig();
