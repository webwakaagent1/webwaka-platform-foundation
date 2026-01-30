# WebWaka PF-1: Foundational Extensions

**Version:** 1.0.0  
**Status:** 🟡 In Progress  
**Canonical Reference:** [PF-1: Foundational Extensions](../docs/phases/PF-1_FOUNDATIONAL_EXTENSIONS.md)

## Overview

This repository contains the implementation of **PF-1: Foundational Extensions**, the first platform foundation phase of the WebWaka platform. This phase establishes the critical infrastructure primitives required to support stateful compute, instance orchestration, and the Super Admin control plane.

## Core Components

### 1. Stateful Compute Infrastructure
- **Job Queue System** - BullMQ-based job queue with priority support, automatic retries, and dead letter queue
- **Scheduler System** - Cron-based scheduler with distributed coordination and timezone support
- **Worker Orchestration** - Auto-scaling worker pool with health monitoring and graceful shutdown

### 2. Instance Orchestration Service
- **Instance Provisioning** - Automated provisioning workflow for new platform instances
- **Lifecycle Management** - Complete lifecycle management (provision, configure, upgrade, suspend, terminate)
- **Health Monitoring** - Continuous health checks and metrics collection
- **Multi-Instance Support** - Manage thousands of isolated platform instances

### 3. Super Admin Control Plane
- **Dedicated API** - Isolated API for platform-wide operations
- **Audit Logging** - Comprehensive, immutable audit trail of all administrative actions
- **Access Control** - Multi-factor authentication, IP whitelisting, role-based access control
- **Configuration Management** - Platform-wide configuration and governance

### 4. Version & Upgrade Control Service
- **Version Management** - Track and manage platform, suite, and capability versions
- **Update Channels** - Support for auto-update, manual-approval, and frozen update policies
- **Upgrade Workflows** - Automated upgrade workflows with rollback capability
- **Compliance** - Version pinning and long-term support (LTS) mode

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 18+ |
| Language | TypeScript | 5.3+ |
| Web Framework | Express.js | 4.18+ |
| Database | PostgreSQL | 15+ |
| Cache/Queue | Redis | 7+ |
| Job Queue | BullMQ | 5.1+ |
| Logging | Winston | 3.11+ |
| Monitoring | Prometheus | Latest |
| Dashboards | Grafana | Latest |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Super Admin Control Plane                │
│  (Isolated Network, Audited Access, Dedicated Database)     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Secure API Gateway
                              │
┌─────────────────────────────────────────────────────────────┐
│                  Instance Orchestration Layer                │
│  - Instance Provisioning Service                             │
│  - Configuration Management                                  │
│  - Health Monitoring                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Stateful Compute Layer                     │
│  - Job Queue (BullMQ)                                        │
│  - Scheduler (Node-cron)                                     │
│  - Worker Pool (Auto-scaling)                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Platform Instances                        │
│  (Tenant-Isolated, Independently Deployable)                 │
└─────────────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pf1-implementation
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start infrastructure (Docker)**
   ```bash
   docker-compose up -d postgres redis
   ```

5. **Run database migrations**
   ```bash
   npm run migrate:up
   ```

6. **Start the application**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm run build
   npm start
   ```

### Docker Deployment

To run the entire stack with Docker:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Redis cache/queue
- Application server
- Prometheus monitoring
- Grafana dashboards

Access points:
- Application: http://localhost:3000
- Grafana: http://localhost:3001 (admin/admin)
- Prometheus: http://localhost:9091

## API Documentation

### Super Admin Endpoints

#### Platform Configuration
```
POST   /api/superadmin/config                    # Update platform configuration
GET    /api/superadmin/config                    # Get platform configuration
```

#### Partner Management
```
POST   /api/superadmin/partners                  # Create partner
GET    /api/superadmin/partners                  # List partners
GET    /api/superadmin/partners/:id              # Get partner details
PATCH  /api/superadmin/partners/:id              # Update partner
DELETE /api/superadmin/partners/:id              # Delete partner
```

#### Instance Management
```
POST   /api/superadmin/instances                 # Provision instance
GET    /api/superadmin/instances                 # List instances
GET    /api/superadmin/instances/:id             # Get instance details
PATCH  /api/superadmin/instances/:id             # Update instance
DELETE /api/superadmin/instances/:id             # Terminate instance
POST   /api/superadmin/instances/:id/upgrade     # Upgrade instance
```

#### Audit Logs
```
GET    /api/superadmin/audit-logs                # Query audit logs
GET    /api/superadmin/audit-logs/:id            # Get audit log details
POST   /api/superadmin/audit-logs/export         # Export audit logs
```

### Job Queue Endpoints

```
POST   /api/jobs                                 # Create job
GET    /api/jobs                                 # List jobs
GET    /api/jobs/:id                             # Get job details
GET    /api/jobs/stats                           # Get job statistics
```

## Testing

### Run all tests
```bash
npm test
```

### Run unit tests
```bash
npm run test:unit
```

### Run integration tests
```bash
npm run test:integration
```

### Run end-to-end tests
```bash
npm run test:e2e
```

### Generate coverage report
```bash
npm run test:coverage
```

## Development

### Code Style

This project uses ESLint and Prettier for code formatting:

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Database Migrations

```bash
# Create new migration
npm run migrate:create <migration-name>

