const fs = require('fs');

const filePath = '/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi/components/ui/GlobalAiAssistant.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Imports
content = content.replace(/import\s+\{\s*db,\s*collection,\s*doc,\s*addDoc,\s*updateDoc,\s*deleteDoc,\s*getDoc,\s*setDoc,\s*serverTimestamp,\s*query,\s*where,\s*getDocs,\s*limit,\s*orderBy\s*\}\s*from\s*'..\/..\/firebase';/g, "import { supabase } from '../../supabase';");
content = content.replace(/import\s+\{\s*Timestamp\s*\}\s*from\s*'firebase\/firestore';\n/g, "");

// 2. deep_search
const deepSearchOld = `                if (projectId) {
                    const fetchAndFilter = async (collectionPath: string, filterFn: (data: any) => boolean, mapFn: (data: any) => any) => {
                        try {
                            const ref = collection(db, collectionPath);
                            // Fetch recent 50 documents
                            const qSnap = await getDocs(query(ref, limit(50)));
                            const matches = qSnap.docs
                                .map(d => ({ id: d.id, ...d.data() }))
                                .filter(filterFn)
                                .map(mapFn)
                                .slice(0, 5); // Return top 5 matches per category
                            return matches.length > 0 ? matches : null;
                        } catch (e) {
                            console.error(\`Search error for \${collectionPath}:\`, e);
                            return null;
                        }
                    };

                    if (entities.includes('products')) {
                        const hits = await fetchAndFilter(
                            \`users/\${uid}/stores/\${projectId}/products\`,
                            (p: any) => p.name?.toLowerCase().includes(q),
                            (p: any) => ({ id: p.id, name: p.name, price: p.price, stock: p.inventory?.quantity })
                        );
                        if (hits) results.products = hits;
                    }

                    if (entities.includes('orders')) {
                        const hits = await fetchAndFilter(
                            \`users/\${uid}/stores/\${projectId}/orders\`,
                            (o: any) => o.id.toLowerCase().includes(q) || o.customer?.name?.toLowerCase().includes(q) || o.customer?.email?.toLowerCase().includes(q),
                            (o: any) => ({ id: o.id, customer: o.customer?.name, total: o.total, status: o.status, date: o.createdAt?.toDate?.() || o.createdAt })
                        );
                        if (hits) results.orders = hits;
                    }

                    if (entities.includes('appointments')) {
                        const hits = await fetchAndFilter(
                            \`users/\${uid}/projects/\${projectId}/appointments\`,
                            (a: any) => a.title?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q),
                            (a: any) => ({ id: a.id, title: a.title, start: a.startDate?.toDate?.() || a.startDate, status: a.status })
                        );
                        if (hits) results.appointments = hits;
                    }

                    if (entities.includes('campaigns')) {
                        const hits = await fetchAndFilter(
                            \`users/\${uid}/projects/\${projectId}/emailCampaigns\`,
                            (c: any) => c.name?.toLowerCase().includes(q) || c.subject?.toLowerCase().includes(q),
                            (c: any) => ({ id: c.id, name: c.name, subject: c.subject, status: c.status })
                        );
                        if (hits) results.campaigns = hits;
                    }
                }`;

const deepSearchNew = `                if (projectId) {
                    const fetchFromSupabase = async (table: string, filterFn: (data: any) => boolean, mapFn: (data: any) => any) => {
                        try {
                            const { data, error } = await supabase
                                .from(table)
                                .select('*')
                                .eq('project_id', projectId)
                                .limit(50);
                            
                            if (error) throw error;
                            
                            if (!data) return null;

                            const matches = data
                                .filter(filterFn)
                                .map(mapFn)
                                .slice(0, 5);
                                
                            return matches.length > 0 ? matches : null;
                        } catch (e) {
                            console.error(\`Search error for \${table}:\`, e);
                            return null;
                        }
                    };

                    if (entities.includes('products')) {
                        const hits = await fetchFromSupabase(
                            'products',
                            (p: any) => p.name?.toLowerCase().includes(q),
                            (p: any) => ({ id: p.id, name: p.name, price: p.price, stock: p.inventory?.quantity })
                        );
                        if (hits) results.products = hits;
                    }

                    if (entities.includes('orders')) {
                        const hits = await fetchFromSupabase(
                            'orders',
                            (o: any) => o.id.toLowerCase().includes(q) || o.customer_name?.toLowerCase().includes(q) || o.customer_email?.toLowerCase().includes(q),
                            (o: any) => ({ id: o.id, customer: o.customer_name, total: o.total, status: o.status, date: o.created_at })
                        );
                        if (hits) results.orders = hits;
                    }

                    if (entities.includes('appointments')) {
                        const hits = await fetchFromSupabase(
                            'appointments',
                            (a: any) => a.title?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q),
                            (a: any) => ({ id: a.id, title: a.title, start: a.start_date, status: a.status })
                        );
                        if (hits) results.appointments = hits;
                    }

                    if (entities.includes('campaigns')) {
                        const hits = await fetchFromSupabase(
                            'email_campaigns',
                            (c: any) => c.name?.toLowerCase().includes(q) || c.subject?.toLowerCase().includes(q),
                            (c: any) => ({ id: c.id, name: c.name, subject: c.subject, status: c.status })
                        );
                        if (hits) results.campaigns = hits;
                    }
                }`;
