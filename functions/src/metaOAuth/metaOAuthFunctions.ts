/**
 * Meta OAuth Cloud Functions
 * Complete OAuth flow for Facebook, Instagram, and WhatsApp Business
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';
import { META_CONFIG } from '../config';

// Initialize if not already
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// =============================================================================
// CONSTANTS
// =============================================================================

const META_GRAPH_API_VERSION = 'v18.0';
const META_GRAPH_API_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;
const META_OAUTH_BASE = 'https://www.facebook.com';

// Get config from centralized config
const getMetaConfig = () => ({
    appId: META_CONFIG.appId,
    appSecret: META_CONFIG.appSecret,
    redirectUri: META_CONFIG.redirectUri,
});

// Default scopes for OAuth
const DEFAULT_SCOPES = [
    'public_profile',
    'email',
    'pages_messaging',
    'pages_manage_metadata',
    'pages_read_engagement',
    'pages_show_list',
    'whatsapp_business_messaging',
    'whatsapp_business_management',
    'instagram_basic',
    'instagram_manage_messages',
    'business_management',
];

// =============================================================================
// OAUTH INITIALIZATION
// =============================================================================

/**
 * Initialize OAuth flow - returns the URL to redirect user to
 */
export const metaOAuthInit = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }

    const { projectId, returnUrl } = data;

    if (!projectId) {
        throw new functions.https.HttpsError('invalid-argument', 'Project ID is required');
    }

    const config = getMetaConfig();

    if (!config.appId) {
        throw new functions.https.HttpsError('failed-precondition', 'Meta App not configured');
    }

    // Create state object with security nonce
    const stateObj = {
        projectId,
        userId: context.auth.uid,
        returnUrl: returnUrl || '/dashboard/ai',
        nonce: generateNonce(),
        timestamp: Date.now(),
    };

    // Store state in Firestore for validation
    const stateId = `oauth_${context.auth.uid}_${Date.now()}`;
    await db.collection('metaOAuthStates').doc(stateId).set({
        ...stateObj,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Build OAuth URL
    const params = new URLSearchParams({
        client_id: config.appId,
        redirect_uri: config.redirectUri,
        scope: DEFAULT_SCOPES.join(','),
        response_type: 'code',
        state: stateId,
    });

    const oauthUrl = `${META_OAUTH_BASE}/${META_GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;

    return { oauthUrl, stateId };
});

// =============================================================================
// OAUTH CALLBACK
// =============================================================================

/**
 * Handle OAuth callback from Meta
 */
export const metaOAuthCallback = functions.https.onRequest(async (req, res) => {
    const { code, state, error, error_description } = req.query;

    // Handle errors from Meta
    if (error) {
        console.error('Meta OAuth error:', error, error_description);
        return res.redirect(`/auth/meta/error?error=${encodeURIComponent(error as string)}&description=${encodeURIComponent(error_description as string || '')}`);
    }

    if (!code || !state) {
        return res.redirect('/auth/meta/error?error=missing_params');
    }

    try {
        // Validate state
        const stateDoc = await db.collection('metaOAuthStates').doc(state as string).get();
        
        if (!stateDoc.exists) {
            return res.redirect('/auth/meta/error?error=invalid_state');
        }

        const stateData = stateDoc.data()!;
        
        // Check expiration
        if (stateData.expiresAt.toMillis() < Date.now()) {
            await stateDoc.ref.delete();
            return res.redirect('/auth/meta/error?error=state_expired');
        }

        const config = getMetaConfig();

        // Exchange code for access token
        const tokenResponse = await fetch(`${META_GRAPH_API_BASE}/oauth/access_token?` + new URLSearchParams({
            client_id: config.appId,
            client_secret: config.appSecret,
            redirect_uri: config.redirectUri,
            code: code as string,
        }));

        const tokenData = await tokenResponse.json() as any;

        if (tokenData.error) {
            console.error('Token exchange error:', tokenData.error);
            return res.redirect(`/auth/meta/error?error=token_exchange&description=${encodeURIComponent(tokenData.error.message)}`);
        }

        // Exchange for long-lived token
        const longLivedResponse = await fetch(`${META_GRAPH_API_BASE}/oauth/access_token?` + new URLSearchParams({
            grant_type: 'fb_exchange_token',
            client_id: config.appId,
            client_secret: config.appSecret,
            fb_exchange_token: tokenData.access_token,
        }));

        const longLivedData = await longLivedResponse.json() as any;

        if (longLivedData.error) {
            console.error('Long-lived token error:', longLivedData.error);
            // Continue with short-lived token if long-lived fails
        }

        const accessToken = longLivedData.access_token || tokenData.access_token;
        const expiresIn = longLivedData.expires_in || tokenData.expires_in || 3600;

        // Get user profile
        const profileResponse = await fetch(`${META_GRAPH_API_BASE}/me?fields=id,name,email,picture&access_token=${accessToken}`);
        const profileData = await profileResponse.json() as any;

        if (profileData.error) {
            console.error('Profile fetch error:', profileData.error);
            return res.redirect(`/auth/meta/error?error=profile_fetch`);
        }

        // Get connected pages with their tokens
        const pagesResponse = await fetch(`${META_GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,category,picture,instagram_business_account{id,username,profile_picture_url}&access_token=${accessToken}`);
        const pagesData = await pagesResponse.json() as any;

        // Get WhatsApp Business Accounts
        const whatsappAccounts = await fetchWhatsAppAccounts(accessToken);

        // Prepare connection data
        const connectionData = {
            connected: true,
            connectedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastRefreshed: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + expiresIn * 1000),
            
            userId: stateData.userId,
            metaUserId: profileData.id,
            metaUserName: profileData.name,
            metaUserEmail: profileData.email,
            metaUserPicture: profileData.picture?.data?.url,
            
            accessToken: accessToken, // In production, encrypt this
            tokenType: 'bearer',
            
            pages: (pagesData.data || []).map((page: any) => ({
                id: page.id,
                name: page.name,
                accessToken: page.access_token,
                category: page.category,
                pictureUrl: page.picture?.data?.url,
                hasMessaging: true, // Assume true if we have pages_messaging scope
                hasInstagram: !!page.instagram_business_account,
                instagramAccountId: page.instagram_business_account?.id,
            })),
            
            whatsappAccounts: whatsappAccounts,
            
            instagramAccounts: (pagesData.data || [])
                .filter((page: any) => page.instagram_business_account)
                .map((page: any) => ({
                    id: page.instagram_business_account.id,
                    username: page.instagram_business_account.username,
                    profilePictureUrl: page.instagram_business_account.profile_picture_url,
                    linkedPageId: page.id,
                })),
        };

        // Store connection in Firestore
        await db.collection('users').doc(stateData.userId)
            .collection('projects').doc(stateData.projectId)
            .collection('integrations').doc('meta')
            .set(connectionData, { merge: true });

        // Clean up state
        await stateDoc.ref.delete();

        // Redirect back to app
        const returnUrl = stateData.returnUrl || '/dashboard/ai';
        res.redirect(`${returnUrl}?meta_connected=true&project=${stateData.projectId}`);

    } catch (error: any) {
        console.error('OAuth callback error:', error);
        res.redirect(`/auth/meta/error?error=server_error&description=${encodeURIComponent(error.message)}`);
    }
});

// =============================================================================
// CONNECTION MANAGEMENT
// =============================================================================

/**
 * Get current Meta connection status
 */
export const getMetaConnection = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }

    const { projectId } = data;

    if (!projectId) {
        throw new functions.https.HttpsError('invalid-argument', 'Project ID is required');
    }

    const connectionDoc = await db.collection('users').doc(context.auth.uid)
        .collection('projects').doc(projectId)
        .collection('integrations').doc('meta')
        .get();

    if (!connectionDoc.exists) {
        return { connected: false };
    }

    const connection = connectionDoc.data()!;

    // Check if token is expired
    const now = Date.now();
    const expiresAt = connection.expiresAt?.toMillis() || 0;
    const isExpired = expiresAt < now;

    // Don't return the actual tokens to the client
    return {
        connected: connection.connected && !isExpired,
        status: isExpired ? 'token_expired' : 'connected',
        connectedAt: connection.connectedAt,
        metaUserName: connection.metaUserName,
        metaUserPicture: connection.metaUserPicture,
        pages: connection.pages?.map((p: any) => ({
            id: p.id,
            name: p.name,
            pictureUrl: p.pictureUrl,
            hasMessaging: p.hasMessaging,
            hasInstagram: p.hasInstagram,
        })),
        whatsappAccounts: connection.whatsappAccounts?.map((w: any) => ({
            businessAccountId: w.businessAccountId,
            businessAccountName: w.businessAccountName,
            phoneNumberId: w.phoneNumberId,
            displayPhoneNumber: w.displayPhoneNumber,
            verifiedName: w.verifiedName,
        })),
        instagramAccounts: connection.instagramAccounts?.map((i: any) => ({
            id: i.id,
            username: i.username,
            profilePictureUrl: i.profilePictureUrl,
        })),
        selectedPageId: connection.selectedPageId,
        selectedWhatsAppPhoneNumberId: connection.selectedWhatsAppPhoneNumberId,
        selectedInstagramAccountId: connection.selectedInstagramAccountId,
    };
});

/**
 * Disconnect Meta integration
 */
export const disconnectMeta = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }

    const { projectId } = data;

    if (!projectId) {
        throw new functions.https.HttpsError('invalid-argument', 'Project ID is required');
    }

    // Delete the connection
    await db.collection('users').doc(context.auth.uid)
        .collection('projects').doc(projectId)
        .collection('integrations').doc('meta')
        .delete();

    // Also clear the social channels config
    const projectRef = db.collection('users').doc(context.auth.uid)
        .collection('projects').doc(projectId);
    
    await projectRef.update({
        'aiAssistant.socialChannels': admin.firestore.FieldValue.delete(),
    });

    return { success: true };
});

/**
 * Refresh Meta token
 */
export const refreshMetaToken = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }

    const { projectId } = data;

    if (!projectId) {
        throw new functions.https.HttpsError('invalid-argument', 'Project ID is required');
    }

    const connectionRef = db.collection('users').doc(context.auth.uid)
        .collection('projects').doc(projectId)
        .collection('integrations').doc('meta');

    const connectionDoc = await connectionRef.get();

    if (!connectionDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'No Meta connection found');
    }

    const connection = connectionDoc.data()!;
    const config = getMetaConfig();

    // Exchange for new long-lived token
    const response = await fetch(`${META_GRAPH_API_BASE}/oauth/access_token?` + new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: config.appId,
        client_secret: config.appSecret,
        fb_exchange_token: connection.accessToken,
    }));

    const tokenData = await response.json() as any;

    if (tokenData.error) {
        throw new functions.https.HttpsError('internal', tokenData.error.message);
    }

    // Update connection
    await connectionRef.update({
        accessToken: tokenData.access_token,
        lastRefreshed: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + (tokenData.expires_in || 5184000) * 1000),
    });

    return { success: true };
});

// =============================================================================
// ASSET SELECTION
// =============================================================================

/**
 * Get connected pages with full details
 */
export const getConnectedPages = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }

    const { projectId } = data;

    const connectionDoc = await db.collection('users').doc(context.auth.uid)
        .collection('projects').doc(projectId)
        .collection('integrations').doc('meta')
        .get();

    if (!connectionDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'No Meta connection found');
    }

    const connection = connectionDoc.data()!;

    // Fetch fresh page data
    const response = await fetch(
        `${META_GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,category,picture,instagram_business_account{id,username,profile_picture_url,followers_count}&access_token=${connection.accessToken}`
    );

    const pagesData = await response.json() as any;

    if (pagesData.error) {
        throw new functions.https.HttpsError('internal', pagesData.error.message);
    }

    return {
        pages: pagesData.data?.map((page: any) => ({
            id: page.id,
            name: page.name,
            category: page.category,
            pictureUrl: page.picture?.data?.url,
            instagramAccount: page.instagram_business_account ? {
                id: page.instagram_business_account.id,
                username: page.instagram_business_account.username,
                profilePictureUrl: page.instagram_business_account.profile_picture_url,
                followersCount: page.instagram_business_account.followers_count,
            } : null,
        })) || [],
    };
});

/**
 * Get WhatsApp Business Accounts
 */
export const getWhatsAppAccounts = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }

    const { projectId } = data;

    const connectionDoc = await db.collection('users').doc(context.auth.uid)
        .collection('projects').doc(projectId)
        .collection('integrations').doc('meta')
        .get();

    if (!connectionDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'No Meta connection found');
    }

    const connection = connectionDoc.data()!;
    const accounts = await fetchWhatsAppAccounts(connection.accessToken);

    return { accounts };
});

/**
 * Select which Meta assets to use for this project
 */
export const selectMetaAssets = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }

    const { projectId, pageId, whatsappPhoneNumberId, instagramAccountId } = data;

    if (!projectId) {
        throw new functions.https.HttpsError('invalid-argument', 'Project ID is required');
    }

    const connectionRef = db.collection('users').doc(context.auth.uid)
        .collection('projects').doc(projectId)
        .collection('integrations').doc('meta');

    const connectionDoc = await connectionRef.get();

    if (!connectionDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'No Meta connection found');
    }

    const connection = connectionDoc.data()!;

    // Find selected page to get its access token
    const selectedPage = connection.pages?.find((p: any) => p.id === pageId);
    const selectedWhatsApp = connection.whatsappAccounts?.find((w: any) => w.phoneNumberId === whatsappPhoneNumberId);
    const selectedInstagram = connection.instagramAccounts?.find((i: any) => i.id === instagramAccountId);

    // Update connection with selections
    await connectionRef.update({
        selectedPageId: pageId || null,
        selectedWhatsAppPhoneNumberId: whatsappPhoneNumberId || null,
        selectedInstagramAccountId: instagramAccountId || null,
    });

    // Update project's social channels config with the credentials
    const projectRef = db.collection('users').doc(context.auth.uid)
        .collection('projects').doc(projectId);

    const socialChannelsUpdate: any = {};

    if (selectedPage) {
        socialChannelsUpdate['aiAssistant.socialChannels.facebook'] = {
            enabled: true,
            pageId: selectedPage.id,
            pageAccessToken: selectedPage.accessToken,
            webhookVerifyToken: generateVerifyToken(),
            autoConfigured: true,
        };
    }

    if (selectedWhatsApp) {
        socialChannelsUpdate['aiAssistant.socialChannels.whatsapp'] = {
            enabled: true,
            phoneNumberId: selectedWhatsApp.phoneNumberId,
            businessAccountId: selectedWhatsApp.businessAccountId,
            accessToken: connection.accessToken,
            webhookVerifyToken: generateVerifyToken(),
            autoConfigured: true,
        };
    }

    if (selectedInstagram) {
        socialChannelsUpdate['aiAssistant.socialChannels.instagram'] = {
            enabled: true,
            accountId: selectedInstagram.id,
            accessToken: selectedPage?.accessToken || connection.accessToken, // Instagram uses page token
            webhookVerifyToken: generateVerifyToken(),
            autoConfigured: true,
        };
    }

    if (Object.keys(socialChannelsUpdate).length > 0) {
        await projectRef.update(socialChannelsUpdate);
    }

    return { 
        success: true,
        configured: {
            facebook: !!selectedPage,
            whatsapp: !!selectedWhatsApp,
            instagram: !!selectedInstagram,
        }
    };
});

// =============================================================================
// WEBHOOK SETUP
// =============================================================================

/**
 * Setup webhooks for the selected page
 */
export const setupWebhooks = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }

    const { projectId } = data;

    const connectionDoc = await db.collection('users').doc(context.auth.uid)
        .collection('projects').doc(projectId)
        .collection('integrations').doc('meta')
        .get();

    if (!connectionDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'No Meta connection found');
    }

    const connection = connectionDoc.data()!;
    const config = getMetaConfig();

    if (!connection.selectedPageId) {
        throw new functions.https.HttpsError('failed-precondition', 'No page selected');
    }

    // Find page access token
    const selectedPage = connection.pages?.find((p: any) => p.id === connection.selectedPageId);
    
    if (!selectedPage) {
        throw new functions.https.HttpsError('not-found', 'Selected page not found');
    }

    // Subscribe to page webhooks
    const webhookUrl = `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/socialChannels-facebookWebhook`;
    
    const subscribeResponse = await fetch(
        `${META_GRAPH_API_BASE}/${selectedPage.id}/subscribed_apps`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_token: selectedPage.accessToken,
                subscribed_fields: ['messages', 'messaging_postbacks', 'message_deliveries', 'message_reads'],
            }),
        }
    );

    const subscribeResult = await subscribeResponse.json() as any;

    if (subscribeResult.error) {
        throw new functions.https.HttpsError('internal', `Failed to subscribe: ${subscribeResult.error.message}`);
    }

    return { 
        success: true,
        message: 'Webhooks configured successfully',
    };
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateVerifyToken(): string {
    return 'quimera_' + Math.random().toString(36).substring(2, 15);
}

async function fetchWhatsAppAccounts(accessToken: string): Promise<any[]> {
    try {
        // First get business accounts
        const businessResponse = await fetch(
            `${META_GRAPH_API_BASE}/me/businesses?fields=id,name,owned_whatsapp_business_accounts{id,name}&access_token=${accessToken}`
        );
        
        const businessData = await businessResponse.json() as any;

        if (businessData.error || !businessData.data) {
            console.log('No WhatsApp business accounts found');
            return [];
        }

        const whatsappAccounts: any[] = [];

        for (const business of businessData.data) {
            const wabaList = business.owned_whatsapp_business_accounts?.data || [];
            
            for (const waba of wabaList) {
                // Get phone numbers for this WABA
                const phonesResponse = await fetch(
                    `${META_GRAPH_API_BASE}/${waba.id}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status&access_token=${accessToken}`
                );
                
                const phonesData = await phonesResponse.json() as any;

                if (phonesData.data) {
                    for (const phone of phonesData.data) {
                        whatsappAccounts.push({
                            businessAccountId: waba.id,
                            businessAccountName: waba.name,
                            phoneNumberId: phone.id,
                            displayPhoneNumber: phone.display_phone_number,
                            verifiedName: phone.verified_name,
                            qualityRating: phone.quality_rating,
                        });
                    }
                }
            }
        }

        return whatsappAccounts;
    } catch (error) {
        console.error('Error fetching WhatsApp accounts:', error);
        return [];
    }
}

// =============================================================================
// SCHEDULED TOKEN REFRESH
// =============================================================================

/**
 * Scheduled function to refresh tokens before they expire
 * Runs daily
 */
export const scheduledTokenRefresh = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async (context) => {
        const config = getMetaConfig();
        
        // Find all connections that expire in the next 7 days
        const sevenDaysFromNow = admin.firestore.Timestamp.fromMillis(
            Date.now() + 7 * 24 * 60 * 60 * 1000
        );

        // This would need to query across all users' projects
        // In production, you'd want a better structure for this
        console.log('Token refresh job running...');
        
        // For now, we'll rely on the client-side refresh when needed
        return null;
    });








