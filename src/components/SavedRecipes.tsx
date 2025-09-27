'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Clock, User, Trash2, Folder, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { deleteSavedRecipe } from '@/lib/recipeService';
import { getUserCollections, getRecipesInCollection, ensureRecipesInAllCollection, cleanupDuplicateRecipes, deleteRecipeFromAllCollections, deleteCollection, type Collection, type SavedRecipeWithCollection } from '@/lib/collectionsService';
import type { Recipe } from '@/lib/recipe-parser';

interface SavedRecipesProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecipe: (recipe: Recipe, url: string) => void;
}

export default function SavedRecipes({ isOpen, onClose, onSelectRecipe }: SavedRecipesProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collectionRecipes, setCollectionRecipes] = useState<SavedRecipeWithCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'collections' | 'recipes'>('collections');
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCollections();
    }
  }, [isOpen]);

  const loadCollections = async () => {
    setLoading(true);
    setError(null);
    
    // First clean up any existing duplicates
    await cleanupDuplicateRecipes();
    
    // Then ensure all existing recipes are in "All Recipes" collection (without duplicates)
    await ensureRecipesInAllCollection();
    
    const { data, error } = await getUserCollections();
    
    if (error) {
      setError(error instanceof Error ? error.message : 'Failed to load collections');
    } else {
      setCollections(data || []);
    }
    
    setLoading(false);
  };

  const loadCollectionRecipes = async (collection: Collection) => {
    setLoading(true);
    setError(null);
    setSelectedCollection(collection);
    setView('recipes');
    
    const { data, error } = await getRecipesInCollection(collection.id);
    
    if (error) {
      setError(error instanceof Error ? error.message : 'Failed to load recipes');
    } else {
      setCollectionRecipes(data || []);
    }
    
    setLoading(false);
  };

  const goBackToCollections = () => {
    setView('collections');
    setSelectedCollection(null);
    setCollectionRecipes([]);
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    // Find the recipe to get its URL
    const recipeToDelete = collectionRecipes.find(r => r.id === recipeId);
    
    if (!recipeToDelete) {
      setError('Recipe not found');
      return;
    }

    // Check if we're deleting from "All Recipes" collection
    const isAllRecipesCollection = selectedCollection?.name === 'All Recipes';
    
    let error;
    
    if (isAllRecipesCollection) {
      // Delete from all collections (cascading delete)
      const result = await deleteRecipeFromAllCollections(recipeToDelete.recipe_url);
      error = result.error;
    } else {
      // Delete only from this specific collection
      const result = await deleteSavedRecipe(recipeId);
      error = result.error;
    }
    
    if (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete recipe');
    } else {
      setCollectionRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
    }
  };

  const handleSelectRecipe = (savedRecipe: SavedRecipeWithCollection) => {
    onSelectRecipe(savedRecipe.recipe_data, savedRecipe.recipe_url);
    onClose();
  };

  const handleDeleteCollection = async () => {
    if (!collectionToDelete) return;

    setLoading(true);
    const { error } = await deleteCollection(collectionToDelete.id);

    if (error) {
      setError(error.message);
    } else {
      // Remove the deleted collection from the list
      setCollections(prev => prev.filter(c => c.id !== collectionToDelete.id));
      
      // If we were viewing the deleted collection, go back to collections view
      if (selectedCollection?.id === collectionToDelete.id) {
        goBackToCollections();
      }
    }

    setLoading(false);
    setShowDeleteConfirmation(false);
    setCollectionToDelete(null);
  };

  const confirmDeleteCollection = (collection: Collection) => {
    setCollectionToDelete(collection);
    setShowDeleteConfirmation(true);
  };

  // Component for collection thumbnail grid
  const CollectionThumbnail = ({ collection }: { collection: Collection }) => {
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [showDeleteButton, setShowDeleteButton] = useState(false);
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
    const [isLongPressing, setIsLongPressing] = useState(false);
    
    useEffect(() => {
      const loadThumbnails = async () => {
        const { data } = await getRecipesInCollection(collection.id);
        if (data) {
          const images = data
            .filter(recipe => recipe.recipe_data.image)
            .slice(0, 4)
            .map(recipe => recipe.recipe_data.image!);
          setThumbnails(images);
        }
      };
      
      loadThumbnails();
    }, [collection.id]);

    // Cleanup timer on unmount
    useEffect(() => {
      return () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
        }
      };
    }, [longPressTimer]);

    const handleTouchStart = () => {
      if (collection.name === 'All Recipes') return; // Don't allow delete for All Recipes
      
      setIsLongPressing(true);
      const timer = setTimeout(() => {
        setShowDeleteButton(true);
        setIsLongPressing(false);
        // Add haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }, 500); // 500ms long press
      
      setLongPressTimer(timer);
    };

    const handleTouchEnd = () => {
      setIsLongPressing(false);
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    };

    const handleMouseDown = () => {
      if (collection.name === 'All Recipes') return;
      
      setIsLongPressing(true);
      const timer = setTimeout(() => {
        setShowDeleteButton(true);
        setIsLongPressing(false);
      }, 500);
      
      setLongPressTimer(timer);
    };

    const handleMouseUp = () => {
      setIsLongPressing(false);
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    };

    const handleMouseLeave = () => {
      setIsLongPressing(false);
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    };

    return (
      <div className="relative group select-none" style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none', WebkitTapHighlightColor: 'transparent' }}>
        <motion.button
          onClick={() => {
            if (!showDeleteButton) {
              loadCollectionRecipes(collection);
            }
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onContextMenu={(e) => e.preventDefault()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`group relative bg-background border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 w-full select-none touch-none ${
            isLongPressing ? 'scale-95 shadow-lg' : ''
          }`}
        >
          {/* Thumbnail Grid - Fixed aspect ratio */}
          <div className="aspect-square relative w-full">
            <div className="grid grid-cols-2 gap-0.5 h-full w-full">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="relative bg-accent aspect-square">
                  {thumbnails[index] ? (
                    <Image
                      src={thumbnails[index]}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-accent flex items-center justify-center">
                      <Folder className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Collection Info - Fixed height */}
          <div className="p-3 sm:p-4 h-20 flex flex-col justify-center select-none">
            <h3 className="font-semibold text-card-foreground text-left mb-1 group-hover:text-primary transition-colors text-sm sm:text-base line-clamp-1 select-none">
              {collection.name}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground text-left select-none">
              {collection.recipe_count || 0} recipe{(collection.recipe_count || 0) !== 1 ? 's' : ''}
            </p>
          </div>
        </motion.button>

        {/* Tap outside to dismiss delete button (mobile) */}
        {showDeleteButton && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-10"
            onClick={() => setShowDeleteButton(false)}
          />
        )}

        {/* Delete Button - Show on hover (desktop) or after long press (mobile) */}
        {collection.name !== 'All Recipes' && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              confirmDeleteCollection(collection);
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`absolute -top-2 -right-2 w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-lg transition-opacity duration-200 hover:bg-destructive/90 z-20 ${
              showDeleteButton ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            title="Delete collection"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        )}

        {/* Small instruction text for mobile users */}
        {showDeleteButton && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap z-30 md:hidden"
          >
            Tap outside to cancel
          </motion.div>
        )}
      </div>
    );
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
              <div className="flex items-center gap-3">
                {view === 'recipes' && (
                  <motion.button
                    onClick={goBackToCollections}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 text-muted-foreground hover:text-card-foreground rounded-lg hover:bg-accent transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </motion.button>
                )}
                <h2 className="text-2xl font-bold text-card-foreground">
                  {view === 'collections' ? 'Collections' : selectedCollection?.name}
                </h2>
              </div>
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
              ) : view === 'collections' ? (
                // Collections View
                collections.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-12"
                  >
                    <Folder className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No collections yet. Save some recipes to get started!</p>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
                  >
                    {collections.map((collection, index) => (
                      <motion.div
                        key={collection.id}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ 
                          delay: 0.4 + index * 0.1,
                          type: "spring",
                          stiffness: 300,
                          damping: 25
                        }}
                      >
                        <CollectionThumbnail collection={collection} />
                      </motion.div>
                    ))}
                  </motion.div>
                )
              ) : (
                // Recipes View
                collectionRecipes.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-12"
                  >
                    <p className="text-muted-foreground">No recipes in this collection yet.</p>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    {collectionRecipes.map((savedRecipe, index) => (
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
                            <Image
                              src={savedRecipe.recipe_data.image}
                              alt={savedRecipe.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
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
                )
              )}
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* Delete Collection Confirmation Modal */}
      {showDeleteConfirmation && collectionToDelete && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowDeleteConfirmation(false);
            setCollectionToDelete(null);
          }}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl shadow-2xl border border-border p-6 max-w-md w-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground">
                Delete Collection
              </h3>
            </div>
            
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete &quot;<strong>{collectionToDelete.name}</strong>&quot;? 
              All recipes in this collection will be moved to &quot;All Recipes&quot;. This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setCollectionToDelete(null);
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCollection}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
);
}
