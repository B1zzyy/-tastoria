import { supabase } from './supabase';
import type { Recipe } from './recipe-parser';
import { recipeCache } from './recipeCache';

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  recipe_count?: number;
}

export interface SavedRecipeWithCollection {
  id: string;
  user_id: string;
  title: string;
  recipe_url: string;
  recipe_data: Recipe;
  collection_id?: string;
  collection_name?: string;
  created_at: string;
  pinned?: boolean;
}

// Get all collections for the current user
export async function getUserCollections(): Promise<{ data: Collection[] | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    // Get collections with recipe count
    const { data, error } = await supabase
      .from('collections')
      .select(`
        *,
        saved_recipes(count)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Transform the data to include recipe_count
    const collectionsWithCount = data?.map(collection => ({
      ...collection,
      recipe_count: collection.saved_recipes?.[0]?.count || 0,
      saved_recipes: undefined // Remove the nested object
    })) || [];

    return { data: collectionsWithCount, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

// Create a new collection
export async function createCollection(name: string, description?: string): Promise<{ data: Collection | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('collections')
      .insert({
        user_id: user.id,
        name,
        description
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

// Update a collection
export async function updateCollection(id: string, name: string, description?: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('collections')
      .update({ name, description })
      .eq('id', id);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

// Delete a collection (recipes will be moved to "All Recipes")
export async function deleteCollection(id: string): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    // Get the "All Recipes" collection
    const { data: allRecipesCollection } = await supabase
      .from('collections')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', 'All Recipes')
      .single();

    if (allRecipesCollection) {
      // Move all recipes from this collection to "All Recipes"
      await supabase
        .from('saved_recipes')
        .update({ collection_id: allRecipesCollection.id })
        .eq('collection_id', id);
    }

    // Delete the collection
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

// Get recipes in a specific collection
export async function getRecipesInCollection(collectionId: string): Promise<{ data: SavedRecipeWithCollection[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('saved_recipes')
      .select(`
        *,
        collections(name)
      `)
      .eq('collection_id', collectionId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Transform the data
    const recipesWithCollection = data?.map(recipe => ({
      ...recipe,
      collection_name: recipe.collections?.name,
      collections: undefined // Remove the nested object
    })) || [];

    return { data: recipesWithCollection, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

// Save recipe to a specific collection
export async function saveRecipeToCollection(recipe: Recipe, recipeUrl: string, collectionId: string): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    // Get the "All Recipes" collection
    const { data: allRecipesCollection } = await supabase
      .from('collections')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', 'All Recipes')
      .single();

    // Check if recipe already exists in any collection
    const { data: existingRecipe } = await supabase
      .from('saved_recipes')
      .select('id, recipe_data')
      .eq('user_id', user.id)
      .eq('recipe_url', recipeUrl)
      .single();

    if (existingRecipe) {
      // Preserve custom preview metadata from existing recipe
      const recipeDataToSave = {
        ...recipe,
        metadata: existingRecipe.recipe_data.metadata || recipe.metadata
      };

      // Update existing recipe's collection
      const { error } = await supabase
        .from('saved_recipes')
        .update({ 
          collection_id: collectionId,
          recipe_data: recipeDataToSave
        })
        .eq('id', existingRecipe.id);

      if (error) {
        return { error: new Error(error.message) };
      }

      // Invalidate cache for updated recipe
      recipeCache.invalidate(existingRecipe.id);

      // If the selected collection is not "All Recipes", also save to "All Recipes"
      if (allRecipesCollection && collectionId !== allRecipesCollection.id) {
        // Check if recipe already exists in "All Recipes"
        const { data: existingInAllRecipes } = await supabase
          .from('saved_recipes')
          .select('id')
          .eq('user_id', user.id)
          .eq('recipe_url', recipeUrl)
          .eq('collection_id', allRecipesCollection.id)
          .single();

        if (!existingInAllRecipes) {
          // Create a duplicate entry in "All Recipes" with preserved metadata
          await supabase
            .from('saved_recipes')
            .insert({
              user_id: user.id,
              title: recipe.title,
              recipe_url: recipeUrl,
              recipe_data: recipeDataToSave,
              collection_id: allRecipesCollection.id
            });
        }
      }
    } else {
      // Create new saved recipe in the selected collection
      const { error } = await supabase
        .from('saved_recipes')
        .insert({
          user_id: user.id,
          title: recipe.title,
          recipe_url: recipeUrl,
          recipe_data: recipe, // This preserves all metadata including instructionsGenerated
          collection_id: collectionId
        });

      if (error) {
        return { error: new Error(error.message) };
      }

      // Get the newly created recipe ID for cache invalidation
      const { data: newRecipe } = await supabase
        .from('saved_recipes')
        .select('id')
        .eq('user_id', user.id)
        .eq('recipe_url', recipeUrl)
        .eq('collection_id', collectionId)
        .single();

      if (newRecipe) {
        // Invalidate cache for new recipe
        recipeCache.invalidate(newRecipe.id);
      }

      // If the selected collection is not "All Recipes", also save to "All Recipes"
      if (allRecipesCollection && collectionId !== allRecipesCollection.id) {
        await supabase
          .from('saved_recipes')
          .insert({
            user_id: user.id,
            title: recipe.title,
            recipe_url: recipeUrl,
            recipe_data: recipe, // This preserves all metadata including instructionsGenerated
            collection_id: allRecipesCollection.id
          });
      }
    }

    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

// Move recipe to different collection
export async function moveRecipeToCollection(recipeId: string, collectionId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('saved_recipes')
      .update({ collection_id: collectionId })
      .eq('id', recipeId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

// Clean up duplicate recipes in collections (run once to fix existing duplicates)
export async function cleanupDuplicateRecipes(): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    // Get all saved recipes grouped by collection_id and recipe_url
    const { data: allRecipes } = await supabase
      .from('saved_recipes')
      .select('id, recipe_url, collection_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }); // Keep the oldest entry

    if (!allRecipes || allRecipes.length === 0) {
      return { error: null };
    }

    // Group by collection_id + recipe_url to find duplicates
    const groupedRecipes = allRecipes.reduce((acc, recipe) => {
      const key = `${recipe.collection_id}_${recipe.recipe_url}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(recipe);
      return acc;
    }, {} as Record<string, typeof allRecipes>);

    // Find IDs of duplicate entries to delete (keep the first/oldest one)
    const idsToDelete: string[] = [];
    Object.values(groupedRecipes).forEach(recipes => {
      if (recipes.length > 1) {
        // Keep the first (oldest) entry, delete the rest
        recipes.slice(1).forEach(recipe => {
          idsToDelete.push(recipe.id);
        });
      }
    });

    if (idsToDelete.length > 0) {
      console.log(`Cleaning up ${idsToDelete.length} duplicate recipes`);
      
      const { error } = await supabase
        .from('saved_recipes')
        .delete()
        .in('id', idsToDelete);

      if (error) {
        return { error: new Error(error.message) };
      }
    }

    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

