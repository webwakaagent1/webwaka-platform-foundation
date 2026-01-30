/**
 * Type Definitions for Realtime & Eventing Infrastructure
 * 
 * Defines core types for WebSocket connections, events, and reconciliation.
 */

// ============================================================================
// Realtime Interaction Classes (INV-010)
// ============================================================================

/**
 * Realtime Interaction Class
 * 
 * Defines the four interaction classes per INV-010:
 * - CLASS_A: Live Presence (optional, non-critical)
 * - CLASS_B: Event Streaming (realtime preferred, async fallback required)
 * - CLASS_C: Low-Latency Interactions (realtime required for experience, not correctness)
 * - CLASS_D: Critical Transactions (realtime explicitly NOT allowed)
 */
export enum InteractionClass {
  CLASS_A = 'CLASS_A', // Live Presence
  CLASS_B = 'CLASS_B', // Event Streaming
  CLASS_C = 'CLASS_C', // Low-Latency Interactions
  CLASS_D = 'CLASS_D'  // Critical Transactions (no realtime)
}

// ============================================================================
// WebSocket Types
// ============================================================================

/**
 * WebSocket Connection State
 */
export enum ConnectionState {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTING = 'DISCONNECTING',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING'
}

/**
 * WebSocket Connection Metadata
 */
export interface ConnectionMetadata {
  connectionId: string;
  tenantId: string;
  userId: string;
  clientId: string;
  serverInstanceId: string;
  connectedAt: Date;
  lastSeenAt: Date;
  clientIp: string;
  userAgent: string;
  state: ConnectionState;
}

/**
 * WebSocket Message
 */
export interface WebSocketMessage {
  messageId: string;
  type: string;
  interactionClass: InteractionClass;
  tenantId: string;
  senderId: string;
  recipientId?: string;
  roomId?: string;
  payload: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Presence Information
 */
export interface PresenceInfo {
  userId: string;
  tenantId: string;
  status: 'online' | 'away' | 'offline';
  lastActive: Date;
  metadata?: Record<string, any>;
}

/**
 * Room Membership
 */
export interface RoomMembership {
  roomId: string;
  tenantId: string;
  userId: string;
  joinedAt: Date;
  metadata?: Record<string, any>;
}

// ============================================================================
// Event Bus Types
// ============================================================================

/**
 * Event
 */
export interface Event {
  eventId: string;
  eventType: string;
  tenantId: string;
  timestamp: Date;
  payload: any;
  metadata: EventMetadata;
  schemaVersion: string;
}

/**
 * Event Metadata
 */
export interface EventMetadata {
  correlationId?: string;
  causationId?: string;
  traceId?: string;
  source: string;
  userId?: string;
  [key: string]: any;
}

/**
 * Event Subscription
 */
export interface EventSubscription {
  subscriptionId: string;
  tenantId: string;
  eventTypes: string[];
  consumerGroup?: string;
  filter?: EventFilter;
  callback: (event: Event) => Promise<void>;
}

/**
 * Event Filter
 */
export interface EventFilter {
  eventTypes?: string[];
  tenantId?: string;
  userId?: string;
  customFilter?: (event: Event) => boolean;
}

/**
 * Dead Letter Queue Entry
 */
export interface DLQEntry {
  dlqId: string;
  originalEvent: Event;
  failureReason: string;
  failureStackTrace?: string;
  retryCount: number;
  firstFailedAt: Date;
  lastFailedAt: Date;
  consumerInfo: {
    consumerId: string;
    consumerGroup?: string;
  };
}

// ============================================================================
// Offline Reconciliation Types
// ============================================================================

/**
 * Vector Clock
 */
export type VectorClock = Record<string, number>;

/**
 * Operation
 */
export interface Operation {
  operationId: string;
  clientId: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  operationType: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  timestamp: Date;
  vectorClock: VectorClock;
  metadata?: Record<string, any>;
}

/**
 * Conflict
 */
export interface Conflict {
  conflictId: string;
  entityType: string;
  entityId: string;
  operations: Operation[];
  detectedAt: Date;
  resolution?: ConflictResolution;
}

/**
 * Conflict Resolution Strategy
 */
export enum ResolutionStrategy {
  LAST_WRITE_WINS = 'LAST_WRITE_WINS',
  CUSTOM_MERGE = 'CUSTOM_MERGE',
  MANUAL = 'MANUAL',
  FIELD_LEVEL_MERGE = 'FIELD_LEVEL_MERGE'
}

/**
 * Conflict Resolution
 */
export interface ConflictResolution {
  strategy: ResolutionStrategy;
  resolvedAt: Date;
  resolvedBy?: string; // userId for manual resolution
  result: any;
  metadata?: Record<string, any>;
}

/**
 * Reconciliation Request
 */
export interface ReconciliationRequest {
  requestId: string;
  clientId: string;
  tenantId: string;
  lastKnownVersion?: string;
  operations: Operation[];
  requestedAt: Date;
}

/**
 * Reconciliation Response
 */
export interface ReconciliationResponse {
  requestId: string;
  conflicts: Conflict[];
  resolvedOperations: Operation[];
  currentVersion: string;
  deltaUpdates?: any[];
  snapshot?: any;
  completedAt: Date;
}

/**
 * State Snapshot
 */
export interface StateSnapshot {
  snapshotId: string;
  tenantId: string;
  entityType: string;
  version: string;
  data: any;
  createdAt: Date;
  checksum: string;
}

// ============================================================================
// Fallback Types
// ============================================================================

/**
 * Fallback Mode
 */
export enum FallbackMode {
  NONE = 'NONE',
  EVENT_QUEUE = 'EVENT_QUEUE',
  POLLING = 'POLLING',
  DELAYED_RECONCILIATION = 'DELAYED_RECONCILIATION',
  SNAPSHOT_REFRESH = 'SNAPSHOT_REFRESH',
  ASYNC_CONFIRMATION = 'ASYNC_CONFIRMATION'
}

/**
 * Fallback Configuration
 */
export interface FallbackConfig {
  interactionClass: InteractionClass;
  mode: FallbackMode;
  pollingInterval?: number; // milliseconds
  queueSize?: number;
  retryPolicy?: RetryPolicy;
}

/**
 * Retry Policy
 */
export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
}

