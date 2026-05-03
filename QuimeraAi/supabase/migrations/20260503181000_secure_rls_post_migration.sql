-- Restore secure RLS policies after migration is complete

-- Landing sections:
DROP POLICY IF EXISTS "Anyone can manage landing sections" ON landing_sections;
CREATE POLICY "Authenticated users can manage landing sections"
  ON landing_sections FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Subscription plans:
DROP POLICY IF EXISTS "Anyone can manage subscription plans" ON subscription_plans;
CREATE POLICY "Authenticated users can manage subscription plans"
  ON subscription_plans FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Platform leads:
DROP POLICY IF EXISTS "Full access to platform leads" ON platform_leads;
CREATE POLICY "Anyone can create platform leads"
  ON platform_leads FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Authenticated users can read platform leads"
  ON platform_leads FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update platform leads"
  ON platform_leads FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Service config:
DROP POLICY IF EXISTS "Anyone can manage service config" ON service_config;
CREATE POLICY "Authenticated users can manage service config"
  ON service_config FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Service audit log:
DROP POLICY IF EXISTS "Full access to audit log" ON service_audit_log;
CREATE POLICY "Authenticated users can read audit log"
  ON service_audit_log FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can write audit log"
  ON service_audit_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
