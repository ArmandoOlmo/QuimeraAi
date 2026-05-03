import re

with open('components/ChatbotWidget.tsx', 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { db, collection, addDoc, getDocs, getDoc, doc, query, where, orderBy, auth } from '../firebase';",
    "import { supabase } from '../supabase';\nimport { auth } from '../firebase';"
)

# 2. Load CMS Articles
old_articles = """                // Fetch from publicStores (works for both owner and public visitors)
                for (const articleId of articleIds.slice(0, 20)) { // Cap at 20 articles
                    const postRef = doc(db, 'publicStores', activeProject.id, 'posts', articleId);
                    const postSnap = await getDoc(postRef);
                    if (postSnap.exists()) {
                        const postData = postSnap.data();
                        articles.push({
                            id: articleId,
                            title: postData.title || 'Untitled',
                            content: postData.content || postData.excerpt || ''
                        });
                    }
                }"""

new_articles = """                // Fetch from project_posts
                const { data: posts } = await supabase
                    .from('project_posts')
                    .select('id, data')
                    .eq('data->>projectId', activeProject.id)
                    .in('id', articleIds.slice(0, 20));
                
                if (posts) {
                    for (const postSnap of posts) {
                        const postData = postSnap.data;
                        articles.push({
                            id: postSnap.id,
                            title: postData.title || 'Untitled',
                            content: postData.content || postData.excerpt || ''
                        });
                    }
                }"""
content = content.replace(old_articles, new_articles)

# 3. Load appointments
old_appointments = """                const appointmentsRef = collection(db, 'users', user.uid, 'projects', activeProject.id, 'appointments');
                const q = query(appointmentsRef, orderBy('startDate', 'asc'));
                const snapshot = await getDocs(q);

                const appointmentSlots: AppointmentSlot[] = [];
                const now = new Date();

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const startDate = data.startDate?.seconds
                        ? new Date(data.startDate.seconds * 1000)
                        : new Date();
                    const endDate = data.endDate?.seconds
                        ? new Date(data.endDate.seconds * 1000)
                        : new Date(startDate.getTime() + 60 * 60000);"""

new_appointments = """                const { data: snapshot } = await supabase
                    .from('project_appointments')
                    .select('id, data')
                    .eq('data->>projectId', activeProject.id);

                if (!snapshot) return;

                const appointmentSlots: AppointmentSlot[] = [];
                const now = new Date();

                snapshot.forEach((doc: any) => {
                    const data = doc.data;
                    const startDate = data.startDate?.seconds
                        ? new Date(data.startDate.seconds * 1000)
                        : data.startDate ? new Date(data.startDate) : new Date();
                    const endDate = data.endDate?.seconds
                        ? new Date(data.endDate.seconds * 1000)
                        : data.endDate ? new Date(data.endDate) : new Date(startDate.getTime() + 60 * 60000);"""
content = content.replace(old_appointments, new_appointments)

# 4. Create appointment
old_create_appointment_setup = """                // Convert dates to Firestore timestamps
                const dateToTimestamp = (date: Date) => ({
                    seconds: Math.floor(date.getTime() / 1000),
                    nanoseconds: 0
                });

                const now = dateToTimestamp(new Date());"""

new_create_appointment_setup = """                const now = new Date().toISOString();"""
content = content.replace(old_create_appointment_setup, new_create_appointment_setup)

old_appointment_doc = """                    startDate: dateToTimestamp(appointmentData.startDate),
                    endDate: dateToTimestamp(appointmentData.endDate),"""

new_appointment_doc = """                    startDate: appointmentData.startDate.toISOString(),
                    endDate: appointmentData.endDate.toISOString(),"""
content = content.replace(old_appointment_doc, new_appointment_doc)

old_save_appointment = """                // Save to Firestore: users/{userId}/projects/{projectId}/appointments
                const appointmentsRef = collection(db, 'users', ownerId, 'projects', projectId, 'appointments');
                const docRef = await addDoc(appointmentsRef, appointmentDoc);

                console.log('[ChatbotWidget] ✅ Appointment created via Firestore:', docRef.id);"""

new_save_appointment = """                // Save to project_appointments
                const { data: docRef, error: apptError } = await supabase
                    .from('project_appointments')
                    .insert({ data: appointmentDoc })
                    .select('id')
                    .single();
                
                if (apptError || !docRef) throw new Error('Failed to create appointment');

                console.log('[ChatbotWidget] ✅ Appointment created via Supabase:', docRef.id);"""
content = content.replace(old_save_appointment, new_save_appointment)

# 5. Create lead from appointment
old_save_lead = """                            // Write directly to Firestore since we are the owner (e.g. in standalone preview)
                            const leadsRef = collection(db, 'users', ownerId, 'projects', projectId, 'leads');
                            const leadDocRef = await addDoc(leadsRef, {
                                ...leadData,
                                createdAt: now,
                                createdBy: user.uid,
                                projectId: projectId
                            });
                            console.log('[ChatbotWidget] ✅ Lead created from appointment via Firestore:', leadDocRef.id);"""

new_save_lead = """                            // Write directly to project_leads since we are the owner (e.g. in standalone preview)
                            const { data: leadDocRef } = await supabase
                                .from('project_leads')
                                .insert({
                                    data: {
                                        ...leadData,
                                        createdAt: now,
                                        createdBy: user.uid,
                                        projectId: projectId
                                    }
                                })
                                .select('id')
                                .single();
                            if (leadDocRef) {
                                console.log('[ChatbotWidget] ✅ Lead created from appointment via Supabase:', leadDocRef.id);
                            }"""
content = content.replace(old_save_lead, new_save_lead)


with open('components/ChatbotWidget.tsx', 'w') as f:
    f.write(content)

print("Migration script completed.")
