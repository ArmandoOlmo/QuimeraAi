import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyBs_MbMSN6BCD1yrZ8SpCoa07DcZm2rmsM",
  authDomain: "quimera.ai",
  projectId: "quimeraai",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const ids = ["JQCYR5RSx0UZo9atof9VbEWP0w83", "tenant_JQCYR5RSx0UZo9atof9VbEWP0w83"];
  for (const id of ids) {
    console.log("Checking tenant ID:", id);
    try {
      const snap = await getDoc(doc(db, 'tenants', id));
      if (snap.exists()) {
        console.log("Found Firestore tenant:", JSON.stringify(snap.data(), null, 2));
      } else {
        console.log("Not found in Firestore.");
      }
    } catch(e) {
      console.error("Firestore error:", e);
    }
  }

  // Also check Supabase using the local setup if possible
  // We can just use fetch directly
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://elfcrnhffuvntlfuvumd.supabase.co";
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_-VxD8lvDXE-C4IzXu43QiQ_kTHRcPpS";

  for (const id of ids) {
    console.log("Checking Supabase subscriptions for:", id);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/subscriptions?tenant_id=eq.${id}&select=*`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      const data = await res.json();
      console.log("Supabase response:", JSON.stringify(data, null, 2));
    } catch(e) {
      console.error("Supabase fetch error:", e);
    }
  }
  
  process.exit(0);
}
check().catch(console.error);
