export type InstanceType = 'shared-saas' | 'partner-deployed' | 'self-hosted-enterprise';
export type InstanceStatus = 'provisioning' | 'active' | 'suspended' | 'terminated';
export type UpdateChannel = 'auto-update' | 'manual-approval' | 'frozen';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface InstanceConfiguration {
  region: string;
  dataResidency: string[];
  enabledSuites: string[];
  enabledCapabilities: string[];
  customDomain?: string;
  sslEnabled: boolean;
  [key: string]: any;
}

export interface InstanceResources {
  cpu: string;
  memory: string;
  storage: string;
  database: string;
}

export interface InstanceMetadata {
  createdAt: Date;
  createdBy: string;
  partnerId?: string;
  tenantId?: string;
  [key: string]: any;
}

export interface InstanceHealth {
  lastHealthCheck: Date;
  status: HealthStatus;
  uptime: number;
  metrics: Record<string, any>;
}

export interface Instance {
  id: string;
  name: string;
  type: InstanceType;
  status: InstanceStatus;
  version: string;
  updateChannel: UpdateChannel;
  configuration: InstanceConfiguration;
  resources: InstanceResources;
  metadata: InstanceMetadata;
  health: InstanceHealth;
}

export interface CreateInstanceInput {
  name: string;
  type: InstanceType;
  updateChannel?: UpdateChannel;
  configuration: Partial<InstanceConfiguration>;
  resources?: Partial<InstanceResources>;
  metadata: Partial<InstanceMetadata>;
}

export interface UpdateInstanceInput {
  name?: string;
  updateChannel?: UpdateChannel;
  configuration?: Partial<InstanceConfiguration>;
  resources?: Partial<InstanceResources>;
}

export interface InstanceFilter {
  type?: InstanceType;
  status?: InstanceStatus;
  partnerId?: string;
  tenantId?: string;
  version?: string;
}
