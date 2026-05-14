const fs = require('fs');

const filePath = '/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi/components/onboarding/hooks/useOnboarding.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Imports
content = content.replace(/import\s+\{\s*doc,\s*getDoc,\s*setDoc,\s*deleteDoc,\s*collection,\s*addDoc,\s*serverTimestamp\s*\}\s*from\s*'firebase\/firestore';\n/, "import { supabase } from '../../../supabase';\n");
content = content.replace(/import\s+\{\s*db\s*\}\s*from\s*'..\/..\/..\/firebase';\n/, "");

// 2. getProgressDocRef, loadProgress, saveProgress, clearProgress
const progressOld = `    const getProgressDocRef = useCallback(() => {
        if (!user) return null;
        return doc(db, 'users', user.id, 'onboardingProgress', 'current');
    }, [user]);

    const loadProgress = useCallback(async () => {
        const docRef = getProgressDocRef();
        if (!docRef) return;

        try {
            setIsLoading(true);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as OnboardingProgress;
                setProgress(data);
            }
        } catch (err) {
            console.error('Failed to load onboarding progress:', err);
        } finally {
            setIsLoading(false);
        }
    }, [getProgressDocRef]);

    const saveProgress = useCallback(async (newProgress?: OnboardingProgress) => {
        const docRef = getProgressDocRef();
        if (!docRef) return;

        const dataToSave = newProgress || progress;
        if (!dataToSave) return;

        try {
            setIsSaving(true);

            // Remove undefined values (Firestore doesn't allow them)
            const cleanData = JSON.parse(JSON.stringify({
                ...dataToSave,
                updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
            }));

            await setDoc(docRef, cleanData);
            if (!newProgress) {
                setProgress(cleanData);
            }
        } catch (err) {
            console.error('Failed to save onboarding progress:', err);
            setError(t('onboarding.errorSaving'));
        } finally {
            setIsSaving(false);
        }
    }, [getProgressDocRef, progress, t]);

    const clearProgress = useCallback(async () => {
        const docRef = getProgressDocRef();
        if (!docRef) return;

        try {
            await deleteDoc(docRef);
            setProgress(null);
        } catch (err) {
            console.error('Failed to clear onboarding progress:', err);
        }
    }, [getProgressDocRef]);`;

const progressNew = `    const loadProgress = useCallback(async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('onboarding_progress')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();
                
            if (data) {
                // Map snake_case from DB to camelCase if necessary, or just set it
                setProgress(data.progress_data as OnboardingProgress);
            }
        } catch (err) {
            console.error('Failed to load onboarding progress:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const saveProgress = useCallback(async (newProgress?: OnboardingProgress) => {
        if (!user) return;

        const dataToSave = newProgress || progress;
        if (!dataToSave) return;

        try {
            setIsSaving(true);

            const cleanData = JSON.parse(JSON.stringify({
                ...dataToSave,
                updatedAt: new Date().toISOString(),
            }));

            await supabase
                .from('onboarding_progress')
                .upsert({
                    id: user.id,
                    progress_data: cleanData,
                    updated_at: new Date().toISOString()
                });
                
            if (!newProgress) {
                setProgress(cleanData);
            }
        } catch (err) {
            console.error('Failed to save onboarding progress:', err);
            setError(t('onboarding.errorSaving'));
        } finally {
            setIsSaving(false);
        }
    }, [user, progress, t]);

    const clearProgress = useCallback(async () => {
        if (!user) return;

        try {
            await supabase
                .from('onboarding_progress')
                .delete()
                .eq('id', user.id);
            setProgress(null);
        } catch (err) {
            console.error('Failed to clear onboarding progress:', err);
        }
    }, [user]);`;

content = content.replace(progressOld, progressNew);

