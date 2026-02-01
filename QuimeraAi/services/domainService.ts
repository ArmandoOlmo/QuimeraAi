/**
 * Domain Service
 * 
 * Client-side service for managing custom domains.
 * Communicates with Cloud Functions for domain operations.
 */

import { getFunctionsInstance } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { DNSRecord, CustomDomainMapping, DNSVerificationResult, CLOUD_RUN_DNS_CONFIG } from '../types/domains';

/**
 * Add a custom domain to a project
 */
export async function addCustomDomainToProject(
    domain: string,
    projectId: string
): Promise<{
    success: boolean;
    domain: string;
    dnsRecords: DNSRecord[];
    verificationToken?: string;
    error?: string;
}> {
    try {
        const functions = await getFunctionsInstance();
        const addDomainFn = httpsCallable<
            { domain: string; projectId: string },
            { success: boolean; domain: string; dnsRecords: DNSRecord[]; verificationToken: string }
        >(functions, 'domains-add');

        const result = await addDomainFn({ domain, projectId });
        return result.data;

    } catch (error: any) {
        console.error('[DomainService] Error adding domain:', error);
        return {
            success: false,
            domain,
            dnsRecords: [],
            error: error.message || 'Failed to add domain'
        };
    }
}

/**
 * Remove a custom domain
 */
export async function removeCustomDomainFromProject(domain: string): Promise<{ success: boolean; error?: string }> {
    try {
        const functions = await getFunctionsInstance();
        const removeDomainFn = httpsCallable<{ domain: string }, { success: boolean }>(
            functions,
            'domains-remove'
        );

        const result = await removeDomainFn({ domain });
        return result.data;

    } catch (error: any) {
        console.error('[DomainService] Error removing domain:', error);
        return {
            success: false,
            error: error.message || 'Failed to remove domain'
        };
    }
}

/**
 * Verify DNS records for a domain
 */
export async function verifyDomainDNS(domain: string): Promise<DNSVerificationResult> {
    try {
        const functions = await getFunctionsInstance();
        const verifyDNSFn = httpsCallable<{ domain: string }, DNSVerificationResult>(
            functions,
            'domains-verifyDNS'
        );

        const result = await verifyDNSFn({ domain });
        return result.data;

    } catch (error: any) {
        console.error('[DomainService] Error verifying DNS:', error);
        return {
            domain,
            verified: false,
            records: [],
            error: error.message || 'DNS verification failed',
            checkedAt: new Date().toISOString()
        };
    }
}

/**
 * Check SSL status for a domain
 */
export async function checkDomainSSLStatus(domain: string): Promise<{
    sslStatus: 'pending' | 'provisioning' | 'active' | 'error';
    status: string;
}> {
    try {
        const functions = await getFunctionsInstance();
        const checkSSLFn = httpsCallable<
            { domain: string },
            { sslStatus: 'pending' | 'provisioning' | 'active' | 'error'; status: string }
        >(functions, 'domains-checkSSL');

        const result = await checkSSLFn({ domain });
        return result.data;

    } catch (error: any) {
        console.error('[DomainService] Error checking SSL:', error);
        return {
            sslStatus: 'error',
            status: 'error'
        };
    }
}

/**
 * Get DNS configuration for Cloud Run
 */
export function getDNSConfiguration(): typeof CLOUD_RUN_DNS_CONFIG {
    return CLOUD_RUN_DNS_CONFIG;
}

/**
 * Generate DNS records that user needs to configure
 */
export function generateRequiredDNSRecords(verificationToken?: string): DNSRecord[] {
    const config = CLOUD_RUN_DNS_CONFIG;

    const records: DNSRecord[] = [
        {
            type: 'A',
            host: '@',
            value: config.aRecords[0],
            verified: false
        },
        {
            type: 'CNAME',
            host: 'www',
            value: config.cnameTarget,
            verified: false
        }
    ];

    // Add TXT verification record if token provided
    if (verificationToken) {
        records.push({
            type: 'TXT',
            host: config.txtPrefix,
            value: `quimera-verify=${verificationToken}`,
            verified: false
        });
    }

    return records;
}

/**
 * Normalize a domain name
 */
export function normalizeDomain(domain: string): string {
    return domain
        .toLowerCase()
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '')
        .split('/')[0];
}

/**
 * Validate domain format
 */
export function isValidDomain(domain: string): boolean {
    const normalized = normalizeDomain(domain);
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    return domainRegex.test(normalized) && normalized.length <= 253;
}

/**
 * Get user-friendly status message
 */
export function getDomainStatusMessage(status: string): string {
    const messages: Record<string, string> = {
        'pending': 'Esperando configuración DNS',
        'verifying': 'Verificando registros DNS...',
        'ssl_pending': 'Generando certificado SSL...',
        'active': 'Dominio activo y funcionando',
        'error': 'Error en la configuración',
        'deploying': 'Desplegando sitio...',
        'deployed': 'Sitio desplegado correctamente'
    };
    return messages[status] || status;
}

/**
 * Get SSL status message
 */
export function getSSLStatusMessage(status: string): string {
    const messages: Record<string, string> = {
        'pending': 'Esperando verificación DNS',
        'provisioning': 'Generando certificado SSL...',
        'active': 'Certificado SSL activo',
        'error': 'Error en certificado SSL'
    };
    return messages[status] || status;
}

// =============================================================================
// SIMPLIFIED EXTERNAL DOMAIN SETUP (via Cloudflare)
// =============================================================================