content = content.replace(deepSearchOld, deepSearchNew);

// 3. update_global_seo
const updateGlobalSeoOld = `            else if (name === 'update_global_seo') {
                const role = userDocumentRef.current?.role;
                if (role !== 'superadmin' && role !== 'owner') {
                    return { error: "Unauthorized: Only Super Admins can update global SEO." };
                }
                const payload = { ...args, updatedAt: serverTimestamp() };
                await setDoc(doc(db, 'globalSettings', 'seo'), payload, { merge: true });
                return { result: "Global SEO settings updated." };
            }`;
const updateGlobalSeoNew = `            else if (name === 'update_global_seo') {
                const role = userDocumentRef.current?.role;
                if (role !== 'superadmin' && role !== 'owner') {
                    return { error: "Unauthorized: Only Super Admins can update global SEO." };
                }
                const payload = { ...args, updated_at: new Date().toISOString() };
                await supabase.from('global_settings').upsert({ id: 'seo', ...payload });
                return { result: "Global SEO settings updated." };
            }`;
content = content.replace(updateGlobalSeoOld, updateGlobalSeoNew);

// 4. manage_appointment
const manageAppointmentOld = `            else if (name === 'manage_appointment') {
                if (!user?.id) return { error: "Not authenticated." };
                const action = args?.action as string;
                const projectId = (args?.projectId as string | undefined) || activeProjectRef.current?.id;
                if (!projectId) return { error: "No active project. Load a project first." };
                const id = args?.id as string | undefined;
                const title = args?.title as string | undefined;
                const description = args?.description as string | undefined;
                const status = args?.status as string | undefined;
                const startIso = args?.startDate as string | undefined;
                const endIso = args?.endDate as string | undefined;

                // Project-scoped appointments path
                const appointmentsPath = \`users/\${user.id}/projects/\${projectId}/appointments\`;
                const appointmentsCol = collection(db, appointmentsPath);

                const parseDate = (iso?: string) => {
                    if (!iso) return undefined;
                    const d = new Date(iso);
                    if (isNaN(d.getTime())) return undefined;
                    return dateToTimestamp(d);
                };

                if (action === 'create') {
                    const now = dateToTimestamp(new Date());
                    const startDate = parseDate(startIso) || now;
                    const endDate = parseDate(endIso) || startDate;
                    const payload: any = {
                        title: title || 'Nueva Cita',
                        status: status || 'scheduled',
                        startDate,
                        endDate,
                        projectId,
                        createdAt: now,
                        createdBy: user.id,
                        organizerId: user.id,
                    };
                    if (description) payload.description = description;
                    const docRef = await addDoc(appointmentsCol, payload);
                    return { result: \`Appointment created: \${docRef.id}\` };
                }

                if (action === 'update') {
                    if (!id) return { error: "id required for update." };
                    const updatePayload: any = { updatedAt: dateToTimestamp(new Date()), updatedBy: user.id };
                    if (title !== undefined) updatePayload.title = title;
                    if (description !== undefined) updatePayload.description = description;
                    const parsedStart = parseDate(startIso);
                    const parsedEnd = parseDate(endIso);
                    if (parsedStart) updatePayload.startDate = parsedStart;
                    if (parsedEnd) updatePayload.endDate = parsedEnd;
                    if (status) updatePayload.status = status;
                    await updateDoc(doc(db, appointmentsPath, id), updatePayload);
                    return { result: "Appointment updated." };
                }

                if (action === 'status') {
                    if (!id) return { error: "id required for status." };
                    if (!status) return { error: "status required." };
                    await updateDoc(doc(db, appointmentsPath, id), {
                        status,
                        updatedAt: dateToTimestamp(new Date()),
                        updatedBy: user.id,
                    });
                    return { result: "Appointment status updated." };
                }

                if (action === 'delete') {
                    if (!id) return { error: "id required for delete." };
                    await deleteDoc(doc(db, appointmentsPath, id));
                    return { result: "Appointment deleted." };
                }

                if (action === 'get') {
                    if (!id) return { error: "id required for get." };
                    const docSnap = await getDoc(doc(db, appointmentsPath, id));
                    if (!docSnap.exists()) return { error: "Appointment not found." };
                    return { result: JSON.stringify({ id: docSnap.id, ...docSnap.data() }, null, 2) };
                }

                return { error: "Invalid action for manage_appointment." };
            }`;
