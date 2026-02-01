/**
 * Migration Script: User Data to Multi-Tenant Structure
 * 
 * This script migrates existing user data from:
 *   /users/{uid}/projects/...
 *   /users/{uid}/posts/...
 *   /users/{uid}/leads/...
 *   /users/{uid}/files/...
 *   /users/{uid}/stores/...
 *   /users/{uid}/domains/...
 * 
 * To the new multi-tenant structure:
 *   /tenants/{tenantId}/projects/...
 *   /tenants/{tenantId}/posts/...
 *   /tenants/{tenantId}/leads/...
 *   /tenants/{tenantId}/files/...
 *   /tenants/{tenantId}/stores/...
 *   /tenants/{tenantId}/domains/...
 * 
 * Usage:
 *   npx ts-node scripts/migrateToMultiTenant.ts [--dry-run] [--user=<userId>]
 * 
 * Options:
 *   --dry-run    Preview migration without making changes
 *   --user       Migrate only a specific user (for testing)
 *   --batch      Process users in batches (default: 10)
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase Admin SDK
let serviceAccount: admin.ServiceAccount | undefined;
try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        const fileContent = readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8');
        serviceAccount = JSON.parse(fileContent);
    }
} catch (e) {
    console.log('No service account file found, using default credentials');
}

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp(serviceAccount ? {
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.projectId || (serviceAccount as any).project_id,
    } : undefined);
}

const db = admin.firestore();

// =============================================================================
// TYPES
// =============================================================================

interface MigrationStats {
    usersProcessed: number;
    tenantsCreated: number;
    projectsMigrated: number;
    postsMigrated: number;
    leadsMigrated: number;
    filesMigrated: number;
    storesMigrated: number;
    domainsMigrated: number;
    errors: string[];
}

interface MigrationOptions {
    dryRun: boolean;
    userId?: string;
    batchSize: number;
}

interface TenantLimits {
    maxProjects: number;
    maxUsers: number;
    maxStorageGB: number;
    maxAiCredits: number;
}

interface TenantUsage {
    projectCount: number;
    userCount: number;
    storageUsedGB: number;
    aiCreditsUsed: number;
}

interface TenantPermissions {
    canManageProjects: boolean;
    canManageLeads: boolean;
    canManageCMS: boolean;
    canManageEcommerce: boolean;
    canManageFiles: boolean;
    canManageDomains: boolean;
    canInviteMembers: boolean;
    canRemoveMembers: boolean;
    canViewAnalytics: boolean;
    canManageBilling: boolean;
    canManageSettings: boolean;
    canExportData: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function getDefaultLimitsForPlan(plan: string): TenantLimits {
    switch (plan) {
        case 'free':
            return { maxProjects: 3, maxUsers: 1, maxStorageGB: 5, maxAiCredits: 100 };
        case 'pro':
            return { maxProjects: 20, maxUsers: 5, maxStorageGB: 50, maxAiCredits: 1000 };
        case 'enterprise':
            return { maxProjects: 100, maxUsers: 50, maxStorageGB: 500, maxAiCredits: 10000 };
        default:
            return { maxProjects: 3, maxUsers: 1, maxStorageGB: 5, maxAiCredits: 100 };
    }
}

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
}

const DEFAULT_PERMISSIONS: TenantPermissions = {
    canManageProjects: true,
    canManageLeads: true,
    canManageCMS: true,
    canManageEcommerce: true,
    canManageFiles: true,
    canManageDomains: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canViewAnalytics: true,
    canManageBilling: true,
    canManageSettings: true,
    canExportData: true,
};

// =============================================================================
// MIGRATION FUNCTIONS
// =============================================================================

async function migrateCollection(
    sourceRef: admin.firestore.CollectionReference,
    targetRef: admin.firestore.CollectionReference,
    dryRun: boolean
): Promise<number> {
    const snapshot = await sourceRef.get();
    let count = 0;

    for (const doc of snapshot.docs) {
        if (dryRun) {
            console.log(`  [DRY RUN] Would migrate document: ${doc.id}`);
        } else {
            await targetRef.doc(doc.id).set({
                ...doc.data(),
                migratedAt: admin.firestore.FieldValue.serverTimestamp(),
                originalPath: doc.ref.path,
            });
        }
        count++;
    }

    return count;
}

async function migrateNestedCollection(
    sourceRef: admin.firestore.CollectionReference,
    targetRef: admin.firestore.CollectionReference,
    nestedCollections: string[],
    dryRun: boolean
): Promise<number> {
    const snapshot = await sourceRef.get();
    let count = 0;

    for (const doc of snapshot.docs) {
        if (!dryRun) {
            await targetRef.doc(doc.id).set({
                ...doc.data(),
                migratedAt: admin.firestore.FieldValue.serverTimestamp(),
                originalPath: doc.ref.path,
            });
        } else {
            console.log(`  [DRY RUN] Would migrate document: ${doc.id}`);
        }
        count++;

        // Migrate nested collections
        for (const nestedName of nestedCollections) {
            const nestedSource = doc.ref.collection(nestedName);
            const nestedTarget = targetRef.doc(doc.id).collection(nestedName);
            const nestedCount = await migrateCollection(nestedSource, nestedTarget, dryRun);
            if (nestedCount > 0) {
                console.log(`    Migrated ${nestedCount} ${nestedName} documents`);
            }
        }
    }

    return count;
}

async function migrateUserToTenant(
    userId: string,
    userData: admin.firestore.DocumentData,
    options: MigrationOptions,
    stats: MigrationStats
): Promise<string> {
    const { dryRun } = options;
    
    console.log(`\nMigrating user: ${userId} (${userData.name || userData.email || 'unnamed'})`);
    
    // Generate tenant ID (use userId for simplicity, but could generate new)
    const tenantId = userId;
    const tenantName = userData.name || userData.email?.split('@')[0] || 'My Workspace';
    const plan = userData.subscriptionPlan || userData.plan || 'free';
    
    // Create tenant document
    const tenantData = {
        id: tenantId,
        name: tenantName,
        slug: generateSlug(tenantName) + '-' + tenantId.substring(0, 6),
        type: 'individual',
        ownerUserId: userId,
        subscriptionPlan: plan,
        status: 'active',
        limits: getDefaultLimitsForPlan(plan),
        usage: {
            projectCount: 0,
            userCount: 1,
            storageUsedGB: 0,
            aiCreditsUsed: 0,
        } as TenantUsage,
        branding: {
            primaryColor: '#4f46e5',
            secondaryColor: '#10b981',
            companyName: tenantName,
        },
        settings: {
            allowMemberInvites: true,
            defaultMemberRole: 'agency_member',
            enabledFeatures: ['projects', 'cms', 'leads'],
            requireTwoFactor: false,
            defaultLanguage: 'es',
            timezone: 'America/Mexico_City',
        },
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        migratedFromUserId: userId,
        createdAt: userData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    if (dryRun) {
        console.log('  [DRY RUN] Would create tenant:', tenantId);
    } else {
        await db.collection('tenants').doc(tenantId).set(tenantData);
        stats.tenantsCreated++;
    }
    
    // Create membership for owner
    const membershipId = `${tenantId}_${userId}`;
    const membershipData = {
        tenantId,
        userId,
        role: 'agency_owner',
        permissions: DEFAULT_PERMISSIONS,
        invitedBy: userId,
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        userName: userData.name || '',
        userEmail: userData.email || '',
        userPhotoURL: userData.photoURL || '',
    };
    
    if (dryRun) {
        console.log('  [DRY RUN] Would create membership:', membershipId);
    } else {
        await db.collection('tenantMembers').doc(membershipId).set(membershipData);
    }
    
    const userRef = db.collection('users').doc(userId);
    const tenantRef = db.collection('tenants').doc(tenantId);
    
    // Migrate projects with nested subcollections
    try {
        const projectCount = await migrateNestedCollection(
            userRef.collection('projects'),
            tenantRef.collection('projects'),
            ['ecommerce', 'settings', 'emailAudiences', 'emailCampaigns', 'emailLogs'],
            dryRun
        );
        console.log(`  Migrated ${projectCount} projects`);
        stats.projectsMigrated += projectCount;
        
        // Update tenant usage
        if (!dryRun && projectCount > 0) {
            await tenantRef.update({
                'usage.projectCount': projectCount,
            });
        }
    } catch (err: any) {
        console.error(`  Error migrating projects: ${err.message}`);
        stats.errors.push(`User ${userId} projects: ${err.message}`);
    }
    
    // Migrate posts
    try {
        const postCount = await migrateCollection(
            userRef.collection('posts'),
            tenantRef.collection('posts'),
            dryRun
        );
        console.log(`  Migrated ${postCount} posts`);
        stats.postsMigrated += postCount;
    } catch (err: any) {
        console.error(`  Error migrating posts: ${err.message}`);
        stats.errors.push(`User ${userId} posts: ${err.message}`);
    }
    
    // Migrate leads with activities subcollection
    try {
        const leadCount = await migrateNestedCollection(
            userRef.collection('leads'),
            tenantRef.collection('leads'),
            ['activities'],
            dryRun
        );
        console.log(`  Migrated ${leadCount} leads`);
        stats.leadsMigrated += leadCount;
    } catch (err: any) {
        console.error(`  Error migrating leads: ${err.message}`);
        stats.errors.push(`User ${userId} leads: ${err.message}`);
    }
    
    // Migrate files
    try {
        const fileCount = await migrateCollection(
            userRef.collection('files'),
            tenantRef.collection('files'),
            dryRun
        );
        console.log(`  Migrated ${fileCount} files`);
        stats.filesMigrated += fileCount;
    } catch (err: any) {
        console.error(`  Error migrating files: ${err.message}`);
        stats.errors.push(`User ${userId} files: ${err.message}`);
    }
    
    // Migrate stores with all subcollections
    try {
        const storeCount = await migrateNestedCollection(
            userRef.collection('stores'),
            tenantRef.collection('stores'),
            ['settings', 'products', 'categories', 'orders', 'customers', 'discounts', 'shippingZones', 'reviews', 'analytics'],
            dryRun
        );
        console.log(`  Migrated ${storeCount} stores`);
        stats.storesMigrated += storeCount;
    } catch (err: any) {
        console.error(`  Error migrating stores: ${err.message}`);
        stats.errors.push(`User ${userId} stores: ${err.message}`);
    }
    
    // Migrate domains
    try {
        const domainCount = await migrateCollection(
            userRef.collection('domains'),
            tenantRef.collection('domains'),
            dryRun
        );
        console.log(`  Migrated ${domainCount} domains`);
        stats.domainsMigrated += domainCount;
    } catch (err: any) {
        console.error(`  Error migrating domains: ${err.message}`);
        stats.errors.push(`User ${userId} domains: ${err.message}`);
    }
    
    // Update user document with tenantId reference
    if (!dryRun) {
        await userRef.update({
            tenantId,
            additionalTenants: [tenantId],
            migratedToMultiTenant: true,
            migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    
    stats.usersProcessed++;
    
    return tenantId;
}

// =============================================================================
// MAIN MIGRATION
// =============================================================================

async function migrate(options: MigrationOptions): Promise<MigrationStats> {
    const stats: MigrationStats = {
        usersProcessed: 0,
        tenantsCreated: 0,
        projectsMigrated: 0,
        postsMigrated: 0,
        leadsMigrated: 0,
        filesMigrated: 0,
        storesMigrated: 0,
        domainsMigrated: 0,
        errors: [],
    };
    
    console.log('\n========================================');
    console.log('Multi-Tenant Migration Script');
    console.log('========================================');
    console.log(`Mode: ${options.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
    console.log(`Batch size: ${options.batchSize}`);
    if (options.userId) {
        console.log(`Single user mode: ${options.userId}`);
    }
    console.log('========================================\n');
    
    // Query users to migrate
    let usersQuery: admin.firestore.Query = db.collection('users');
    
    if (options.userId) {
        // Single user mode
        const userDoc = await db.collection('users').doc(options.userId).get();
        if (!userDoc.exists) {
            console.error(`User not found: ${options.userId}`);
            return stats;
        }
        
        const userData = userDoc.data()!;
        if (userData.migratedToMultiTenant) {
            console.log(`User ${options.userId} already migrated. Skipping.`);
            return stats;
        }
        
        await migrateUserToTenant(options.userId, userData, options, stats);
    } else {
        // All users mode - only migrate users not yet migrated
        usersQuery = usersQuery.where('migratedToMultiTenant', '!=', true);
        
        const usersSnapshot = await usersQuery.limit(options.batchSize).get();
        console.log(`Found ${usersSnapshot.size} users to migrate\n`);
        
        for (const userDoc of usersSnapshot.docs) {
            await migrateUserToTenant(userDoc.id, userDoc.data(), options, stats);
        }
    }
    
    // Print summary
    console.log('\n========================================');
    console.log('Migration Summary');
    console.log('========================================');
    console.log(`Users processed: ${stats.usersProcessed}`);
    console.log(`Tenants created: ${stats.tenantsCreated}`);
    console.log(`Projects migrated: ${stats.projectsMigrated}`);
    console.log(`Posts migrated: ${stats.postsMigrated}`);
    console.log(`Leads migrated: ${stats.leadsMigrated}`);
    console.log(`Files migrated: ${stats.filesMigrated}`);
    console.log(`Stores migrated: ${stats.storesMigrated}`);
    console.log(`Domains migrated: ${stats.domainsMigrated}`);
    
    if (stats.errors.length > 0) {
        console.log(`\nErrors (${stats.errors.length}):`);
        stats.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    console.log('========================================\n');
    
    return stats;
}

// =============================================================================
// CLI ENTRY POINT
// =============================================================================

async function main() {
    const args = process.argv.slice(2);
    
    const options: MigrationOptions = {
        dryRun: args.includes('--dry-run'),
        userId: args.find(a => a.startsWith('--user='))?.split('=')[1],
        batchSize: parseInt(args.find(a => a.startsWith('--batch='))?.split('=')[1] || '10'),
    };
    
    try {
        await migrate(options);
        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

main();






