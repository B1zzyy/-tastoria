'use client';

import { useState, useEffect } from 'react';
import { X, Clock, User, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.3
            }}
            className="relative w-full max-w-4xl max-h-[80vh] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
          >
            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-between p-6 border-b border-border"
            >
              <h2 className="text-2xl font-bold text-card-foreground">
                Saved Recipes
              </h2>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 text-muted-foreground hover:text-card-foreground rounded-lg hover:bg-accent transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </motion.div>

            {/* Content */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="p-6 overflow-y-auto max-h-[60vh]"
            >
              {loading ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center py-12"
                >
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </motion.div>
              ) : error ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <p className="text-destructive">{error}</p>
                </motion.div>
              ) : savedRecipes.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <p className="text-muted-foreground">No saved recipes yet. Start by saving your first recipe!</p>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {savedRecipes.map((savedRecipe, index) => (
                    <motion.div
                      key={savedRecipe.id}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ 
                        delay: 0.4 + index * 0.1,
                        type: "spring",
                        stiffness: 300,
                        damping: 25
                      }}
                      whileHover={{ 
                        y: -5, 
                        boxShadow: "0 10px 25px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" 
                      }}
                      className="bg-background border border-border rounded-lg overflow-hidden transition-shadow group"
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
                        <motion.button
                          onClick={() => handleSelectRecipe(savedRecipe)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-3 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          View Recipe
                        </motion.button>
                        
                        <motion.button
                          onClick={() => handleDeleteRecipe(savedRecipe.id)}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                          title="Delete recipe"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    
                      {/* Saved date */}
                      <p className="text-xs text-muted-foreground mt-2">
                        Saved {new Date(savedRecipe.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
}
