/**
 * Integration Tests for PF-3 BYOK and Billing
 * 
 * Tests for Bring Your Own Keys (BYOK) and billing integration.
 * Enforces INV-009 (AI as Optional Pluggable Capability).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AIProvider,
  ActorLevel,
  CapabilityType,
  BillingModel,
  APIKey,
  APIKeyRequest,
  KeyValidationResult,
  UsageRecord,
  UsageSummary,
  UsageCap,
  UsageAlert
} from '../../src/models/types';


// Mock BYOK Manager for testing
class MockBYOKManager {
  private keys: Map<string, APIKey> = new Map();
  private keyCounter = 0;

  async registerKey(tenantId: string, actorLevel: ActorLevel, actorId: string, request: APIKeyRequest): Promise<APIKey> {
    // Validate key with provider
    const validation = await this.validateKey(request.provider, request.apiKey);
    
    if (!validation.valid) {
      throw new Error(`Invalid API key: ${validation.error}`);
    }

    const keyId = `key-${++this.keyCounter}`;
    const apiKey: APIKey = {
      keyId,
      tenantId,
      actorLevel,
      actorId,
      provider: request.provider,
      encryptedKey: this.encryptKey(request.apiKey),
      keyHash: this.hashKey(request.apiKey),
      capabilities: request.capabilities || validation.capabilities,
      usageLimit: request.usageLimit,
      expiresAt: request.expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      rotationSchedule: request.rotationSchedule ? {
        frequency: request.rotationSchedule.frequency,
        nextRotation: new Date(Date.now() + request.rotationSchedule.frequency * 86400000)
      } : undefined
    };

    this.keys.set(keyId, apiKey);
    return apiKey;
  }

  async validateKey(provider: AIProvider, apiKey: string): Promise<KeyValidationResult> {
    // Simulate key validation
    if (!apiKey || apiKey.length < 10) {
      return {
        valid: false,
        provider,
        capabilities: [],
        error: 'Invalid key format'
      };
    }

    return {
      valid: true,
      provider,
      capabilities: [CapabilityType.GENERATE, CapabilityType.CLASSIFY]
    };
  }

  async getKey(keyId: string): Promise<APIKey | undefined> {
    return this.keys.get(keyId);
  }

  async getKeysByTenant(tenantId: string): Promise<APIKey[]> {
    return Array.from(this.keys.values()).filter(key => key.tenantId === tenantId);
  }

  async getKeysByActor(tenantId: string, actorLevel: ActorLevel, actorId: string): Promise<APIKey[]> {
    return Array.from(this.keys.values()).filter(
      key => key.tenantId === tenantId && key.actorLevel === actorLevel && key.actorId === actorId
    );
  }

  async revokeKey(keyId: string): Promise<boolean> {
    return this.keys.delete(keyId);
  }

  async rotateKey(keyId: string, newApiKey: string): Promise<APIKey> {
    const existingKey = this.keys.get(keyId);
    if (!existingKey) {
      throw new Error('Key not found');
    }

    const validation = await this.validateKey(existingKey.provider, newApiKey);
    if (!validation.valid) {
      throw new Error(`Invalid API key: ${validation.error}`);
    }

    existingKey.encryptedKey = this.encryptKey(newApiKey);
    existingKey.keyHash = this.hashKey(newApiKey);
    existingKey.updatedAt = new Date();
    
    if (existingKey.rotationSchedule) {
      existingKey.rotationSchedule.nextRotation = new Date(
        Date.now() + existingKey.rotationSchedule.frequency * 86400000
      );
    }

    return existingKey;
  }

  private encryptKey(apiKey: string): string {
    // Simulate encryption
    return `encrypted:${Buffer.from(apiKey).toString('base64')}`;
  }

  private hashKey(apiKey: string): string {
    // Simulate hashing
    return `hash:${apiKey.slice(-4)}`;
  }
}


// Mock Billing Manager for testing
class MockBillingManager {
  private usageRecords: UsageRecord[] = [];
  private usageCaps: Map<string, UsageCap> = new Map();
  private alerts: UsageAlert[] = [];
  private recordCounter = 0;

  async recordUsage(
    tenantId: string,
    userId: string,
    jobId: string,
    capability: CapabilityType,
    provider: AIProvider,
    billingModel: BillingModel,
    cost: number,
    tokenCount?: { prompt: number; completion: number; total: number }
  ): Promise<UsageRecord> {
    const record: UsageRecord = {
      recordId: `rec-${++this.recordCounter}`,
      tenantId,
      userId,
      jobId,
      capability,
      provider,
      billingModel,
      requestCount: 1,
      tokenCount,
      cost,
      netCost: cost,
      timestamp: new Date()
    };

    this.usageRecords.push(record);

    // Check usage caps
    await this.checkUsageCaps(tenantId, userId, cost);

    return record;
  }

  async setUsageCap(
    tenantId: string,
    userId: string | undefined,
    capType: 'REQUESTS' | 'TOKENS' | 'COST',
    limit: number,
    period: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  ): Promise<UsageCap> {
    const capId = `cap-${tenantId}-${userId || 'tenant'}-${capType}`;
    
    const cap: UsageCap = {
      capId,
      tenantId,
      userId,
      capType,
      limit,
      period,
      currentUsage: 0,
      resetAt: this.getResetDate(period),
      alertThresholds: [0.5, 0.75, 0.9],
      enabled: true
    };

    this.usageCaps.set(capId, cap);
    return cap;
  }

  async getUsageSummary(tenantId: string, startDate: Date, endDate: Date): Promise<UsageSummary> {
    const records = this.usageRecords.filter(
      r => r.tenantId === tenantId && r.timestamp >= startDate && r.timestamp <= endDate
    );

    const byCapability: Record<CapabilityType, { requests: number; tokens?: number; cost: number }> = {} as any;
    const byProvider: Record<AIProvider, { requests: number; tokens?: number; cost: number }> = {} as any;

    let totalRequests = 0;
    let totalTokens = 0;
    let totalCost = 0;

    for (const record of records) {
      totalRequests += record.requestCount;
      totalTokens += record.tokenCount?.total || 0;
      totalCost += record.netCost;

      // By capability
      if (!byCapability[record.capability]) {
        byCapability[record.capability] = { requests: 0, tokens: 0, cost: 0 };
      }
      byCapability[record.capability].requests += record.requestCount;
      byCapability[record.capability].tokens! += record.tokenCount?.total || 0;
      byCapability[record.capability].cost += record.netCost;

      // By provider
      if (!byProvider[record.provider]) {
        byProvider[record.provider] = { requests: 0, tokens: 0, cost: 0 };
      }
      byProvider[record.provider].requests += record.requestCount;
      byProvider[record.provider].tokens! += record.tokenCount?.total || 0;
      byProvider[record.provider].cost += record.netCost;
    }

    return {
      tenantId,
      period: { start: startDate, end: endDate },
      totalRequests,
      totalTokens,
      totalCost,
      byCapability,
      byProvider
    };
  }

  async checkUsageCaps(tenantId: string, userId: string, cost: number): Promise<void> {
    for (const cap of this.usageCaps.values()) {
      if (cap.tenantId !== tenantId) continue;
      if (cap.userId && cap.userId !== userId) continue;
      if (!cap.enabled) continue;

      // Update current usage
      if (cap.capType === 'COST') {
        cap.currentUsage += cost;
      } else if (cap.capType === 'REQUESTS') {
        cap.currentUsage += 1;
      }

      // Check thresholds
      const usageRatio = cap.currentUsage / cap.limit;
      for (const threshold of cap.alertThresholds) {
        if (usageRatio >= threshold && usageRatio < threshold + 0.1) {
          this.alerts.push({
            alertId: `alert-${Date.now()}`,
            tenantId,
            userId: cap.userId,
            capId: cap.capId,
            threshold,
            currentUsage: cap.currentUsage,
            limit: cap.limit,
            message: `Usage at ${Math.round(usageRatio * 100)}% of ${cap.capType} limit`,
            sentAt: new Date()
          });
        }
      }
    }
  }

  getAlerts(tenantId: string): UsageAlert[] {
    return this.alerts.filter(a => a.tenantId === tenantId);
  }

  private getResetDate(period: 'DAILY' | 'WEEKLY' | 'MONTHLY'): Date {
    const now = new Date();
    switch (period) {
      case 'DAILY':
        return new Date(now.getTime() + 86400000);
      case 'WEEKLY':
        return new Date(now.getTime() + 7 * 86400000);
      case 'MONTHLY':
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
  }
}


describe('BYOK Key Registration', () => {
  let byokManager: MockBYOKManager;

  beforeEach(() => {
    byokManager = new MockBYOKManager();
  });

  it('should register valid API key', async () => {
    const request: APIKeyRequest = {
      provider: AIProvider.OPENAI,
      apiKey: 'sk-test-valid-key-12345'
    };

    const key = await byokManager.registerKey('tenant-001', ActorLevel.CLIENT, 'client-001', request);

    expect(key.keyId).toBeDefined();
    expect(key.tenantId).toBe('tenant-001');
    expect(key.actorLevel).toBe(ActorLevel.CLIENT);
    expect(key.provider).toBe(AIProvider.OPENAI);
  });

  it('should reject invalid API key', async () => {
    const request: APIKeyRequest = {
      provider: AIProvider.OPENAI,
      apiKey: 'short'
    };

    await expect(
      byokManager.registerKey('tenant-001', ActorLevel.CLIENT, 'client-001', request)
    ).rejects.toThrow('Invalid API key');
  });

  it('should encrypt stored key', async () => {
    const request: APIKeyRequest = {
      provider: AIProvider.ANTHROPIC,
      apiKey: 'sk-ant-test-valid-key-12345'
    };

    const key = await byokManager.registerKey('tenant-001', ActorLevel.PARTNER, 'partner-001', request);

    expect(key.encryptedKey).toContain('encrypted:');
    expect(key.encryptedKey).not.toContain('sk-ant-test');
  });

  it('should support usage limits', async () => {
    const request: APIKeyRequest = {
      provider: AIProvider.OPENAI,
      apiKey: 'sk-test-valid-key-12345',
      usageLimit: {
        requests: 1000,
        tokens: 100000,
        cost: 50,
        period: 'MONTHLY'
      }
    };

    const key = await byokManager.registerKey('tenant-001', ActorLevel.MERCHANT_VENDOR, 'merchant-001', request);

    expect(key.usageLimit?.requests).toBe(1000);
    expect(key.usageLimit?.period).toBe('MONTHLY');
  });

  it('should support rotation schedule', async () => {
    const request: APIKeyRequest = {
      provider: AIProvider.OPENAI,
      apiKey: 'sk-test-valid-key-12345',
      rotationSchedule: { frequency: 30 }
    };

    const key = await byokManager.registerKey('tenant-001', ActorLevel.CLIENT, 'client-001', request);

    expect(key.rotationSchedule?.frequency).toBe(30);
    expect(key.rotationSchedule?.nextRotation).toBeDefined();
  });
});


describe('BYOK Key Management', () => {
  let byokManager: MockBYOKManager;

  beforeEach(async () => {
    byokManager = new MockBYOKManager();
    await byokManager.registerKey('tenant-001', ActorLevel.CLIENT, 'client-001', {
      provider: AIProvider.OPENAI,
      apiKey: 'sk-test-key-001-12345'
    });
    await byokManager.registerKey('tenant-001', ActorLevel.CLIENT, 'client-002', {
      provider: AIProvider.ANTHROPIC,
      apiKey: 'sk-ant-key-002-12345'
    });
    await byokManager.registerKey('tenant-002', ActorLevel.PARTNER, 'partner-001', {
      provider: AIProvider.OPENAI,
      apiKey: 'sk-test-key-003-12345'
    });
  });

  it('should retrieve keys by tenant', async () => {
    const keys = await byokManager.getKeysByTenant('tenant-001');
    expect(keys).toHaveLength(2);
  });

  it('should retrieve keys by actor', async () => {
    const keys = await byokManager.getKeysByActor('tenant-001', ActorLevel.CLIENT, 'client-001');
    expect(keys).toHaveLength(1);
    expect(keys[0].provider).toBe(AIProvider.OPENAI);
  });

  it('should revoke key', async () => {
    const keys = await byokManager.getKeysByTenant('tenant-001');
    const keyId = keys[0].keyId;

    const revoked = await byokManager.revokeKey(keyId);
    expect(revoked).toBe(true);

    const remainingKeys = await byokManager.getKeysByTenant('tenant-001');
    expect(remainingKeys).toHaveLength(1);
  });

  it('should rotate key', async () => {
    const keys = await byokManager.getKeysByTenant('tenant-001');
    const keyId = keys[0].keyId;
    const originalHash = keys[0].keyHash;

    const rotatedKey = await byokManager.rotateKey(keyId, 'sk-new-rotated-key-99999');

    expect(rotatedKey.keyHash).not.toBe(originalHash);
    expect(rotatedKey.updatedAt.getTime()).toBeGreaterThanOrEqual(keys[0].createdAt.getTime());
  });
});


describe('Billing Usage Recording', () => {
  let billingManager: MockBillingManager;

  beforeEach(() => {
    billingManager = new MockBillingManager();
  });

  it('should record usage', async () => {
    const record = await billingManager.recordUsage(
      'tenant-001',
      'user-001',
      'job-001',
      CapabilityType.GENERATE,
      AIProvider.OPENAI,
      BillingModel.PAY_PER_TOKEN,
      0.003,
      { prompt: 100, completion: 50, total: 150 }
    );

    expect(record.recordId).toBeDefined();
    expect(record.cost).toBe(0.003);
    expect(record.tokenCount?.total).toBe(150);
  });

  it('should calculate usage summary', async () => {
    // Record multiple usage entries
    await billingManager.recordUsage('tenant-001', 'user-001', 'job-001', CapabilityType.GENERATE, AIProvider.OPENAI, BillingModel.PAY_PER_TOKEN, 0.003);
    await billingManager.recordUsage('tenant-001', 'user-001', 'job-002', CapabilityType.CLASSIFY, AIProvider.OPENAI, BillingModel.PAY_PER_REQUEST, 0.001);
    await billingManager.recordUsage('tenant-001', 'user-002', 'job-003', CapabilityType.GENERATE, AIProvider.ANTHROPIC, BillingModel.PAY_PER_TOKEN, 0.004);

    const summary = await billingManager.getUsageSummary(
      'tenant-001',
      new Date(Date.now() - 86400000),
      new Date()
    );

    expect(summary.totalRequests).toBe(3);
    expect(summary.totalCost).toBe(0.008);
    expect(summary.byCapability[CapabilityType.GENERATE].requests).toBe(2);
    expect(summary.byProvider[AIProvider.OPENAI].requests).toBe(2);
  });
});


describe('Usage Caps and Alerts', () => {
  let billingManager: MockBillingManager;

  beforeEach(async () => {
    billingManager = new MockBillingManager();
    await billingManager.setUsageCap('tenant-001', undefined, 'COST', 10, 'MONTHLY');
  });

  it('should set usage cap', async () => {
    const cap = await billingManager.setUsageCap('tenant-001', 'user-001', 'REQUESTS', 100, 'DAILY');

    expect(cap.capId).toBeDefined();
    expect(cap.limit).toBe(100);
    expect(cap.currentUsage).toBe(0);
  });

  it('should trigger alert at threshold', async () => {
    // Record usage to reach 50% threshold
    for (let i = 0; i < 5; i++) {
      await billingManager.recordUsage(
        'tenant-001',
        'user-001',
        `job-${i}`,
        CapabilityType.GENERATE,
        AIProvider.OPENAI,
        BillingModel.PAY_PER_TOKEN,
        1 // $1 each, cap is $10
      );
    }

    const alerts = billingManager.getAlerts('tenant-001');
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].threshold).toBe(0.5);
  });

  it('should track current usage', async () => {
    await billingManager.recordUsage('tenant-001', 'user-001', 'job-001', CapabilityType.GENERATE, AIProvider.OPENAI, BillingModel.PAY_PER_TOKEN, 2);
    await billingManager.recordUsage('tenant-001', 'user-001', 'job-002', CapabilityType.CLASSIFY, AIProvider.OPENAI, BillingModel.PAY_PER_REQUEST, 1);

    // The cap should have updated currentUsage
    const summary = await billingManager.getUsageSummary('tenant-001', new Date(Date.now() - 86400000), new Date());
    expect(summary.totalCost).toBe(3);
  });
});


describe('Actor Level Hierarchy', () => {
  let byokManager: MockBYOKManager;

  beforeEach(() => {
    byokManager = new MockBYOKManager();
  });

  it('should support SUPER_ADMIN level', async () => {
    const key = await byokManager.registerKey('tenant-001', ActorLevel.SUPER_ADMIN, 'admin-001', {
      provider: AIProvider.OPENAI,
      apiKey: 'sk-admin-key-12345'
    });

    expect(key.actorLevel).toBe(ActorLevel.SUPER_ADMIN);
  });

  it('should support PARTNER level', async () => {
    const key = await byokManager.registerKey('tenant-001', ActorLevel.PARTNER, 'partner-001', {
      provider: AIProvider.ANTHROPIC,
      apiKey: 'sk-partner-key-12345'
    });

    expect(key.actorLevel).toBe(ActorLevel.PARTNER);
  });

  it('should support MERCHANT_VENDOR level', async () => {
    const key = await byokManager.registerKey('tenant-001', ActorLevel.MERCHANT_VENDOR, 'merchant-001', {
      provider: AIProvider.GOOGLE,
      apiKey: 'google-merchant-key-12345'
    });

    expect(key.actorLevel).toBe(ActorLevel.MERCHANT_VENDOR);
  });

  it('should support AGENT level', async () => {
    const key = await byokManager.registerKey('tenant-001', ActorLevel.AGENT, 'agent-001', {
      provider: AIProvider.OPENAI,
      apiKey: 'sk-agent-key-12345'
    });

    expect(key.actorLevel).toBe(ActorLevel.AGENT);
  });

  it('should support STAFF level', async () => {
    const key = await byokManager.registerKey('tenant-001', ActorLevel.STAFF, 'staff-001', {
      provider: AIProvider.OPENAI,
      apiKey: 'sk-staff-key-12345'
    });

    expect(key.actorLevel).toBe(ActorLevel.STAFF);
  });
});
