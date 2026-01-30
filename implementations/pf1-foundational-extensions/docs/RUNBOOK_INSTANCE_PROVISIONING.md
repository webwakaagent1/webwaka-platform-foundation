# Operational Runbook: Instance Provisioning

**Version:** 1.0  
**Last Updated:** January 30, 2026  
**Owner:** Platform Operations Team

## Overview

This runbook provides step-by-step procedures for provisioning new WebWaka platform instances. It covers the complete provisioning workflow, from initial request validation to instance activation.

## Prerequisites

- Super Admin access to the control plane
- Valid partner/tenant credentials
- Resource availability confirmed
- Configuration validated
- Network connectivity to infrastructure

## Provisioning Workflow

### Step 1: Validate Provisioning Request

**Objective:** Ensure the provisioning request is valid and all prerequisites are met.

**Actions:**
1. Review the provisioning request details
2. Verify partner/tenant credentials
3. Check resource availability (CPU, memory, storage)
4. Validate configuration parameters
5. Confirm data residency requirements
6. Check for naming conflicts

**Validation Checklist:**
- [ ] Partner/tenant exists in the system
- [ ] Requested resources are available
- [ ] Configuration is valid (no missing required fields)
- [ ] Instance name is unique
- [ ] Data residency requirements are supported
- [ ] Update channel policy is specified

**Expected Duration:** 2-3 minutes

**API Call:**
```bash
POST /api/superadmin/instances
{
  "name": "client-production",
  "type": "partner-deployed",
  "updateChannel": "manual-approval",
  "configuration": {
    "region": "ng-lagos",
    "dataResidency": ["NG"],
    "enabledSuites": ["commerce"],
    "enabledCapabilities": ["pos", "inventory"],
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

**Troubleshooting:**
- **Error: "Partner not found"** - Verify partner ID exists in the system
- **Error: "Insufficient resources"** - Check resource pool availability or request additional capacity
- **Error: "Invalid configuration"** - Review configuration parameters against schema

---

### Step 2: Allocate Infrastructure Resources

**Objective:** Provision the underlying infrastructure (compute, storage, network).

**Actions:**
1. Allocate compute resources (CPU, memory)
2. Provision storage volumes
3. Configure networking (VPC, subnets, security groups)
4. Set up load balancer (if required)
5. Allocate IP addresses

**Expected Duration:** 3-5 minutes

**Verification:**
```bash
# Check instance status
GET /api/superadmin/instances/{instanceId}

# Expected status: "provisioning"
```

**Troubleshooting:**
- **Error: "Resource allocation failed"** - Check cloud provider API status
- **Error: "Network configuration failed"** - Verify VPC and subnet availability
- **Timeout** - Increase provisioning timeout or retry

---

### Step 3: Provision Database

**Objective:** Create and configure the instance database.

**Actions:**
1. Create PostgreSQL database instance
2. Configure database parameters (connections, memory)
3. Set up database user and credentials
4. Configure backup policy
5. Enable encryption at rest
6. Test database connectivity

**Expected Duration:** 2-4 minutes

**Verification:**
```bash
# Test database connection
psql -h <db-host> -U <db-user> -d <db-name> -c "SELECT version();"
```

**Troubleshooting:**
- **Error: "Database creation failed"** - Check database service availability
- **Error: "Connection timeout"** - Verify network security groups
- **Error: "Authentication failed"** - Verify credentials

---

### Step 4: Deploy Application Containers

**Objective:** Deploy the WebWaka application containers.

**Actions:**
1. Pull application Docker images
2. Create container configuration
3. Deploy application containers
4. Deploy worker containers
5. Configure environment variables
6. Set up health check endpoints

**Expected Duration:** 3-5 minutes

**Verification:**
```bash
# Check container status
docker ps | grep webwaka-{instanceId}

