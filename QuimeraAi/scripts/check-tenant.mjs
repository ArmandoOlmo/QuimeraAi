import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://elfcrnhffuvntlfuvumd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: tenant, error } = await supabase.from('tenants').select('id, subscription_plan').eq('owner_user_id', '26d2676a-4a96-40cd-ae0a-9e6a863fa601');
  console.log("Tenant:", tenant, error);
  const { data: sub, error2 } = await supabase.from('subscriptions').select('plan_id').eq('tenant_id', tenant[0]?.id);
  console.log("Subscription:", sub, error2);
}
check();