// 3. handleCreateWebsite (ecommerce initialization)
const fileCreationOld = `                        // Record generation artifact in files collection (optional but helpful)
                        try {
                            const filesCol = collection(db, \`users/\${user.id}/projects/\${newProject.id}/files\`);
                            await addDoc(filesCol, {
                                name: \`generation_artifact_\${Date.now()}.json\`,
                                url: '',
                                type: 'generation_artifact',
                                size: JSON.stringify(finalProjectData).length,
                                isPublic: false,
                                folder: 'system',
                                uploadedAt: serverTimestamp(),
                                metadata: {
                                    prompt: progress.description,
                                    templateId: progress.selectedTemplateId
                                }
                            });
                        } catch (fileErr) {
                            console.warn("Could not save generation artifact record", fileErr);
                        }`;
const fileCreationNew = `                        // Record generation artifact in files table
                        try {
                            await supabase.from('files').insert({
                                project_id: newProject.id,
                                name: \`generation_artifact_\${Date.now()}.json\`,
                                url: '',
                                type: 'generation_artifact',
                                size: JSON.stringify(finalProjectData).length,
                                is_public: false,
                                folder: 'system',
                                uploaded_at: new Date().toISOString(),
                                metadata: {
                                    prompt: progress.description,
                                    templateId: progress.selectedTemplateId
                                }
                            });
                        } catch (fileErr) {
                            console.warn("Could not save generation artifact record", fileErr);
                        }`;
content = content.replace(fileCreationOld, fileCreationNew);

const ecommerceInitOld = `                // -------------------------------------------------------------
                // 3. INITIALIZE ECOMMERCE IF ENABLED
                // -------------------------------------------------------------
                if (progress.hasEcommerce) {
                    try {
                        const storeName = progress.storeSetup?.storeName || \`Tienda de \${progress.businessName}\`;
                        
                        // 1. Save Ecommerce Config
                        const ecommerceConfigRef = doc(db, 'users', user.id, 'projects', newProject.id, 'ecommerce', 'config');
                        await setDoc(ecommerceConfigRef, {
                            projectId: newProject.id,
                            projectName: progress.businessName,
                            ecommerceEnabled: true,
                            ecommerceType: progress.ecommerceType || 'physical',
                            storeId: newProject.id,
                            storeName,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp(),
                        });

                        // 2. Initialize Store Document
                        const storeRef = doc(db, 'users', user.id, 'stores', newProject.id);
                        await setDoc(storeRef, {
                            name: storeName,
                            projectId: newProject.id,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp(),
                            isActive: true,
                            ownerId: user.id,
                            type: progress.ecommerceType || 'physical',
                            status: 'draft',
                            contactEmail: progress.contactInfo?.email || user.email || '',
                            description: progress.description || '',
                            settings: {
                                currency: progress.storeSetup?.currency || 'USD',
                                language: progress.language || 'en',
                                taxIncluded: true,
                                requiresShipping: progress.ecommerceType !== 'digital' && progress.ecommerceType !== 'services'
                            }
                        });

                        // 3. Initialize default Store Settings documents
                        // 3.a Default general store settings
                        const storeSettingsRef = doc(db, 'users', user.id, 'stores', newProject.id, 'settings', 'store');
                        await setDoc(storeSettingsRef, {
                            storeName,
                            contactEmail: progress.contactInfo?.email || user.email || '',
                            senderEmail: progress.contactInfo?.email || user.email || '',
                            currency: progress.storeSetup?.currency || 'USD',
                            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                            unitSystem: 'metric', // default to metric, can be changed later
                            weightUnit: 'kg',
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp(),
                        });

                        // 4. Initialize Categories
                        if (progress.storeSetup?.selectedCategories && progress.storeSetup.selectedCategories.length > 0) {
                            for (const [index, catName] of progress.storeSetup.selectedCategories.entries()) {
                                const categoryId = \`cat_\${Date.now()}_\${index}\`;
                                const categoryRef = doc(db, 'users', user.id, 'stores', newProject.id, 'categories', categoryId);
                                
                                await setDoc(categoryRef, {
                                    id: categoryId,
                                    name: {
                                        es: catName,
                                        en: catName // Simple translation fallback
                                    },
                                    slug: catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                                    description: { es: '', en: '' },
                                    isActive: true,
                                    order: index,
                                    createdAt: serverTimestamp(),
                                    updatedAt: serverTimestamp(),
                                });
                            }
                        }

                        // 5. Initialize public registry entry for the store
                        const publicStoreRef = doc(db, 'publicStores', newProject.id);
                        await setDoc(publicStoreRef, {
                            projectId: newProject.id,
                            ownerId: user.id,
                            name: storeName,
                            type: progress.ecommerceType || 'physical',
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp(),
                            isActive: true
                        });
                        
                        if (isDev) console.log('🛍️ Ecommerce initialized successfully');
                    } catch (eStoreErr) {
                        console.error('Failed to initialize ecommerce:', eStoreErr);
                        // We don't throw here to avoid failing the whole website generation
                        // just because the store setup failed partially
                    }
                }`;