const manageAppointmentNew = `            else if (name === 'manage_appointment') {
                if (!user?.id) return { error: "Not authenticated." };
                const action = args?.action as string;
                const projectId = (args?.projectId as string | undefined) || activeProjectRef.current?.id;
                if (!projectId) return { error: "No active project. Load a project first." };
                const id = args?.id as string | undefined;
                const title = args?.title as string | undefined;
                const description = args?.description as string | undefined;
                const status = args?.status as string | undefined;
                const startIso = args?.startDate as string | undefined;
                const endIso = args?.endDate as string | undefined;

                if (action === 'create') {
                    const now = new Date().toISOString();
                    const startDate = startIso || now;
                    const endDate = endIso || startDate;
                    const payload: any = {
                        title: title || 'Nueva Cita',
                        status: status || 'scheduled',
                        start_date: startDate,
                        end_date: endDate,
                        project_id: projectId,
                        created_by: user.id,
                        organizer_id: user.id,
                    };
                    if (description) payload.description = description;
                    const { data, error } = await supabase.from('appointments').insert(payload).select('id').single();
                    if (error) return { error: \`Failed to create appointment: \${error.message}\` };
                    return { result: \`Appointment created: \${data.id}\` };
                }

                if (action === 'update' || action === 'status') {
                    if (!id) return { error: "id required." };
                    const updatePayload: any = { updated_by: user.id };
                    if (title !== undefined) updatePayload.title = title;
                    if (description !== undefined) updatePayload.description = description;
                    if (startIso) updatePayload.start_date = startIso;
                    if (endIso) updatePayload.end_date = endIso;
                    if (status) updatePayload.status = status;
                    
                    const { error } = await supabase.from('appointments').update(updatePayload).eq('id', id);
                    if (error) return { error: \`Failed to update appointment: \${error.message}\` };
                    return { result: "Appointment updated." };
                }

                if (action === 'delete') {
                    if (!id) return { error: "id required for delete." };
                    const { error } = await supabase.from('appointments').delete().eq('id', id);
                    if (error) return { error: \`Failed to delete appointment: \${error.message}\` };
                    return { result: "Appointment deleted." };
                }

                if (action === 'get') {
                    if (!id) return { error: "id required for get." };
                    const { data, error } = await supabase.from('appointments').select('*').eq('id', id).maybeSingle();
                    if (error || !data) return { error: "Appointment not found." };
                    return { result: JSON.stringify(data, null, 2) };
                }

                return { error: "Invalid action for manage_appointment." };
            }`;
content = content.replace(manageAppointmentOld, manageAppointmentNew);

// 5. email_settings
const emailSettingsOld = `            else if (name === 'email_settings') {
                if (!user?.id) return { error: "Not authenticated." };
                const projectId = (args?.projectId as string | undefined) || activeProjectRef.current?.id;
                if (!projectId) return { error: "No active project. Load a project first." };
                const updates = args?.updates;
                if (!updates || typeof updates !== 'object') return { error: "updates object required." };
                const settingsPath = \`users/\${user.id}/projects/\${projectId}/settings/email\`;
                await setDoc(doc(db, settingsPath), { ...updates, updatedAt: serverTimestamp() }, { merge: true });
                return { result: "Email settings updated." };
            }`;