/**
 * Event Queue
 */
export interface EventQueue {
  queueId: string;
  clientId: string;
  tenantId: string;
  events: Event[];
  createdAt: Date;
  lastAccessedAt: Date;
}

// ============================================================================
// Health & Monitoring Types
// ============================================================================

/**
 * Health Status
 */
export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY'
}

/**
 * Service Health
 */
export interface ServiceHealth {
  service: string;
  status: HealthStatus;
  lastCheck: Date;
  metrics: Record<string, number>;
  message?: string;
}

/**
 * System Metrics
 */
export interface SystemMetrics {
  // Connection metrics
  activeConnections: number;
  connectionRate: number;
  disconnectionRate: number;
  reconnectionRate: number;
  
  // Message metrics
  messagesSentPerSecond: number;
  messagesReceivedPerSecond: number;
  averageMessageLatency: number;
  messageQueueDepth: number;
  
  // Event metrics
  eventsPublishedPerSecond: number;
  eventsConsumedPerSecond: number;
  consumerLag: Record<string, number>;
  dlqSize: number;
  
  // Reconciliation metrics
  reconciliationRequestsPerMinute: number;
  averageReconciliationDuration: number;
  conflictDetectionRate: number;
  conflictResolutionSuccessRate: number;
  
  timestamp: Date;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * WebSocket Configuration
 */
export interface WebSocketConfig {
  port: number;
  path: string;
  pingInterval: number;
  pingTimeout: number;
  maxConnections: number;
  messageRateLimit: number;
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
}

/**
 * Event Bus Configuration
 */
export interface EventBusConfig {
  redisUrl: string;
  streamName: string;
  consumerGroupName: string;
  maxRetries: number;
  retentionPeriod: number; // milliseconds
  batchSize: number;
}

/**
 * Reconciliation Configuration
 */
export interface ReconciliationConfig {
  defaultStrategy: ResolutionStrategy;
  maxQueueSize: number;
  processingTimeout: number; // milliseconds
  snapshotThreshold: number; // number of operations
}

// ============================================================================
// Audit Types
// ============================================================================

/**
 * Audit Log Entry
 */
export interface AuditLogEntry {
  auditId: string;
  timestamp: Date;
  tenantId: string;
  actorType: 'USER' | 'SYSTEM' | 'SUPER_ADMIN';
  actorId: string;
  action: string;
  resource: string;
  resourceId?: string;
  result: 'SUCCESS' | 'FAILURE';
  justification?: string; // Required for SUPER_ADMIN
  metadata?: Record<string, any>;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Realtime Error
 */
export class RealtimeError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'RealtimeError';
  }
}

/**
 * Authentication Error
 */
export class AuthenticationError extends RealtimeError {
  constructor(message: string = 'Authentication failed', details?: any) {
    super(message, 'AUTH_FAILED', 401, details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization Error
 */
export class AuthorizationError extends RealtimeError {
  constructor(message: string = 'Authorization failed', details?: any) {
    super(message, 'AUTHZ_FAILED', 403, details);
    this.name = 'AuthorizationError';
  }
}

/**
 * Tenant Isolation Violation
 */
export class TenantIsolationViolation extends RealtimeError {
  constructor(message: string = 'Tenant isolation violation', details?: any) {
    super(message, 'TENANT_VIOLATION', 403, details);
    this.name = 'TenantIsolationViolation';
  }
}

/**
 * Rate Limit Exceeded
 */
export class RateLimitExceeded extends RealtimeError {
  constructor(message: string = 'Rate limit exceeded', details?: any) {
    super(message, 'RATE_LIMIT', 429, details);
    this.name = 'RateLimitExceeded';
  }
}
