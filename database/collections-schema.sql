-- Collections System for Tastoria
-- Run this SQL in your Supabase SQL Editor

-- Update the saved_recipes table to include collection_id
ALTER TABLE saved_recipes 
ADD COLUMN collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;

-- Create collections table
CREATE TABLE collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Ensure unique collection names per user
  UNIQUE(user_id, name)
);

-- Enable RLS on collections
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Collections policies
CREATE POLICY "Users can view their own collections" ON collections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own collections" ON collections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections" ON collections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections" ON collections
  FOR DELETE USING (auth.uid() = user_id);

-- Create a default "All Recipes" collection for existing users
INSERT INTO collections (user_id, name, description)
SELECT id, 'All Recipes', 'Default collection for all saved recipes'
FROM auth.users
WHERE id NOT IN (SELECT DISTINCT user_id FROM collections WHERE name = 'All Recipes');

-- Update existing saved_recipes to use the default collection
UPDATE saved_recipes 
SET collection_id = (
  SELECT collections.id 
  FROM collections 
  WHERE collections.user_id = saved_recipes.user_id 
  AND collections.name = 'All Recipes'
)
WHERE collection_id IS NULL;

-- Create updated_at trigger for collections
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_collections_updated_at 
  BEFORE UPDATE ON collections 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
