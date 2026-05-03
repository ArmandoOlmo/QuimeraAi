const fs = require('fs');
const path = '/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi/hooks/useAgencyMetrics.ts';
let content = fs.readFileSync(path, 'utf8');

// Replace imports
content = content.replace(/import\s*\{\s*db\s*\}\s*from\s*'\.\.\/firebase';\n/, "import { supabase } from '../supabase';\n");
content = content.replace(/import\s*\{\s*collection,\s*query,\s*where,\s*onSnapshot,\s*getDocs,\s*Timestamp\s*\}\s*from\s*'firebase\/firestore';\n/, "");

// Fix types mapping (Firestore Timestamp to string)
// trialEndsAt, billing?.currentPeriodEnd, lastActiveAt in calculateRenewals & getClientMetrics
content = content.replace(/new Date\(client\.trialEndsAt\.seconds \* 1000\)/g, "new Date(client.trialEndsAt)");
content = content.replace(/new Date\(client\.billing\.currentPeriodEnd\.seconds \* 1000\)/g, "new Date(client.billing.currentPeriodEnd)");
content = content.replace(/new Date\(client\.lastActiveAt\.seconds \* 1000\)/g, "new Date(client.lastActiveAt)");

// Refactor tenants onSnapshot
content = content.replace(
/const q = query\([\s\S]*?collection\(db,\s*'tenants'\),[\s\S]*?where\('ownerTenantId',\s*'==',\s*agencyTenantId\),[\s\S]*?where\('status',\s*'in',\s*\['active',\s*'trial',\s*'suspended'\]\)[\s\S]*?\);[\s\S]*?const unsubscribe = onSnapshot\([\s\S]*?q,[\s\S]*?\(snapshot\) => \{[\s\S]*?const clients: Tenant\[\] = \[\];[\s\S]*?snapshot\.forEach\(\(doc\) => \{[\s\S]*?const data = doc\.data\(\);[\s\S]*?clients\.push\(\{[\s\S]*?id: doc\.id,[\s\S]*?\.\.\.data,[\s\S]*?name: resolveProjectName\(data\.name\)[\s\S]*?\} as Tenant\);[\s\S]*?\}\);[\s\S]*?setSubClients\(clients\);[\s\S]*?\/\/ Calculate base metrics \(usage and billing from tenant docs\)[\s\S]*?const baseMetrics = calculateMetrics\(clients\);[\s\S]*?const alerts = detectAlerts\(clients\);[\s\S]*?const renewals = calculateRenewals\(clients\);[\s\S]*?setAggregatedMetrics\(prev => \(\{[\s\S]*?\.\.\.prev,[\s\S]*?\.\.\.baseMetrics,[\s\S]*?activeSubClients: clients\.filter\(c => c\.status === 'active'\)\.length,[\s\S]*?\}\)\);[\s\S]*?setResourceAlerts\(alerts\);[\s\S]*?setUpcomingRenewals\(renewals\);[\s\S]*?setLoading\(false\);[\s\S]*?\},[\s\S]*?\(err\) => \{[\s\S]*?console\.error\('Error fetching sub-clients:', err\);[\s\S]*?setError\(err as Error\);[\s\S]*?setLoading\(false\);[\s\S]*?\}[\s\S]*?\);[\s\S]*?return \(\) => unsubscribe\(\);/,
`const fetchClients = async () => {
            try {
                const { data, error: err } = await supabase
                    .from('tenants')
                    .select('*')
                    .eq('owner_tenant_id', agencyTenantId)
                    .in('status', ['active', 'trial', 'suspended']);

                if (err) throw err;

                if (data) {
                    const clients: Tenant[] = data.map((doc: any) => ({
                        ...doc,
                        id: doc.id,
                        name: resolveProjectName(doc.name || ''),
                        ownerTenantId: doc.owner_tenant_id,
                        subscriptionPlan: doc.subscription_plan,
                        trialEndsAt: doc.trial_ends_at,
                        lastActiveAt: doc.last_active_at,
                    } as unknown as Tenant));

                    setSubClients(clients);

                    const baseMetrics = calculateMetrics(clients);
                    const alerts = detectAlerts(clients);
                    const renewals = calculateRenewals(clients);

                    setAggregatedMetrics(prev => ({
                        ...prev,
                        ...baseMetrics,
                        activeSubClients: clients.filter(c => c.status === 'active').length,
                    }));
                    setResourceAlerts(alerts);
                    setUpcomingRenewals(renewals);
                }
                setLoading(false);
            } catch (err) {
                console.error('Error fetching sub-clients:', err);
                setError(err as Error);
                setLoading(false);
            }
        };

        fetchClients();

        const channel = supabase.channel(\`agency_metrics_tenants_\${agencyTenantId}\`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants', filter: \`owner_tenant_id=eq.\${agencyTenantId}\` }, () => {
                fetchClients();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };`
);

