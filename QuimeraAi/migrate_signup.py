import re

with open('components/SignupFloat.tsx', 'r') as f:
    content = f.read()

# 1. Imports
old_imports = """import {
  db,
  doc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
} from '../firebase';"""
new_imports = """import { supabase } from '../supabase';"""
content = content.replace(old_imports, new_imports)

# 2. Save Lead
old_save_lead = """        } else if (resolvedOwnerId && resolvedProjectId) {
          const leadsPath = `users/${resolvedOwnerId}/projects/${resolvedProjectId}/leads`;
          promises.push(
            addDoc(collection(db, leadsPath), {
              name: formData.name || '',
              email: formData.email || '',
              phone: formData.phone || '',
              source: 'signup-float',
              status: 'new',
              value: 0,
              leadScore: 30,
              tags: ['signup-float', 'website'],
              notes: formData.message ? `Mensaje del formulario de registro:\\n${formData.message}` : '',
              projectId: resolvedProjectId,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          );
        } else {"""

new_save_lead = """        } else if (resolvedOwnerId && resolvedProjectId) {
          promises.push(
            supabase.from('project_leads').insert({
              data: {
                name: formData.name || '',
                email: formData.email || '',
                phone: formData.phone || '',
                source: 'signup-float',
                status: 'new',
                value: 0,
                leadScore: 30,
                tags: ['signup-float', 'website'],
                notes: formData.message ? `Mensaje del formulario de registro:\\n${formData.message}` : '',
                projectId: resolvedProjectId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            }) as any
          );
        } else {"""
content = content.replace(old_save_lead, new_save_lead)

# 3. Save to Audience
old_save_audience = """      if (shouldSaveToAudience && targetAudienceId) {
        if (resolvedOwnerId && resolvedProjectId) {
          const audiencePath = `users/${resolvedOwnerId}/projects/${resolvedProjectId}/emailAudiences/${targetAudienceId}`;
          const audienceDocRef = doc(db, audiencePath);

          promises.push(
            (async () => {
              const snap = await getDoc(audienceDocRef);
              if (!snap.exists()) {
                console.error('[SignupFloat] Target audience not found:', targetAudienceId);
                return;
              }
              const existingMembers = snap.data()?.members || [];
              
              // Avoid duplicates
              const exists = existingMembers.some((m: any) => m.email?.toLowerCase() === formData.email.toLowerCase());
              
              if (formData.email && !exists) {
                const newMember = { email: formData.email, name: formData.name || '', source: 'signup-float' };
                const updatedMembers = [...existingMembers, newMember];
                
                await updateDoc(audienceDocRef, {
                  members: updatedMembers,
                  staticMemberCount: updatedMembers.length,
                  estimatedCount: updatedMembers.length,
                  updatedAt: serverTimestamp(),
                });
                console.log('[SignupFloat] ✅ Added email to audience:', targetAudienceId);
              } else if (exists) {
                console.log('[SignupFloat] Email already exists in audience:', formData.email);
              }
            })()
          );
        } else {"""

new_save_audience = """      if (shouldSaveToAudience && targetAudienceId) {
        if (resolvedOwnerId && resolvedProjectId) {
          promises.push(
            (async () => {
              const { data: snap } = await supabase.from('email_audiences').select('data').eq('data->>projectId', resolvedProjectId).eq('id', targetAudienceId).single();
              if (!snap) {
                console.error('[SignupFloat] Target audience not found:', targetAudienceId);
                return;
              }
              const existingMembers = snap.data?.members || [];
              
              // Avoid duplicates
              const exists = existingMembers.some((m: any) => m.email?.toLowerCase() === formData.email.toLowerCase());
              
              if (formData.email && !exists) {
                const newMember = { email: formData.email, name: formData.name || '', source: 'signup-float' };
                const updatedMembers = [...existingMembers, newMember];
                
                await supabase.from('email_audiences').update({
                  data: {
                    ...snap.data,
                    members: updatedMembers,
                    staticMemberCount: updatedMembers.length,
                    estimatedCount: updatedMembers.length,
                    updatedAt: new Date().toISOString(),
                  }
                }).eq('id', targetAudienceId);
                console.log('[SignupFloat] ✅ Added email to audience:', targetAudienceId);
              } else if (exists) {
                console.log('[SignupFloat] Email already exists in audience:', formData.email);
              }
            })()
          );
        } else {"""
content = content.replace(old_save_audience, new_save_audience)

with open('components/SignupFloat.tsx', 'w') as f:
    f.write(content)

print("Migration script completed.")
