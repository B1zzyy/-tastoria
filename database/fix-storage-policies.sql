-- Enable RLS on the avatars storage bucket
-- Note: This needs to be run in the Supabase SQL editor

-- First, let's check if the bucket exists and create policies for it
-- The bucket should already exist from the UI creation

-- Create policy to allow authenticated users to upload their own profile images
CREATE POLICY "Users can upload their own profile images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[2]
  AND auth.role() = 'authenticated'
);

-- Create policy to allow users to update their own profile images
CREATE POLICY "Users can update their own profile images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[2]
  AND auth.role() = 'authenticated'
);

-- Create policy to allow users to delete their own profile images
CREATE POLICY "Users can delete their own profile images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[2]
  AND auth.role() = 'authenticated'
);

-- Create policy to allow public read access to profile images
CREATE POLICY "Public can view profile images" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');
