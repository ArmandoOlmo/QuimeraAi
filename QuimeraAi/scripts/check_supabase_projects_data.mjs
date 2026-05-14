import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://elfcrnhffuvntlfuvumd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, data')
    .eq('user_id', '26d2676a-4a96-40cd-ae0a-9e6a863fa601');

  if (error) {
    console.error(error);
  } else {
    data.forEach(p => {
      console.log(`- Supabase ID: ${p.id}`);
      console.log(`  Supabase Name: ${p.name}`);
      console.log(`  Inner data.id: ${p.data?.id}`);
      console.log(`  Has theme?: ${!!p.data?.theme}`);
      console.log(`  Has componentOrder?: ${!!p.data?.componentOrder}`);
      console.log(`  Has data.data?: ${!!p.data?.data}`);
    });
  }
}
main();
