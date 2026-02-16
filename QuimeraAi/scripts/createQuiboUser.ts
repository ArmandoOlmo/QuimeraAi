/**
 * Script to create Quibo user with super_admin role
 * 
 * Usage:
 *   QUIBO_PASSWORD="your_secure_password" npx ts-node scripts/createQuiboUser.ts
 * 
 * This script creates a user with:
 *   - Email: quibobot@gmail.com
 *   - Password: (read from QUIBO_PASSWORD env var)
 *   - Role: super_admin
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
let serviceAccount: admin.ServiceAccount | undefined;
try {
    const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
    const fileContent = readFileSync(serviceAccountPath, 'utf8');
    serviceAccount = JSON.parse(fileContent);
} catch (e) {
    console.error('Error loading service account:', e);
    process.exit(1);
}

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.projectId || (serviceAccount as any).project_id,
    });
}

const auth = admin.auth();
const db = admin.firestore();

// User configuration
// Read password from environment variable — never hardcode secrets
const QUIBO_PASSWORD = process.env.QUIBO_PASSWORD;
if (!QUIBO_PASSWORD) {
    console.error('❌ ERROR: QUIBO_PASSWORD environment variable is required.');
    console.error('Usage: QUIBO_PASSWORD="your_password" npx ts-node scripts/createQuiboUser.ts');
    process.exit(1);
}

const QUIBO_USER = {
    email: 'quibobot@gmail.com',
    password: QUIBO_PASSWORD,
    displayName: 'Quibo Bot',
    role: 'super-admin' as const,
};

async function createQuiboUser() {
    console.log('\n========================================');
    console.log('Creating Quibo Super Admin User');
    console.log('========================================\n');

    try {
        // Step 1: Check if user already exists
        console.log(`Checking if user ${QUIBO_USER.email} already exists...`);
        let userRecord: admin.auth.UserRecord;

        try {
            userRecord = await auth.getUserByEmail(QUIBO_USER.email);
            console.log(`✓ User already exists in Firebase Auth with UID: ${userRecord.uid}`);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // User doesn't exist, create it
                console.log('User not found. Creating new user...');
                userRecord = await auth.createUser({
                    email: QUIBO_USER.email,
                    password: QUIBO_USER.password,
                    displayName: QUIBO_USER.displayName,
                    emailVerified: true, // Auto-verify email for admin users
                });
                console.log(`✓ User created successfully in Firebase Auth with UID: ${userRecord.uid}`);
            } else {
                throw error;
            }
        }

        // Step 2: Create/Update Firestore user document
        console.log('\nCreating/Updating Firestore user document...');
        const userDocRef = db.collection('users').doc(userRecord.uid);
        const userDoc = await userDocRef.get();

        const userData = {
            email: QUIBO_USER.email,
            name: QUIBO_USER.displayName,
            role: QUIBO_USER.role,
            photoURL: userRecord.photoURL || '',
            createdAt: userDoc.exists ? userDoc.data()?.createdAt : admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            emailVerified: true,
            // Additional metadata
            isQuiboBot: true,
            description: 'Quimera.ai auditing and testing assistant',
        };

        if (userDoc.exists) {
            await userDocRef.update({
                ...userData,
                createdAt: userDoc.data()?.createdAt, // Preserve original creation date
            });
            console.log('✓ User document updated in Firestore');
        } else {
            await userDocRef.set(userData);
            console.log('✓ User document created in Firestore');
        }

        // Step 3: Verify role assignment
        console.log('\nVerifying role assignment...');
        const finalDoc = await userDocRef.get();
        const finalData = finalDoc.data();

        if (finalData?.role === QUIBO_USER.role) {
            console.log(`✓ Role verified: ${finalData.role}`);
        } else {
            console.warn(`⚠ Role mismatch! Expected: ${QUIBO_USER.role}, Got: ${finalData?.role}`);
        }

        // Print summary
        console.log('\n========================================');
        console.log('✓ Quibo User Created Successfully!');
        console.log('========================================');
        console.log(`Email: ${QUIBO_USER.email}`);
        console.log(`Password: ${QUIBO_USER.password}`);
        console.log(`Role: ${QUIBO_USER.role}`);
        console.log(`UID: ${userRecord.uid}`);
        console.log('========================================\n');

        console.log('You can now:');
        console.log('1. Login to the app with these credentials');
        console.log('2. Access all Super Admin features');
        console.log('3. Delete this user at any time from the Users Management panel');
        console.log('\n');

    } catch (error: any) {
        console.error('\n❌ Error creating Quibo user:', error);
        console.error('Error details:', error.message);
        process.exit(1);
    }
}

// Run the script
createQuiboUser()
    .then(() => {
        console.log('Script completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
