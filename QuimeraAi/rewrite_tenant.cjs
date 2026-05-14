const fs = require('fs');

let content = fs.readFileSync('contexts/tenant/TenantContext.tsx', 'utf-8');

// 1. Remove Firebase imports
content = content.replace(/import\s*\{\s*db,[\s\S]*?from\s*'..\/..\/firebase';/m, '');
content = content.replace(/import \{ useAuth \} from '..\/core\/AuthContext';/, `import { supabase } from '../../supabase';\nimport { useAuth } from '../core/AuthContext';`);

// 2. loadUserTenants
content = content.replace(/const membershipsQuery = query\([\s\S]*?const memberships: TenantMembership\[\] = \[\];/m, `
            const { data: snapshot, error: fetchErr } = await supabase
                .from('tenant_members')
                .select('*, tenant:tenants(*)')
                .eq('user_id', userId);

            if (fetchErr) throw fetchErr;
            const memberships: TenantMembership[] = [];
`);
content = content.replace(/for \(const docSnap of snapshot\.docs\) \{[\s\S]*?memberships\.push\(\{[\s\S]*?\}\);[\s\S]*?\}/m, `
            for (const row of snapshot || []) {
                const tData = row.tenant;
                if (tData) {
                    const rawTenant = {
                        id: tData.id,
                        name: tData.name,
                        slug: tData.slug,
                        type: tData.type,
                        ownerUserId: tData.owner_user_id,
                        subscriptionPlan: tData.subscription_plan,
                        status: tData.status,
                        limits: typeof tData.limits === 'string' ? JSON.parse(tData.limits) : tData.limits,
                        usage: typeof tData.usage === 'string' ? JSON.parse(tData.usage) : tData.usage,
                        branding: typeof tData.branding === 'string' ? JSON.parse(tData.branding) : tData.branding,
                        settings: typeof tData.settings === 'string' ? JSON.parse(tData.settings) : tData.settings,
                        createdAt: tData.created_at,
                        updatedAt: tData.updated_at
                    };
                    const tenant = {
                        ...rawTenant,
                        name: resolveProjectName(rawTenant.name),
                        branding: rawTenant.branding ? {
                            ...rawTenant.branding,
                            companyName: rawTenant.branding.companyName ? resolveProjectName(rawTenant.branding.companyName) : resolveProjectName(rawTenant.name)
                        } : undefined
                    } as Tenant;
                    memberships.push({
                        id: row.id,
                        tenantId: row.tenant_id,
                        userId: row.user_id,
                        role: row.role,
                        permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
                        invitedBy: row.invited_by,
                        joinedAt: row.joined_at,
                        tenant,
                    } as any);
                }
            }
`);

// 3. loadTenant
content = content.replace(/const tenantDoc = await getDoc\(doc\(db, 'tenants', tenantId\)\);[\s\S]*?if \(!tenantDoc\.exists\(\)\) \{/m, `
            const { data: tenantDoc, error: tenantErr } = await supabase
                .from('tenants')
                .select('*')
                .eq('id', tenantId)
                .single();
            if (tenantErr || !tenantDoc) {
`);
content = content.replace(/const rawTenant = \{ id: tenantDoc\.id, \.\.\.tenantDoc\.data\(\) \} as any;/m, `
            const rawTenant = {
                id: tenantDoc.id,
                name: tenantDoc.name,
                slug: tenantDoc.slug,
                type: tenantDoc.type,
                ownerUserId: tenantDoc.owner_user_id,
                subscriptionPlan: tenantDoc.subscription_plan,
                status: tenantDoc.status,
                limits: typeof tenantDoc.limits === 'string' ? JSON.parse(tenantDoc.limits) : tenantDoc.limits,
                usage: typeof tenantDoc.usage === 'string' ? JSON.parse(tenantDoc.usage) : tenantDoc.usage,
                branding: typeof tenantDoc.branding === 'string' ? JSON.parse(tenantDoc.branding) : tenantDoc.branding,
                settings: typeof tenantDoc.settings === 'string' ? JSON.parse(tenantDoc.settings) : tenantDoc.settings,
                createdAt: tenantDoc.created_at,
                updatedAt: tenantDoc.updated_at
            } as any;
`);
content = content.replace(/const membershipDoc = await getDoc\(doc\(db, 'tenantMembers', membershipId\)\);[\s\S]*?if \(membershipDoc\.exists\(\)\) \{[\s\S]*?\} as TenantMembership\);\s*\}/m, `
                const { data: membershipDoc } = await supabase
                    .from('tenant_members')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (membershipDoc) {
                    setCurrentMembership({
                        id: membershipDoc.id,
                        tenantId: membershipDoc.tenant_id,
                        userId: membershipDoc.user_id,
                        role: membershipDoc.role,
                        permissions: typeof membershipDoc.permissions === 'string' ? JSON.parse(membershipDoc.permissions) : membershipDoc.permissions,
                        invitedBy: membershipDoc.invited_by,
                        joinedAt: membershipDoc.joined_at,
                        tenant,
                    } as any);
                }
`);

// 4. createPersonalTenant
content = content.replace(/const batch = writeBatch\(db\);[\s\S]*?await batch\.commit\(\);/m, `
        const tenantData = {
            id: tenantId,
            name: tenantName,
            slug,
            owner_user_id: authUser.id,
            type: 'personal',
            subscription_plan: 'free',
            settings: {
                allowPublicSignup: false,
                requireEmailVerification: true,
                defaultRole: 'viewer',
            },
            limits: getDefaultLimitsForPlan('free'),
            usage: {
                projectCount: 0,
                userCount: 1,
                storageUsedGB: 0,
                aiCreditsUsed: 0,
                subClientCount: 0,
            }
        };

        const membershipData = {
            id: membershipId,
            tenant_id: tenantId,
            user_id: authUser.id,
            role: 'agency_owner',
            permissions: DEFAULT_PERMISSIONS.agency_owner,
            invited_by: authUser.id,
        };

        const { error: insertErr } = await supabase.from('tenants').insert(tenantData);
        if (insertErr) throw insertErr;
        
        await supabase.from('tenant_members').insert(membershipData);
`);

// 5. createTenant
content = content.replace(/const existingSlug = await getDocs\([\s\S]*?where\('slug', '==', slug\)\)\s*\);/m, `
        const { data: existingSlug } = await supabase
            .from('tenants')
            .select('id')
            .eq('slug', slug);
`);
content = content.replace(/if \(!existingSlug\.empty\) \{/m, `if (existingSlug && existingSlug.length > 0) {`);
content = content.replace(/const tenantData: Omit<Tenant, 'id'> = \{[\s\S]*?\};[\s\S]*?const tenantRef = await addDoc\(collection\(db, 'tenants'\), tenantData\);[\s\S]*?const tenantId = tenantRef\.id;[\s\S]*?await setDoc\(doc\(db, 'tenantMembers', membershipId\), membershipData\);/m, `
        const tenantRecord = {
            name: data.name,
            slug: finalSlug,
            type: data.type,
            owner_user_id: user.id,
            owner_tenant_id: data.parentTenantId,
            subscription_plan: plan,
            status: 'active',
            limits: getDefaultLimitsForPlan(plan),
            usage: {
                projectCount: 0,
                userCount: 1,
                storageUsedGB: 0,
                aiCreditsUsed: 0,
            },
            branding: {
                ...getDefaultTenantBranding(),
                ...data.branding,
                companyName: data.name,
            },
            settings: getDefaultTenantSettings(),
        };

        const { data: tenantRes, error: tenantErr } = await supabase
            .from('tenants')
            .insert(tenantRecord)
            .select()
            .single();

        if (tenantErr) throw tenantErr;
        const tenantId = tenantRes.id;

        const membershipId = getMembershipId(tenantId, user.id);
        const membershipData = {
            id: membershipId,
            tenant_id: tenantId,
            user_id: user.id,
            role: 'agency_owner',
            permissions: DEFAULT_PERMISSIONS.agency_owner,
            invited_by: user.id,
        };

        await supabase.from('tenant_members').insert(membershipData);
`);

// 6. updateTenant
content = content.replace(/await updateDoc\(doc\(db, 'tenants', tenantId\), \{[\s\S]*?updatedAt: serverTimestamp\(\),[\s\S]*?\}\);/m, `
        await supabase.from('tenants').update({
            name: data.name,
            slug: data.slug,
            type: data.type,
            subscription_plan: data.subscriptionPlan,
            status: data.status,
            limits: data.limits,
            usage: data.usage,
            branding: data.branding,
            settings: data.settings,
            updated_at: new Date().toISOString()
        }).eq('id', tenantId);
`);

// 7. deleteTenant
content = content.replace(/const membershipsQuery = query\([\s\S]*?collection\(db, 'tenantMembers'\),[\s\S]*?where\('tenantId', '==', tenantId\)[\s\S]*?\);[\s\S]*?const memberships = await getDocs\(membershipsQuery\);[\s\S]*?for \(const membership of memberships\.docs\) \{[\s\S]*?await deleteDoc\(membership\.ref\);[\s\S]*?\}[\s\S]*?await deleteDoc\(doc\(db, 'tenants', tenantId\)\);/m, `
        // RLS cascade will handle members if setup properly, but let's delete explicitly just in case
        await supabase.from('tenant_members').delete().eq('tenant_id', tenantId);
        await supabase.from('tenants').delete().eq('id', tenantId);
`);

// 8. inviteMember
content = content.replace(/const inviteData: Omit<TenantInvite, 'id'> = \{[\s\S]*?\};[\s\S]*?const inviteRef = await addDoc\(collection\(db, 'tenantInvites'\), inviteData\);[\s\S]*?return inviteRef\.id;/m, `
        const inviteData = {
            tenant_id: currentTenant.id,
            email: data.email.toLowerCase(),
            role: data.role,
            custom_permissions: data.customPermissions,
            invited_by: user.id,
            token,
            message: data.message,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
            tenant_name: currentTenant.name,
        };

        const { data: inviteRes, error } = await supabase.from('tenant_invites').insert(inviteData).select().single();
        if (error) throw error;
        return inviteRes.id;
`);

// 9. removeMember
content = content.replace(/const membershipId = getMembershipId\(currentTenant\.id, userId\);[\s\S]*?await deleteDoc\(doc\(db, 'tenantMembers', membershipId\)\);[\s\S]*?await updateDoc\(doc\(db, 'tenants', currentTenant\.id\), \{[\s\S]*?'usage\.userCount': \(currentTenant\.usage\.userCount \|\| 1\) - 1,[\s\S]*?updatedAt: serverTimestamp\(\),[\s\S]*?\}\);/m, `
        await supabase.from('tenant_members').delete().eq('tenant_id', currentTenant.id).eq('user_id', userId);

        const newCount = Math.max((currentTenant.usage.userCount || 1) - 1, 0);
        await supabase.from('tenants').update({
            usage: { ...currentTenant.usage, userCount: newCount },
            updated_at: new Date().toISOString()
        }).eq('id', currentTenant.id);
`);

// 10. updateMemberRole
content = content.replace(/const membershipId = getMembershipId\(currentTenant\.id, userId\);[\s\S]*?await updateDoc\(doc\(db, 'tenantMembers', membershipId\), \{[\s\S]*?role,[\s\S]*?permissions: DEFAULT_PERMISSIONS\[role\],[\s\S]*?\}\);/m, `
        await supabase.from('tenant_members').update({
            role,
            permissions: DEFAULT_PERMISSIONS[role],
        }).eq('tenant_id', currentTenant.id).eq('user_id', userId);
`);

// 11. updateMemberPermissions
content = content.replace(/const membershipId = getMembershipId\(currentTenant\.id, userId\);[\s\S]*?const membershipDoc = await getDoc\(doc\(db, 'tenantMembers', membershipId\)\);[\s\S]*?if \(!membershipDoc\.exists\(\)\) \{[\s\S]*?throw new Error\('Miembro no encontrado'\);[\s\S]*?\}[\s\S]*?const currentPermissions = membershipDoc\.data\(\)\.permissions;[\s\S]*?await updateDoc\(doc\(db, 'tenantMembers', membershipId\), \{[\s\S]*?permissions: \{ \.\.\.currentPermissions, \.\.\.permissions \},[\s\S]*?\}\);/m, `
        const { data: memDoc } = await supabase.from('tenant_members').select('permissions').eq('tenant_id', currentTenant.id).eq('user_id', userId).single();
        
        if (!memDoc) {
            throw new Error('Miembro no encontrado');
        }

        const currentPermissions = typeof memDoc.permissions === 'string' ? JSON.parse(memDoc.permissions) : memDoc.permissions;

        await supabase.from('tenant_members').update({
            permissions: { ...currentPermissions, ...permissions },
        }).eq('tenant_id', currentTenant.id).eq('user_id', userId);
`);

// 12. createSubClient
content = content.replace(/const inviteData: any = \{[\s\S]*?\};[\s\S]*?await addDoc\(collection\(db, 'tenantInvites'\), inviteData\);/g, `
                const inviteData = {
                    tenant_id: subClientId,
                    email: newUser.email.toLowerCase(),
                    role: newUser.role,
                    invited_by: user?.id || '',
                    token,
                    message: \`Bienvenido a \${data.name}\`,
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'pending',
                    tenant_name: data.name,
                };
                await supabase.from('tenant_invites').insert(inviteData);
`);
content = content.replace(/try \{[\s\S]*?await addDoc\(collection\(db, 'agencyActivity'\), \{[\s\S]*?\}\);[\s\S]*?\} catch \(activityErr\) \{[\s\S]*?\}/m, `
        // try {
        //    await supabase.from('agency_activity').insert({...})
        // } catch (e) {} 
        // Disabled agencyActivity pending Supabase migration
`);
content = content.replace(/await updateDoc\(doc\(db, 'tenants', currentTenant\.id\), \{[\s\S]*?'usage\.subClientCount': subClientCount \+ 1,[\s\S]*?updatedAt: serverTimestamp\(\),[\s\S]*?\}\);/m, `
        await supabase.from('tenants').update({
            usage: { ...currentTenant.usage, subClientCount: subClientCount + 1 },
            updated_at: new Date().toISOString()
        }).eq('id', currentTenant.id);
`);

// 13. getSubClients
content = content.replace(/const subClientsQuery = query\([\s\S]*?collection\(db, 'tenants'\),[\s\S]*?where\('ownerTenantId', '==', currentTenant\.id\)[\s\S]*?\);[\s\S]*?const snapshot = await getDocs\(subClientsQuery\);[\s\S]*?return snapshot\.docs\.map\(doc => \{[\s\S]*?const raw = \{ id: doc\.id, \.\.\.doc\.data\(\) \} as any;[\s\S]*?return \{[\s\S]*?\.\.\.raw,[\s\S]*?name: resolveProjectName\(raw\.name\),[\s\S]*?branding: raw\.branding \? \{[\s\S]*?\.\.\.raw\.branding,[\s\S]*?companyName: raw\.branding\.companyName \? resolveProjectName\(raw\.branding\.companyName\) : resolveProjectName\(raw\.name\)[\s\S]*?\} : undefined[\s\S]*?\} as Tenant;[\s\S]*?\}\);/m, `
        const { data: snapshot } = await supabase.from('tenants').select('*').eq('owner_tenant_id', currentTenant.id);
        return (snapshot || []).map((tData: any) => {
            const raw = {
                id: tData.id,
                name: tData.name,
                slug: tData.slug,
                type: tData.type,
                ownerUserId: tData.owner_user_id,
                subscriptionPlan: tData.subscription_plan,
                status: tData.status,
                limits: typeof tData.limits === 'string' ? JSON.parse(tData.limits) : tData.limits,
                usage: typeof tData.usage === 'string' ? JSON.parse(tData.usage) : tData.usage,
                branding: typeof tData.branding === 'string' ? JSON.parse(tData.branding) : tData.branding,
                settings: typeof tData.settings === 'string' ? JSON.parse(tData.settings) : tData.settings,
                createdAt: tData.created_at,
                updatedAt: tData.updated_at
            } as any;
            return {
                ...raw,
                name: resolveProjectName(raw.name),
                branding: raw.branding ? {
                    ...raw.branding,
                    companyName: raw.branding.companyName ? resolveProjectName(raw.branding.companyName) : resolveProjectName(raw.name)
                } : undefined
            } as Tenant;
        });
`);

fs.writeFileSync('contexts/tenant/TenantContext.tsx', content);
console.log('Done migrating TenantContext.tsx');
