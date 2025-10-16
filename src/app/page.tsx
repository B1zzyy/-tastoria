'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Recipe, IngredientSection } from '@/lib/recipe-parser';
import RecipeForm, { type SourceType } from '@/components/RecipeForm';
import RecipeDisplay from '@/components/RecipeDisplay';
import RecipeSkeleton from '@/components/RecipeSkeleton';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/hooks/useAuth';
import { useTrial } from '@/hooks/useTrial';
import { useToast } from '@/components/ToastProvider';
import { isRecipeSaved, updateRecipeTitle, updateRecipeCustomPreview, updateRecipeInstructions, updateRecipeIngredients } from '@/lib/recipeService';
import { deleteRecipeFromAllCollections } from '@/lib/collectionsService';
import SavedRecipes from '@/components/SavedRecipes';
import CollectionModal from '@/components/CollectionModal';
import EditRecipeModal from '@/components/EditRecipeModal';
import BlurText from '../components/BlurText';
import LiquidEther from '../components/LiquidEther';
import { ChevronDown, LogOut, User, Bookmark, BookmarkCheck, HelpCircle, Link } from 'lucide-react';
import '@/lib/keepAlive'; // Import to initialize keep-alive service
import TutorialOverlay from '@/components/TutorialOverlay';
import { useTutorial } from '@/hooks/useTutorial';
import AIChatButton from '@/components/AIChatButton';
import RecipeAIChat from '@/components/RecipeAIChat';
import { PaywallModal } from '@/components/PaywallModal';
import UserProfileModal from '@/components/UserProfileModal';
import WelcomeTrialModal from '@/components/WelcomeTrialModal';
import PremiumUpgradeSection from '@/components/PremiumUpgradeSection';
import ScrollIndicator from '@/components/ScrollIndicator';
import { generateShortRecipeShareUrl, getSharedRecipeFromUrl } from '@/lib/urlSharing';
import { PaymentService } from '@/lib/paymentService';
import { supabase } from '@/lib/supabase';
import Footer from '@/components/Footer';
import { ToastContainer } from '@/components/Toast';
import { ConnectionHealth } from '@/lib/connectionHealth';


