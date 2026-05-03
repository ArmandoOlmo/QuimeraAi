import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://elfcrnhffuvntlfuvumd.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase.rpc('get_tables'); // Or try querying pg_catalog if rpc doesn't exist
  console.log("Error:", error);
}

check();
