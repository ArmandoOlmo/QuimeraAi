/**
 * Tenants API v1
 * REST API for managing sub-client tenants
 */

import express from 'express';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {
  authenticateApiKey,
  requirePermission,
  errorHandler,
  notFoundHandler,
  corsMiddleware,
  requestLogger,
  AuthenticatedRequest,
} from './middleware/auth';

const db = admin.firestore();
const router = express.Router();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate slug from name
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Check if agency has reached sub-client limit
 */
async function checkSubClientLimit(
  agencyTenantId: string
): Promise<{ canCreate: boolean; current: number; limit: number }> {
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
async function verifyTenantOwnership(
  tenantId: string,
  agencyTenantId: string
): Promise<boolean> {
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
router.post(
  '/tenants',
  requirePermission('create_tenants'),
  async (req: AuthenticatedRequest, res: express.Response) => {
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

      const agencyTenantId = req.apiAuth!.tenantId;

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
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      res.status(500).json({
        error: 'Failed to create tenant',
        message: error.message,
      });
    }
  }
);

/**
 * GET /tenants
 * List all sub-client tenants
 */
router.get(
  '/tenants',
  requirePermission('read_tenants'),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const agencyTenantId = req.apiAuth!.tenantId;

      // Query parameters
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string;

      let query = db
        .collection('tenants')
        .where('ownerTenantId', '==', agencyTenantId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset);

      if (status) {
        query = query.where('status', '==', status) as any;
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
    } catch (error: any) {
      console.error('Error listing tenants:', error);
      res.status(500).json({
        error: 'Failed to list tenants',
        message: error.message,
      });
    }
  }
);

/**
 * GET /tenants/:id
 * Get details of a specific tenant
 */
router.get(
  '/tenants/:id',
  requirePermission('read_tenants'),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { id } = req.params as { id: string };
      const agencyTenantId = req.apiAuth!.tenantId;

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

      const data = tenantDoc.data()!;

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
    } catch (error: any) {
      console.error('Error getting tenant:', error);
      res.status(500).json({
        error: 'Failed to get tenant',
        message: error.message,
      });
    }
  }
);

/**
 * PATCH /tenants/:id
 * Update a tenant
 */
router.patch(
  '/tenants/:id',
  requirePermission('update_tenants'),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { id } = req.params as { id: string };
      const agencyTenantId = req.apiAuth!.tenantId;

      // Verify ownership
      const isOwner = await verifyTenantOwnership(id, agencyTenantId);
      if (!isOwner) {
        res.status(403).json({
          error: 'Access denied',
          message: 'This tenant does not belong to your agency',
        });
        return;
      }

      const { name, status, industry, features, branding, contactInfo } =
        req.body;

      const updates: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (name) updates.name = name;
      if (status) updates.status = status;
      if (industry) updates.industry = industry;
      if (features) updates['settings.enabledFeatures'] = features;
      if (branding) updates.branding = { ...updates.branding, ...branding };
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
    } catch (error: any) {
      console.error('Error updating tenant:', error);
      res.status(500).json({
        error: 'Failed to update tenant',
        message: error.message,
      });
    }
  }
);

/**
 * DELETE /tenants/:id
 * Delete a tenant
 */
router.delete(
  '/tenants/:id',
  requirePermission('delete_tenants'),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { id } = req.params as { id: string };
      const agencyTenantId = req.apiAuth!.tenantId;

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
    } catch (error: any) {
      console.error('Error deleting tenant:', error);
      res.status(500).json({
        error: 'Failed to delete tenant',
        message: error.message,
      });
    }
  }
);

/**
 * POST /tenants/:id/members
 * Add a member to a tenant
 */
router.post(
  '/tenants/:id/members',
  requirePermission('manage_members'),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { id } = req.params as { id: string };
      const agencyTenantId = req.apiAuth!.tenantId;
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
        expiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        ),
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
    } catch (error: any) {
      console.error('Error adding member:', error);
      res.status(500).json({
        error: 'Failed to add member',
        message: error.message,
      });
    }
  }
);

/**
 * GET /tenants/:id/usage
 * Get resource usage for a tenant
 */
router.get(
  '/tenants/:id/usage',
  requirePermission('read_tenants'),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { id } = req.params as { id: string };
      const agencyTenantId = req.apiAuth!.tenantId;

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

      const data = tenantDoc.data()!;
      const usage = data.usage || {};
      const limits = data.limits || {};

      // Calculate percentages
      const percentages: any = {};
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
          highUsage: Object.values(percentages).some((p: any) => p > 80),
          criticalUsage: Object.values(percentages).some((p: any) => p > 95),
        },
      });
    } catch (error: any) {
      console.error('Error getting usage:', error);
      res.status(500).json({
        error: 'Failed to get usage',
        message: error.message,
      });
    }
  }
);

/**
 * POST /tenants/:id/reports
 * Generate a report for a tenant
 */
router.post(
  '/tenants/:id/reports',
  requirePermission('generate_reports'),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { id } = req.params as { id: string };
      const agencyTenantId = req.apiAuth!.tenantId;
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
    } catch (error: any) {
      console.error('Error generating report:', error);
      res.status(500).json({
        error: 'Failed to generate report',
        message: error.message,
      });
    }
  }
);

// ============================================================================
// APPLY MIDDLEWARE AND EXPORT
// ============================================================================

const app: express.Application = express();

// Middleware
app.use(corsMiddleware);
app.use(requestLogger);
app.use(express.json());
app.use(authenticateApiKey);

// Routes
app.use('/api/v1', router);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Export as Cloud Function
export const tenantsApi = functions.https.onRequest(app);
