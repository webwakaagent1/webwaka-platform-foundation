/**
 * Unit Tests for PF-2 Realtime & Eventing Types
 * 
 * Tests for type definitions, enums, and model structures.
 * Enforces INV-010 (Realtime as Optional Degradable Capability).
 */

import { describe, it, expect } from 'vitest';
import {
  InteractionClass,
  ConnectionState,
  FallbackMode,
  ResolutionStrategy,
  HealthStatus,
  ConnectionMetadata,
  WebSocketMessage,
  PresenceInfo,
  RoomMembership,
  Event,
  EventMetadata,
  EventSubscription,
  DLQEntry,
  Operation,
  Conflict,
  ConflictResolution,
  ReconciliationRequest,
  ReconciliationResponse,
  FallbackConfig,
  RetryPolicy,
  ServiceHealth,
  SystemMetrics,
  RealtimeError,
  AuthenticationError,
  AuthorizationError,
  TenantIsolationViolation,
  RateLimitExceeded
} from '../../src/models/types';


describe('InteractionClass Enum (INV-010)', () => {
  it('should define CLASS_A for Live Presence', () => {
    expect(InteractionClass.CLASS_A).toBe('CLASS_A');
  });

  it('should define CLASS_B for Event Streaming', () => {
    expect(InteractionClass.CLASS_B).toBe('CLASS_B');
  });

  it('should define CLASS_C for Low-Latency Interactions', () => {
    expect(InteractionClass.CLASS_C).toBe('CLASS_C');
  });

  it('should define CLASS_D for Critical Transactions (no realtime)', () => {
    expect(InteractionClass.CLASS_D).toBe('CLASS_D');
  });

  it('should have exactly 4 interaction classes', () => {
    const classes = Object.values(InteractionClass);
    expect(classes).toHaveLength(4);
  });
});


describe('ConnectionState Enum', () => {
  it('should define all connection states', () => {
    expect(ConnectionState.CONNECTING).toBe('CONNECTING');
    expect(ConnectionState.CONNECTED).toBe('CONNECTED');
    expect(ConnectionState.DISCONNECTING).toBe('DISCONNECTING');
    expect(ConnectionState.DISCONNECTED).toBe('DISCONNECTED');
    expect(ConnectionState.RECONNECTING).toBe('RECONNECTING');
  });

  it('should have exactly 5 connection states', () => {
    const states = Object.values(ConnectionState);
    expect(states).toHaveLength(5);
  });
});


describe('FallbackMode Enum (INV-010)', () => {
  it('should define NONE for no fallback', () => {
    expect(FallbackMode.NONE).toBe('NONE');
  });

  it('should define EVENT_QUEUE for queued events fallback', () => {
    expect(FallbackMode.EVENT_QUEUE).toBe('EVENT_QUEUE');
  });

  it('should define POLLING for polling fallback', () => {
    expect(FallbackMode.POLLING).toBe('POLLING');
  });

  it('should define DELAYED_RECONCILIATION for delayed sync', () => {
    expect(FallbackMode.DELAYED_RECONCILIATION).toBe('DELAYED_RECONCILIATION');
  });

  it('should define SNAPSHOT_REFRESH for snapshot-based fallback', () => {
    expect(FallbackMode.SNAPSHOT_REFRESH).toBe('SNAPSHOT_REFRESH');
  });

  it('should define ASYNC_CONFIRMATION for async confirmation fallback', () => {
    expect(FallbackMode.ASYNC_CONFIRMATION).toBe('ASYNC_CONFIRMATION');
  });
});


describe('ResolutionStrategy Enum', () => {
  it('should define conflict resolution strategies', () => {
    expect(ResolutionStrategy.LAST_WRITE_WINS).toBe('LAST_WRITE_WINS');
    expect(ResolutionStrategy.CUSTOM_MERGE).toBe('CUSTOM_MERGE');
    expect(ResolutionStrategy.MANUAL).toBe('MANUAL');
    expect(ResolutionStrategy.FIELD_LEVEL_MERGE).toBe('FIELD_LEVEL_MERGE');
  });
});


describe('HealthStatus Enum', () => {
  it('should define health status values', () => {
    expect(HealthStatus.HEALTHY).toBe('HEALTHY');
    expect(HealthStatus.DEGRADED).toBe('DEGRADED');
    expect(HealthStatus.UNHEALTHY).toBe('UNHEALTHY');
  });
});


