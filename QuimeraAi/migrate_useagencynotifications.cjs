const fs = require('fs');
const path = '/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi/hooks/useAgencyNotifications.ts';
let content = fs.readFileSync(path, 'utf8');

// Replace imports
content = content.replace(/import\s*\{\s*db\s*\}\s*from\s*'\.\.\/firebase';\n/, "import { supabase } from '../supabase';\n");
content = content.replace(/import\s*\{\s*collection,\s*query,\s*where,\s*orderBy,\s*limit,\s*onSnapshot,\s*doc,\s*updateDoc,\s*addDoc,\s*serverTimestamp,\s*Timestamp,?\s*\}\s*from\s*'firebase\/firestore';\n/, "");

// Replace types
content = content.replace(/import\s*\{\s*Timestamp\s*\}\s*from\s*'firebase\/firestore';\n/, ""); // if missed
content = content.replace(/createdAt: Timestamp;/g, "createdAt: Date | string;");
content = content.replace(/expiresAt\?: Timestamp;/g, "expiresAt?: Date | string;");
content = content.replace(/if \(notif\.expiresAt && notif\.expiresAt\.toDate\(\) < new Date\(\)\) \{/g, "if (notif.expiresAt && new Date(notif.expiresAt) < new Date()) {");

// onSnapshot refactor
content = content.replace(
/const q = query\([\s\S]*?collection\(db,\s*'agencyNotifications'\),[\s\S]*?where\('tenantId',\s*'==',\s*tenantId\),[\s\S]*?orderBy\('createdAt',\s*'desc'\),[\s\S]*?limit\(50\)[\s\S]*?\);[\s\S]*?const unsubscribe = onSnapshot\([\s\S]*?q,[\s\S]*?\(snapshot\) => \{[\s\S]*?const notifs: AgencyNotification\[\] = \[\];[\s\S]*?let unread = 0;[\s\S]*?snapshot\.forEach\(\(doc\) => \{[\s\S]*?const data = doc\.data\(\);[\s\S]*?const notif: AgencyNotification = \{[\s\S]*?id: doc\.id,[\s\S]*?tenantId: data\.tenantId,[\s\S]*?type: data\.type,[\s\S]*?title: data\.title,[\s\S]*?message: data\.message,[\s\S]*?data: data\.data,[\s\S]*?read: data\.read,[\s\S]*?createdAt: data\.createdAt,[\s\S]*?expiresAt: data\.expiresAt,[\s\S]*?link: data\.link,[\s\S]*?clientId: data\.clientId,[\s\S]*?clientName: data\.clientName,[\s\S]*?\};[\s\S]*?\/\/ Filter out expired notifications[\s\S]*?if \(notif\.expiresAt && [^]+?\) \{[\s\S]*?return;[\s\S]*?\}[\s\S]*?notifs\.push\(notif\);[\s\S]*?if \(!notif\.read\) unread\+\+;[\s\S]*?\}\);[\s\S]*?setNotifications\(notifs\);[\s\S]*?setUnreadCount\(unread\);[\s\S]*?setIsLoading\(false\);[\s\S]*?\},[\s\S]*?\(err\) => \{[\s\S]*?console\.error\('Error subscribing to notifications:', err\);[\s\S]*?setError\('Error cargando notificaciones'\);[\s\S]*?setIsLoading\(false\);[\s\S]*?\}[\s\S]*?\);[\s\S]*?return \(\) => unsubscribe\(\);/,
`const fetchNotifications = async () => {
            try {
                const { data, error: err } = await supabase
                    .from('agency_notifications')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (err) throw err;

                if (data) {
                    const notifs: AgencyNotification[] = [];
                    let unread = 0;

                    data.forEach((row: any) => {
                        const notif: AgencyNotification = {
                            id: row.id,
                            tenantId: row.tenant_id,
                            type: row.type,
                            title: row.title,
                            message: row.message,
                            data: row.data,
                            read: row.read,
                            createdAt: row.created_at,
                            expiresAt: row.expires_at,
                            link: row.link,
                            clientId: row.client_id,
                            clientName: row.client_name,
                        };

                        if (notif.expiresAt && new Date(notif.expiresAt) < new Date()) {
                            return;
                        }

                        notifs.push(notif);
                        if (!notif.read) unread++;
                    });

                    setNotifications(notifs);
                    setUnreadCount(unread);
                }
                setIsLoading(false);
            } catch (err) {
                console.error('Error fetching notifications:', err);
                setError('Error cargando notificaciones');
                setIsLoading(false);
            }
        };

        fetchNotifications();

        const channel = supabase.channel(\`agency_notifications_\${tenantId}\`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'agency_notifications', filter: \`tenant_id=eq.\${tenantId}\` }, () => {
                fetchNotifications();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };`
);

// markAsRead
content = content.replace(
/const markAsRead = useCallback\(async \(notificationId: string\) => \{[\s\S]*?try \{[\s\S]*?await updateDoc\(doc\(db,\s*'agencyNotifications',\s*notificationId\),\s*\{[\s\S]*?read: true,[\s\S]*?readAt: serverTimestamp\(\),[\s\S]*?\}\);[\s\S]*?\} catch \(err\) \{[\s\S]*?console\.error\('Error marking notification as read:', err\);[\s\S]*?\}[\s\S]*?\}, \[\]\);/,
`const markAsRead = useCallback(async (notificationId: string) => {
        try {
            await supabase
                .from('agency_notifications')
                .update({ read: true, read_at: new Date().toISOString() })
                .eq('id', notificationId);
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    }, []);`
);

// markAllAsRead
content = content.replace(
/const markAllAsRead = useCallback\(async \(\) => \{[\s\S]*?if \(!tenantId\) return;[\s\S]*?try \{[\s\S]*?const unreadNotifs = notifications\.filter\(\(n\) => !n\.read\);[\s\S]*?await Promise\.all\([\s\S]*?unreadNotifs\.map\(\(n\) =>[\s\S]*?updateDoc\(doc\(db,\s*'agencyNotifications',\s*n\.id\),\s*\{[\s\S]*?read: true,[\s\S]*?readAt: serverTimestamp\(\),[\s\S]*?\}\)[\s\S]*?\)[\s\S]*?\);[\s\S]*?\} catch \(err\) \{[\s\S]*?console\.error\('Error marking all as read:', err\);[\s\S]*?\}[\s\S]*?\}, \[tenantId, notifications\]\);/,
`const markAllAsRead = useCallback(async () => {
        if (!tenantId) return;

        try {
            const unreadIds = notifications.filter((n) => !n.read).map(n => n.id);
            if (unreadIds.length === 0) return;

            await supabase
                .from('agency_notifications')
                .update({ read: true, read_at: new Date().toISOString() })
                .in('id', unreadIds);
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    }, [tenantId, notifications]);`
);

// createAgencyNotification
content = content.replace(
/export async function createAgencyNotification\([\s\S]*?notification: Omit<AgencyNotification, 'id' \| 'createdAt' \| 'read'>[\s\S]*?\): Promise<string \| null> \{[\s\S]*?try \{[\s\S]*?const docRef = await addDoc\(collection\(db,\s*'agencyNotifications'\),\s*\{[\s\S]*?\.\.\.notification,[\s\S]*?read: false,[\s\S]*?createdAt: serverTimestamp\(\),[\s\S]*?\}\);[\s\S]*?return docRef\.id;[\s\S]*?\} catch \(err\) \{[\s\S]*?console\.error\('Error creating notification:', err\);[\s\S]*?return null;[\s\S]*?\}[\s\S]*?\}/,
`export async function createAgencyNotification(
    notification: Omit<AgencyNotification, 'id' | 'createdAt' | 'read'>
): Promise<string | null> {
    try {
        const payload = {
            tenant_id: notification.tenantId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            read: false,
            link: notification.link,
            client_id: notification.clientId,
            client_name: notification.clientName,
            expires_at: notification.expiresAt
        };

        const { data, error } = await supabase
            .from('agency_notifications')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return data.id;
    } catch (err) {
        console.error('Error creating notification:', err);
        return null;
    }
}`
);

fs.writeFileSync(path, content);
console.log('Migrated useAgencyNotifications.ts');
