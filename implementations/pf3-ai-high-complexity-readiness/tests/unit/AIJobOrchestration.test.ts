/**
 * Unit Tests for PF-3 AI Job Orchestration
 * 
 * Tests for AI job management, provider selection, and execution.
 * Enforces INV-009 (AI as Optional Pluggable Capability).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CapabilityType,
  AIProvider,
  JobPriority,
  JobStatus,
  AIJob,
  AIJobRequest,
  AIJobResult,
  ProviderConfig,
  ProviderHealth
} from '../../src/models/types';


// Mock AI Job Orchestrator for testing
class MockAIJobOrchestrator {
  private jobs: Map<string, AIJob> = new Map();
  private providers: Map<AIProvider, ProviderConfig> = new Map();
  private providerHealth: Map<AIProvider, ProviderHealth> = new Map();
  private cache: Map<string, AIJobResult> = new Map();

  constructor() {
    // Initialize default providers
    this.providers.set(AIProvider.OPENAI, {
      provider: AIProvider.OPENAI,
      apiKey: 'sk-test',
      maxRetries: 3,
      timeout: 30000,
      enabled: true
    });

    this.providers.set(AIProvider.ANTHROPIC, {
      provider: AIProvider.ANTHROPIC,
      apiKey: 'sk-ant-test',
      maxRetries: 3,
      timeout: 30000,
      enabled: true
    });

    // Initialize provider health
    this.providerHealth.set(AIProvider.OPENAI, {
      provider: AIProvider.OPENAI,
      available: true,
      latency: 200,
      errorRate: 0.01,
      lastCheck: new Date()
    });

    this.providerHealth.set(AIProvider.ANTHROPIC, {
      provider: AIProvider.ANTHROPIC,
      available: true,
      latency: 250,
      errorRate: 0.02,
      lastCheck: new Date()
    });
  }

  async submitJob(tenantId: string, userId: string, request: AIJobRequest): Promise<AIJob> {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Check cache
    const cacheKey = this.getCacheKey(tenantId, request);
    const cachedResult = this.cache.get(cacheKey);
    
    const job: AIJob = {
      jobId,
      tenantId,
      userId,
      capability: request.capability,
      provider: request.provider || this.selectProvider(request.capability),
      priority: request.priority || JobPriority.NORMAL,
      status: cachedResult ? JobStatus.COMPLETED : JobStatus.PENDING,
      input: request.input,
      parameters: request.parameters || {},
      output: cachedResult?.output,
      cacheHit: !!cachedResult,
      callbackUrl: request.callbackUrl,
      createdAt: new Date(),
      completedAt: cachedResult ? new Date() : undefined
    };

    this.jobs.set(jobId, job);
    return job;
  }

  async executeJob(jobId: string): Promise<AIJobResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.cacheHit) {
      return {
        jobId,
        status: JobStatus.COMPLETED,
        output: job.output,
        cacheHit: true,
        completedAt: job.completedAt
      };
    }

    // Update status to processing
    job.status = JobStatus.PROCESSING;
    job.startedAt = new Date();

    // Check provider availability
    const health = this.providerHealth.get(job.provider!);
    if (!health?.available) {
      job.status = JobStatus.FAILED;
      job.error = 'Provider unavailable';
      return {
        jobId,
        status: JobStatus.FAILED,
        error: 'Provider unavailable',
        cacheHit: false
      };
    }

    // Simulate execution
    const startTime = Date.now();
    const output = await this.simulateExecution(job);
    const executionTime = Date.now() - startTime;

    // Update job
    job.status = JobStatus.COMPLETED;
    job.output = output;
    job.executionTime = executionTime;
    job.completedAt = new Date();
    job.cost = this.calculateCost(job);
    job.tokenCount = { prompt: 100, completion: 50, total: 150 };

    // Cache result
    const cacheKey = this.getCacheKey(job.tenantId, {
      capability: job.capability,
      input: job.input,
      parameters: job.parameters
    });
    this.cache.set(cacheKey, {
      jobId,
      status: JobStatus.COMPLETED,
      output,
      cost: job.cost,
      tokenCount: job.tokenCount,
      executionTime,
      cacheHit: false,
      completedAt: job.completedAt
    });

    return {
      jobId,
      status: JobStatus.COMPLETED,
      output,
      cost: job.cost,
      tokenCount: job.tokenCount,
      executionTime,
      cacheHit: false,
      completedAt: job.completedAt
    };
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
      return false;
    }

    job.status = JobStatus.CANCELLED;
    return true;
  }

  getJob(jobId: string): AIJob | undefined {
    return this.jobs.get(jobId);
  }

  getJobsByTenant(tenantId: string): AIJob[] {
    return Array.from(this.jobs.values()).filter(job => job.tenantId === tenantId);
  }

  setProviderHealth(provider: AIProvider, available: boolean): void {
    const health = this.providerHealth.get(provider);
    if (health) {
      health.available = available;
      health.lastCheck = new Date();
    }
  }

  private selectProvider(capability: CapabilityType): AIProvider {
    // Simple provider selection based on availability and latency
    const availableProviders = Array.from(this.providerHealth.entries())
      .filter(([_, health]) => health.available)
      .sort((a, b) => a[1].latency - b[1].latency);

    if (availableProviders.length === 0) {
      throw new Error('No providers available');
    }

    return availableProviders[0][0];
  }

  private getCacheKey(tenantId: string, request: AIJobRequest): string {
    return `${tenantId}:${request.capability}:${JSON.stringify(request.input)}`;
  }

  private async simulateExecution(job: AIJob): Promise<any> {
    // Simulate different outputs based on capability
    switch (job.capability) {
      case CapabilityType.GENERATE:
        return { text: 'Generated content' };
      case CapabilityType.CLASSIFY:
        return { category: 'positive', confidence: 0.95 };
      case CapabilityType.RECOMMEND:
        return { recommendations: [{ item: 'item-001', score: 0.9 }] };
      case CapabilityType.FORECAST:
        return { forecast: [{ value: 100, confidence: 0.85 }] };
      case CapabilityType.NEGOTIATE:
        return { counterOffer: { price: 95 }, confidence: 0.8 };
      default:
        return {};
    }
  }

  private calculateCost(job: AIJob): number {
    // Simple cost calculation
    const baseCost = 0.001;
    const tokenCost = (job.tokenCount?.total || 0) * 0.00001;
    return baseCost + tokenCost;
  }
}


describe('Job Submission', () => {
  let orchestrator: MockAIJobOrchestrator;

  beforeEach(() => {
    orchestrator = new MockAIJobOrchestrator();
  });

  it('should submit job successfully', async () => {
    const request: AIJobRequest = {
      capability: CapabilityType.GENERATE,
      input: { prompt: 'Generate text' }
    };

    const job = await orchestrator.submitJob('tenant-001', 'user-001', request);

    expect(job.jobId).toBeDefined();
    expect(job.tenantId).toBe('tenant-001');
    expect(job.userId).toBe('user-001');
    expect(job.capability).toBe(CapabilityType.GENERATE);
    expect(job.status).toBe(JobStatus.PENDING);
  });

  it('should assign default priority', async () => {
    const request: AIJobRequest = {
      capability: CapabilityType.CLASSIFY,
      input: { text: 'Classify this' }
    };

    const job = await orchestrator.submitJob('tenant-001', 'user-001', request);
    expect(job.priority).toBe(JobPriority.NORMAL);
  });

  it('should respect specified priority', async () => {
    const request: AIJobRequest = {
      capability: CapabilityType.FORECAST,
      input: { data: [] },
      priority: JobPriority.URGENT
    };

    const job = await orchestrator.submitJob('tenant-001', 'user-001', request);
    expect(job.priority).toBe(JobPriority.URGENT);
  });

  it('should auto-select provider if not specified', async () => {
    const request: AIJobRequest = {
      capability: CapabilityType.GENERATE,
      input: { prompt: 'Test' }
    };

    const job = await orchestrator.submitJob('tenant-001', 'user-001', request);
    expect(job.provider).toBeDefined();
  });

  it('should use specified provider', async () => {
    const request: AIJobRequest = {
      capability: CapabilityType.GENERATE,
      input: { prompt: 'Test' },
      provider: AIProvider.ANTHROPIC
    };

    const job = await orchestrator.submitJob('tenant-001', 'user-001', request);
    expect(job.provider).toBe(AIProvider.ANTHROPIC);
  });
});


describe('Job Execution', () => {
  let orchestrator: MockAIJobOrchestrator;

  beforeEach(() => {
    orchestrator = new MockAIJobOrchestrator();
  });

  it('should execute job successfully', async () => {
    const request: AIJobRequest = {
      capability: CapabilityType.GENERATE,
      input: { prompt: 'Generate text' }
    };

    const job = await orchestrator.submitJob('tenant-001', 'user-001', request);
    const result = await orchestrator.executeJob(job.jobId);

    expect(result.status).toBe(JobStatus.COMPLETED);
    expect(result.output).toBeDefined();
    expect(result.cacheHit).toBe(false);
  });

  it('should track execution time', async () => {
    const request: AIJobRequest = {
      capability: CapabilityType.CLASSIFY,
      input: { text: 'Test' }
    };

    const job = await orchestrator.submitJob('tenant-001', 'user-001', request);
    const result = await orchestrator.executeJob(job.jobId);

    expect(result.executionTime).toBeDefined();
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
  });

  it('should calculate cost', async () => {
    const request: AIJobRequest = {
      capability: CapabilityType.GENERATE,
      input: { prompt: 'Test' }
    };

    const job = await orchestrator.submitJob('tenant-001', 'user-001', request);
    const result = await orchestrator.executeJob(job.jobId);

    expect(result.cost).toBeDefined();
    expect(result.cost).toBeGreaterThan(0);
  });

  it('should track token count', async () => {
    const request: AIJobRequest = {
      capability: CapabilityType.GENERATE,
      input: { prompt: 'Test' }
    };

    const job = await orchestrator.submitJob('tenant-001', 'user-001', request);
    const result = await orchestrator.executeJob(job.jobId);

    expect(result.tokenCount).toBeDefined();
    expect(result.tokenCount?.total).toBe(150);
  });

  it('should fail when provider unavailable', async () => {
    orchestrator.setProviderHealth(AIProvider.OPENAI, false);
    orchestrator.setProviderHealth(AIProvider.ANTHROPIC, false);

    const request: AIJobRequest = {
      capability: CapabilityType.GENERATE,
      input: { prompt: 'Test' },
      provider: AIProvider.OPENAI
    };

    const job = await orchestrator.submitJob('tenant-001', 'user-001', request);
    const result = await orchestrator.executeJob(job.jobId);

    expect(result.status).toBe(JobStatus.FAILED);
    expect(result.error).toBe('Provider unavailable');
  });
});


describe('Job Caching', () => {
  let orchestrator: MockAIJobOrchestrator;

  beforeEach(() => {
    orchestrator = new MockAIJobOrchestrator();
  });

  it('should cache job results', async () => {
    const request: AIJobRequest = {
      capability: CapabilityType.CLASSIFY,
      input: { text: 'Cache test' }
    };

    // First execution
    const job1 = await orchestrator.submitJob('tenant-001', 'user-001', request);
    await orchestrator.executeJob(job1.jobId);

    // Second submission with same input
    const job2 = await orchestrator.submitJob('tenant-001', 'user-001', request);

    expect(job2.cacheHit).toBe(true);
    expect(job2.status).toBe(JobStatus.COMPLETED);
  });

  it('should return cached result on execution', async () => {
    const request: AIJobRequest = {
      capability: CapabilityType.CLASSIFY,
      input: { text: 'Cache test' }
    };

    // First execution
    const job1 = await orchestrator.submitJob('tenant-001', 'user-001', request);
    await orchestrator.executeJob(job1.jobId);

    // Second execution
    const job2 = await orchestrator.submitJob('tenant-001', 'user-001', request);
    const result = await orchestrator.executeJob(job2.jobId);

    expect(result.cacheHit).toBe(true);
  });

  it('should not cache different inputs', async () => {
    const request1: AIJobRequest = {
      capability: CapabilityType.CLASSIFY,
      input: { text: 'Input 1' }
    };

    const request2: AIJobRequest = {
      capability: CapabilityType.CLASSIFY,
      input: { text: 'Input 2' }
    };

    const job1 = await orchestrator.submitJob('tenant-001', 'user-001', request1);
    await orchestrator.executeJob(job1.jobId);

    const job2 = await orchestrator.submitJob('tenant-001', 'user-001', request2);
    expect(job2.cacheHit).toBe(false);
  });

  it('should isolate cache by tenant', async () => {
    const request: AIJobRequest = {
      capability: CapabilityType.CLASSIFY,
      input: { text: 'Tenant cache test' }
    };

    // Tenant 1 execution
    const job1 = await orchestrator.submitJob('tenant-001', 'user-001', request);
    await orchestrator.executeJob(job1.jobId);

    // Tenant 2 submission
    const job2 = await orchestrator.submitJob('tenant-002', 'user-002', request);
    expect(job2.cacheHit).toBe(false);
  });
});


describe('Job Cancellation', () => {
  let orchestrator: MockAIJobOrchestrator;

  beforeEach(() => {
    orchestrator = new MockAIJobOrchestrator();
  });

  it('should cancel pending job', async () => {
    const request: AIJobRequest = {
      capability: CapabilityType.GENERATE,
      input: { prompt: 'Test' }
    };

    const job = await orchestrator.submitJob('tenant-001', 'user-001', request);
    const cancelled = await orchestrator.cancelJob(job.jobId);

    expect(cancelled).toBe(true);
    expect(orchestrator.getJob(job.jobId)?.status).toBe(JobStatus.CANCELLED);
  });

  it('should not cancel completed job', async () => {
    const request: AIJobRequest = {
      capability: CapabilityType.GENERATE,
      input: { prompt: 'Test' }
    };

    const job = await orchestrator.submitJob('tenant-001', 'user-001', request);
    await orchestrator.executeJob(job.jobId);
    const cancelled = await orchestrator.cancelJob(job.jobId);

    expect(cancelled).toBe(false);
    expect(orchestrator.getJob(job.jobId)?.status).toBe(JobStatus.COMPLETED);
  });

  it('should return false for non-existent job', async () => {
    const cancelled = await orchestrator.cancelJob('non-existent');
    expect(cancelled).toBe(false);
  });
});


describe('Tenant Isolation', () => {
  let orchestrator: MockAIJobOrchestrator;

  beforeEach(() => {
    orchestrator = new MockAIJobOrchestrator();
  });

  it('should isolate jobs by tenant', async () => {
    const request: AIJobRequest = {
      capability: CapabilityType.GENERATE,
      input: { prompt: 'Test' }
    };

    await orchestrator.submitJob('tenant-001', 'user-001', request);
    await orchestrator.submitJob('tenant-001', 'user-002', request);
    await orchestrator.submitJob('tenant-002', 'user-003', request);

    const tenant1Jobs = orchestrator.getJobsByTenant('tenant-001');
    const tenant2Jobs = orchestrator.getJobsByTenant('tenant-002');

    expect(tenant1Jobs).toHaveLength(2);
    expect(tenant2Jobs).toHaveLength(1);
  });
});


describe('Capability-Specific Outputs', () => {
  let orchestrator: MockAIJobOrchestrator;

  beforeEach(() => {
    orchestrator = new MockAIJobOrchestrator();
  });

  it('should return generate output', async () => {
    const job = await orchestrator.submitJob('tenant-001', 'user-001', {
      capability: CapabilityType.GENERATE,
      input: { prompt: 'Test' }
    });
    const result = await orchestrator.executeJob(job.jobId);

    expect(result.output.text).toBeDefined();
  });

  it('should return classify output', async () => {
    const job = await orchestrator.submitJob('tenant-001', 'user-001', {
      capability: CapabilityType.CLASSIFY,
      input: { text: 'Test' }
    });
    const result = await orchestrator.executeJob(job.jobId);

    expect(result.output.category).toBeDefined();
    expect(result.output.confidence).toBeDefined();
  });

  it('should return recommend output', async () => {
    const job = await orchestrator.submitJob('tenant-001', 'user-001', {
      capability: CapabilityType.RECOMMEND,
      input: { userId: 'user-001' }
    });
    const result = await orchestrator.executeJob(job.jobId);

    expect(result.output.recommendations).toBeDefined();
    expect(Array.isArray(result.output.recommendations)).toBe(true);
  });

  it('should return forecast output', async () => {
    const job = await orchestrator.submitJob('tenant-001', 'user-001', {
      capability: CapabilityType.FORECAST,
      input: { data: [] }
    });
    const result = await orchestrator.executeJob(job.jobId);

    expect(result.output.forecast).toBeDefined();
  });

  it('should return negotiate output', async () => {
    const job = await orchestrator.submitJob('tenant-001', 'user-001', {
      capability: CapabilityType.NEGOTIATE,
      input: { offer: 100 }
    });
    const result = await orchestrator.executeJob(job.jobId);

    expect(result.output.counterOffer).toBeDefined();
    expect(result.output.confidence).toBeDefined();
  });
});
