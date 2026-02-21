const admin = require('firebase-admin');

// Ensure you have an environment variable for GCP project or use default application credentials
// If running locally, you might need to point to a service account key or rely on existing auth
admin.initializeApp({
  projectId: "quimera-ai-bc370",
});

const db = admin.firestore();

async function addTestTokens() {
  try {
    // 1. Get the current user's tenant ID from 'users' or assume the owner email's tenant
    const usersSnapshot = await db.collection('users')
      .where('email', 'in', ['armandoolmomiranda@gmail.com', 'ArmandoOlmoMiranda@gmail.com'])
      .limit(1)
      .get();
      
    if (usersSnapshot.empty) {
      console.log('User not found.');
      return;
    }
    
    const userId = usersSnapshot.docs[0].id;
    console.log(`Found user: ${userId}`);
    
    // 2. Find their primary tenant via tenantMembers
    const membersSnapshot = await db.collection('tenantMembers')
      .where('userId', '==', userId)
      .where('role', '==', 'agency_owner')
      .limit(1)
      .get();
      
    let tenantId;
    if (!membersSnapshot.empty) {
        tenantId = membersSnapshot.docs[0].data().tenantId || membersSnapshot.docs[0].id.split('_')[0];
    } else {
        console.log("No tenant found, creating/using a fallback one just for testing UI");
        tenantId = "test-tenant-123";
    }
    console.log(`Using tenant: ${tenantId}`);

    // 3. Get a couple of real projects to attach tokens to
    const projectsSnapshot = await db.collection('users').doc(userId).collection('projects').limit(2).get();
    
    if (projectsSnapshot.empty) {
        console.log("No projects found for user. Please create a project first.");
        return;
    }
    
    const p1 = projectsSnapshot.docs[0].id;
    const p2 = projectsSnapshot.docs.length > 1 ? projectsSnapshot.docs[1].id : null;
    
    const usageByProject = {
        [p1]: {
            tokensUsed: 45000,
            creditsUsed: 15,
            lastUsed: admin.firestore.FieldValue.serverTimestamp()
        }
    };
    
    if (p2) {
        usageByProject[p2] = {
            tokensUsed: 12500,
            creditsUsed: 5,
            lastUsed: admin.firestore.FieldValue.serverTimestamp()
        };
    }
    
    // 4. Update the aiCreditsUsage document directly
    const usageRef = db.collection('aiCreditsUsage').doc(tenantId);
    
    await usageRef.set({
        usageByProject: usageByProject,
        // Ensure some global usage so the hook works
        creditsUsed: 20, 
        creditsIncluded: 100000 
    }, { merge: true });
    
    console.log('Successfully injected test token usage data!');
    console.log(`Project 1 (${p1}): 45,000 tokens`);
    if (p2) console.log(`Project 2 (${p2}): 12,500 tokens`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error adding test tokens:', err);
    process.exit(1);
  }
}

addTestTokens();
