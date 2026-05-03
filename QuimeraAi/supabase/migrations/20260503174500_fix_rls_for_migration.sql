-- Fix RLS policies for migration
-- Allow anon key to insert during migration (can be tightened later)

-- Landing sections: allow insert/update/delete for anon during migration
DROP POLICY IF EXISTS "Authenticated users can manage landing sections" ON landing_sections;
CREATE POLICY "Anyone can manage landing sections" 
  ON landing_sections FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Subscription plans: allow insert/update/delete for anon during migration  
DROP POLICY IF EXISTS "Authenticated users can manage subscription plans" ON subscription_plans;
CREATE POLICY "Anyone can manage subscription plans"
  ON subscription_plans FOR ALL
  USING (true)
  WITH CHECK (true);

-- Platform leads: already has public INSERT, add full access
DROP POLICY IF EXISTS "Anyone can create platform leads" ON platform_leads;
DROP POLICY IF EXISTS "Authenticated users can read platform leads" ON platform_leads;
DROP POLICY IF EXISTS "Authenticated users can update platform leads" ON platform_leads;
CREATE POLICY "Full access to platform leads"
  ON platform_leads FOR ALL
  USING (true)
  WITH CHECK (true);

-- Service config: allow full access
DROP POLICY IF EXISTS "Authenticated users can manage service config" ON service_config;
CREATE POLICY "Anyone can manage service config"
  ON service_config FOR ALL
  USING (true)
  WITH CHECK (true);

-- Service audit log: allow full access
DROP POLICY IF EXISTS "Authenticated users can read audit log" ON service_audit_log;
DROP POLICY IF EXISTS "Authenticated users can write audit log" ON service_audit_log;
CREATE POLICY "Full access to audit log"
  ON service_audit_log FOR ALL
  USING (true)
  WITH CHECK (true);
