/**
 * Type Definitions for AI & High-Complexity Readiness
 * 
 * Defines core types for AI job orchestration, BYOK, billing, capabilities, vector DB, and geospatial services.
 */

// ============================================================================
// AI Job Orchestration Types
// ============================================================================

/**
 * AI Capability Types
 */
export enum CapabilityType {
  GENERATE = 'GENERATE',
  CLASSIFY = 'CLASSIFY',
  RECOMMEND = 'RECOMMEND',
  FORECAST = 'FORECAST',
  NEGOTIATE = 'NEGOTIATE'
}

/**
 * AI Provider Types
 */
export enum AIProvider {
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  GOOGLE = 'GOOGLE',
  LOCAL = 'LOCAL',
  CUSTOM = 'CUSTOM'
}

/**
 * Job Priority Levels
 */
export enum JobPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

/**
 * Job Status
 */
export enum JobStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

/**
 * AI Job
 */
export interface AIJob {
  jobId: string;
  tenantId: string;
  userId: string;
  capability: CapabilityType;
  provider?: AIProvider;
  priority: JobPriority;
  status: JobStatus;
  input: any;
  parameters: Record<string, any>;
  output?: any;
  error?: string;
  cost?: number;
  tokenCount?: {
    prompt: number;
    completion: number;
    total: number;
  };
  executionTime?: number;
  cacheHit: boolean;
  callbackUrl?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * AI Job Request
 */
export interface AIJobRequest {
  capability: CapabilityType;
  input: any;
  parameters?: Record<string, any>;
  priority?: JobPriority;
  provider?: AIProvider;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * AI Job Result
 */
export interface AIJobResult {
  jobId: string;
  status: JobStatus;
  output?: any;
  error?: string;
  cost?: number;
  tokenCount?: {
    prompt: number;
    completion: number;
    total: number;
  };
  executionTime?: number;
  cacheHit: boolean;
  completedAt?: Date;
}

// ============================================================================
// Provider Adapter Types
// ============================================================================

/**
 * Provider Adapter Interface
 */
export interface IProviderAdapter {
  provider: AIProvider;
  execute(capability: CapabilityType, input: any, parameters: Record<string, any>): Promise<any>;
  estimateCost(capability: CapabilityType, input: any, parameters: Record<string, any>): Promise<number>;
  checkAvailability(): Promise<boolean>;
  getSupportedCapabilities(): CapabilityType[];
}

/**
 * Provider Configuration
 */
export interface ProviderConfig {
  provider: AIProvider;
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  maxRetries: number;
  timeout: number;
  enabled: boolean;
}

/**
 * Provider Health Status
 */
export interface ProviderHealth {
  provider: AIProvider;
  available: boolean;
  latency: number;
  errorRate: number;
  lastCheck: Date;
}

// ============================================================================
// BYOK (Bring Your Own Keys) Types
// ============================================================================

/**
 * Actor Levels for BYOK
 */
export enum ActorLevel {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PARTNER = 'PARTNER',
  CLIENT = 'CLIENT',
  MERCHANT_VENDOR = 'MERCHANT_VENDOR',
  AGENT = 'AGENT',
  STAFF = 'STAFF'
}

/**
 * API Key
 */
export interface APIKey {
  keyId: string;
  tenantId: string;
  actorLevel: ActorLevel;
  actorId: string;
  provider: AIProvider;
  encryptedKey: string;
  keyHash: string;
  capabilities: CapabilityType[];
  usageLimit?: {
    requests?: number;
    tokens?: number;
    cost?: number;
    period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  };
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  rotationSchedule?: {
    frequency: number; // days
    nextRotation: Date;
  };
  metadata?: Record<string, any>;
}

/**
 * API Key Request
 */
export interface APIKeyRequest {
  provider: AIProvider;
  apiKey: string;
  capabilities?: CapabilityType[];
  usageLimit?: {
    requests?: number;
    tokens?: number;
    cost?: number;
    period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  };
  expiresAt?: Date;
  rotationSchedule?: {
    frequency: number;
  };
}

/**
 * Key Validation Result
 */
export interface KeyValidationResult {
  valid: boolean;
  provider: AIProvider;
  capabilities: CapabilityType[];
  error?: string;
}

// ============================================================================
// Billing Integration Types
// ============================================================================

/**
 * Billing Model Types
 */
export enum BillingModel {
  PAY_PER_REQUEST = 'PAY_PER_REQUEST',
  PAY_PER_TOKEN = 'PAY_PER_TOKEN',
  BUNDLED = 'BUNDLED',
  SUBSCRIPTION = 'SUBSCRIPTION',
  FREE_TIER = 'FREE_TIER'
}

/**
 * Usage Record
 */
export interface UsageRecord {
  recordId: string;
  tenantId: string;
  userId: string;
  jobId: string;
  capability: CapabilityType;
  provider: AIProvider;
  billingModel: BillingModel;
  requestCount: number;
  tokenCount?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;
  markup?: number;
  subsidy?: number;
  netCost: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Usage Summary
 */
export interface UsageSummary {
  tenantId: string;
  userId?: string;
  period: {
    start: Date;
    end: Date;
  };
  totalRequests: number;
  totalTokens?: number;
  totalCost: number;
  byCapability: Record<CapabilityType, {
    requests: number;
    tokens?: number;
    cost: number;
  }>;
  byProvider: Record<AIProvider, {
    requests: number;
    tokens?: number;
    cost: number;
  }>;
}

/**
 * Usage Cap
 */
export interface UsageCap {
  capId: string;
  tenantId: string;
  userId?: string;
  capType: 'REQUESTS' | 'TOKENS' | 'COST';
  limit: number;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  currentUsage: number;
  resetAt: Date;
  alertThresholds: number[]; // e.g., [0.5, 0.75, 0.9]
  enabled: boolean;
}

/**
 * Usage Alert
 */
export interface UsageAlert {
  alertId: string;
  tenantId: string;
  userId?: string;
  capId: string;
  threshold: number;
  currentUsage: number;
  limit: number;
  message: string;
  sentAt: Date;
}

// ============================================================================
// Abstract Capability Contract Types
// ============================================================================

/**
 * Generate Capability Input
 */
export interface GenerateInput {
  type: 'TEXT' | 'CODE' | 'IMAGE';
  prompt: string;
  context?: string;
  parameters?: {
    maxLength?: number;
    temperature?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    language?: string;
    style?: string;
  };
}

/**
 * Generate Capability Output
 */
export interface GenerateOutput {
  type: 'TEXT' | 'CODE' | 'IMAGE';
  content: string | Buffer;
  metadata?: {
    model?: string;
    finishReason?: string;
    [key: string]: any;
  };
}

/**
 * Classify Capability Input
 */
export interface ClassifyInput {
  type: 'SENTIMENT' | 'CATEGORY' | 'INTENT';
  text: string;
  categories?: string[];
  parameters?: {
    threshold?: number;
    multilabel?: boolean;
  };
}

/**
 * Classify Capability Output
 */
export interface ClassifyOutput {
  type: 'SENTIMENT' | 'CATEGORY' | 'INTENT';
  result: string | string[];
  confidence: number;
  scores?: Record<string, number>;
  metadata?: Record<string, any>;
}

/**
 * Recommend Capability Input
 */
export interface RecommendInput {
  type: 'PRODUCT' | 'CONTENT' | 'ACTION';
  context: {
    userId?: string;
    currentItem?: string;
    history?: string[];
    preferences?: Record<string, any>;
  };
  candidates?: string[];
  parameters?: {
    count?: number;
    diversify?: boolean;
    explainability?: boolean;
  };
}

/**
 * Recommend Capability Output
 */
export interface RecommendOutput {
  type: 'PRODUCT' | 'CONTENT' | 'ACTION';
  recommendations: Array<{
    item: string;
    score: number;
    reason?: string;
    metadata?: Record<string, any>;
  }>;
}

/**
 * Forecast Capability Input
 */
export interface ForecastInput {
  type: 'DEMAND' | 'TREND' | 'OUTCOME';
  historicalData: Array<{
    timestamp: Date;
    value: number;
    metadata?: Record<string, any>;
  }>;
  horizon: number; // forecast periods
  parameters?: {
    confidence?: number;
    seasonality?: boolean;
    externalFactors?: Record<string, any>;
  };
}

/**
 * Forecast Capability Output
 */
export interface ForecastOutput {
  type: 'DEMAND' | 'TREND' | 'OUTCOME';
  forecast: Array<{
    timestamp: Date;
    value: number;
    lower: number;
    upper: number;
    confidence: number;
  }>;
  metadata?: {
    model?: string;
    accuracy?: number;
    [key: string]: any;
  };
}

/**
 * Negotiate Capability Input
 */
export interface NegotiateInput {
  type: 'PRICING' | 'TERMS' | 'CONDITIONS';
  context: {
    parties: string[];
    currentOffer: any;
    constraints: Record<string, any>;
    history?: any[];
  };
  parameters?: {
    strategy?: string;
    maxRounds?: number;
    targetOutcome?: any;
  };
}

/**
 * Negotiate Capability Output
 */
export interface NegotiateOutput {
  type: 'PRICING' | 'TERMS' | 'CONDITIONS';
  counterOffer: any;
  reasoning: string;
  confidence: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// Vector Database Types
// ============================================================================

/**
 * Vector DB Provider
 */
export enum VectorDBProvider {
  PINECONE = 'PINECONE',
  WEAVIATE = 'WEAVIATE',
  QDRANT = 'QDRANT'
}

/**
 * Embedding
 */
export interface Embedding {
  id: string;
  vector: number[];
  metadata?: Record<string, any>;
}

/**
 * Vector Search Request
 */
export interface VectorSearchRequest {
  query: string | number[];
  topK: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
}

/**
 * Vector Search Result
 */
export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: Record<string, any>;
}

/**
 * Embedding Model
 */
export enum EmbeddingModel {
  OPENAI_ADA_002 = 'OPENAI_ADA_002',
  SENTENCE_TRANSFORMERS = 'SENTENCE_TRANSFORMERS',
  CLIP = 'CLIP',
  CUSTOM = 'CUSTOM'
}

// ============================================================================
// Geospatial Service Types
// ============================================================================

/**
 * Geospatial Provider
 */
export enum GeospatialProvider {
  GOOGLE_MAPS = 'GOOGLE_MAPS',
  MAPBOX = 'MAPBOX'
}

/**
 * Location
 */
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  metadata?: Record<string, any>;
}

/**
 * Geocoding Request
 */
export interface GeocodingRequest {
  address: string;
  components?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

/**
 * Geocoding Result
 */
export interface GeocodingResult {
  location: Location;
  formattedAddress: string;
  components: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  confidence: number;
}

/**
 * Distance Request
 */
export interface DistanceRequest {
  origin: Location;
  destination: Location;
  mode: 'DRIVING' | 'WALKING' | 'HAVERSINE';
}

/**
 * Distance Result
 */
export interface DistanceResult {
  distance: number; // meters
  duration?: number; // seconds
  mode: 'DRIVING' | 'WALKING' | 'HAVERSINE';
}

/**
 * Route Request
 */
export interface RouteRequest {
  origin: Location;
  destination: Location;
  waypoints?: Location[];
  mode: 'DRIVING' | 'WALKING';
  optimize?: boolean;
}

/**
 * Route Result
 */
export interface RouteResult {
  distance: number; // meters
  duration: number; // seconds
  polyline: string;
  steps: Array<{
    distance: number;
    duration: number;
    instruction: string;
    location: Location;
  }>;
}

// ============================================================================
// Caching Types
// ============================================================================

/**
 * Cache Entry
 */
export interface CacheEntry {
  key: string;
  value: any;
  ttl: number;
  createdAt: Date;
  expiresAt: Date;
  hits: number;
}

/**
 * Cache Statistics
 */
export interface CacheStatistics {
  hitRate: number;
  missRate: number;
  size: number;
  evictions: number;
  averageLatency: number;
}

// ============================================================================
// Monitoring Types
// ============================================================================

/**
 * System Metrics
 */
export interface SystemMetrics {
  // Job metrics
  jobsSubmittedPerMinute: number;
  jobsCompletedPerMinute: number;
  averageJobLatency: number;
  jobSuccessRate: number;
  jobQueueDepth: number;
  