// Ensure all existing recipes are also in "All Recipes" collection
export async function ensureRecipesInAllCollection(): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    // Get the "All Recipes" collection
    const { data: allRecipesCollection } = await supabase
      .from('collections')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', 'All Recipes')
      .single();

    if (!allRecipesCollection) {
      return { error: new Error('All Recipes collection not found') };
    }

    // Get all unique recipe URLs that exist in other collections
    const { data: allRecipes } = await supabase
      .from('saved_recipes')
      .select('recipe_url, title, recipe_data')
      .eq('user_id', user.id)
      .neq('collection_id', allRecipesCollection.id);

    if (!allRecipes || allRecipes.length === 0) {
      return { error: null };
    }

    // Get all recipe URLs that already exist in "All Recipes"
    const { data: existingInAllRecipes } = await supabase
      .from('saved_recipes')
      .select('recipe_url')
      .eq('user_id', user.id)
      .eq('collection_id', allRecipesCollection.id);

    const existingUrls = new Set(existingInAllRecipes?.map(r => r.recipe_url) || []);

    // Filter out recipes that already exist in "All Recipes" by URL
    const recipesToAdd = allRecipes.filter(recipe => !existingUrls.has(recipe.recipe_url));

    if (recipesToAdd.length > 0) {
      // Remove duplicates by URL within the recipes to add
      const uniqueRecipes = recipesToAdd.reduce((acc, recipe) => {
        if (!acc.some(r => r.recipe_url === recipe.recipe_url)) {
          acc.push(recipe);
        }
        return acc;
      }, [] as typeof recipesToAdd);

      // Create entries in "All Recipes" for each unique recipe
      const recipesToInsert = uniqueRecipes.map(recipe => ({
        user_id: user.id,
        title: recipe.title,
        recipe_url: recipe.recipe_url,
        recipe_data: recipe.recipe_data,
        collection_id: allRecipesCollection.id
      }));

      const { error } = await supabase
        .from('saved_recipes')
        .insert(recipesToInsert);

      if (error) {
        return { error: new Error(error.message) };
      }
    }

    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

// Delete recipe from all collections by recipe URL (used when deleting from "All Recipes")
export async function deleteRecipeFromAllCollections(recipeUrl: string): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    // Delete all instances of this recipe URL for this user
    const { error } = await supabase
      .from('saved_recipes')
      .delete()
      .eq('user_id', user.id)
      .eq('recipe_url', recipeUrl);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Unknown error') };
  }
}