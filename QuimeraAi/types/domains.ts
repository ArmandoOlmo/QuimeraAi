/**
 * Domain & Deployment Types
 * Tipos para gestión de dominios y despliegue
 */

// =============================================================================
// DOMAIN MANAGEMENT
// =============================================================================
export type DomainStatus = 'active' | 'pending' | 'verifying' | 'ssl_pending' | 'error' | 'deploying' | 'deployed' | 'pending_nameservers';
export type SSLStatus = 'pending' | 'provisioning' | 'active' | 'error';
export type DeploymentProvider = 'vercel' | 'cloudflare' | 'netlify' | 'cloud_run' | 'custom' | null;

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
    projectId: string; // Required - deployment logs are scoped to a project
    domainId?: string;
    timestamp: string;
    status: 'started' | 'success' | 'failed';
    message: string;
    details?: string;
    action?: string;
    provider?: string;
    url?: string;
    error?: string;
}

export interface DNSRecord {
    type: 'A' | 'CNAME' | 'TXT' | 'AAAA';
    host: string;
    value: string;
    verified?: boolean;
    lastChecked?: string;
}

export interface Domain {
    id: string;
    name: string;
    status: DomainStatus;
    provider: 'Quimera' | 'External';
    projectId?: string;
    projectUserId?: string; // User ID of the project owner (needed for deployment lookup)
    projectTenantId?: string; // Tenant ID if project belongs to a tenant
    expiryDate?: string;
    dnsRecords?: DNSRecord[];
    createdAt: string;
    updatedAt?: string;
    deployment?: DeploymentInfo;
    deploymentLogs?: DeploymentLog[];
    // SSL Certificate info
    sslStatus?: SSLStatus;
    sslExpiresAt?: string;
    // Verification
    verificationToken?: string;
    verifiedAt?: string;
    lastVerifiedAt?: string;
    verificationAttempts?: number;
    // Infrastructure
    cloudRunMappingCreated?: boolean;
    cloudRunMappingStatus?: string; // e.g. 'ready', 'pending', 'error'
    cloudRunError?: string; // Additional error details for UI
    cloudflareConfigured?: boolean;
    cloudflareNameservers?: string[];
    // Load Balancer Configuration (Modern SaaS model)
    useLoadBalancer?: boolean;
    loadBalancerIp?: string;
    dnsConfig?: {
        aRecord: string;
        cnameRecord: string;
    };
}

// =============================================================================
// CUSTOM DOMAIN MAPPING (Global Firestore Collection)
// This is stored in /customDomains/{domain} for fast lookups
// =============================================================================
export interface CustomDomainMapping {
    // The domain name (also used as document ID)
    domain: string;
    // The project this domain points to
    projectId: string;
    // Owner of the domain/project
    userId: string;
    // Current status
    status: DomainStatus;
    // SSL certificate status
    sslStatus: SSLStatus;
    // DNS verification
    dnsVerified: boolean;
    dnsRecords: DNSRecord[];
    // Verification token for TXT record (optional)
    verificationToken?: string;
    // Timestamps
    createdAt: string;
    updatedAt: string;
    verifiedAt?: string;
    // Cloud Run specific
    cloudRunService?: string;
    cloudRunRegion?: string;
}

// =============================================================================
// DNS CONFIGURATION
// Cloud Run direct CNAME (works without domain mapping in GCP)
// =============================================================================
export const CLOUD_RUN_DNS_CONFIG = {
    // Direct Cloud Run URL - works without GCP domain mapping
    // Users should use CNAME records pointing to this
    cloudRunUrl: 'quimera-ssr-575386543550.us-central1.run.app',

    // Legacy: Google's global load balancer IPs (requires GCP domain mapping)
    // These ONLY work if domain is mapped in Google Cloud Console
    aRecords: [
        '216.239.32.21',
        '216.239.34.21',
        '216.239.36.21',
        '216.239.38.21'
    ],
    // Legacy CNAME target (requires GCP domain mapping)
    cnameTarget: 'ghs.googlehosted.com',
    // TXT record prefix for verification
    txtPrefix: '_quimera-verify'
} as const;

// =============================================================================
// VERIFICATION RESULT
// =============================================================================
export interface DNSVerificationResult {
    domain: string;
    verified: boolean;
    records: {
        type: 'A' | 'CNAME' | 'TXT';
        expected: string;
        found: string[];
        verified: boolean;
    }[];
    error?: string;
    checkedAt: string;
}
