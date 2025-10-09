-- Add profile_image_url column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_profile_image_url ON profiles(profile_image_url);

-- Update existing profiles to have null profile_image_url (optional)
-- UPDATE profiles SET profile_image_url = NULL WHERE profile_image_url IS NULL;
