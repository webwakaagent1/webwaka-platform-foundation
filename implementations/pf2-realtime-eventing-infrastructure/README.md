# PF-2: Realtime & Eventing Infrastructure

**Version:** 1.0  
**Status:** Implementation Complete  
**Date:** January 30, 2026

---

## Overview

The Realtime & Eventing Infrastructure provides optional, degradable realtime capabilities for the WebWaka platform. This implementation enforces **INV-010 (Realtime as Optional Degradable Capability)**, ensuring that realtime loss degrades user experience but never breaks correctness or blocks critical operations.

### Key Features

- **WebSocket Service** - Scalable bidirectional communication with tenant isolation
- **Event Bus** - Robust pub/sub messaging for inter-service communication
- **Offline Reconciliation** - State synchronization for offline clients
- **Four Interaction Classes** - Class A (Live Presence), Class B (Event Streaming), Class C (Low-Latency), Class D (Critical Transactions)
- **Comprehensive Fallbacks** - Event queuing, polling, delayed reconciliation, snapshot refresh

---

## Architecture

The infrastructure implements four distinct interaction classes per **INV-010**:

### Class A: Live Presence (Optional, Non-Critical)
- Online/offline status, typing indicators, cursor positions
- **Fallback:** None required (purely optional)

### Class B: Event Streaming (Realtime Preferred, Async Fallback Required)
- Activity feeds, notifications, status updates
- **Fallback:** Event queue + polling

### Class C: Low-Latency Interactions (Realtime Required for Experience, Not Correctness)
- Chat messages, live updates, real-time collaboration
- **Fallback:** Delayed reconciliation + snapshot refresh

### Class D: Critical Transactions (Realtime Explicitly NOT Allowed)
- Financial transactions, order placement, payment processing
- **Must use:** Async confirmation + audit trail

---

## Installation

### Prerequisites

- Node.js 18+
- Redis 6+
- PostgreSQL 15+ (for audit logging)

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Build TypeScript
npm run build

# Start service
npm start

# Development mode
npm run dev
```

---

## Configuration

### Environment Variables

```bash
# WebSocket Configuration
WS_PORT=3000
WS_PATH=/socket.io
WS_PING_INTERVAL=30000
WS_PING_TIMEOUT=60000
WS_MAX_CONNECTIONS=50000
WS_MESSAGE_RATE_LIMIT=100

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-secret-key

# Event Bus Configuration
EVENT_BUS_STREAM_NAME=webwaka:events
EVENT_BUS_CONSUMER_GROUP=webwaka-consumers
EVENT_BUS_MAX_RETRIES=3
EVENT_BUS_RETENTION_PERIOD=604800000

# Reconciliation Configuration
RECONCILIATION_DEFAULT_STRATEGY=LAST_WRITE_WINS
RECONCILIATION_MAX_QUEUE_SIZE=10000
RECONCILIATION_PROCESSING_TIMEOUT=30000

# Logging
LOG_LEVEL=info
```

---

## Usage

### WebSocket Client Connection

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  },
  query: {
    clientId: 'unique-client-id'
  }
});

socket.on('connected', (data) => {
  console.log('Connected:', data);
});

socket.on('message', (message) => {
  console.log('Received message:', message);
});

// Send message
socket.emit('message', {
  type: 'chat.message',
  recipientId: 'user-123',
  payload: {
    text: 'Hello, World!'
  }
});
```

### Event Publishing

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
    amount: 1000
  },
  metadata: {
    source: 'order-service',
    userId: 'user-789'
  },
  schemaVersion: '1.0'
});
```

### Offline Reconciliation

```typescript
import { ReconciliationService } from './reconciliation/ReconciliationService';

const reconciliation = new ReconciliationService(config, logger);

const response = await reconciliation.reconcile({
  requestId: uuidv4(),
  clientId: 'client-123',
  tenantId: 'tenant-123',
  lastKnownVersion: 'v1.0',
  operations: [
    {
      operationId: uuidv4(),
      clientId: 'client-123',
      tenantId: 'tenant-123',
      entityType: 'document',
      entityId: 'doc-456',
      operationType: 'UPDATE',
      payload: { content: 'Updated text' },
      timestamp: new Date(),
      vectorClock: { 'client-123': 1 }
    }
  ],
  requestedAt: new Date()
});
```

---

## API Documentation

### WebSocket Events

#### Client → Server

| Event | Description | Payload |
|-------|-------------|---------|
| `message` | Send message | `{ type, recipientId?, roomId?, payload }` |
| `join_room` | Join a room | `{ roomId }` |
| `leave_room` | Leave a room | `{ roomId }` |
| `presence_update` | Update presence | `{ status, metadata? }` |
| `ping` | Heartbeat | None |

#### Server → Client

| Event | Description | Payload |
|-------|-------------|---------|
| `connected` | Connection established | `{ connectionId, serverTime, interactionClasses }` |
| `message` | Receive message | `WebSocketMessage` |
| `message_ack` | Message acknowledged | `{ messageId }` |
| `room_joined` | Room joined | `{ roomId }` |
| `room_left` | Room left | `{ roomId }` |
| `pong` | Heartbeat response | None |
| `error` | Error occurred | `{ error }` |

### REST API Endpoints

#### Polling Endpoint (Class B Fallback)

```
GET /api/events/poll?lastEventId=<id>&limit=<n>
Authorization: Bearer <jwt>
X-Tenant-ID: <tenant-id>

