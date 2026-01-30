import Redis from 'ioredis';
import { logger } from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL;
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false' && (REDIS_URL || process.env.REDIS_HOST);

const redisConfig = REDIS_URL
  ? REDIS_URL
  : {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryStrategy: (times: number) => {
        if (!REDIS_ENABLED) return null;
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    };

export const redis = REDIS_ENABLED ? new Redis(redisConfig as any) : null;

if (redis) {
  redis.on('connect', () => {
    logger.info('Redis connection established');
  });

  redis.on('error', (err) => {
    logger.error('Redis connection error', { error: err.message });
  });

  redis.on('ready', () => {
    logger.info('Redis client ready');
  });
}

export function isRedisEnabled(): boolean {
  return Boolean(REDIS_ENABLED) && redis !== null;
}

export async function testRedisConnection(): Promise<boolean> {
  if (!redis) {
    logger.warn('Redis is not configured - running without Redis');
    return false;
  }
  try {
    await redis.ping();
    logger.info('Redis connection test successful');
    return true;
  } catch (error) {
    logger.error('Redis connection test failed', { error });
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    logger.info('Redis connection closed');
  }
}
