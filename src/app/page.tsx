'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Recipe } from '@/lib/recipe-parser';
import RecipeForm, { type SourceType } from '@/components/RecipeForm';
import RecipeDisplay from '@/components/RecipeDisplay';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/hooks/useAuth';
import { isRecipeSaved, updateRecipeTitle, updateRecipeCustomPreview, updateRecipeInstructions, updateRecipeIngredients } from '@/lib/recipeService';
import { deleteRecipeFromAllCollections } from '@/lib/collectionsService';
import SavedRecipes from '@/components/SavedRecipes';
import CollectionModal from '@/components/CollectionModal';
import EditRecipeModal from '@/components/EditRecipeModal';
import BlurText from '../components/BlurText';
import LiquidEther from '../components/LiquidEther';
import { ChevronDown, LogOut, User, Bookmark, BookmarkCheck, HelpCircle } from 'lucide-react';
import '@/lib/keepAlive'; // Import to initialize keep-alive service
import TutorialOverlay from '@/components/TutorialOverlay';
import { useTutorial } from '@/hooks/useTutorial';
import AIChatButton from '@/components/AIChatButton';
import RecipeAIChat from '@/components/RecipeAIChat';


export default function Home() {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tutorial system
  const tutorial = useTutorial();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showDesktopUserDropdown, setShowDesktopUserDropdown] = useState(false);
  const [showSavedRecipes, setShowSavedRecipes] = useState(false);
  const [currentRecipeUrl, setCurrentRecipeUrl] = useState<string>('');
  const [isRecipeCurrentlySaved, setIsRecipeCurrentlySaved] = useState(false);
  const [currentSavedRecipeId, setCurrentSavedRecipeId] = useState<string | null>(null);
  const [showConstructionAlert, setShowConstructionAlert] = useState(false);
  const [isViewingFromSavedRecipes, setIsViewingFromSavedRecipes] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Use real authentication
  const { user, signOut } = useAuth();
  
  // Debug user state changes
  useEffect(() => {
    console.log('User state changed:', user);
  }, [user]);

  // Show welcome message for new users
  useEffect(() => {
    if (user && !tutorial.isCompleted && !tutorial.isActive) {
      // Auto-start tutorial for new users after a short delay
      const timer = setTimeout(() => {
        tutorial.startTutorial();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [user, tutorial.isCompleted, tutorial.isActive, tutorial.startTutorial]);

  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const desktopDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (desktopDropdownRef.current && !desktopDropdownRef.current.contains(event.target as Node)) {
        setShowDesktopUserDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await signOut();
    setShowUserDropdown(false);
  };

  const handleDesktopLogout = async () => {
    await signOut();
    setShowDesktopUserDropdown(false);
  };

  const handleSaveRecipe = async () => {
    if (!recipe || !user) return;
    
    // Open the collection modal to let user choose which collection to save to
    setShowCollectionModal(true);
  };

  const handleDeleteRecipe = () => {
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteRecipe = async () => {
    console.log('Delete attempt - currentRecipeUrl:', currentRecipeUrl, 'currentSavedRecipeId:', currentSavedRecipeId);
    
    if (!currentRecipeUrl) {
      console.error('No recipe URL found for deletion');
      setShowDeleteConfirmModal(false);
      return;
    }

    try {
      // Use cascading delete to remove from all collections (same as bin icon)
      const { error } = await deleteRecipeFromAllCollections(currentRecipeUrl);
      
      if (error) {
        console.error('Failed to delete recipe:', error);
        // You could show an error toast here
      } else {
        // Successfully deleted
        setIsRecipeCurrentlySaved(false);
        setCurrentSavedRecipeId(null);
        console.log('Recipe deleted successfully from all collections');
      }
    } catch (error) {
      console.error('Error deleting recipe:', error);
    } finally {
      setShowDeleteConfirmModal(false);
    }
  };

  const handleEditRecipe = (_recipeToEdit: Recipe) => {
    setShowEditModal(true);
  };

  const handleUpdateRecipe = (updatedRecipe: Recipe) => {
    // Update the current recipe with the edited data
    setRecipe(updatedRecipe);
    
    // If this is a saved recipe, we might want to update it in the database
    // For now, we'll just update the local state
  };

  const checkIfRecipeSaved = useCallback(async (url: string) => {
    if (!user) return;
    
    const { data, recipeId } = await isRecipeSaved(url);
    setIsRecipeCurrentlySaved(data);
    setCurrentSavedRecipeId(recipeId);
    
    // If recipe is already saved, keep the button visible but show "Saved" state
    // Don't animate it out since user might want to see the saved status
  }, [user]);

  const handleSelectSavedRecipe = (savedRecipe: Recipe, url: string, recipeId?: string) => {
    setRecipe(savedRecipe);
    setCurrentRecipeUrl(url);
    setIsRecipeCurrentlySaved(true);
    setCurrentSavedRecipeId(recipeId || null);
    setIsViewingFromSavedRecipes(true); // Mark as viewing from saved recipes
    setShowAIChat(false); // Always close AI chat when opening a saved recipe
    setError(null);
  };

  const handleParseRecipe = useCallback(async (url: string, sourceType: SourceType = 'web') => {
    // Check if user is logged in
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setLoading(true);
    setError(null);
    setRecipe(null);
    setCurrentRecipeUrl(url);
    setIsRecipeCurrentlySaved(false);
    setIsViewingFromSavedRecipes(false); // Reset flag when manually searching

    // Check if it's an Instagram URL
    const isInstagramUrl = url.includes('instagram.com/p/') || 
                          url.includes('instagram.com/reel/') || 
                          url.includes('instagram.com/tv/');

    // If Instagram URL is detected but sourceType is 'web', auto-switch
    if (isInstagramUrl && sourceType === 'web') {
      sourceType = 'instagram';
    }

    // Create AbortController for request cancellation
    const abortController = new AbortController();
    
    // Set timeout to cancel request after 30 seconds
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 45000);

    try {
      // Route to appropriate API endpoint based on source type
      const apiEndpoint = sourceType === 'instagram' ? '/api/parse-instagram' : '/api/parse-recipe';
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
        signal: abortController.signal, // Add abort signal
      });

      // Clear timeout if request completes
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        // Handle Instagram fallback mode
        if (response.status === 422 && data.fallbackMode) {
          setError(`${data.error}\n\n${data.caption ? 'Caption preview: ' + data.caption : ''}`);
          // TODO: Show manual recipe builder modal
          return;
        }
        throw new Error(data.error || 'Failed to parse recipe');
      }

      setRecipe(data.recipe);
      
      // Check if recipe is already saved
      if (user) {
        await checkIfRecipeSaved(url);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out after 30 seconds. Please try again or check if the URL is accessible.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An error occurred while parsing the recipe');
      }
    } finally {
      setLoading(false);
    }
  }, [checkIfRecipeSaved, user, setShowAuthModal]);

  // Recipe storage functions
  const storeRecipe = (recipe: Recipe) => {
    const id = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const recipeData = { ...recipe, id, url: currentRecipeUrl };
    sessionStorage.setItem(`recipe_${id}`, JSON.stringify(recipeData));
    return id;
  };

  const getStoredRecipe = (id: string): Recipe | null => {
    try {
      const stored = sessionStorage.getItem(`recipe_${id}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  // Handle shared recipe URLs
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedRecipeUrl = urlParams.get('recipe');
    const sharedRecipeId = urlParams.get('id');
    
    if (sharedRecipeId && !recipe) {
      // Load pre-parsed recipe from storage
      const storedRecipe = getStoredRecipe(sharedRecipeId);
      if (storedRecipe) {
        setRecipe(storedRecipe);
        setCurrentRecipeUrl((storedRecipe as Recipe & { url?: string }).url || '');
        setError(null);
        // Clean up the URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
    }
    
    if (sharedRecipeUrl && !recipe) {
      // Auto-parse the shared recipe (fallback for old links)
      const decodedUrl = decodeURIComponent(sharedRecipeUrl);
      const isInstagram = decodedUrl.includes('instagram.com/');
      handleParseRecipe(decodedUrl, isInstagram ? 'instagram' : 'web');
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [recipe, handleParseRecipe]);

  // Disable scroll on home page (when no recipe is displayed) - only on desktop
  useEffect(() => {
    if (!recipe) {
      // Only disable scroll on desktop devices (768px and above)
      if (window.innerWidth >= 768) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [recipe]);

  return (
    <div className="min-h-screen bg-background">
      {/* Maintenance Popup - Unremovable */}
      {/* <MaintenancePopup /> */}
      
      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
        {/* Saved Recipes Button - Only show when user is logged in and not viewing a recipe */}
        {user && !recipe && (
          <button
            onClick={() => setShowSavedRecipes(true)}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg shadow-sm hover:bg-accent transition-colors"
            title="Saved Recipes"
            data-tutorial="collections-button"
          >
            <Bookmark className="w-4 h-4 text-primary" />
            <span className="text-label text-card-foreground">Saved</span>
          </button>
        )}

        {/* User Auth Section */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg shadow-sm hover:bg-accent transition-colors"
            >
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-label text-card-foreground">
                {user.name}
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showUserDropdown && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 30,
                    duration: 0.2
                  }}
                  className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg overflow-hidden origin-top-right"
                >
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="p-3 border-b border-border"
                  >
                    <p className="text-label text-card-foreground">{user.name}</p>
                    <p className="text-caption text-muted-foreground">{user.email}</p>
                  </motion.div>
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    whileHover={{ backgroundColor: "hsl(var(--accent))" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={tutorial.startTutorial}
                    className="w-full flex items-center gap-3 px-3 py-2 text-body-sm text-card-foreground transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                    {tutorial.isCompleted ? 'Help' : 'Start Tutorial'}
                  </motion.button>
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    whileHover={{ backgroundColor: "hsl(var(--accent))" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-body-sm text-card-foreground transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button
            onClick={() => {
              setAuthMode('signup');
              setShowAuthModal(true);
            }}
            className="px-4 py-2 text-button text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            Sign Up
          </button>
        )}
      </div>

      
      {/* Top Navigation Bar - Only show when recipe is displayed or during tutorial */}
      {(recipe || (tutorial.isActive && tutorial.currentStep?.id === 'save-recipe')) && (
        <>
          {/* Mobile Navigation */}
          <nav className="md:hidden sticky top-0 z-50 bg-background border-b border-border">
            <div className="flex items-center justify-between px-4 py-3">
              {/* Left - Back Arrow */}
              <button
                onClick={() => {
                  setRecipe(null);
                  setError(null);
                  setIsViewingFromSavedRecipes(false);
                }}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                aria-label="Go back"
              >
                <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Right - Action Icons */}
              <div className="flex items-center gap-1">
                {/* Save Button - Only show when user is logged in */}
                {user && (
                  <button
                    onClick={isRecipeCurrentlySaved ? handleDeleteRecipe : handleSaveRecipe}
                    disabled={tutorial.isActive && tutorial.currentStep?.id === 'save-recipe'}
                    className={`p-2 rounded-lg transition-colors ${
                      isRecipeCurrentlySaved 
                        ? 'text-white hover:bg-white/10' 
                        : 'text-foreground hover:bg-accent'
                    }`}
                    aria-label={isRecipeCurrentlySaved ? "Remove from collections" : "Save recipe"}
                    title={isRecipeCurrentlySaved ? "Remove from collections" : "Save recipe"}
                    data-tutorial="save-button"
                  >
                    {isRecipeCurrentlySaved ? (
                      <BookmarkCheck className="w-6 h-6" fill="currentColor" />
                    ) : (
                      <Bookmark className="w-6 h-6" />
                    )}
                  </button>
                )}

                {/* Edit Button - Only show when viewing from saved recipes */}
                {isViewingFromSavedRecipes && (
                  <button 
                    onClick={() => setShowEditModal(true)} 
                    className="p-2 hover:bg-accent rounded-lg transition-colors" 
                    aria-label="Edit recipe"
                  >
                    <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
                
                <button 
                  onClick={async () => {
                    try {
                      if (recipe) {
                        // Store the recipe and get a shareable ID
                        const recipeId = storeRecipe(recipe);
                        const shareUrl = `${window.location.origin}?id=${recipeId}`;
                        
                        if (navigator.share) {
                          await navigator.share({
                            title: `${recipe.title} - Tastoria`,
                            text: `Check out this clean, easy-to-follow recipe: ${recipe.title}`,
                            url: shareUrl
                          });
                        } else {
                          // Fallback: copy to clipboard
                          await navigator.clipboard.writeText(shareUrl);
                          // Could show a toast notification here
                        }
                      }
                    } catch (error) {
                      console.log('Share failed:', error);
                      // Fallback: try to copy to clipboard
                      try {
                        if (recipe) {
                          const recipeId = storeRecipe(recipe);
                          const shareUrl = `${window.location.origin}?id=${recipeId}`;
                          await navigator.clipboard.writeText(shareUrl);
                        }
                      } catch (clipboardError) {
                        console.log('Clipboard fallback failed:', clipboardError);
                      }
                    }
                  }}
                  className="p-2 hover:bg-accent rounded-lg transition-colors" 
                  aria-label="Share recipe"
                >
                  <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                </button>
              </div>
        </div>
          </nav>

          {/* Desktop Navigation */}
          <nav className="hidden md:block sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setRecipe(null);
                    setError(null);
                    setIsViewingFromSavedRecipes(false);
                  }}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className="p-1.5 bg-primary/10 rounded-lg">
          <Image
                      src="/logo.png" 
                      alt="Tastoria Logo" 
                      width={32} 
                      height={32}
                      className="w-8 h-8"
                    />
                  </div>
                  <span className="text-h3 text-foreground">Tastoria</span>
                </button>
                

                <div className="flex items-center gap-4">
                  {/* Save Button - Only show when user is logged in and not viewing from saved recipes */}
                  {user && (
                    <button
                      onClick={isRecipeCurrentlySaved ? handleDeleteRecipe : handleSaveRecipe}
                      disabled={tutorial.isActive && tutorial.currentStep?.id === 'save-recipe'}
                      className={`p-2 rounded-lg transition-colors ${
                        isRecipeCurrentlySaved 
                          ? 'text-white hover:bg-white/10' 
                          : 'text-foreground hover:bg-accent'
                      }`}
                      aria-label={isRecipeCurrentlySaved ? "Remove from collections" : "Save recipe"}
                      title={isRecipeCurrentlySaved ? "Remove from collections" : "Save recipe"}
                      data-tutorial="save-button"
                    >
                      {isRecipeCurrentlySaved ? (
                        <BookmarkCheck className="w-5 h-5" fill="currentColor" />
                      ) : (
                        <Bookmark className="w-5 h-5" />
                      )}
                    </button>
                  )}

                  {/* Edit Button - Only show when viewing from saved recipes */}
                  {isViewingFromSavedRecipes && (
                    <button 
                      onClick={() => setShowEditModal(true)} 
                      className="p-2 hover:bg-accent rounded-lg transition-colors" 
                      aria-label="Edit recipe"
                      title="Edit recipe"
                    >
                      <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}

                  {/* Share Button */}
                  <button 
                    onClick={async () => {
                      try {
                        if (recipe) {
                          // Store the recipe and get a shareable ID
                          const recipeId = storeRecipe(recipe);
                          const shareUrl = `${window.location.origin}?id=${recipeId}`;
                          
                          if (navigator.share) {
                            await navigator.share({
                              title: `${recipe.title} - Tastoria`,
                              text: `Check out this clean, easy-to-follow recipe: ${recipe.title}`,
                              url: shareUrl
                            });
                          } else {
                            // Fallback: copy to clipboard
                            await navigator.clipboard.writeText(shareUrl);
                            // Could show a toast notification here
                          }
                        }
                      } catch (error) {
                        console.log('Share failed:', error);
                        // Fallback: try to copy to clipboard
                        try {
                          if (recipe) {
                            const recipeId = storeRecipe(recipe);
                            const shareUrl = `${window.location.origin}?id=${recipeId}`;
                            await navigator.clipboard.writeText(shareUrl);
                          }
                        } catch (clipboardError) {
                          console.log('Clipboard fallback failed:', clipboardError);
                        }
                      }
                    }}
                    className="p-2 hover:bg-accent rounded-lg transition-colors" 
                    aria-label="Share recipe"
                    title="Share recipe"
                  >
                    <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                  </button>


                  {/* Auth Section */}
                  {user ? (
                    <div className="relative" ref={desktopDropdownRef}>
                      <button
                        onClick={() => setShowDesktopUserDropdown(!showDesktopUserDropdown)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg hover:bg-accent transition-colors"
                      >
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-label text-card-foreground">
                          {user.name}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showDesktopUserDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Menu */}
                      <AnimatePresence>
                        {showDesktopUserDropdown && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ 
                              type: "spring", 
                              stiffness: 300, 
                              damping: 30,
                              duration: 0.2
                            }}
                            className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg overflow-hidden origin-top-right"
                          >
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.1 }}
                              className="p-3 border-b border-border"
                            >
                              <p className="text-sm font-medium text-card-foreground">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </motion.div>
                            <motion.button
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.15 }}
                              whileHover={{ backgroundColor: "hsl(var(--accent))" }}
                              whileTap={{ scale: 0.98 }}
                              onClick={handleDesktopLogout}
                              className="w-full flex items-center gap-3 px-3 py-2 text-body-sm text-card-foreground transition-colors"
                            >
                              <LogOut className="w-4 h-4" />
                              Sign out
                            </motion.button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setAuthMode('signup');
                        setShowAuthModal(true);
                      }}
                      className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Sign Up
                    </button>
                  )}
                </div>
              </div>
            </div>
          </nav>
        </>
      )}

      {/* Hero Section - Only show when no recipe */}
      {!recipe && (
        <div className="flex flex-col min-h-screen relative">
          {/* LiquidEther Background */}
          <div className="absolute inset-0 z-0 md:pointer-events-auto pointer-events-none">
            <LiquidEther
              colors={['#ffe0c2', '#393028', '#ffe0c2']}
              mouseForce={20}
              cursorSize={100}
              isViscous={false}
              viscous={30}
              iterationsViscous={32}
              iterationsPoisson={32}
              resolution={0.5}
              isBounce={false}
              autoDemo={true}
              autoSpeed={0.5}
              autoIntensity={2.2}
              takeoverDuration={0.25}
              autoResumeDelay={3000}
              autoRampDuration={0.6}
            />
          </div>
          {/* Mobile Layout */}
          <div className="md:hidden flex flex-col min-h-screen relative z-10 pointer-events-none" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
            {/* Mobile Header */}
            <div className="flex items-center justify-between p-4 pt-6">
              <div className="flex items-center">
          <Image
                  src="/logo.png" 
                  alt="Tastoria Logo" 
                  width={48} 
                  height={48}
                  className="w-12 h-12 -mt-3 -mr-1"
                />
              </div>
            </div>

            {/* Mobile Content */}
            <div className="flex-1 flex flex-col justify-center px-4">
              {/* Mobile Recipe Preview Mockup */}
              <div className="relative mx-4 mb-8">
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary/5 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-secondary/10 rounded-full blur-3xl"></div>
                
                <div className="relative bg-card/20 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden transform rotate-2 hover:rotate-0 transition-transform duration-500">
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-3.5 h-3.5 bg-red-400 rounded-full"></div>
                      <div className="w-3.5 h-3.5 bg-yellow-400 rounded-full"></div>
                      <div className="w-3.5 h-3.5 bg-green-400 rounded-full"></div>
                    </div>
                    
                    <div className="space-y-4 text-left">
                      <div className="h-6 bg-foreground rounded-md w-3/4"></div>
                      <div className="h-4 bg-muted-foreground/30 rounded-md w-full"></div>
                      <div className="h-4 bg-muted-foreground/30 rounded-md w-4/5"></div>
                      
                      <div className="pt-4">
                        <div className="text-sm font-semibold text-primary mb-3">Ingredients</div>
                        <div className="space-y-2">
                          <div className="h-4 bg-accent/50 rounded-md w-4/5"></div>
                          <div className="h-4 bg-accent/50 rounded-md w-3/4"></div>
                          <div className="h-4 bg-accent/50 rounded-md w-5/6"></div>
                        </div>
                      </div>
                      
                      <div className="pt-4">
                        <div className="text-sm font-semibold text-primary mb-3">Directions</div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-xs text-primary-foreground font-bold">1</span>
                            </div>
                            <div className="h-4 bg-accent/50 rounded-md flex-1"></div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-xs text-primary-foreground font-bold">2</span>
                            </div>
                            <div className="h-4 bg-accent/50 rounded-md flex-1"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Heading */}
              <div className="text-left mb-8">
                <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">
                  Clear away the clutter
                  <br />
                  <BlurText 
                    text="on any recipe site."
                    className="text-primary"
                    delay={100}
                    animateBy="words"
                    direction="top"
                  />
                </h1>
                
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Get the instructions without the fluff. No more popups, ads, or life stories.
                </p>
              </div>

              {/* Mobile Search Form */}
              <div className="px-2 pointer-events-auto">
                <RecipeForm onSubmit={handleParseRecipe} loading={loading} />
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex flex-col items-center justify-center min-h-screen px-4 text-center relative z-10 pointer-events-none" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="max-w-4xl mx-auto">
              {/* Main Heading */}
              <div className="mb-8">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="p-4 bg-primary/10 rounded-2xl">
          <Image
                      src="/logo.png" 
                      alt="Tastoria Logo" 
                      width={64} 
                      height={64}
                      className="w-16 h-16"
                    />
                  </div>
                </div>
                
                <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 tracking-tight">
                  Clear away the clutter
                  <br />
                  <BlurText 
                    text="on any recipe site."
                    className="text-primary"
                    delay={150}
                    animateBy="words"
                    direction="top"
                  />
                </h1>
                
                <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
                  Get the instructions without the fluff. No more popups, ads, or life stories.
                </p>
              </div>

              {/* Search Form */}
              <div className="mb-16 pointer-events-auto">
                <RecipeForm onSubmit={handleParseRecipe} loading={loading} />
              </div>

              {/* Recipe Preview Mockup */}
              <div className="relative max-w-2xl mx-auto">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-secondary/10 rounded-full blur-3xl"></div>
                
                <div className="relative bg-card/20 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden transform rotate-3 hover:rotate-0 transition-transform duration-500">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    </div>
                    
                    <div className="space-y-4 text-left">
                      <div className="h-6 bg-foreground rounded w-3/4"></div>
                      <div className="h-4 bg-muted-foreground/30 rounded w-full"></div>
                      <div className="h-4 bg-muted-foreground/30 rounded w-5/6"></div>
                      
                      <div className="pt-4">
                        <div className="text-sm font-semibold text-primary mb-2">Ingredients</div>
                        <div className="space-y-2">
                          <div className="h-3 bg-accent/50 rounded w-4/5"></div>
                          <div className="h-3 bg-accent/50 rounded w-3/4"></div>
                          <div className="h-3 bg-accent/50 rounded w-5/6"></div>
                        </div>
                      </div>
                      
                      <div className="pt-4">
                        <div className="text-sm font-semibold text-primary mb-2">Directions</div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-xs text-primary-foreground font-bold">1</span>
                            </div>
                            <div className="h-3 bg-accent/50 rounded flex-1"></div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-xs text-primary-foreground font-bold">2</span>
                            </div>
                            <div className="h-3 bg-accent/50 rounded flex-1"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Error State */}
      {error && (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive text-center">{error}</p>
          </div>
        </div>
      )}

      {/* Recipe Display */}
      {recipe && !loading && (
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <RecipeDisplay 
              recipe={recipe} 
              onEditRecipe={handleEditRecipe}
              onUpdateRecipe={handleUpdateRecipe}
              isEditable={isViewingFromSavedRecipes}
              savedRecipeId={currentSavedRecipeId}
            />
          </div>
        </div>
      )}


      {/* Collection Modal */}
      {recipe && (
        <CollectionModal
          isOpen={showCollectionModal}
          onClose={() => setShowCollectionModal(false)}
          recipe={recipe}
          recipeUrl={currentRecipeUrl}
          onSaved={() => {
            setIsRecipeCurrentlySaved(true);
            setShowCollectionModal(false);
            
            // Don't animate the button away - instead show "Saved" state
            // The button will now show green "Saved" state instead of disappearing
          }}
        />
      )}

      {/* Saved Recipes Modal */}
      <SavedRecipes
        isOpen={showSavedRecipes}
        onClose={() => setShowSavedRecipes(false)}
        onSelectRecipe={handleSelectSavedRecipe}
      />

      {/* Edit Recipe Modal */}
      {recipe && (
        <EditRecipeModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          recipe={{
            id: currentSavedRecipeId || '',
            title: recipe.title,
            image: recipe.image || '',
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
            metadata: recipe.metadata
          }}
          onSave={async (updates) => {
            if (!currentSavedRecipeId) return;
            
            try {
              // Update title if changed
              if (updates.title !== recipe.title) {
                const { error: titleError } = await updateRecipeTitle(currentSavedRecipeId, updates.title);
                if (titleError) {
                  console.error('Failed to update title:', titleError);
                  return;
                }
                // Update local recipe state
                setRecipe(prev => prev ? { ...prev, title: updates.title } : null);
              }
              
              // Update ingredients if changed
              if (JSON.stringify(updates.ingredients) !== JSON.stringify(recipe.ingredients)) {
                const { error: ingredientsError } = await updateRecipeIngredients(currentSavedRecipeId, updates.ingredients);
                if (ingredientsError) {
                  console.error('Failed to update ingredients:', ingredientsError);
                  return;
                }
                // Update local recipe state
                setRecipe(prev => prev ? { ...prev, ingredients: updates.ingredients } : null);
              }
              
              // Update instructions if changed
              if (JSON.stringify(updates.instructions) !== JSON.stringify(recipe.instructions)) {
                const { error: instructionsError } = await updateRecipeInstructions(currentSavedRecipeId, updates.instructions);
                if (instructionsError) {
                  console.error('Failed to update instructions:', instructionsError);
                  return;
                }
                // Update local recipe state
                setRecipe(prev => prev ? { ...prev, instructions: updates.instructions } : null);
              }
              
              // Update custom preview if changed
              const currentPreview = recipe.metadata?.customPreview;
              const newPreview = updates.customPreview;
              
              if (JSON.stringify(currentPreview) !== JSON.stringify(newPreview)) {
                const { error: previewError } = await updateRecipeCustomPreview(currentSavedRecipeId, newPreview);
                if (previewError) {
                  console.error('Failed to update preview:', previewError);
                  return;
                }
                // Update local recipe state
                setRecipe(prev => prev ? { 
                  ...prev, 
                  metadata: { 
                    ...prev.metadata, 
                    customPreview: newPreview || undefined
                  } 
                } : null);
              }
              
              setShowEditModal(false);
            } catch (error) {
              console.error('Error updating recipe:', error);
            }
          }}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />

      {/* Construction Alert */}
      {showConstructionAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowConstructionAlert(false)} />
          <div className="relative bg-card rounded-lg shadow-xl border border-border p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                Under Construction
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Collections feature is coming soon! We&apos;re working hard to bring you the ability to organize your recipes into custom collections.
              </p>
              <button
                onClick={() => setShowConstructionAlert(false)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial System */}
      <TutorialOverlay
        isActive={tutorial.isActive}
        currentStep={tutorial.currentStep}
        currentStepIndex={tutorial.currentStepIndex}
        progress={tutorial.progress}
        onNext={tutorial.nextStep}
        onPrevious={tutorial.previousStep}
        onSkip={tutorial.skipTutorial}
        onComplete={tutorial.completeTutorial}
        totalSteps={tutorial.totalSteps}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirmModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setShowDeleteConfirmModal(false)}
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div 
                className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-card-foreground">Remove Recipe</h3>
                  </div>
                  <p className="text-muted-foreground">
                    Are you sure you want to remove this recipe from your collections? This action cannot be undone.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-6 pt-4">
                  <button
                    onClick={() => setShowDeleteConfirmModal(false)}
                    className="flex-1 h-10 px-4 bg-background border border-border text-foreground rounded-lg hover:bg-accent transition-colors font-medium text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteRecipe}
                    className="flex-1 h-10 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* AI Chat Button - Only show when viewing a recipe or during tutorial */}
      {(recipe || (tutorial.isActive && tutorial.currentStep?.id === 'ai-chat')) && (
        <AIChatButton 
          onClick={() => {
            // Don't open chat during tutorial
            if (tutorial.isActive && tutorial.currentStep?.id === 'ai-chat') {
              return;
            }
            setShowAIChat(true);
          }}
        />
      )}

      {/* AI Chat Modal */}
      {recipe && (
        <RecipeAIChat
          isOpen={showAIChat}
          onClose={() => setShowAIChat(false)}
          recipe={recipe}
        />
      )}

    </div>
  );
}