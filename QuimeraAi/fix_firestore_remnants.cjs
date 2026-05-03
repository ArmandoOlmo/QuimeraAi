const fs = require('fs');
const path = '/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi/hooks/useEmailSettings.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/await deleteDoc\(campaignRef\);/g, "await supabase.from('email_campaigns').delete().eq('id', campaignId);");

content = content.replace(
    /await supabase\.from\('email_campaigns'\)\.update\(\{\s*\.\.\.sanitizedUpdates,\s*updated_at: new Date\(\)\.toISOString\(\),\s*\}\);/g,
    "await supabase.from('email_campaigns').update({\n...sanitizedUpdates,\nupdated_at: new Date().toISOString(),\n}).eq('id', campaignId);"
);

content = content.replace(
    /await supabase\.from\('email_audiences'\)\.update\(\{\s*\.\.\.updates,\s*updated_at: new Date\(\)\.toISOString\(\),\s*\}\);/g,
    "await supabase.from('email_audiences').update({\n...updates,\nupdated_at: new Date().toISOString(),\n}).eq('id', audienceId);"
);

fs.writeFileSync(path, content);
console.log('Fixed remnants');