export interface ExternalDomainSetupResult {
    success: boolean;
    domain: string;
    nameservers: string[];
    zoneId?: string;
    instructions?: {
        step1: string;
        step2: string;
        step3: string;
        nameservers: string[];
        step4: string;
        step5: string;
    };
    error?: string;
}

export interface NameserverVerificationResult {
    verified: boolean;
    status: string;
    message: string;
    nameservers?: string[];
}

/**
 * Setup external domain with Cloudflare (SIMPLIFIED FLOW)
 * 
 * This automatically:
 * 1. Creates a Cloudflare DNS zone
 * 2. Configures DNS records to point to Cloud Run
 * 3. Returns nameservers for the user to update at their registrar
 */
export async function setupExternalDomainWithCloudflare(
    domain: string,
    projectId?: string
): Promise<ExternalDomainSetupResult> {
    try {
        const functions = await getFunctionsInstance();
        const setupFn = httpsCallable<
            { domain: string; projectId?: string },
            ExternalDomainSetupResult
        >(functions, 'domains-setupExternalWithCloudflare');

        const result = await setupFn({ domain, projectId });
        return result.data;

    } catch (error: any) {
        console.error('[DomainService] Error setting up external domain:', error);
        return {
            success: false,
            domain,
            nameservers: [],
            error: error.message || 'Failed to setup external domain'
        };
    }
}

/**
 * Verify that nameservers have been changed for external domain
 */
export async function verifyExternalDomainNameservers(
    domain: string
): Promise<NameserverVerificationResult> {
    try {
        const functions = await getFunctionsInstance();
        const verifyFn = httpsCallable<
            { domain: string },
            NameserverVerificationResult
        >(functions, 'domains-verifyExternalNameservers');

        const result = await verifyFn({ domain });
        return result.data;

    } catch (error: any) {
        console.error('[DomainService] Error verifying nameservers:', error);
        return {
            verified: false,
            status: 'error',
            message: error.message || 'Failed to verify nameservers'
        };
    }
}

/**
 * Migrate existing domain to Cloudflare (simplified flow)
 * For domains already configured with the old DNS method
 */
export async function migrateExistingDomainToCloudflare(
    domain: string
): Promise<ExternalDomainSetupResult> {
    try {
        const functions = await getFunctionsInstance();
        const migrateFn = httpsCallable<
            { domain: string },
            ExternalDomainSetupResult
        >(functions, 'domains-migrateToCloudflare');

        const result = await migrateFn({ domain });
        return result.data;

    } catch (error: any) {
        console.error('[DomainService] Error migrating domain:', error);
        return {
            success: false,
            domain,
            nameservers: [],
            error: error.message || 'Failed to migrate domain'
        };
    }
}

// =============================================================================
// CLOUD RUN DOMAIN MAPPING (Automatic SSL)
// =============================================================================

export interface DomainMappingResult {
    success: boolean;
    domain: string;
    status?: string;
    message?: string;
    error?: string;
}

export interface FullDomainSetupResult {
    success: boolean;
    domain: string;
    cloudRunStatus: string;
    cloudflareConfigured: boolean;
    nameservers?: string[] | null;
    dnsInstructions?: {
        aRecords: string[];
        cnameTarget: string;
        message: string;
    };
    message: string;
    error?: string;
}

/**
 * Create Cloud Run domain mapping for automatic SSL certificate
 * This is required for end-to-end SSL with custom domains
 */
export async function createCloudRunDomainMapping(
    domain: string
): Promise<DomainMappingResult> {
    try {
        const functions = await getFunctionsInstance();
        const createFn = httpsCallable<
            { domain: string },
            DomainMappingResult
        >(functions, 'domains-createMapping');

        const result = await createFn({ domain });
        return result.data;

    } catch (error: any) {
        console.error('[DomainService] Error creating Cloud Run mapping:', error);
        return {
            success: false,
            domain,
            error: error.message || 'Failed to create domain mapping'
        };
    }
}

/**
 * Check Cloud Run domain mapping status
 */
export async function checkCloudRunDomainMappingStatus(domain: string): Promise<{
    domain: string;
    exists: boolean;
    ready: boolean;
    certificateStatus?: string;
    error?: string;
}> {
    try {
        const functions = await getFunctionsInstance();
        const checkFn = httpsCallable<
            { domain: string },
            { domain: string; exists: boolean; ready: boolean; certificateStatus?: string; error?: string }
        >(functions, 'domains-checkMappingStatus');

        const result = await checkFn({ domain });
        return result.data;

    } catch (error: any) {
        console.error('[DomainService] Error checking domain mapping status:', error);
        return {
            domain,
            exists: false,
            ready: false,
            error: error.message || 'Failed to check status'
        };
    }
}

/**
 * Full domain setup: Creates both Cloud Run mapping (SSL) and Cloudflare zone (DNS)
 * This is the "one-click" solution for external domains
 */
export async function setupFullDomainMapping(
    domain: string,
    projectId?: string
): Promise<FullDomainSetupResult> {
    try {
        const functions = await getFunctionsInstance();
        const setupFn = httpsCallable<
            { domain: string; projectId?: string },
            FullDomainSetupResult
        >(functions, 'domains-setupFull');

        const result = await setupFn({ domain, projectId });
        return result.data;

    } catch (error: any) {
        console.error('[DomainService] Error in full domain setup:', error);
        return {
            success: false,
            domain,
            cloudRunStatus: 'error',
            cloudflareConfigured: false,
            message: error.message || 'Failed to setup domain',
            error: error.message
        };
    }
}









