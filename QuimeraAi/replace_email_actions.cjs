const fs = require('fs');
const filePath = '/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi/components/dashboard/email/email-hub/hooks/useUserEmailActions.ts';

let content = fs.readFileSync(filePath, 'utf8');

// Replace imports
content = content.replace(
    /import \{\s*db, collection, doc, addDoc, updateDoc, deleteDoc,\s*\} from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/firebase';\nimport \{ serverTimestamp \} from 'firebase\/firestore';\nimport \{ getFunctions, httpsCallable \} from 'firebase\/functions';/g,
    "import { supabase } from '../../../../../supabase';"
);

content = content.replace(
    /const campaignsPath = `users\/\$\{userId\}\/projects\/\$\{projectId\}\/emailCampaigns`;\s*const automationsPath = `users\/\$\{userId\}\/projects\/\$\{projectId\}\/emailAutomations`;/g,
    "// Supabase paths are handled via table names and RLS"
);

// handleSaveFromEditor
content = content.replace(
    /await updateDoc\(doc\(db, campaignsPath, editingCampaignId\), \{/g,
    `await supabase.from('email_campaigns').update({`
);

content = content.replace(/updatedAt: serverTimestamp\(\),/g, "updated_at: new Date().toISOString(),");
content = content.replace(/createdAt: serverTimestamp\(\),/g, "created_at: new Date().toISOString(),");

content = content.replace(
    /const docRef = await addDoc\(collection\(db, campaignsPath\), newCampaign\);/g,
    `const { data: newDoc, error: insertError } = await supabase.from('email_campaigns').insert(newCampaign).select('id').single();\n                if (insertError) throw insertError;\n                const docRef = { id: newDoc.id };`
);

content = content.replace(
    /await updateDoc\(doc\(db, campaignsPath, campaignId\), \{/g,
    `await supabase.from('email_campaigns').update({`
);

content = content.replace(
    /await updateDoc\(doc\(db, campaignsPath, campaignId\), updates\);/g,
    `await supabase.from('email_campaigns').update(updates).eq('id', campaignId);`
);

content = content.replace(
    /await deleteDoc\(doc\(db, campaignsPath, campaign\.id\)\);/g,
    `await supabase.from('email_campaigns').delete().eq('id', campaign.id);`
);

content = content.replace(
    /const docRef = await addDoc\(collection\(db, campaignsPath\), dupData\);/g,
    `const { data: newDoc, error: insertError } = await supabase.from('email_campaigns').insert(dupData).select('id').single();\n            if (insertError) throw insertError;\n            const docRef = { id: newDoc.id };`
);

content = content.replace(
    /await addDoc\(collection\(db, automationsPath\), automationData\);/g,
    `await supabase.from('email_automations').insert(automationData);`
);

content = content.replace(
    /await updateDoc\(doc\(db, automationsPath, editingAutomationId\), \{/g,
    `await supabase.from('email_automations').update({`
);

content = content.replace(
    /await addDoc\(collection\(db, automationsPath\), dupData\);/g,
    `await supabase.from('email_automations').insert(dupData);`
);

content = content.replace(
    /await updateDoc\(doc\(db, automationsPath, automation\.id\), \{/g,
    `await supabase.from('email_automations').update({`
);

content = content.replace(
    /await deleteDoc\(doc\(db, automationsPath, automationId\)\);/g,
    `await supabase.from('email_automations').delete().eq('id', automationId);`
);

content = content.replace(
    /const docRef = await addDoc\(collection\(db, campaignsPath\), campaignData\);/g,
    `const { data: newDoc, error: insertError } = await supabase.from('email_campaigns').insert(campaignData).select('id').single();\n        if (insertError) throw insertError;\n        const docRef = { id: newDoc.id };`
);

content = content.replace(
    /const automationDocRef = doc\(db, automationsPath, automationId\);\s*const automation = data\.automations\.find\(a => a\.id === automationId\);\s*if \(automation\?\.steps\) \{\s*const updatedSteps = automation\.steps\.map\(s => \{([^}]+)\}\);\s*await updateDoc\(automationDocRef, \{([^}]+)\}\);\s*\}/g,
    `const automation = data.automations.find(a => a.id === automationId);
                if (automation?.steps) {
                    const updatedSteps = automation.steps.map(s => {$1});
                    await supabase.from('email_automations').update({$2}).eq('id', automationId);
                }`
);

// httpsCallable
content = content.replace(
    /const functions = getFunctions\(\);\s*const sendTestFn = httpsCallable\(functions, 'sendTestEmail'\);\s*/g,
    `// const functions = getFunctions();\n            // const sendTestFn = httpsCallable(functions, 'sendTestEmail');\n`
);

content = content.replace(
    /const result = await sendTestFn\(payload\);\s*const resData = result\.data as any;/g,
    `const { data: resData, error: funcError } = await supabase.functions.invoke('send-test-email', { body: payload });\n            if (funcError) throw funcError;`
);

content = content.replace(
    /const functions = getFunctions\(\);\s*const sendCampaignFn = httpsCallable\(functions, 'sendCampaign'\);\s*/g,
    ``
);

content = content.replace(
    /const result = await sendCampaignFn\(\{([\s\S]*?)\}\);\s*const resData = result\.data as any;/g,
    `const { data: resData, error: funcError } = await supabase.functions.invoke('send-campaign', {
                body: {$1}
            });
            if (funcError) throw funcError;`
);

content = content.replace(
    /\}\)\.eq\('id', editingCampaignId\);/g,
    `}).eq('id', editingCampaignId);`
);

fs.writeFileSync(filePath, content);
console.log('Done');
