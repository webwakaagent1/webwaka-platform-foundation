# PF-3: AI & High-Complexity Readiness - API Documentation

**Version:** 1.0  
**Date:** January 30, 2026

---

## Overview

This document provides comprehensive API documentation for the AI & High-Complexity Readiness infrastructure. All APIs use REST with JSON payloads and JWT authentication.

---

## Authentication

All API requests require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

The JWT token must include:
- `tenantId`: Tenant identifier
- `userId`: User identifier
- `roles`: User roles
- `exp`: Token expiration timestamp

---

## AI Job Orchestration API

### Submit Job

Submit an AI job for processing.

**Endpoint:** `POST /api/v1/ai/jobs`

**Request:**
```json
{
  "capability": "GENERATE",
  "input": {
    "type": "TEXT",
    "prompt": "Write a product description",
    "parameters": {
      "maxLength": 500,
      "temperature": 0.7
    }
  },
  "priority": "NORMAL",
  "provider": "OPENAI",
  "callbackUrl": "https://example.com/callback"
}
```

**Response:**
```json
{
  "jobId": "job-123",
  "status": "QUEUED",
  "estimatedCost": 0.05,
  "createdAt": "2026-01-30T10:00:00Z"
}
```

### Get Job Status

Get the current status of a job.

**Endpoint:** `GET /api/v1/ai/jobs/{jobId}`

**Response:**
```json
{
  "jobId": "job-123",
  "status": "COMPLETED",
  "output": {
    "type": "TEXT",
    "content": "This innovative smartwatch..."
  },
  "cost": 0.05,
  "tokenCount": {
    "prompt": 50,
    "completion": 200,
    "total": 250
  },
  "executionTime": 2500,
  "cacheHit": false,
  "completedAt": "2026-01-30T10:00:05Z"
}
```

### List Jobs

List jobs for the current tenant.

**Endpoint:** `GET /api/v1/ai/jobs`

