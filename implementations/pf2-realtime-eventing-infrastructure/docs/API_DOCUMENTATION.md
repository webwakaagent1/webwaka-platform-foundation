# PF-2: Realtime & Eventing Infrastructure - API Documentation

**Version:** 1.0  
**Date:** January 30, 2026

---

## Overview

This document provides comprehensive API documentation for the Realtime & Eventing Infrastructure, including WebSocket events, REST endpoints, and event bus interfaces.

---

## WebSocket API

### Connection

**Endpoint:** `ws://localhost:3000/socket.io`  
**Protocol:** Socket.IO v4  
**Authentication:** JWT token required

#### Connection Parameters

```javascript
{
  auth: {
    token: string  // JWT token with tenantId and userId claims
  },
  query: {
    clientId?: string  // Optional client identifier (generated if not provided)
  }
}
```

#### Connection Example

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
  query: { clientId: 'client-123' }
});
```

---

### Events: Client → Server

#### `message` - Send Message

Send a message to a specific user or room.

**Interaction Class:** B or C  
**Payload:**

```typescript
{
  type: string;                    // Message type (e.g., 'chat.message')
  interactionClass?: InteractionClass;  // Optional, defaults to CLASS_C
  recipientId?: string;            // User ID for direct message
  roomId?: string;                 // Room ID for broadcast
  payload: any;                    // Message payload
  metadata?: Record<string, any>;  // Optional metadata
}
```

**Example:**

```javascript
socket.emit('message', {
  type: 'chat.message',
  recipientId: 'user-456',
  payload: {
    text: 'Hello, World!',
    timestamp: new Date().toISOString()
  }
});
```

**Response:** `message_ack` event with messageId

---

#### `join_room` - Join Room

Join a room for group messaging.

**Interaction Class:** C  
**Payload:**

```typescript
{
  roomId: string;  // Room identifier
}
```

**Example:**

```javascript
socket.emit('join_room', {
  roomId: 'room-789'
});
```

**Response:** `room_joined` event

---

#### `leave_room` - Leave Room

Leave a room.

**Interaction Class:** C  
**Payload:**

```typescript
{
  roomId: string;  // Room identifier
}
```

**Example:**

```javascript
socket.emit('leave_room', {
  roomId: 'room-789'
});
```

**Response:** `room_left` event

---

#### `presence_update` - Update Presence

Update user presence status (Class A interaction).

**Interaction Class:** A  
**Payload:**

```typescript
{
  status: 'online' | 'away' | 'offline';
  metadata?: Record<string, any>;  // Optional presence metadata
}
```

**Example:**

```javascript
socket.emit('presence_update', {
  status: 'away',
  metadata: {
    statusMessage: 'In a meeting'
  }
});
```

**Response:** None (Class A is fire-and-forget)

---

#### `ping` - Heartbeat

Send heartbeat to maintain connection.

**Interaction Class:** N/A (Infrastructure)  
**Payload:** None

**Example:**

```javascript
socket.emit('ping');
```

**Response:** `pong` event

---

### Events: Server → Client

#### `connected` - Connection Established

Sent when connection is successfully established.

**Payload:**

```typescript
{
  connectionId: string;           // Unique connection identifier
  serverTime: string;             // Server timestamp (ISO 8601)
  interactionClasses: string[];   // Supported interaction classes
}
```

**Example:**

```javascript
socket.on('connected', (data) => {
  console.log('Connected:', data);
  // { connectionId: 'abc123', serverTime: '2026-01-30T...', interactionClasses: [...] }
});
```

---

#### `message` - Receive Message

Receive a message from another user or room.

**Payload:**

```typescript
{
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
```

**Example:**

```javascript
socket.on('message', (message) => {
  console.log('Received:', message);
  // Handle message based on type
});
```

---

#### `message_ack` - Message Acknowledged

Acknowledgment that a sent message was received by the server.

**Payload:**

```typescript
{
  messageId: string;  // ID of acknowledged message
}
```

**Example:**

```javascript
socket.on('message_ack', (ack) => {
  console.log('Message acknowledged:', ack.messageId);
});
```

---

#### `room_joined` - Room Joined

Confirmation that room was joined successfully.

**Payload:**

```typescript
{
  roomId: string;  // Room identifier
}
```

**Example:**

```javascript
socket.on('room_joined', (data) => {
  console.log('Joined room:', data.roomId);
});
```

---

#### `room_left` - Room Left

Confirmation that room was left successfully.

**Payload:**

```typescript
{
  roomId: string;  // Room identifier
}
```

**Example:**

```javascript
socket.on('room_left', (data) => {
  console.log('Left room:', data.roomId);
});
```

---

#### `pong` - Heartbeat Response

Response to ping heartbeat.

**Payload:** None

**Example:**

```javascript
socket.on('pong', () => {
  console.log('Heartbeat received');
});
```

---

#### `error` - Error Occurred

Error notification from server.

**Payload:**

```typescript
{
  error: string;  // Error message
  code?: string;  // Error code
  details?: any;  // Additional error details
}
```

**Example:**

```javascript
socket.on('error', (error) => {
  console.error('Error:', error);
});
```

---

## REST API

### Polling Endpoint (Class B Fallback)

**Endpoint:** `GET /api/events/poll`  
**Method:** GET  
**Authentication:** Bearer token required  
**Headers:**
- `Authorization: Bearer <jwt>`
- `X-Tenant-ID: <tenant-id>`

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lastEventId` | string | No | Last received event ID (for pagination) |
| `limit` | number | No | Maximum events to return (default: 100) |

#### Response

```typescript
{
  events: Event[];      // Array of events
  hasMore: boolean;     // More events available
  nextEventId: string;  // ID for next poll request
}
```

#### Example

```bash
curl -X GET "http://localhost:3000/api/events/poll?lastEventId=evt-123&limit=50" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Tenant-ID: tenant-456"
```

**Response:**

```json
{
  "events": [
    {
      "eventId": "evt-124",
      "eventType": "order.placed",
      "tenantId": "tenant-456",
      "timestamp": "2026-01-30T12:00:00Z",
      "payload": { "orderId": "order-789" },
      "metadata": { "source": "order-service" },
      "schemaVersion": "1.0"
    }
  ],
  "hasMore": true,
  "nextEventId": "evt-125"
}
```

---

### Reconciliation Endpoint

**Endpoint:** `POST /api/reconciliation/reconcile`  
**Method:** POST  
**Authentication:** Bearer token required  
**Headers:**
- `Authorization: Bearer <jwt>`
- `X-Tenant-ID: <tenant-id>`
- `Content-Type: application/json`

#### Request Body

```typescript
{
  requestId: string;
  clientId: string;
  tenantId: string;
  lastKnownVersion?: string;
  operations: Operation[];
  requestedAt: Date;
}
```

#### Response

```typescript
{
  requestId: string;
  conflicts: Conflict[];
  resolvedOperations: Operation[];
  currentVersion: string;
  deltaUpdates?: any[];
  snapshot?: any;
  completedAt: Date;
}
```

#### Example

```bash
curl -X POST "http://localhost:3000/api/reconciliation/reconcile" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Tenant-ID: tenant-456" \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "req-123",
    "clientId": "client-789",
    "tenantId": "tenant-456",
    "lastKnownVersion": "v1.0",
    "operations": [
      {
        "operationId": "op-001",
        "clientId": "client-789",
        "tenantId": "tenant-456",
        "entityType": "document",
        "entityId": "doc-456",
        "operationType": "UPDATE",
        "payload": { "content": "Updated text" },
        "timestamp": "2026-01-30T12:00:00Z",
        "vectorClock": { "client-789": 1 }
      }
    ],
    "requestedAt": "2026-01-30T12:00:00Z"
  }'
```

---

### Snapshot Endpoint

**Endpoint:** `GET /api/reconciliation/snapshot/:entityType/:entityId`  
**Method:** GET  
**Authentication:** Bearer token required  
**Headers:**
- `Authorization: Bearer <jwt>`
- `X-Tenant-ID: <tenant-id>`

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `entityType` | string | Type of entity (e.g., 'document') |
| `entityId` | string | Entity identifier |

#### Response

```typescript
{
  snapshotId: string;
  tenantId: string;
  entityType: string;
  version: string;
  data: any;
  createdAt: Date;
  checksum: string;
}
```

#### Example

```bash
curl -X GET "http://localhost:3000/api/reconciliation/snapshot/document/doc-456" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Tenant-ID: tenant-456"
```

---

### Health Check Endpoint

**Endpoint:** `GET /health`  
**Method:** GET  
**Authentication:** None required

#### Response

```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    websocket: ServiceHealth;
    eventbus: ServiceHealth;
    reconciliation: ServiceHealth;
    redis: ServiceHealth;
  };
  timestamp: Date;
}
```

#### Example

```bash
curl -X GET "http://localhost:3000/health"
```

**Response:**

```json
{
  "status": "healthy",
  "services": {
    "websocket": {
      "status": "healthy",
      "activeConnections": 1234,
      "lastCheck": "2026-01-30T12:00:00Z"
    },
    "eventbus": {
      "status": "healthy",
      "eventsPerSecond": 500,
      "lastCheck": "2026-01-30T12:00:00Z"
    },
    "redis": {
      "status": "healthy",
      "latency": 2,
      "lastCheck": "2026-01-30T12:00:00Z"
    }
  },
  "timestamp": "2026-01-30T12:00:00Z"
}
```

---

## Event Bus API

### Publishing Events

```typescript
import { EventBusService } from './eventbus/EventBusService';

const eventBus = new EventBusService(config, logger);

await eventBus.publish({
  eventId: uuidv4(),
  eventType: 'order.placed',
  tenantId: 'tenant-123',
  timestamp: new Date(),
  payload: {
    orderId: 'order-456',
    amount: 1000,
    currency: 'NGN'
  },
  metadata: {
    source: 'order-service',
    userId: 'user-789',
    correlationId: 'corr-123'
  },
  schemaVersion: '1.0'
});
```

### Subscribing to Events

```typescript
const subscription = await eventBus.subscribe({
  subscriptionId: uuidv4(),
  tenantId: 'tenant-123',
  eventTypes: ['order.placed', 'order.completed'],
  consumerGroup: 'notification-service',
  callback: async (event) => {
    console.log('Received event:', event);
    // Process event
  }
});
```

### Unsubscribing

```typescript
await eventBus.unsubscribe(subscription.subscriptionId);
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_FAILED` | 401 | Authentication failed |
| `AUTHZ_FAILED` | 403 | Authorization failed |
| `TENANT_VIOLATION` | 403 | Tenant isolation violation |
| `RATE_LIMIT` | 429 | Rate limit exceeded |
| `INVALID_REQUEST` | 400 | Invalid request format |
| `NOT_FOUND` | 404 | Resource not found |
| `INTERNAL_ERROR` | 500 | Internal server error |

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| WebSocket messages | 100 messages | 1 minute |
| Polling endpoint | 60 requests | 1 minute |
| Reconciliation endpoint | 10 requests | 1 minute |
| Event publishing | 1000 events | 1 second |

---

## Best Practices

### 1. Idempotency

Always implement idempotency on the client side. Messages may be delivered more than once due to network issues or retries.

```javascript
const processedMessages = new Set();

socket.on('message', (message) => {
  if (processedMessages.has(message.messageId)) {
    return; // Already processed
  }
  processedMessages.add(message.messageId);
  // Process message
});
```

### 2. Reconnection Handling

Implement exponential backoff for reconnection attempts.

```javascript
socket.on('disconnect', () => {
  let retryCount = 0;
  const maxRetries = 10;
  const baseDelay = 1000;
  
  const reconnect = () => {
    if (retryCount >= maxRetries) return;
    
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), 30000);
    setTimeout(() => {
      socket.connect();
      retryCount++;
    }, delay);
  };
  
  reconnect();
});
```

### 3. Offline Queue

Queue operations locally when offline and submit when reconnected.

```javascript
const offlineQueue = [];

function sendMessage(message) {
  if (socket.connected) {
    socket.emit('message', message);
  } else {
    offlineQueue.push(message);
  }
}

socket.on('connected', () => {
  while (offlineQueue.length > 0) {
    const message = offlineQueue.shift();
    socket.emit('message', message);
  }
});
```

### 4. Interaction Class Selection

Choose the appropriate interaction class for your use case:

- **Class A:** Use for non-critical presence features
- **Class B:** Use for important but not time-critical updates
- **Class C:** Use for interactive features where latency matters
- **Class D:** NEVER use realtime for critical transactions

---

**End of API Documentation**
