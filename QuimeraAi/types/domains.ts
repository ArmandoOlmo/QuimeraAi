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
    // Agency Landing Page binding (alternative to projectId)
    // When set, the SSR server should serve the agency landing page for this tenant
    agencyLandingTenantId?: string;
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
    // Agency Landing Page binding (alternative to projectId)
    agencyLandingTenantId?: string;
}

// =============================================================================
// DNS CONFIGURATION
// Cloud Run direct CNAME (works without domain mapping in GCP)
// =============================================================================
export const CLOUD_RUN_DNS_CONFIG = {
    // Direct Cloud Run URL
    cloudRunUrl: 'quimera-ssr-575386543550.us-central1.run.app',

    // Google Load Balancer IP (quimera-domains-lb)
    // This is the IP users should use for A records
    aRecords: [
        '130.211.43.242'
    ],
    // CNAME target for www subdomain
    // www should CNAME to the root domain (e.g. www.example.com → example.com)
    // This ensures www resolves to the same LB IP via the A record
    cnameTarget: 'root-domain', // Dynamic: use the actual domain name
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