**Query Parameters:**
- `status`: Filter by status (PENDING, QUEUED, PROCESSING, COMPLETED, FAILED)
- `capability`: Filter by capability type
- `limit`: Maximum number of results (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "jobs": [
    {
      "jobId": "job-123",
      "capability": "GENERATE",
      "status": "COMPLETED",
      "cost": 0.05,
      "createdAt": "2026-01-30T10:00:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

### Cancel Job

Cancel a pending or queued job.

**Endpoint:** `DELETE /api/v1/ai/jobs/{jobId}`

**Response:**
```json
{
  "jobId": "job-123",
  "status": "CANCELLED",
  "cancelledAt": "2026-01-30T10:01:00Z"
}
```

---

## BYOK (Bring Your Own Keys) API

### Add API Key

Add a new API key for AI provider access.

**Endpoint:** `POST /api/v1/ai/keys`

**Request:**
```json
{
  "provider": "OPENAI",
  "apiKey": "sk-...",
  "capabilities": ["GENERATE", "CLASSIFY"],
  "usageLimit": {
    "cost": 1000,
    "period": "MONTHLY"
  },
  "expiresAt": "2027-01-30T00:00:00Z",
  "rotationSchedule": {
    "frequency": 90
  }
}
```

**Response:**
```json
{
  "keyId": "key-123",
  "provider": "OPENAI",
  "capabilities": ["GENERATE", "CLASSIFY"],
  "createdAt": "2026-01-30T10:00:00Z"
}
```

### List API Keys

List all API keys for the current actor.

**Endpoint:** `GET /api/v1/ai/keys`

**Response:**
```json
{
  "keys": [
    {
      "keyId": "key-123",
      "provider": "OPENAI",
      "capabilities": ["GENERATE", "CLASSIFY"],
      "actorLevel": "CLIENT",
      "expiresAt": "2027-01-30T00:00:00Z",
      "lastUsedAt": "2026-01-30T09:00:00Z",
      "createdAt": "2026-01-30T08:00:00Z"
    }
  ]
}
```

### Get API Key

Get details of a specific API key.

**Endpoint:** `GET /api/v1/ai/keys/{keyId}`

**Response:**
```json
{
  "keyId": "key-123",
  "provider": "OPENAI",
  "capabilities": ["GENERATE", "CLASSIFY"],
  "actorLevel": "CLIENT",
  "usageLimit": {
    "cost": 1000,
    "period": "MONTHLY"
  },
  "expiresAt": "2027-01-30T00:00:00Z",
  "rotationSchedule": {
    "frequency": 90,
    "nextRotation": "2026-04-30T00:00:00Z"
  },
  "lastUsedAt": "2026-01-30T09:00:00Z",
  "createdAt": "2026-01-30T08:00:00Z"
}
```

### Rotate API Key

Rotate an existing API key.

**Endpoint:** `PUT /api/v1/ai/keys/{keyId}/rotate`

**Request:**
```json
{
  "newApiKey": "sk-..."
}
```

**Response:**
```json
{
  "keyId": "key-123",
  "rotatedAt": "2026-01-30T10:00:00Z",
  "nextRotation": "2026-04-30T00:00:00Z"
}
```

### Delete API Key

Delete an API key.

**Endpoint:** `DELETE /api/v1/ai/keys/{keyId}`

**Response:**
```json
{
  "keyId": "key-123",
  "deletedAt": "2026-01-30T10:00:00Z"
}
```

### Validate API Key

Validate an API key against the provider.

**Endpoint:** `POST /api/v1/ai/keys/{keyId}/validate`

**Response:**
```json
{
  "valid": true,
  "provider": "OPENAI",
  "capabilities": ["GENERATE", "CLASSIFY"],
  "validatedAt": "2026-01-30T10:00:00Z"
}
```

---

## Abstract Capabilities API

### Generate

Generate text, code, or images.

**Endpoint:** `POST /api/v1/ai/capabilities/generate`

**Request:**
```json
{
  "type": "TEXT",
  "prompt": "Explain quantum computing",
  "parameters": {
    "maxLength": 200,
    "temperature": 0.7
  }
}
```

**Response:**
```json
{
  "type": "TEXT",
  "content": "Quantum computing is...",
  "metadata": {
    "model": "gpt-4",
    "finishReason": "stop"
  }
}
```

### Classify

Classify text by sentiment, category, or intent.

**Endpoint:** `POST /api/v1/ai/capabilities/classify`

**Request:**
```json
{
  "type": "SENTIMENT",
  "text": "This product is amazing!",
  "parameters": {
    "threshold": 0.7
  }
}
```

**Response:**
```json
{
  "type": "SENTIMENT",
  "result": "POSITIVE",
  "confidence": 0.95,
  "scores": {
    "POSITIVE": 0.95,
    "NEUTRAL": 0.03,
    "NEGATIVE": 0.02
  }
}
```

### Recommend

Get recommendations for products, content, or actions.

**Endpoint:** `POST /api/v1/ai/capabilities/recommend`

**Request:**
```json
{
  "type": "PRODUCT",
  "context": {
    "userId": "user-123",
    "currentItem": "product-456"
  },
  "parameters": {
    "count": 5,
    "diversify": true
  }
}
```

**Response:**
```json
{
  "type": "PRODUCT",
  "recommendations": [
    {
      "item": "product-789",
      "score": 0.92,
      "reason": "Frequently bought together"
    }
  ]
}
```

### Forecast

Forecast demand, trends, or outcomes.

**Endpoint:** `POST /api/v1/ai/capabilities/forecast`

**Request:**
```json
{
  "type": "DEMAND",
  "historicalData": [
    {
      "timestamp": "2026-01-01T00:00:00Z",
      "value": 100
    }
  ],
  "horizon": 30,
  "parameters": {
    "confidence": 0.95,
    "seasonality": true
  }
}
```

**Response:**
```json
{
  "type": "DEMAND",
  "forecast": [
    {
      "timestamp": "2026-02-01T00:00:00Z",
      "value": 105,
      "lower": 95,
      "upper": 115,
      "confidence": 0.95
    }
  ],
  "metadata": {
    "model": "prophet",
    "accuracy": 0.92
  }
}
```

### Negotiate

Negotiate pricing, terms, or conditions.

**Endpoint:** `POST /api/v1/ai/capabilities/negotiate`

**Request:**
```json
{
  "type": "PRICING",
  "context": {
    "parties": ["buyer", "seller"],
    "currentOffer": {
      "price": 100,
      "quantity": 10
    },
    "constraints": {
      "minPrice": 80,
      "maxPrice": 120
    }
  },
  "parameters": {
    "strategy": "win-win",
    "maxRounds": 5
  }
}
```

**Response:**
```json
{
  "type": "PRICING",
  "counterOffer": {
    "price": 95,
    "quantity": 10
  },
  "reasoning": "Price reduction in exchange for bulk order",
  "confidence": 0.85
}
```

---

## Vector Database API

### Index Document

Index a document for similarity search.

**Endpoint:** `POST /api/v1/ai/vector/index`

**Request:**
```json
{
  "id": "doc-123",
  "text": "Product documentation...",
  "metadata": {
    "category": "docs",
    "version": "1.0"
  }
}
```

**Response:**
```json
{
  "id": "doc-123",
  "indexed": true,
  "indexedAt": "2026-01-30T10:00:00Z"
}
```

### Search Similar Documents

Search for similar documents.

**Endpoint:** `POST /api/v1/ai/vector/search`

**Request:**
```json
{
  "query": "How do I configure authentication?",
  "topK": 10,
  "filter": {
    "category": "docs"
  },
  "includeMetadata": true
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "doc-123",
      "score": 0.92,
      "metadata": {
        "category": "docs",
        "version": "1.0"
      }
    }
  ]
}
```

### Get Embedding

Get vector embedding for text.

**Endpoint:** `POST /api/v1/ai/vector/embed`

**Request:**
```json
{
  "text": "Sample text",
  "model": "OPENAI_ADA_002"
}
```

**Response:**
```json
{
  "embedding": [0.1, 0.2, 0.3, ...],
  "dimensions": 1536,
  "model": "OPENAI_ADA_002"
}
```

---

## Geospatial API

### Geocode Address

Convert address to coordinates.

**Endpoint:** `POST /api/v1/ai/geospatial/geocode`

**Request:**
```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA"
}
```

**Response:**
```json
{
  "location": {
    "latitude": 37.4224764,
    "longitude": -122.0842499
  },
  "formattedAddress": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
  "components": {
    "street": "1600 Amphitheatre Parkway",
    "city": "Mountain View",
    "state": "CA",
    "postalCode": "94043",
    "country": "USA"
  },
  "confidence": 0.95
}
```

### Reverse Geocode

Convert coordinates to address.

**Endpoint:** `POST /api/v1/ai/geospatial/reverse-geocode`

**Request:**
```json
{
  "latitude": 37.4224764,
  "longitude": -122.0842499
}
```

**Response:**
```json
{
  "formattedAddress": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
  "components": {
    "street": "1600 Amphitheatre Parkway",
    "city": "Mountain View",
    "state": "CA",
    "postalCode": "94043",
    "country": "USA"
  }
}
```

### Calculate Distance

Calculate distance between two locations.

**Endpoint:** `POST /api/v1/ai/geospatial/distance`

**Request:**
```json
{
  "origin": {
    "latitude": 37.4224764,
    "longitude": -122.0842499
  },
  "destination": {
    "latitude": 37.7749295,
    "longitude": -122.4194155
  },
  "mode": "DRIVING"
}
```

**Response:**
```json
{
  "distance": 52300,
  "duration": 2400,
  "mode": "DRIVING"
}
```

### Optimize Route

Optimize route with multiple waypoints.

**Endpoint:** `POST /api/v1/ai/geospatial/route`

**Request:**
```json
{
  "origin": {
    "latitude": 37.4224764,
    "longitude": -122.0842499
  },
  "destination": {
    "latitude": 37.7749295,
    "longitude": -122.4194155
  },
  "waypoints": [
    {
      "latitude": 37.5,
      "longitude": -122.2
    }
  ],
  "mode": "DRIVING",
  "optimize": true
}
```

**Response:**
```json
{
  "distance": 60000,
  "duration": 3000,
  "polyline": "encoded_polyline_string",
  "steps": [
    {
      "distance": 1000,
      "duration": 60,
      "instruction": "Head north on Amphitheatre Pkwy",
      "location": {
        "latitude": 37.423,
        "longitude": -122.084
      }
    }
  ]
}
```

---

## Usage and Billing API

### Get Usage Summary

Get usage summary for the current tenant.

**Endpoint:** `GET /api/v1/ai/usage/summary`

**Query Parameters:**
- `start`: Start date (ISO 8601)
- `end`: End date (ISO 8601)
- `userId`: Filter by user (optional)

**Response:**
```json
{
  "tenantId": "tenant-123",
  "period": {
    "start": "2026-01-01T00:00:00Z",
    "end": "2026-01-31T23:59:59Z"
  },
  "totalRequests": 1000,
  "totalTokens": 50000,
  "totalCost": 25.50,
  "byCapability": {
    "GENERATE": {
      "requests": 500,
      "tokens": 30000,
      "cost": 15.00
    },
    "CLASSIFY": {
      "requests": 300,
      "tokens": 10000,
      "cost": 5.00
    }
  },
  "byProvider": {
    "OPENAI": {
      "requests": 700,
      "tokens": 40000,
      "cost": 20.00
    },
    "ANTHROPIC": {
      "requests": 300,
      "tokens": 10000,
      "cost": 5.50
    }
  }
}
```

### Get Usage Caps

Get usage caps for the current tenant.

**Endpoint:** `GET /api/v1/ai/usage/caps`

**Response:**
```json
{
  "caps": [
    {
      "capId": "cap-123",
      "capType": "COST",
      "limit": 1000,
      "period": "MONTHLY",
      "currentUsage": 250,
      "resetAt": "2026-02-01T00:00:00Z",
      "enabled": true
    }
  ]
}
```

### Set Usage Cap

Set a usage cap.

**Endpoint:** `POST /api/v1/ai/usage/caps`

**Request:**
```json
{
  "capType": "COST",
  "limit": 1000,
  "period": "MONTHLY",
  "alertThresholds": [0.5, 0.75, 0.9]
}
```

**Response:**
```json
{
  "capId": "cap-123",
  "capType": "COST",
  "limit": 1000,
  "period": "MONTHLY",
  "createdAt": "2026-01-30T10:00:00Z"
}
```

---

## Error Responses

All errors return a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    }
  }
}
```

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_REQUEST` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `USAGE_LIMIT_EXCEEDED` | 429 | Usage cap exceeded |
| `PROVIDER_ERROR` | 502 | AI provider error |
| `INTERNAL_ERROR` | 500 | Internal server error |

---

## Rate Limits

API requests are rate limited per tenant:

- **Job Submission**: 100 requests/minute
- **Job Status**: 1000 requests/minute
- **Key Management**: 10 requests/minute
- **Capabilities**: 100 requests/minute
- **Vector Search**: 100 requests/minute
- **Geospatial**: 100 requests/minute

Rate limit headers included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706612400
```

---

## Webhooks

Configure webhooks for asynchronous notifications:

### Job Completion

Webhook payload when job completes:

```json
{
  "event": "job.completed",
  "jobId": "job-123",
  "tenantId": "tenant-123",
  "status": "COMPLETED",
  "output": {...},
  "cost": 0.05,
  "completedAt": "2026-01-30T10:00:05Z"
}
```

### Usage Alert

Webhook payload when usage threshold reached:

```json
{
  "event": "usage.alert",
  "tenantId": "tenant-123",
  "capId": "cap-123",
  "threshold": 0.75,
  "currentUsage": 750,
  "limit": 1000,
  "alertedAt": "2026-01-30T10:00:00Z"
}
```

---

**End of API Documentation**
