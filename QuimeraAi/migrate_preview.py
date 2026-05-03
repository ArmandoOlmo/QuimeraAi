import re

with open('components/PublicWebsitePreview.tsx', 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { db, doc, getDoc, collection, getDocs, query, orderBy, where, limit } from '../firebase';",
    "import { supabase } from '../supabase';"
)

# 2. Resolving username
old_resolve_username = """            const usersCol = collection(db, 'users');
            const usernameQuery = query(usersCol, where('username', '==', propUsername), limit(1));
            const usernameSnap = await getDocs(usernameQuery);
            
            if (!usernameSnap.empty) {
              const userDoc = usernameSnap.docs[0];
              resolvedUserId = userDoc.id;
              const userData = userDoc.data();
              
              // Try to get default/primary project from user data
              resolvedProjectId = userData.defaultProjectId || userData.primaryProjectId;
              
              if (!resolvedProjectId) {
                // Fallback: get first project from user's projects subcollection
                const projectsCol = collection(db, 'users', resolvedUserId, 'projects');
                const projectsQuery = query(projectsCol, limit(1));
                const projectsSnap = await getDocs(projectsQuery);
                if (!projectsSnap.empty) {
                  resolvedProjectId = projectsSnap.docs[0].id;
                }
              }"""

new_resolve_username = """            const { data: usersData } = await supabase.from('users').select('id, data').eq('data->>username', propUsername).limit(1);
            
            if (usersData && usersData.length > 0) {
              const userDoc = usersData[0];
              resolvedUserId = userDoc.id;
              const userData = userDoc.data || {};
              
              // Try to get default/primary project from user data
              resolvedProjectId = userData.defaultProjectId || userData.primaryProjectId;
              
              if (!resolvedProjectId) {
                // Fallback: get first project from user's projects
                const { data: projectsData } = await supabase.from('projects').select('id').eq('tenant_id', resolvedUserId).limit(1);
                if (projectsData && projectsData.length > 0) {
                  resolvedProjectId = projectsData[0].id;
                } else {
                  const { data: altProjectsData } = await supabase.from('projects').select('id').eq('data->>ownerId', resolvedUserId).limit(1);
                  if (altProjectsData && altProjectsData.length > 0) {
                    resolvedProjectId = altProjectsData[0].id;
                  }
                }
              }"""

content = content.replace(old_resolve_username, new_resolve_username)

# 3. Categories from publicStores
old_public_categories = """            try {
              const publicStoreRef = doc(db, 'publicStores', ssrData.projectId);
              const publicStoreSnap = await getDoc(publicStoreRef);
              if (publicStoreSnap.exists()) {
                const psData = publicStoreSnap.data();"""

new_public_categories = """            try {
              const { data: publicStoreSnap } = await supabase.from('public_stores').select('data').eq('id', ssrData.projectId).single();
              if (publicStoreSnap) {
                const psData = publicStoreSnap.data;"""
content = content.replace(old_public_categories, new_public_categories)

# 4. Categories from users/projects
old_user_categories = """                  if (userId) {
                    const userProjectRef = doc(db, 'users', userId, 'projects', ssrData.projectId);
                    const userProjectSnap = await getDoc(userProjectRef);
                    if (userProjectSnap.exists()) {
                      const upData = userProjectSnap.data();"""

new_user_categories = """                  if (userId) {
                    const { data: userProjectSnap } = await supabase.from('projects').select('data').eq('id', ssrData.projectId).single();
                    if (userProjectSnap) {
                      const upData = userProjectSnap.data;"""
content = content.replace(old_user_categories, new_user_categories)

# 5. Fetch posts from publicStores (SSR fallback)
old_posts_ssr = """            try {
              const publicPostsCol = collection(db, 'publicStores', ssrData.projectId, 'posts');
              const publicPostsQuery = query(publicPostsCol, orderBy('publishedAt', 'desc'));
              const publicPostsSnap = await getDocs(publicPostsQuery);

              if (!publicPostsSnap.empty) {
                const posts = publicPostsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CMSPost));"""

new_posts_ssr = """            try {
              const { data: publicPostsSnap } = await supabase.from('project_posts').select('id, data').eq('data->>projectId', ssrData.projectId).order('data->>publishedAt', { ascending: false });

              if (publicPostsSnap && publicPostsSnap.length > 0) {
                const posts = publicPostsSnap.map((d: any) => ({ id: d.id, ...d.data } as CMSPost));"""
content = content.replace(old_posts_ssr, new_posts_ssr)

# 6. Non-SSR path publicStores
old_non_ssr = """            const publicStoreRef = doc(db, 'publicStores', projectId);
            const publicPostsCol = collection(db, 'publicStores', projectId, 'posts');
            const publicPostsQuery = query(publicPostsCol, orderBy('publishedAt', 'desc'));

            // Fire both in parallel
            const [publicStoreSnap, publicPostsSnap] = await Promise.all([
              getDoc(publicStoreRef),
              getDocs(publicPostsQuery),
            ]);

            if (publicStoreSnap.exists()) {
              const rawData = publicStoreSnap.data();
              projectData = { id: publicStoreSnap.id, ...rawData } as Project;
              console.log('[PublicWebsitePreview] ✅ Loaded from publicStores. Has categories?', !!(rawData as any)?.categories, 'Count:', (rawData as any)?.categories?.length || 0);
            }

            if (!publicPostsSnap.empty) {
              const posts = publicPostsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CMSPost));
              setCmsPosts(posts);
            }"""

