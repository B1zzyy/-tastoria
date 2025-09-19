'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Recipe } from '@/lib/recipe-parser';
import RecipeForm from '@/components/RecipeForm';
import RecipeDisplay from '@/components/RecipeDisplay';
import LoadingSpinner from '@/components/LoadingSpinner';
import ThemeToggle from '@/components/ThemeToggle';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/hooks/useAuth';
import { saveRecipe, isRecipeSaved } from '@/lib/recipeService';
import SavedRecipes from '@/components/SavedRecipes';
import { ChevronDown, LogOut, User, Bookmark, BookmarkCheck } from 'lucide-react';
import '@/lib/keepAlive'; // Import to initialize keep-alive service

export default function Home() {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showDesktopUserDropdown, setShowDesktopUserDropdown] = useState(false);
  const [showSavedRecipes, setShowSavedRecipes] = useState(false);
  const [currentRecipeUrl, setCurrentRecipeUrl] = useState<string>('');
  const [isRecipeCurrentlySaved, setIsRecipeCurrentlySaved] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [showConstructionAlert, setShowConstructionAlert] = useState(false);
  
  // Use real authentication
  const { user, loading: authLoading, signOut } = useAuth();
  
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
    
    setSavingRecipe(true);
    const { error } = await saveRecipe(recipe, currentRecipeUrl);
    
    if (error) {
      setError(error instanceof Error ? error.message : 'Failed to save recipe');
    } else {
      setIsRecipeCurrentlySaved(true);
    }
    
    setSavingRecipe(false);
  };

  const checkIfRecipeSaved = async (url: string) => {
    if (!user) return;
    
    const { data } = await isRecipeSaved(url);
    setIsRecipeCurrentlySaved(data);
  };

  const handleSelectSavedRecipe = (savedRecipe: Recipe, url: string) => {
    setRecipe(savedRecipe);
    setCurrentRecipeUrl(url);
    setIsRecipeCurrentlySaved(true);
    setError(null);
  };

  const handleParseRecipe = async (url: string) => {
    setLoading(true);
    setError(null);
    setRecipe(null);
    setCurrentRecipeUrl(url);
    setIsRecipeCurrentlySaved(false);

    // Create AbortController for request cancellation
    const abortController = new AbortController();
    
    // Set timeout to cancel request after 30 seconds
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 30000);

    try {
      const response = await fetch('/api/parse-recipe', {
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
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Right Controls */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
        {/* Saved Recipes Button - Only show when user is logged in and not viewing a recipe */}
        {user && !recipe && (
          <button
            onClick={() => setShowSavedRecipes(true)}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg shadow-sm hover:bg-accent transition-colors"
            title="Saved Recipes"
          >
            <Bookmark className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-card-foreground">Saved</span>
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
              <span className="text-sm font-medium text-card-foreground">
                {user.name}
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                <div className="p-3 border-b border-border">
                  <p className="text-sm font-medium text-card-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-card-foreground hover:bg-accent transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              setAuthMode('signup');
              setShowAuthModal(true);
            }}
            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            Sign Up
          </button>
        )}
      </div>

      {/* Bottom Right Theme Toggle - Desktop Only */}
      <div className="hidden md:block fixed bottom-4 right-4 z-50">
        <ThemeToggle />
      </div>
      
      {/* Top Navigation Bar - Only show when recipe is displayed */}
      {recipe && (
        <>
          {/* Mobile Navigation */}
          <nav className="md:hidden sticky top-0 z-50 bg-background border-b border-border">
            <div className="flex items-center justify-between px-4 py-3">
              {/* Left - Back Arrow */}
              <button
                onClick={() => {
                  setRecipe(null);
                  setError(null);
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
                <button 
                  onClick={() => {
                    if (!user) {
                      setAuthMode('signup');
                      setShowAuthModal(true);
                    } else {
                      setShowConstructionAlert(true);
                    }
                  }}
                  className="p-2 hover:bg-accent rounded-lg transition-colors" 
                  aria-label="Save to collection"
                >
                  <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                
                <button 
                  onClick={() => window.print()} 
                  className="p-2 hover:bg-accent rounded-lg transition-colors" 
                  aria-label="Print recipe"
                >
                  <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </button>
                
                <button 
                  onClick={async () => {
                    try {
                      if (navigator.share && recipe) {
                        await navigator.share({
                          title: recipe.title,
                          text: `Check out this recipe: ${recipe.title}`,
                          url: window.location.href
                        });
                      } else {
                        // Fallback: copy to clipboard
                        await navigator.clipboard.writeText(window.location.href);
                        // Could show a toast notification here
                      }
                    } catch (error) {
                      console.log('Share failed:', error);
                      // Fallback: try to copy to clipboard
                      try {
                        await navigator.clipboard.writeText(window.location.href);
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
                  <span className="font-bold text-lg text-foreground">Tastoria</span>
                </button>
                
                <div className="flex-1 max-w-md mx-8">
                  <RecipeForm onSubmit={handleParseRecipe} loading={loading} compact />
        </div>

                <div className="flex items-center gap-4">
                  {/* Collection Button */}
                  <button 
                    onClick={() => {
                      if (!user) {
                        setAuthMode('signup');
                        setShowAuthModal(true);
                      } else {
                        setShowConstructionAlert(true);
                      }
                    }}
                    className="p-2 hover:bg-accent rounded-lg transition-colors" 
                    aria-label="Save to collection"
                    title="Save to collection"
                  >
                    <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>

                  {/* Print Button */}
                  <button 
                    onClick={() => window.print()} 
                    className="p-2 hover:bg-accent rounded-lg transition-colors" 
                    aria-label="Print recipe"
                    title="Print recipe"
                  >
                    <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </button>

                  {/* Share Button */}
                  <button 
                    onClick={async () => {
                      try {
                        if (navigator.share && recipe) {
                          await navigator.share({
                            title: recipe.title,
                            text: `Check out this recipe: ${recipe.title}`,
                            url: window.location.href
                          });
                        } else {
                          // Fallback: copy to clipboard
                          await navigator.clipboard.writeText(window.location.href);
                          // Could show a toast notification here
                        }
                      } catch (error) {
                        console.log('Share failed:', error);
                        // Fallback: try to copy to clipboard
                        try {
                          await navigator.clipboard.writeText(window.location.href);
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
                        <span className="text-sm font-medium text-card-foreground">
                          {user.name}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showDesktopUserDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Menu */}
                      {showDesktopUserDropdown && (
                        <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                          <div className="p-3 border-b border-border">
                            <p className="text-sm font-medium text-card-foreground">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                          <button
                            onClick={handleDesktopLogout}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-card-foreground hover:bg-accent transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign out
                          </button>
                        </div>
                      )}
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
        <div className="flex flex-col min-h-screen">
          {/* Mobile Layout */}
          <div className="md:hidden flex flex-col min-h-screen">
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
            <div className="flex-1 flex flex-col justify-center px-4 pb-8">
              {/* Mobile Recipe Preview Mockup */}
              <div className="relative mx-4 mb-8">
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary/5 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-secondary/10 rounded-full blur-3xl"></div>
                
                <div className="relative bg-card rounded-2xl shadow-2xl border border-border overflow-hidden transform rotate-2 hover:rotate-0 transition-transform duration-500">
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
                  <span className="text-primary">on any recipe site.</span>
                </h1>
                
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Get the instructions without the fluff. No more popups, ads, or life stories.
                </p>
              </div>

              {/* Mobile Search Form */}
              <div className="px-2">
                <RecipeForm onSubmit={handleParseRecipe} loading={loading} />
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex flex-col items-center justify-center min-h-screen px-4 text-center">
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
                  <span className="text-primary">on any recipe site.</span>
                </h1>
                
                <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
                  Get the instructions without the fluff. No more popups, ads, or life stories.
                </p>
              </div>

              {/* Search Form */}
              <div className="mb-16">
                <RecipeForm onSubmit={handleParseRecipe} loading={loading} />
              </div>

              {/* Recipe Preview Mockup */}
              <div className="relative max-w-2xl mx-auto">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-secondary/10 rounded-full blur-3xl"></div>
                
                <div className="relative bg-card rounded-2xl shadow-2xl border border-border overflow-hidden transform rotate-3 hover:rotate-0 transition-transform duration-500">
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

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <LoadingSpinner />
          <p className="text-muted-foreground mt-4">Parsing recipe...</p>
          <p className="text-muted-foreground text-sm mt-1">This may take up to 30 seconds</p>
          <button 
            onClick={() => {
              setLoading(false);
              setError('Recipe parsing was cancelled');
            }}
            className="mt-4 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>
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
            <RecipeDisplay recipe={recipe} />
          </div>
        </div>
      )}

      {/* Floating Save Recipe Button */}
      {recipe && user && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={handleSaveRecipe}
            disabled={savingRecipe || isRecipeCurrentlySaved}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium shadow-lg transition-all duration-200 ${
              isRecipeCurrentlySaved
                ? 'bg-green-600 text-green-50 hover:bg-green-700'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-xl'
            } ${savingRecipe ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
          >
            {savingRecipe ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isRecipeCurrentlySaved ? (
              <BookmarkCheck className="w-5 h-5" />
            ) : (
              <Bookmark className="w-5 h-5" />
            )}
            <span className="font-semibold">
              {isRecipeCurrentlySaved ? 'Saved' : savingRecipe ? 'Saving...' : 'Save'}
            </span>
          </button>
        </div>
      )}

      {/* Saved Recipes Modal */}
      <SavedRecipes
        isOpen={showSavedRecipes}
        onClose={() => setShowSavedRecipes(false)}
        onSelectRecipe={handleSelectSavedRecipe}
      />

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
    </div>
  );
}