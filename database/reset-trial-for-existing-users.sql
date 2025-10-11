-- Reset 10-day free trial for all existing users
-- This will give all current users a fresh 10-day trial starting from now

-- Update existing users to have a new trial start date (current timestamp)
-- and reset their subscription status to 'trial'
-- EXCLUDES users who are currently 'paid' to preserve active subscriptions
UPDATE profiles 
SET 
  trial_start_date = NOW(),
  subscription_status = 'trial',
  subscription_end_date = NULL
WHERE 
  -- Only update users who are NOT currently paid subscribers
  subscription_status != 'paid'
  AND id IS NOT NULL;

-- Optional: If you want to be more specific and only reset users who are currently 'expired' or 'paid'
-- Uncomment the lines below and comment out the above UPDATE if you prefer this approach:

-- UPDATE profiles 
-- SET 
--   trial_start_date = NOW(),
--   subscription_status = 'trial',
--   subscription_end_date = NULL
-- WHERE 
--   subscription_status IN ('expired', 'paid')
--   OR trial_start_date < NOW() - INTERVAL '10 days';

-- Show the results
SELECT 
  id,
  email,
  name,
  trial_start_date,
  subscription_status,
  subscription_end_date,
  created_at
FROM profiles 
ORDER BY created_at DESC;