const emailSettingsNew = `            else if (name === 'email_settings') {
                if (!user?.id) return { error: "Not authenticated." };
                const projectId = (args?.projectId as string | undefined) || activeProjectRef.current?.id;
                if (!projectId) return { error: "No active project. Load a project first." };
                const updates = args?.updates;
                if (!updates || typeof updates !== 'object') return { error: "updates object required." };
                const { error } = await supabase.from('email_settings').upsert({ id: projectId, ...updates });
                if (error) return { error: \`Failed to update email settings: \${error.message}\` };
                return { result: "Email settings updated." };
            }`;
content = content.replace(emailSettingsOld, emailSettingsNew);

// 6. email_campaign
const emailCampaignOld = `            else if (name === 'email_campaign') {
                if (!user?.id) return { error: "Not authenticated." };
                const action = args?.action as string;
                const projectId = (args?.projectId as string | undefined) || activeProjectRef.current?.id;
                if (!projectId) return { error: "No active project. Load a project first." };
                const campaignsPath = \`users/\${user.id}/projects/\${projectId}/emailCampaigns\`;

                if (action === 'create') {
                    const campaign = (args?.campaign || {}) as any;
                    const stats = campaign.stats || {
                        totalRecipients: 0, sent: 0, delivered: 0, opened: 0, uniqueOpens: 0,
                        clicked: 0, uniqueClicks: 0, bounced: 0, complained: 0, unsubscribed: 0,
                    };
                    const payload = {
                        ...campaign,
                        status: campaign.status || 'draft',
                        stats,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    };
                    const docRef = await addDoc(collection(db, campaignsPath), payload);
                    return { result: \`Campaign created: \${docRef.id}\` };
                }

                if (action === 'update') {
                    const campaignId = args?.campaignId as string | undefined;
                    if (!campaignId) return { error: "campaignId required for update." };
                    const campaign = (args?.campaign || {}) as any;
                    await updateDoc(doc(db, campaignsPath, campaignId), { ...campaign, updatedAt: serverTimestamp() });
                    return { result: "Campaign updated." };
                }

                if (action === 'delete') {
                    const campaignId = args?.campaignId as string | undefined;
                    if (!campaignId) return { error: "campaignId required for delete." };
                    await deleteDoc(doc(db, campaignsPath, campaignId));
                    return { result: "Campaign deleted." };
                }

                if (action === 'get') {
                    const campaignId = args?.campaignId as string | undefined;
                    if (!campaignId) return { error: "campaignId required." };
                    const docSnap = await getDoc(doc(db, campaignsPath, campaignId));
                    if (!docSnap.exists()) return { error: "Campaign not found." };
                    return { result: JSON.stringify({ id: docSnap.id, ...docSnap.data() }, null, 2) };
                }

                return { error: "Invalid action for email_campaign." };
            }`;
const emailCampaignNew = `            else if (name === 'email_campaign') {
                if (!user?.id) return { error: "Not authenticated." };
                const action = args?.action as string;
                const projectId = (args?.projectId as string | undefined) || activeProjectRef.current?.id;
                if (!projectId) return { error: "No active project. Load a project first." };

                if (action === 'create') {
                    const campaign = (args?.campaign || {}) as any;
                    const payload = {
                        ...campaign,
                        project_id: projectId,
                        status: campaign.status || 'draft',
                    };
                    const { data, error } = await supabase.from('email_campaigns').insert(payload).select('id').single();
                    if (error) return { error: \`Failed to create campaign: \${error.message}\` };
                    return { result: \`Campaign created: \${data.id}\` };
                }

                if (action === 'update') {
                    const campaignId = args?.campaignId as string | undefined;
                    if (!campaignId) return { error: "campaignId required for update." };
                    const campaign = (args?.campaign || {}) as any;
                    const { error } = await supabase.from('email_campaigns').update(campaign).eq('id', campaignId);
                    if (error) return { error: \`Failed to update campaign: \${error.message}\` };
                    return { result: "Campaign updated." };
                }

                if (action === 'delete') {
                    const campaignId = args?.campaignId as string | undefined;
                    if (!campaignId) return { error: "campaignId required for delete." };
                    const { error } = await supabase.from('email_campaigns').delete().eq('id', campaignId);
                    if (error) return { error: \`Failed to delete campaign: \${error.message}\` };
                    return { result: "Campaign deleted." };
                }

                if (action === 'get') {
                    const campaignId = args?.campaignId as string | undefined;
                    if (!campaignId) return { error: "campaignId required." };
                    const { data, error } = await supabase.from('email_campaigns').select('*').eq('id', campaignId).maybeSingle();
                    if (error || !data) return { error: "Campaign not found." };
                    return { result: JSON.stringify(data, null, 2) };
                }

                return { error: "Invalid action for email_campaign." };
            }`;
