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

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

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
    
    // 3. Fallback: Search in all users' projects (for backwards compatibility)
    // This is slower but ensures we find projects with the old format
    if (!userId) {
        const usersSnapshot = await db.collection('users').get();
        for (const userDoc of usersSnapshot.docs) {
            const projectDoc = await db.collection('users').doc(userDoc.id)
                .collection('projects').doc(projectId).get();
            
            if (projectDoc.exists) {
                return { 
                    exists: true, 
                    data: projectDoc.data(), 
                    userId: userDoc.id,
                    projectId 
                };
            }
        }
    }
    
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
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

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
        if (!projectData?.aiAssistantConfig?.isActive) {
            res.status(403).json({ error: 'Chat widget is not active for this project' });
            return;
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
    res.set('Access-Control-Allow-Headers', 'Content-Type');

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
        
        if (!projectData?.aiAssistantConfig?.isActive) {
            res.status(403).json({ error: 'Chat widget is not active for this project' });
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
        
        // Save to the project owner's libraryLeads collection (preferred)
        // This ensures leads appear in the user's dashboard
        if (userId) {
            leadRef = await db.collection('users').doc(userId)
                .collection('libraryLeads').add(lead);
            
            // Successfully saved to user's library
        } else {
            // Fallback: save to top-level leads collection
            leadRef = await db.collection('leads').add({
                ...lead,
                _warning: 'Could not determine project owner, saved to top-level collection'
            });
            
            // Log activity in subcollection
            await db.collection('leads').doc(leadRef.id).collection('activities').add({
                type: 'note',
                description: 'Lead captured from embedded widget',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                user: 'system'
            });
            
            // Saved to fallback collection
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
    res.set('Access-Control-Allow-Headers', 'Content-Type');

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















