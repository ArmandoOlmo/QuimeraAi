/**
 * Tenants API v1
 * REST API for managing sub-client tenants
 */

import * as express from 'express';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { authenticateApiKey, requirePermission, logUsage, errorHandler } from './middleware/auth';

const db = admin.firestore();
const router = express.Router();

// Apply authentication to all routes
router.use(authenticateApiKey);
router.use(logUsage);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function checkSubClientLimit(agencyTenantId: string): Promise<{ canCreate: boolean; current: number; limit: number }> {
  const agencyDoc = await db.collection('tenants').doc(agencyTenantId).get();
  const agencyData = agencyDoc.data()!;

  const currentSubClients = await db.collection('tenants')
    .where('ownerTenantId', '==', agencyTenantId)
    .where('status', 'in', ['active', 'trial'])
    .count()
    .get();

  const current = currentSubClients.data().count;

  const baseLimits: Record<string, number> = {
    agency: 10,
    agency_plus: 25,
    enterprise: 9999,
  };

  const baseLimit = baseLimits[agencyData.subscriptionPlan] || 10;
  const addonsLimit = agencyData.billing?.addons?.extraSubClients || 0;
  const totalLimit = baseLimit + addonsLimit;

  return { canCreate: current < totalLimit, current, limit: totalLimit };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/v1/tenants
 * List all sub-clients
 */
router.get('/tenants', requirePermission('read_tenants'), async (req, res) => {
  try {
    const { tenantId: agencyTenantId } = (req as any).apiAuth;

    // Parse pagination parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string;

    // Build query
    let query = db.collection('tenants')
      .where('ownerTenantId', '==', agencyTenantId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset);

    // Filter by status if provided
    if (status) {
      query = query.where('status', '==', status) as any;
    }

    const tenantsSnapshot = await query.get();

    // Get total count
    const totalCount = await db.collection('tenants')
      .where('ownerTenantId', '==', agencyTenantId)
      .count()
      .get();

    const tenants = tenantsSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      slug: doc.data().slug,
      status: doc.data().status,
      industry: doc.data().industry,
      contactEmail: doc.data().contactEmail,
      createdAt: doc.data().createdAt?.toDate().toISOString(),
      usage: doc.data().usage,
      limits: doc.data().limits,
    }));

    res.json({
      success: true,
      data: tenants,
      pagination: {
        total: totalCount.data().count,
        limit,
        offset,
        hasMore: offset + tenants.length < totalCount.data().count,
      },
    });
  } catch (error: any) {
    functions.logger.error('Error listing tenants', { error: error.message });
    res.status(500).json({ error: 'Failed to list tenants', message: error.message });
  }
});

/**
 * POST /api/v1/tenants
 * Create new sub-client
 */
