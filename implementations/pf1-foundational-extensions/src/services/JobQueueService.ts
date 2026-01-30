// @ts-ignore - bullmq doesn't have type definitions
import { Queue, Worker, Job as BullJob, QueueEvents } from 'bullmq';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { Job, CreateJobInput, JobFilter, JobStats } from '../models/Job';
import { pool } from '../config/database';

export class JobQueueService {
  private queue: Queue;
  private worker: Worker;
  private queueEvents: QueueEvents;
  private jobHandlers: Map<string, (job: BullJob) => Promise<any>>;

  constructor() {
    this.jobHandlers = new Map();
    
    // Initialize queue
    this.queue = new Queue('webwaka-jobs', {
      connection: redis,
      defaultJobOptions: {
        attempts: parseInt(process.env.JOB_QUEUE_MAX_ATTEMPTS || '3'),
        backoff: {
          type: 'exponential',
          delay: parseInt(process.env.JOB_QUEUE_BACKOFF_DELAY || '2000'),
        },
        removeOnComplete: false,
        removeOnFail: false,
      },
    });

    // Initialize worker
    this.worker = new Worker(
      'webwaka-jobs',
      async (job: BullJob) => {
        return await this.processJob(job);
      },
      {
        connection: redis,
        concurrency: parseInt(process.env.JOB_QUEUE_CONCURRENCY || '10'),
      }
    );

    // Initialize queue events
    this.queueEvents = new QueueEvents('webwaka-jobs', {
      connection: redis,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job: any) => {
      logger.info('Job completed', {
        jobId: job.id,
        jobType: job.name,
        duration: Date.now() - job.timestamp,
      });
    });

    this.worker.on('failed', (job: any, err: Error) => {
      logger.error('Job failed', {
        jobId: job?.id,
        jobType: job?.name,
        error: err.message,
        attempts: job?.attemptsMade,
      });
    });

    this.worker.on('error', (err: Error) => {
      logger.error('Worker error', { error: err.message });
    });
  }

  public registerHandler(jobType: string, handler: (job: BullJob) => Promise<any>): void {
    this.jobHandlers.set(jobType, handler);
    logger.info('Job handler registered', { jobType });
  }

  private async processJob(job: BullJob): Promise<any> {
    const handler = this.jobHandlers.get(job.name);
    
    if (!handler) {
      throw new Error(`No handler registered for job type: ${job.name}`);
    }

    // Update job status in database
    await this.updateJobStatus(job.id!, 'active', { startedAt: new Date() });

    try {
      const result = await handler(job);
      
      // Update job status in database
      await this.updateJobStatus(job.id!, 'completed', {
        completedAt: new Date(),
        result,
      });

      return result;
    } catch (error: any) {
      // Update job status in database
      await this.updateJobStatus(job.id!, 'failed', {
        failedAt: new Date(),
        error: error.message,
      });

      throw error;
    }
  }

  public async createJob(input: CreateJobInput): Promise<Job> {
    // Save job to database
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO jobs (type, priority, payload, status, max_attempts, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          input.type,
          input.priority || 5,
          JSON.stringify(input.payload),
          'pending',
          input.maxAttempts || 3,
          JSON.stringify(input.metadata),
        ]
      );

      const job = this.mapRowToJob(result.rows[0]);

      // Add job to queue
      await this.queue.add(input.type, input.payload, {
        jobId: job.id,
        priority: input.priority || 5,
        attempts: input.maxAttempts || 3,
      });

      logger.info('Job created', { jobId: job.id, jobType: job.type });

      return job;
    } finally {
      client.release();
    }
  }

  public async getJob(jobId: string): Promise<Job | null> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToJob(result.rows[0]);
    } finally {
      client.release();
    }
  }

  public async listJobs(filter: JobFilter, limit: number = 100, offset: number = 0): Promise<Job[]> {
    const client = await pool.connect();
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (filter.status) {
        conditions.push(`status = $${paramCount++}`);
        values.push(filter.status);
      }

      if (filter.type) {
        conditions.push(`type = $${paramCount++}`);
        values.push(filter.type);
      }

      if (filter.instanceId) {
        conditions.push(`metadata->>'instanceId' = $${paramCount++}`);
        values.push(filter.instanceId);
      }

      if (filter.tenantId) {
        conditions.push(`metadata->>'tenantId' = $${paramCount++}`);
        values.push(filter.tenantId);
      }

      if (filter.createdAfter) {
        conditions.push(`created_at >= $${paramCount++}`);
        values.push(filter.createdAfter);
      }

      if (filter.createdBefore) {
        conditions.push(`created_at <= $${paramCount++}`);
        values.push(filter.createdBefore);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      const query = `
        SELECT * FROM jobs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount++} OFFSET $${paramCount}
      `;

      values.push(limit, offset);

      const result = await client.query(query, values);
      return result.rows.map(this.mapRowToJob);
    } finally {
      client.release();
    }
  }

  public async getJobStats(): Promise<JobStats> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          COUNT(*) FILTER (WHERE status = 'delayed') as delayed
        FROM jobs
      `);

      return {
        total: parseInt(result.rows[0].total),
        pending: parseInt(result.rows[0].pending),
        active: parseInt(result.rows[0].active),
        completed: parseInt(result.rows[0].completed),
        failed: parseInt(result.rows[0].failed),
        delayed: parseInt(result.rows[0].delayed),
      };
    } finally {
      client.release();
    }
  }

  private async updateJobStatus(jobId: string, status: string, updates: any): Promise<void> {
    const client = await pool.connect();
    try {
      const setClauses: string[] = ['status = $1'];
      const values: any[] = [status];
      let paramCount = 2;

      if (updates.startedAt) {
        setClauses.push(`started_at = $${paramCount++}`);
        values.push(updates.startedAt);
      }

      if (updates.completedAt) {
        setClauses.push(`completed_at = $${paramCount++}`);
        values.push(updates.completedAt);
      }

      if (updates.failedAt) {
        setClauses.push(`failed_at = $${paramCount++}`);
        values.push(updates.failedAt);
      }

      if (updates.error) {
        setClauses.push(`error = $${paramCount++}`);
        values.push(updates.error);
      }

      if (updates.result) {
        setClauses.push(`result = $${paramCount++}`);
        values.push(JSON.stringify(updates.result));
      }

      values.push(jobId);

      await client.query(
        `UPDATE jobs SET ${setClauses.join(', ')} WHERE id = $${paramCount}`,
        values
      );
    } finally {
      client.release();
    }
  }

  private mapRowToJob(row: any): Job {
    return {
      id: row.id,
      type: row.type,
      priority: row.priority,
      payload: row.payload,
      status: row.status,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      failedAt: row.failed_at,
      error: row.error,
      result: row.result,
      metadata: row.metadata,
    };
  }

  public async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    await this.queueEvents.close();
    logger.info('Job queue service closed');
  }
}

export const jobQueueService = new JobQueueService();
