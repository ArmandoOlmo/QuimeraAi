-- Create Storage buckets for the platform

-- Create platform-assets bucket for public images and uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('platform-assets', 'platform-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for platform-assets

-- Drop existing policies if they exist to avoid conflicts on re-runs
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;

-- Allow public read access to platform-assets
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'platform-assets' );

-- Allow authenticated users to upload files
CREATE POLICY "Auth Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'platform-assets' AND auth.role() = 'authenticated' );

-- Allow authenticated users to update files
CREATE POLICY "Auth Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'platform-assets' AND auth.role() = 'authenticated' );

-- Allow authenticated users to delete files
CREATE POLICY "Auth Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'platform-assets' AND auth.role() = 'authenticated' );
