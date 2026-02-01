/**
 * Automated Client Onboarding
 * Provisions new sub-clients with all necessary resources
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const db = admin.firestore();

// ============================================================================
// TYPES
// ============================================================================

interface ClientIntakeData {
  // Basic Information
  businessName: string;
  industry: string;
  contactEmail: string;
  contactPhone?: string;

  // Initial Configuration
  projectTemplate?: string; // Template ID to use
  enabledFeatures: string[]; // ['cms', 'leads', 'ecommerce', etc.]
  initialUsers: InitialUser[];

  // Branding (optional)
  logo?: string; // URL or base64
  primaryColor?: string;
  secondaryColor?: string;

  // Billing (optional)
  monthlyPrice?: number;
  paymentMethod?: string;
}

interface InitialUser {
  email: string;
  name: string;
  role: 'client' | 'client_admin' | 'client_user';
}

interface ProvisionResponse {
  success: boolean;
  clientTenantId: string;
  invitesSent: number;
  projectId?: string;
  errors?: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verify that the caller is an agency owner
 */
async function verifyAgencyOwner(userId: string): Promise<string> {
  // Get user's tenant memberships
  const membershipsSnapshot = await db
    .collection('tenantMembers')
    .where('userId', '==', userId)
    .where('role', '==', 'agency_owner')
    .limit(1)
    .get();

  if (membershipsSnapshot.empty) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only agency owners can provision new clients'
    );
  }

  const membership = membershipsSnapshot.docs[0].data();
  const tenantId = membership.tenantId;

  // Verify tenant is an agency
  const tenantDoc = await db.collection('tenants').doc(tenantId).get();
  const tenantData = tenantDoc.data();

  if (
    !tenantData ||
    !['agency', 'agency_plus', 'enterprise'].includes(
      tenantData.subscriptionPlan
    )
  ) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only agency plans can provision sub-clients'
    );
  }

  return tenantId;
}

/**
 * Check if agency has reached sub-client limit
 */
async function checkSubClientLimit(
  agencyTenantId: string
): Promise<{ canCreate: boolean; current: number; limit: number }> {
  // Get current sub-client count
  const subClientsSnapshot = await db
    .collection('tenants')
    .where('ownerTenantId', '==', agencyTenantId)
    .where('status', 'in', ['active', 'trial'])
    .get();

  const current = subClientsSnapshot.size;

  // Get agency limits
  const agencyDoc = await db.collection('tenants').doc(agencyTenantId).get();
  const agencyData = agencyDoc.data();

  const baseLimits = agencyData?.limits?.maxSubClients || 5;
  const addonsExtra = agencyData?.billing?.addons?.extraSubClients || 0;
  const limit = baseLimits + addonsExtra;

  return {
    canCreate: current < limit,
    current,
    limit,
  };
}

/**
 * Generate a unique slug from business name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Create project from template
 */