new_non_ssr = """            const [publicStoreRes, publicPostsRes] = await Promise.all([
              supabase.from('public_stores').select('id, data').eq('id', projectId).single(),
              supabase.from('project_posts').select('id, data').eq('data->>projectId', projectId).order('data->>publishedAt', { ascending: false })
            ]);

            if (publicStoreRes.data) {
              const rawData = publicStoreRes.data.data;
              projectData = { id: publicStoreRes.data.id, ...rawData } as Project;
              console.log('[PublicWebsitePreview] ✅ Loaded from publicStores. Has categories?', !!(rawData as any)?.categories, 'Count:', (rawData as any)?.categories?.length || 0);
            }

            if (publicPostsRes.data && publicPostsRes.data.length > 0) {
              const posts = publicPostsRes.data.map((d: any) => ({ id: d.id, ...d.data } as CMSPost));
              setCmsPosts(posts);
            }"""
content = content.replace(old_non_ssr, new_non_ssr)

# 7. User's projects (step 2)
old_step_2 = """          try {
            const projectRef = doc(db, 'users', userId, 'projects', projectId);
            const projectSnap = await getDoc(projectRef);
            if (projectSnap.exists()) {
              projectData = { id: projectSnap.id, ...projectSnap.data() } as Project;
            }
          } catch (e) {"""

new_step_2 = """          try {
            const { data: projectSnap } = await supabase.from('projects').select('id, data').eq('id', projectId).single();
            if (projectSnap) {
              projectData = { id: projectSnap.id, ...projectSnap.data } as Project;
            }
          } catch (e) {"""
content = content.replace(old_step_2, new_step_2)

# 8. Templates (step 3)
old_step_3 = """          try {
            const templateRef = doc(db, 'templates', projectId);
            const templateSnap = await getDoc(templateRef);
            if (templateSnap.exists()) {
              projectData = { id: templateSnap.id, ...templateSnap.data() } as Project;
            }
          } catch (e) {"""

new_step_3 = """          try {
            const { data: templateSnap } = await supabase.from('templates').select('id, data').eq('id', projectId).single();
            if (templateSnap) {
              projectData = { id: templateSnap.id, ...templateSnap.data } as Project;
            }
          } catch (e) {"""
content = content.replace(old_step_3, new_step_3)

# 9. Tenant branding
old_tenant = """          const ownerUserId = projectData.userId || userId;
          if (ownerUserId) {
            getDoc(doc(db, 'tenants', `tenant_${ownerUserId}`)).then(snap => {
              if (snap.exists()) {
                const d = snap.data();
                if (d?.branding?.companyName || d?.branding?.logoUrl) {
                  setHasWhiteLabelBranding(true);
                }
              }
            }).catch(() => { });
          }"""

new_tenant = """          const ownerUserId = projectData.userId || userId;
          if (ownerUserId) {
            supabase.from('tenants').select('data').eq('id', `tenant_${ownerUserId}`).single().then(res => {
              if (res.data) {
                const d = res.data.data;
                if (d?.branding?.companyName || d?.branding?.logoUrl) {
                  setHasWhiteLabelBranding(true);
                }
              }
            }).catch(() => { });
          }"""
content = content.replace(old_tenant, new_tenant)

# 10. Draft CMS posts
old_draft_posts = """            try {
              const draftPostsCol = collection(db, 'users', userId, 'projects', projectId, 'posts');
              const draftPostsQuery = query(draftPostsCol, orderBy('publishedAt', 'desc'));
              const draftPostsSnap = await getDocs(draftPostsQuery);
              if (!draftPostsSnap.empty) {
                setCmsPosts(draftPostsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CMSPost)));
              }
            } catch (e) {"""

new_draft_posts = """            try {
              const { data: draftPostsSnap } = await supabase.from('project_posts').select('id, data').eq('data->>projectId', projectId).order('data->>publishedAt', { ascending: false });
              if (draftPostsSnap && draftPostsSnap.length > 0) {
                setCmsPosts(draftPostsSnap.map((d: any) => ({ id: d.id, ...d.data } as CMSPost)));
              }
            } catch (e) {"""
content = content.replace(old_draft_posts, new_draft_posts)

# 11. User project categories
old_user_cats = """              const userProjectRef = doc(db, 'users', userId, 'projects', projectId);
              const userProjectSnap = await getDoc(userProjectRef);
              if (userProjectSnap.exists()) {
                const userProjectData = userProjectSnap.data();"""

new_user_cats = """              const { data: userProjectSnap } = await supabase.from('projects').select('data').eq('id', projectId).single();
              if (userProjectSnap) {
                const userProjectData = userProjectSnap.data;"""
content = content.replace(old_user_cats, new_user_cats)

# 12. Fetch specific post directly
old_fetch_direct = """            // Try publicStores first (Published content)
            const publicPostsRef = collection(db, 'publicStores', project.id, 'posts');
            const q = query(publicPostsRef, where('slug', '==', slug), limit(1));
            const snap = await getDocs(q);

            if (!snap.empty) {
              const fetchedPost = { id: snap.docs[0].id, ...snap.docs[0].data() } as CMSPost;"""

new_fetch_direct = """            // Try directly from project_posts
            const { data: snap } = await supabase.from('project_posts').select('id, data').eq('data->>projectId', project.id).eq('data->>slug', slug).limit(1);

            if (snap && snap.length > 0) {
              const fetchedPost = { id: snap[0].id, ...snap[0].data } as CMSPost;"""
content = content.replace(old_fetch_direct, new_fetch_direct)

with open('components/PublicWebsitePreview.tsx', 'w') as f:
    f.write(content)

print("Migration script completed.")
