import { pool } from '../config/database';
import { logger } from '../utils/logger';
import {
  AuditLog,
  CreateAuditLogInput,
  AuditLogFilter,
  AuditLogExportOptions,
} from '../models/AuditLog';

export class AuditLogService {
  public async createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO audit_logs (actor, action, resource, changes, result, error, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          JSON.stringify(input.actor),
          input.action,
          JSON.stringify(input.resource),
          input.changes ? JSON.stringify(input.changes) : null,
          input.result,
          input.error || null,
          JSON.stringify(input.metadata || {}),
        ]
      );

      const auditLog = this.mapRowToAuditLog(result.rows[0]);

      logger.info('Audit log created', {
        auditLogId: auditLog.id,
        action: auditLog.action,
        actorId: auditLog.actor.id,
      });

      return auditLog;
    } finally {
      client.release();
    }
  }

  public async getAuditLog(id: string): Promise<AuditLog | null> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM audit_logs WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToAuditLog(result.rows[0]);
    } finally {
      client.release();
    }
  }

  public async listAuditLogs(
    filter: AuditLogFilter,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLog[]> {
    const client = await pool.connect();
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (filter.actorId) {
        conditions.push(`actor->>'id' = $${paramCount++}`);
        values.push(filter.actorId);
      }

      if (filter.actorType) {
        conditions.push(`actor->>'type' = $${paramCount++}`);
        values.push(filter.actorType);
      }

      if (filter.action) {
        conditions.push(`action = $${paramCount++}`);
        values.push(filter.action);
      }

      if (filter.resourceType) {
        conditions.push(`resource->>'type' = $${paramCount++}`);
        values.push(filter.resourceType);
      }

      if (filter.resourceId) {
        conditions.push(`resource->>'id' = $${paramCount++}`);
        values.push(filter.resourceId);
      }

      if (filter.result) {
        conditions.push(`result = $${paramCount++}`);
        values.push(filter.result);
      }

      if (filter.startDate) {
        conditions.push(`timestamp >= $${paramCount++}`);
        values.push(filter.startDate);
      }

      if (filter.endDate) {
        conditions.push(`timestamp <= $${paramCount++}`);
        values.push(filter.endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const query = `
        SELECT * FROM audit_logs
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT $${paramCount++} OFFSET $${paramCount}
      `;

      values.push(limit, offset);

      const result = await client.query(query, values);
      return result.rows.map(this.mapRowToAuditLog);
    } finally {
      client.release();
    }
  }

  public async exportAuditLogs(options: AuditLogExportOptions): Promise<string> {
    const logs = await this.listAuditLogs(options.filter, 10000, 0);

    if (options.format === 'json') {
      return JSON.stringify(logs, null, 2);
    } else if (options.format === 'csv') {
      return this.convertToCSV(logs, options.includeMetadata);
    }

    throw new Error(`Unsupported export format: ${options.format}`);
  }

  private convertToCSV(logs: AuditLog[], includeMetadata: boolean): string {
    const headers = [
      'ID',
      'Timestamp',
      'Actor ID',
      'Actor Type',
      'Actor Email',
      'Action',
      'Resource Type',
      'Resource ID',
      'Result',
      'Error',
    ];

    if (includeMetadata) {
      headers.push('Metadata');
    }

    const rows = logs.map((log) => {
      const row = [
        log.id,
        log.timestamp.toISOString(),
        log.actor.id,
        log.actor.type,
        log.actor.email,
        log.action,
        log.resource.type,
        log.resource.id,
        log.result,
        log.error || '',
      ];

      if (includeMetadata) {
        row.push(JSON.stringify(log.metadata));
      }

      return row.map((cell) => `"${cell}"`).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  private mapRowToAuditLog(row: any): AuditLog {
    return {
      id: row.id,
      timestamp: row.timestamp,
      actor: row.actor,
      action: row.action,
      resource: row.resource,
      changes: row.changes,
      result: row.result,
      error: row.error,
      metadata: row.metadata,
    };
  }
}

export const auditLogService = new AuditLogService();