async function createProjectFromTemplate(
  tenantId: string,
  templateId: string,
  projectName: string,
  industry: string
): Promise<string> {
  // Get template (simplified - in production, fetch from templates collection)
  const defaultComponents = [
    {
      id: 'hero-1',
      type: 'hero',
      props: {
        title: `Bienvenido a ${projectName}`,
        subtitle: 'Transforma tu presencia digital',
        backgroundImage: '',
      },
    },
    {
      id: 'features-1',
      type: 'features',
      props: {
        title: 'Nuestros Servicios',
        features: [
          { title: 'Servicio 1', description: 'Descripción del servicio' },
          { title: 'Servicio 2', description: 'Descripción del servicio' },
          { title: 'Servicio 3', description: 'Descripción del servicio' },
        ],
      },
    },
    {
      id: 'contact-1',
      type: 'contact',
      props: {
        title: 'Contáctanos',
        showForm: true,
      },
    },
  ];

  // Create project
  const projectRef = await db.collection('projects').add({
    tenantId,
    name: projectName,
    slug: generateSlug(projectName),
    industry,
    status: 'draft',
    components: defaultComponents,
    settings: {
      seoTitle: projectName,
      seoDescription: `Sitio web de ${projectName}`,
      favicon: '',
      language: 'es',
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return projectRef.id;
}

/**
 * Generate invitation token
 */
function generateInviteToken(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

/**
 * Send welcome email to client user
 */
async function sendClientWelcomeEmail(data: {
  to: string;
  userName: string;
  clientName: string;
  agencyName: string;
  inviteLink: string;
}): Promise<void> {
  // Add to mail queue (using a 'mail' collection that triggers email sending)
  await db.collection('mail').add({
    to: data.to,
    template: {
      name: 'clientWelcome',
      data: {
        userName: data.userName,
        clientName: data.clientName,
        agencyName: data.agencyName,
        inviteLink: data.inviteLink,
      },
    },
    createdAt: Timestamp.now(),
  });
}

// ============================================================================
// CLOUD FUNCTION
// ============================================================================

/**
 * Auto Provision Client
 * Creates a new sub-client tenant with all initial configuration
 */
export const autoProvisionClient = functions.https.onCall(
  async (
    data: ClientIntakeData,
    context
  ): Promise<ProvisionResponse> => {
    // 1. Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const userId = context.auth.uid;
    const errors: string[] = [];

    try {
      // 2. Verify caller is agency owner and get agency tenant ID
      const agencyTenantId = await verifyAgencyOwner(userId);

      // 3. Check sub-client limit
      const limitCheck = await checkSubClientLimit(agencyTenantId);
      if (!limitCheck.canCreate) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          `Sub-client limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan or add more slots.`
        );
      }

      // 4. Get agency data for branding/context
      const agencyDoc = await db
        .collection('tenants')
        .doc(agencyTenantId)
        .get();
      const agencyData = agencyDoc.data();

      // 5. Create sub-client tenant
      const clientSlug = generateSlug(data.businessName);
      const clientTenantRef = await db.collection('tenants').add({
        name: data.businessName,
        slug: clientSlug,
        type: 'agency_client',
        ownerTenantId: agencyTenantId,
        ownerUserId: null, // Will be set when first user accepts invitation
        subscriptionPlan: 'agency', // Inherits from parent
        status: 'trial',
        industry: data.industry,

        // Branding
        branding: {
          companyName: data.businessName,
          logo: data.logo || '',
          primaryColor: data.primaryColor || '#3B82F6',
          secondaryColor: data.secondaryColor || '#10B981',
          favicon: '',
        },

        // Settings
        settings: {
          enabledFeatures: data.enabledFeatures || [],
          defaultLanguage: 'es',
          portalLanguage: 'es',
          autoReports: {
            enabled: false,
            frequency: 'monthly',
            recipients: [],
          },
        },

        // Contact information
        contactInfo: {
          email: data.contactEmail,
          phone: data.contactPhone || '',
        },

        // Usage tracking (start at 0)
        usage: {
          projects: 0,
          users: 0,
          leads: 0,
          products: 0,
          storageUsed: 0,
          aiCreditsUsed: 0,
          emailsSent: 0,
        },

        // Inherit limits from parent agency
        limits: agencyData?.limits || {},

        // Metadata
        createdAt: Timestamp.now(),
        createdBy: userId,
        updatedAt: Timestamp.now(),
      });

      const clientTenantId = clientTenantRef.id;

      // 6. Create initial project from template (if specified)
      let projectId: string | undefined;
      if (data.projectTemplate) {
        try {
          projectId = await createProjectFromTemplate(
            clientTenantId,
            data.projectTemplate,
            `Sitio Web - ${data.businessName}`,
            data.industry
          );
        } catch (error) {
          console.error('Error creating project from template:', error);
          errors.push('Failed to create initial project');
        }
      }

      // 7. Create user invitations
      const invitesSent = 0;
      for (const userData of data.initialUsers) {
        try {
          const inviteToken = generateInviteToken();
          const expiresAt = Timestamp.fromDate(
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          );

          // Create invitation document
          await db.collection('tenantInvites').add({
            tenantId: clientTenantId,
            email: userData.email,
            name: userData.name,
            role: userData.role || 'client',
            invitedBy: userId,
            status: 'pending',
            token: inviteToken,
            expiresAt,
            createdAt: Timestamp.now(),
          });

          // Send welcome email
          const inviteLink = `${process.env.BASE_URL || 'https://quimera.ai'}/accept-invite?token=${inviteToken}`;

          await sendClientWelcomeEmail({
            to: userData.email,
            userName: userData.name,
            clientName: data.businessName,
            agencyName: agencyData?.name || 'tu agencia',
            inviteLink,
          });
        } catch (error) {
          console.error(`Error inviting user ${userData.email}:`, error);
          errors.push(`Failed to invite user: ${userData.email}`);
        }
      }

      // 8. Log activity in agency feed
      await db.collection('agencyActivity').add({
        agencyTenantId,
        type: 'client_created',
        clientTenantId,
        clientName: data.businessName,
        metadata: {
          industry: data.industry,
          enabledFeatures: data.enabledFeatures,
          projectCreated: !!projectId,
          usersInvited: data.initialUsers.length,
        },
        createdBy: userId,
        timestamp: Timestamp.now(),
      });

      // 9. Setup billing if configured
      if (data.monthlyPrice && data.paymentMethod) {
        try {
          // Note: This would call setupClientBilling Cloud Function
          // For now, just save the billing config
          await db
            .collection('tenants')
            .doc(clientTenantId)
            .update({
              'billing.monthlyPrice': data.monthlyPrice,
              'billing.billingMode': 'direct',
              'billing.status': 'pending_setup',
            });
        } catch (error) {
          console.error('Error setting up billing:', error);
          errors.push('Failed to setup billing');
        }
      }

      // 10. Update agency's usage counter
      await db
        .collection('tenants')
        .doc(agencyTenantId)
        .update({
          'usage.subClients': admin.firestore.FieldValue.increment(1),
          updatedAt: Timestamp.now(),
        });

      return {
        success: true,
        clientTenantId,
        invitesSent: data.initialUsers.length,
        projectId,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      console.error('Error provisioning client:', error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        `Failed to provision client: ${error.message}`
      );
    }
  }
);

/**
 * Get Onboarding Status
 * Check the onboarding progress for a client
 */
export const getOnboardingStatus = functions.https.onCall(
  async (data: { clientTenantId: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { clientTenantId } = data;

    // Get client tenant
    const clientDoc = await db.collection('tenants').doc(clientTenantId).get();
    if (!clientDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Client not found');
    }

    const clientData = clientDoc.data();

    // Check various onboarding steps
    const checks = {
      tenantCreated: true,
      hasProject: false,
      hasUsers: false,
      billingSetup: false,
      brandingConfigured: false,
    };

    // Check if has project
    const projectsSnapshot = await db
      .collection('projects')
      .where('tenantId', '==', clientTenantId)
      .limit(1)
      .get();
    checks.hasProject = !projectsSnapshot.empty;

    // Check if has users
    const membersSnapshot = await db
      .collection('tenantMembers')
      .where('tenantId', '==', clientTenantId)
      .limit(1)
      .get();
    checks.hasUsers = !membersSnapshot.empty;

    // Check billing
    checks.billingSetup =
      !!clientData?.billing?.stripeCustomerId ||
      !!clientData?.billing?.monthlyPrice;

    // Check branding
    checks.brandingConfigured =
      !!clientData?.branding?.logo || !!clientData?.branding?.primaryColor;

    const completedSteps = Object.values(checks).filter(Boolean).length;
    const totalSteps = Object.keys(checks).length;
    const progress = (completedSteps / totalSteps) * 100;

    return {
      clientTenantId,
      clientName: clientData?.name,
      status: clientData?.status,
      progress,
      checks,
      createdAt: clientData?.createdAt,
    };
  }
);
