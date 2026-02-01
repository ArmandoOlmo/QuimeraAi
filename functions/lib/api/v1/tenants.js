"use strict";
/**
 * Tenants API v1
 * REST API for managing sub-client tenants
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantsApi = void 0;
const express_1 = __importDefault(require("express"));
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const auth_1 = require("./middleware/auth");
const db = admin.firestore();
const router = express_1.default.Router();
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Generate slug from name
 */
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}
/**
 * Check if agency has reached sub-client limit
 */
async function checkSubClientLimit(agencyTenantId) {
    const subClientsSnapshot = await db
        .collection('tenants')
        .where('ownerTenantId', '==', agencyTenantId)
        .where('status', 'in', ['active', 'trial'])
        .get();
    const current = subClientsSnapshot.size;
    const agencyDoc = await db.collection('tenants').doc(agencyTenantId).get();
    const agencyData = agencyDoc.data();
    const limit = agencyData?.limits?.maxSubClients || 5;
    return { canCreate: current < limit, current, limit };
}
/**
 * Verify tenant belongs to the authenticated agency
 */
async function verifyTenantOwnership(tenantId, agencyTenantId) {
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
        return false;
    }
    const tenantData = tenantDoc.data();
    return tenantData?.ownerTenantId === agencyTenantId;
}
// ============================================================================
// ROUTES
// ============================================================================
/**
 * POST /tenants
 * Create a new sub-client tenant
 */
