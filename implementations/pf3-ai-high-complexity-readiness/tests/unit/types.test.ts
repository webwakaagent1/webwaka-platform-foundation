/**
 * Unit Tests for PF-3 AI & High-Complexity Readiness Types
 * 
 * Tests for type definitions, enums, and model structures.
 * Enforces INV-009 (AI as Optional Pluggable Capability).
 */

import { describe, it, expect } from 'vitest';
import {
  CapabilityType,
  AIProvider,
  JobPriority,
  JobStatus,
  ActorLevel,
  BillingModel,
  VectorDBProvider,
  AIJob,
  AIJobRequest,
  AIJobResult,
  ProviderConfig,
  ProviderHealth,
  APIKey,
  APIKeyRequest,
  UsageRecord,
  UsageSummary,
  UsageCap,
  GenerateInput,
  GenerateOutput,
  ClassifyInput,
  ClassifyOutput,
  RecommendInput,
  RecommendOutput,
  ForecastInput,
  ForecastOutput,
  NegotiateInput,
  NegotiateOutput
} from '../../src/models/types';


describe('CapabilityType Enum (INV-009)', () => {
  it('should define GENERATE capability', () => {
    expect(CapabilityType.GENERATE).toBe('GENERATE');
  });

  it('should define CLASSIFY capability', () => {
    expect(CapabilityType.CLASSIFY).toBe('CLASSIFY');
  });

  it('should define RECOMMEND capability', () => {
    expect(CapabilityType.RECOMMEND).toBe('RECOMMEND');
  });

  it('should define FORECAST capability', () => {
    expect(CapabilityType.FORECAST).toBe('FORECAST');
  });

  it('should define NEGOTIATE capability', () => {
    expect(CapabilityType.NEGOTIATE).toBe('NEGOTIATE');
  });

  it('should have exactly 5 capability types', () => {
    const capabilities = Object.values(CapabilityType);
    expect(capabilities).toHaveLength(5);
  });
});


describe('AIProvider Enum', () => {
  it('should define all AI providers', () => {
    expect(AIProvider.OPENAI).toBe('OPENAI');
    expect(AIProvider.ANTHROPIC).toBe('ANTHROPIC');
    expect(AIProvider.GOOGLE).toBe('GOOGLE');
    expect(AIProvider.LOCAL).toBe('LOCAL');
    expect(AIProvider.CUSTOM).toBe('CUSTOM');
  });

  it('should have exactly 5 providers', () => {
    const providers = Object.values(AIProvider);
    expect(providers).toHaveLength(5);
  });
});


describe('JobPriority Enum', () => {
  it('should define all priority levels', () => {
    expect(JobPriority.LOW).toBe('LOW');
    expect(JobPriority.NORMAL).toBe('NORMAL');
    expect(JobPriority.HIGH).toBe('HIGH');
    expect(JobPriority.URGENT).toBe('URGENT');
  });
});


describe('JobStatus Enum', () => {
  it('should define all job statuses', () => {
    expect(JobStatus.PENDING).toBe('PENDING');
    expect(JobStatus.QUEUED).toBe('QUEUED');
    expect(JobStatus.PROCESSING).toBe('PROCESSING');
    expect(JobStatus.COMPLETED).toBe('COMPLETED');
    expect(JobStatus.FAILED).toBe('FAILED');
    expect(JobStatus.CANCELLED).toBe('CANCELLED');
  });
});


describe('ActorLevel Enum', () => {
  it('should define all actor levels for BYOK', () => {
    expect(ActorLevel.SUPER_ADMIN).toBe('SUPER_ADMIN');
    expect(ActorLevel.PARTNER).toBe('PARTNER');
    expect(ActorLevel.CLIENT).toBe('CLIENT');
    expect(ActorLevel.MERCHANT_VENDOR).toBe('MERCHANT_VENDOR');
    expect(ActorLevel.AGENT).toBe('AGENT');
    expect(ActorLevel.STAFF).toBe('STAFF');
  });
});


describe('BillingModel Enum', () => {
  it('should define all billing models', () => {
    expect(BillingModel.PAY_PER_REQUEST).toBe('PAY_PER_REQUEST');
    expect(BillingModel.PAY_PER_TOKEN).toBe('PAY_PER_TOKEN');
    expect(BillingModel.BUNDLED).toBe('BUNDLED');
    expect(BillingModel.SUBSCRIPTION).toBe('SUBSCRIPTION');
    expect(BillingModel.FREE_TIER).toBe('FREE_TIER');
  });
});


describe('VectorDBProvider Enum', () => {
  it('should define all vector DB providers', () => {
    expect(VectorDBProvider.PINECONE).toBe('PINECONE');
    expect(VectorDBProvider.WEAVIATE).toBe('WEAVIATE');
    expect(VectorDBProvider.QDRANT).toBe('QDRANT');
  });
});


