-- Create trial_fingerprints table
CREATE TABLE IF NOT EXISTS trial_fingerprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fingerprint_hash TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  screen_resolution TEXT,
  timezone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trial_used BOOLEAN DEFAULT FALSE,
  trial_start_date TIMESTAMP WITH TIME ZONE,
  trial_end_date TIMESTAMP WITH TIME ZONE
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_trial_fingerprints_hash ON trial_fingerprints(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_trial_fingerprints_ip ON trial_fingerprints(ip_address);
CREATE INDEX IF NOT EXISTS idx_trial_fingerprints_user ON trial_fingerprints(user_id);

-- Add RLS policies
ALTER TABLE trial_fingerprints ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own fingerprint data
CREATE POLICY "Users can read own fingerprint data" ON trial_fingerprints
  FOR SELECT USING (auth.uid() = user_id);

-- Allow service role to insert/update fingerprint data
CREATE POLICY "Service role can manage fingerprints" ON trial_fingerprints
  FOR ALL USING (auth.role() = 'service_role');
