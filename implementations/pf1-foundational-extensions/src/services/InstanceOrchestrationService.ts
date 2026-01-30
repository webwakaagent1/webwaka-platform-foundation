import { pool } from '../config/database';
import { logger } from '../utils/logger';
import {
  Instance,
  CreateInstanceInput,
  UpdateInstanceInput,
  InstanceFilter,
  InstanceStatus,
} from '../models/Instance';
import { auditLogService } from './AuditLogService';
import { Actor } from '../models/AuditLog';

export class InstanceOrchestrationService {
  public async createInstance(input: CreateInstanceInput, actor: Actor): Promise<Instance> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Set default values
      const configuration = {
        region: input.configuration.region || 'ng-lagos',
        dataResidency: input.configuration.dataResidency || ['NG'],
        enabledSuites: input.configuration.enabledSuites || [],
        enabledCapabilities: input.configuration.enabledCapabilities || [],
        customDomain: input.configuration.customDomain,
        sslEnabled: input.configuration.sslEnabled !== false,
        ...input.configuration,
      };

      const resources = {
        cpu: input.resources?.cpu || process.env.INSTANCE_DEFAULT_CPU || '1.0',
        memory: input.resources?.memory || process.env.INSTANCE_DEFAULT_MEMORY || '2048M',
        storage: input.resources?.storage || process.env.INSTANCE_DEFAULT_STORAGE || '20G',
        database: 'postgresql',
        ...input.resources,
      };

      const metadata = {
        createdAt: new Date(),
        createdBy: actor.id,
        ...input.metadata,
      };

      const health = {
        lastHealthCheck: new Date(),
        status: 'healthy' as const,
        uptime: 0,
        metrics: {},
      };

