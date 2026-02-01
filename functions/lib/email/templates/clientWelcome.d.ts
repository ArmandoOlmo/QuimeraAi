/**
 * Client Welcome Email Template
 * Sent when a new sub-client is provisioned by an agency
 */
export interface ClientWelcomeData {
    userName: string;
    clientName: string;
    agencyName: string;
    agencyLogo?: string;
    agencyPrimaryColor?: string;
    inviteLink: string;
    setupSteps?: string[];
}
/**
 * Generate HTML email template for client welcome
 */
export declare function getClientWelcomeTemplate(data: ClientWelcomeData): string;
/**
 * Generate plain text version for email clients that don't support HTML
 */
export declare function getClientWelcomeTextVersion(data: ClientWelcomeData): string;
/**
 * Get email subject line
 */
export declare function getClientWelcomeSubject(data: ClientWelcomeData): string;