router.post('/tenants', requirePermission('create_tenants'), async (req, res) => {
  try {
    const { tenantId: agencyTenantId } = (req as any).apiAuth;
    const { name, email, industry, features = [] } = req.body;

    if (!name || !email) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'name and email are required',
      });
      return;
    }

    // Check sub-client limit
    const limitCheck = await checkSubClientLimit(agencyTenantId);

    if (!limitCheck.canCreate) {
      res.status(400).json({
        error: 'Sub-client limit reached',
        message: `You have reached your limit of ${limitCheck.limit} sub-clients`,
        current: limitCheck.current,
        limit: limitCheck.limit,
      });
      return;
    }

    // Create tenant
    const newTenant = await db.collection('tenants').add({
      name,
      slug: slugify(name),
      type: 'agency_client',
      ownerTenantId: agencyTenantId,
      ownerUserId: null,
      subscriptionPlan: 'agency',
      status: 'trial',
      industry: industry || 'other',
      contactEmail: email,
      branding: {
        companyName: name,
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
      },
      settings: {
        enabledFeatures: features,
        defaultLanguage: 'es',
      },
      limits: {
        maxProjects: 10,
        maxUsers: 5,
        maxAiCredits: 1000,
        maxStorageGB: 10,
      },
      usage: {
        projects: 0,
        users: 0,
        aiCreditsUsed: 0,
        storageUsed: 0,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Record activity
    await db.collection('agencyActivity').add({
      agencyTenantId,
      type: 'client_created',
      clientTenantId: newTenant.id,
      clientName: name,
      source: 'api',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info('Tenant created via API', { tenantId: newTenant.id, agencyTenantId });

    res.status(201).json({
      success: true,
      data: {
        id: newTenant.id,
        name,
        status: 'created',
      },
    });
  } catch (error: any) {
    functions.logger.error('Error creating tenant', { error: error.message });
    res.status(500).json({ error: 'Failed to create tenant', message: error.message });
  }
});

/**
 * GET /api/v1/tenants/:id
 * Get specific tenant details
 */
router.get('/tenants/:id', requirePermission('read_tenants'), async (req, res) => {
  try {
    const { tenantId: agencyTenantId } = (req as any).apiAuth;
    const { id } = req.params;

    const tenantDoc = await db.collection('tenants').doc(id).get();

    if (!tenantDoc.exists) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    const tenantData = tenantDoc.data()!;

    // Verify ownership
    if (tenantData.ownerTenantId !== agencyTenantId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: tenantDoc.id,
        name: tenantData.name,
        slug: tenantData.slug,
        status: tenantData.status,
        type: tenantData.type,
        industry: tenantData.industry,
        contactEmail: tenantData.contactEmail,
        contactPhone: tenantData.contactPhone,
        branding: tenantData.branding,
        settings: tenantData.settings,
        limits: tenantData.limits,
        usage: tenantData.usage,
        billing: tenantData.billing ? {
          monthlyPrice: tenantData.billing.monthlyPrice,
          status: tenantData.billing.status,
          nextBillingDate: tenantData.billing.nextBillingDate?.toDate().toISOString(),
        } : null,
        createdAt: tenantData.createdAt?.toDate().toISOString(),
        updatedAt: tenantData.updatedAt?.toDate().toISOString(),
      },
    });
  } catch (error: any) {
    functions.logger.error('Error getting tenant', { error: error.message });
    res.status(500).json({ error: 'Failed to get tenant', message: error.message });
  }
});

/**
 * PATCH /api/v1/tenants/:id
 * Update tenant
 */
