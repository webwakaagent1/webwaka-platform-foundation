/**
 * Integration Tests for PF-3 AI Capability Abstraction
 * 
 * Tests for abstract capability contracts and provider independence.
 * Enforces INV-009 (AI as Optional Pluggable Capability).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CapabilityType,
  AIProvider,
  GenerateInput,
  GenerateOutput,
  ClassifyInput,
  ClassifyOutput,
  RecommendInput,
  RecommendOutput,
  ForecastInput,
  ForecastOutput,
  NegotiateInput,
  NegotiateOutput,
  IProviderAdapter
} from '../../src/models/types';


// Mock Provider Adapter implementing the interface
class MockProviderAdapter implements IProviderAdapter {
  provider: AIProvider;
  private supportedCapabilities: CapabilityType[];
  private available: boolean = true;

  constructor(provider: AIProvider, capabilities: CapabilityType[]) {
    this.provider = provider;
    this.supportedCapabilities = capabilities;
  }

  async execute(capability: CapabilityType, input: any, parameters: Record<string, any>): Promise<any> {
    if (!this.supportedCapabilities.includes(capability)) {
      throw new Error(`Capability ${capability} not supported by ${this.provider}`);
    }

    if (!this.available) {
      throw new Error(`Provider ${this.provider} is unavailable`);
    }

    // Return capability-specific mock output
    switch (capability) {
      case CapabilityType.GENERATE:
        return this.executeGenerate(input as GenerateInput, parameters);
      case CapabilityType.CLASSIFY:
        return this.executeClassify(input as ClassifyInput, parameters);
      case CapabilityType.RECOMMEND:
        return this.executeRecommend(input as RecommendInput, parameters);
      case CapabilityType.FORECAST:
        return this.executeForecast(input as ForecastInput, parameters);
      case CapabilityType.NEGOTIATE:
        return this.executeNegotiate(input as NegotiateInput, parameters);
      default:
        throw new Error(`Unknown capability: ${capability}`);
    }
  }

  async estimateCost(capability: CapabilityType, input: any, parameters: Record<string, any>): Promise<number> {
    // Simple cost estimation based on capability
    const baseCosts: Record<CapabilityType, number> = {
      [CapabilityType.GENERATE]: 0.002,
      [CapabilityType.CLASSIFY]: 0.001,
      [CapabilityType.RECOMMEND]: 0.003,
      [CapabilityType.FORECAST]: 0.005,
      [CapabilityType.NEGOTIATE]: 0.004
    };
    return baseCosts[capability] || 0.001;
  }

  async checkAvailability(): Promise<boolean> {
    return this.available;
  }

  getSupportedCapabilities(): CapabilityType[] {
    return this.supportedCapabilities;
  }

  setAvailable(available: boolean): void {
    this.available = available;
  }

  private executeGenerate(input: GenerateInput, parameters: Record<string, any>): GenerateOutput {
    return {
      type: input.type,
      content: `Generated ${input.type.toLowerCase()} content for: ${input.prompt}`,
      metadata: {
        model: `${this.provider}-model`,
        finishReason: 'stop'
      }
    };
  }

  private executeClassify(input: ClassifyInput, parameters: Record<string, any>): ClassifyOutput {
    const categories = input.categories || ['positive', 'negative', 'neutral'];
    return {
      type: input.type,
      result: categories[0],
      confidence: 0.95,
      scores: categories.reduce((acc, cat, idx) => {
        acc[cat] = idx === 0 ? 0.95 : 0.025;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  private executeRecommend(input: RecommendInput, parameters: Record<string, any>): RecommendOutput {
    const count = parameters.count || 5;
    return {
      type: input.type,
      recommendations: Array.from({ length: count }, (_, i) => ({
        item: `item-${i + 1}`,
        score: 0.9 - (i * 0.1),
        reason: `Recommended based on ${input.type.toLowerCase()} analysis`
      }))
    };
  }

  private executeForecast(input: ForecastInput, parameters: Record<string, any>): ForecastOutput {
    const horizon = input.horizon;
    const lastValue = input.historicalData[input.historicalData.length - 1]?.value || 100;
    
    return {
      type: input.type,
      forecast: Array.from({ length: horizon }, (_, i) => ({
        timestamp: new Date(Date.now() + (i + 1) * 86400000),
        value: lastValue * (1 + Math.random() * 0.1),
        lower: lastValue * 0.9,
        upper: lastValue * 1.1,
        confidence: 0.95
      })),
      metadata: {
        model: `${this.provider}-forecast`,
        accuracy: 0.92
      }
    };
  }

  private executeNegotiate(input: NegotiateInput, parameters: Record<string, any>): NegotiateOutput {
    const currentPrice = input.context.currentOffer?.price || 100;
    return {
      type: input.type,
      counterOffer: { price: currentPrice * 0.95 },
      reasoning: 'Counter-offer based on market analysis',
      confidence: 0.85
    };
  }
}


// Capability Manager that orchestrates providers
class MockCapabilityManager {
  private adapters: Map<AIProvider, MockProviderAdapter> = new Map();

  registerAdapter(adapter: MockProviderAdapter): void {
    this.adapters.set(adapter.provider, adapter);
  }

  async executeCapability(
    capability: CapabilityType,
    input: any,
    parameters: Record<string, any> = {},
    preferredProvider?: AIProvider
  ): Promise<{ output: any; provider: AIProvider; cost: number }> {
    // Find suitable provider
    const adapter = await this.findAdapter(capability, preferredProvider);
    
    if (!adapter) {
      throw new Error(`No provider available for capability: ${capability}`);
    }

    const cost = await adapter.estimateCost(capability, input, parameters);
    const output = await adapter.execute(capability, input, parameters);

    return { output, provider: adapter.provider, cost };
  }

  private async findAdapter(capability: CapabilityType, preferredProvider?: AIProvider): Promise<MockProviderAdapter | null> {
    // Try preferred provider first
    if (preferredProvider) {
      const adapter = this.adapters.get(preferredProvider);
      if (adapter && 
          adapter.getSupportedCapabilities().includes(capability) &&
          await adapter.checkAvailability()) {
        return adapter;
      }
    }

    // Find any available provider
    for (const adapter of this.adapters.values()) {
      if (adapter.getSupportedCapabilities().includes(capability) &&
          await adapter.checkAvailability()) {
        return adapter;
      }
    }

    return null;
  }

  getAvailableProviders(capability: CapabilityType): AIProvider[] {
    const providers: AIProvider[] = [];
    for (const adapter of this.adapters.values()) {
      if (adapter.getSupportedCapabilities().includes(capability)) {
        providers.push(adapter.provider);
      }
    }
    return providers;
  }
}


describe('Provider Adapter Interface (INV-009)', () => {
  let openaiAdapter: MockProviderAdapter;
  let anthropicAdapter: MockProviderAdapter;

  beforeEach(() => {
    openaiAdapter = new MockProviderAdapter(AIProvider.OPENAI, [
      CapabilityType.GENERATE,
      CapabilityType.CLASSIFY,
      CapabilityType.RECOMMEND
    ]);

    anthropicAdapter = new MockProviderAdapter(AIProvider.ANTHROPIC, [
      CapabilityType.GENERATE,
      CapabilityType.CLASSIFY,
      CapabilityType.NEGOTIATE
    ]);
  });

  it('should return supported capabilities', () => {
    const capabilities = openaiAdapter.getSupportedCapabilities();
    
    expect(capabilities).toContain(CapabilityType.GENERATE);
    expect(capabilities).toContain(CapabilityType.CLASSIFY);
    expect(capabilities).not.toContain(CapabilityType.FORECAST);
  });

  it('should check availability', async () => {
    expect(await openaiAdapter.checkAvailability()).toBe(true);
    
    openaiAdapter.setAvailable(false);
    expect(await openaiAdapter.checkAvailability()).toBe(false);
  });

  it('should estimate cost', async () => {
    const cost = await openaiAdapter.estimateCost(
      CapabilityType.GENERATE,
      { type: 'TEXT', prompt: 'Test' },
      {}
    );

    expect(cost).toBeGreaterThan(0);
  });

  it('should execute supported capability', async () => {
    const input: GenerateInput = {
      type: 'TEXT',
      prompt: 'Generate a story'
    };

    const output = await openaiAdapter.execute(CapabilityType.GENERATE, input, {});
    
    expect(output.type).toBe('TEXT');
    expect(output.content).toBeDefined();
  });

  it('should reject unsupported capability', async () => {
    await expect(
      openaiAdapter.execute(CapabilityType.FORECAST, {}, {})
    ).rejects.toThrow('Capability FORECAST not supported');
  });
});


describe('Capability Manager', () => {
  let manager: MockCapabilityManager;
  let openaiAdapter: MockProviderAdapter;
  let anthropicAdapter: MockProviderAdapter;

  beforeEach(() => {
    manager = new MockCapabilityManager();
    
    openaiAdapter = new MockProviderAdapter(AIProvider.OPENAI, [
      CapabilityType.GENERATE,
      CapabilityType.CLASSIFY,
      CapabilityType.RECOMMEND,
      CapabilityType.FORECAST
    ]);

    anthropicAdapter = new MockProviderAdapter(AIProvider.ANTHROPIC, [
      CapabilityType.GENERATE,
      CapabilityType.CLASSIFY,
      CapabilityType.NEGOTIATE
    ]);

    manager.registerAdapter(openaiAdapter);
    manager.registerAdapter(anthropicAdapter);
  });

  it('should list available providers for capability', () => {
    const generateProviders = manager.getAvailableProviders(CapabilityType.GENERATE);
    const forecastProviders = manager.getAvailableProviders(CapabilityType.FORECAST);

    expect(generateProviders).toContain(AIProvider.OPENAI);
    expect(generateProviders).toContain(AIProvider.ANTHROPIC);
    expect(forecastProviders).toContain(AIProvider.OPENAI);
    expect(forecastProviders).not.toContain(AIProvider.ANTHROPIC);
  });

  it('should execute with preferred provider', async () => {
    const result = await manager.executeCapability(
      CapabilityType.GENERATE,
      { type: 'TEXT', prompt: 'Test' },
      {},
      AIProvider.ANTHROPIC
    );

    expect(result.provider).toBe(AIProvider.ANTHROPIC);
    expect(result.output).toBeDefined();
  });

  it('should fallback to available provider', async () => {
    anthropicAdapter.setAvailable(false);

    const result = await manager.executeCapability(
      CapabilityType.GENERATE,
      { type: 'TEXT', prompt: 'Test' },
      {},
      AIProvider.ANTHROPIC // Preferred but unavailable
    );

    expect(result.provider).toBe(AIProvider.OPENAI);
  });

  it('should throw when no provider available', async () => {
    openaiAdapter.setAvailable(false);
    anthropicAdapter.setAvailable(false);

    await expect(
      manager.executeCapability(CapabilityType.GENERATE, { type: 'TEXT', prompt: 'Test' }, {})
    ).rejects.toThrow('No provider available');
  });

  it('should include cost in result', async () => {
    const result = await manager.executeCapability(
      CapabilityType.CLASSIFY,
      { type: 'SENTIMENT', text: 'Great product!' },
      {}
    );

    expect(result.cost).toBeGreaterThan(0);
  });
});


describe('Generate Capability Abstraction', () => {
  let manager: MockCapabilityManager;

  beforeEach(() => {
    manager = new MockCapabilityManager();
    manager.registerAdapter(new MockProviderAdapter(AIProvider.OPENAI, [CapabilityType.GENERATE]));
  });

  it('should generate text content', async () => {
    const input: GenerateInput = {
      type: 'TEXT',
      prompt: 'Write a poem about nature'
    };

    const result = await manager.executeCapability(CapabilityType.GENERATE, input, {});
    
    expect(result.output.type).toBe('TEXT');
    expect(result.output.content).toContain('Generated');
  });

  it('should generate code content', async () => {
    const input: GenerateInput = {
      type: 'CODE',
      prompt: 'Write a function to sort an array',
      parameters: { language: 'typescript' }
    };

    const result = await manager.executeCapability(CapabilityType.GENERATE, input, {});
    
    expect(result.output.type).toBe('CODE');
  });

  it('should include metadata in output', async () => {
    const input: GenerateInput = {
      type: 'TEXT',
      prompt: 'Test'
    };

    const result = await manager.executeCapability(CapabilityType.GENERATE, input, {});
    
    expect(result.output.metadata).toBeDefined();
    expect(result.output.metadata.model).toBeDefined();
  });
});


describe('Classify Capability Abstraction', () => {
  let manager: MockCapabilityManager;

  beforeEach(() => {
    manager = new MockCapabilityManager();
    manager.registerAdapter(new MockProviderAdapter(AIProvider.OPENAI, [CapabilityType.CLASSIFY]));
  });

  it('should classify sentiment', async () => {
    const input: ClassifyInput = {
      type: 'SENTIMENT',
      text: 'This product is amazing!'
    };

    const result = await manager.executeCapability(CapabilityType.CLASSIFY, input, {});
    
    expect(result.output.type).toBe('SENTIMENT');
    expect(result.output.result).toBeDefined();
    expect(result.output.confidence).toBeGreaterThan(0);
  });

  it('should classify with custom categories', async () => {
    const input: ClassifyInput = {
      type: 'CATEGORY',
      text: 'I need help with my order',
      categories: ['support', 'sales', 'billing']
    };

    const result = await manager.executeCapability(CapabilityType.CLASSIFY, input, {});
    
    expect(result.output.scores).toBeDefined();
    expect(Object.keys(result.output.scores)).toContain('support');
  });
});


describe('Recommend Capability Abstraction', () => {
  let manager: MockCapabilityManager;

  beforeEach(() => {
    manager = new MockCapabilityManager();
    manager.registerAdapter(new MockProviderAdapter(AIProvider.OPENAI, [CapabilityType.RECOMMEND]));
  });

  it('should generate product recommendations', async () => {
    const input: RecommendInput = {
      type: 'PRODUCT',
      context: {
        userId: 'user-001',
        history: ['product-001', 'product-002']
      }
    };

    const result = await manager.executeCapability(CapabilityType.RECOMMEND, input, { count: 5 });
    
    expect(result.output.type).toBe('PRODUCT');
    expect(result.output.recommendations).toHaveLength(5);
    expect(result.output.recommendations[0].score).toBeGreaterThan(0);
  });

  it('should include recommendation reasons', async () => {
    const input: RecommendInput = {
      type: 'CONTENT',
      context: { userId: 'user-001' }
    };

    const result = await manager.executeCapability(CapabilityType.RECOMMEND, input, { count: 3 });
    
    expect(result.output.recommendations[0].reason).toBeDefined();
  });
});


describe('Forecast Capability Abstraction', () => {
  let manager: MockCapabilityManager;

  beforeEach(() => {
    manager = new MockCapabilityManager();
    manager.registerAdapter(new MockProviderAdapter(AIProvider.OPENAI, [CapabilityType.FORECAST]));
  });

  it('should generate demand forecast', async () => {
    const input: ForecastInput = {
      type: 'DEMAND',
      historicalData: [
        { timestamp: new Date('2024-01-01'), value: 100 },
        { timestamp: new Date('2024-01-02'), value: 110 },
        { timestamp: new Date('2024-01-03'), value: 105 }
      ],
      horizon: 7
    };

    const result = await manager.executeCapability(CapabilityType.FORECAST, input, {});
    
    expect(result.output.type).toBe('DEMAND');
    expect(result.output.forecast).toHaveLength(7);
  });

  it('should include confidence intervals', async () => {
    const input: ForecastInput = {
      type: 'TREND',
      historicalData: [{ timestamp: new Date(), value: 100 }],
      horizon: 3
    };

    const result = await manager.executeCapability(CapabilityType.FORECAST, input, {});
    
    const forecast = result.output.forecast[0];
    expect(forecast.lower).toBeDefined();
    expect(forecast.upper).toBeDefined();
    expect(forecast.confidence).toBeDefined();
  });
});


describe('Negotiate Capability Abstraction', () => {
  let manager: MockCapabilityManager;

  beforeEach(() => {
    manager = new MockCapabilityManager();
    manager.registerAdapter(new MockProviderAdapter(AIProvider.ANTHROPIC, [CapabilityType.NEGOTIATE]));
  });

  it('should generate counter-offer', async () => {
    const input: NegotiateInput = {
      type: 'PRICING',
      context: {
        parties: ['buyer', 'seller'],
        currentOffer: { price: 100 },
        constraints: { minPrice: 80, maxPrice: 120 }
      }
    };

    const result = await manager.executeCapability(CapabilityType.NEGOTIATE, input, {});
    
    expect(result.output.type).toBe('PRICING');
    expect(result.output.counterOffer).toBeDefined();
    expect(result.output.counterOffer.price).toBeLessThan(100);
  });

  it('should include reasoning', async () => {
    const input: NegotiateInput = {
      type: 'TERMS',
      context: {
        parties: ['party1', 'party2'],
        currentOffer: {},
        constraints: {}
      }
    };

    const result = await manager.executeCapability(CapabilityType.NEGOTIATE, input, {});
    
    expect(result.output.reasoning).toBeDefined();
    expect(result.output.confidence).toBeGreaterThan(0);
  });
});
