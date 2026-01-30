# API Documentation: Super Admin Control Plane

**Version:** 1.0  
**Last Updated:** January 30, 2026  
**Base URL:** `https://api.webwaka.com/superadmin`

## Overview

The Super Admin Control Plane API provides a dedicated, audited interface for platform-wide operations. All endpoints require Super Admin authentication and all actions are logged in the audit trail.

## Authentication

### JWT Authentication

All API requests must include a valid JWT token in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

### Obtaining a Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@webwaka.com",
  "password": "your-password",
  "mfaCode": "123456"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400
}
```

---

## Platform Configuration

### Get Platform Configuration

Retrieve platform-wide configuration settings.

```http
GET /api/superadmin/config
```

**Response:**
```json
{
  "platform.name": "WebWaka",
  "platform.version": "1.0.0",
  "platform.environment": "production",
  "features.realtime": true,
  "features.ai": true
}
```

---

### Update Platform Configuration

Update platform-wide configuration settings.

```http
POST /api/superadmin/config
Content-Type: application/json

{
  "key": "features.realtime",
  "value": true,
  "description": "Enable realtime features"
}
```

**Response:**
```json
{
  "id": "config-123",
  "key": "features.realtime",
  "value": true,
  "description": "Enable realtime features",
  "updatedAt": "2026-01-30T12:34:56.789Z",
  "updatedBy": "admin@webwaka.com"
}
```

---

### Get Configuration History

Retrieve configuration change history.

```http
GET /api/superadmin/config/history?key=features.realtime
```

**Response:**
```json
{
  "history": [
    {
      "timestamp": "2026-01-30T12:34:56.789Z",
      "key": "features.realtime",
      "oldValue": false,
      "newValue": true,
      "updatedBy": "admin@webwaka.com"
    }
  ]
}
```

---

## Partner Management

### Create Partner

Create a new partner organization.

```http
POST /api/superadmin/partners
Content-Type: application/json

{
  "name": "Acme Corporation",
  "email": "admin@acme.com",
  "configuration": {
    "maxInstances": 10,
    "allowedRegions": ["ng-lagos", "gh-accra"]
  },
  "metadata": {
    "industry": "retail",
    "size": "medium"
  }
}
```

**Response:**
```json
{
  "id": "partner-123",
  "name": "Acme Corporation",
  "email": "admin@acme.com",
  "status": "active",
  "configuration": {
    "maxInstances": 10,
    "allowedRegions": ["ng-lagos", "gh-accra"]
  },
  "metadata": {
    "industry": "retail",
    "size": "medium"
  },
  "createdAt": "2026-01-30T12:34:56.789Z",
  "createdBy": "admin@webwaka.com"
}
```

---

### List Partners

List all partner organizations.

```http
GET /api/superadmin/partners?status=active&limit=50&offset=0
```

**Query Parameters:**
- `status` (optional) - Filter by status (active, suspended)
- `limit` (optional) - Number of results (default: 100)
- `offset` (optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "partners": [
    {
      "id": "partner-123",
      "name": "Acme Corporation",
      "email": "admin@acme.com",
      "status": "active",
      "createdAt": "2026-01-30T12:34:56.789Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

### Get Partner Details

Retrieve detailed information about a partner.

```http
GET /api/superadmin/partners/{partnerId}
```

**Response:**
```json
{
  "id": "partner-123",
  "name": "Acme Corporation",
  "email": "admin@acme.com",
  "status": "active",
  "configuration": {
    "maxInstances": 10,
    "allowedRegions": ["ng-lagos", "gh-accra"]
  },
  "metadata": {
    "industry": "retail",
    "size": "medium"
  },
  "stats": {
    "totalInstances": 5,
    "activeInstances": 4,
    "suspendedInstances": 1
  },
  "createdAt": "2026-01-30T12:34:56.789Z",
  "updatedAt": "2026-01-30T12:34:56.789Z"
}
```

---

### Update Partner

Update partner information.

```http
PATCH /api/superadmin/partners/{partnerId}
Content-Type: application/json