# Test health endpoint
curl http://<instance-url>/health
```

**Troubleshooting:**
- **Error: "Image pull failed"** - Verify container registry access
- **Error: "Container failed to start"** - Check container logs
- **Error: "Health check failed"** - Review application logs

---

### Step 5: Run Database Migrations

**Objective:** Initialize the database schema.

**Actions:**
1. Connect to the instance database
2. Run database migration scripts
3. Verify schema creation
4. Insert default data
5. Create database indexes

**Expected Duration:** 1-2 minutes

**Verification:**
```bash
# Check migration status
psql -h <db-host> -U <db-user> -d <db-name> -c "SELECT * FROM schema_migrations;"
```

**Troubleshooting:**
- **Error: "Migration failed"** - Check migration logs
- **Error: "Schema conflict"** - Verify database is empty
- **Error: "Permission denied"** - Verify database user permissions

---

### Step 6: Configure Environment

**Objective:** Configure the instance environment and settings.

**Actions:**
1. Set environment variables
2. Configure SSL certificates
3. Set up custom domain (if specified)
4. Configure data residency rules
5. Enable requested suites and capabilities
6. Set up monitoring and logging

**Expected Duration:** 2-3 minutes

**Verification:**
```bash
# Check configuration
GET /api/superadmin/instances/{instanceId}

# Verify SSL
curl https://<custom-domain>/health
```

**Troubleshooting:**
- **Error: "SSL certificate invalid"** - Verify certificate and key
- **Error: "Domain not resolving"** - Check DNS configuration
- **Error: "Suite enablement failed"** - Check suite dependencies

---

### Step 7: Run Health Checks

**Objective:** Verify all services are running correctly.

**Actions:**
1. Run application health check
2. Verify database connectivity
3. Check Redis connectivity
4. Test API endpoints
5. Verify worker processes
6. Check monitoring endpoints

**Expected Duration:** 1-2 minutes

**Health Check Endpoints:**
```bash
# Application health
GET /health

# Database health
GET /health/database

# Redis health
GET /health/redis

# Overall status
GET /health/status
```

**Expected Response:**
```json
{
  "status": "healthy",
  "checks": {
    "database": "pass",
    "redis": "pass",
    "workers": "pass",
    "storage": "pass"
  },
  "timestamp": "2026-01-30T12:34:56.789Z"
}
```

**Troubleshooting:**
- **Status: "degraded"** - Review failed checks
- **Status: "unhealthy"** - Check application logs
- **Timeout** - Verify network connectivity

---

### Step 8: Run Smoke Tests

**Objective:** Verify core functionality is working.

**Actions:**
1. Test user authentication
2. Test basic CRUD operations
3. Test job queue functionality
4. Test API rate limiting
5. Verify audit logging

**Expected Duration:** 2-3 minutes

**Smoke Test Suite:**
```bash
# Run automated smoke tests
npm run test:smoke -- --instance={instanceId}
```

**Troubleshooting:**
- **Test failures** - Review test logs and fix issues
- **Timeout** - Increase test timeout or check performance

---

### Step 9: Activate Instance

**Objective:** Mark the instance as active and ready for use.

**Actions:**
1. Update instance status to "active"
2. Enable monitoring alerts
3. Send activation notification
4. Update audit logs
5. Document instance details

**Expected Duration:** 1 minute

**API Call:**
```bash
PATCH /api/superadmin/instances/{instanceId}
{
  "status": "active"
}
```

**Verification:**
```bash
# Check instance status
GET /api/superadmin/instances/{instanceId}

