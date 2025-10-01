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

    // Get the "All Recipes" collection
    const { data: allRecipesCollection } = await supabase
      .from('collections')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', 'All Recipes')
      .single()

    const { data, error } = await supabase
      .from('saved_recipes')
      .insert([
        {
          user_id: user.id,
          recipe_url: url,
          recipe_data: recipe,
          title: recipe.title,
          collection_id: allRecipesCollection?.id || null
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

export async function isRecipeSaved(url: string): Promise<{ data: boolean, recipeId: string | null, error: unknown }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: false, recipeId: null, error: null }
    }

    const { data, error } = await supabase
      .from('saved_recipes')
      .select('id')
      .eq('user_id', user.id)
      .eq('recipe_url', url)
      .single()

    return { 
      data: !!data, 
      recipeId: data?.id || null, 
      error: error?.code === 'PGRST116' ? null : error 
    }
  } catch (error) {
    return { data: false, recipeId: null, error }
  }
}

export async function updateRecipeTitle(recipeId: string, newTitle: string): Promise<{ error: unknown }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: { message: 'User not authenticated' } }
    }

    // First get the current recipe data
    const { data: currentRecipe, error: fetchError } = await supabase
      .from('saved_recipes')
      .select('recipe_data')
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      return { error: fetchError }
    }

    // Update the title in recipe_data
    const updatedRecipeData = {
      ...currentRecipe.recipe_data,
      title: newTitle
    }

    // Update both the title field and the title in recipe_data
    const { error } = await supabase
      .from('saved_recipes')
      .update({ 
        title: newTitle,
        recipe_data: updatedRecipeData
      })
      .eq('id', recipeId)
      .eq('user_id', user.id)

    return { error }
  } catch (error) {
    return { error }
  }
}

export async function updateRecipeCustomPreview(
  recipeId: string, 
  customPreview: { type: 'emoji' | 'image'; value: string; gradient?: string } | null
): Promise<{ data: SavedRecipe | null, error: unknown }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } }
    }

    // Get the current recipe
    const { data: currentRecipe, error: fetchError } = await supabase
      .from('saved_recipes')
      .select('*')
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !currentRecipe) {
      return { data: null, error: fetchError || { message: 'Recipe not found' } }
    }

    // Update the recipe data with custom preview
    const updatedRecipeData = {
      ...currentRecipe.recipe_data,
      metadata: {
        ...currentRecipe.recipe_data.metadata,
        customPreview: customPreview
      }
    }

    // Update the recipe in the database
    const { data, error } = await supabase
      .from('saved_recipes')
      .update({ recipe_data: updatedRecipeData })
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export async function updateRecipeInstructions(
  recipeId: string, 
  instructions: string[]
): Promise<{ data: SavedRecipe | null, error: unknown }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } }
    }

    // First get the current recipe data
    const { data: currentRecipe, error: fetchError } = await supabase
      .from('saved_recipes')
      .select('recipe_data')
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      return { data: null, error: fetchError }
    }

    if (!currentRecipe) {
      return { data: null, error: { message: 'Recipe not found' } }
    }

    // Update the instructions in the recipe data
    const updatedRecipeData = {
      ...currentRecipe.recipe_data,
      instructions: instructions
    }

    // Update the recipe in the database
    const { data, error } = await supabase
      .from('saved_recipes')
      .update({ recipe_data: updatedRecipeData })
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}