{
  "name": "Acme Corporation Ltd",
  "configuration": {
    "maxInstances": 20
  }
}
```

**Response:**
```json
{
  "id": "partner-123",
  "name": "Acme Corporation Ltd",
  "email": "admin@acme.com",
  "status": "active",
  "configuration": {
    "maxInstances": 20,
    "allowedRegions": ["ng-lagos", "gh-accra"]
  },
  "updatedAt": "2026-01-30T12:34:56.789Z"
}
```

---

### Suspend Partner

Suspend a partner and all their instances.

```http
POST /api/superadmin/partners/{partnerId}/suspend
Content-Type: application/json

{
  "reason": "Payment overdue",
  "notifyPartner": true
}
```

**Response:**
```json
{
  "id": "partner-123",
  "status": "suspended",
  "suspendedAt": "2026-01-30T12:34:56.789Z",
  "suspensionReason": "Payment overdue"
}
```

---

### Resume Partner

Resume a suspended partner.

```http
POST /api/superadmin/partners/{partnerId}/resume
```

**Response:**
```json
{
  "id": "partner-123",
  "status": "active",
  "resumedAt": "2026-01-30T12:34:56.789Z"
}
```

---

### Delete Partner

Delete a partner (soft delete).

```http
DELETE /api/superadmin/partners/{partnerId}
```

**Response:**
```json
{
  "id": "partner-123",
  "status": "deleted",
  "deletedAt": "2026-01-30T12:34:56.789Z"
}
```

---

## Tenant Management

### Create Tenant

Create a new tenant under a partner.

```http
POST /api/superadmin/tenants
Content-Type: application/json

