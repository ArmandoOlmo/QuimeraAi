const fs = require('fs');
const path = '/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi/hooks/useEmailSettings.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/};\s*};\s*}, \[userId, projectId\]\);/g, "};\n    }, [userId, projectId]);");
content = content.replace(/};\s*};\s*}, \[userId, projectId, options\?\.limit\]\);/g, "};\n    }, [userId, projectId, options?.limit]);");

fs.writeFileSync(path, content);
console.log('Fixed hook syntax');
