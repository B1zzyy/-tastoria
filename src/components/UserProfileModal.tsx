'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Edit3, X, ChevronDown, ChevronUp, Check, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTrial } from '@/hooks/useTrial';
import { supabase } from '@/lib/supabase';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user, updateProfile } = useAuth();
  const { isPaidUser } = useTrial();
  const [name, setName] = useState(user?.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubscriptionExpanded, setIsSubscriptionExpanded] = useState(false);
  const [originalName, setOriginalName] = useState(user?.name || '');
  const [originalProfileImage, setOriginalProfileImage] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [subscriptionDetails, setSubscriptionDetails] = useState<{
    status: string;
    endDate: string | null;
    isCancelled: boolean;
    nextBillingDate: string | null;
  } | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Update name when user changes
  useEffect(() => {
    if (user?.name) {
      setName(user.name);
      setOriginalName(user.name);
    }
  }, [user?.name]);

  // Load subscription details
  const loadSubscriptionDetails = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_end_date')
        .eq('id', user.id)
        .single();

      if (profile && !error) {
        // Check if subscription is cancelled
        // If status is 'paid', the subscription is active (regardless of end date)
        // If status is 'expired', the subscription is cancelled/expired
        const isCancelled = profile.subscription_status === 'expired';
        
        console.log('Loading subscription details:', {
          status: profile.subscription_status,
          endDate: profile.subscription_end_date,
          isCancelled: isCancelled
        });
        
        // If user is paid and not cancelled, fetch actual billing date from Stripe
        let nextBillingDate = null;
        if (profile.subscription_status === 'paid' && !isCancelled) {
          try {
            const response = await fetch(`/api/get-subscription-details?userId=${user.id}`);
            if (response.ok) {
              const data = await response.json();
              nextBillingDate = data.nextBillingDate;
            }
          } catch (error) {
            console.error('Error fetching billing date from Stripe:', error);
          }
        }
        
        setSubscriptionDetails({
          status: profile.subscription_status,
          endDate: profile.subscription_end_date,
          isCancelled: isCancelled,
          nextBillingDate: nextBillingDate
        });
      }
    } catch {
      console.error('Error loading subscription details');
    }
  }, [user]);

  const loadProfileImage = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_image_url')
        .eq('id', user.id)
        .single();

      if (profile?.profile_image_url) {
        setProfileImage(profile.profile_image_url);
        setOriginalProfileImage(profile.profile_image_url);
      }
    } catch {
      console.log('No existing profile image found');
    }
  }, [user]);

  // Load existing profile image when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadProfileImage();
      loadSubscriptionDetails();
      
      // Check if user just returned from portal
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('portal') === 'return') {
        // Refresh subscription details after returning from portal
        setTimeout(() => {
          loadSubscriptionDetails();
        }, 2000);
        
        // Clean up URL parameter
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [isOpen, user, loadProfileImage, loadSubscriptionDetails]);

  // Refresh subscription details when user returns from portal
  useEffect(() => {
    const handlePortalReturn = () => {
      if (isOpen && user) {
        // Small delay to ensure database is updated
        setTimeout(() => {
          loadSubscriptionDetails();
        }, 1000);
      }
    };

    // Listen for when user returns from portal
    window.addEventListener('focus', handlePortalReturn);
    
    return () => {
      window.removeEventListener('focus', handlePortalReturn);
    };
  }, [isOpen, user, loadSubscriptionDetails]);

  // Handle body scroll lock when modal is open
  useEffect(() => {
    if (isOpen) {
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
      return () => {
        // Restore scrolling when modal closes
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  // Check if there are any changes
  const hasChanges = () => {
    return name !== originalName || profileImage !== originalProfileImage;
  };

  // Handle name editing
  const handleStartEditName = () => {
    setTempName(name);
    setIsEditingName(true);
    // Focus the input after a short delay to ensure it's rendered
    setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 100);
  };

  const handleSaveName = () => {
    console.log('handleSaveName called', { tempName, name, trimmed: tempName.trim() });
    const trimmedName = tempName.trim();
    
    if (trimmedName) {
      if (trimmedName.length > 15) {
        setError('Name must be 15 characters or less');
        return;
      }
      setName(trimmedName);
    }
    setIsEditingName(false);
  };

  const handleCancelNameEdit = () => {
    setTempName('');
    setIsEditingName(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelNameEdit();
    }
  };

  const handleSave = async () => {
    console.log('handleSave called', { name, originalName, profileImage, originalProfileImage, hasChanges: hasChanges() });
    
    if (!user || !name.trim()) {
      setError('Name is required');
      return;
    }

    if (name.trim().length > 15) {
      setError('Name must be 15 characters or less');
      return;
    }

    if (!hasChanges()) {
      console.log('No changes detected, closing modal');
      onClose();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Calling updateProfile with:', { name: name.trim() });
      await updateProfile({ name: name.trim() });
      console.log('Profile updated successfully');
      
      // Update original values after successful save
      setOriginalName(name.trim());
      setOriginalProfileImage(profileImage);
      onClose();
      
      // Dispatch a custom event to notify all components of user data change
      setTimeout(() => {
        console.log('Dispatching user update event...');
        window.dispatchEvent(new CustomEvent('userUpdated', { 
          detail: { name: name.trim() } 
        }));
      }, 100);
    } catch (error) {
      console.error('Error updating profile:', error);
      
      // Show specific error messages
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          setError('Update timed out. Please check your connection and try again.');
        } else if (error.message.includes('No user logged in')) {
          setError('You are not logged in. Please refresh the page and try again.');
        } else {
          setError('Failed to update profile. Please try again.');
        }
      } else {
        setError('Failed to update profile. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeleting(true);
    setError(null);

    try {
      // First, check if user has an active subscription
      if (subscriptionDetails?.status === 'paid' && !subscriptionDetails?.isCancelled) {
        setError('Please cancel your subscription first before deleting your account. You can do this in the subscription management section above.');
        setIsDeleting(false);
        return;
      }

      // Confirm deletion
      const confirmed = window.confirm(
        'Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your recipes and data.'
      );

      if (!confirmed) {
        setIsDeleting(false);
        return;
      }

      // Delete user's recipes first
      const { error: recipesError } = await supabase
        .from('recipes')
        .delete()
        .eq('user_id', user.id);

      if (recipesError) {
        console.error('Error deleting recipes:', recipesError);
        // Continue with account deletion even if recipes deletion fails
      }

      // Delete user profile data
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (deleteError) {
        throw deleteError;
      }

      // Delete the user from Supabase Auth (this requires admin privileges)
      // We'll need to call our API endpoint for this
      const response = await fetch('/api/delete-user-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user account');
      }

      // Sign out the user
      await supabase.auth.signOut();

      // Close modal and redirect to home
      onClose();
      window.location.href = '/';

    } catch (error) {
      console.error('Error deleting account:', error);
      setError('Failed to delete account. Please try again or contact support.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setIsUploadingImage(true);
    setError(null);

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      // Upload to Supabase storage (simpler path structure)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with image URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_image_url: data.publicUrl })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Set the image for immediate preview
      setProfileImage(data.publicUrl);
      // Note: We don't update originalProfileImage here because we want to track this as a change
      
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-gradient-to-br from-card via-card to-card/95 border border-border/50 rounded-3xl shadow-2xl max-w-lg w-full mx-4 my-8 max-h-[90vh] overflow-y-auto"
          >
          {/* Header with gradient */}
          <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  Profile Settings
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Manage your account information</p>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-accent/50 rounded-xl transition-colors group"
              >
                <X className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-8">
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center space-y-6">
              <div className="relative group">
                <div className="relative">
                  {profileImage ? (
                    <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-primary/20 shadow-xl group-hover:ring-primary/40 transition-all duration-300">
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 rounded-full flex items-center justify-center ring-4 ring-primary/20 shadow-xl group-hover:ring-primary/40 transition-all duration-300">
                      <User className="w-16 h-16 text-primary/60 group-hover:text-primary/80 transition-colors duration-300" />
                    </div>
                  )}
                  
                  {/* Modern Edit Overlay */}
                  <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                    <button
                      onClick={handleImageUpload}
                      disabled={isUploadingImage}
                      className="opacity-0 group-hover:opacity-100 w-12 h-12 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110"
                    >
                      {isUploadingImage ? (
                        <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Edit3 className="w-5 h-5 text-gray-700" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
                  {/* Name Card */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-background/30 border border-border/30 rounded-xl hover:bg-background/50 transition-all duration-200">
                    {isEditingName ? (
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex-1 relative">
                          <input
                            ref={nameInputRef}
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onKeyDown={handleKeyPress}
                            maxLength={15}
                            className="w-full px-3 py-1 pr-12 bg-background/50 border border-border/50 rounded-lg text-lg font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                            placeholder="Enter your name"
                          />
                          <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-xs ${
                            tempName.length > 12 
                              ? 'text-gray-500' 
                              : 'text-muted-foreground/60'
                          }`}>
                            {tempName.length}/15
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Tick button clicked!');
                            handleSaveName();
                          }}
                          className="p-1.5 hover:bg-primary/20 rounded-lg transition-all duration-200"
                        >
                          <Check className="w-4 h-4 text-primary" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Cancel button clicked!');
                            handleCancelNameEdit();
                          }}
                          className="p-1.5 hover:bg-muted-foreground/20 rounded-lg transition-all duration-200"
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-lg font-semibold text-foreground flex-1">{name}</span>
                        <button
                          onClick={handleStartEditName}
                          className="p-1.5 hover:bg-accent/50 rounded-lg transition-all duration-200"
                        >
                          <Edit3 className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                        </button>
                      </>
                    )}
                  </div>
            </div>

            {/* User Info */}
            <div className="space-y-6">
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border/30 text-muted-foreground cursor-not-allowed"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">Read Only</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  Subscription Status
                </label>
                <div className="rounded-xl bg-gradient-to-r from-background/50 to-background/30 border border-border/30 overflow-hidden">
                  {/* Status Header */}
                  <button
                    onClick={() => setIsSubscriptionExpanded(!isSubscriptionExpanded)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-background/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {subscriptionDetails?.isCancelled ? (
                        <>
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span className="text-sm font-bold text-orange-500">
                            CANCELLED
                          </span>
                        </>
                      ) : isPaidUser ? (
                        <>
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                          <span className="text-sm font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent">
                            PREMIUM MEMBER
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-500">
                            FREE TRIAL
                          </span>
                        </>
                      )}
                    </div>
                         {isSubscriptionExpanded ? (
                           <ChevronUp className="w-4 h-4 text-muted-foreground" />
                         ) : (
                           <ChevronDown className="w-4 h-4 text-muted-foreground" />
                         )}
                  </button>

                  {/* Expanded Content for All Users */}
                  <AnimatePresence>
                    {isSubscriptionExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="border-t border-border/30"
                      >
                        <div className="p-4 space-y-4">
                          {/* Premium Features */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                              <Star className="w-4 h-4 text-primary" />
                              Premium Features
                            </h4>
                            <div className="space-y-2">
                              {[
                                'Unlimited recipe parsing',
                                'Unlimited saved recipes',
                                'Create custom collections',
                                'AI-powered recipe chat',
                                'Priority support'
                              ].map((feature, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <Check className="w-3 h-3 text-primary flex-shrink-0" />
                                  <span className="text-xs text-muted-foreground">{feature}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Subscription Details */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-foreground">Subscription Details</h4>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div className="flex justify-between">
                                <span>Plan:</span>
                                <span className="text-foreground">
                                  {subscriptionDetails?.isCancelled ? 'Tastoria Premium (Cancelled)' : 
                                   isPaidUser ? 'Tastoria Premium' : 'Free Trial'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Price:</span>
                                <span className="text-foreground">
                                  {subscriptionDetails?.isCancelled ? '$6.99/month' :
                                   isPaidUser ? '$6.99/month' : 'Free'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>
                                  {subscriptionDetails?.isCancelled ? 'Access ends:' :
                                   isPaidUser ? 'Next billing:' : 'Trial ends:'}
                                </span>
                                <span className="text-foreground">
                                  {subscriptionDetails?.isCancelled && subscriptionDetails.endDate ? 
                                    new Date(subscriptionDetails.endDate).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    }) :
                                   isPaidUser && subscriptionDetails?.nextBillingDate ? 
                                    new Date(subscriptionDetails.nextBillingDate).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    }) :
                                   isPaidUser ? 'Next month' : 'In 10 days'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Cancellation Message */}
                          {subscriptionDetails?.isCancelled && (
                            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                              <div className="flex items-start gap-2">
                                <div className="w-4 h-4 bg-orange-500 rounded-full flex-shrink-0 mt-0.5"></div>
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-orange-600">
                                    Subscription Cancelled
                                  </p>
                                  <p className="text-xs text-orange-500/80">
                                    Your membership has been cancelled, but you can continue using all premium features until{' '}
                                    <span className="font-medium">
                                      {subscriptionDetails.endDate 
                                        ? new Date(subscriptionDetails.endDate).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                          })
                                        : 'your billing period ends'
                                      }
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}


                          {/* Action Button */}
                          {subscriptionDetails?.isCancelled ? (
                            <button 
                              onClick={async () => {
                                if (!user) return
                                
                                try {
                                  const response = await fetch('/api/create-portal-session', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      userId: user.id,
                                    }),
                                  })

                                  const data = await response.json()

                                  if (!response.ok) {
                                    setError(data.error || 'Failed to open subscription management')
                                    return
                                  }

                                  // Redirect to Stripe customer portal
                                  if (data.url) {
                                    window.location.href = data.url
                                  }
                                } catch (error) {
                                  console.error('Error opening portal:', error)
                                  setError('Failed to open subscription management')
                                }
                              }}
                              className="w-full mt-4 px-4 py-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/20 transition-colors text-sm font-medium"
                            >
                              Reactivate Subscription
                            </button>
                          ) : isPaidUser ? (
                            <button 
                              onClick={async () => {
                                if (!user) return
                                
                                try {
                                  const response = await fetch('/api/create-portal-session', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      userId: user.id,
                                    }),
                                  })

                                  const data = await response.json()

                                  if (!response.ok) {
                                    setError(data.error || 'Failed to open subscription management')
                                    return
                                  }

                                  // Redirect to Stripe customer portal
                                  if (data.url) {
                                    window.location.href = data.url
                                  }
                                } catch (error) {
                                  console.error('Error opening portal:', error)
                                  setError('Failed to open subscription management')
                                }
                              }}
                              className="w-full mt-4 px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                            >
                              Manage Subscription
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                // Close the modal first
                                onClose()
                                // Then scroll to the premium section after a short delay
                                setTimeout(() => {
                                  const premiumSection = document.querySelector('[data-premium-section]')
                                  if (premiumSection) {
                                    premiumSection.scrollIntoView({ 
                                      behavior: 'smooth',
                                      block: 'start'
                                    })
                                  }
                                }, 300)
                              }}
                              className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-primary to-primary/90 text-black rounded-lg hover:from-primary/90 hover:to-primary/80 transition-all duration-200 font-medium text-sm shadow-lg hover:shadow-xl"
                            >
                              Learn More
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm text-red-400 font-medium">{error}</p>
              </div>
            )}
          </div>

          {/* Footer - Only show when there are changes */}
          {hasChanges() && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="p-6 pt-0"
            >
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 h-12 px-6 bg-background/50 border border-border/50 text-foreground rounded-xl hover:bg-background/80 transition-all duration-200 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading || !name.trim()}
                  className="flex-1 h-12 px-6 bg-gradient-to-r from-primary to-primary/90 text-black rounded-xl hover:from-primary/90 hover:to-primary/80 transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </div>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Delete Account Section */}
          <div className="p-6 pt-0">
            <div className="border-t border-border/50 pt-6">
              <div className="text-center">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Danger Zone</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Permanently delete your account and all associated data
                </p>
                <button
                  onClick={() => setShowDeleteConfirmation(true)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteConfirmation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowDeleteConfirmation(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-background border border-border rounded-xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="w-6 h-6 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Delete Account</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    This action cannot be undone. This will permanently delete your account, 
                    all your recipes, and remove all data associated with your account.
                  </p>
                  
                  {subscriptionDetails?.status === 'paid' && !subscriptionDetails?.isCancelled && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
                      <p className="text-sm text-yellow-400">
                        <strong>Active Subscription Detected:</strong> Please cancel your subscription first 
                        before deleting your account.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirmation(false)}
                      className="flex-1 px-4 py-2 bg-background/50 border border-border/50 text-foreground rounded-lg hover:bg-background/80 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting || (subscriptionDetails?.status === 'paid' && !subscriptionDetails?.isCancelled)}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Account'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

      </div>
    </AnimatePresence>
  );
}