describe('AIJob Interface', () => {
  it('should create valid AI job', () => {
    const job: AIJob = {
      jobId: 'job-001',
      tenantId: 'tenant-001',
      userId: 'user-001',
      capability: CapabilityType.GENERATE,
      provider: AIProvider.OPENAI,
      priority: JobPriority.NORMAL,
      status: JobStatus.PENDING,
      input: { prompt: 'Generate text' },
      parameters: { maxLength: 100 },
      cacheHit: false,
      createdAt: new Date()
    };

    expect(job.jobId).toBe('job-001');
    expect(job.capability).toBe(CapabilityType.GENERATE);
    expect(job.status).toBe(JobStatus.PENDING);
  });

  it('should support optional fields', () => {
    const job: AIJob = {
      jobId: 'job-001',
      tenantId: 'tenant-001',
      userId: 'user-001',
      capability: CapabilityType.CLASSIFY,
      priority: JobPriority.HIGH,
      status: JobStatus.COMPLETED,
      input: { text: 'Classify this' },
      parameters: {},
      output: { category: 'positive' },
      cost: 0.002,
      tokenCount: { prompt: 10, completion: 5, total: 15 },
      executionTime: 500,
      cacheHit: true,
      createdAt: new Date(),
      startedAt: new Date(),
      completedAt: new Date()
    };

    expect(job.output).toBeDefined();
    expect(job.cost).toBe(0.002);
    expect(job.tokenCount?.total).toBe(15);
  });
});


describe('AIJobRequest Interface', () => {
  it('should create valid job request', () => {
    const request: AIJobRequest = {
      capability: CapabilityType.RECOMMEND,
      input: { userId: 'user-001' }
    };

    expect(request.capability).toBe(CapabilityType.RECOMMEND);
    expect(request.input).toBeDefined();
  });

  it('should support optional parameters', () => {
    const request: AIJobRequest = {
      capability: CapabilityType.FORECAST,
      input: { data: [] },
      parameters: { horizon: 7 },
      priority: JobPriority.URGENT,
      provider: AIProvider.GOOGLE,
      callbackUrl: 'https://example.com/callback'
    };

    expect(request.priority).toBe(JobPriority.URGENT);
    expect(request.provider).toBe(AIProvider.GOOGLE);
  });
});


describe('ProviderConfig Interface', () => {
  it('should create valid provider config', () => {
    const config: ProviderConfig = {
      provider: AIProvider.OPENAI,
      apiKey: 'sk-xxx',
      apiUrl: 'https://api.openai.com/v1',
      model: 'gpt-4',
      maxRetries: 3,
      timeout: 30000,
      enabled: true
    };

    expect(config.provider).toBe(AIProvider.OPENAI);
    expect(config.enabled).toBe(true);
  });
});


