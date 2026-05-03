const fs = require('fs');

const pathOnboarding = '/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi/components/onboarding/hooks/useOnboarding.ts';
let contentOnboarding = fs.readFileSync(pathOnboarding, 'utf8');

// Replace imports
contentOnboarding = contentOnboarding.replace(/import \{ doc, getDoc, setDoc, deleteDoc, collection, addDoc, serverTimestamp \} from 'firebase\/firestore';\n/, "");
contentOnboarding = contentOnboarding.replace(/import \{ db \} from '\.\.\/\.\.\/\.\.\/firebase';\n/, "import { supabase } from '../../../supabase';\n");

// Replace getProgressDocRef, loadProgress, saveProgress, clearProgress
contentOnboarding = contentOnboarding.replace(
/const getProgressDocRef = useCallback\(\(\) => \{[\s\S]*?if \(!user\) return null;[\s\S]*?return doc\(db, 'users', user\.uid, 'onboardingProgress', 'current'\);[\s\S]*?\}, \[user\]\);[\s\S]*?const loadProgress = useCallback\(async \(\) => \{[\s\S]*?const docRef = getProgressDocRef\(\);[\s\S]*?if \(!docRef\) return;[\s\S]*?try \{[\s\S]*?setIsLoading\(true\);[\s\S]*?const docSnap = await getDoc\(docRef\);[\s\S]*?if \(docSnap\.exists\(\)\) \{[\s\S]*?const data = docSnap\.data\(\) as OnboardingProgress;[\s\S]*?setProgress\(data\);[\s\S]*?\}[\s\S]*?\} catch \(err\) \{[\s\S]*?console\.error\('Failed to load onboarding progress:', err\);[\s\S]*?\} finally \{[\s\S]*?setIsLoading\(false\);[\s\S]*?\}[\s\S]*?\}, \[getProgressDocRef\]\);[\s\S]*?const saveProgress = useCallback\(async \(newProgress\?: OnboardingProgress\) => \{[\s\S]*?const docRef = getProgressDocRef\(\);[\s\S]*?if \(!docRef\) return;[\s\S]*?const dataToSave = newProgress \|\| progress;[\s\S]*?if \(!dataToSave\) return;[\s\S]*?try \{[\s\S]*?setIsSaving\(true\);[\s\S]*?\/\/ Remove undefined values \(Firestore doesn't allow them\)[\s\S]*?const cleanData = JSON\.parse\(JSON\.stringify\(\{[\s\S]*?\.\.\.dataToSave,[\s\S]*?updatedAt: \{ seconds: Date\.now\(\) \/ 1000, nanoseconds: 0 \},[\s\S]*?\}\)\);[\s\S]*?await setDoc\(docRef, cleanData\);[\s\S]*?if \(!newProgress\) \{[\s\S]*?setProgress\(cleanData\);[\s\S]*?\}[\s\S]*?\} catch \(err\) \{[\s\S]*?console\.error\('Failed to save onboarding progress:', err\);[\s\S]*?setError\(t\('onboarding\.errorSaving'\)\);[\s\S]*?\} finally \{[\s\S]*?setIsSaving\(false\);[\s\S]*?\}[\s\S]*?\}, \[getProgressDocRef, progress, t\]\);[\s\S]*?const clearProgress = useCallback\(async \(\) => \{[\s\S]*?const docRef = getProgressDocRef\(\);[\s\S]*?if \(!docRef\) return;[\s\S]*?try \{[\s\S]*?await deleteDoc\(docRef\);[\s\S]*?setProgress\(null\);[\s\S]*?\} catch \(err\) \{[\s\S]*?console\.error\('Failed to clear onboarding progress:', err\);[\s\S]*?\}[\s\S]*?\}, \[getProgressDocRef\]\);/,
`const loadProgress = useCallback(async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('users')
                .select('data')
                .eq('id', user.uid)
                .single();

            if (error) {
                // Not found is fine
                if (error.code !== 'PGRST116') {
                    throw error;
                }
            } else if (data?.data?.onboardingProgress) {
                setProgress(data.data.onboardingProgress as OnboardingProgress);
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

            // Get existing data to merge
            const { data: userData } = await supabase
                .from('users')
                .select('data')
                .eq('id', user.uid)
                .single();
                
            const existingData = userData?.data || {};
            
            const { error } = await supabase
                .from('users')
                .update({
                    data: {
                        ...existingData,
                        onboardingProgress: cleanData
                    }
                })
                .eq('id', user.uid);
                
            if (error) throw error;

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
            // Get existing data to merge
            const { data: userData } = await supabase
                .from('users')
                .select('data')
                .eq('id', user.uid)
                .single();
                
            const existingData = userData?.data || {};
            const newData = { ...existingData };
            delete newData.onboardingProgress;
            
            const { error } = await supabase
                .from('users')
                .update({ data: newData })
                .eq('id', user.uid);
                
            if (error) throw error;
            
            setProgress(null);
        } catch (err) {
            console.error('Failed to clear onboarding progress:', err);
        }
    }, [user]);`
);

// Replace analyzeWebsite firebase function
contentOnboarding = contentOnboarding.replace(
/\/\/ Import Firebase functions[\s\S]*?const \{ getFunctions, httpsCallable \} = await import\('firebase\/functions'\);[\s\S]*?const functions = getFunctions\(\);[\s\S]*?const analyzeWebsiteFn = httpsCallable\(functions, 'agencyOnboarding-analyzeWebsite'\);[\s\S]*?const response = await analyzeWebsiteFn\(\{ url \}\);[\s\S]*?const data = response\.data as \{ success: boolean; result: any \};/,
`// Invoke Supabase Edge Function
            const { data: response, error } = await supabase.functions.invoke('agencyOnboarding-analyzeWebsite', {
                body: { url }
            });
            
            if (error) throw error;
            const data = response as { success: boolean; result: any };`
);

fs.writeFileSync(pathOnboarding, contentOnboarding);
console.log('Migrated useOnboarding.ts');

const pathStudio = '/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi/components/onboarding/hooks/useAIWebsiteStudio.ts';
let contentStudio = fs.readFileSync(pathStudio, 'utf8');

// Replace imports
contentStudio = contentStudio.replace(/import \{ db, collection, addDoc, serverTimestamp, doc, updateDoc \} from '\.\.\/\.\.\/\.\.\/firebase';\n/, "import { supabase } from '../../../supabase';\n");

// Replace analyzeWebsite firebase function
contentStudio = contentStudio.replace(
/\/\/ 1\. Call the server-side analyzeWebsite Cloud Function[\s\S]*?\/\/    This uses OpenRouter \+ Gemini to analyze the URL directly[\s\S]*?const \{ getFunctions, httpsCallable \} = await import\('firebase\/functions'\);[\s\S]*?const functions = getFunctions\(\);[\s\S]*?const analyzeWebsiteFn = httpsCallable\(functions, 'agencyOnboarding-analyzeWebsite', \{ timeout: 60000 \}\);[\s\S]*?const response = await analyzeWebsiteFn\(\{ url \}\);[\s\S]*?const cfData = response\.data as \{ success: boolean; result: any \};/,
`// 1. Call the server-side analyzeWebsite Edge Function
            //    This uses OpenRouter + Gemini to analyze the URL directly
            const { data: response, error } = await supabase.functions.invoke('agencyOnboarding-analyzeWebsite', {
                body: { url }
            });

            if (error) throw error;
            const cfData = response as { success: boolean; result: any };`
);

fs.writeFileSync(pathStudio, contentStudio);
console.log('Migrated useAIWebsiteStudio.ts');
