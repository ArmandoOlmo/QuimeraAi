/**
 * Cloud Functions Constants
 */

export const OWNER_EMAIL = 'armandoolmomiranda@gmail.com';

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