const ecommerceInitNew = `                // -------------------------------------------------------------
                // 3. INITIALIZE ECOMMERCE IF ENABLED
                // -------------------------------------------------------------
                if (progress.hasEcommerce) {
                    try {
                        const storeName = progress.storeSetup?.storeName || \`Tienda de \${progress.businessName}\`;
                        
                        // 1. Save Ecommerce Config (in projects table now)
                        await supabase.from('projects').update({ 
                            ecommerce_enabled: true,
                            ecommerce_type: progress.ecommerceType || 'physical'
                        }).eq('id', newProject.id);

                        const now = new Date().toISOString();

                        // 2. Initialize Store Document
                        await supabase.from('stores').upsert({
                            id: newProject.id,
                            name: storeName,
                            project_id: newProject.id,
                            created_at: now,
                            updated_at: now,
                            is_active: true,
                            owner_id: user.id,
                            type: progress.ecommerceType || 'physical',
                            status: 'draft',
                            contact_email: progress.contactInfo?.email || user.email || '',
                            description: progress.description || '',
                            settings: {
                                currency: progress.storeSetup?.currency || 'USD',
                                language: progress.language || 'en',
                                taxIncluded: true,
                                requiresShipping: progress.ecommerceType !== 'digital' && progress.ecommerceType !== 'services'
                            }
                        });

                        // 3. Initialize default Store Settings documents
                        await supabase.from('store_settings').upsert({
                            store_id: newProject.id,
                            store_name: storeName,
                            contact_email: progress.contactInfo?.email || user.email || '',
                            sender_email: progress.contactInfo?.email || user.email || '',
                            currency: progress.storeSetup?.currency || 'USD',
                            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                            unit_system: 'metric',
                            weight_unit: 'kg',
                            created_at: now,
                            updated_at: now,
                        });

                        // 4. Initialize Categories
                        if (progress.storeSetup?.selectedCategories && progress.storeSetup.selectedCategories.length > 0) {
                            const categoriesToInsert = progress.storeSetup.selectedCategories.map((catName, index) => ({
                                id: \`cat_\${Date.now()}_\${index}\`,
                                store_id: newProject.id,
                                name: catName, // assuming single string or JSONB
                                slug: catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                                description: '',
                                is_active: true,
                                order: index,
                                created_at: now,
                                updated_at: now,
                            }));
                            await supabase.from('store_categories').insert(categoriesToInsert);
                        }

                        // 5. Initialize public registry entry for the store
                        await supabase.from('public_stores').upsert({
                            project_id: newProject.id,
                            owner_id: user.id,
                            name: storeName,
                            type: progress.ecommerceType || 'physical',
                            created_at: now,
                            updated_at: now,
                            is_active: true
                        });
                        
                        if (isDev) console.log('🛍️ Ecommerce initialized successfully');
                    } catch (eStoreErr) {
                        console.error('Failed to initialize ecommerce:', eStoreErr);
                        // We don't throw here to avoid failing the whole website generation
                        // just because the store setup failed partially
                    }
                }`;
content = content.replace(ecommerceInitOld, ecommerceInitNew);

fs.writeFileSync(filePath, content, 'utf8');
console.log('useOnboarding migrated to Supabase');
