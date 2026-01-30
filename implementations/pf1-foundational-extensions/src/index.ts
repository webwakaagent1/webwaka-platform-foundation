import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger';
import { testConnection, closePool } from './config/database';
import { testRedisConnection, closeRedis, isRedisEnabled } from './config/redis';
import { instanceOrchestrationService } from './services/InstanceOrchestrationService';
import { auditLogService } from './services/AuditLogService';
import { InstanceType, InstanceStatus } from './models/Instance';

const app = express();
const PORT = parseInt(process.env.PORT || '5000');
const HOST = process.env.HOST || '0.0.0.0';

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.get('/health', async (_req: Request, res: Response) => {
  const dbHealthy = await testConnection();
  const redisHealthy = isRedisEnabled() ? await testRedisConnection() : true;

  const status = dbHealthy ? 'healthy' : 'unhealthy';
  const statusCode = dbHealthy ? 200 : 503;

  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealthy ? 'connected' : 'disconnected',
      redis: isRedisEnabled() ? (redisHealthy ? 'connected' : 'disconnected') : 'disabled',
    },
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'WebWaka PF-1 Foundational Extensions',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      instances: '/api/v1/instances',
      auditLogs: '/api/v1/audit-logs',
    },
  });
});

app.get('/api/v1/instances', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const filter = {
      type: req.query.type as InstanceType | undefined,
      status: req.query.status as InstanceStatus | undefined,
    };

    const instances = await instanceOrchestrationService.listInstances(filter, limit, offset);
    res.json({ data: instances, limit, offset });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/instances/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const instance = await instanceOrchestrationService.getInstance(req.params.id);
    if (!instance) {
      res.status(404).json({ error: 'Instance not found' });
      return;
    }
    res.json({ data: instance });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const filter = {
      action: req.query.action as string | undefined,
      actorId: req.query.actorId as string | undefined,
      resourceType: req.query.resourceType as string | undefined,
      resourceId: req.query.resourceId as string | undefined,
    };

    const logs = await auditLogService.listAuditLogs(filter, limit, offset);
    res.json({ data: logs, limit, offset });
  } catch (error) {
    next(error);
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

async function startServer() {
  try {
    logger.info('Starting WebWaka PF-1 Foundational Extensions...');

    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    if (isRedisEnabled()) {
      await testRedisConnection();
    } else {
      logger.warn('Redis is not configured - some features may be limited');
    }

    app.listen(PORT, HOST, () => {
      logger.info(`Server running at http://${HOST}:${PORT}`);
      logger.info('Available endpoints:');
      logger.info('  GET /         - API info');
      logger.info('  GET /health   - Health check');
      logger.info('  GET /api/v1/instances     - List instances');
      logger.info('  GET /api/v1/instances/:id - Get instance');
      logger.info('  GET /api/v1/audit-logs    - List audit logs');
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  await closePool();
  await closeRedis();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer();