{
  "partnerId": "partner-123",
  "name": "Acme Store Lagos",
  "configuration": {
    "timezone": "Africa/Lagos",
    "currency": "NGN"
  },
  "metadata": {
    "location": "Lagos",
    "storeType": "retail"
  }
}
```

**Response:**
```json
{
  "id": "tenant-456",
  "partnerId": "partner-123",
  "name": "Acme Store Lagos",
  "status": "active",
  "configuration": {
    "timezone": "Africa/Lagos",
    "currency": "NGN"
  },
  "metadata": {
    "location": "Lagos",
    "storeType": "retail"
  },
  "createdAt": "2026-01-30T12:34:56.789Z"
}
```

---

### List Tenants

List all tenants, optionally filtered by partner.

```http
GET /api/superadmin/tenants?partnerId=partner-123&status=active
```

**Query Parameters:**
- `partnerId` (optional) - Filter by partner
- `status` (optional) - Filter by status
- `limit` (optional) - Number of results
- `offset` (optional) - Pagination offset

**Response:**
```json
{
  "tenants": [
    {
      "id": "tenant-456",
      "partnerId": "partner-123",
      "name": "Acme Store Lagos",
      "status": "active",
      "createdAt": "2026-01-30T12:34:56.789Z"
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0
}
```

---

## Instance Management

### Provision Instance

Provision a new platform instance.

```http
POST /api/superadmin/instances
Content-Type: application/json

{
  "name": "acme-production",
  "type": "partner-deployed",
  "updateChannel": "manual-approval",
  "configuration": {
    "region": "ng-lagos",
    "dataResidency": ["NG"],
    "enabledSuites": ["commerce"],
    "enabledCapabilities": ["pos", "inventory"],
    "customDomain": "pos.acme.com",
    "sslEnabled": true
  },
  "resources": {
    "cpu": "2.0",
    "memory": "4096M",
    "storage": "50G"
  },
  "metadata": {
    "partnerId": "partner-123",
    "tenantId": "tenant-456"
  }
}
```

**Response:**
```json
{
  "id": "instance-789",
  "name": "acme-production",
  "type": "partner-deployed",
  "status": "provisioning",
  "version": "1.0.0",
  "updateChannel": "manual-approval",
  "configuration": {
    "region": "ng-lagos",
    "dataResidency": ["NG"],
    "enabledSuites": ["commerce"],
    "enabledCapabilities": ["pos", "inventory"],
    "customDomain": "pos.acme.com",
    "sslEnabled": true
  },
  "resources": {
    "cpu": "2.0",
    "memory": "4096M",
    "storage": "50G"
  },
  "metadata": {
    "createdAt": "2026-01-30T12:34:56.789Z",
    "createdBy": "admin@webwaka.com",
    "partnerId": "partner-123",
    "tenantId": "tenant-456"
  },
  "health": {
    "lastHealthCheck": "2026-01-30T12:34:56.789Z",
    "status": "healthy",
    "uptime": 0,
    "metrics": {}
  }
}
```

---

### List Instances

List all platform instances.

```http
GET /api/superadmin/instances?type=partner-deployed&status=active
```

**Query Parameters:**
- `type` (optional) - Filter by instance type
- `status` (optional) - Filter by status
- `partnerId` (optional) - Filter by partner
- `tenantId` (optional) - Filter by tenant
- `version` (optional) - Filter by version
- `limit` (optional) - Number of results
- `offset` (optional) - Pagination offset

**Response:**
```json
{
  "instances": [
    {
      "id": "instance-789",
      "name": "acme-production",
      "type": "partner-deployed",
      "status": "active",
      "version": "1.0.0",
      "createdAt": "2026-01-30T12:34:56.789Z"
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0
}
```

---

### Get Instance Details

Retrieve detailed information about an instance.

```http
GET /api/superadmin/instances/{instanceId}
```

**Response:**
```json
{
  "id": "instance-789",
  "name": "acme-production",
  "type": "partner-deployed",
  "status": "active",
  "version": "1.0.0",
  "updateChannel": "manual-approval",
  "configuration": {
    "region": "ng-lagos",
    "dataResidency": ["NG"],
    "enabledSuites": ["commerce"],
    "enabledCapabilities": ["pos", "inventory"],
    "customDomain": "pos.acme.com",
    "sslEnabled": true
  },
  "resources": {
    "cpu": "2.0",
    "memory": "4096M",
    "storage": "50G"
  },
  "metadata": {
    "createdAt": "2026-01-30T12:34:56.789Z",
    "createdBy": "admin@webwaka.com",
    "partnerId": "partner-123",
    "tenantId": "tenant-456"
  },
  "health": {
    "lastHealthCheck": "2026-01-30T12:35:00.000Z",
    "status": "healthy",
    "uptime": 3600,
    "metrics": {
      "cpu": 45.2,
      "memory": 62.8,
      "disk": 35.1,
      "requestRate": 120,
      "errorRate": 0.2
    }
  }
}
```

---

### Update Instance

Update instance configuration.

```http
PATCH /api/superadmin/instances/{instanceId}
Content-Type: application/json

{
  "name": "acme-production-v2",
  "updateChannel": "auto-update",
  "configuration": {
    "enabledCapabilities": ["pos", "inventory", "analytics"]
  },
  "resources": {
    "cpu": "4.0",
    "memory": "8192M"
  }
}
```

**Response:**
```json
{
  "id": "instance-789",
  "name": "acme-production-v2",
  "updateChannel": "auto-update",
  "configuration": {
    "region": "ng-lagos",
    "dataResidency": ["NG"],
    "enabledSuites": ["commerce"],
    "enabledCapabilities": ["pos", "inventory", "analytics"],
    "customDomain": "pos.acme.com",
    "sslEnabled": true
  },
  "resources": {
    "cpu": "4.0",
    "memory": "8192M",
    "storage": "50G"
  },
  "updatedAt": "2026-01-30T12:34:56.789Z"
}
```

---

### Suspend Instance

Suspend an instance.

```http
POST /api/superadmin/instances/{instanceId}/suspend
Content-Type: application/json

{
  "reason": "Maintenance required"
}
```

**Response:**
```json
{
  "id": "instance-789",
  "status": "suspended",
  "suspendedAt": "2026-01-30T12:34:56.789Z"
}
```

---

### Resume Instance

Resume a suspended instance.

```http
POST /api/superadmin/instances/{instanceId}/resume
```

**Response:**
```json
{
  "id": "instance-789",
  "status": "active",
  "resumedAt": "2026-01-30T12:34:56.789Z"
}
```

---

### Upgrade Instance

Upgrade an instance to a new version.

```http
POST /api/superadmin/instances/{instanceId}/upgrade
Content-Type: application/json

{
  "version": "1.1.0",
  "maintenanceWindow": {
    "start": "2026-01-31T02:00:00Z",
    "duration": 30
  }
}
```

**Response:**
```json
{
  "id": "instance-789",
  "upgradeId": "upgrade-999",
  "currentVersion": "1.0.0",
  "targetVersion": "1.1.0",
  "status": "scheduled",
  "scheduledAt": "2026-01-31T02:00:00Z"
}
```

---

### Backup Instance

Create a backup of an instance.

```http
POST /api/superadmin/instances/{instanceId}/backup
```

**Response:**
```json
{
  "id": "backup-111",
  "instanceId": "instance-789",
  "status": "in-progress",
  "createdAt": "2026-01-30T12:34:56.789Z"
}
```

---

### Restore Instance

Restore an instance from a backup.

```http
POST /api/superadmin/instances/{instanceId}/restore
Content-Type: application/json

{
  "backupId": "backup-111"
}
```

**Response:**
```json
{
  "id": "restore-222",
  "instanceId": "instance-789",
  "backupId": "backup-111",
  "status": "in-progress",
  "startedAt": "2026-01-30T12:34:56.789Z"
}
```

---

### Terminate Instance

Permanently terminate an instance.

```http
DELETE /api/superadmin/instances/{instanceId}
```

**Response:**
```json
{
  "id": "instance-789",
  "status": "terminated",
  "terminatedAt": "2026-01-30T12:34:56.789Z"
}
```

---

## Capability Management

### Register Capability

Register a new capability in the platform.

```http
POST /api/superadmin/capabilities
Content-Type: application/json

{
  "name": "analytics",
  "displayName": "Analytics & Reporting",
  "description": "Advanced analytics and reporting capabilities",
  "version": "1.0.0",
  "dependencies": ["reporting"],
  "configuration": {
    "defaultEnabled": false,
    "requiresLicense": true
  }
}
```

**Response:**
```json
{
  "id": "capability-333",
  "name": "analytics",
  "displayName": "Analytics & Reporting",
  "description": "Advanced analytics and reporting capabilities",
  "version": "1.0.0",
  "dependencies": ["reporting"],
  "configuration": {
    "defaultEnabled": false,
    "requiresLicense": true
  },
  "createdAt": "2026-01-30T12:34:56.789Z"
}
```

---

### List Capabilities

List all registered capabilities.

```http
GET /api/superadmin/capabilities
```

**Response:**
```json
{
  "capabilities": [
    {
      "id": "capability-333",
      "name": "analytics",
      "displayName": "Analytics & Reporting",
      "version": "1.0.0",
      "createdAt": "2026-01-30T12:34:56.789Z"
    }
  ],
  "total": 1
}
```

---

### Enable Capability for Instance

Enable a capability for a specific instance.

```http
POST /api/superadmin/instances/{instanceId}/capabilities/{capabilityId}/enable
```

**Response:**
```json
{
  "instanceId": "instance-789",
  "capabilityId": "capability-333",
  "status": "enabled",
  "enabledAt": "2026-01-30T12:34:56.789Z"
}
```

---

### Disable Capability for Instance

Disable a capability for a specific instance.

```http
POST /api/superadmin/instances/{instanceId}/capabilities/{capabilityId}/disable
```

**Response:**
```json
{
  "instanceId": "instance-789",
  "capabilityId": "capability-333",
  "status": "disabled",
  "disabledAt": "2026-01-30T12:34:56.789Z"
}
```

---

## Audit Logs

### Query Audit Logs

Query audit logs with filters.

```http
GET /api/superadmin/audit-logs?action=instance.create&startDate=2026-01-01&limit=50
```

**Query Parameters:**
- `actorId` (optional) - Filter by actor ID
- `actorType` (optional) - Filter by actor type
- `action` (optional) - Filter by action
- `resourceType` (optional) - Filter by resource type
- `resourceId` (optional) - Filter by resource ID
- `result` (optional) - Filter by result (success/failure)
- `startDate` (optional) - Filter by start date
- `endDate` (optional) - Filter by end date
- `limit` (optional) - Number of results
- `offset` (optional) - Pagination offset

**Response:**
```json
{
  "logs": [
    {
      "id": "audit-444",
      "timestamp": "2026-01-30T12:34:56.789Z",
      "actor": {
        "id": "admin-123",
        "type": "super-admin",
        "email": "admin@webwaka.com",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0..."
      },
      "action": "instance.create",
      "resource": {
        "type": "instance",
        "id": "instance-789",
        "name": "acme-production"
      },
      "result": "success",
      "metadata": {
        "instanceType": "partner-deployed",
        "version": "1.0.0"
      }
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

### Get Audit Log Details

Retrieve detailed information about a specific audit log entry.

```http
GET /api/superadmin/audit-logs/{auditLogId}
```

**Response:**
```json
{
  "id": "audit-444",
  "timestamp": "2026-01-30T12:34:56.789Z",
  "actor": {
    "id": "admin-123",
    "type": "super-admin",
    "email": "admin@webwaka.com",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  },
  "action": "instance.create",
  "resource": {
    "type": "instance",
    "id": "instance-789",
    "name": "acme-production"
  },
  "changes": {
    "before": null,
    "after": {
      "name": "acme-production",
      "type": "partner-deployed",
      "status": "provisioning"
    }
  },
  "result": "success",
  "metadata": {
    "instanceType": "partner-deployed",
    "version": "1.0.0"
  }
}
```

---

### Export Audit Logs

Export audit logs in JSON or CSV format.

```http
POST /api/superadmin/audit-logs/export
Content-Type: application/json

{
  "filter": {
    "startDate": "2026-01-01",
    "endDate": "2026-01-31",
    "action": "instance.create"
  },
  "format": "csv",
  "includeMetadata": true
}
```

**Response:**
```json
{
  "exportId": "export-555",
  "status": "in-progress",
  "format": "csv",
  "createdAt": "2026-01-30T12:34:56.789Z",
  "downloadUrl": null
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    },
    "requestId": "req-666",
    "timestamp": "2026-01-30T12:34:56.789Z"
  }
}
```

### Error Codes

- `UNAUTHORIZED` (401) - Authentication required
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `VALIDATION_ERROR` (400) - Invalid input
- `CONFLICT` (409) - Resource conflict
- `INTERNAL_ERROR` (500) - Internal server error
- `SERVICE_UNAVAILABLE` (503) - Service temporarily unavailable

---

## Rate Limiting

All API endpoints are rate-limited:

- **Super Admin API:** 1000 requests/minute
- **Partner API:** 500 requests/minute
- **Tenant API:** 200 requests/minute

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1643723400
```

---

## Webhooks

Configure webhooks to receive notifications about platform events.

### Supported Events

- `instance.provisioned`
- `instance.upgraded`
- `instance.suspended`
- `instance.resumed`
- `instance.terminated`
- `partner.created`
- `partner.suspended`
- `tenant.created`

### Webhook Payload

```json
{
  "event": "instance.provisioned",
  "timestamp": "2026-01-30T12:34:56.789Z",
  "data": {
    "instanceId": "instance-789",
    "name": "acme-production",
    "status": "active"
  }
}
```

---

**End of API Documentation**