export default function Home() {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tutorial system
  const tutorial = useTutorial();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showDesktopUserDropdown, setShowDesktopUserDropdown] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showWelcomeTrialModal, setShowWelcomeTrialModal] = useState(false);
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null);
  const [isSubscriptionCancelled, setIsSubscriptionCancelled] = useState(false);
  const [showSavedRecipes, setShowSavedRecipes] = useState(false);
  const [currentRecipeUrl, setCurrentRecipeUrl] = useState<string>('');
  const [isRecipeCurrentlySaved, setIsRecipeCurrentlySaved] = useState(false);
  const [currentSavedRecipeId, setCurrentSavedRecipeId] = useState<string | null>(null);
  const [showConstructionAlert, setShowConstructionAlert] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<string>('');
  
  // Use real authentication
  const { user, signOut } = useAuth();
  
  // Use trial system
  const { canAccessFeature, isPaidUser, trialDisplayInfo, loading: trialLoading } = useTrial();
  
  // Use toast notifications
  const { toasts, toast, removeToast } = useToast();
  
  // Helper function to check feature access
  const checkFeatureAccess = async (feature: 'collections' | 'ai_chat' | 'unlimited_parsing', featureName: string) => {
    if (!user) {
      setShowAuthModal(true);
      return false;
    }
    
    const hasAccess = await canAccessFeature();
    if (!hasAccess) {
      setPaywallFeature(featureName);
      setShowPaywall(true);
      return false;
    }
    return true;
  };
  
  // Debug user state changes
  useEffect(() => {
    console.log('User state changed:', user);
  }, [user]);

  // Handle skeleton loading delay
  useEffect(() => {
    if (loading) {
      // Show skeleton after 500ms delay
      const timer = setTimeout(() => {
        setShowSkeleton(true);
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      // Reset skeleton when loading stops
      setShowSkeleton(false);
    }
  }, [loading]);

  // Safety mechanism to reset loading state if it gets stuck
  useEffect(() => {
    if (loading) {
      const safetyTimer = setTimeout(() => {
        console.log('⚠️ Loading state stuck for 60 seconds, resetting...');
        setLoading(false);
        setShowSkeleton(false);
        setError('Request timed out. Please try again.');
        toast.error("Error getting recipe", "Refresh the page and try again.");
      }, 60000); // 60 second safety timeout

      return () => clearTimeout(safetyTimer);
    }
  }, [loading]);

  // Auto-show paywall for expired trials
  useEffect(() => {
    if (user && trialDisplayInfo && trialDisplayInfo.status === 'expired' && !showPaywall) {
      setPaywallFeature('All Premium Features');
      setShowPaywall(true);
    }
  }, [user, trialDisplayInfo, showPaywall]);

  // Check if subscription is cancelled
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!user) return;
      
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_end_date')
          .eq('id', user.id)
          .single();

        if (profile && !error) {
          const isCancelled = profile.subscription_status === 'expired' && profile.subscription_end_date;
          setIsSubscriptionCancelled(isCancelled);
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
      }
    };

    checkSubscriptionStatus();
  }, [user]);

  // Close auth modal when user successfully logs in
  useEffect(() => {
    if (user && showAuthModal) {
      setShowAuthModal(false);
    }
  }, [user, showAuthModal]);

  // Handle payment success
  useEffect(() => {
    const handlePaymentSuccess = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      const sessionId = urlParams.get('session_id');

      // Check if we've already processed this payment
      if (localStorage.getItem('paymentProcessed') === sessionId) {
        return;
      }

      if (paymentStatus === 'success' && sessionId) {
        // Mark this payment as processed
        localStorage.setItem('paymentProcessed', sessionId);
        
        // Verify payment and update subscription
        const result = await PaymentService.verifyPayment(sessionId);
        
        if (result.success) {
          // Close paywall and refresh trial status
          setShowPaywall(false);
          // Clean up URL parameters
          window.history.replaceState({}, '', window.location.pathname);
          // Force refresh trial status
          window.location.reload();
        }
      } else if (paymentStatus === 'cancelled') {
        // User cancelled payment, just close paywall
        setShowPaywall(false);
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    };

    handlePaymentSuccess();
  }, []);

  // Load user profile image
  const loadUserProfileImage = useCallback(async () => {
    if (!user) {
      setUserProfileImage(null);
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_image_url')
        .eq('id', user.id)
        .single();

      if (profile?.profile_image_url) {
        setUserProfileImage(profile.profile_image_url);
      } else {
        setUserProfileImage(null);
      }
    } catch {
      console.log('No profile image found');
      setUserProfileImage(null);
    }
  }, [user]);

  // Load profile image when user changes
  useEffect(() => {
    loadUserProfileImage();
  }, [user, loadUserProfileImage]);

  // Listen for user update events to force re-render
  useEffect(() => {
    const handleUserUpdate = () => {
      console.log('User update event received, forcing complete re-render...');
      // Force a complete page refresh to ensure all components update
      setTimeout(() => {
        window.location.reload();
      }, 200);
    };

    window.addEventListener('userUpdated', handleUserUpdate);
    return () => window.removeEventListener('userUpdated', handleUserUpdate);
  }, []);

  // Show welcome message for new users or expired trials
  useEffect(() => {
    // Reset tutorial completion for new users (less than 1 hour old)
    const isNewUser = user?.created_at && 
      (Date.now() - new Date(user.created_at).getTime()) < (60 * 60 * 1000);
    
    // Reset tutorial completion for new users
    if (isNewUser && tutorial.isCompleted) {
      tutorial.resetTutorial();
    }
    
    if (user && !tutorial.isCompleted && !tutorial.isActive) {
      // Check if we've shown the welcome modal for this user before
      const welcomeModalShown = localStorage.getItem(`welcome-shown-${user.id}`);
      
      // Check if trial has expired
      const isTrialExpired = trialDisplayInfo && trialDisplayInfo.status === 'expired';
      
      // Show welcome modal if:
      // 1. User is new (less than 1 hour old) OR trial has expired
      // 2. AND we haven't shown it before
      if ((isNewUser || isTrialExpired) && !welcomeModalShown) {
        setShowWelcomeTrialModal(true);
        // Mark as shown for this user
        localStorage.setItem(`welcome-shown-${user.id}`, 'true');
      }
      
      // Auto-start tutorial for new users after a short delay (only if they haven't seen welcome modal)
      let timer: NodeJS.Timeout | null = null;
      if (!welcomeModalShown) {
        timer = setTimeout(() => {
          tutorial.startTutorial();
        }, 2000);
      }
      
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [user, tutorial.isCompleted, tutorial.isActive, tutorial.startTutorial, tutorial, trialDisplayInfo]);

  
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
    
    // If user was viewing a recipe, clear it and go to home page
    if (recipe) {
      setRecipe(null);
      setCurrentRecipeUrl('');
      setIsRecipeCurrentlySaved(false);
      setCurrentSavedRecipeId(null);
      setError(null);
    }
  };

  const handleDesktopLogout = async () => {
    await signOut();
    setShowDesktopUserDropdown(false);
    
    // If user was viewing a recipe, clear it and go to home page
    if (recipe) {
      setRecipe(null);
      setCurrentRecipeUrl('');
      setIsRecipeCurrentlySaved(false);
      setCurrentSavedRecipeId(null);
      setError(null);
    }
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
        toast.error("Failed to remove recipe", "Please try again");
      } else {
        // Successfully deleted - redirect to home screen
        setIsRecipeCurrentlySaved(false);
        setCurrentSavedRecipeId(null);
        setRecipe(null);
        setCurrentRecipeUrl('');
        setError(null);
        
        // Show success toast
        toast.success("Recipe removed from collections");
        
        console.log('Recipe deleted successfully from all collections - redirected to home');
      }
    } catch (error) {
      console.error('Error deleting recipe:', error);
    } finally {
      setShowDeleteConfirmModal(false);
    }
  };

  // const handleEditRecipe = () => {
  //   setShowEditModal(true);
  // };

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
    setShowAIChat(false); // Always close AI chat when opening a saved recipe
    setError(null);
  };

  const handleParseRecipe = useCallback(async (url: string, sourceType: SourceType = 'web', retryCount = 0) => {
    // Check if user is logged in
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Prevent multiple simultaneous requests
    if (loading) {
      console.log('⚠️ Request already in progress, ignoring duplicate request');
      return;
    }

    // Check connection health before making request
    if (!ConnectionHealth.isConnected()) {
      setError('No internet connection. Please check your network and try again.');
      return;
    }

    // Check if it's an Instagram URL
    const isInstagramUrl = url.includes('instagram.com/p/') || 
                          url.includes('instagram.com/reel/') || 
                          url.includes('instagram.com/tv/');

    // Check if it's a Facebook URL
    const isFacebookUrl = url.includes('facebook.com') || url.includes('fb.com');

    console.log('🔍 URL Detection:', { url, isInstagramUrl, isFacebookUrl, sourceType });

    // Auto-detect source type if needed
    if (isInstagramUrl && sourceType === 'web') {
      sourceType = 'instagram';
    } else if (isFacebookUrl && sourceType === 'web') {
      sourceType = 'facebook';
    }

    console.log('🔍 Final source type:', sourceType);

    // Normalize Facebook URLs for consistent database storage
    let normalizedUrl = url;
    if (isFacebookUrl) {
      // Handle share URLs - DON'T normalize these, let the API resolve them
      const shareMatch = url.match(/(?:facebook\.com|fb\.com)\/share\/r\/([A-Za-z0-9_-]+)/);
      if (shareMatch) {
        // Keep the original share URL for API resolution
        normalizedUrl = url;
        console.log('🔗 Keeping Facebook share URL for API resolution:', normalizedUrl);
      } else {
        // Handle regular URLs
        const postIdMatch = url.match(/(?:facebook\.com|fb\.com)\/(?:reel|posts|videos|watch)\/([A-Za-z0-9_-]+)/);
        if (postIdMatch) {
          let postId = postIdMatch[1];
          // Clean the post ID - remove any trailing non-numeric characters
          if (/[a-zA-Z]+$/.test(postId)) {
            const numericMatch = postId.match(/^(\d+)/);
            if (numericMatch) {
              postId = numericMatch[1];
              console.log('🧹 Cleaned Facebook post ID in main page:', postId);
            }
          }
          normalizedUrl = `https://www.facebook.com/reel/${postId}`;
        }
      }
    }

    setLoading(true);
    setError(null);
    setRecipe(null);
    setCurrentRecipeUrl(normalizedUrl);
    setIsRecipeCurrentlySaved(false);

    // Create AbortController for request cancellation
    const abortController = new AbortController();
    
    // Set timeout to cancel request after 30 seconds
    const timeoutId = setTimeout(() => {
      console.log('⏰ Request timeout - aborting');
      abortController.abort();
    }, 30000);

    try {
      // Route to appropriate API endpoint based on source type
      let apiEndpoint = '/api/parse-recipe'; // Default to web parsing
      if (sourceType === 'instagram' || sourceType === 'facebook') {
        apiEndpoint = '/api/parse-instagram'; // Instagram endpoint now handles both Instagram and Facebook
      }

      console.log('🚀 Calling API endpoint:', apiEndpoint, 'with URL:', normalizedUrl);
      
      // TEMPORARY: Skip the isRecipeSaved check for Facebook to test parsing
      if (sourceType === 'facebook') {
        console.log('🚀 TEMPORARY: Skipping isRecipeSaved check for Facebook');
      } else {
        // Check if recipe is already saved
        const { isRecipeSaved } = await import('../lib/recipeService');
        const { data: isSaved, recipeId } = await isRecipeSaved(normalizedUrl);
        setIsRecipeCurrentlySaved(isSaved);
        if (isSaved && recipeId) {
          setCurrentSavedRecipeId(recipeId);
        }
      }
      
      // Get session token with timeout
      let sessionToken = '';
      try {
        const sessionPromise = supabase.auth.getSession();
        const sessionTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
        );
        
        const { data: { session } } = await Promise.race([sessionPromise, sessionTimeoutPromise]) as { data: { session: { access_token: string } | null } };
        sessionToken = session?.access_token || '';
      } catch (error) {
        console.error('Failed to get session token:', error);
        throw new Error('Authentication failed - please try logging in again');
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ url: normalizedUrl }),
        signal: abortController.signal, // Add abort signal
      });

      console.log('📡 API Response status:', response.status);
      console.log('📡 API Response ok:', response.ok);

      // Clear timeout if request completes
      clearTimeout(timeoutId);

      const data = await response.json();
      
      console.log('📡 API Response data:', data);
      console.log('📡 Recipe from API:', data.recipe);
      console.log('📡 Recipe instructions:', data.recipe?.instructions);

      if (!response.ok) {
        // Handle authentication and authorization errors
        if (response.status === 401) {
          setShowAuthModal(true);
          throw new Error('Please log in to parse recipes');
        } else if (response.status === 403) {
          setPaywallFeature('Recipe Parsing');
          setShowPaywall(true);
          throw new Error('Premium subscription required for recipe parsing');
        }
        
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
          toast.error("Error getting recipe", "Refresh the page and try again.");
        } else if (retryCount < 2 && (err.message.includes('timeout') || err.message.includes('network') || err.message.includes('fetch'))) {
          // Retry on network/timeout errors up to 2 times
          console.log(`🔄 Retrying request (attempt ${retryCount + 1}/2)...`);
          setTimeout(() => {
            handleParseRecipe(url, sourceType, retryCount + 1);
          }, 1000 * (retryCount + 1)); // Exponential backoff
          return;
        } else {
          setError(err.message);
        }
      } else {
        setError('An error occurred while parsing the recipe');
      }
      
      // Reset loading state on error
      setLoading(false);
      setShowSkeleton(false);
    } finally {
      setLoading(false);
    }
  }, [checkIfRecipeSaved, user, setShowAuthModal, loading, toast]);

  // Recipe storage functions

  // const loadSampleRecipe = useCallback(() => {
  //   setRecipe(sampleChocolateChipCookies);
  //   setCurrentRecipeUrl('sample://chocolate-chip-cookies');
  //   setIsViewingFromSavedRecipes(false);
  //   setError(null);
  // }, []);

  // Handle shared recipe URLs
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedRecipeData = urlParams.get('recipe');
    const sharedRecipeUrl = urlParams.get('url'); // Legacy support for old URL format
    
    if (sharedRecipeData && !recipe) {
      // Load recipe from URL-encoded data
      const decodedRecipe = getSharedRecipeFromUrl();
      if (decodedRecipe) {
        setRecipe(decodedRecipe);
        setCurrentRecipeUrl(''); // Reset URL since we're loading from shared data
        setError(null);
        // Clean up the URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
    }
    
    if (sharedRecipeUrl && !recipe) {
      // Auto-parse the shared recipe (legacy support for old links)
      const decodedUrl = decodeURIComponent(sharedRecipeUrl);
      const isInstagram = decodedUrl.includes('instagram.com/');
      handleParseRecipe(decodedUrl, isInstagram ? 'instagram' : 'web');
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [recipe, handleParseRecipe]);

  // Always allow scrolling since premium section is always present
  useEffect(() => {
    document.body.style.overflow = 'unset';

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Initialize connection health monitoring
  useEffect(() => {
    ConnectionHealth.init();
    
    const removeListener = ConnectionHealth.addListener((isOnline) => {
      if (!isOnline) {
        toast.error("Connection lost", "Please check your internet connection");
      } else {
        toast.info("Connection restored");
      }
    });

    return removeListener;
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content Area */}
      <div className="relative min-h-screen flex flex-col">
      {/* Maintenance Popup - Unremovable */}
      {/* <MaintenancePopup /> */}
      
      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
        {/* Saved Recipes Button - Only show when user is logged in and not viewing a recipe */}
        {user && !recipe && (
          <button
            onClick={async () => {
              const hasAccess = await checkFeatureAccess('collections', 'Collections & Saved Recipes');
              if (hasAccess) {
                setShowSavedRecipes(true);
              }
            }}
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
              {userProfileImage ? (
                <div className="w-6 h-6 rounded-full overflow-hidden -my-1">
                  <Image
                    src={userProfileImage}
                    alt="Profile"
                    width={24}
                    height={24}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <User className="w-4 h-4 text-muted-foreground" />
              )}
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
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowUserProfileModal(true);
                      setShowUserDropdown(false);
                    }}
                    className="w-full p-3 border-b border-border text-left transition-colors hover:bg-accent/80"
                  >
                    <div className="flex items-center gap-3">
                      {userProfileImage ? (
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                          <Image
                            src={userProfileImage}
                            alt="Profile"
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-label text-card-foreground">{user.name}</p>
                        {isPaidUser && !isSubscriptionCancelled ? (
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                            <span className="text-xs font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent">
                              PREMIUM
                            </span>
                          </div>
                        ) : isSubscriptionCancelled ? (
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-medium text-orange-500">
                              CANCELLED
                            </span>
                          </div>
                        ) : trialLoading ? (
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse"></div>
                            <span className="text-xs text-gray-400">
                              Loading...
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium text-gray-500">
                              TRIAL
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({trialDisplayInfo?.daysRemaining || 10} days left)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={tutorial.startTutorial}
                    className="w-full flex items-center gap-3 px-3 py-2 text-body-sm text-card-foreground transition-colors hover:bg-accent/80"
                  >
                    <HelpCircle className="w-4 h-4" />
                    {tutorial.isCompleted ? 'Help' : 'Start Tutorial'}
                  </motion.button>
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-body-sm text-card-foreground transition-colors hover:bg-accent/80"
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

      
      {/* Top Navigation Bar - Only show when recipe is displayed, skeleton loading, or during tutorial */}
      {(recipe || showSkeleton || (tutorial.isActive && tutorial.currentStep?.id === 'save-recipe')) && (
        <>
          {/* Mobile Navigation */}
          <nav className="md:hidden sticky top-0 z-50 bg-background border-b border-border">
            <div className="flex items-center justify-between px-4 py-3">
              {/* Left - Back Arrow */}
              <button
                onClick={() => {
                  setRecipe(null);
                  setError(null);
                  setLoading(false);
                  setShowSkeleton(false);
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
                {/* Save Button - Only show when user is logged in and not showing skeleton */}
                {user && !showSkeleton && (
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

                {/* Edit Button - Show when recipe is saved and not showing skeleton */}
                {isRecipeCurrentlySaved && !showSkeleton && (
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
                        // Generate shortened shareable URL with recipe data encoded
                        const shareUrl = await generateShortRecipeShareUrl(recipe);
                        
                        // Always copy to clipboard and show toast
                        await navigator.clipboard.writeText(shareUrl);
                        toast.info("Recipe link copied to clipboard");
                      }
                    } catch (error) {
                      console.log('Failed to copy recipe link:', error);
                      toast.error("Failed to copy link", "Please try again");
                    }
                  }}
                  className="p-2 hover:bg-accent rounded-lg transition-colors" 
                  aria-label="Copy recipe link"
                  title="Copy recipe link"
                >
                  <Link className="w-6 h-6 text-foreground" />
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
                    setLoading(false);
                    setShowSkeleton(false);
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
                  {/* Save Button - Only show when user is logged in and not showing skeleton */}
                  {user && !showSkeleton && (
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

                  {/* Edit Button - Show when recipe is saved and not showing skeleton */}
                  {isRecipeCurrentlySaved && !showSkeleton && (
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

                  {/* Copy Link Button */}
                  <button 
                    onClick={async () => {
                      try {
                        if (recipe) {
                          // Generate shortened shareable URL with recipe data encoded
                          const shareUrl = await generateShortRecipeShareUrl(recipe);
                          
                          // Always copy to clipboard and show toast
                          await navigator.clipboard.writeText(shareUrl);
                          toast.info("Recipe link copied to clipboard");
                        }
                      } catch (error) {
                        console.log('Failed to copy recipe link:', error);
                        toast.error("Failed to copy link", "Please try again");
                      }
                    }}
                    className="p-2 hover:bg-accent rounded-lg transition-colors" 
                    aria-label="Copy recipe link"
                    title="Copy recipe link"
                  >
                    <Link className="w-5 h-5 text-foreground" />
                  </button>


                  {/* Auth Section */}
                  {user ? (
                    <div className="relative" ref={desktopDropdownRef}>
                      <button
                        onClick={() => setShowDesktopUserDropdown(!showDesktopUserDropdown)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg hover:bg-accent transition-colors"
                      >
                        {userProfileImage ? (
                          <div className="w-6 h-6 rounded-full overflow-hidden -my-1">
                            <Image
                              src={userProfileImage}
                              alt="Profile"
                              width={24}
                              height={24}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <User className="w-4 h-4 text-muted-foreground" />
                        )}
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
                            <motion.button
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.1 }}
                              whileHover={{ backgroundColor: "hsl(var(--accent))" }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setShowUserProfileModal(true);
                                setShowDesktopUserDropdown(false);
                              }}
                              className="w-full p-3 border-b border-border text-left transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {userProfileImage ? (
                                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                                    <Image
                                      src={userProfileImage}
                                      alt="Profile"
                                      width={32}
                                      height={32}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-card-foreground">{user.name}</p>
                                  {isPaidUser && !isSubscriptionCancelled ? (
                                    <div className="flex items-center gap-1">
                                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                                      <span className="text-xs font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent">
                                        PREMIUM
                                      </span>
                                    </div>
                                  ) : isSubscriptionCancelled ? (
                                    <div className="flex items-center gap-1">
                                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                                      <span className="text-xs font-medium text-orange-500">
                                        CANCELLED
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-medium text-gray-500">
                                        TRIAL
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        ({trialDisplayInfo?.daysRemaining || 10} days left)
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.button>
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

      {/* Hero Section - Only show when no recipe and not showing skeleton */}
      {!recipe && !showSkeleton && (
        <div className="flex flex-col min-h-screen relative">
          {/* LiquidEther Background */}
          <div className="absolute inset-0 z-0 md:pointer-events-auto pointer-events-none">
            <LiquidEther
              colors={['#ffe0c2', '#393028', '#ffe0c2']}
              mouseForce={15}
              cursorSize={80}
              isViscous={false}
              viscous={20}
              iterationsViscous={16}
              iterationsPoisson={16}
              resolution={0.3}
              isBounce={false}
              autoDemo={true}
              autoSpeed={0.3}
              autoIntensity={1.5}
              takeoverDuration={0.2}
              autoResumeDelay={3000}
              autoRampDuration={0.8}
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
                <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight tracking-tight">
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
                
                {/* Sample Recipe Button - commented out for now */}
                {/* <div className="mt-4 flex justify-center">
                  <motion.button
                    onClick={loadSampleRecipe}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors border border-primary/20"
                  >
                    <Cookie className="w-4 h-4" />
                    <span className="text-sm font-medium">Try Sample Recipe</span>
                  </motion.button>
                </div> */}
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
              <div className="mb-8 pointer-events-auto">
                <RecipeForm onSubmit={handleParseRecipe} loading={loading} />
                
                {/* Sample Recipe Button - commented out for now */}
                {/* <div className="mt-4 flex justify-center">
                  <motion.button
                    onClick={loadSampleRecipe}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors border border-primary/20"
                  >
                    <Cookie className="w-4 h-4" />
                    <span className="text-sm font-medium">Try Sample Recipe</span>
                  </motion.button>
                </div> */}
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

              {/* Scroll Indicator - Right after the recipe mockup */}
              {!recipe && (
                <ScrollIndicator />
              )}
            </div>
          </div>
          
          {/* Premium Upgrade Section - Only on home page */}
          {!recipe && (
            <PremiumUpgradeSection />
          )}
        </div>
      )}

      {/* Skeleton Loading State */}
      <AnimatePresence>
        {showSkeleton && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="container mx-auto px-4 py-8"
          >
            <div className="max-w-6xl mx-auto">
              <RecipeSkeleton />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      {error && (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive text-center">{error}</p>
          </div>
        </div>
      )}

      {/* Recipe Display */}
      {recipe && !showSkeleton && (
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <RecipeDisplay 
              recipe={recipe} 
              onUpdateRecipe={handleUpdateRecipe}
              isEditable={isRecipeCurrentlySaved}
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
          onSaved={async (collectionName?: string) => {
            setIsRecipeCurrentlySaved(true);
            setShowCollectionModal(false);
            
            // Show success toast
            toast.success(
              "Recipe saved successfully",
              collectionName ? `Added to ${collectionName}` : undefined
            );
            
            // After saving, enable edit mode and get the saved recipe ID
            
            // Get the saved recipe ID
            if (currentRecipeUrl) {
              const { data, recipeId } = await isRecipeSaved(currentRecipeUrl);
              if (data && recipeId) {
                setCurrentSavedRecipeId(recipeId);
              }
            }
            
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
                const { error: ingredientsError } = await updateRecipeIngredients(currentSavedRecipeId, updates.ingredients as string[] | IngredientSection[]);
                if (ingredientsError) {
                  console.error('Failed to update ingredients:', ingredientsError);
                  return;
                }
                // Update local recipe state
                setRecipe(prev => prev ? { ...prev, ingredients: updates.ingredients } : null);
              }
              
              // Update instructions if changed (more robust comparison)
              const instructionsChanged = 
                updates.instructions.length !== recipe.instructions.length ||
                updates.instructions.some((instruction, index) => instruction !== recipe.instructions[index]);
              
              if (instructionsChanged) {
                console.log('🔄 Instructions changed, updating...', {
                  old: recipe.instructions,
                  new: updates.instructions
                });
                
                try {
                  console.log('📡 Calling updateRecipeInstructions...');
                  
                  // Update local state first for immediate UI feedback
                  setRecipe(prev => {
                    if (!prev) return null;
                    const updated = { ...prev, instructions: updates.instructions };
                    console.log('🔄 Local state updated immediately:', {
                      before: prev.instructions,
                      after: updated.instructions
                    });
                    return updated;
                  });
                  
                  // Then update database in background
                  const { error: instructionsError } = await updateRecipeInstructions(currentSavedRecipeId, updates.instructions);
                  
                  if (instructionsError) {
                    console.error('❌ Failed to update instructions in database:', instructionsError);
                    // Revert local state on database error
                    setRecipe(prev => {
                      if (!prev) return null;
                      const reverted = { ...prev, instructions: recipe.instructions };
                      console.log('🔄 Reverted local state due to database error');
                      return reverted;
                    });
                    toast.error("Failed to save instructions", "Please try again");
                    return;
                  }
                  
                  console.log('✅ Database update successful');
                } catch (error) {
                  console.error('❌ Error in instructions update:', error);
                  // Revert local state on error
                  setRecipe(prev => {
                    if (!prev) return null;
                    const reverted = { ...prev, instructions: recipe.instructions };
                    console.log('🔄 Reverted local state due to error');
                    return reverted;
                  });
                  toast.error("Failed to update instructions", "Please try again");
                  return;
                }
              } else {
                console.log('ℹ️ Instructions unchanged, skipping update');
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
              
              // Show success toast
              toast.success("Recipe updated successfully");
              
              setShowEditModal(false);
            } catch (error) {
              console.error('Error updating recipe:', error);
              toast.error("Failed to update recipe", "Please try again");
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

      {/* AI Chat Button - Only show when viewing a recipe (not showing skeleton) or during tutorial */}
      {((recipe && !showSkeleton) || (tutorial.isActive && tutorial.currentStep?.id === 'ai-chat')) && (
        <AIChatButton 
          onClick={async () => {
            // Don't open chat during tutorial
            if (tutorial.isActive && tutorial.currentStep?.id === 'ai-chat') {
              return;
            }
            
            // Check trial access for AI chat
            const hasAccess = await checkFeatureAccess('ai_chat', 'AI Recipe Chat');
            if (hasAccess) {
              setShowAIChat(true);
            }
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

      {/* Paywall Modal */}
        <PaywallModal 
          isOpen={showPaywall} 
          feature={paywallFeature}
        />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showUserProfileModal}
        onClose={() => setShowUserProfileModal(false)}
      />
      </div>

      {/* Welcome Trial Modal */}
      <WelcomeTrialModal
        isOpen={showWelcomeTrialModal}
        onClose={() => setShowWelcomeTrialModal(false)}
      />

      {/* Footer */}
      <Footer />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

    </div>
  );
}