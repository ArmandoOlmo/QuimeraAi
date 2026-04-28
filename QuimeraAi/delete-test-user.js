const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });
admin.auth().getUserByEmail('test@quimera.ai').then(user => admin.auth().deleteUser(user.uid)).then(() => console.log('Deleted')).catch(e => console.error(e));
