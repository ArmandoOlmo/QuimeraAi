const fs = require('fs');
const path = '/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi/components/cms/modern/ModernCMSEditor.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace imports
content = content.replace(/import \{ storage \} from '\.\.\/\.\.\/\.\.\/firebase';\n/, "import { supabase } from '../../../supabase';\n");
content = content.replace(/import \{ ref as storageRef, uploadBytesResumable, getDownloadURL, uploadBytes \} from 'firebase\/storage';\n/, "");

// Audio upload (line 528-537 approx)
content = content.replace(
/const storagePath = `cms_podcast\/\$\{user\?\.uid \|\| 'unknown'\}\/\$\{activeProject\?\.id \|\| 'unknown'\}\/\$\{timestamp\}_\$\{safeFileName\}`;[\s\S]*?const fileRef = storageRef\(storage, storagePath\);[\s\S]*?await uploadBytes\(fileRef, file\);[\s\S]*?const downloadUrl = await getDownloadURL\(fileRef\);/,
`const storagePath = \`\${user?.uid || 'unknown'}/\${activeProject?.id || 'unknown'}/\${timestamp}_\${safeFileName}\`;
            const { error: uploadError } = await supabase.storage.from('cms_podcast').upload(storagePath, file);
            if (uploadError) throw uploadError;
            const { data: publicUrlData } = supabase.storage.from('cms_podcast').getPublicUrl(storagePath);
            const downloadUrl = publicUrlData.publicUrl;`
);

// Audio drop (line 555-564 approx)
content = content.replace(
/const storagePath = `cms_podcast\/\$\{user\?\.uid \|\| 'unknown'\}\/\$\{activeProject\?\.id \|\| 'unknown'\}\/\$\{timestamp\}_\$\{safeFileName\}`;[\s\S]*?const fileRef = storageRef\(storage, storagePath\);[\s\S]*?await uploadBytes\(fileRef, file\);[\s\S]*?const downloadUrl = await getDownloadURL\(fileRef\);/,
`const storagePath = \`\${user?.uid || 'unknown'}/\${activeProject?.id || 'unknown'}/\${timestamp}_\${safeFileName}\`;
            const { error: uploadError } = await supabase.storage.from('cms_podcast').upload(storagePath, file);
            if (uploadError) throw uploadError;
            const { data: publicUrlData } = supabase.storage.from('cms_podcast').getPublicUrl(storagePath);
            const downloadUrl = publicUrlData.publicUrl;`
);

// Video upload (line 579-598 approx)
content = content.replace(
/const storagePath = `cms_video\/\$\{user\?\.uid \|\| 'unknown'\}\/\$\{activeProject\?\.id \|\| 'unknown'\}\/\$\{timestamp\}_\$\{safeFileName\}`;[\s\S]*?console\.log\('\[Video Upload\] Storage path:', storagePath\);[\s\S]*?const fileRef = storageRef\(storage, storagePath\);[\s\S]*?const uploadTask = uploadBytesResumable\(fileRef, file\);[\s\S]*?return new Promise\(\(resolve, reject\) => \{[\s\S]*?uploadTask\.on\([\s\S]*?async \(\) => \{[\s\S]*?const downloadUrl = await getDownloadURL\(uploadTask\.snapshot\.ref\);[\s\S]*?setVideoUrl\(downloadUrl\);[\s\S]*?resolve\(\);[\s\S]*?\}\n\s*\);\n\s*\}\);/,
`const storagePath = \`\${user?.uid || 'unknown'}/\${activeProject?.id || 'unknown'}/\${timestamp}_\${safeFileName}\`;
            console.log('[Video Upload] Storage path:', storagePath);
            
            // Supabase doesn't easily support resumable uploads in JS library without TUS yet,
            // so we do a standard upload. For progress, we might need a custom XMLHttpRequest, 
            // but for now we'll do standard upload and set progress to 100 on finish.
            setUploadProgress({ progress: 10, fileName: file.name });
            
            const { error: uploadError } = await supabase.storage.from('cms_video').upload(storagePath, file);
            if (uploadError) {
                console.error('[Video Upload] Supabase error:', uploadError);
                throw uploadError;
            }
            
            setUploadProgress({ progress: 100, fileName: file.name });
            const { data: publicUrlData } = supabase.storage.from('cms_video').getPublicUrl(storagePath);
            const downloadUrl = publicUrlData.publicUrl;
            
            setVideoUrl(downloadUrl);`
);

// Video drop (line 630-649 approx)
content = content.replace(
/const storagePath = `cms_video\/\$\{user\?\.uid \|\| 'unknown'\}\/\$\{activeProject\?\.id \|\| 'unknown'\}\/\$\{timestamp\}_\$\{safeFileName\}`;[\s\S]*?console\.log\('\[Video Drop\] Storage path:', storagePath\);[\s\S]*?const fileRef = storageRef\(storage, storagePath\);[\s\S]*?const uploadTask = uploadBytesResumable\(fileRef, file\);[\s\S]*?return new Promise\(\(resolve, reject\) => \{[\s\S]*?uploadTask\.on\([\s\S]*?async \(\) => \{[\s\S]*?const downloadUrl = await getDownloadURL\(uploadTask\.snapshot\.ref\);[\s\S]*?setVideoUrl\(downloadUrl\);[\s\S]*?resolve\(\);[\s\S]*?\}\n\s*\);\n\s*\}\);/,
`const storagePath = \`\${user?.uid || 'unknown'}/\${activeProject?.id || 'unknown'}/\${timestamp}_\${safeFileName}\`;
            console.log('[Video Drop] Storage path:', storagePath);
            
            setUploadProgress({ progress: 10, fileName: file.name });
            
            const { error: uploadError } = await supabase.storage.from('cms_video').upload(storagePath, file);
            if (uploadError) {
                console.error('[Video Drop] Supabase error:', uploadError);
                throw uploadError;
            }
            
            setUploadProgress({ progress: 100, fileName: file.name });
            const { data: publicUrlData } = supabase.storage.from('cms_video').getPublicUrl(storagePath);
            const downloadUrl = publicUrlData.publicUrl;
            
            setVideoUrl(downloadUrl);`
);

fs.writeFileSync(path, content);
console.log('Migrated ModernCMSEditor.tsx');
