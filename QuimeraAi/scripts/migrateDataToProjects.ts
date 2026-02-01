/**
 * Migration Script: User Data to Project-Scoped Structure
 * 
 * This script migrates existing user data from user-level collections to project-scoped collections:
 * 
 * FROM:
 *   /users/{uid}/leads/...
 *   /users/{uid}/leadActivities/...
 *   /users/{uid}/leadTasks/...
 *   /users/{uid}/libraryLeads/...
 *   /users/{uid}/files/...
 *   /users/{uid}/appointments/...
 *   /users/{uid}/deploymentLogs/...
 * 
 * TO:
 *   /users/{uid}/projects/{projectId}/leads/...
 *   /users/{uid}/projects/{projectId}/leadActivities/...
 *   /users/{uid}/projects/{projectId}/leadTasks/...
 *   /users/{uid}/projects/{projectId}/libraryLeads/...
 *   /users/{uid}/projects/{projectId}/files/...
 *   /users/{uid}/projects/{projectId}/appointments/...
 *   /users/{uid}/projects/{projectId}/deploymentLogs/...
 * 
 * Usage:
 *   npx ts-node scripts/migrateDataToProjects.ts [--dry-run] [--user=<userId>]
 * 
 * Options:
 *   --dry-run    Preview migration without making changes
 *   --user       Migrate only a specific user (for testing)
 *   --backup     Create backup before migration (default: true)
 */

import admin from 'firebase-admin';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Handle ES modules __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    leadsMigrated: number;
    leadActivitiesMigrated: number;
    leadTasksMigrated: number;
    libraryLeadsMigrated: number;
    filesMigrated: number;
    appointmentsMigrated: number;
    deploymentLogsMigrated: number;
    defaultProjectsCreated: number;
    errors: string[];
}

interface MigrationOptions {
    dryRun: boolean;
    userId?: string;
    createBackup: boolean;
}

// Collections to migrate from user-level to project-level
const COLLECTIONS_TO_MIGRATE = [
    'leads',
    'leadActivities',
    'leadTasks',
    'libraryLeads',
    'files',
    'appointments',
    'deploymentLogs'
] as const;

type CollectionName = typeof COLLECTIONS_TO_MIGRATE[number];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function parseArgs(): MigrationOptions {
    const args = process.argv.slice(2);
    const options: MigrationOptions = {
        dryRun: args.includes('--dry-run'),
        createBackup: !args.includes('--no-backup'),
    };
    
    const userArg = args.find(arg => arg.startsWith('--user='));
    if (userArg) {
        options.userId = userArg.split('=')[1];
    }
    
    return options;
}

async function createBackup(userId: string, collectionName: string, docs: admin.firestore.QueryDocumentSnapshot[]): Promise<void> {
    const backupDir = join(__dirname, '..', 'backups', 'project-migration', new Date().toISOString().split('T')[0]);
    
    if (!existsSync(backupDir)) {
        mkdirSync(backupDir, { recursive: true });
    }
    
    const backupData = docs.map(doc => ({
        id: doc.id,
        data: doc.data()
    }));
    
    const backupPath = join(backupDir, `${userId}_${collectionName}.json`);
    writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    console.log(`  📦 Backup created: ${backupPath}`);
}

async function getDefaultProject(userId: string): Promise<{ id: string; name: string } | null> {
    const projectsRef = db.collection('users').doc(userId).collection('projects');
    const projectsSnap = await projectsRef.orderBy('lastUpdated', 'desc').limit(1).get();
    
    if (projectsSnap.empty) {
        return null;
    }
    
    const firstProject = projectsSnap.docs[0];
    return {
        id: firstProject.id,
        name: firstProject.data().name || 'Default Project'
    };
}

async function createDefaultProject(userId: string, dryRun: boolean): Promise<{ id: string; name: string }> {
    const projectData = {
        name: 'Default Project',
        description: 'Auto-created project for migrated data',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        isDefault: true,
        status: 'active'
    };
    
    if (dryRun) {
        console.log('  🔵 [DRY RUN] Would create default project');
        return { id: 'dry-run-project-id', name: 'Default Project' };
    }
    
    const projectRef = await db.collection('users').doc(userId).collection('projects').add(projectData);
    console.log(`  ✅ Created default project: ${projectRef.id}`);
    return { id: projectRef.id, name: 'Default Project' };
}

