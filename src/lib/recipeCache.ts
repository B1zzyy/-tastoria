import type { Recipe } from './recipe-parser';

interface CachedRecipe {
  recipe: Recipe;
  timestamp: number;
  version: string; // We'll use a hash of the recipe data as version
}

interface RecipeCache {
  [recipeId: string]: CachedRecipe;
}

class RecipeCacheService {
  private cache: RecipeCache = {};
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_KEY = 'tastoria_recipe_cache';

  constructor() {
    this.loadFromStorage();
  }

  // Generate a version hash based on recipe content
  private generateVersion(recipe: Recipe): string {
    const content = JSON.stringify({
      title: recipe.title,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      image: recipe.image,
      customPreview: recipe.customPreview,
      instagramUrl: recipe.instagramUrl,
      metadata: recipe.metadata
    });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  // Check if cached recipe is still valid
  private isValid(cachedRecipe: CachedRecipe, currentVersion: string): boolean {
    const isNotExpired = Date.now() - cachedRecipe.timestamp < this.CACHE_DURATION;
    const isSameVersion = cachedRecipe.version === currentVersion;
    return isNotExpired && isSameVersion;
  }

  // Load cache from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.cache = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load recipe cache from storage:', error);
      this.cache = {};
    }
  }

  // Save cache to localStorage
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.warn('Failed to save recipe cache to storage:', error);
    }
  }

  // Get recipe from cache
  get(recipeId: string, recipe: Recipe): Recipe | null {
    const currentVersion = this.generateVersion(recipe);
    const cached = this.cache[recipeId];

    if (cached && this.isValid(cached, currentVersion)) {
      console.log(`📦 Cache HIT for recipe ${recipeId}`);
      return cached.recipe;
    }

    console.log(`📦 Cache MISS for recipe ${recipeId}`);
    return null;
  }

  // Set recipe in cache
  set(recipeId: string, recipe: Recipe): void {
    const version = this.generateVersion(recipe);
    this.cache[recipeId] = {
      recipe: { ...recipe }, // Deep copy to avoid mutations
      timestamp: Date.now(),
      version
    };
    
    this.saveToStorage();
    console.log(`📦 Cached recipe ${recipeId} with version ${version}`);
  }

  // Invalidate specific recipe cache
  invalidate(recipeId: string): void {
    if (this.cache[recipeId]) {
      delete this.cache[recipeId];
      this.saveToStorage();
      console.log(`🗑️ Invalidated cache for recipe ${recipeId}`);
    }
  }

  // Invalidate all cache
  invalidateAll(): void {
    this.cache = {};
    this.saveToStorage();
    console.log('🗑️ Invalidated all recipe cache');
  }

  // Clear expired entries
  cleanup(): void {
    const now = Date.now();
    let cleaned = false;

    for (const [recipeId, cached] of Object.entries(this.cache)) {
      if (now - cached.timestamp >= this.CACHE_DURATION) {
        delete this.cache[recipeId];
        cleaned = true;
      }
    }

    if (cleaned) {
      this.saveToStorage();
      console.log('🧹 Cleaned up expired cache entries');
    }
  }

  // Get cache stats for debugging
  getStats(): { size: number; entries: string[] } {
    return {
      size: Object.keys(this.cache).length,
      entries: Object.keys(this.cache)
    };
  }
}

// Export singleton instance
export const recipeCache = new RecipeCacheService();

// Cleanup expired entries every 10 minutes
setInterval(() => {
  recipeCache.cleanup();
}, 10 * 60 * 1000);
