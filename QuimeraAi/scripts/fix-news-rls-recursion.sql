-- scripts/fix-news-rls-recursion.sql

-- 1. Create a SECURITY DEFINER function to read the user role safely
-- This bypasses RLS on the users table, preventing infinite recursion loops.
CREATE OR REPLACE FUNCTION auth_get_user_role() RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- 2. Drop the recursive policies from the news table
DROP POLICY IF EXISTS "Authenticated users can read published news or owners all" ON news;
DROP POLICY IF EXISTS "Owners can insert news" ON news;
DROP POLICY IF EXISTS "Owners can update news" ON news;
DROP POLICY IF EXISTS "Owners can delete news" ON news;

-- 3. Recreate policies using the SECURITY DEFINER function
CREATE POLICY "Authenticated users can read published news or owners all" ON news
    FOR SELECT TO authenticated 
    USING (status = 'published' OR auth_get_user_role() IN ('owner', 'superadmin', 'admin', 'manager'));

CREATE POLICY "Owners can insert news" ON news
    FOR INSERT TO authenticated
    WITH CHECK (auth_get_user_role() IN ('owner', 'superadmin', 'admin', 'manager'));

CREATE POLICY "Owners can update news" ON news
    FOR UPDATE TO authenticated
    USING (auth_get_user_role() IN ('owner', 'superadmin', 'admin', 'manager'))
    WITH CHECK (auth_get_user_role() IN ('owner', 'superadmin', 'admin', 'manager'));

CREATE POLICY "Owners can delete news" ON news
    FOR DELETE TO authenticated
    USING (auth_get_user_role() IN ('owner', 'superadmin', 'admin', 'manager'));
