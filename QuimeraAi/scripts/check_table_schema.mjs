import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://elfcrnhffuvntlfuvumd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase.rpc('get_table_schema', { table_name: 'projects' });
  if (error) {
    console.error("RPC Error:", error.message);
    // fallback, try inserting something invalid
    const res = await supabase.from('projects').insert({ id: 'proj_123', name: 'test' });
    console.log("Insert result:", res.error?.message || "Success");
  } else {
    console.log(data);
  }
}
main();