router.post('/tenants', (0, auth_1.requirePermission)('create_tenants'), async (req, res) => {
    try {
        const { name, email, industry, features, branding } = req.body;
        if (!name || !email) {
            res.status(400).json({
                error: 'Missing required fields',
                message: 'name and email are required',
            });
            return;
        }
        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            res.status(400).json({
                error: 'Invalid email',
                message: 'Please provide a valid email address',
            });
            return;
        }
        const agencyTenantId = req.apiAuth.tenantId;
        // Check sub-client limit
        const limitCheck = await checkSubClientLimit(agencyTenantId);
        if (!limitCheck.canCreate) {
            res.status(400).json({
                error: 'Sub-client limit reached',
                message: `You have reached the maximum of ${limitCheck.limit} sub-clients. Upgrade your plan or add more slots.`,
                current: limitCheck.current,
                limit: limitCheck.limit,
            });
            return;
        }
        // Create tenant
        const slug = slugify(name);
        const tenantRef = await db.collection('tenants').add({
            name,
            slug,
            type: 'agency_client',
            ownerTenantId: agencyTenantId,
            ownerUserId: null,
            subscriptionPlan: 'agency',
            status: 'trial',
            industry: industry || 'other',
            settings: {
                enabledFeatures: features || [],
                defaultLanguage: 'es',
            },
            branding: branding || {
                companyName: name,
                logo: '',
                primaryColor: '#3B82F6',
                secondaryColor: '#10B981',
            },
            contactInfo: {
                email,
            },
            usage: {
                projects: 0,
                users: 0,
                leads: 0,
                products: 0,
                storageUsed: 0,
                aiCreditsUsed: 0,
                emailsSent: 0,
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: 'api',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Log activity
        await db.collection('agencyActivity').add({
            agencyTenantId,
            type: 'client_created',
            clientTenantId: tenantRef.id,
            clientName: name,
            metadata: {
                createdViaApi: true,
            },
            createdBy: 'api',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(201).json({
            id: tenantRef.id,
            name,
            slug,
            status: 'trial',
            createdAt: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Error creating tenant:', error);
        res.status(500).json({
            error: 'Failed to create tenant',
            message: error.message,
        });
    }
});
/**
 * GET /tenants
 * List all sub-client tenants
 */
router.get('/tenants', (0, auth_1.requirePermission)('read_tenants'), async (req, res) => {
    try {
        const agencyTenantId = req.apiAuth.tenantId;
        // Query parameters
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const status = req.query.status;
        let query = db
            .collection('tenants')
            .where('ownerTenantId', '==', agencyTenantId)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .offset(offset);
        if (status) {
            query = query.where('status', '==', status);
        }
        const tenantsSnapshot = await query.get();
        const tenants = tenantsSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                slug: data.slug,
                status: data.status,
                industry: data.industry,
                contactEmail: data.contactInfo?.email,
                features: data.settings?.enabledFeatures || [],
                usage: data.usage,
                createdAt: data.createdAt?.toDate().toISOString(),
            };
        });
        // Get total count
        const totalSnapshot = await db
            .collection('tenants')
            .where('ownerTenantId', '==', agencyTenantId)
            .count()
            .get();
        res.json({
            tenants,
            pagination: {
                total: totalSnapshot.data().count,
                limit,
                offset,
                hasMore: offset + limit < totalSnapshot.data().count,
            },
        });
    }
    catch (error) {
        console.error('Error listing tenants:', error);
        res.status(500).json({
            error: 'Failed to list tenants',
            message: error.message,
        });
    }
});
/**
 * GET /tenants/:id
 * Get details of a specific tenant
 */
router.get('/tenants/:id', (0, auth_1.requirePermission)('read_tenants'), async (req, res) => {
    try {
        const { id } = req.params;
        const agencyTenantId = req.apiAuth.tenantId;
        // Verify ownership
        const isOwner = await verifyTenantOwnership(id, agencyTenantId);
        if (!isOwner) {
            res.status(403).json({
                error: 'Access denied',
                message: 'This tenant does not belong to your agency',
            });
            return;
        }
        const tenantDoc = await db.collection('tenants').doc(id).get();
        if (!tenantDoc.exists) {
            res.status(404).json({
                error: 'Tenant not found',
                message: `Tenant with ID ${id} does not exist`,
            });
            return;
        }
        const data = tenantDoc.data();
        res.json({
            id: tenantDoc.id,
            name: data.name,
            slug: data.slug,
            status: data.status,
            industry: data.industry,
            subscriptionPlan: data.subscriptionPlan,
            contactInfo: data.contactInfo,
            branding: data.branding,
            settings: data.settings,
            usage: data.usage,
            limits: data.limits,
            createdAt: data.createdAt?.toDate().toISOString(),
            updatedAt: data.updatedAt?.toDate().toISOString(),
        });
    }
    catch (error) {
        console.error('Error getting tenant:', error);
        res.status(500).json({
            error: 'Failed to get tenant',
            message: error.message,
        });
    }
});
/**
 * PATCH /tenants/:id
 * Update a tenant
 */
router.patch('/tenants/:id', (0, auth_1.requirePermission)('update_tenants'), async (req, res) => {
    try {
        const { id } = req.params;
        const agencyTenantId = req.apiAuth.tenantId;
        // Verify ownership
        const isOwner = await verifyTenantOwnership(id, agencyTenantId);
        if (!isOwner) {
            res.status(403).json({
                error: 'Access denied',
                message: 'This tenant does not belong to your agency',
            });
            return;
        }
        const { name, status, industry, features, branding, contactInfo } = req.body;
        const updates = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (name)
            updates.name = name;
        if (status)
            updates.status = status;
        if (industry)
            updates.industry = industry;
        if (features)
            updates['settings.enabledFeatures'] = features;
        if (branding)
            updates.branding = { ...updates.branding, ...branding };
        if (contactInfo)
            updates.contactInfo = { ...updates.contactInfo, ...contactInfo };
        await db.collection('tenants').doc(id).update(updates);
        // Log activity
        await db.collection('agencyActivity').add({
            agencyTenantId,
            type: 'client_updated',
            clientTenantId: id,
            metadata: {
                updatedViaApi: true,
                updatedFields: Object.keys(updates),
            },
            createdBy: 'api',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.json({
            id,
            message: 'Tenant updated successfully',
            updated: Object.keys(updates),
        });
    }
    catch (error) {
        console.error('Error updating tenant:', error);
        res.status(500).json({
            error: 'Failed to update tenant',
            message: error.message,
        });
    }
});
/**
 * DELETE /tenants/:id
 * Delete a tenant
 */
router.delete('/tenants/:id', (0, auth_1.requirePermission)('delete_tenants'), async (req, res) => {
    try {
        const { id } = req.params;
        const agencyTenantId = req.apiAuth.tenantId;
        // Verify ownership
        const isOwner = await verifyTenantOwnership(id, agencyTenantId);
        if (!isOwner) {
            res.status(403).json({
                error: 'Access denied',
                message: 'This tenant does not belong to your agency',
            });
            return;
        }
        const tenantDoc = await db.collection('tenants').doc(id).get();
        const tenantData = tenantDoc.data();
        // Soft delete - just mark as deleted
        await db.collection('tenants').doc(id).update({
            status: 'deleted',
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Log activity
        await db.collection('agencyActivity').add({
            agencyTenantId,
            type: 'client_deleted',
            clientTenantId: id,
            clientName: tenantData?.name,
            metadata: {
                deletedViaApi: true,
            },
            createdBy: 'api',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.json({
            id,
            message: 'Tenant deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting tenant:', error);
        res.status(500).json({
            error: 'Failed to delete tenant',
            message: error.message,
        });
    }
});
/**
 * POST /tenants/:id/members
 * Add a member to a tenant
 */
router.post('/tenants/:id/members', (0, auth_1.requirePermission)('manage_members'), async (req, res) => {
    try {
        const { id } = req.params;
        const agencyTenantId = req.apiAuth.tenantId;
        const { email, name, role } = req.body;
        if (!email || !name) {
            res.status(400).json({
                error: 'Missing required fields',
                message: 'email and name are required',
            });
            return;
        }
        // Verify ownership
        const isOwner = await verifyTenantOwnership(id, agencyTenantId);
        if (!isOwner) {
            res.status(403).json({
                error: 'Access denied',
                message: 'This tenant does not belong to your agency',
            });
            return;
        }
        // Create invitation
        const inviteRef = await db.collection('tenantInvites').add({
            tenantId: id,
            email,
            name,
            role: role || 'client',
            invitedBy: 'api',
            status: 'pending',
            token: Math.random().toString(36).substring(2, 15),
            expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(201).json({
            inviteId: inviteRef.id,
            email,
            name,
            role: role || 'client',
            status: 'pending',
            message: 'Invitation created successfully',
        });
    }
    catch (error) {
        console.error('Error adding member:', error);
        res.status(500).json({
            error: 'Failed to add member',
            message: error.message,
        });
    }
});
/**
 * GET /tenants/:id/usage
 * Get resource usage for a tenant
 */
router.get('/tenants/:id/usage', (0, auth_1.requirePermission)('read_tenants'), async (req, res) => {
    try {
        const { id } = req.params;
        const agencyTenantId = req.apiAuth.tenantId;
        // Verify ownership
        const isOwner = await verifyTenantOwnership(id, agencyTenantId);
        if (!isOwner) {
            res.status(403).json({
                error: 'Access denied',
                message: 'This tenant does not belong to your agency',
            });
            return;
        }
        const tenantDoc = await db.collection('tenants').doc(id).get();
        if (!tenantDoc.exists) {
            res.status(404).json({
                error: 'Tenant not found',
            });
            return;
        }
        const data = tenantDoc.data();
        const usage = data.usage || {};
        const limits = data.limits || {};
        // Calculate percentages
        const percentages = {};
        if (limits.maxProjects) {
            percentages.projects = ((usage.projects || 0) / limits.maxProjects) * 100;
        }
        if (limits.maxStorageGB) {
            percentages.storage =
                ((usage.storageUsed || 0) / limits.maxStorageGB) * 100;
        }
        if (limits.maxAiCredits) {
            percentages.aiCredits =
                ((usage.aiCreditsUsed || 0) / limits.maxAiCredits) * 100;
        }
        if (limits.maxLeads) {
            percentages.leads = ((usage.leads || 0) / limits.maxLeads) * 100;
        }
        res.json({
            tenantId: id,
            usage,
            limits,
            percentages,
            alerts: {
                highUsage: Object.values(percentages).some((p) => p > 80),
                criticalUsage: Object.values(percentages).some((p) => p > 95),
            },
        });
    }
    catch (error) {
        console.error('Error getting usage:', error);
        res.status(500).json({
            error: 'Failed to get usage',
            message: error.message,
        });
    }
});
/**
 * POST /tenants/:id/reports
 * Generate a report for a tenant
 */
router.post('/tenants/:id/reports', (0, auth_1.requirePermission)('generate_reports'), async (req, res) => {
    try {
        const { id } = req.params;
        const agencyTenantId = req.apiAuth.tenantId;
        const { startDate, endDate, metrics } = req.body;
        // Verify ownership
        const isOwner = await verifyTenantOwnership(id, agencyTenantId);
        if (!isOwner) {
            res.status(403).json({
                error: 'Access denied',
                message: 'This tenant does not belong to your agency',
            });
            return;
        }
        // TODO: Implement actual report generation
        // For now, return a placeholder
        res.status(202).json({
            message: 'Report generation started',
            reportId: 'report_' + Date.now(),
            status: 'processing',
            estimatedTime: '2-3 minutes',
        });
    }
    catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({
            error: 'Failed to generate report',
            message: error.message,
        });
    }
});
// ============================================================================
// APPLY MIDDLEWARE AND EXPORT
// ============================================================================
const app = (0, express_1.default)();
// Middleware
app.use(auth_1.corsMiddleware);
app.use(auth_1.requestLogger);
app.use(express_1.default.json());
app.use(auth_1.authenticateApiKey);
// Routes
app.use('/api/v1', router);
// Error handlers
app.use(auth_1.notFoundHandler);
app.use(auth_1.errorHandler);
// Export as Cloud Function
exports.tenantsApi = functions.https.onRequest(app);
//# sourceMappingURL=tenants.js.map