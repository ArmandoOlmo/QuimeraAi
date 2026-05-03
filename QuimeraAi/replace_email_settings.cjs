const fs = require('fs');
const path = '/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi/hooks/useEmailSettings.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /import \{\s*doc,\s*getDoc,\s*setDoc,\s*updateDoc,\s*onSnapshot,\s*serverTimestamp,\s*collection,\s*query,\s*orderBy,\s*addDoc,\s*deleteDoc,\s*\} from 'firebase\/firestore';\nimport \{ db \} from '\.\.\/firebase';/g,
    "import { supabase } from '../supabase';"
);

// useEmailSettings hook
content = content.replace(
    /const settingsRef = doc\(db, settingsPath\);[\s\S]*?let isMounted = true;/g,
    `let isMounted = true;`
);

// useEmailSettings real-time fetch
content = content.replace(
    /unsubscribe = onSnapshot\([\s\S]*?if \(unsubscribe\) \{[\s\S]*?unsubscribe\(\);[\s\S]*?\}/g,
    (match) => {
        return `
        const fetchSettings = async () => {
            if (!isMounted) return;
            const { data, error } = await supabase
                .from('email_settings')
                .select('*')
                .eq('store_id', projectId)
                .single();
                
            if (!error && data) {
                setSettings({
                    provider: data.provider,
                    apiKeyConfigured: data.api_key_configured,
                    fromEmail: data.from_email,
                    fromName: data.from_name,
                    replyTo: data.reply_to,
                    logoUrl: data.logo_url,
                    primaryColor: data.primary_color,
                    footerText: data.footer_text,
                    socialLinks: data.social_links,
                    transactional: data.transactional,
                    marketing: data.marketing,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at,
                } as any);
            } else {
                setSettings(defaultEmailSettings);
            }
            setIsLoading(false);
            setError(null);
        };
        fetchSettings();
        
        let channel;
        if (realtime) {
            channel = supabase.channel(\`email_settings_\${projectId}\`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'email_settings', filter: \`store_id=eq.\${projectId}\` }, fetchSettings)
                .subscribe();
        }

        return () => {
            isMounted = false;
            clearTimeout(safetyTimeout);
            if (channel) supabase.removeChannel(channel);
        };`;
    }
);

// useEmailSettings updateSettings
content = content.replace(
    /const settingsPath = `users\/\$\{userId\}\/projects\/\$\{projectId\}\/settings\/email`;\s*const settingsRef = doc\(db, settingsPath\);\s*const settingsDoc = await getDoc\(settingsRef\);\s*if \(settingsDoc\.exists\(\)\) \{\s*await updateDoc\(settingsRef, \{\s*\.\.\.updates,\s*updatedAt: serverTimestamp\(\),\s*\}\);\s*\} else \{\s*await setDoc\(settingsRef, \{\s*\.\.\.defaultEmailSettings,\s*\.\.\.updates,\s*createdAt: serverTimestamp\(\),\s*updatedAt: serverTimestamp\(\),\s*\}\);\s*\}/g,
    `
                // Convert updates to snake_case
                const snakeUpdates: any = {};
                if (updates.provider !== undefined) snakeUpdates.provider = updates.provider;
                if (updates.apiKeyConfigured !== undefined) snakeUpdates.api_key_configured = updates.apiKeyConfigured;
                if (updates.fromEmail !== undefined) snakeUpdates.from_email = updates.fromEmail;
                if (updates.fromName !== undefined) snakeUpdates.from_name = updates.fromName;
                if (updates.replyTo !== undefined) snakeUpdates.reply_to = updates.replyTo;
                if (updates.logoUrl !== undefined) snakeUpdates.logo_url = updates.logoUrl;
                if (updates.primaryColor !== undefined) snakeUpdates.primary_color = updates.primaryColor;
                if (updates.footerText !== undefined) snakeUpdates.footer_text = updates.footerText;
                if (updates.socialLinks !== undefined) snakeUpdates.social_links = updates.socialLinks;
                if (updates.transactional !== undefined) snakeUpdates.transactional = updates.transactional;
                if (updates.marketing !== undefined) snakeUpdates.marketing = updates.marketing;

                const { data: existing } = await supabase.from('email_settings').select('id').eq('store_id', projectId).single();
                if (existing) {
                    await supabase.from('email_settings').update({ ...snakeUpdates, updated_at: new Date().toISOString() }).eq('store_id', projectId);
                } else {
                    const defaultSnake = {
                        provider: defaultEmailSettings.provider,
                        api_key_configured: defaultEmailSettings.apiKeyConfigured,
                        from_email: defaultEmailSettings.fromEmail,
                        from_name: defaultEmailSettings.fromName,
                        primary_color: defaultEmailSettings.primaryColor,
                        transactional: defaultEmailSettings.transactional,
                        marketing: defaultEmailSettings.marketing,
                    };
                    await supabase.from('email_settings').insert({
                        store_id: projectId,
                        ...defaultSnake,
                        ...snakeUpdates,
                    });
                }
    `
);

// I'll rewrite useEmailCampaigns
content = content.replace(
    /const setupListener = async \(\) => \{[\s\S]*?setupListener\(\);[\s\S]*?if \(unsubscribe\) \{[\s\S]*?unsubscribe\(\);[\s\S]*?\}/g,
    (match) => {
        if (match.includes("campaignsPath")) {
            return `
        const fetchCampaigns = async () => {
            const { data, error } = await supabase
                .from('email_campaigns')
                .select('*')
                .eq('store_id', projectId)
                .order('created_at', { ascending: false });
                
            if (!error && data) {
                setCampaigns(data.map(d => ({
                    id: d.id,
                    name: d.name,
                    subject: d.subject,
                    previewText: d.preview_text,
                    type: d.type,
                    htmlContent: d.html_content,
                    emailDocument: d.email_document,
                    audienceType: d.audience_type,
                    audienceSegmentId: d.audience_segment_id,
                    customRecipientEmails: d.custom_recipient_emails,
                    status: d.status,
                    stats: d.stats,
                    tags: d.tags,
                    createdAt: d.created_at,
                    updatedAt: d.updated_at,
                })));
            }
            setIsLoading(false);
        };
        fetchCampaigns();

        const channel = supabase.channel(\`email_campaigns_\${projectId}_h\`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'email_campaigns', filter: \`store_id=eq.\${projectId}\` }, fetchCampaigns)
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };`;
        }
        if (match.includes("logsPath")) {
            return `
        const fetchLogs = async () => {
            const { data, error } = await supabase
                .from('email_logs')
                .select('*')
                .eq('store_id', projectId)
                .order('sent_at', { ascending: false });
                
            if (!error && data) {
                const logsData = data.map(d => ({
                    id: d.id,
                    status: d.status,
                    opened: d.open_count > 0 || !!d.opened_at,
                    clicked: d.click_count > 0 || !!d.clicked_links,
                    ...d
                }));
                setLogs(logsData);
                const calculatedStats = logsData.reduce(
                    (acc, log) => ({
                        totalSent: acc.totalSent + 1,
                        delivered: acc.delivered + (log.status === 'delivered' ? 1 : 0),
                        opened: acc.opened + (log.opened ? 1 : 0),
                        clicked: acc.clicked + (log.clicked ? 1 : 0),
                        bounced: acc.bounced + (log.status === 'bounced' ? 1 : 0),
                    }),
                    { totalSent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 }
                );
                setStats(calculatedStats);
            }
            setIsLoading(false);
            clearTimeout(safetyTimeout);
        };
        fetchLogs();

        const channel = supabase.channel(\`email_logs_\${projectId}_h\`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'email_logs', filter: \`store_id=eq.\${projectId}\` }, fetchLogs)
            .subscribe();

        return () => {
            isMounted = false;
            clearTimeout(safetyTimeout);
            supabase.removeChannel(channel);
        };`;
        }
        if (match.includes("audiencesPath")) {
            return `
        const fetchAudiences = async () => {
            const { data, error } = await supabase
                .from('email_audiences')
                .select('*')
                .eq('store_id', projectId)
                .order('created_at', { ascending: false });
                
            if (!error && data) {
                setAudiences(data.map(d => ({
                    id: d.id,
                    name: d.name,
                    description: d.description,
                    filters: d.filters,
                    acceptsMarketing: d.accepts_marketing,
                    hasOrdered: d.has_ordered,
                    minOrders: d.min_orders,
                    maxOrders: d.max_orders,
                    minTotalSpent: d.min_total_spent,
                    maxTotalSpent: d.max_total_spent,
                    tags: d.tags,
                    excludeTags: d.exclude_tags,
                    lastOrderDaysAgo: d.last_order_days_ago,
                    source: d.source,
                    staticMembers: d.static_members,
                    staticMemberCount: d.static_member_count,
                    estimatedCount: d.estimated_count,
                    lastCountUpdate: d.last_count_update,
                    isDefault: d.is_default,
                    createdAt: d.created_at,
                    updatedAt: d.updated_at,
                })));
            }
            setIsLoading(false);
            setError(null);
            clearTimeout(safetyTimeout);
        };
        fetchAudiences();

        const channel = supabase.channel(\`email_audiences_\${projectId}_h\`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'email_audiences', filter: \`store_id=eq.\${projectId}\` }, fetchAudiences)
            .subscribe();

        return () => {
            isMounted = false;
            clearTimeout(safetyTimeout);
            supabase.removeChannel(channel);
        };`;
        }
        return match;
    }
);

content = content.replace(
    /const campaignsPath = `users\/\$\{userId\}\/projects\/\$\{projectId\}\/emailCampaigns`;\s*const campaignsRef = collection\(db, campaignsPath\);/g,
    ""
);

content = content.replace(
    /const docRef = await addDoc\(campaignsRef, finalCampaign\);/g,
    `const { data: newDoc, error: insertError } = await supabase.from('email_campaigns').insert({...finalCampaign, store_id: projectId}).select('id').single();\n            if (insertError) throw insertError;\n            const docRef = { id: newDoc.id };`
);

content = content.replace(/createdAt: serverTimestamp\(\),/g, "created_at: new Date().toISOString(),");
content = content.replace(/updatedAt: serverTimestamp\(\),/g, "updated_at: new Date().toISOString(),");

content = content.replace(
    /const campaignsPath = `users\/\$\{userId\}\/projects\/\$\{projectId\}\/emailCampaigns`;\s*const campaignRef = doc\(db, campaignsPath, campaignId\);/g,
    ""
);

content = content.replace(
    /await updateDoc\(campaignRef, \{/g,
    `await supabase.from('email_campaigns').update({`
);

content = content.replace(
    /const campaignsPath = `users\/\$\{userId\}\/projects\/\$\{projectId\}\/emailCampaigns`;\s*const campaignRef = doc\(db, campaignsPath, campaignId\);\s*await deleteDoc\(campaignRef\);/g,
    `await supabase.from('email_campaigns').delete().eq('id', campaignId);`
);

content = content.replace(
    /const audiencesPath = `users\/\$\{userId\}\/projects\/\$\{projectId\}\/emailAudiences`;\s*const audiencesRef = collection\(db, audiencesPath\);/g,
    ""
);

content = content.replace(
    /const docRef = await addDoc\(audiencesRef, newAudience\);/g,
    `const { data: newDoc, error: insertError } = await supabase.from('email_audiences').insert({...newAudience, store_id: projectId}).select('id').single();\n            if (insertError) throw insertError;\n            const docRef = { id: newDoc.id };`
);

content = content.replace(
    /const audiencePath = `users\/\$\{userId\}\/projects\/\$\{projectId\}\/emailAudiences`;\s*const audienceRef = doc\(db, audiencePath, audienceId\);/g,
    ""
);

content = content.replace(
    /await updateDoc\(audienceRef, \{/g,
    `await supabase.from('email_audiences').update({`
);

content = content.replace(
    /const audiencePath = `users\/\$\{userId\}\/projects\/\$\{projectId\}\/emailAudiences`;\s*const audienceRef = doc\(db, audiencePath, audienceId\);\s*await deleteDoc\(audienceRef\);/g,
    `await supabase.from('email_audiences').delete().eq('id', audienceId);`
);

fs.writeFileSync(path, content);
console.log('Done');
