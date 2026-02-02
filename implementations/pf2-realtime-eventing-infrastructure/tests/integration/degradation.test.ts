/**
 * Integration Tests for PF-2 Degradation Behavior
 * 
 * Tests for graceful degradation when realtime is unavailable.
 * Enforces INV-010 (Realtime as Optional Degradable Capability).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  InteractionClass,
  FallbackMode,
  FallbackConfig,
  RetryPolicy,
  Event,
  EventQueue,
  HealthStatus,
  ServiceHealth
} from '../../src/models/types';


// Mock Fallback Manager for testing degradation behavior
class MockFallbackManager {
  private fallbackConfigs: Map<InteractionClass, FallbackConfig> = new Map();
  private eventQueues: Map<string, EventQueue> = new Map();
  private serviceHealth: ServiceHealth = {
    service: 'realtime',
    status: HealthStatus.HEALTHY,
    lastCheck: new Date(),
    metrics: {}
  };

  constructor() {
    // Initialize default fallback configs per INV-010
    this.fallbackConfigs.set(InteractionClass.CLASS_A, {
      interactionClass: InteractionClass.CLASS_A,
      mode: FallbackMode.NONE // Live presence - no fallback needed
    });

    this.fallbackConfigs.set(InteractionClass.CLASS_B, {
      interactionClass: InteractionClass.CLASS_B,
      mode: FallbackMode.EVENT_QUEUE,
      queueSize: 1000,
      retryPolicy: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2
      }
    });

    this.fallbackConfigs.set(InteractionClass.CLASS_C, {
      interactionClass: InteractionClass.CLASS_C,
      mode: FallbackMode.POLLING,
      pollingInterval: 5000
    });

    this.fallbackConfigs.set(InteractionClass.CLASS_D, {
      interactionClass: InteractionClass.CLASS_D,
      mode: FallbackMode.ASYNC_CONFIRMATION // Critical transactions - async only
    });
  }

  setServiceHealth(status: HealthStatus): void {
    this.serviceHealth = {
      ...this.serviceHealth,
      status,
      lastCheck: new Date()
    };
  }

  getServiceHealth(): ServiceHealth {
    return this.serviceHealth;
  }

  isRealtimeAvailable(): boolean {
    return this.serviceHealth.status === HealthStatus.HEALTHY;
  }

  getFallbackConfig(interactionClass: InteractionClass): FallbackConfig {
    return this.fallbackConfigs.get(interactionClass)!;
  }

  async handleEvent(event: Event, interactionClass: InteractionClass): Promise<{ delivered: boolean; fallbackUsed: boolean; fallbackMode?: FallbackMode }> {
    const config = this.getFallbackConfig(interactionClass);

    // If realtime is available, deliver directly
    if (this.isRealtimeAvailable()) {
      return { delivered: true, fallbackUsed: false };
    }

    // Apply fallback based on interaction class
    switch (config.mode) {
      case FallbackMode.NONE:
        // CLASS_A: No fallback, event is dropped
        return { delivered: false, fallbackUsed: false };

      case FallbackMode.EVENT_QUEUE:
        // CLASS_B: Queue for later delivery
        await this.queueEvent(event);
        return { delivered: false, fallbackUsed: true, fallbackMode: FallbackMode.EVENT_QUEUE };

      case FallbackMode.POLLING:
        // CLASS_C: Store for polling retrieval
        await this.storeForPolling(event);
        return { delivered: false, fallbackUsed: true, fallbackMode: FallbackMode.POLLING };

      case FallbackMode.ASYNC_CONFIRMATION:
        // CLASS_D: Async confirmation only
        return { delivered: false, fallbackUsed: true, fallbackMode: FallbackMode.ASYNC_CONFIRMATION };

      default:
        return { delivered: false, fallbackUsed: false };
    }
  }

  private async queueEvent(event: Event): Promise<void> {
    const queueKey = `${event.tenantId}:queue`;
    
    if (!this.eventQueues.has(queueKey)) {
      this.eventQueues.set(queueKey, {
        queueId: queueKey,
        clientId: 'system',
        tenantId: event.tenantId,
        events: [],
        createdAt: new Date(),
        lastAccessedAt: new Date()
      });
    }

    const queue = this.eventQueues.get(queueKey)!;
    queue.events.push(event);
    queue.lastAccessedAt = new Date();
  }

  private async storeForPolling(event: Event): Promise<void> {
    // Similar to queueEvent but for polling retrieval
    await this.queueEvent(event);
  }

  getQueuedEvents(tenantId: string): Event[] {
    const queueKey = `${tenantId}:queue`;
    const queue = this.eventQueues.get(queueKey);
    return queue?.events || [];
  }

  async drainQueue(tenantId: string): Promise<Event[]> {
    const queueKey = `${tenantId}:queue`;
    const queue = this.eventQueues.get(queueKey);
    
    if (!queue) {
      return [];
    }

    const events = [...queue.events];
    queue.events = [];
    return events;
  }
}


describe('Fallback Configuration (INV-010)', () => {
  let manager: MockFallbackManager;

  beforeEach(() => {
    manager = new MockFallbackManager();
  });

  it('should configure CLASS_A with no fallback', () => {
    const config = manager.getFallbackConfig(InteractionClass.CLASS_A);
    
    expect(config.interactionClass).toBe(InteractionClass.CLASS_A);
    expect(config.mode).toBe(FallbackMode.NONE);
  });

  it('should configure CLASS_B with event queue fallback', () => {
    const config = manager.getFallbackConfig(InteractionClass.CLASS_B);
    
    expect(config.interactionClass).toBe(InteractionClass.CLASS_B);
    expect(config.mode).toBe(FallbackMode.EVENT_QUEUE);
    expect(config.queueSize).toBe(1000);
  });

  it('should configure CLASS_C with polling fallback', () => {
    const config = manager.getFallbackConfig(InteractionClass.CLASS_C);
    
    expect(config.interactionClass).toBe(InteractionClass.CLASS_C);
    expect(config.mode).toBe(FallbackMode.POLLING);
    expect(config.pollingInterval).toBe(5000);
  });

  it('should configure CLASS_D with async confirmation only', () => {
    const config = manager.getFallbackConfig(InteractionClass.CLASS_D);
    
    expect(config.interactionClass).toBe(InteractionClass.CLASS_D);
    expect(config.mode).toBe(FallbackMode.ASYNC_CONFIRMATION);
  });
});


describe('Healthy Service Behavior', () => {
  let manager: MockFallbackManager;

  beforeEach(() => {
    manager = new MockFallbackManager();
    manager.setServiceHealth(HealthStatus.HEALTHY);
  });

  it('should deliver events directly when healthy', async () => {
    const event: Event = {
      eventId: 'event-001',
      eventType: 'order.created',
      tenantId: 'tenant-001',
      timestamp: new Date(),
      payload: { orderId: 'order-001' },
      metadata: { source: 'test' },
      schemaVersion: '1.0.0'
    };

    const result = await manager.handleEvent(event, InteractionClass.CLASS_B);
    
    expect(result.delivered).toBe(true);
    expect(result.fallbackUsed).toBe(false);
  });

  it('should not queue events when healthy', async () => {
    const event: Event = {
      eventId: 'event-001',
      eventType: 'order.created',
      tenantId: 'tenant-001',
      timestamp: new Date(),
      payload: {},
      metadata: { source: 'test' },
      schemaVersion: '1.0.0'
    };

    await manager.handleEvent(event, InteractionClass.CLASS_B);
    
    const queuedEvents = manager.getQueuedEvents('tenant-001');
    expect(queuedEvents).toHaveLength(0);
  });
});


describe('Degraded Service Behavior', () => {
  let manager: MockFallbackManager;

  beforeEach(() => {
    manager = new MockFallbackManager();
    manager.setServiceHealth(HealthStatus.UNHEALTHY);
  });

  it('should drop CLASS_A events when degraded', async () => {
    const event: Event = {
      eventId: 'event-001',
      eventType: 'presence.update',
      tenantId: 'tenant-001',
      timestamp: new Date(),
      payload: { status: 'online' },
      metadata: { source: 'test' },
      schemaVersion: '1.0.0'
    };

    const result = await manager.handleEvent(event, InteractionClass.CLASS_A);
    
    expect(result.delivered).toBe(false);
    expect(result.fallbackUsed).toBe(false);
  });

  it('should queue CLASS_B events when degraded', async () => {
    const event: Event = {
      eventId: 'event-001',
      eventType: 'order.created',
      tenantId: 'tenant-001',
      timestamp: new Date(),
      payload: { orderId: 'order-001' },
      metadata: { source: 'test' },
      schemaVersion: '1.0.0'
    };

    const result = await manager.handleEvent(event, InteractionClass.CLASS_B);
    
    expect(result.delivered).toBe(false);
    expect(result.fallbackUsed).toBe(true);
    expect(result.fallbackMode).toBe(FallbackMode.EVENT_QUEUE);
    
    const queuedEvents = manager.getQueuedEvents('tenant-001');
    expect(queuedEvents).toHaveLength(1);
  });

  it('should use polling fallback for CLASS_C events', async () => {
    const event: Event = {
      eventId: 'event-001',
      eventType: 'notification',
      tenantId: 'tenant-001',
      timestamp: new Date(),
      payload: { message: 'Update available' },
      metadata: { source: 'test' },
      schemaVersion: '1.0.0'
    };

    const result = await manager.handleEvent(event, InteractionClass.CLASS_C);
    
    expect(result.delivered).toBe(false);
    expect(result.fallbackUsed).toBe(true);
    expect(result.fallbackMode).toBe(FallbackMode.POLLING);
  });

  it('should use async confirmation for CLASS_D events', async () => {
    const event: Event = {
      eventId: 'event-001',
      eventType: 'payment.processed',
      tenantId: 'tenant-001',
      timestamp: new Date(),
      payload: { paymentId: 'pay-001' },
      metadata: { source: 'test' },
      schemaVersion: '1.0.0'
    };

    const result = await manager.handleEvent(event, InteractionClass.CLASS_D);
    
    expect(result.delivered).toBe(false);
    expect(result.fallbackUsed).toBe(true);
    expect(result.fallbackMode).toBe(FallbackMode.ASYNC_CONFIRMATION);
  });
});


describe('Queue Management', () => {
  let manager: MockFallbackManager;

  beforeEach(() => {
    manager = new MockFallbackManager();
    manager.setServiceHealth(HealthStatus.UNHEALTHY);
  });

  it('should accumulate queued events', async () => {
    for (let i = 0; i < 5; i++) {
      const event: Event = {
        eventId: `event-${i}`,
        eventType: 'order.created',
        tenantId: 'tenant-001',
        timestamp: new Date(),
        payload: { orderId: `order-${i}` },
        metadata: { source: 'test' },
        schemaVersion: '1.0.0'
      };
      await manager.handleEvent(event, InteractionClass.CLASS_B);
    }

    const queuedEvents = manager.getQueuedEvents('tenant-001');
    expect(queuedEvents).toHaveLength(5);
  });

  it('should drain queue and return events', async () => {
    for (let i = 0; i < 3; i++) {
      const event: Event = {
        eventId: `event-${i}`,
        eventType: 'order.created',
        tenantId: 'tenant-001',
        timestamp: new Date(),
        payload: {},
        metadata: { source: 'test' },
        schemaVersion: '1.0.0'
      };
      await manager.handleEvent(event, InteractionClass.CLASS_B);
    }

    const drainedEvents = await manager.drainQueue('tenant-001');
    expect(drainedEvents).toHaveLength(3);
    
    const remainingEvents = manager.getQueuedEvents('tenant-001');
    expect(remainingEvents).toHaveLength(0);
  });

  it('should isolate queues by tenant', async () => {
    const event1: Event = {
      eventId: 'event-001',
      eventType: 'order.created',
      tenantId: 'tenant-001',
      timestamp: new Date(),
      payload: {},
      metadata: { source: 'test' },
      schemaVersion: '1.0.0'
    };

    const event2: Event = {
      eventId: 'event-002',
      eventType: 'order.created',
      tenantId: 'tenant-002',
      timestamp: new Date(),
      payload: {},
      metadata: { source: 'test' },
      schemaVersion: '1.0.0'
    };

    await manager.handleEvent(event1, InteractionClass.CLASS_B);
    await manager.handleEvent(event2, InteractionClass.CLASS_B);

    const tenant1Events = manager.getQueuedEvents('tenant-001');
    const tenant2Events = manager.getQueuedEvents('tenant-002');

    expect(tenant1Events).toHaveLength(1);
    expect(tenant2Events).toHaveLength(1);
    expect(tenant1Events[0].eventId).toBe('event-001');
    expect(tenant2Events[0].eventId).toBe('event-002');
  });
});


describe('Service Health Transitions', () => {
  let manager: MockFallbackManager;

  beforeEach(() => {
    manager = new MockFallbackManager();
  });

  it('should transition from healthy to degraded', () => {
    expect(manager.isRealtimeAvailable()).toBe(true);
    
    manager.setServiceHealth(HealthStatus.DEGRADED);
    expect(manager.isRealtimeAvailable()).toBe(false);
  });

  it('should transition from degraded to healthy', () => {
    manager.setServiceHealth(HealthStatus.DEGRADED);
    expect(manager.isRealtimeAvailable()).toBe(false);
    
    manager.setServiceHealth(HealthStatus.HEALTHY);
    expect(manager.isRealtimeAvailable()).toBe(true);
  });

  it('should update last check time on health change', () => {
    const before = new Date();
    manager.setServiceHealth(HealthStatus.DEGRADED);
    const after = new Date();
    
    const health = manager.getServiceHealth();
    expect(health.lastCheck.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(health.lastCheck.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
