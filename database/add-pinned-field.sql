-- Add pinned field to saved_recipes table
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE saved_recipes 
ADD COLUMN pinned BOOLEAN DEFAULT FALSE;

-- Create index for better performance when sorting by pinned status
CREATE INDEX idx_saved_recipes_pinned ON saved_recipes(pinned DESC, created_at DESC);
