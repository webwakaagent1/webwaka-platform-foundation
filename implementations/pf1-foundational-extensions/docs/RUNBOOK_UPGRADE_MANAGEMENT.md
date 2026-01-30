# Operational Runbook: Upgrade Management

**Version:** 1.0  
**Last Updated:** January 30, 2026  
**Owner:** Platform Operations Team

## Overview

This runbook provides step-by-step procedures for upgrading WebWaka platform instances. It covers version upgrades, rollback procedures, and update channel management.

## Prerequisites

- Super Admin access to the control plane
- Instance backup completed
- Maintenance window scheduled
- Rollback plan prepared
- Stakeholder notification sent

## Update Channel Policies

### Auto-Update
- Automatically applies all stable releases
- Security patches applied immediately
- Non-breaking updates applied during maintenance window
- Breaking updates require explicit approval

### Manual-Approval
- All updates require explicit approval
- Security patches flagged for urgent review
- Update notifications sent to administrators
- Approval workflow with rollback plan

### Frozen
- No automatic updates
- Only critical security patches (with override capability)
- Explicit version pinning
- Long-term support (LTS) mode

## Upgrade Workflow

### Step 1: Pre-Upgrade Preparation

**Objective:** Prepare the instance for upgrade.

**Actions:**
1. Review upgrade changelog
2. Check compatibility requirements
3. Verify update channel policy
4. Create instance backup
5. Schedule maintenance window
6. Notify stakeholders

**Pre-Upgrade Checklist:**
- [ ] Backup completed successfully
- [ ] Maintenance window scheduled
- [ ] Stakeholders notified
- [ ] Rollback plan prepared
- [ ] Compatibility verified
- [ ] Dependencies checked

**Expected Duration:** 10-15 minutes

**API Calls:**
```bash
# Get current instance version
GET /api/superadmin/instances/{instanceId}

# Get available upgrades
GET /api/superadmin/versions?type=platform&status=stable

# Create backup
POST /api/superadmin/instances/{instanceId}/backup
```

**Troubleshooting:**
- **Error: "Backup failed"** - Check storage availability
- **Error: "Incompatible version"** - Review upgrade path
- **Error: "Dependencies not met"** - Upgrade dependencies first

---

### Step 2: Create Instance Backup

**Objective:** Create a complete backup of the instance.

**Actions:**
1. Put instance in read-only mode (optional)
2. Create database backup
3. Backup application configuration
4. Backup uploaded files/assets
5. Verify backup integrity
6. Store backup securely

**Expected Duration:** 5-10 minutes

**Backup Procedure:**
```bash
# Database backup
pg_dump -h <db-host> -U <db-user> -d <db-name> -F c -f backup-{timestamp}.dump

# Configuration backup
tar -czf config-{timestamp}.tar.gz /app/config

# Verify backup
pg_restore --list backup-{timestamp}.dump
```

**Verification:**
```bash
# Check backup status
GET /api/superadmin/instances/{instanceId}/backups

# Expected: Latest backup with status "completed"
```

**Troubleshooting:**
- **Error: "Backup timeout"** - Increase backup timeout
- **Error: "Insufficient storage"** - Free up storage space
- **Error: "Backup corruption"** - Retry backup

---

### Step 3: Run Pre-Upgrade Checks

**Objective:** Verify the instance is ready for upgrade.

**Actions:**
1. Check instance health
2. Verify database integrity
3. Check disk space availability
4. Verify network connectivity
5. Check for running jobs
6. Validate configuration

**Expected Duration:** 2-3 minutes

**Pre-Upgrade Checks:**
```bash
# Health check
GET /health/status

# Database integrity
psql -h <db-host> -U <db-user> -d <db-name> -c "SELECT pg_database_size(current_database());"

# Disk space
df -h

# Running jobs
GET /api/jobs?status=active
```

**Troubleshooting:**
- **Status: "unhealthy"** - Fix health issues before upgrading
- **Low disk space** - Free up space or expand storage
- **Active jobs** - Wait for jobs to complete or pause queue

---

### Step 4: Put Instance in Maintenance Mode

**Objective:** Prepare instance for upgrade by enabling maintenance mode.

**Actions:**
1. Enable maintenance mode
2. Drain active connections
3. Pause job queue
4. Stop accepting new requests
5. Display maintenance page

**Expected Duration:** 1-2 minutes

**API Call:**
```bash
POST /api/superadmin/instances/{instanceId}/maintenance
{
  "enabled": true,
  "message": "System upgrade in progress. Expected completion: 30 minutes."
}
```

**Verification:**
```bash
# Check maintenance status
GET /api/superadmin/instances/{instanceId}

# Expected: maintenanceMode = true
```

