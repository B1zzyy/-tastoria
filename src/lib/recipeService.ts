import { supabase } from './supabase'
import type { Recipe } from './recipe-parser'
import { recipeCache } from './recipeCache'

export interface SavedRecipe {
  id: string
  user_id: string
  recipe_url: string
  recipe_data: Recipe
  title: string
  created_at: string
  pinned?: boolean
}

export async function saveRecipe(recipe: Recipe, url: string): Promise<{ data: SavedRecipe | null, error: unknown }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } }
    }

    // Normalize Facebook URLs for consistent database storage
    let normalizedUrl = url;
    if (url.includes('facebook.com') || url.includes('fb.com')) {
      // Handle share URLs - DON'T normalize these, let the API resolve them
      const shareMatch = url.match(/(?:facebook\.com|fb\.com)\/share\/r\/([A-Za-z0-9_-]+)/);
      if (shareMatch) {
        // Keep the original share URL for API resolution
        normalizedUrl = url;
      } else {
        // Handle regular URLs
        const postIdMatch = url.match(/(?:facebook\.com|fb\.com)\/(?:reel|posts|videos|watch)\/([A-Za-z0-9_-]+)/);
        if (postIdMatch) {
          normalizedUrl = `https://www.facebook.com/reel/${postIdMatch[1]}`;
        }
      }
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
          recipe_url: normalizedUrl,
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

    // Invalidate cache after successful deletion
    if (!error) {
      recipeCache.invalidate(recipeId)
    }

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

    // Normalize Facebook URLs for consistent database queries
    let normalizedUrl = url;
    if (url.includes('facebook.com') || url.includes('fb.com')) {
      // Handle share URLs - DON'T normalize these, let the API resolve them
      const shareMatch = url.match(/(?:facebook\.com|fb\.com)\/share\/r\/([A-Za-z0-9_-]+)/);
      if (shareMatch) {
        // Keep the original share URL for API resolution
        normalizedUrl = url;
      } else {
        // Handle regular URLs
        const postIdMatch = url.match(/(?:facebook\.com|fb\.com)\/(?:reel|posts|videos|watch)\/([A-Za-z0-9_-]+)/);
        if (postIdMatch) {
          normalizedUrl = `https://www.facebook.com/reel/${postIdMatch[1]}`;
        }
      }
    }

    console.log('🔍 isRecipeSaved - Original URL:', url);
    console.log('🔍 isRecipeSaved - Normalized URL:', normalizedUrl);
    console.log('🔍 isRecipeSaved - User ID:', user.id);

    const { data, error } = await supabase
      .from('saved_recipes')
      .select('id')
      .eq('user_id', user.id)
      .eq('recipe_url', normalizedUrl)
      .single()

    console.log('🔍 isRecipeSaved - Query result:', { data, error });

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

    // Invalidate cache after successful update
    if (!error) {
      recipeCache.invalidate(recipeId)
    }

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

    // Invalidate cache after successful update
    recipeCache.invalidate(recipeId)

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
    console.log('🔧 updateRecipeInstructions called with:', { recipeId, instructions });
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('❌ User not authenticated');
      return { data: null, error: { message: 'User not authenticated' } }
    }

    console.log('👤 User authenticated:', user.id);

    // First get the current recipe data
    const { data: currentRecipe, error: fetchError } = await supabase
      .from('saved_recipes')
      .select('recipe_data')
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching current recipe:', fetchError);
      return { data: null, error: fetchError }
    }

    if (!currentRecipe) {
      console.error('❌ Recipe not found');
      return { data: null, error: { message: 'Recipe not found' } }
    }

    console.log('📄 Current recipe data:', currentRecipe.recipe_data);

    // Update the instructions in the recipe data
    const updatedRecipeData = {
      ...currentRecipe.recipe_data,
      instructions: instructions
    }

    console.log('💾 Updated recipe data:', updatedRecipeData);

    // Update the recipe in the database
    const { data, error } = await supabase
      .from('saved_recipes')
      .update({ recipe_data: updatedRecipeData })
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('❌ Database update error:', error);
      return { data: null, error }
    }

    console.log('✅ Database update successful:', data);

    // Invalidate cache after successful update
    recipeCache.invalidate(recipeId)

    return { data, error: null }
  } catch (error) {
    console.error('❌ Exception in updateRecipeInstructions:', error);
    return { data: null, error }
  }
}

export async function updateRecipeIngredients(
  recipeId: string, 
  ingredients: string[] | Recipe['ingredients']
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

    // Update the ingredients in the recipe data
    const updatedRecipeData = {
      ...currentRecipe.recipe_data,
      ingredients: ingredients
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

    // Invalidate cache after successful update
    recipeCache.invalidate(recipeId)

    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export async function togglePinRecipe(recipeId: string): Promise<{ data: SavedRecipe | null, error: unknown }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } }
    }

    // First get the current pinned status
    const { data: currentRecipe, error: fetchError } = await supabase
      .from('saved_recipes')
      .select('pinned')
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      return { data: null, error: fetchError }
    }

    // Toggle the pinned status
    const { data, error } = await supabase
      .from('saved_recipes')
      .update({ pinned: !currentRecipe.pinned })
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return { data: null, error }
    }

    // Invalidate cache after successful update
    recipeCache.invalidate(recipeId)

    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}