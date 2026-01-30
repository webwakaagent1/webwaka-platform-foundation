-- WebWaka PF-1 Initial Database Schema
-- Version: 1.0.0
-- Date: 2026-01-30

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Platform Configuration Table
CREATE TABLE IF NOT EXISTS platform_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by VARCHAR(255) NOT NULL
);

-- Partners Table
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  configuration JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL
);

-- Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID REFERENCES partners(id),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  configuration JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL
);

-- Instances Table
CREATE TABLE IF NOT EXISTS instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'provisioning',
  version VARCHAR(50) NOT NULL,
  update_channel VARCHAR(50) NOT NULL DEFAULT 'manual-approval',
  configuration JSONB NOT NULL DEFAULT '{}',
  resources JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  health JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL
);

-- Versions Table
CREATE TABLE IF NOT EXISTS versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  release_date TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  changelog TEXT,
  breaking BOOLEAN NOT NULL DEFAULT FALSE,
  security_patch BOOLEAN NOT NULL DEFAULT FALSE,
  dependencies JSONB NOT NULL DEFAULT '{}',
  artifacts JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(255) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5,
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  error TEXT,
  result JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'
);

-- Schedules Table
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cron_expression VARCHAR(255) NOT NULL,
  timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
  job_type VARCHAR(255) NOT NULL,
  job_payload JSONB NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Audit Logs Table (Immutable)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  actor JSONB NOT NULL,
  action VARCHAR(255) NOT NULL,
  resource JSONB NOT NULL,
  changes JSONB,
  result VARCHAR(50) NOT NULL,
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_instances_status ON instances(status);
CREATE INDEX IF NOT EXISTS idx_instances_type ON instances(type);
CREATE INDEX IF NOT EXISTS idx_instances_version ON instances(version);
CREATE INDEX IF NOT EXISTS idx_instances_created_at ON instances((metadata->>'createdAt'));

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_metadata_instance ON jobs((metadata->>'instanceId'));
CREATE INDEX IF NOT EXISTS idx_jobs_metadata_tenant ON jobs((metadata->>'tenantId'));

CREATE INDEX IF NOT EXISTS idx_schedules_enabled ON schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_schedules_next_run_at ON schedules(next_run_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs((actor->>'id'));
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_type ON audit_logs((actor->>'type'));
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs((resource->>'type'));
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs((resource->>'id'));

CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_partner_id ON tenants(partner_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_platform_config_updated_at BEFORE UPDATE ON platform_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instances_updated_at BEFORE UPDATE ON instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default platform configuration
INSERT INTO platform_config (key, value, description, updated_by) VALUES
  ('platform.name', '"WebWaka"', 'Platform name', 'system'),
  ('platform.version', '"1.0.0"', 'Current platform version', 'system'),
  ('platform.environment', '"production"', 'Platform environment', 'system')
ON CONFLICT (key) DO NOTHING;

-- Comments
COMMENT ON TABLE platform_config IS 'Platform-wide configuration settings';
COMMENT ON TABLE partners IS 'Partner organizations that deploy WebWaka';
COMMENT ON TABLE tenants IS 'End customers of partners';
COMMENT ON TABLE instances IS 'Deployed platform instances';
COMMENT ON TABLE versions IS 'Platform and suite versions';
COMMENT ON TABLE jobs IS 'Background job queue';
COMMENT ON TABLE schedules IS 'Scheduled job definitions';
COMMENT ON TABLE audit_logs IS 'Immutable audit trail of all administrative actions';
