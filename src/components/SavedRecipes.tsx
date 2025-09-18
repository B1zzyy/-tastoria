'use client';

import { useState, useEffect } from 'react';
import { X, Clock, User, Trash2 } from 'lucide-react';
import { getSavedRecipes, deleteSavedRecipe, type SavedRecipe } from '@/lib/recipeService';
import type { Recipe } from '@/lib/recipe-parser';

interface SavedRecipesProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecipe: (recipe: Recipe, url: string) => void;
}

export default function SavedRecipes({ isOpen, onClose, onSelectRecipe }: SavedRecipesProps) {
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSavedRecipes();
    }
  }, [isOpen]);

  const loadSavedRecipes = async () => {
    setLoading(true);
    setError(null);
    
    const { data, error } = await getSavedRecipes();
    
    if (error) {
      setError(error instanceof Error ? error.message : 'Failed to load recipes');
    } else {
      setSavedRecipes(data || []);
    }
    
    setLoading(false);
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    const { error } = await deleteSavedRecipe(recipeId);
    
    if (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete recipe');
    } else {
      setSavedRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
    }
  };

  const handleSelectRecipe = (savedRecipe: SavedRecipe) => {
    onSelectRecipe(savedRecipe.recipe_data, savedRecipe.recipe_url);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[80vh] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-card-foreground">
            Saved Recipes
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-card-foreground rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">{error}</p>
            </div>
          ) : savedRecipes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No saved recipes yet. Start by saving your first recipe!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedRecipes.map((savedRecipe) => (
                <div
                  key={savedRecipe.id}
                  className="bg-background border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow group"
                >
                  {/* Recipe Image */}
                  {savedRecipe.recipe_data.image && (
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={savedRecipe.recipe_data.image}
                        alt={savedRecipe.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  
                  <div className="p-4">
                    {/* Title */}
                    <h3 className="font-semibold text-card-foreground mb-2 line-clamp-2">
                      {savedRecipe.title}
                    </h3>
                    
                    {/* Meta info */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      {savedRecipe.recipe_data.totalTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {savedRecipe.recipe_data.totalTime}
                        </div>
                      )}
                      {savedRecipe.recipe_data.servings && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {savedRecipe.recipe_data.servings} servings
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleSelectRecipe(savedRecipe)}
                        className="px-3 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        View Recipe
                      </button>
                      
                      <button
                        onClick={() => handleDeleteRecipe(savedRecipe.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                        title="Delete recipe"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Saved date */}
                    <p className="text-xs text-muted-foreground mt-2">
                      Saved {new Date(savedRecipe.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