describe('ConnectionMetadata Interface', () => {
  it('should create valid connection metadata', () => {
    const metadata: ConnectionMetadata = {
      connectionId: 'conn-001',
      tenantId: 'tenant-001',
      userId: 'user-001',
      clientId: 'client-001',
      serverInstanceId: 'server-001',
      connectedAt: new Date(),
      lastSeenAt: new Date(),
      clientIp: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      state: ConnectionState.CONNECTED
    };

    expect(metadata.connectionId).toBe('conn-001');
    expect(metadata.tenantId).toBe('tenant-001');
    expect(metadata.state).toBe(ConnectionState.CONNECTED);
  });
});


describe('WebSocketMessage Interface', () => {
  it('should create valid WebSocket message', () => {
    const message: WebSocketMessage = {
      messageId: 'msg-001',
      type: 'chat',
      interactionClass: InteractionClass.CLASS_B,
      tenantId: 'tenant-001',
      senderId: 'user-001',
      recipientId: 'user-002',
      payload: { text: 'Hello' },
      timestamp: new Date()
    };

    expect(message.messageId).toBe('msg-001');
    expect(message.interactionClass).toBe(InteractionClass.CLASS_B);
  });

  it('should support room-based messages', () => {
    const message: WebSocketMessage = {
      messageId: 'msg-002',
      type: 'broadcast',
      interactionClass: InteractionClass.CLASS_B,
      tenantId: 'tenant-001',
      senderId: 'user-001',
      roomId: 'room-001',
      payload: { announcement: 'Meeting in 5 minutes' },
      timestamp: new Date()
    };

    expect(message.roomId).toBe('room-001');
    expect(message.recipientId).toBeUndefined();
  });
});


describe('PresenceInfo Interface', () => {
  it('should create valid presence info', () => {
    const presence: PresenceInfo = {
      userId: 'user-001',
      tenantId: 'tenant-001',
      status: 'online',
      lastActive: new Date()
    };

    expect(presence.status).toBe('online');
  });

  it('should support all status values', () => {
    const statuses: Array<'online' | 'away' | 'offline'> = ['online', 'away', 'offline'];
    
    statuses.forEach(status => {
      const presence: PresenceInfo = {
        userId: 'user-001',
        tenantId: 'tenant-001',
        status,
        lastActive: new Date()
      };
      expect(presence.status).toBe(status);
    });
  });
});


describe('Event Interface', () => {
  it('should create valid event', () => {
    const event: Event = {
      eventId: 'event-001',
      eventType: 'order.created',
      tenantId: 'tenant-001',
      timestamp: new Date(),
      payload: { orderId: 'order-001' },
      metadata: {
        source: 'commerce-service',
        correlationId: 'corr-001'
      },
      schemaVersion: '1.0.0'
    };

    expect(event.eventId).toBe('event-001');
    expect(event.eventType).toBe('order.created');
    expect(event.metadata.source).toBe('commerce-service');
  });
});


describe('DLQEntry Interface', () => {
  it('should create valid DLQ entry', () => {
    const dlqEntry: DLQEntry = {
      dlqId: 'dlq-001',
      originalEvent: {
        eventId: 'event-001',
        eventType: 'order.created',
        tenantId: 'tenant-001',
        timestamp: new Date(),
        payload: {},
        metadata: { source: 'test' },
        schemaVersion: '1.0.0'
      },
      failureReason: 'Processing timeout',
      retryCount: 3,
      firstFailedAt: new Date(),
      lastFailedAt: new Date(),
      consumerInfo: {
        consumerId: 'consumer-001',
        consumerGroup: 'order-processors'
      }
    };

    expect(dlqEntry.dlqId).toBe('dlq-001');
    expect(dlqEntry.retryCount).toBe(3);
  });
});