router.patch('/tenants/:id', requirePermission('update_tenants'), async (req, res) => {
  try {
    const { tenantId: agencyTenantId } = (req as any).apiAuth;
    const { id } = req.params;

    const tenantDoc = await db.collection('tenants').doc(id).get();

    if (!tenantDoc.exists) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    const tenantData = tenantDoc.data()!;

    // Verify ownership
    if (tenantData.ownerTenantId !== agencyTenantId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Only allow updating certain fields
    const allowedFields = ['name', 'industry', 'contactEmail', 'contactPhone', 'status'];
    const updates: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Update slug if name changed
    if (updates.name) {
      updates.slug = slugify(updates.name);
    }

    await tenantDoc.ref.update(updates);

    functions.logger.info('Tenant updated via API', { tenantId: id, agencyTenantId });

    res.json({
      success: true,
      data: {
        id,
        ...updates,
      },
    });
  } catch (error: any) {
    functions.logger.error('Error updating tenant', { error: error.message });
    res.status(500).json({ error: 'Failed to update tenant', message: error.message });
  }
});

/**
 * DELETE /api/v1/tenants/:id
 * Delete (soft delete) tenant
 */
router.delete('/tenants/:id', requirePermission('delete_tenants'), async (req, res) => {
  try {
    const { tenantId: agencyTenantId } = (req as any).apiAuth;
    const { id } = req.params;

    const tenantDoc = await db.collection('tenants').doc(id).get();

    if (!tenantDoc.exists) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    const tenantData = tenantDoc.data()!;

    // Verify ownership
    if (tenantData.ownerTenantId !== agencyTenantId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Soft delete (mark as deleted)
    await tenantDoc.ref.update({
      status: 'deleted',
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Record activity
    await db.collection('agencyActivity').add({
      agencyTenantId,
      type: 'client_deleted',
      clientTenantId: id,
      clientName: tenantData.name,
      source: 'api',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info('Tenant deleted via API', { tenantId: id, agencyTenantId });

    res.json({
      success: true,
      message: 'Tenant deleted successfully',
    });
  } catch (error: any) {
    functions.logger.error('Error deleting tenant', { error: error.message });
    res.status(500).json({ error: 'Failed to delete tenant', message: error.message });
  }
});

/**
 * POST /api/v1/tenants/:id/members
 * Add member to tenant
 */
router.post('/tenants/:id/members', requirePermission('manage_members'), async (req, res) => {
  try {
    const { tenantId: agencyTenantId } = (req as any).apiAuth;
    const { id } = req.params;
    const { email, role = 'client', name } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Missing required field: email' });
      return;
    }

    const tenantDoc = await db.collection('tenants').doc(id).get();

    if (!tenantDoc.exists) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    const tenantData = tenantDoc.data()!;

    // Verify ownership
    if (tenantData.ownerTenantId !== agencyTenantId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Create invitation
    const inviteToken = `invite_${id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.collection('tenantInvites').add({
      tenantId: id,
      email,
      name: name || email,
      role,
      inviteToken,
      status: 'pending',
      source: 'api',
      expiresAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info('Member invite created via API', { tenantId: id, email });

    res.status(201).json({
      success: true,
      message: 'Invitation sent',
      inviteToken,
    });
  } catch (error: any) {
    functions.logger.error('Error adding member', { error: error.message });
    res.status(500).json({ error: 'Failed to add member', message: error.message });
  }
});

/**
 * GET /api/v1/tenants/:id/usage
 * Get tenant resource usage
 */
router.get('/tenants/:id/usage', requirePermission('read_tenants'), async (req, res) => {
  try {
    const { tenantId: agencyTenantId } = (req as any).apiAuth;
    const { id } = req.params;

    const tenantDoc = await db.collection('tenants').doc(id).get();

    if (!tenantDoc.exists) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    const tenantData = tenantDoc.data()!;

    // Verify ownership
    if (tenantData.ownerTenantId !== agencyTenantId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const usage = tenantData.usage || {};
    const limits = tenantData.limits || {};

    // Calculate percentages
    const percentages: Record<string, number> = {};
    for (const [key, value] of Object.entries(usage)) {
      const limitKey = `max${key.charAt(0).toUpperCase() + key.slice(1)}`;
      const limit = limits[limitKey] || 0;
      percentages[key] = limit > 0 ? (value as number / limit) * 100 : 0;
    }

    res.json({
      success: true,
      data: {
        tenantId: id,
        usage,
        limits,
        percentages,
        alerts: Object.entries(percentages)
          .filter(([_, percent]) => percent > 80)
          .map(([resource, percent]) => ({
            resource,
            percent: Math.round(percent),
            level: percent > 95 ? 'critical' : 'warning',
          })),
      },
    });
  } catch (error: any) {
    functions.logger.error('Error getting usage', { error: error.message });
    res.status(500).json({ error: 'Failed to get usage', message: error.message });
  }
});

/**
 * POST /api/v1/tenants/:id/reports
 * Generate report for specific tenant (or call consolidated report)
 */
router.post('/tenants/:id/reports', requirePermission('generate_reports'), async (req, res) => {
  try {
    const { tenantId: agencyTenantId } = (req as any).apiAuth;
    const { id } = req.params;

    // TODO: Implement actual report generation
    // This would integrate with the generateConsolidatedReport function

    res.status(501).json({
      error: 'Not implemented',
      message: 'Report generation endpoint is under development',
    });
  } catch (error: any) {
    functions.logger.error('Error generating report', { error: error.message });
    res.status(500).json({ error: 'Failed to generate report', message: error.message });
  }
});

// Apply error handler
router.use(errorHandler);

// ============================================================================
// EXPORT
// ============================================================================

// Create Express app and mount router
const app = express.default ? express.default() : (express as any)();
app.use('/api/v1', router);

export const tenantsApi = functions.https.onRequest(app);
