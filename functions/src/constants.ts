/**
 * Cloud Functions Constants
 * 
 * SECURITY: Owner email is loaded from environment variable
 * Set OWNER_EMAIL in your Cloud Functions environment config
 * Run: firebase functions:config:set app.owner_email="your-email@example.com"
 * Or set it in .env file for local development
 */

// Get owner email from environment variable
export const OWNER_EMAIL = process.env.OWNER_EMAIL || '';

/**
 * Robust check if a UID or Email belongs to the owner.
 * In Cloud Functions, we might only have one or the other depending on the context.
 */
export const isOwner = (identifier: string | undefined | null): boolean => {
    if (!identifier || !OWNER_EMAIL) return false;
    // Note: In some contexts, we might have UID. For the owner, we know the email, 
    // but Cloud Functions often handle UIDs. We'll rely on the email check where possible,
    // and role checks as a secondary layer.
    return identifier.toLowerCase() === OWNER_EMAIL.toLowerCase();
};