describe('Operation Interface', () => {
  it('should create valid operation', () => {
    const operation: Operation = {
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

    expect(operation.operationType).toBe('UPDATE');
    expect(operation.vectorClock['client-001']).toBe(1);
  });

  it('should support all operation types', () => {
    const types: Array<'CREATE' | 'UPDATE' | 'DELETE'> = ['CREATE', 'UPDATE', 'DELETE'];
    
    types.forEach(type => {
      const operation: Operation = {
        operationId: 'op-001',
        clientId: 'client-001',
        tenantId: 'tenant-001',
        entityType: 'order',
        entityId: 'order-001',
        operationType: type,
        payload: {},
        timestamp: new Date(),
        vectorClock: {}
      };
      expect(operation.operationType).toBe(type);
    });
  });
});


describe('Conflict Interface', () => {
  it('should create valid conflict', () => {
    const conflict: Conflict = {
      conflictId: 'conflict-001',
      entityType: 'order',
      entityId: 'order-001',
      operations: [],
      detectedAt: new Date()
    };

    expect(conflict.conflictId).toBe('conflict-001');
    expect(conflict.resolution).toBeUndefined();
  });

  it('should support conflict resolution', () => {
    const resolution: ConflictResolution = {
      strategy: ResolutionStrategy.LAST_WRITE_WINS,
      resolvedAt: new Date(),
      result: { status: 'shipped' }
    };

    const conflict: Conflict = {
      conflictId: 'conflict-001',
      entityType: 'order',
      entityId: 'order-001',
      operations: [],
      detectedAt: new Date(),
      resolution
    };

    expect(conflict.resolution?.strategy).toBe(ResolutionStrategy.LAST_WRITE_WINS);
  });
});


describe('FallbackConfig Interface (INV-010)', () => {
  it('should create valid fallback config for CLASS_A', () => {
    const config: FallbackConfig = {
      interactionClass: InteractionClass.CLASS_A,
      mode: FallbackMode.NONE
    };

    expect(config.interactionClass).toBe(InteractionClass.CLASS_A);
    expect(config.mode).toBe(FallbackMode.NONE);
  });

  it('should create valid fallback config for CLASS_B with event queue', () => {
    const config: FallbackConfig = {
      interactionClass: InteractionClass.CLASS_B,
      mode: FallbackMode.EVENT_QUEUE,
      queueSize: 1000
    };

    expect(config.interactionClass).toBe(InteractionClass.CLASS_B);
    expect(config.mode).toBe(FallbackMode.EVENT_QUEUE);
    expect(config.queueSize).toBe(1000);
  });

  it('should create valid fallback config for CLASS_C with polling', () => {
    const config: FallbackConfig = {
      interactionClass: InteractionClass.CLASS_C,
      mode: FallbackMode.POLLING,
      pollingInterval: 5000
    };

    expect(config.interactionClass).toBe(InteractionClass.CLASS_C);
    expect(config.mode).toBe(FallbackMode.POLLING);
    expect(config.pollingInterval).toBe(5000);
  });
});


describe('RetryPolicy Interface', () => {
  it('should create valid retry policy', () => {
    const policy: RetryPolicy = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2
    };

    expect(policy.maxRetries).toBe(3);
    expect(policy.backoffMultiplier).toBe(2);
  });
});


describe('Error Classes', () => {
  it('should create RealtimeError', () => {
    const error = new RealtimeError('Test error', 'TEST_ERROR', 500);
    
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('RealtimeError');
  });

  it('should create AuthenticationError', () => {
    const error = new AuthenticationError('Invalid token');
    
    expect(error.message).toBe('Invalid token');
    expect(error.code).toBe('AUTH_FAILED');
    expect(error.statusCode).toBe(401);
    expect(error.name).toBe('AuthenticationError');
  });

  it('should create AuthorizationError', () => {
    const error = new AuthorizationError('Access denied');
    
    expect(error.message).toBe('Access denied');
    expect(error.code).toBe('AUTHZ_FAILED');
    expect(error.statusCode).toBe(403);
    expect(error.name).toBe('AuthorizationError');
  });

  it('should create TenantIsolationViolation', () => {
    const error = new TenantIsolationViolation('Cross-tenant access attempt');
    
    expect(error.message).toBe('Cross-tenant access attempt');
    expect(error.code).toBe('TENANT_VIOLATION');
    expect(error.statusCode).toBe(403);
    expect(error.name).toBe('TenantIsolationViolation');
  });

  it('should create RateLimitExceeded', () => {
    const error = new RateLimitExceeded('Too many requests');
    
    expect(error.message).toBe('Too many requests');
    expect(error.code).toBe('RATE_LIMIT');
    expect(error.statusCode).toBe(429);
    expect(error.name).toBe('RateLimitExceeded');
  });
});
