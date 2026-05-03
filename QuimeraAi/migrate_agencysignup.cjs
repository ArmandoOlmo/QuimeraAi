const fs = require('fs');
const path = '/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi/components/AgencySignup.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/import \{ getFunctions, httpsCallable \} from 'firebase\/functions';\n/g, "");
content = content.replace(/import \{ useAuth \} from '\.\.\/contexts\/core\/AuthContext';/, "import { useAuth } from '../contexts/core/AuthContext';\nimport { supabase } from '../supabase';");

content = content.replace(/const functions = getFunctions\(\);\n\s*const createCheckoutSession = httpsCallable<\n\s*\{\s*planId:\s*string;\s*billingCycle:\s*BillingCycle;\s*tenantId:\s*string;\s*successUrl:\s*string;\s*cancelUrl:\s*string\s*\},\n\s*\{\s*success:\s*boolean;\s*url:\s*string\s*\}\n\s*>\(functions,\s*'createCheckoutSession'\);/g, "");

content = content.replace(
    /const result = await createCheckoutSession\(\{\n\s*planId,\n\s*billingCycle,\n\s*tenantId: `tenant_\$\{user\.uid\}`,\n\s*successUrl: `\$\{window\.location\.origin\}\/dashboard\?subscription=success&plan=\$\{planId\}`,\n\s*cancelUrl: `\$\{window\.location\.origin\}\/agency-signup\?cancelled=true`,\n\s*\}\);/g,
    `const result = await supabase.functions.invoke('create-checkout-session', {
                body: {
                    planId,
                    billingCycle,
                    tenantId: \`tenant_\${user.uid}\`,
                    successUrl: \`\${window.location.origin}/dashboard?subscription=success&plan=\${planId}\`,
                    cancelUrl: \`\${window.location.origin}/agency-signup?cancelled=true\`
                }
            });`
);

content = content.replace(/if \(result\.data\.success && result\.data\.url\) \{/g, "if (result.data?.success && result.data?.url) {");

fs.writeFileSync(path, content);
console.log('Migrated AgencySignup.tsx');
