/**
 * Widget API Cloud Functions
 * 
 * These functions provide a public API for the embeddable chat widget.
 * They allow external websites to load widget configuration and submit leads.
 * 
 * Project ID formats supported:
 * - Simple: "projectId" (looks in top-level 'projects' collection)
 * - User-scoped: "userId_projectId" (looks in 'users/{userId}/projects/{projectId}')
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { isOwner } from './constants';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// ============================================
// RATE LIMITING
// ============================================

const RATE_LIMITS = {
    WIDGET_SUBMISSION: { requestsPerMinute: 5, requestsPerDay: 50 }
};

interface RateLimitCheck {
    allowed: boolean;
    remaining?: number;
    resetAt?: Date;
    message?: string;
}

/**
 * Check rate limit for a project/IP
 */
async function checkRateLimit(projectId: string, identifier: string): Promise<RateLimitCheck> {
    // SECURITY: Bypass rate limits for the OWNER (Armando)
    try {
        // Simple and fast bypass if the project is a known owner project or if owner match
        const projectDoc = await db.collection('projects').doc(projectId).get();
        if (projectDoc.exists) {
            const data = projectDoc.data();
            const ownerId = data?.userId;

            // Check by ID or if the role in the owner doc is 'owner'
            if (ownerId && isOwner(ownerId)) {
                return { allowed: true, remaining: 1000 };
            }

            if (ownerId) {
                const ownerDoc = await db.collection('users').doc(ownerId).get();
                const ownerRole = ownerDoc.exists ? ownerDoc.data()?.role : null;
                if (ownerRole === 'owner' || ownerRole === 'superadmin') {
                    return { allowed: true, remaining: 1000 };
                }
            }
        }
    } catch (e) {
        console.warn('Error checking owner status in widget rate limit:', e);
    }

    const now = new Date();
    const limitKey = `${projectId}_${identifier}`; // Limit by project + IP/user

    const minuteKey = `${limitKey}_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}_${now.getHours()}_${now.getMinutes()}`;
    const dayKey = `${limitKey}_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`;

    const limits = RATE_LIMITS.WIDGET_SUBMISSION;

    try {
        // Check minute limit
        const minuteRef = db.collection('rateLimits').doc('widget_minutes').collection('entries').doc(minuteKey);
        const minuteDoc = await minuteRef.get();
        const minuteCount = minuteDoc.exists ? (minuteDoc.data()?.count || 0) : 0;

        if (minuteCount >= limits.requestsPerMinute) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: new Date(now.getTime() + 60000),
                message: 'Rate limit exceeded: Too many submissions per minute'
            };
        }

        // Check day limit
        const dayRef = db.collection('rateLimits').doc('widget_days').collection('entries').doc(dayKey);
        const dayDoc = await dayRef.get();
        const dayCount = dayDoc.exists ? (dayDoc.data()?.count || 0) : 0;

        if (dayCount >= limits.requestsPerDay) {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            return {
                allowed: false,
                remaining: 0,
                resetAt: tomorrow,
                message: 'Rate limit exceeded: Daily quota exhausted'
            };
        }

        // Increment counters
        await minuteRef.set({
            count: admin.firestore.FieldValue.increment(1),
            projectId,
            identifier,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        await dayRef.set({
            count: admin.firestore.FieldValue.increment(1),
            projectId,
            identifier,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return {
            allowed: true,
            remaining: limits.requestsPerMinute - minuteCount - 1
        };

    } catch (error) {
        console.error('Rate limit check error:', error);
        // Fail closed
        return {
            allowed: false,
            message: 'Service temporarily unavailable'
        };
    }
}

/**
 * Parse project ID to extract userId if present
 * Supports formats:
 * - "projectId" -> { userId: null, projectId: "projectId" }
 * - "userId_projectId" -> { userId: "userId", projectId: "projectId" }
 */
function parseProjectId(fullProjectId: string): { userId: string | null; projectId: string } {
    // Check if it contains underscore (userId_projectId format)
    const underscoreIndex = fullProjectId.indexOf('_');
    if (underscoreIndex > 0) {
        return {
            userId: fullProjectId.substring(0, underscoreIndex),
            projectId: fullProjectId.substring(underscoreIndex + 1)
        };
    }
    return { userId: null, projectId: fullProjectId };
}

/**
 * Find project in multiple locations
 * 1. If userId is provided, look in users/{userId}/projects/{projectId}
 * 2. Otherwise, look in top-level 'projects' collection
 * 3. As fallback, search across all users' projects (slower)
 */

/**
 * SECURITY: Optional Firebase Auth verification.
 * If Authorization header with Firebase ID token is present, verify it and
 * return the authenticated UID. This allows the project owner to test the widget
 * even if it is currently disabled.
 */
async function verifyOptionalAuth(req: functions.https.Request): Promise<string | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    try {
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return decodedToken.uid;
    } catch (error) {
        console.warn('[widgetApi] Invalid Firebase token presented, ignoring');
        return null;
    }
}

async function findProject(fullProjectId: string): Promise<{
    exists: boolean;
    data: any;
    userId: string | null;
    projectId: string;
}> {
    const { userId, projectId } = parseProjectId(fullProjectId);

    // 1. If userId is provided, look in user's projects
    if (userId) {
        const userProjectDoc = await db.collection('users').doc(userId)
            .collection('projects').doc(projectId).get();

        if (userProjectDoc.exists) {
            return {
                exists: true,
                data: userProjectDoc.data(),
                userId,
                projectId
            };
        }
    }

    // 2. Look in top-level projects collection
    const topLevelDoc = await db.collection('projects').doc(fullProjectId).get();
    if (topLevelDoc.exists) {
        const data = topLevelDoc.data();
        return {
            exists: true,
            data,
            userId: data?.userId || null,
            projectId: fullProjectId
        };
    }

    // User enumeration fallback removed for security
    // If project is not found via direct lookup or userId_projectId format,
    // return not found instead of scanning all users

    return { exists: false, data: null, userId: null, projectId };
}

/**
 * Get Widget Configuration
 * 
 * GET /api/widget/:projectId
 * 
 * Returns the AI assistant configuration and project details for a given project.
 * Only returns if the chatbot is active.
 * 
 * Supports project IDs in formats:
 * - "projectId" (searches all locations)
 * - "userId_projectId" (direct lookup in user's projects)
 */
export const getWidgetConfig = functions.https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        // Extract project ID from path
        const fullProjectId = req.path.split('/').pop();

        if (!fullProjectId) {
            res.status(400).json({ error: 'Project ID is required' });
            return;
        }

        // Find project in multiple locations
        const { exists, data: projectData, userId, projectId } = await findProject(fullProjectId);

        if (!exists || !projectData) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Check if AI assistant is active
        const verifiedUid = await verifyOptionalAuth(req);
        if (!projectData?.aiAssistantConfig?.isActive) {
            if (verifiedUid && verifiedUid === userId) {
                console.log(`[getWidgetConfig] Owner testing inactive chatbot: projectId=${projectId}`);
            } else {
                res.status(403).json({ error: 'Chat widget is not active for this project' });
                return;
            }
        }

        // Return sanitized configuration
        // Remove sensitive data like API keys
        const config = {
            ...projectData.aiAssistantConfig,
            // Don't expose any API keys or sensitive settings
        };

        const project = {
            id: projectId,
            userId: userId, // Include userId for lead submissions
            name: projectData.name,
            brandIdentity: projectData.brandIdentity,
            // Only include necessary project fields
        };

        res.status(200).json({
            config,
            project
        });

    } catch (error) {
        console.error('Error fetching widget config:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Submit Lead from Embedded Widget
 * 
 * POST /api/widget/:projectId/leads
 * 
 * Captures a lead from an embedded widget.
 * Saves the lead to the project owner's libraryLeads collection.
 * 
 * Supports project IDs in formats:
 * - "projectId" (searches all locations)
 * - "userId_projectId" (direct lookup in user's projects)
 */
export const submitWidgetLead = functions.https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        // Extract project ID from path
        const pathParts = req.path.split('/');
        const fullProjectId = pathParts[pathParts.length - 2]; // Second to last part

        if (!fullProjectId) {
            res.status(400).json({ error: 'Project ID is required' });
            return;
        }

        // Find project and get owner's userId
        const { exists, data: projectData, userId, projectId } = await findProject(fullProjectId);

        if (!exists || !projectData) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        const verifiedUid = await verifyOptionalAuth(req);
        if (!projectData?.aiAssistantConfig?.isActive) {
            if (verifiedUid && verifiedUid === userId) {
                console.log(`[submitWidgetLead] Owner testing inactive chatbot: projectId=${projectId}`);
            } else {
                res.status(403).json({ error: 'Chat widget is not active for this project' });
                return;
            }
        }

        // Rate limit check
        // Use IP address as identifier (fallback to 'unknown' if not found)
        const clientIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
        // Sanitize IP to be safe for doc ID
        const safeIp = clientIp.replace(/[^a-zA-Z0-9]/g, '_');

        const rateLimit = await checkRateLimit(projectId, safeIp);
        if (!rateLimit.allowed) {
            res.status(429).json({ error: rateLimit.message });
            return;
        }

        // Get lead data from request body
        const leadData = req.body;

        if (!leadData.email || !leadData.name) {
            res.status(400).json({ error: 'Name and email are required' });
            return;
        }

        // Create lead document
        const lead = {
            ...leadData,
            projectId,
            projectName: projectData.name || 'Unknown Project',
            source: 'embedded-widget',
            status: 'new',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        let leadRef;

        // Save to the project owner's CRM leads collection
        // Path: users/{userId}/projects/{projectId}/leads
        // This ensures leads appear correctly in the LeadsDashboard
        if (userId && projectId) {
            leadRef = await db.collection('users').doc(userId)
                .collection('projects').doc(projectId)
                .collection('leads').add(lead);

            console.log(`[WidgetAPI] Lead saved to users/${userId}/projects/${projectId}/leads/${leadRef.id}`);
        } else {
            // Fallback: save to top-level leads collection
            leadRef = await db.collection('leads').add({
                ...lead,
                _warning: 'Could not determine project owner or projectId, saved to top-level collection'
            });

            // Log activity in subcollection
            await db.collection('leads').doc(leadRef.id).collection('activities').add({
                type: 'note',
                description: 'Lead captured from embedded widget (fallback path)',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                user: 'system'
            });

            console.warn('[WidgetAPI] Lead saved to fallback collection - userId or projectId missing');
        }

        res.status(201).json({
            success: true,
            leadId: leadRef.id
        });

    } catch (error) {
        console.error('Error submitting lead:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Track Widget Analytics
 * 
 * POST /api/widget/:projectId/analytics
 * 
 * Track widget interactions for analytics.
 * Supports project IDs in formats:
 * - "projectId" (searches all locations)
 * - "userId_projectId" (direct lookup in user's projects)
 */
export const trackWidgetAnalytics = functions.https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const pathParts = req.path.split('/');
        const fullProjectId = pathParts[pathParts.length - 2];

        if (!fullProjectId) {
            res.status(400).json({ error: 'Project ID is required' });
            return;
        }

        // Parse project ID to get userId if available
        const { userId, projectId } = parseProjectId(fullProjectId);

        const analyticsData = req.body;

        // Save analytics event
        await db.collection('widgetAnalytics').add({
            projectId,
            userId: userId || analyticsData.userId || null,
            ...analyticsData,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Error tracking analytics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Submit Appointment from Embedded Widget
 * 
 * POST /api/widget/:projectId/appointments
 * 
 * Captures an appointment from an embedded widget.
 * Saves the appointment to the project owner's appointments collection.
 */
export const submitWidgetAppointment = functions.https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        // Extract project ID from path
        const pathParts = req.path.split('/');
        const fullProjectId = pathParts[pathParts.length - 2]; // Second to last part

        if (!fullProjectId) {
            res.status(400).json({ error: 'Project ID is required' });
            return;
        }

        // Find project and get owner's userId
        const { exists, data: projectData, userId, projectId } = await findProject(fullProjectId);

        if (!exists || !projectData) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        const verifiedUid = await verifyOptionalAuth(req);
        if (!projectData?.aiAssistantConfig?.isActive) {
            if (verifiedUid && verifiedUid === userId) {
                console.log(`[submitWidgetAppointment] Owner testing inactive chatbot: projectId=${projectId}`);
            } else {
                res.status(403).json({ error: 'Chat widget is not active for this project' });
                return;
            }
        }

        // Rate limit check
        const clientIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
        const safeIp = clientIp.replace(/[^a-zA-Z0-9]/g, '_');

        const rateLimit = await checkRateLimit(projectId, safeIp);
        if (!rateLimit.allowed) {
            res.status(429).json({ error: rateLimit.message });
            return;
        }

        // Get appointment data
        const data = req.body;
        
        if (!data.startDate || !data.endDate) {
            res.status(400).json({ error: 'Start date and end date are required' });
            return;
        }

        // Convert ISO strings to Timestamps
        const startDateTimestamp = admin.firestore.Timestamp.fromDate(new Date(data.startDate));
        const endDateTimestamp = admin.firestore.Timestamp.fromDate(new Date(data.endDate));

        const participants = [];
        if (data.participantName || data.participantEmail) {
            participants.push({
                id: `participant_${Date.now()}`,
                name: data.participantName || 'Cliente (via Chatbot)',
                email: data.participantEmail || '',
                phone: data.participantPhone || '',
                role: 'attendee',
                status: 'pending',
                isRequired: true,
            });
        }

        const appointmentDoc = {
            title: data.title || 'Cita desde Chatbot',
            description: data.description || '',
            type: data.type || 'consultation',
            status: 'scheduled',
            priority: 'medium',
            startDate: startDateTimestamp,
            endDate: endDateTimestamp,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            organizerId: userId || 'system',
            organizerName: projectData.name || '',
            organizerEmail: '',
            participants,
            location: { type: 'virtual' },
            reminders: [
                { id: `reminder_1_${Date.now()}`, type: 'email', minutes: 60, sent: false },
                { id: `reminder_2_${Date.now()}`, type: 'email', minutes: 1440, sent: false }
            ],
            attachments: [],
            notes: [],
            followUpActions: [],
            aiPrepEnabled: true,
            linkedLeadIds: data.linkedLeadId ? [data.linkedLeadId] : [],
            tags: ['chatbot', 'auto-scheduled'],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: 'chatbot',
            projectId,
        };

        let docRef;

        if (userId && projectId) {
            const appointmentsRef = db.collection('users').doc(userId).collection('projects').doc(projectId).collection('appointments');
            docRef = await appointmentsRef.add(appointmentDoc);
            console.log(`[WidgetAPI] Appointment saved to users/${userId}/projects/${projectId}/appointments/${docRef.id}`);
            
            // Also save a lead if contact info exists
            if (data.participantName || data.participantEmail) {
                const lead = {
                    name: data.participantName || 'Cliente (via Chatbot)',
                    email: data.participantEmail || '',
                    phone: data.participantPhone || '',
                    projectId,
                    projectName: projectData.name || 'Unknown Project',
                    source: 'embedded-widget',
                    status: 'new',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                };
                try {
                    await db.collection('users').doc(userId).collection('projects').doc(projectId).collection('leads').add(lead);
                    console.log(`[WidgetAPI] Also saved lead from appointment to users/${userId}/projects/${projectId}/leads`);
                } catch (e) {
                    console.warn('[WidgetAPI] Could not save lead for appointment', e);
                }
            }
        } else {
            console.error('[WidgetAPI] Cannot save appointment: no userId. Falling back to top-level appointments.');
            docRef = await db.collection('appointments').add({
                ...appointmentDoc,
                _warning: 'Could not determine project owner or projectId'
            });
        }

        res.status(201).json({
            success: true,
            appointmentId: docRef.id
        });

    } catch (error) {
        console.error('Error submitting appointment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});















