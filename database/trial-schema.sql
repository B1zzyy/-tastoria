-- Add trial and subscription fields to profiles table
-- Run this in your Supabase SQL editor

-- Add new columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'paid', 'expired')),
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_start_date ON profiles(trial_start_date);

-- Update existing users to have trial status
UPDATE profiles 
SET 
  trial_start_date = COALESCE(trial_start_date, created_at),
  subscription_status = COALESCE(subscription_status, 'trial')
WHERE trial_start_date IS NULL OR subscription_status IS NULL;
