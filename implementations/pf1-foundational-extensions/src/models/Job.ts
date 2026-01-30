export type JobStatus = 'pending' | 'active' | 'completed' | 'failed' | 'delayed';

export interface JobMetadata {
  createdBy: string;
  instanceId: string;
  tenantId?: string;
  [key: string]: any;
}

export interface Job {
  id: string;
  type: string;
  priority: number;
  payload: Record<string, any>;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  result?: any;
  metadata: JobMetadata;
}

export interface CreateJobInput {
  type: string;
  priority?: number;
  payload: Record<string, any>;
  maxAttempts?: number;
  metadata: JobMetadata;
}

export interface JobFilter {
  status?: JobStatus;
  type?: string;
  instanceId?: string;
  tenantId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface JobStats {
  total: number;
  pending: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}
