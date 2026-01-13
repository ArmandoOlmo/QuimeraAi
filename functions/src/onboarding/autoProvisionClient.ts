/**
 * Auto Provision Client
 * Automatically create and configure new sub-client tenants
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();
const BASE_URL = functions.config().app?.base_url || 'https://quimera.ai';

// ============================================================================
// TYPES
// ============================================================================

interface ClientIntakeData {
  businessName: string;
  industry: string;
  contactEmail: string;
  contactPhone?: string;
  projectTemplate?: string;
  enabledFeatures: string[];  // ['cms', 'leads', 'ecommerce', 'chatbot', 'email']
  initialUsers: Array<{
    name: string;
    email: string;
    role: string;
  }>;
  logo?: string;  // Base64 or URL
  primaryColor?: string;
  secondaryColor?: string;
  monthlyPrice?: number;
  paymentMethod?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function verifyAgencyOwner(userId: string): Promise<string> {
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const memberSnapshot = await db.collection('tenantMembers')
    .where('userId', '==', userId)
    .where('role', '==', 'agency_owner')
    .limit(1)
    .get();

  if (memberSnapshot.empty) {
    throw new functions.https.HttpsError('permission-denied', 'User is not an agency owner');
  }

  return memberSnapshot.docs[0].data().tenantId;
}

async function checkSubClientLimit(agencyTenantId: string): Promise<{ canCreate: boolean; current: number; limit: number }> {
  const agencyDoc = await db.collection('tenants').doc(agencyTenantId).get();
  const agencyData = agencyDoc.data()!;

  // Get current sub-client count
  const currentSubClients = await db.collection('tenants')
    .where('ownerTenantId', '==', agencyTenantId)
    .where('status', 'in', ['active', 'trial'])
    .count()
    .get();

  const current = currentSubClients.data().count;

  // Get limit based on plan + add-ons
  const baseLimits: Record<string, number> = {
    agency: 10,
    agency_plus: 25,
    enterprise: 9999,
  };

  const baseLimit = baseLimits[agencyData.subscriptionPlan] || 10;
  const addonsLimit = agencyData.billing?.addons?.extraSubClients || 0;
  const totalLimit = baseLimit + addonsLimit;

  return {
    canCreate: current < totalLimit,
    current,
    limit: totalLimit,
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function createProjectFromTemplate(
  clientTenantId: string,
  templateId: string,
  customData: { name: string; industry: string }
): Promise<string> {
  // This is a simplified version - in production, you'd fetch actual templates
  const projectRef = await db.collection('projects').add({
    tenantId: clientTenantId,
    name: customData.name,
    slug: slugify(customData.name),
    type: 'website',
    status: 'draft',
    template: templateId,
    industry: customData.industry,
    components: [],  // Would be populated from template
    settings: {
      seo: {
        title: customData.name,
        description: `Sitio web oficial de ${customData.name}`,
      },
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  functions.logger.info('Project created from template', { projectId: projectRef.id, templateId });

  return projectRef.id;
}

async function sendClientWelcomeEmail(data: {
  to: string;
  clientName: string;
  agencyName: string;
  inviteToken: string;
  userName: string;
}): Promise<void> {
  // TODO: Implement actual email sending using SendGrid or similar
  // For now, just log
  functions.logger.info('Welcome email queued', {
    to: data.to,
    clientName: data.clientName,
  });

  // In production, you would:
  // 1. Use SendGrid/Mailgun API
  // 2. Use your email template
  // 3. Include proper branding from agency
}

// ============================================================================
// MAIN CLOUD FUNCTION
// ============================================================================

export const autoProvisionClient = functions.https.onCall(
  async (data: ClientIntakeData, context): Promise<any> => {
    const userId = context.auth?.uid;

    if (!userId) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const {
      businessName,
      industry,
      contactEmail,
      contactPhone,
      projectTemplate,
      enabledFeatures,
      initialUsers,
      logo,
      primaryColor,
      secondaryColor,
      monthlyPrice,
      paymentMethod,
    } = data;

    if (!businessName || !industry || !contactEmail || !enabledFeatures) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    try {
      // 1. Verify user is agency owner
      const agencyTenantId = await verifyAgencyOwner(userId);

      // 2. Check sub-client limit
      const limitCheck = await checkSubClientLimit(agencyTenantId);
      if (!limitCheck.canCreate) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          `Sub-client limit reached (${limitCheck.current}/${limitCheck.limit}). ` +
          `Upgrade your plan or add more sub-clients via add-ons.`
        );
      }

      // 3. Get agency data
      const agencyDoc = await db.collection('tenants').doc(agencyTenantId).get();
      const agencyData = agencyDoc.data()!;

      functions.logger.info('Creating new sub-client', {
        agencyTenantId,
        businessName,
        enabledFeatures,
      });

      // 4. Create sub-client tenant
      const clientTenantRef = await db.collection('tenants').add({
        name: businessName,
        slug: slugify(businessName),
        type: 'agency_client',
        ownerTenantId: agencyTenantId,
        ownerUserId: null,  // Will be set when owner accepts invite
        subscriptionPlan: 'agency',  // Inherits from parent
        status: 'trial',
        industry,
        contactEmail,
        contactPhone,
        branding: {
          companyName: businessName,
          logo: logo || null,
          primaryColor: primaryColor || '#3B82F6',
          secondaryColor: secondaryColor || '#10B981',
          faviconUrl: null,
        },
        settings: {
          enabledFeatures,
          defaultLanguage: 'es',
        },
        limits: {
          maxProjects: 10,
          maxUsers: 5,
          maxAiCredits: 1000,
          maxStorageGB: 10,
          maxDomains: 3,
          maxLeads: 1000,
          maxProducts: 100,
        },
        usage: {
          projects: 0,
          users: 0,
          aiCreditsUsed: 0,
          storageUsed: 0,
          domains: 0,
          leads: 0,
          products: 0,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const clientTenantId = clientTenantRef.id;

      functions.logger.info('Sub-client tenant created', { clientTenantId });

      // 5. Create project from template (if specified)
      let projectId: string | null = null;

      if (projectTemplate) {
        try {
          projectId = await createProjectFromTemplate(clientTenantId, projectTemplate, {
            name: `Sitio Web - ${businessName}`,
            industry,
          });

          // Update project count
          await clientTenantRef.update({
            'usage.projects': 1,
          });
        } catch (error: any) {
          functions.logger.error('Error creating project from template', {
            error: error.message,
            clientTenantId,
          });
          // Continue despite error
        }
      }

      // 6. Create invitations for initial users
      const invitePromises = initialUsers.map(async (userData) => {
        const inviteToken = `invite_${clientTenantId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const inviteRef = await db.collection('tenantInvites').add({
          tenantId: clientTenantId,
          email: userData.email,
          name: userData.name,
          role: userData.role || 'client',
          invitedBy: userId,
          inviteToken,
          status: 'pending',
          expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)  // 7 days
          ),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Send welcome email
        await sendClientWelcomeEmail({
          to: userData.email,
          clientName: businessName,
          agencyName: agencyData.name,
          inviteToken,
          userName: userData.name,
        });

        return inviteRef.id;
      });

      const inviteIds = await Promise.all(invitePromises);

      functions.logger.info('User invitations created', {
        clientTenantId,
        inviteCount: inviteIds.length,
      });

      // 7. Setup billing (if configured)
      if (monthlyPrice && paymentMethod) {
        // This would call setupClientBilling from stripeConnectAgency.ts
        // For now, just save the intent
        await clientTenantRef.update({
          'billing.monthlyPrice': monthlyPrice,
          'billing.paymentMethod': paymentMethod,
          'billing.setupPending': true,
        });

        functions.logger.info('Billing setup pending', { clientTenantId, monthlyPrice });
      }

      // 8. Record activity in agency feed
      await db.collection('agencyActivity').add({
        agencyTenantId,
        type: 'client_created',
        clientTenantId,
        clientName: businessName,
        createdBy: userId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      functions.logger.info('Sub-client provisioning completed', {
        clientTenantId,
        projectId,
        invitesSent: inviteIds.length,
      });

      return {
        success: true,
        clientTenantId,
        projectId,
        invitesSent: inviteIds.length,
        message: `Cliente ${businessName} creado exitosamente. Se enviaron ${inviteIds.length} invitaciones.`,
      };
    } catch (error: any) {
      functions.logger.error('Error provisioning client', {
        error: error.message,
        businessName,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', `Failed to provision client: ${error.message}`);
    }
  }
);

/**
 * Get onboarding status for a client
 */
