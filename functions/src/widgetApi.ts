/**
 * Widget API Cloud Functions
 * 
 * These functions provide a public API for the embeddable chat widget.
 * They allow external websites to load widget configuration and submit leads.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

/**
 * Get Widget Configuration
 * 
 * GET /api/widget/:projectId
 * 
 * Returns the AI assistant configuration and project details for a given project.
 * Only returns if the chatbot is active.
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
        const projectId = req.path.split('/').pop();
        
        if (!projectId) {
            res.status(400).json({ error: 'Project ID is required' });
            return;
        }

        // Fetch project document
        const projectDoc = await db.collection('projects').doc(projectId).get();
        
        if (!projectDoc.exists) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        const projectData = projectDoc.data();
        
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
            id: projectDoc.id,
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
        const projectId = pathParts[pathParts.length - 2]; // Second to last part
        
        if (!projectId) {
            res.status(400).json({ error: 'Project ID is required' });
            return;
        }

        // Verify project exists and widget is active
        const projectDoc = await db.collection('projects').doc(projectId).get();
        
        if (!projectDoc.exists) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        const projectData = projectDoc.data();
        
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
            source: 'embedded-widget',
            status: 'new',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            activities: [],
            tasks: []
        };

        // Save to Firestore
        const leadRef = await db.collection('leads').add(lead);

        // Log activity
        await db.collection('leads').doc(leadRef.id).collection('activities').add({
            type: 'note',
            description: 'Lead captured from embedded widget',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            user: 'system'
        });

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
 * Get Widget Analytics (Optional)
 * 
 * POST /api/widget/:projectId/analytics
 * 
 * Track widget interactions for analytics.
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
        const projectId = pathParts[pathParts.length - 2];
        
        if (!projectId) {
            res.status(400).json({ error: 'Project ID is required' });
            return;
        }

        const analyticsData = req.body;
        
        // Save analytics event
        await db.collection('widgetAnalytics').add({
            projectId,
            ...analyticsData,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Error tracking analytics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