describe('APIKey Interface (BYOK)', () => {
  it('should create valid API key', () => {
    const apiKey: APIKey = {
      keyId: 'key-001',
      tenantId: 'tenant-001',
      actorLevel: ActorLevel.CLIENT,
      actorId: 'client-001',
      provider: AIProvider.OPENAI,
      encryptedKey: 'encrypted-xxx',
      keyHash: 'hash-xxx',
      capabilities: [CapabilityType.GENERATE, CapabilityType.CLASSIFY],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    expect(apiKey.keyId).toBe('key-001');
    expect(apiKey.actorLevel).toBe(ActorLevel.CLIENT);
    expect(apiKey.capabilities).toContain(CapabilityType.GENERATE);
  });

  it('should support usage limits', () => {
    const apiKey: APIKey = {
      keyId: 'key-001',
      tenantId: 'tenant-001',
      actorLevel: ActorLevel.MERCHANT_VENDOR,
      actorId: 'merchant-001',
      provider: AIProvider.ANTHROPIC,
      encryptedKey: 'encrypted-xxx',
      keyHash: 'hash-xxx',
      capabilities: [CapabilityType.GENERATE],
      usageLimit: {
        requests: 1000,
        tokens: 100000,
        cost: 50,
        period: 'MONTHLY'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    expect(apiKey.usageLimit?.requests).toBe(1000);
    expect(apiKey.usageLimit?.period).toBe('MONTHLY');
  });
});


describe('UsageRecord Interface', () => {
  it('should create valid usage record', () => {
    const record: UsageRecord = {
      recordId: 'rec-001',
      tenantId: 'tenant-001',
      userId: 'user-001',
      jobId: 'job-001',
      capability: CapabilityType.GENERATE,
      provider: AIProvider.OPENAI,
      billingModel: BillingModel.PAY_PER_TOKEN,
      requestCount: 1,
      tokenCount: { prompt: 100, completion: 50, total: 150 },
      cost: 0.003,
      netCost: 0.003,
      timestamp: new Date()
    };

    expect(record.recordId).toBe('rec-001');
    expect(record.billingModel).toBe(BillingModel.PAY_PER_TOKEN);
    expect(record.netCost).toBe(0.003);
  });

  it('should support markup and subsidy', () => {
    const record: UsageRecord = {
      recordId: 'rec-001',
      tenantId: 'tenant-001',
      userId: 'user-001',
      jobId: 'job-001',
      capability: CapabilityType.CLASSIFY,
      provider: AIProvider.ANTHROPIC,
      billingModel: BillingModel.PAY_PER_REQUEST,
      requestCount: 1,
      cost: 0.01,
      markup: 0.002,
      subsidy: 0.001,
      netCost: 0.011,
      timestamp: new Date()
    };

    expect(record.markup).toBe(0.002);
    expect(record.subsidy).toBe(0.001);
  });
});


describe('UsageCap Interface', () => {
  it('should create valid usage cap', () => {
    const cap: UsageCap = {
      capId: 'cap-001',
      tenantId: 'tenant-001',
      capType: 'COST',
      limit: 100,
      period: 'MONTHLY',
      currentUsage: 45,
      resetAt: new Date(),
      alertThresholds: [0.5, 0.75, 0.9],
      enabled: true
    };

    expect(cap.capType).toBe('COST');
    expect(cap.limit).toBe(100);
    expect(cap.alertThresholds).toContain(0.75);
  });
});


describe('Generate Capability Types', () => {
  it('should create valid generate input', () => {
    const input: GenerateInput = {
      type: 'TEXT',
      prompt: 'Write a story about...',
      context: 'Fantasy setting',
      parameters: {
        maxLength: 500,
        temperature: 0.7
      }
    };

    expect(input.type).toBe('TEXT');
    expect(input.parameters?.temperature).toBe(0.7);
  });

  it('should create valid generate output', () => {
    const output: GenerateOutput = {
      type: 'TEXT',
      content: 'Once upon a time...',
      metadata: {
        model: 'gpt-4',
        finishReason: 'stop'
      }
    };

    expect(output.type).toBe('TEXT');
    expect(output.content).toBeDefined();
  });
});


describe('Classify Capability Types', () => {
  it('should create valid classify input', () => {
    const input: ClassifyInput = {
      type: 'SENTIMENT',
      text: 'This product is amazing!',
      parameters: {
        threshold: 0.8
      }
    };

    expect(input.type).toBe('SENTIMENT');
    expect(input.text).toBeDefined();
  });

  it('should create valid classify output', () => {
    const output: ClassifyOutput = {
      type: 'SENTIMENT',
      result: 'positive',
      confidence: 0.95,
      scores: {
        positive: 0.95,
        negative: 0.03,
        neutral: 0.02
      }
    };

    expect(output.result).toBe('positive');
    expect(output.confidence).toBe(0.95);
  });
});


describe('Recommend Capability Types', () => {
  it('should create valid recommend input', () => {
    const input: RecommendInput = {
      type: 'PRODUCT',
      context: {
        userId: 'user-001',
        currentItem: 'product-001',
        history: ['product-002', 'product-003']
      },
      parameters: {
        count: 5,
        diversify: true
      }
    };

    expect(input.type).toBe('PRODUCT');
    expect(input.context.userId).toBe('user-001');
  });

  it('should create valid recommend output', () => {
    const output: RecommendOutput = {
      type: 'PRODUCT',
      recommendations: [
        { item: 'product-004', score: 0.95, reason: 'Similar to your history' },
        { item: 'product-005', score: 0.87, reason: 'Popular in your category' }
      ]
    };

    expect(output.recommendations).toHaveLength(2);
    expect(output.recommendations[0].score).toBe(0.95);
  });
});


describe('Forecast Capability Types', () => {
  it('should create valid forecast input', () => {
    const input: ForecastInput = {
      type: 'DEMAND',
      historicalData: [
        { timestamp: new Date('2024-01-01'), value: 100 },
        { timestamp: new Date('2024-01-02'), value: 120 }
      ],
      horizon: 7,
      parameters: {
        confidence: 0.95,
        seasonality: true
      }
    };

    expect(input.type).toBe('DEMAND');
    expect(input.horizon).toBe(7);
  });

  it('should create valid forecast output', () => {
    const output: ForecastOutput = {
      type: 'DEMAND',
      forecast: [
        { timestamp: new Date('2024-01-08'), value: 130, lower: 110, upper: 150, confidence: 0.95 }
      ],
      metadata: {
        model: 'prophet',
        accuracy: 0.92
      }
    };

    expect(output.forecast).toHaveLength(1);
    expect(output.forecast[0].confidence).toBe(0.95);
  });
});


describe('Negotiate Capability Types', () => {
  it('should create valid negotiate input', () => {
    const input: NegotiateInput = {
      type: 'PRICING',
      context: {
        parties: ['buyer', 'seller'],
        currentOffer: { price: 100 },
        constraints: { minPrice: 80, maxPrice: 120 }
      },
      parameters: {
        strategy: 'collaborative',
        maxRounds: 5
      }
    };

    expect(input.type).toBe('PRICING');
    expect(input.context.parties).toContain('buyer');
  });

  it('should create valid negotiate output', () => {
    const output: NegotiateOutput = {
      type: 'PRICING',
      counterOffer: { price: 95 },
      reasoning: 'Meeting in the middle based on market data',
      confidence: 0.85
    };

    expect(output.counterOffer.price).toBe(95);
    expect(output.confidence).toBe(0.85);
  });
});
