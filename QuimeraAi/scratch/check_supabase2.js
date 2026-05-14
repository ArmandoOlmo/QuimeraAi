const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://elfcrnhffuvntlfuvumd.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_-VxD8lvDXE-C4IzXu43QiQ_kTHRcPpS";

async function check() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/tenants?limit=1&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const tenants = await res.json();
    console.log("Tenant schema sample:", JSON.stringify(tenants, null, 2));
  } catch(e) {
    console.error("Supabase fetch error:", e);
  }
}
check().catch(console.error);