content = content.replace(emailCampaignOld, emailCampaignNew);

// 7. ecommerce_project
const ecommerceProjectOld = `            else if (name === 'ecommerce_project') {
                if (!user?.id) return { error: "Not authenticated." };
                const action = args?.action as string;
                const projectId = (args?.projectId as string | undefined) || activeProjectRef.current?.id;
                const projectName = (args?.projectName as string | undefined) || activeProjectRef.current?.name || 'Mi Proyecto';
                if (!projectId) return { error: "No active project. Load a project first." };

                const configPath = \`users/\${user.id}/projects/\${projectId}/ecommerce/config\`;
                const storePath = \`users/\${user.id}/stores/\${projectId}\`;

                if (action === 'enable') {
                    await setDoc(doc(db, configPath), {
                        projectId,
                        projectName,
                        ecommerceEnabled: true,
                        storeId: projectId,
                        storeName: \`Tienda - \${projectName}\`,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    }, { merge: true });

                    const storeRef = doc(db, storePath);
                    const storeDoc = await getDoc(storeRef);
                    if (!storeDoc.exists()) {
                        await setDoc(storeRef, {
                            name: \`Tienda - \${projectName}\`,
                            projectId,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp(),
                            isActive: true,
                            ownerId: user.id,
                        });
                    } else {
                        await updateDoc(storeRef, { updatedAt: serverTimestamp(), isActive: true });
                    }

                    return { result: "Ecommerce enabled for project." };
                }

                if (action === 'disable') {
                    await setDoc(doc(db, configPath), { ecommerceEnabled: false, updatedAt: serverTimestamp() }, { merge: true });
                    return { result: "Ecommerce disabled for project." };
                }

                return { error: "Invalid action for ecommerce_project." };
            }`;
const ecommerceProjectNew = `            else if (name === 'ecommerce_project') {
                if (!user?.id) return { error: "Not authenticated." };
                const action = args?.action as string;
                const projectId = (args?.projectId as string | undefined) || activeProjectRef.current?.id;
                if (!projectId) return { error: "No active project. Load a project first." };

                if (action === 'enable') {
                    await supabase.from('projects').update({ ecommerce_enabled: true }).eq('id', projectId);
                    return { result: "Ecommerce enabled for project." };
                }

                if (action === 'disable') {
                    await supabase.from('projects').update({ ecommerce_enabled: false }).eq('id', projectId);
                    return { result: "Ecommerce disabled for project." };
                }

                return { error: "Invalid action for ecommerce_project." };
            }`;
content = content.replace(ecommerceProjectOld, ecommerceProjectNew);

// 8. ecommerce_product
const ecommerceProductOld = `            else if (name === 'ecommerce_product') {
                if (!user?.id) return { error: "Not authenticated." };
                const action = args?.action as string;
                const projectId = (args?.projectId as string | undefined) || activeProjectRef.current?.id;
                if (!projectId) return { error: "No active project. Load a project first." };
                const productsPath = \`users/\${user.id}/stores/\${projectId}/products\`;

                const slugify = (s: string) => s
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');

                if (action === 'create') {
                    const product = (args?.product || {}) as any;
                    if (!product?.name) return { error: "product.name required." };
                    const payload = {
                        ...product,
                        slug: product.slug || slugify(product.name),
                        images: product.images || [],
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    };
                    const docRef = await addDoc(collection(db, productsPath), payload);
                    return { result: \`Product created: \${docRef.id}\` };
                }

                if (action === 'update') {
                    const productId = args?.productId as string | undefined;
                    if (!productId) return { error: "productId required for update." };
                    const product = (args?.product || {}) as any;
                    const updatePayload: any = { ...product, updatedAt: serverTimestamp() };
                    if (product?.name && !product.slug) updatePayload.slug = slugify(product.name);
                    await updateDoc(doc(db, productsPath, productId), updatePayload);
                    return { result: "Product updated." };
                }

                if (action === 'delete') {
                    const productId = args?.productId as string | undefined;
                    if (!productId) return { error: "productId required for delete." };
                    await deleteDoc(doc(db, productsPath, productId));
                    return { result: "Product deleted." };
                }

                if (action === 'get') {
                    const productId = args?.productId as string | undefined;
                    if (!productId) return { error: "productId required." };
                    const docSnap = await getDoc(doc(db, productsPath, productId));
                    if (!docSnap.exists()) return { error: "Product not found." };
                    return { result: JSON.stringify({ id: docSnap.id, ...docSnap.data() }, null, 2) };
                }

                return { error: "Invalid action for ecommerce_product." };
            }`;
