import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface User {
  id: string
  email: string
  name: string
  created_at: string
}

export interface Collection {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface SavedRecipe {
  id: string
  user_id: string
  collection_id: string | null
  recipe_url: string
  recipe_data: Record<string, unknown> // The parsed recipe object
  title: string
  created_at: string
}
