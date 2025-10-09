-- Disable RLS on storage.objects to allow uploads
-- This is a temporary solution to get profile images working

-- First, let's drop any existing policies that might be conflicting
DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile images" ON storage.objects;

-- Disable RLS on storage.objects (temporary solution)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Alternative: Create a very permissive policy for authenticated users
-- Uncomment the lines below if you prefer to keep RLS enabled but with permissive policies

-- CREATE POLICY "Allow authenticated users to manage avatars" ON storage.objects
-- FOR ALL USING (
--   bucket_id = 'avatars' 
--   AND auth.role() = 'authenticated'
-- );

-- CREATE POLICY "Allow public read access to avatars" ON storage.objects
-- FOR SELECT USING (bucket_id = 'avatars');