  // Provider metrics
  providerAvailability: Record<AIProvider, number>;
  providerLatency: Record<AIProvider, number>;
  providerErrorRate: Record<AIProvider, number>;
  
  // Cache metrics
  cacheHitRate: number;
  cacheMissRate: number;
  cacheSize: number;
  
  // Cost metrics
  costPerTenant: Record<string, number>;
  costPerCapability: Record<CapabilityType, number>;
  costPerProvider: Record<AIProvider, number>;
  
  timestamp: Date;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * AI Error
 */
export class AIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AIError';
  }
}

/**
 * Provider Error
 */
export class ProviderError extends AIError {
  constructor(
    message: string,
    public provider: AIProvider,
    details?: any
  ) {
    super(message, 'PROVIDER_ERROR', 502, details);
    this.name = 'ProviderError';
  }
}

/**
 * Usage Limit Exceeded Error
 */
export class UsageLimitExceeded extends AIError {
  constructor(message: string = 'Usage limit exceeded', details?: any) {
    super(message, 'USAGE_LIMIT_EXCEEDED', 429, details);
    this.name = 'UsageLimitExceeded';
  }
}

/**
 * Invalid API Key Error
 */
export class InvalidAPIKeyError extends AIError {
  constructor(message: string = 'Invalid API key', details?: any) {
    super(message, 'INVALID_API_KEY', 401, details);
    this.name = 'InvalidAPIKeyError';
  }
}

/**
 * Capability Not Supported Error
 */
export class CapabilityNotSupportedError extends AIError {
  constructor(
    message: string,
    public capability: CapabilityType,
    public provider: AIProvider
  ) {
    super(message, 'CAPABILITY_NOT_SUPPORTED', 400, { capability, provider });
    this.name = 'CapabilityNotSupportedError';
  }
}