const ecommerceProductNew = `            else if (name === 'ecommerce_product') {
                if (!user?.id) return { error: "Not authenticated." };
                const action = args?.action as string;
                const projectId = (args?.projectId as string | undefined) || activeProjectRef.current?.id;
                if (!projectId) return { error: "No active project. Load a project first." };

                const slugify = (s: string) => s
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');

                if (action === 'create') {
                    const product = (args?.product || {}) as any;
                    if (!product?.name) return { error: "product.name required." };
                    const payload = {
                        ...product,
                        project_id: projectId,
                        slug: product.slug || slugify(product.name),
                        images: product.images || [],
                    };
                    const { data, error } = await supabase.from('products').insert(payload).select('id').single();
                    if (error) return { error: \`Failed to create product: \${error.message}\` };
                    return { result: \`Product created: \${data.id}\` };
                }

                if (action === 'update') {
                    const productId = args?.productId as string | undefined;
                    if (!productId) return { error: "productId required for update." };
                    const product = (args?.product || {}) as any;
                    const updatePayload: any = { ...product };
                    if (product?.name && !product.slug) updatePayload.slug = slugify(product.name);
                    const { error } = await supabase.from('products').update(updatePayload).eq('id', productId);
                    if (error) return { error: \`Failed to update product: \${error.message}\` };
                    return { result: "Product updated." };
                }

                if (action === 'delete') {
                    const productId = args?.productId as string | undefined;
                    if (!productId) return { error: "productId required for delete." };
                    const { error } = await supabase.from('products').delete().eq('id', productId);
                    if (error) return { error: \`Failed to delete product: \${error.message}\` };
                    return { result: "Product deleted." };
                }

                if (action === 'get') {
                    const productId = args?.productId as string | undefined;
                    if (!productId) return { error: "productId required." };
                    const { data, error } = await supabase.from('products').select('*').eq('id', productId).maybeSingle();
                    if (error || !data) return { error: "Product not found." };
                    return { result: JSON.stringify(data, null, 2) };
                }

                return { error: "Invalid action for ecommerce_product." };
            }`;
content = content.replace(ecommerceProductOld, ecommerceProductNew);

// 9. ecommerce_order
const ecommerceOrderOld = `            else if (name === 'ecommerce_order') {
                if (!user?.id) return { error: "Not authenticated." };
                const action = (args?.action || 'update_status') as string;
                const orderId = args?.orderId as string;
                const projectId = (args?.projectId as string | undefined) || activeProjectRef.current?.id;
                if (!projectId) return { error: "No active project. Load a project first." };
                const ordersPath = \`users/\${user.id}/stores/\${projectId}/orders\`;

                if (action === 'update_status') {
                    const status = args?.status as string;
                    if (!orderId) return { error: "orderId required." };
                    if (!status) return { error: "status required." };

                    const updateData: any = { status, updatedAt: serverTimestamp() };
                    if (status === 'cancelled') updateData.cancelledAt = serverTimestamp();
                    if (status === 'refunded') updateData.refundedAt = serverTimestamp();
                    if (status === 'shipped') updateData.shippedAt = serverTimestamp();
                    if (status === 'delivered') updateData.deliveredAt = serverTimestamp();

                    await updateDoc(doc(db, ordersPath, orderId), updateData);
                    return { result: "Order status updated." };
                }

                if (action === 'get') {
                    if (!orderId) return { error: "orderId required." };
                    const docSnap = await getDoc(doc(db, ordersPath, orderId));
                    if (!docSnap.exists()) return { error: "Order not found." };
                    return { result: JSON.stringify({ id: docSnap.id, ...docSnap.data() }, null, 2) };
                }

                return { error: "Invalid action for ecommerce_order." };
            }`;
