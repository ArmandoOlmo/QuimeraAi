/**
 * Domain & Deployment Types
 * Tipos para gestión de dominios y despliegue
 */

// =============================================================================
// DOMAIN MANAGEMENT
// =============================================================================
export type DomainStatus = 'active' | 'pending' | 'error' | 'deploying' | 'deployed';
export type DeploymentProvider = 'vercel' | 'cloudflare' | 'netlify' | 'custom' | null;

export interface DeploymentInfo {
    provider: DeploymentProvider;
    deploymentUrl?: string;
    deploymentId?: string;
    lastDeployedAt?: string;
    status: 'idle' | 'deploying' | 'success' | 'failed';
    error?: string;
}

export interface DeploymentLog {
    id: string;
    timestamp: string;
    status: 'started' | 'success' | 'failed';
    message: string;
    details?: string;
}

export interface Domain {
    id: string;
    name: string;
    status: DomainStatus;
    provider: 'Quimera' | 'External';
    projectId?: string;
    expiryDate?: string;
    dnsRecords?: {
        type: 'A' | 'CNAME' | 'TXT';
        host: string;
        value: string;
        verified?: boolean;
    }[];
    createdAt: string;
    deployment?: DeploymentInfo;
    deploymentLogs?: DeploymentLog[];
}