// Refactor async metrics (Leads and Orders)
content = content.replace(
/const startTimestamp = Timestamp\.fromDate\(startOfMonth\);[\s\S]*?for \(const chunk of chunks\) \{[\s\S]*?\/\/ Fetch Leads[\s\S]*?const leadsQ = query\([\s\S]*?collection\(db,\s*'leads'\),[\s\S]*?where\('tenantId',\s*'in',\s*chunk\),[\s\S]*?where\('createdAt',\s*'>=',\s*startTimestamp\)[\s\S]*?\);[\s\S]*?const leadsSnap = await getDocs\(leadsQ\);[\s\S]*?totalLeads \+= leadsSnap\.size;[\s\S]*?\/\/ Fetch Revenue \(Orders\)[\s\S]*?const ordersQ = query\([\s\S]*?collection\(db,\s*'orders'\),[\s\S]*?where\('tenantId',\s*'in',\s*chunk\),[\s\S]*?where\('status',\s*'in',\s*\['paid',\s*'completed'\]\),[\s\S]*?where\('createdAt',\s*'>=',\s*startTimestamp\)[\s\S]*?\);[\s\S]*?const ordersSnap = await getDocs\(ordersQ\);[\s\S]*?ordersSnap\.forEach\(doc => \{[\s\S]*?totalRevenue \+= \(doc\.data\(\)\.total \|\| 0\);[\s\S]*?\}\);[\s\S]*?\}/,
`const startDateStr = startOfMonth.toISOString();

                for (const chunk of chunks) {
                    // Fetch Leads
                    const { count: leadsCount } = await supabase
                        .from('leads')
                        .select('id', { count: 'exact', head: true })
                        .in('tenant_id', chunk)
                        .gte('created_at', startDateStr);
                    
                    if (leadsCount) totalLeads += leadsCount;

                    // Fetch Revenue (Orders)
                    const { data: ordersData } = await supabase
                        .from('orders')
                        .select('total')
                        .in('tenant_id', chunk)
                        .in('status', ['paid', 'completed'])
                        .gte('created_at', startDateStr);

                    if (ordersData) {
                        ordersData.forEach(doc => {
                            totalRevenue += (doc.total || 0);
                        });
                    }
                }`
);

// Refactor recent activity
content = content.replace(
/const q = query\([\s\S]*?collection\(db,\s*'agencyActivity'\),[\s\S]*?where\('agencyTenantId',\s*'==',\s*agencyTenantId\)[\s\S]*?\);[\s\S]*?const snapshot = await getDocs\(q\);[\s\S]*?const activities: ActivityEvent\[\] = \[\];[\s\S]*?snapshot\.forEach\(\(doc\) => \{[\s\S]*?const data = doc\.data\(\);[\s\S]*?activities\.push\(\{[\s\S]*?id: doc\.id,[\s\S]*?type: data\.type,[\s\S]*?clientId: data\.clientTenantId,[\s\S]*?clientName: resolveProjectName\(data\.clientName\),[\s\S]*?description: data\.description \|\| getActivityDescription\(data\),[\s\S]*?timestamp: data\.timestamp\?\.toDate\(\) \|\| new Date\(\),[\s\S]*?userId: data\.createdBy,[\s\S]*?userName: data\.createdByName,[\s\S]*?metadata: data\.metadata,[\s\S]*?\}\);[\s\S]*?\}\);/,
`const { data: snapshot, error: err } = await supabase
                    .from('agency_activity')
                    .select('*')
                    .eq('agency_tenant_id', agencyTenantId)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (err) throw err;

                const activities: ActivityEvent[] = [];

                if (snapshot) {
                    snapshot.forEach((data: any) => {
                        activities.push({
                            id: data.id,
                            type: data.type,
                            clientId: data.client_tenant_id,
                            clientName: resolveProjectName(data.client_name || ''),
                            description: data.description || getActivityDescription({ type: data.type, clientName: data.client_name }),
                            timestamp: new Date(data.created_at || new Date()),
                            userId: data.created_by,
                            userName: data.created_by_name,
                            metadata: data.metadata,
                        });
                    });
                }`
);

fs.writeFileSync(path, content);
console.log('Migrated useAgencyMetrics.ts');
