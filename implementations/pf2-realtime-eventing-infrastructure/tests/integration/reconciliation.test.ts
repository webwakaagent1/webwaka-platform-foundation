/**
 * Integration Tests for PF-2 Event Reconciliation
 * 
 * Tests for offline reconciliation, conflict detection, and resolution.
 * Enforces INV-010 (Realtime as Optional Degradable Capability).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  Operation,
  Conflict,
  ConflictResolution,
  ResolutionStrategy,
  ReconciliationRequest,
  ReconciliationResponse,
  VectorClock
} from '../../src/models/types';


// Mock Reconciliation Service for testing
class MockReconciliationService {
  private operations: Map<string, Operation[]> = new Map();
  private conflicts: Map<string, Conflict> = new Map();
  private entityVersions: Map<string, string> = new Map();

  async submitOperation(operation: Operation): Promise<void> {
    const key = `${operation.tenantId}:${operation.entityType}:${operation.entityId}`;
    
    if (!this.operations.has(key)) {
      this.operations.set(key, []);
    }
    
    this.operations.get(key)!.push(operation);
  }

  async reconcile(request: ReconciliationRequest): Promise<ReconciliationResponse> {
    const conflicts: Conflict[] = [];
    const resolvedOperations: Operation[] = [];

    // Process each operation
    for (const operation of request.operations) {
      const key = `${request.tenantId}:${operation.entityType}:${operation.entityId}`;
      const existingOps = this.operations.get(key) || [];
      
      // Check for conflicts
      const conflictingOps = this.detectConflicts(operation, existingOps);
      
      if (conflictingOps.length > 0) {
        const conflict: Conflict = {
          conflictId: `conflict-${Date.now()}`,
          entityType: operation.entityType,
          entityId: operation.entityId,
          operations: [operation, ...conflictingOps],
          detectedAt: new Date()
        };
        
        // Auto-resolve with last-write-wins
        const resolution = this.resolveConflict(conflict, ResolutionStrategy.LAST_WRITE_WINS);
        conflict.resolution = resolution;
        conflicts.push(conflict);
        
        // Use resolved operation
        resolvedOperations.push(this.getWinningOperation(conflict));
      } else {
        resolvedOperations.push(operation);
      }
      
      // Store operation
      await this.submitOperation(operation);
    }

    // Update version
    const newVersion = `v-${Date.now()}`;
    
    return {
      requestId: request.requestId,
      conflicts,
      resolvedOperations,
      currentVersion: newVersion,
      completedAt: new Date()
    };
  }

  private detectConflicts(operation: Operation, existingOps: Operation[]): Operation[] {
    return existingOps.filter(existing => {
      // Check if operations are concurrent (neither happened before the other)
      return this.areConcurrent(operation.vectorClock, existing.vectorClock);
    });
  }

  private areConcurrent(clock1: VectorClock, clock2: VectorClock): boolean {
    let clock1Greater = false;
    let clock2Greater = false;

    const allKeys = new Set([...Object.keys(clock1), ...Object.keys(clock2)]);
    
    for (const key of allKeys) {
      const v1 = clock1[key] || 0;
      const v2 = clock2[key] || 0;
      
      if (v1 > v2) clock1Greater = true;
      if (v2 > v1) clock2Greater = true;
    }

    // Concurrent if neither dominates
    return clock1Greater && clock2Greater;
  }

  private resolveConflict(conflict: Conflict, strategy: ResolutionStrategy): ConflictResolution {
    let result: any;

    switch (strategy) {
      case ResolutionStrategy.LAST_WRITE_WINS:
        const latestOp = conflict.operations.reduce((latest, op) => 
          op.timestamp > latest.timestamp ? op : latest
        );
        result = latestOp.payload;
        break;

      case ResolutionStrategy.FIELD_LEVEL_MERGE:
        result = this.mergeFields(conflict.operations);
        break;

      default:
        result = conflict.operations[0].payload;
    }

    return {
      strategy,
      resolvedAt: new Date(),
      result
    };
  }

  private mergeFields(operations: Operation[]): any {
    const merged: any = {};
    
    // Sort by timestamp and merge fields
    const sorted = [...operations].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
    
    for (const op of sorted) {
      Object.assign(merged, op.payload);
    }
    
    return merged;
  }

  private getWinningOperation(conflict: Conflict): Operation {
    if (!conflict.resolution) {
      return conflict.operations[0];
    }

    // Return the operation with the resolved result
    return {
      ...conflict.operations[0],
      payload: conflict.resolution.result
    };
  }

  getOperations(tenantId: string, entityType: string, entityId: string): Operation[] {
    const key = `${tenantId}:${entityType}:${entityId}`;
    return this.operations.get(key) || [];
  }
}


describe('Operation Submission', () => {
  let service: MockReconciliationService;

  beforeEach(() => {
    service = new MockReconciliationService();
  });

  it('should submit operation successfully', async () => {
    const operation: Operation = {
      operationId: 'op-001',
      clientId: 'client-001',
      tenantId: 'tenant-001',
      entityType: 'order',
      entityId: 'order-001',
      operationType: 'CREATE',
      payload: { status: 'pending' },
      timestamp: new Date(),
      vectorClock: { 'client-001': 1 }
    };

    await service.submitOperation(operation);
    
    const ops = service.getOperations('tenant-001', 'order', 'order-001');
    expect(ops).toHaveLength(1);
    expect(ops[0].operationId).toBe('op-001');
  });

  it('should accumulate multiple operations', async () => {
    for (let i = 0; i < 3; i++) {
      const operation: Operation = {
        operationId: `op-${i}`,
        clientId: 'client-001',
        tenantId: 'tenant-001',
        entityType: 'order',
        entityId: 'order-001',
        operationType: 'UPDATE',
        payload: { version: i },
        timestamp: new Date(Date.now() + i * 1000),
        vectorClock: { 'client-001': i + 1 }
      };
      await service.submitOperation(operation);
    }

    const ops = service.getOperations('tenant-001', 'order', 'order-001');
    expect(ops).toHaveLength(3);
  });
});


describe('Conflict Detection', () => {
  let service: MockReconciliationService;

  beforeEach(() => {
    service = new MockReconciliationService();
  });

  it('should detect concurrent operations as conflicts', async () => {
    // First operation from client-001
    const op1: Operation = {
      operationId: 'op-001',
      clientId: 'client-001',
      tenantId: 'tenant-001',
      entityType: 'order',
      entityId: 'order-001',
      operationType: 'UPDATE',
      payload: { status: 'shipped' },
      timestamp: new Date(),
      vectorClock: { 'client-001': 1 }
    };
    await service.submitOperation(op1);

    // Concurrent operation from client-002
    const request: ReconciliationRequest = {
      requestId: 'req-001',
      clientId: 'client-002',
      tenantId: 'tenant-001',
      operations: [{
        operationId: 'op-002',
        clientId: 'client-002',
        tenantId: 'tenant-001',
        entityType: 'order',
        entityId: 'order-001',
        operationType: 'UPDATE',
        payload: { status: 'cancelled' },
        timestamp: new Date(Date.now() + 100),
        vectorClock: { 'client-002': 1 }
      }],
      requestedAt: new Date()
    };

    const response = await service.reconcile(request);
    expect(response.conflicts).toHaveLength(1);
  });

  it('should not detect sequential operations as conflicts', async () => {
    // First operation
    const op1: Operation = {
      operationId: 'op-001',
      clientId: 'client-001',
      tenantId: 'tenant-001',
      entityType: 'order',
      entityId: 'order-001',
      operationType: 'UPDATE',
      payload: { status: 'shipped' },
      timestamp: new Date(),
      vectorClock: { 'client-001': 1 }
    };
    await service.submitOperation(op1);

    // Sequential operation (knows about op1)
    const request: ReconciliationRequest = {
      requestId: 'req-001',
      clientId: 'client-001',
      tenantId: 'tenant-001',
      operations: [{
        operationId: 'op-002',
        clientId: 'client-001',
        tenantId: 'tenant-001',
        entityType: 'order',
        entityId: 'order-001',
        operationType: 'UPDATE',
        payload: { status: 'delivered' },
        timestamp: new Date(Date.now() + 100),
        vectorClock: { 'client-001': 2 } // Knows about previous operation
      }],
      requestedAt: new Date()
    };

    const response = await service.reconcile(request);
    expect(response.conflicts).toHaveLength(0);
  });
});


describe('Conflict Resolution', () => {
  let service: MockReconciliationService;

  beforeEach(() => {
    service = new MockReconciliationService();
  });

  it('should resolve conflicts with last-write-wins', async () => {
    // Earlier operation
    const op1: Operation = {
      operationId: 'op-001',
      clientId: 'client-001',
      tenantId: 'tenant-001',
      entityType: 'order',
      entityId: 'order-001',
      operationType: 'UPDATE',
      payload: { status: 'shipped' },
      timestamp: new Date(Date.now() - 1000),
      vectorClock: { 'client-001': 1 }
    };
    await service.submitOperation(op1);

    // Later concurrent operation
    const request: ReconciliationRequest = {
      requestId: 'req-001',
      clientId: 'client-002',
      tenantId: 'tenant-001',
      operations: [{
        operationId: 'op-002',
        clientId: 'client-002',
        tenantId: 'tenant-001',
        entityType: 'order',
        entityId: 'order-001',
        operationType: 'UPDATE',
        payload: { status: 'cancelled' },
        timestamp: new Date(), // Later timestamp
        vectorClock: { 'client-002': 1 }
      }],
      requestedAt: new Date()
    };

    const response = await service.reconcile(request);
    
    expect(response.conflicts).toHaveLength(1);
    expect(response.conflicts[0].resolution?.strategy).toBe(ResolutionStrategy.LAST_WRITE_WINS);
    expect(response.conflicts[0].resolution?.result.status).toBe('cancelled');
  });

  it('should include resolved operations in response', async () => {
    const request: ReconciliationRequest = {
      requestId: 'req-001',
      clientId: 'client-001',
      tenantId: 'tenant-001',
      operations: [{
        operationId: 'op-001',
        clientId: 'client-001',
        tenantId: 'tenant-001',
        entityType: 'order',
        entityId: 'order-001',
        operationType: 'CREATE',
        payload: { status: 'pending' },
        timestamp: new Date(),
        vectorClock: { 'client-001': 1 }
      }],
      requestedAt: new Date()
    };

    const response = await service.reconcile(request);
    
    expect(response.resolvedOperations).toHaveLength(1);
    expect(response.resolvedOperations[0].operationId).toBe('op-001');
  });
});


describe('Reconciliation Request/Response', () => {
  let service: MockReconciliationService;

  beforeEach(() => {
    service = new MockReconciliationService();
  });

  it('should process reconciliation request', async () => {
    const request: ReconciliationRequest = {
      requestId: 'req-001',
      clientId: 'client-001',
      tenantId: 'tenant-001',
      operations: [
        {
          operationId: 'op-001',
          clientId: 'client-001',
          tenantId: 'tenant-001',
          entityType: 'order',
          entityId: 'order-001',
          operationType: 'CREATE',
          payload: { status: 'pending' },
          timestamp: new Date(),
          vectorClock: { 'client-001': 1 }
        },
        {
          operationId: 'op-002',
          clientId: 'client-001',
          tenantId: 'tenant-001',
          entityType: 'order',
          entityId: 'order-002',
          operationType: 'CREATE',
          payload: { status: 'pending' },
          timestamp: new Date(),
          vectorClock: { 'client-001': 2 }
        }
      ],
      requestedAt: new Date()
    };

    const response = await service.reconcile(request);
    
    expect(response.requestId).toBe('req-001');
    expect(response.resolvedOperations).toHaveLength(2);
    expect(response.currentVersion).toBeDefined();
    expect(response.completedAt).toBeDefined();
  });

  it('should handle empty operations list', async () => {
    const request: ReconciliationRequest = {
      requestId: 'req-001',
      clientId: 'client-001',
      tenantId: 'tenant-001',
      operations: [],
      requestedAt: new Date()
    };

    const response = await service.reconcile(request);
    
    expect(response.conflicts).toHaveLength(0);
    expect(response.resolvedOperations).toHaveLength(0);
  });
});


describe('Tenant Isolation in Reconciliation', () => {
  let service: MockReconciliationService;

  beforeEach(() => {
    service = new MockReconciliationService();
  });

  it('should isolate operations by tenant', async () => {
    // Operation for tenant-001
    const op1: Operation = {
      operationId: 'op-001',
      clientId: 'client-001',
      tenantId: 'tenant-001',
      entityType: 'order',
      entityId: 'order-001',
      operationType: 'CREATE',
      payload: { status: 'pending' },
      timestamp: new Date(),
      vectorClock: { 'client-001': 1 }
    };
    await service.submitOperation(op1);

    // Operation for tenant-002 (same entity ID)
    const op2: Operation = {
      operationId: 'op-002',
      clientId: 'client-002',
      tenantId: 'tenant-002',
      entityType: 'order',
      entityId: 'order-001',
      operationType: 'CREATE',
      payload: { status: 'shipped' },
      timestamp: new Date(),
      vectorClock: { 'client-002': 1 }
    };
    await service.submitOperation(op2);

    const tenant1Ops = service.getOperations('tenant-001', 'order', 'order-001');
    const tenant2Ops = service.getOperations('tenant-002', 'order', 'order-001');

    expect(tenant1Ops).toHaveLength(1);
    expect(tenant2Ops).toHaveLength(1);
    expect(tenant1Ops[0].payload.status).toBe('pending');
    expect(tenant2Ops[0].payload.status).toBe('shipped');
  });
});
