const fs = require('fs');
const path = '/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi/components/dashboard/email/views/CampaignsView.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /import \{ getFunctions, httpsCallable \} from 'firebase\/functions';/,
    "import { supabase } from '../../../../supabase';"
);

content = content.replace(
    /const functions = getFunctions\(\);\s*const sendCampaignFn = httpsCallable\(functions, 'sendCampaign'\);\s*const result = await sendCampaignFn\(\{([\s\S]*?)\}\);\s*const resData = result\.data as any;/g,
    `const { data: resData, error: funcError } = await supabase.functions.invoke('send-campaign', {
                body: {$1}
            });
            if (funcError) throw funcError;`
);

content = content.replace(
    /const functions = getFunctions\(\);\s*const sendTestFn = httpsCallable\(functions, 'sendTestEmail'\);\s*const result = await sendTestFn\(\{([\s\S]*?)\}\);\s*const resData = result\.data as any;/g,
    `const { data: resData, error: funcError } = await supabase.functions.invoke('send-test-email', {
                body: {$1}
            });
            if (funcError) throw funcError;`
);

fs.writeFileSync(path, content);
console.log('Done');