Response:
{
  "events": [Event],
  "hasMore": boolean,
  "nextEventId": string
}
```

#### Reconciliation Endpoint

```
POST /api/reconciliation/reconcile
Authorization: Bearer <jwt>
X-Tenant-ID: <tenant-id>

Body: ReconciliationRequest

Response: ReconciliationResponse
```

#### Snapshot Endpoint

```
GET /api/reconciliation/snapshot/:entityType/:entityId
Authorization: Bearer <jwt>
X-Tenant-ID: <tenant-id>

Response: StateSnapshot
```

---

## Testing

### Run All Tests

```bash
npm test
```

### Run Unit Tests

```bash
npm run test:unit
```

### Run Integration Tests

```bash
npm run test:integration
```

### Test Coverage

```bash
npm run test:coverage
```

---

## Platform Invariants Compliance

### INV-002: Strict Tenant Isolation ✅

All WebSocket connections, event subscriptions, and reconciliation operations enforce tenant boundaries. Cross-tenant messaging is explicitly prohibited and logged as security violations.

### INV-003: Audited Super Admin Access ✅

All Super Admin access to tenant realtime data is logged immutably with justification. Audit logs persist for 7 years.

### INV-010: Realtime as Optional Degradable Capability ✅

The entire infrastructure implements this invariant as its core principle. All four interaction classes define explicit fallback behaviors. Critical transactions (Class D) explicitly prohibit realtime processing.

### INV-011: Prompts-as-Artifacts (PaA) Execution ✅

This implementation follows the PF-2-PROMPT-v2 execution prompt. All work is committed to the GitHub repository.

### INV-012: Single-Repository Topology ✅

All code resides in the `webwaka` repository under `/implementations/pf2-realtime-eventing-infrastructure/`.

---

## Monitoring

### Metrics

Key metrics tracked:
- Active connection count
- Message throughput (sent/received per second)
- Average message latency
- Event bus throughput
- Consumer lag
- Reconciliation request rate
- Conflict detection rate

### Health Checks

```
GET /health
Response: { status: 'healthy' | 'degraded' | 'unhealthy', services: {...} }
```

### Logging

Structured JSON logging with levels: ERROR, WARN, INFO, DEBUG

---

## Deployment

### Docker

```bash
# Build image
docker build -t pf2-realtime:1.0 .

# Run container
docker run -d \
  --name pf2-realtime \
  -p 3000:3000 \
  --env-file .env \
  pf2-realtime:1.0
```

### Docker Compose

```bash
docker-compose up -d
```

---

## Troubleshooting

### Connection Issues

**Problem:** Clients cannot connect  
**Solution:** Check JWT token validity, verify Redis connectivity, check connection limit

**Problem:** Frequent disconnections  
**Solution:** Adjust ping interval/timeout, check network stability, verify load balancer configuration

### Message Delivery Issues

**Problem:** Messages not delivered  
**Solution:** Check Redis pub/sub, verify tenant isolation, check rate limits

**Problem:** Duplicate messages  
**Solution:** Implement idempotency on client side, check event bus configuration

### Performance Issues

**Problem:** High latency  
**Solution:** Scale WebSocket instances, optimize message batching, check Redis performance

**Problem:** Memory usage high  
**Solution:** Reduce connection count per instance, implement connection draining, check for memory leaks

---

## Security

### Authentication

All WebSocket connections require valid JWT tokens with tenant and user context.

### Authorization

Role-based access control for rooms and direct messaging.

### Rate Limiting

Per-connection message rate limiting (default: 100 messages/minute).

### Encryption

- TLS 1.3 for all WebSocket connections
- Redis connections over TLS or VPN
- Encrypted data at rest

---

## License

PROPRIETARY - WebWaka Platform

---

## Support

For issues or questions:
- Review architecture document: `/docs/architecture/ARCH_PF2_REALTIME_EVENTING.md`
- Check runbooks in `/docs/` directory
- Contact platform team

---

**End of README**