export const getOnboardingStatus = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid;

  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { clientTenantId } = data;

  if (!clientTenantId) {
    throw new functions.https.HttpsError('invalid-argument', 'clientTenantId is required');
  }

  const clientDoc = await db.collection('tenants').doc(clientTenantId).get();

  if (!clientDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Client tenant not found');
  }

  const clientData = clientDoc.data()!;

  // Verify user has access (agency owner or client member)
  const memberSnapshot = await db.collection('tenantMembers')
    .where('userId', '==', userId)
    .where('tenantId', 'in', [clientTenantId, clientData.ownerTenantId])
    .limit(1)
    .get();

  if (memberSnapshot.empty) {
    throw new functions.https.HttpsError('permission-denied', 'User does not have access');
  }

  // Get pending invites
  const invitesSnapshot = await db.collection('tenantInvites')
    .where('tenantId', '==', clientTenantId)
    .where('status', '==', 'pending')
    .get();

  // Get project count
  const projectsSnapshot = await db.collection('projects')
    .where('tenantId', '==', clientTenantId)
    .count()
    .get();

  return {
    success: true,
    status: {
      tenantCreated: true,
      projectsCreated: projectsSnapshot.data().count,
      invitesPending: invitesSnapshot.size,
      invitesAccepted: (clientData.usage?.users || 0),
      billingConfigured: !!clientData.billing?.stripeCustomerId,
      status: clientData.status,
    },
  };
});
