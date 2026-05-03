const fs = require('fs');
const path = 'hooks/useAgencyMetrics.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/new Date\(client\.trialEndsAt\)/g, "new Date(client.trialEndsAt as any)");
content = content.replace(/new Date\(client\.billing\.currentPeriodEnd\)/g, "new Date(client.billing.currentPeriodEnd as any)");
content = content.replace(/new Date\(client\.lastActiveAt\)/g, "new Date(client.lastActiveAt as any)");

fs.writeFileSync(path, content);
