import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://elfcrnhffuvntlfuvumd.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error("No anon key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('global_settings').select('*').eq('id', 'landingPage');
  if (error) console.error("Error:", error);
  console.log("global_settings data:", JSON.stringify(data, null, 2));
}

check();
