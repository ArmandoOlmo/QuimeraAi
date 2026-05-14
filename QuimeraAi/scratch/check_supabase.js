const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://elfcrnhffuvntlfuvumd.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_-VxD8lvDXE-C4IzXu43QiQ_kTHRcPpS";

async function check() {
  console.log("Fetching all tenants from Supabase to find sixtomedia...");
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/tenants?select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const tenants = await res.json();
    if (Array.isArray(tenants)) {
        const found = tenants.filter(t => JSON.stringify(t).toLowerCase().includes("sixtomedia"));
        console.log(`Found ${found.length} matching tenants:`, JSON.stringify(found, null, 2));
        
        // Let's also check their subscriptions!
        for (const t of found) {
            console.log(`Checking subscriptions for tenant ${t.id}...`);
            const subRes = await fetch(`${supabaseUrl}/rest/v1/subscriptions?tenant_id=eq.${t.id}&select=*`, {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              }
            });
            const sub = await subRes.json();
            console.log(`Subscriptions for ${t.id}:`, JSON.stringify(sub, null, 2));
        }
    } else {
        console.log("Error or not array:", tenants);
    }
  } catch(e) {
    console.error("Supabase fetch error:", e);
  }
}
check().catch(console.error);
