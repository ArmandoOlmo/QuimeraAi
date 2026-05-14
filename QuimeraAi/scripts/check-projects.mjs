import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://elfcrnhffuvntlfuvumd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('projects').select('id, name').eq('user_id', '26d2676a-4a96-40cd-ae0a-9e6a863fa601');
  console.log("Projects in Supabase:", data, error);
}
check();