      // Insert instance
      const result = await client.query(
        `INSERT INTO instances (name, type, status, version, update_channel, configuration, resources, metadata, health)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          input.name,
          input.type,
          'provisioning',
          '1.0.0', // Default version
          input.updateChannel || 'manual-approval',
          JSON.stringify(configuration),
          JSON.stringify(resources),
          JSON.stringify(metadata),
          JSON.stringify(health),
        ]
      );

      const instance = this.mapRowToInstance(result.rows[0]);

      // Create audit log
      await auditLogService.createAuditLog({
        actor,
        action: 'instance.create',
        resource: {
          type: 'instance',
          id: instance.id,
          name: instance.name,
        },
        result: 'success',
        metadata: {
          instanceType: instance.type,
          version: instance.version,
        },
      });

      await client.query('COMMIT');

      logger.info('Instance created', {
        instanceId: instance.id,
        instanceName: instance.name,
        instanceType: instance.type,
      });

      // Trigger provisioning workflow (async)
      this.triggerProvisioningWorkflow(instance.id).catch((error) => {
        logger.error('Provisioning workflow failed', {
          instanceId: instance.id,
          error: error.message,
        });
      });

      return instance;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async getInstance(id: string): Promise<Instance | null> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM instances WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToInstance(result.rows[0]);
    } finally {
      client.release();
    }
  }

  public async listInstances(
    filter: InstanceFilter,
    limit: number = 100,
    offset: number = 0
  ): Promise<Instance[]> {
    const client = await pool.connect();
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (filter.type) {
        conditions.push(`type = $${paramCount++}`);
        values.push(filter.type);
      }

      if (filter.status) {
        conditions.push(`status = $${paramCount++}`);
        values.push(filter.status);
      }

      if (filter.partnerId) {
        conditions.push(`metadata->>'partnerId' = $${paramCount++}`);
        values.push(filter.partnerId);
      }

      if (filter.tenantId) {
        conditions.push(`metadata->>'tenantId' = $${paramCount++}`);
        values.push(filter.tenantId);
      }

      if (filter.version) {
        conditions.push(`version = $${paramCount++}`);
        values.push(filter.version);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const query = `
        SELECT * FROM instances
        ${whereClause}
        ORDER BY metadata->>'createdAt' DESC
        LIMIT $${paramCount++} OFFSET $${paramCount}
      `;

      values.push(limit, offset);

      const result = await client.query(query, values);
      return result.rows.map(this.mapRowToInstance);
    } finally {
      client.release();
    }
  }

  public async updateInstance(
    id: string,
    input: UpdateInstanceInput,
    actor: Actor
  ): Promise<Instance> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current instance
      const currentResult = await client.query('SELECT * FROM instances WHERE id = $1', [id]);

      if (currentResult.rows.length === 0) {
        throw new Error(`Instance not found: ${id}`);
      }

      const currentInstance = this.mapRowToInstance(currentResult.rows[0]);

      // Build update query
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (input.name) {
        setClauses.push(`name = $${paramCount++}`);
        values.push(input.name);
      }

      if (input.updateChannel) {
        setClauses.push(`update_channel = $${paramCount++}`);
        values.push(input.updateChannel);
      }

      if (input.configuration) {
        const updatedConfiguration = {
          ...currentInstance.configuration,
          ...input.configuration,
        };
        setClauses.push(`configuration = $${paramCount++}`);
        values.push(JSON.stringify(updatedConfiguration));
      }

      if (input.resources) {
        const updatedResources = {
          ...currentInstance.resources,
          ...input.resources,
        };
        setClauses.push(`resources = $${paramCount++}`);
        values.push(JSON.stringify(updatedResources));
      }

      if (setClauses.length === 0) {
        await client.query('COMMIT');
        return currentInstance;
      }

      values.push(id);

      const result = await client.query(
        `UPDATE instances SET ${setClauses.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      const updatedInstance = this.mapRowToInstance(result.rows[0]);

      // Create audit log
      await auditLogService.createAuditLog({
        actor,
        action: 'instance.update',
        resource: {
          type: 'instance',
          id: updatedInstance.id,
          name: updatedInstance.name,
        },
        changes: {
          before: currentInstance,
          after: updatedInstance,
        },
        result: 'success',
      });

      await client.query('COMMIT');

      logger.info('Instance updated', { instanceId: id });

      return updatedInstance;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateInstanceStatus(
    id: string,
    status: InstanceStatus,
    actor: Actor
  ): Promise<Instance> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'UPDATE instances SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );

      if (result.rows.length === 0) {
        throw new Error(`Instance not found: ${id}`);
      }

      const instance = this.mapRowToInstance(result.rows[0]);

      // Create audit log
      await auditLogService.createAuditLog({
        actor,
        action: `instance.${status}`,
        resource: {
          type: 'instance',
          id: instance.id,
          name: instance.name,
        },
        result: 'success',
      });

      await client.query('COMMIT');

      logger.info('Instance status updated', { instanceId: id, status });

      return instance;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async deleteInstance(id: string, actor: Actor): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query('SELECT * FROM instances WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        throw new Error(`Instance not found: ${id}`);
      }

      const instance = this.mapRowToInstance(result.rows[0]);

      // Update status to terminated instead of deleting
      await client.query('UPDATE instances SET status = $1 WHERE id = $2', ['terminated', id]);

      // Create audit log
      await auditLogService.createAuditLog({
        actor,
        action: 'instance.delete',
        resource: {
          type: 'instance',
          id: instance.id,
          name: instance.name,
        },
        result: 'success',
      });

      await client.query('COMMIT');

      logger.info('Instance deleted', { instanceId: id });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async triggerProvisioningWorkflow(instanceId: string): Promise<void> {
    // This would trigger the actual provisioning workflow
    // For now, we'll simulate it by updating the status after a delay
    logger.info('Starting provisioning workflow', { instanceId });

    // Simulate provisioning steps
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Update instance status to active
    const client = await pool.connect();
    try {
      await client.query('UPDATE instances SET status = $1 WHERE id = $2', ['active', instanceId]);
      logger.info('Instance provisioning completed', { instanceId });
    } finally {
      client.release();
    }
  }

  private mapRowToInstance(row: any): Instance {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status,
      version: row.version,
      updateChannel: row.update_channel,
      configuration: row.configuration,
      resources: row.resources,
      metadata: row.metadata,
      health: row.health,
    };
  }
}

export const instanceOrchestrationService = new InstanceOrchestrationService();