**Troubleshooting:**
- **Error: "Failed to enable maintenance mode"** - Check application status
- **Active connections not draining** - Force disconnect after grace period

---

### Step 5: Pull New Artifacts

**Objective:** Download and prepare new version artifacts.

**Actions:**
1. Pull new Docker images
2. Download database migrations
3. Download configuration updates
4. Verify artifact checksums
5. Prepare deployment files

**Expected Duration:** 3-5 minutes

**Artifact Pull:**
```bash
# Pull Docker images
docker pull webwaka/platform:{new-version}
docker pull webwaka/worker:{new-version}

# Verify images
docker images | grep webwaka

# Download migrations
wget https://releases.webwaka.com/{version}/migrations.tar.gz
```

**Troubleshooting:**
- **Error: "Image pull failed"** - Check registry access
- **Error: "Checksum mismatch"** - Re-download artifacts
- **Error: "Network timeout"** - Retry with increased timeout

---

### Step 6: Run Database Migrations

**Objective:** Update the database schema to the new version.

**Actions:**
1. Backup current schema
2. Run migration scripts
3. Verify schema changes
4. Update schema version
5. Test database integrity

**Expected Duration:** 2-5 minutes

**Migration Procedure:**
```bash
# Backup current schema
pg_dump -h <db-host> -U <db-user> -d <db-name> --schema-only -f schema-backup.sql

# Run migrations
npm run migrate:up

# Verify migrations
psql -h <db-host> -U <db-user> -d <db-name> -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"
```

**Troubleshooting:**
- **Error: "Migration failed"** - Review migration logs
- **Error: "Schema conflict"** - Check for manual schema changes
- **Error: "Permission denied"** - Verify database user permissions

---

### Step 7: Update Configuration

**Objective:** Apply configuration changes for the new version.

**Actions:**
1. Update environment variables
2. Update application configuration
3. Update feature flags
4. Update secrets (if needed)
5. Verify configuration syntax

**Expected Duration:** 1-2 minutes

**Configuration Update:**
```bash
# Update environment variables
export NEW_CONFIG_VALUE=value

# Reload configuration
kill -HUP $(cat /var/run/app.pid)

# Verify configuration
GET /api/config/version
```

**Troubleshooting:**
- **Error: "Invalid configuration"** - Validate configuration syntax
- **Error: "Missing required config"** - Add missing configuration

---

### Step 8: Deploy New Version

**Objective:** Deploy the new application version.

**Actions:**
1. Stop old containers
2. Deploy new containers
3. Start application services
4. Start worker services
5. Verify deployment

**Expected Duration:** 3-5 minutes

**Deployment Procedure:**
```bash
# Stop old containers
docker stop webwaka-app-{instanceId}
docker stop webwaka-worker-{instanceId}

# Deploy new containers
docker run -d --name webwaka-app-{instanceId} webwaka/platform:{new-version}
docker run -d --name webwaka-worker-{instanceId} webwaka/worker:{new-version}

# Verify deployment
docker ps | grep webwaka-{instanceId}
```

**Troubleshooting:**
- **Error: "Container failed to start"** - Check container logs
- **Error: "Port already in use"** - Verify old containers are stopped
- **Error: "Health check failed"** - Review application logs

---

### Step 9: Post-Upgrade Validation

**Objective:** Verify the upgrade was successful.

**Actions:**
1. Run health checks
2. Run smoke tests
3. Verify data integrity
4. Check error logs
5. Monitor performance metrics

**Expected Duration:** 5-10 minutes

**Validation Checks:**
```bash
# Health check
GET /health/status

# Smoke tests
npm run test:smoke -- --instance={instanceId}

# Check version
GET /api/version

# Expected: {new-version}

# Monitor metrics
GET /metrics
```

**Success Criteria:**
- All health checks pass
- Smoke tests pass
- No critical errors in logs
- Performance metrics within normal range
- Version updated correctly

**Troubleshooting:**
- **Health check failures** - Review application logs
- **Smoke test failures** - Investigate and fix issues
- **Performance degradation** - Check resource utilization

---

### Step 10: Exit Maintenance Mode

**Objective:** Restore normal operation.

**Actions:**
1. Disable maintenance mode
2. Resume job queue
3. Enable traffic
4. Monitor for issues
5. Send completion notification

**Expected Duration:** 1-2 minutes

**API Call:**
```bash
POST /api/superadmin/instances/{instanceId}/maintenance
{
  "enabled": false
}
```

**Verification:**
```bash
# Check maintenance status
GET /api/superadmin/instances/{instanceId}

# Expected: maintenanceMode = false

# Verify traffic
curl https://<instance-url>/health
```

**Troubleshooting:**
- **Error: "Failed to disable maintenance mode"** - Check application status
- **High error rate** - Consider rolling back

---

### Step 11: Post-Upgrade Monitoring