function getTargetProjectId(doc: admin.firestore.DocumentSnapshot, defaultProjectId: string): string {
    const data = doc.data();
    // If the document already has a projectId, use it
    if (data?.projectId && typeof data.projectId === 'string') {
        return data.projectId;
    }
    // Otherwise use the default project
    return defaultProjectId;
}

// =============================================================================
// MIGRATION FUNCTIONS
// =============================================================================

async function migrateCollection(
    userId: string,
    collectionName: CollectionName,
    defaultProjectId: string,
    options: MigrationOptions,
    stats: MigrationStats
): Promise<number> {
    const sourceRef = db.collection('users').doc(userId).collection(collectionName);
    const sourceDocs = await sourceRef.get();
    
    if (sourceDocs.empty) {
        console.log(`  ⏭️  No ${collectionName} to migrate`);
        return 0;
    }
    
    console.log(`  📋 Found ${sourceDocs.size} ${collectionName} to migrate`);
    
    // Create backup if enabled
    if (options.createBackup && !options.dryRun) {
        await createBackup(userId, collectionName, sourceDocs.docs);
    }
    
    // Group documents by target project
    const docsByProject = new Map<string, admin.firestore.QueryDocumentSnapshot[]>();
    
    for (const doc of sourceDocs.docs) {
        const targetProjectId = getTargetProjectId(doc, defaultProjectId);
        if (!docsByProject.has(targetProjectId)) {
            docsByProject.set(targetProjectId, []);
        }
        docsByProject.get(targetProjectId)!.push(doc);
    }
    
    let migratedCount = 0;
    
    for (const [projectId, docs] of docsByProject) {
        console.log(`    → Migrating ${docs.length} docs to project ${projectId}`);
        
        const batch = db.batch();
        
        for (const doc of docs) {
            const targetPath = `users/${userId}/projects/${projectId}/${collectionName}/${doc.id}`;
            const targetRef = db.doc(targetPath);
            
            const docData = doc.data();
            // Add projectId to the document if not present
            const migratedData = {
                ...docData,
                projectId: projectId,
                migratedAt: admin.firestore.FieldValue.serverTimestamp(),
                migratedFrom: `users/${userId}/${collectionName}/${doc.id}`
            };
            
            if (options.dryRun) {
                console.log(`      🔵 [DRY RUN] Would migrate: ${doc.id} → ${targetPath}`);
            } else {
                batch.set(targetRef, migratedData);
                // Mark original as migrated (don't delete yet for safety)
                batch.update(doc.ref, {
                    _migrated: true,
                    _migratedTo: targetPath,
                    _migratedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            
            migratedCount++;
        }
        
        if (!options.dryRun) {
            await batch.commit();
            console.log(`    ✅ Committed batch for project ${projectId}`);
        }
    }
    
    return migratedCount;
}

async function migrateUserData(userId: string, options: MigrationOptions, stats: MigrationStats): Promise<void> {
    console.log(`\n👤 Processing user: ${userId}`);
    
    // Get or create default project
    let defaultProject = await getDefaultProject(userId);
    
    if (!defaultProject) {
        console.log('  ⚠️  No projects found, creating default project...');
        defaultProject = await createDefaultProject(userId, options.dryRun);
        stats.defaultProjectsCreated++;
    } else {
        console.log(`  📁 Default project: ${defaultProject.name} (${defaultProject.id})`);
    }
    
    // Migrate each collection
    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
        try {
            const count = await migrateCollection(userId, collectionName, defaultProject.id, options, stats);
            
            // Update stats based on collection name
            switch (collectionName) {
                case 'leads':
                    stats.leadsMigrated += count;
                    break;
                case 'leadActivities':
                    stats.leadActivitiesMigrated += count;
                    break;
                case 'leadTasks':
                    stats.leadTasksMigrated += count;
                    break;
                case 'libraryLeads':
                    stats.libraryLeadsMigrated += count;
                    break;
                case 'files':
                    stats.filesMigrated += count;
                    break;
                case 'appointments':
                    stats.appointmentsMigrated += count;
                    break;
                case 'deploymentLogs':
                    stats.deploymentLogsMigrated += count;
                    break;
            }
        } catch (error) {
            const errorMsg = `Error migrating ${collectionName} for user ${userId}: ${error}`;
            console.error(`  ❌ ${errorMsg}`);
            stats.errors.push(errorMsg);
        }
    }
    
    stats.usersProcessed++;
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
    console.log('🚀 Starting Project-Scoped Data Migration\n');
    console.log('=' .repeat(60));
    
    const options = parseArgs();
    
    console.log('📋 Migration Options:');
    console.log(`   Dry Run: ${options.dryRun ? 'YES (no changes will be made)' : 'NO'}`);
    console.log(`   Create Backup: ${options.createBackup ? 'YES' : 'NO'}`);
    console.log(`   Specific User: ${options.userId || 'All users'}`);
    console.log('=' .repeat(60));
    
    const stats: MigrationStats = {
        usersProcessed: 0,
        leadsMigrated: 0,
        leadActivitiesMigrated: 0,
        leadTasksMigrated: 0,
        libraryLeadsMigrated: 0,
        filesMigrated: 0,
        appointmentsMigrated: 0,
        deploymentLogsMigrated: 0,
        defaultProjectsCreated: 0,
        errors: []
    };
    
    try {
        if (options.userId) {
            // Migrate single user
            await migrateUserData(options.userId, options, stats);
        } else {
            // Migrate all users
            const usersSnap = await db.collection('users').get();
            console.log(`\n📊 Found ${usersSnap.size} users to process\n`);
            
            for (const userDoc of usersSnap.docs) {
                try {
                    await migrateUserData(userDoc.id, options, stats);
                } catch (error) {
                    const errorMsg = `Failed to process user ${userDoc.id}: ${error}`;
                    console.error(`❌ ${errorMsg}`);
                    stats.errors.push(errorMsg);
                }
            }
        }
    } catch (error) {
        console.error('❌ Migration failed:', error);
        stats.errors.push(`Migration failed: ${error}`);
    }
    
    // Print summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Users Processed:        ${stats.usersProcessed}`);
    console.log(`Default Projects Created: ${stats.defaultProjectsCreated}`);
    console.log(`Leads Migrated:         ${stats.leadsMigrated}`);
    console.log(`Lead Activities Migrated: ${stats.leadActivitiesMigrated}`);
    console.log(`Lead Tasks Migrated:    ${stats.leadTasksMigrated}`);
    console.log(`Library Leads Migrated: ${stats.libraryLeadsMigrated}`);
    console.log(`Files Migrated:         ${stats.filesMigrated}`);
    console.log(`Appointments Migrated:  ${stats.appointmentsMigrated}`);
    console.log(`Deployment Logs Migrated: ${stats.deploymentLogsMigrated}`);
    console.log(`Errors:                 ${stats.errors.length}`);
    
    if (stats.errors.length > 0) {
        console.log('\n⚠️  ERRORS:');
        stats.errors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
    }
    
    if (options.dryRun) {
        console.log('\n🔵 This was a DRY RUN - no changes were made.');
        console.log('   Remove --dry-run flag to execute the migration.');
    } else {
        console.log('\n✅ Migration completed!');
        console.log('   Original documents have been marked with _migrated=true');
        console.log('   You can delete them later after verifying the migration.');
    }
    
    // Save report
    const reportPath = join(__dirname, '..', 'backups', 'project-migration', `migration-report-${new Date().toISOString()}.json`);
    const reportDir = join(__dirname, '..', 'backups', 'project-migration');
    if (!existsSync(reportDir)) {
        mkdirSync(reportDir, { recursive: true });
    }
    writeFileSync(reportPath, JSON.stringify({ options, stats, timestamp: new Date().toISOString() }, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);
}

main().catch(console.error);

