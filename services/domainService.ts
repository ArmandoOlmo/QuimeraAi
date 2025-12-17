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