# Run migrations
npm run migrate:up

# Rollback migrations
npm run migrate:down
```

## Monitoring & Observability

### Metrics

The application exposes Prometheus metrics at `/metrics`:

- System metrics (CPU, memory, disk)
- Application metrics (request rate, error rate, latency)
- Job queue metrics (queue depth, processing rate, failure rate)
- Business metrics (active instances, provisioning rate)

### Logging

Logs are structured JSON format with the following levels:
- ERROR - Error events
- WARN - Warning events
- INFO - Informational events
- DEBUG - Debug events

Logs are written to:
- Console (development)
- Files (production): `logs/error.log`, `logs/combined.log`

### Dashboards

Grafana dashboards are available at http://localhost:3001:
- System Overview
- Job Queue Metrics
- Instance Health
- Audit Log Activity

## Security

### Authentication

- JWT-based authentication
- Multi-factor authentication (MFA) for Super Admins
- Session management with automatic expiration

### Authorization

- Role-based access control (RBAC)
- Super Admin, Partner Admin, Tenant Admin roles
- IP whitelisting for Super Admin access

### Audit Logging

- All Super Admin actions are logged
- Logs are immutable (append-only)
- 7-year retention policy
- Searchable and exportable

### Data Security

- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- Database encryption
- Secrets management

## Platform Invariants

This implementation enforces the following platform invariants:

- **INV-002: Strict Tenant Isolation** - Super Admin control plane is architecturally separated from tenant operations
- **INV-003: Audited Super Admin Access** - All Super Admin actions are logged and auditable
- **INV-004: Layered Dependency Rule** - Foundation-layer primitives with no higher-layer dependencies
- **INV-008: Update Policy as Governed Lifecycle** - Support for all update channel policies and version pinning

## Deployment

### Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Set production environment variables

3. Run database migrations:
   ```bash
   NODE_ENV=production npm run migrate:up
   ```

4. Start the application:
   ```bash
   NODE_ENV=production npm start
   ```

### Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `NODE_ENV` - Environment (development/production)
- `PORT` - Application port
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database configuration
- `REDIS_HOST`, `REDIS_PORT` - Redis configuration
- `JWT_SECRET` - JWT signing secret

## Troubleshooting

### Database connection issues
```bash
# Test database connection
psql -h localhost -U postgres -d webwaka_pf1
```

### Redis connection issues
```bash
# Test Redis connection
redis-cli ping
```

### Job queue not processing
```bash
# Check Redis queue
redis-cli KEYS "bull:webwaka-jobs:*"
```

## Contributing

This is a proprietary project. For internal development guidelines, see `CONTRIBUTING.md`.

## License

PROPRIETARY - All rights reserved by WebWaka

## Support

For issues and questions:
- Internal: Contact the platform team
- Documentation: See `/docs` directory
- Architecture: See `ARCH_PF1_FOUNDATIONAL_EXTENSIONS.md`

## Related Documents

- [PF-1: Foundational Extensions](../docs/phases/PF-1_FOUNDATIONAL_EXTENSIONS.md) - Phase definition
- [Architecture Document](../docs/architecture/ARCH_PF1_FOUNDATIONAL_EXTENSIONS.md) - Complete architecture
- [Master Control Board](../docs/governance/WEBWAKA_MASTER_CONTROL_BOARD.md) - Governance document

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-30 | Initial implementation |

---

**End of README**
