const fs = require('fs');
const path = '/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi/components/dashboard/email/email-hub/hooks/useUserAIEmailStudio.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /import \{\s*db, collection, addDoc, doc, updateDoc,\s*\} from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/firebase';\nimport \{ serverTimestamp \} from 'firebase\/firestore';/g,
    "import { supabase } from '../../../../../supabase';"
);

content = content.replace(
    /const campaignsPath = `users\/\$\{userId\}\/projects\/\$\{projectId\}\/emailCampaigns`;/g,
    "// campaignsPath is now handled via Supabase table 'email_campaigns'"
);

content = content.replace(
    /const docRef = await addDoc\(collection\(db, campaignsPath\), campaignData\);/g,
    `const { data: newDoc, error: insertError } = await supabase.from('email_campaigns').insert(campaignData).select('id').single();\n            if (insertError) throw insertError;\n            const docRef = { id: newDoc.id };`
);

content = content.replace(/createdAt: serverTimestamp\(\),/g, "created_at: new Date().toISOString(),");
content = content.replace(/updatedAt: serverTimestamp\(\),/g, "updated_at: new Date().toISOString(),");

content = content.replace(
    /await updateDoc\(doc\(db, campaignsPath, campaignId\), \{([^}]+)\}\);/g,
    `await supabase.from('email_campaigns').update({$1}).eq('id', campaignId);`
);

fs.writeFileSync(path, content);
console.log('Done');
