export type ActorType = 'super-admin' | 'system' | 'partner-admin' | 'tenant-admin';
export type AuditResult = 'success' | 'failure';

export interface Actor {
  id: string;
  type: ActorType;
  email: string;
  ipAddress: string;
  userAgent: string;
}

export interface Resource {
  type: string;
  id: string;
  name?: string;
}

export interface Changes {
  before: Record<string, any>;
  after: Record<string, any>;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  actor: Actor;
  action: string;
  resource: Resource;
  changes?: Changes;
  result: AuditResult;
  error?: string;
  metadata: Record<string, any>;
}

export interface CreateAuditLogInput {
  actor: Actor;
  action: string;
  resource: Resource;
  changes?: Changes;
  result: AuditResult;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogFilter {
  actorId?: string;
  actorType?: ActorType;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  result?: AuditResult;
  startDate?: Date;
  endDate?: Date;
}

export interface AuditLogExportOptions {
  filter: AuditLogFilter;
  format: 'json' | 'csv';
  includeMetadata: boolean;
}