# Expected status: "active"
```

---

### Step 10: Post-Provisioning Tasks

**Objective:** Complete post-provisioning documentation and handoff.

**Actions:**
1. Document instance credentials
2. Share access details with partner/tenant
3. Schedule onboarding session
4. Set up support channels
5. Monitor initial usage

**Deliverables:**
- Instance credentials (securely shared)
- Access URLs
- API documentation
- Support contact information
- Monitoring dashboard links

---

## Rollback Procedure

If provisioning fails at any step, follow this rollback procedure:

### Rollback Steps

1. **Stop all services**
   ```bash
   docker stop $(docker ps -q --filter "name=webwaka-{instanceId}")
   ```

2. **Delete containers**
   ```bash
   docker rm $(docker ps -aq --filter "name=webwaka-{instanceId}")
   ```

3. **Drop database**
   ```bash
   psql -h <db-host> -U postgres -c "DROP DATABASE IF EXISTS <db-name>;"
   ```

4. **Release infrastructure resources**
   - Deallocate compute resources
   - Delete storage volumes
   - Remove network configuration

5. **Update instance status**
   ```bash
   PATCH /api/superadmin/instances/{instanceId}
   {
     "status": "terminated"
   }
   ```

6. **Create audit log**
   ```bash
   POST /api/superadmin/audit-logs
   {
     "action": "instance.provisioning.rollback",
     "resource": { "type": "instance", "id": "{instanceId}" },
     "result": "success",
     "metadata": { "reason": "Provisioning failed at step X" }
   }
   ```

---

## Monitoring & Alerts

### Key Metrics to Monitor

- **Provisioning Duration** - Alert if > 15 minutes
- **Provisioning Success Rate** - Alert if < 95%
- **Resource Utilization** - Alert if > 80%
- **Health Check Status** - Alert on any failures

### Alert Channels

- Email: ops-team@webwaka.com
- Slack: #platform-alerts
- PagerDuty: Platform Operations

---

## Common Issues & Solutions

### Issue: Provisioning Timeout

**Symptoms:** Instance stuck in "provisioning" status for > 15 minutes

**Causes:**
- Infrastructure API timeout
- Network connectivity issues
- Resource exhaustion

**Solutions:**
1. Check infrastructure provider status
2. Verify network connectivity
3. Review resource pool availability
4. Retry provisioning with increased timeout

---

### Issue: Database Migration Failure

**Symptoms:** Migration script fails with errors

**Causes:**
- Schema conflicts
- Permission issues
- Database connectivity problems

**Solutions:**
1. Verify database is empty
2. Check database user permissions
3. Review migration logs
4. Run migrations manually if needed

---

### Issue: Health Check Failures

**Symptoms:** Health checks return "unhealthy" status

**Causes:**
- Service not started
- Configuration errors
- Dependency failures

**Solutions:**
1. Check application logs
2. Verify all services are running
3. Test dependencies (database, Redis)
4. Review configuration

---

## Escalation

### Level 1: Platform Operations Team
- Email: ops-team@webwaka.com
- Slack: #platform-ops
- Response Time: 15 minutes

### Level 2: Platform Engineering Team
- Email: eng-team@webwaka.com
- Slack: #platform-eng
- Response Time: 30 minutes

### Level 3: On-Call Engineer
- PagerDuty: Platform Operations
- Response Time: 15 minutes (24/7)

---

## Appendix

### A. Instance Configuration Schema

```typescript
interface InstanceConfiguration {
  region: string;
  dataResidency: string[];
  enabledSuites: string[];
  enabledCapabilities: string[];
  customDomain?: string;
  sslEnabled: boolean;
}
```

### B. Resource Specifications

| Instance Type | CPU | Memory | Storage | Database |
|---------------|-----|--------|---------|----------|
| Small | 1.0 | 2GB | 20GB | PostgreSQL 15 |
| Medium | 2.0 | 4GB | 50GB | PostgreSQL 15 |
| Large | 4.0 | 8GB | 100GB | PostgreSQL 15 |
| X-Large | 8.0 | 16GB | 200GB | PostgreSQL 15 |

### C. Supported Regions

- ng-lagos (Nigeria - Lagos)
- ng-abuja (Nigeria - Abuja)
- gh-accra (Ghana - Accra)
- ke-nairobi (Kenya - Nairobi)

---

**End of Runbook**
