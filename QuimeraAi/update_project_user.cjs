const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0]] = parts.slice(1).join('=');
    }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data: project } = await supabase.from('projects').select('*').eq('id', 'dadcc9ab-5a62-41bc-8458-aec8ba60e420').single();
    if (!project) return console.log("Project not found");
    console.log("Project user_id:", project.user_id);
    
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
