import { supabase } from './supabase'
import type { Recipe } from './recipe-parser'

export interface SavedRecipe {
  id: string
  user_id: string
  recipe_url: string
  recipe_data: Recipe
  title: string
  created_at: string
}

export async function saveRecipe(recipe: Recipe, url: string): Promise<{ data: SavedRecipe | null, error: unknown }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } }
    }

    const { data, error } = await supabase
      .from('saved_recipes')
      .insert([
        {
          user_id: user.id,
          recipe_url: url,
          recipe_data: recipe,
          title: recipe.title
        }
      ])
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export async function getSavedRecipes(): Promise<{ data: SavedRecipe[] | null, error: unknown }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } }
    }

    const { data, error } = await supabase
      .from('saved_recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export async function deleteSavedRecipe(recipeId: string): Promise<{ error: unknown }> {
  try {
    const { error } = await supabase
      .from('saved_recipes')
      .delete()
      .eq('id', recipeId)

    return { error }
  } catch (error) {
    return { error }
  }
}

export async function isRecipeSaved(url: string): Promise<{ data: boolean, error: unknown }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: false, error: null }
    }

    const { data, error } = await supabase
      .from('saved_recipes')
      .select('id')
      .eq('user_id', user.id)
      .eq('recipe_url', url)
      .single()

    return { data: !!data, error: error?.code === 'PGRST116' ? null : error }
  } catch (error) {
    return { data: false, error }
  }
}
