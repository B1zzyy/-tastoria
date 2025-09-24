-- Fix for existing collections table - only add missing pieces

-- Check if collection_id column exists in saved_recipes, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'saved_recipes' AND column_name = 'collection_id') THEN
        ALTER TABLE saved_recipes 
        ADD COLUMN collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create a default "All Recipes" collection for existing users (if they don't have one)
INSERT INTO collections (user_id, name, description)
SELECT id, 'All Recipes', 'Default collection for all saved recipes'
FROM auth.users
WHERE id NOT IN (SELECT DISTINCT user_id FROM collections WHERE name = 'All Recipes');

-- Update existing saved_recipes to use the default collection (only if they don't have a collection assigned)
UPDATE saved_recipes 
SET collection_id = (
  SELECT collections.id 
  FROM collections 
  WHERE collections.user_id = saved_recipes.user_id 
  AND collections.name = 'All Recipes'
)
WHERE collection_id IS NULL;