**Objective:** Monitor the instance after upgrade.

**Actions:**
1. Monitor error rates
2. Monitor performance metrics
3. Monitor user feedback
4. Check audit logs
5. Document upgrade results

**Monitoring Duration:** 24-48 hours

**Key Metrics:**
- Error rate (should be < 1%)
- Response time (should be < 500ms p95)
- CPU usage (should be < 70%)
- Memory usage (should be < 80%)
- Job queue depth (should be < 100)

**Troubleshooting:**
- **High error rate** - Investigate errors and consider rollback
- **Performance degradation** - Check resource utilization
- **User complaints** - Investigate reported issues

---

## Rollback Procedure

If the upgrade fails or causes issues, follow this rollback procedure:

### Rollback Steps

1. **Enable maintenance mode**
   ```bash
   POST /api/superadmin/instances/{instanceId}/maintenance
   { "enabled": true }
   ```

2. **Stop new version containers**
   ```bash
   docker stop webwaka-app-{instanceId}
   docker stop webwaka-worker-{instanceId}
   ```

3. **Rollback database migrations**
   ```bash
   npm run migrate:down
   ```

4. **Restore previous configuration**
   ```bash
   cp config-backup.json config.json
   ```

5. **Deploy previous version**
   ```bash
   docker run -d --name webwaka-app-{instanceId} webwaka/platform:{old-version}
   docker run -d --name webwaka-worker-{instanceId} webwaka/worker:{old-version}
   ```

6. **Run health checks**
   ```bash
   GET /health/status
   ```

7. **Disable maintenance mode**
   ```bash
   POST /api/superadmin/instances/{instanceId}/maintenance
   { "enabled": false }
   ```

8. **Create audit log**
   ```bash
   POST /api/superadmin/audit-logs
   {
     "action": "instance.upgrade.rollback",
     "resource": { "type": "instance", "id": "{instanceId}" },
     "result": "success",
     "metadata": { "reason": "Upgrade validation failed" }
   }
   ```

9. **Notify stakeholders**
   - Send rollback notification
   - Explain reason for rollback
   - Provide next steps

**Expected Rollback Duration:** 10-15 minutes

---

## Emergency Rollback

For critical issues requiring immediate rollback:

### Emergency Rollback Steps

1. **Trigger emergency rollback**
   ```bash
   POST /api/superadmin/instances/{instanceId}/rollback/emergency
   ```

2. **Automated rollback executes:**
   - Enables maintenance mode
   - Stops new version
   - Restores database from backup
   - Deploys previous version
   - Runs health checks
   - Disables maintenance mode

3. **Verify rollback**
   ```bash
   GET /api/superadmin/instances/{instanceId}
   # Expected: version = {old-version}, status = "active"
   ```

4. **Notify on-call team**
   - PagerDuty alert triggered automatically
   - Email notification sent
   - Slack notification sent

**Expected Emergency Rollback Duration:** 5-10 minutes

---

## Update Channel Management

### Changing Update Channel

**Objective:** Change the update channel policy for an instance.

**API Call:**
```bash
PATCH /api/superadmin/instances/{instanceId}
{
  "updateChannel": "manual-approval"
}
```

**Available Channels:**
- `auto-update` - Automatic updates
- `manual-approval` - Manual approval required
- `frozen` - No updates (except critical security patches)

---

### Version Pinning

**Objective:** Pin an instance to a specific version.

**API Call:**
```bash
PATCH /api/superadmin/instances/{instanceId}
{
  "updateChannel": "frozen",
  "pinnedVersion": "1.2.3"
}
```

**Use Cases:**
- Long-term support (LTS) mode
- Regulatory compliance requirements
- Custom version requirements

---

## Monitoring & Alerts

### Key Metrics to Monitor

- **Upgrade Duration** - Alert if > 30 minutes
- **Upgrade Success Rate** - Alert if < 95%
- **Post-Upgrade Error Rate** - Alert if > 1%
- **Rollback Rate** - Alert if > 5%

### Alert Channels

- Email: ops-team@webwaka.com
- Slack: #platform-alerts
- PagerDuty: Platform Operations

---

## Common Issues & Solutions

### Issue: Migration Timeout

**Symptoms:** Database migration takes too long

**Solutions:**
1. Increase migration timeout
2. Run migrations in batches
3. Optimize migration scripts

---

### Issue: Configuration Mismatch

**Symptoms:** Application fails to start after upgrade

**Solutions:**
1. Verify configuration syntax
2. Check for missing required config
3. Restore previous configuration

---

### Issue: Performance Degradation

**Symptoms:** Slow response times after upgrade

**Solutions:**
1. Check resource utilization
2. Review database query performance
3. Check for memory leaks
4. Consider rollback if severe

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

**End of Runbook**
