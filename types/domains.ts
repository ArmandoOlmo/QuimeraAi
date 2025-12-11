/**
 * Domain & Deployment Types
 * Tipos para gestión de dominios y despliegue
 */

// =============================================================================
// DOMAIN MANAGEMENT
// =============================================================================
export type DomainStatus = 'active' | 'pending' | 'verifying' | 'ssl_pending' | 'error' | 'deploying' | 'deployed';
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
    timestamp: string;
    status: 'started' | 'success' | 'failed';
    message: string;
    details?: string;
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
    expiryDate?: string;
    dnsRecords?: DNSRecord[];
    createdAt: string;
    deployment?: DeploymentInfo;
    deploymentLogs?: DeploymentLog[];
    // SSL Certificate info
    sslStatus?: SSLStatus;
    sslExpiresAt?: string;
    // Verification
    verificationToken?: string;
    lastVerifiedAt?: string;
    verificationAttempts?: number;
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
// Cloud Run IP addresses and CNAME targets
// =============================================================================
export const CLOUD_RUN_DNS_CONFIG = {
    // Cloud Run uses Google's global load balancer IPs
    // These are the IPs users should point their A records to
    aRecords: [
        '216.239.32.21',
        '216.239.34.21',
        '216.239.36.21',
        '216.239.38.21'
    ],
    // CNAME target for www subdomain
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




















