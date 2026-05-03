const fs = require('fs');
const path = '/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi/components/dashboard/email/email-hub/hooks/useUserAudienceActions.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /import \{\s*db, doc, addDoc, updateDoc, deleteDoc, collection,\s*\} from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/firebase';\nimport \{ serverTimestamp \} from 'firebase\/firestore';/g,
    "import { supabase } from '../../../../../supabase';"
);

content = content.replace(
    /const audiencesPath = `users\/\$\{userId\}\/projects\/\$\{projectId\}\/emailAudiences`;/g,
    "// audiencesPath is now handled via Supabase table 'email_audiences'"
);

content = content.replace(
    /const docRef = await addDoc\(collection\(db, audiencesPath\), audienceData\);/g,
    `const { data: newDoc, error: insertError } = await supabase.from('email_audiences').insert(audienceData).select('id').single();\n            if (insertError) throw insertError;\n            const docRef = { id: newDoc.id };`
);

content = content.replace(/createdAt: serverTimestamp\(\),/g, "created_at: new Date().toISOString(),");
content = content.replace(/updatedAt: serverTimestamp\(\),/g, "updated_at: new Date().toISOString(),");

content = content.replace(
    /await updateDoc\(doc\(db, audiencesPath, editingAudienceId\), \{/g,
    `await supabase.from('email_audiences').update({`
);

content = content.replace(
    /\}\);/g,
    (match, offset, str) => {
        // Need to find if it's the updateDoc closing bracket
        const substring = str.substring(offset - 100, offset);
        if (substring.includes("updated_at: new Date().toISOString(),")) {
            return `}).eq('id', editingAudienceId);`;
        }
        return match;
    }
);

content = content.replace(
    /await deleteDoc\(doc\(db, audiencesPath, audienceId\)\);/g,
    `await supabase.from('email_audiences').delete().eq('id', audienceId);`
);

content = content.replace(
    /const docRef = await addDoc\(collection\(db, audiencesPath\), dupData\);/g,
    `const { data: newDoc, error: insertError } = await supabase.from('email_audiences').insert(dupData).select('id').single();\n            if (insertError) throw insertError;\n            const docRef = { id: newDoc.id };`
);


fs.writeFileSync(path, content);
console.log('Done');
