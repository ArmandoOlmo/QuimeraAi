import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://elfcrnhffuvntlfuvumd.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: project } = await supabase.from('projects').select('*').eq('id', 'dadcc9ab-5a62-41bc-8458-aec8ba60e420').single();
    if (!project) return console.log("Project not found");
    console.log("Project user_id:", project.user_id);
    
    // Hardcode user ID if we can't find it, or find armando's UUID
    const { data: users } = await supabase.from('users').select('*');
    const user = users.find(u => u.email === 'armando@quimera.ai' || u.role === 'owner');
    
    if (user) {
        console.log("Found user:", user.id, user.email);
        if (project.user_id !== user.id) {
            console.log("Updating project user_id to", user.id);
            const { error } = await supabase.from('projects').update({ user_id: user.id }).eq('id', 'dadcc9ab-5a62-41bc-8458-aec8ba60e420');
            console.log("Update error:", error);
        }
    }
}
run();
