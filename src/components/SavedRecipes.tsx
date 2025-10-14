'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Clock, User, Folder, ArrowLeft, Instagram, Trash2, Pen, Plus, Pin, PinOff, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { deleteSavedRecipe, updateRecipeTitle, updateRecipeCustomPreview, togglePinRecipe, getSavedRecipes } from '@/lib/recipeService';
import { recipeCache } from '@/lib/recipeCache';
import { getUserCollections, getRecipesInCollection, ensureRecipesInAllCollection, cleanupDuplicateRecipes, deleteRecipeFromAllCollections, deleteCollection, updateCollection, createCollection, type Collection, type SavedRecipeWithCollection } from '@/lib/collectionsService';
// import { type UnitSystem } from '@/lib/unitConverter';
import EditRecipeModal from './EditRecipeModal';
import type { Recipe } from '@/lib/recipe-parser';
import SwipeToPin from './SwipeToPin';

interface SavedRecipesProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecipe: (recipe: Recipe, url: string, recipeId?: string) => void;
}

// Component for collection thumbnail grid
const CollectionThumbnail = ({ 
  collection, 
  onLoadCollectionRecipes, 
  onConfirmDeleteCollection,
  renderCustomPreview 
}: { 
  collection: Collection;
  onLoadCollectionRecipes: (collection: Collection) => void;
  onConfirmDeleteCollection: (collection: Collection) => void;
  renderCustomPreview: (recipe: SavedRecipeWithCollection, isThumbnail?: boolean) => React.ReactElement;
}) => {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [recipeData, setRecipeData] = useState<SavedRecipeWithCollection[]>([]);
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
        setRecipeData(data.slice(0, 4));
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
            onLoadCollectionRecipes(collection);
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={(e) => e.preventDefault()}
        whileTap={{ scale: 0.98 }}
        className={`group relative bg-background border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30 transition-all duration-300 w-full select-none touch-none ${
          isLongPressing ? 'scale-95 shadow-lg' : ''
        }`}
      >
        {/* Thumbnail Grid - Fixed aspect ratio */}
        <div className="aspect-square relative w-full">
          <div className="grid grid-cols-2 gap-0.5 h-full w-full">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="relative bg-accent aspect-square">
                {thumbnails[index] ? (
                  thumbnails[index] === 'instagram-video' ? (
                    <div className="w-full h-full">
                      {recipeData[index] ? renderCustomPreview(recipeData[index], true) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-700 via-gray-800 to-black flex items-center justify-center">
                          <Instagram className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full">
                      {recipeData[index] ? renderCustomPreview(recipeData[index], true) : (
                        <Image
                          src={thumbnails[index]}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                  )
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
            onConfirmDeleteCollection(collection);
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

export default function SavedRecipes({ isOpen, onClose, onSelectRecipe }: SavedRecipesProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collectionRecipes, setCollectionRecipes] = useState<SavedRecipeWithCollection[]>([]);
  const [allRecipes, setAllRecipes] = useState<SavedRecipeWithCollection[]>([]);
  // const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRecipeForEdit, setSelectedRecipeForEdit] = useState<SavedRecipeWithCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'collections' | 'recipes' | 'all-recipes'>('all-recipes');
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createCollectionName, setCreateCollectionName] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // Filter recipes based on search query
  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) {
      return allRecipes;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return allRecipes.filter(recipe => 
      recipe.title.toLowerCase().includes(query) ||
      recipe.recipe_data.ingredients?.some(ingredient => {
        if (typeof ingredient === 'string') {
          return ingredient.toLowerCase().includes(query);
        } else {
          // Handle IngredientSection
          return ingredient.title?.toLowerCase().includes(query) ||
                 ingredient.ingredients.some(ing => ing.toLowerCase().includes(query));
        }
      }) ||
      recipe.recipe_data.instructions?.some(instruction => 
        instruction.toLowerCase().includes(query)
      ) ||
      recipe.recipe_data.description?.toLowerCase().includes(query) ||
      recipe.recipe_data.cuisine?.toLowerCase().includes(query) ||
      recipe.recipe_data.category?.toLowerCase().includes(query) ||
      recipe.recipe_data.tags?.some(tag => 
        tag.toLowerCase().includes(query)
      )
    );
  }, [allRecipes, searchQuery]);

  useEffect(() => {
    if (isOpen) {
      loadCollections();
      loadAllRecipes();
      setView('all-recipes'); // Always start with all recipes view
      setSelectedCollection(null); // Reset selected collection
      setShowSearch(false); // Always start with search bar retracted
      setSearchQuery(''); // Clear any search query
    }
  }, [isOpen]);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

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
      const recipes = data || [];
      
      // Cache each recipe
      recipes.forEach(savedRecipe => {
        recipeCache.set(savedRecipe.id, savedRecipe.recipe_data);
      });
      
      setCollectionRecipes(recipes);
    }
    
    setLoading(false);
  };

  const loadAllRecipes = async () => {
    setLoading(true);
    setError(null);
    setView('all-recipes');
    
    const { data, error } = await getSavedRecipes();
    
    if (error) {
      setError(error instanceof Error ? error.message : 'Failed to load recipes');
    } else {
      const recipes = data || [];
      
      // Cache each recipe
      recipes.forEach(savedRecipe => {
        recipeCache.set(savedRecipe.id, savedRecipe.recipe_data);
      });
      
      setAllRecipes(recipes);
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

  const handleTogglePin = async (recipeId: string) => {
    try {
      setLoading(true);
      const { error } = await togglePinRecipe(recipeId);
      
      if (error) {
        setError(error instanceof Error ? error.message : 'Failed to toggle pin');
      } else {
        // Update the local state to reflect the pin change
        setCollectionRecipes(prev => 
          prev.map(recipe => 
            recipe.id === recipeId 
              ? { ...recipe, pinned: !recipe.pinned }
              : recipe
          ).sort((a, b) => {
            // Sort by pinned status first, then by created_at
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          })
        );
      }
    } catch {
      setError('Failed to toggle pin');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRecipe = (savedRecipe: SavedRecipeWithCollection) => {
    onSelectRecipe(savedRecipe.recipe_data, savedRecipe.recipe_url, savedRecipe.id);
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

  const handleRenameCollection = async () => {
    if (!selectedCollection || !newCollectionName.trim()) return;

    setLoading(true);
    const { error } = await updateCollection(selectedCollection.id, newCollectionName.trim());

    if (error) {
      setError(error.message);
    } else {
      // Update the collection name in the local state
      setCollections(prev => prev.map(c => 
        c.id === selectedCollection.id 
          ? { ...c, name: newCollectionName.trim() }
          : c
      ));
      
      // Update the selected collection
      setSelectedCollection(prev => prev ? { ...prev, name: newCollectionName.trim() } : null);
    }

    setLoading(false);
    setShowRenameModal(false);
    setNewCollectionName('');
  };

  const handleCreateCollection = async () => {
    if (!createCollectionName.trim()) return;

    setLoading(true);
    const { data, error } = await createCollection(createCollectionName.trim());

    if (error) {
      setError(error.message);
    } else if (data) {
      // Add the new collection to the local state
      setCollections(prev => [...prev, data]);
    }

    setLoading(false);
    setShowCreateModal(false);
    setCreateCollectionName('');
  };

  // const _handleEditRecipe = (recipe: SavedRecipeWithCollection) => {
  //   setSelectedRecipeForEdit(recipe);
  //   setShowEditModal(true);
  // };

  const handleSaveRecipeEdit = async (updates: {
    title: string;
    customPreview: { type: 'emoji' | 'image'; value: string; gradient?: string } | null;
  }) => {
    if (!selectedRecipeForEdit) return;
    
    try {
      setLoading(true);
      
      // Update title if changed
      if (updates.title !== selectedRecipeForEdit.title) {
        const { error: titleError } = await updateRecipeTitle(selectedRecipeForEdit.id, updates.title);
        if (titleError) {
          setError('Failed to update title');
          return;
        }
      }
      
      // Update custom preview if changed
      const currentPreview = selectedRecipeForEdit.recipe_data.metadata?.customPreview;
      const newPreview = updates.customPreview;
      
      if (JSON.stringify(currentPreview) !== JSON.stringify(newPreview)) {
        const { error: previewError } = await updateRecipeCustomPreview(selectedRecipeForEdit.id, newPreview);
        if (previewError) {
          setError('Failed to update preview');
          return;
        }
      }
      
      // Refresh the recipes to show the updated data
      if (selectedCollection) {
        const { data } = await getRecipesInCollection(selectedCollection.id);
        if (data) {
          setCollectionRecipes(data);
        }
      }
      
      setShowEditModal(false);
      setSelectedRecipeForEdit(null);
    } catch {
      setError('Failed to update recipe');
    } finally {
      setLoading(false);
    }
  };

  const renderCustomPreview = (recipe: SavedRecipeWithCollection, isThumbnail = false) => {
    const customPreview = recipe.recipe_data.metadata?.customPreview;
    
    if (customPreview?.type === 'emoji') {
      const gradient = customPreview.gradient || 'from-yellow-400 to-orange-500';
      const emojiSize = isThumbnail ? 'text-2xl' : 'text-7xl';
      
      // Check if it's a custom gradient (starts with #)
      if (gradient.startsWith('#')) {
        const colors = gradient.split('-');
        if (colors.length === 2) {
          return (
            <div 
              className={`w-full h-full flex items-center justify-center ${emojiSize} shadow-lg`}
              style={{
                background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`
              }}
            >
              {customPreview.value}
            </div>
          );
        }
      }
      
      return (
        <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center ${emojiSize} shadow-lg`}>
          {customPreview.value}
        </div>
      );
    } else if (customPreview?.type === 'image') {
      return (
        <Image
          src={customPreview.value}
          alt="Custom preview"
          fill
          className="object-cover"
          onError={(e) => {
            // Fallback to Instagram logo if image fails to load
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
      );
    }
    
    // Default case: show original recipe image if available, otherwise Instagram logo
    if (recipe.recipe_data.image && recipe.recipe_data.image !== 'instagram-video') {
      return (
        <Image
          src={recipe.recipe_data.image}
          alt={recipe.title}
          fill
          className="object-cover"
        />
      );
    }
    
    // Fallback to Instagram logo
    return (
      <div className="w-full h-full bg-gradient-to-br from-gray-700 via-gray-800 to-black flex items-center justify-center">
        <Instagram className="w-8 h-8 text-white" />
      </div>
    );
  };

  const confirmDeleteCollection = (collection: Collection) => {
    setCollectionToDelete(collection);
    setShowDeleteConfirmation(true);
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
              className="relative flex items-center justify-between p-6 border-b border-border"
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
                   {view === 'recipes' ? (
                     <h2 className="text-lg md:text-2xl font-bold text-card-foreground">
                       {selectedCollection?.name}
                     </h2>
                   ) : (
                       <div className="flex items-center gap-4 md:gap-8">
                          <button
                            onClick={loadAllRecipes}
                            className={`text-base md:text-xl font-bold transition-colors ${
                              view === 'all-recipes' 
                                ? 'text-card-foreground border-b-2 border-card-foreground pb-1' 
                                : 'text-muted-foreground hover:text-card-foreground'
                            }`}
                          >
                            All recipes
                          </button>
                          <button
                            onClick={() => setView('collections')}
                            className={`text-base md:text-xl font-bold transition-colors ${
                              view === 'collections' 
                                ? 'text-card-foreground border-b-2 border-card-foreground pb-1' 
                                : 'text-muted-foreground hover:text-card-foreground'
                            }`}
                          >
                            Collections
                          </button>
                        </div>
                   )}
                </div>
              {view === 'recipes' ? (
                <motion.button
                  onClick={() => {
                    setNewCollectionName(selectedCollection?.name || '');
                    setShowRenameModal(true);
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 text-muted-foreground hover:text-card-foreground rounded-lg hover:bg-accent transition-colors"
                  title="Rename collection"
                >
                  <Pen className="w-5 h-5" />
                </motion.button>
              ) : view === 'all-recipes' ? (
                  <motion.div
                    animate={{
                      width: showSearch ? (isMobile ? 160 : 280) : 40,
                      backgroundColor: showSearch ? '#2a2a2a' : 'rgba(0, 0, 0, 0)',
                      borderColor: showSearch ? '#404040' : 'rgba(0, 0, 0, 0)',
                      borderRadius: showSearch ? 20 : 8,
                      paddingLeft: showSearch ? 16 : 8,
                      paddingRight: showSearch ? 16 : 8,
                      paddingTop: showSearch ? 8 : 8,
                      paddingBottom: showSearch ? 8 : 8,
                    }}
                    transition={{
                      duration: 0.3,
                      ease: [0.4, 0, 0.2, 1],
                      type: "spring",
                      stiffness: 300,
                      damping: 30
                    }}
                    className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center overflow-hidden"
                  >
                  <AnimatePresence mode="wait">
                    {showSearch ? (
                      <motion.div
                        key="search-content"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                        className="flex items-center w-full"
                      >
                        <Search className="w-4 h-4 text-muted-foreground mr-2 flex-shrink-0" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search recipes..."
                          className="bg-transparent border-none outline-none text-card-foreground placeholder:text-muted-foreground flex-1 min-w-0"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            setShowSearch(false);
                            setSearchQuery('');
                          }}
                          className="ml-2 p-1 text-muted-foreground hover:text-card-foreground transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.button
                        key="search-icon"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => setShowSearch(true)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="text-muted-foreground hover:text-card-foreground transition-colors"
                        title="Search recipes"
                      >
                        <Search className="w-5 h-5" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.button
                  onClick={() => {
                    setCreateCollectionName('');
                    setShowCreateModal(true);
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 text-muted-foreground hover:text-card-foreground rounded-lg hover:bg-accent transition-colors"
                  title="Create new collection"
                >
                  <Plus className="w-5 h-5" />
                </motion.button>
              )}
            </motion.div>

            {/* Content */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="p-6 overflow-y-auto max-h-[60vh] scrollbar-hide"
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
                        <CollectionThumbnail 
                          collection={collection}
                          onLoadCollectionRecipes={loadCollectionRecipes}
                          onConfirmDeleteCollection={confirmDeleteCollection}
                          renderCustomPreview={renderCustomPreview}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )
              ) : view === 'all-recipes' ? (
                // All Recipes View
                allRecipes.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-12"
                  >
                    <p className="text-muted-foreground">No recipes saved yet.</p>
                  </motion.div>
                ) : filteredRecipes.length === 0 && searchQuery ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-12"
                  >
                    <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No recipes found for &quot;{searchQuery}&quot;</p>
                    <p className="text-sm text-muted-foreground mt-2">Try searching for ingredients, recipe names, or cuisines</p>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    {filteredRecipes.map((savedRecipe: SavedRecipeWithCollection, index: number) => (
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
                      >
                        {/* Simple Recipe Card - No Pin Functionality */}
                        <div
                          onClick={() => handleSelectRecipe(savedRecipe)}
                          className="bg-background border border-border rounded-lg overflow-hidden hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30 transition-all duration-300 group cursor-pointer relative"
                        >
                          {/* Recipe Image */}
                          {savedRecipe.recipe_data.image && (
                            <div className="aspect-video relative overflow-hidden">
                              {savedRecipe.recipe_data.image === 'instagram-video' ? (
                                <div className="relative w-full h-full">
                                  {renderCustomPreview(savedRecipe)}
                                </div>
                              ) : (
                                <div className="relative w-full h-full">
                                  {renderCustomPreview(savedRecipe)}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Recipe Info */}
                          <div className="p-4">
                            <h3 className="font-semibold text-card-foreground mb-2 line-clamp-1">
                              {savedRecipe.title}
                            </h3>
                            {/* Meta info */}
                            <div className="flex items-center gap-3 text-xs md:text-[11px] text-muted-foreground">
                              {savedRecipe.recipe_data.totalTime && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {savedRecipe.recipe_data.totalTime}
                                </div>
                              )}
                              {savedRecipe.recipe_data.servings && (
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {savedRecipe.recipe_data.servings}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
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
                      >
                        {/* Mobile: Swipe to Pin */}
                        <div className="md:hidden">
                          <SwipeToPin
                            onPin={() => handleTogglePin(savedRecipe.id)}
                            isPinned={savedRecipe.pinned || false}
                            className="w-full"
                          >
                            <div
                              onClick={() => handleSelectRecipe(savedRecipe)}
                              className="bg-background border border-border rounded-lg overflow-hidden hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30 transition-all duration-300 group cursor-pointer relative"
                            >
                              {/* Pin indicator */}
                              {savedRecipe.pinned && (
                                <div className="absolute top-2 right-2 z-10">
                                  <div className="bg-primary rounded-full p-1.5 shadow-md border border-primary/30">
                                    <Pin className="w-4 h-4 text-primary-foreground fill-current" />
                                  </div>
                                </div>
                              )}
                              
                              {/* Recipe Image */}
                              {savedRecipe.recipe_data.image && (
                                <div className="aspect-video relative overflow-hidden">
                                  {savedRecipe.recipe_data.image === 'instagram-video' ? (
                                    <div className="relative w-full h-full">
                                      {renderCustomPreview(savedRecipe)}
                                    </div>
                                  ) : (
                                    <div className="relative w-full h-full">
                                      {renderCustomPreview(savedRecipe)}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              <div className="p-4">
                                <div className="flex flex-col gap-2">
                                  {/* Title */}
                                  <h3 className="font-semibold text-card-foreground line-clamp-1">
                                    {savedRecipe.title}
                                  </h3>
                                  
                                  {/* Meta info */}
                                  <div className="flex items-center gap-3 text-xs md:text-[11px] text-muted-foreground">
                                    {savedRecipe.recipe_data.totalTime && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {savedRecipe.recipe_data.totalTime}
                                      </div>
                                    )}
                                    {savedRecipe.recipe_data.servings && (
                                      <div className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {savedRecipe.recipe_data.servings}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </SwipeToPin>
                        </div>

                        {/* Desktop: Hover Pin Button */}
                        <div className="hidden md:block">
                          <div
                            onClick={() => handleSelectRecipe(savedRecipe)}
                            className="bg-background border border-border rounded-lg overflow-hidden hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30 transition-all duration-300 group cursor-pointer relative"
                          >
                            {/* Pin indicator - always visible if pinned */}
                            {savedRecipe.pinned && (
                              <div className="absolute top-2 right-2 z-10">
                                <div className="bg-primary rounded-full p-1.5 shadow-md border border-primary/30">
                                  <Pin className="w-4 h-4 text-primary-foreground fill-current" />
                                </div>
                              </div>
                            )}

                            {/* Hover Pin Button - only visible on hover */}
                            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePin(savedRecipe.id);
                                }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className={`rounded-full p-1.5 shadow-md border transition-colors ${
                                  savedRecipe.pinned 
                                    ? 'bg-primary border-primary/30' 
                                    : 'bg-background/80 backdrop-blur-sm border-border hover:bg-primary/10'
                                }`}
                                title={savedRecipe.pinned ? 'Unpin recipe' : 'Pin recipe'}
                              >
                                {savedRecipe.pinned ? (
                                  <PinOff className="w-4 h-4 text-primary-foreground fill-current" />
                                ) : (
                                  <Pin className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                                )}
                              </motion.button>
                            </div>
                            
                            {/* Recipe Image */}
                            {savedRecipe.recipe_data.image && (
                              <div className="aspect-video relative overflow-hidden">
                                {savedRecipe.recipe_data.image === 'instagram-video' ? (
                                  <div className="relative w-full h-full">
                                    {renderCustomPreview(savedRecipe)}
                                  </div>
                                ) : (
                                  <div className="relative w-full h-full">
                                    {renderCustomPreview(savedRecipe)}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className="p-4">
                              <div className="flex flex-col gap-2">
                                {/* Title */}
                                <h3 className="font-semibold text-card-foreground line-clamp-1">
                                  {savedRecipe.title}
                                </h3>
                                
                                {/* Meta info */}
                                <div className="flex items-center gap-3 text-xs md:text-[11px] text-muted-foreground">
                                  {savedRecipe.recipe_data.totalTime && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {savedRecipe.recipe_data.totalTime}
                                    </div>
                                  )}
                                  {savedRecipe.recipe_data.servings && (
                                    <div className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {savedRecipe.recipe_data.servings}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
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
            
            <p className="text-muted-foreground mb-6 text-center">
              Are you sure you want to delete &quot;<strong>{collectionToDelete.name}</strong>&quot;?<br />
              This action cannot be undone.
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

      {/* Rename Collection Modal */}
      {showRenameModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowRenameModal(false);
            setNewCollectionName('');
          }}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl shadow-2xl border border-border p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-semibold text-card-foreground mb-4">Rename collection</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Collection name
              </label>
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameCollection();
                  } else if (e.key === 'Escape') {
                    setShowRenameModal(false);
                    setNewCollectionName('');
                  }
                }}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-card-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                placeholder="Enter collection name"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setNewCollectionName('');
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-card-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameCollection}
                disabled={loading || !newCollectionName.trim()}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Create Collection Modal */}
      {showCreateModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowCreateModal(false);
            setCreateCollectionName('');
          }}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl shadow-2xl border border-border p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-semibold text-card-foreground mb-4">Create new collection</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Collection name
              </label>
              <input
                type="text"
                value={createCollectionName}
                onChange={(e) => setCreateCollectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateCollection();
                  } else if (e.key === 'Escape') {
                    setShowCreateModal(false);
                    setCreateCollectionName('');
                  }
                }}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-card-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                placeholder="Enter collection name"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateCollectionName('');
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-card-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={loading || !createCollectionName.trim()}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Create'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

        {/* Edit Recipe Modal */}
        {selectedRecipeForEdit && (
          <EditRecipeModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedRecipeForEdit(null);
            }}
            recipe={{
              id: selectedRecipeForEdit.id,
              title: selectedRecipeForEdit.title,
              image: selectedRecipeForEdit.recipe_data.image || '',
              ingredients: selectedRecipeForEdit.recipe_data.ingredients || [],
              instructions: selectedRecipeForEdit.recipe_data.instructions || [],
              metadata: selectedRecipeForEdit.recipe_data.metadata
            }}
            onSave={handleSaveRecipeEdit}
            onDelete={() => {
              handleDeleteRecipe(selectedRecipeForEdit.id);
              setShowEditModal(false);
              setSelectedRecipeForEdit(null);
            }}
          />
        )}
    </AnimatePresence>
);
}