const ecommerceOrderNew = `            else if (name === 'ecommerce_order') {
                if (!user?.id) return { error: "Not authenticated." };
                const action = (args?.action || 'update_status') as string;
                const orderId = args?.orderId as string;
                const projectId = (args?.projectId as string | undefined) || activeProjectRef.current?.id;
                if (!projectId) return { error: "No active project. Load a project first." };

                if (action === 'update_status') {
                    const status = args?.status as string;
                    if (!orderId) return { error: "orderId required." };
                    if (!status) return { error: "status required." };

                    const updateData: any = { status };
                    const now = new Date().toISOString();
                    if (status === 'cancelled') updateData.cancelled_at = now;
                    if (status === 'refunded') updateData.refunded_at = now;
                    if (status === 'shipped') updateData.shipped_at = now;
                    if (status === 'delivered') updateData.delivered_at = now;

                    const { error } = await supabase.from('orders').update(updateData).eq('id', orderId);
                    if (error) return { error: \`Failed to update order: \${error.message}\` };
                    return { result: "Order status updated." };
                }

                if (action === 'get') {
                    if (!orderId) return { error: "orderId required." };
                    const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
                    if (error || !data) return { error: "Order not found." };
                    return { result: JSON.stringify(data, null, 2) };
                }

                return { error: "Invalid action for ecommerce_order." };
            }`;
content = content.replace(ecommerceOrderOld, ecommerceOrderNew);

// 10. finance_expense
const financeExpenseOld = `            else if (name === 'finance_expense') {
                if (!user?.id) return { error: "Not authenticated." };
                const action = args?.action as string;
                const projectId = (args?.projectId as string | undefined) || activeProjectRef.current?.id;
                if (!projectId) return { error: "No active project. Load a project first." };
                const expenseId = args?.expenseId as string | undefined;
                const expensesPath = \`users/\${user.id}/projects/\${projectId}/finance/expenses\`;

                if (action === 'create') {
                    const expense = (args?.expense || {}) as any;
                    const payload = { ...expense, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
                    const docRef = await addDoc(collection(db, expensesPath), payload);
                    return { result: \`Expense created: \${docRef.id}\` };
                }
                if (action === 'update') {
                    if (!expenseId) return { error: "expenseId required for update." };
                    const expense = (args?.expense || {}) as any;
                    await updateDoc(doc(db, expensesPath, expenseId), { ...expense, updatedAt: serverTimestamp() });
                    return { result: "Expense updated." };
                }
                if (action === 'delete') {
                    if (!expenseId) return { error: "expenseId required for delete." };
                    await deleteDoc(doc(db, expensesPath, expenseId));
                    return { result: "Expense deleted." };
                }

                if (action === 'get') {
                    if (!expenseId) return { error: "expenseId required." };
                    const docSnap = await getDoc(doc(db, expensesPath, expenseId));
                    if (!docSnap.exists()) return { error: "Expense not found." };
                    return { result: JSON.stringify({ id: docSnap.id, ...docSnap.data() }, null, 2) };
                }
                return { error: "Invalid action for finance_expense." };
            }`;
const financeExpenseNew = `            else if (name === 'finance_expense') {
                if (!user?.id) return { error: "Not authenticated." };
                const action = args?.action as string;
                const projectId = (args?.projectId as string | undefined) || activeProjectRef.current?.id;
                if (!projectId) return { error: "No active project. Load a project first." };
                const expenseId = args?.expenseId as string | undefined;

                if (action === 'create') {
                    const expense = (args?.expense || {}) as any;
                    const payload = { ...expense, project_id: projectId };
                    const { data, error } = await supabase.from('expenses').insert(payload).select('id').single();
                    if (error) return { error: \`Failed to create expense: \${error.message}\` };
                    return { result: \`Expense created: \${data.id}\` };
                }
                if (action === 'update') {
                    if (!expenseId) return { error: "expenseId required for update." };
                    const expense = (args?.expense || {}) as any;
                    const { error } = await supabase.from('expenses').update(expense).eq('id', expenseId);
                    if (error) return { error: \`Failed to update expense: \${error.message}\` };
                    return { result: "Expense updated." };
                }
                if (action === 'delete') {
                    if (!expenseId) return { error: "expenseId required for delete." };
                    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
                    if (error) return { error: \`Failed to delete expense: \${error.message}\` };
                    return { result: "Expense deleted." };
                }

                if (action === 'get') {
                    if (!expenseId) return { error: "expenseId required." };
                    const { data, error } = await supabase.from('expenses').select('*').eq('id', expenseId).maybeSingle();
                    if (error || !data) return { error: "Expense not found." };
                    return { result: JSON.stringify(data, null, 2) };
                }
                return { error: "Invalid action for finance_expense." };
            }`;
content = content.replace(financeExpenseOld, financeExpenseNew);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Migration complete');
