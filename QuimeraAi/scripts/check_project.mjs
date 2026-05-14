import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://elfcrnhffuvntlfuvumd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', 'dadcc9ab-5a62-41bc-8458-aec8ba60e420')
    .single();

  if (error) {
    console.error(error);
  } else {
    console.log("COLUMNS:");
    console.log("id:", data.id);
    console.log("user_id:", data.user_id);
    console.log("tenant_id:", data.tenant_id);
    console.log("name:", data.name);
    console.log("status:", data.status);
    console.log("---");
    console.log("DATA JSON KEYS:");
    console.log(Object.keys(data.data));
    console.log("DATA JSON name:", data.data.name);
  }
}
main();
