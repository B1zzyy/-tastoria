'use client';

import { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ToastProvider';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup';
  onModeChange: (mode: 'login' | 'signup') => void;
}

export default function AuthModal({ isOpen, onClose, mode, onModeChange }: AuthModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string>('');
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const [passwordMismatchError, setPasswordMismatchError] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

  // Password strength calculation
  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: '', color: '' };
    
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    
    if (score <= 2) return { strength: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { strength: 2, label: 'Fair', color: 'bg-yellow-500' };
    if (score <= 5) return { strength: 3, label: 'Good', color: 'bg-blue-500' };
    return { strength: 4, label: 'Strong', color: 'bg-green-500' };
  };
  
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (mode === 'signup') {
        // Validate password length
        if (formData.password.length < 8) {
          setError('Password must be at least 8 characters long');
          return;
        }
        
        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        
        const { data, error } = await signUp(formData.email, formData.password, formData.name);
        
        // Debug: Log the response to understand the structure
        console.log('Signup response:', { data, error });
        
        if (error) {
          if (error.message.includes('timeout')) {
            toast.error("Error creating account", "Refresh the page and try again.");
          }
          setError(error.message);
          return;
        }
        
        // Check if this is a duplicate signup (Supabase behavior)
        // If user exists but email is not confirmed, Supabase will still send confirmation
        // We need to detect this case
        if (data?.user && data.user.identities && data.user.identities.length === 0) {
          // This indicates the user already exists
          setError('An account with this email already exists. Please try signing in instead.');
          return;
        }
        
        // Show confirmation message for new signup
        setConfirmationEmail(formData.email); // Store email before clearing form
        setShowConfirmationMessage(true);
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
        setError(null);
        setPasswordMismatchError(false);
        setIsConfirmPasswordFocused(false);
      } else {
        console.log('Starting sign in...');
        const { error } = await signIn(formData.email, formData.password);
        console.log('Sign in result:', { error });
        
        if (error) {
          if (error.message.includes('timeout')) {
            toast.error("Error logging in", "Refresh the page and try again.");
          }
          setError(error.message);
          return;
        }
        // Success - close modal and reset form for login
        console.log('Sign in successful, closing modal');
        onClose();
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
        setError(null);
        setPasswordMismatchError(false);
        setIsConfirmPasswordFocused(false);
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('timeout')) {
          toast.error("Error logging in", "Refresh the page and try again.");
        }
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    
    // Check for password mismatch in real-time
    if (field === 'password' || field === 'confirmPassword') {
      const newData = { ...formData, [field]: value };
      if (newData.password && newData.confirmPassword) {
        setPasswordMismatchError(newData.password !== newData.confirmPassword);
      } else {
        setPasswordMismatchError(false);
      }
    }
  };

  const handleCloseModal = () => {
    setShowConfirmationMessage(false);
    setError(null);
    setPasswordMismatchError(false);
    setIsConfirmPasswordFocused(false);
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
    onClose();
  };

  const handleSwitchToLogin = () => {
    setShowConfirmationMessage(false);
    setError(null);
    onModeChange('login');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
       {/* Modal */}
       <div className="relative bg-card rounded-3xl shadow-2xl border border-border w-full max-w-md mx-4 overflow-hidden">
         {/* Header */}
         <div className="px-8 pt-8 pb-6">
           <div className="flex items-center justify-between mb-6">
             <h2 className="text-3xl font-bold text-card-foreground tracking-tight">
               {mode === 'login' ? 'Welcome back' : 'Create account'}
             </h2>
             <button
               onClick={handleCloseModal}
               className="p-2 text-muted-foreground hover:text-card-foreground rounded-xl hover:bg-accent transition-colors"
             >
               <X className="w-5 h-5" />
             </button>
           </div>
           
           {/* Tabs with sliding indicator */}
           <div className="relative bg-muted rounded-lg p-1">
             {/* Sliding background indicator */}
             <div 
               className={cn(
                 "absolute top-1 bottom-1 bg-background rounded-md shadow-sm transition-all duration-300 ease-out",
                 mode === 'login' ? "left-1 right-1/2" : "left-1/2 right-1"
               )}
             />
             
             <div className="relative flex">
               <button
                 onClick={() => onModeChange('login')}
                 className={cn(
                   "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 ease-out relative z-10",
                   mode === 'login'
                     ? "text-foreground"
                     : "text-muted-foreground hover:text-foreground"
                 )}
               >
                 Sign In
               </button>
               <button
                 onClick={() => onModeChange('signup')}
                 className={cn(
                   "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 ease-out relative z-10",
                   mode === 'signup'
                     ? "text-foreground"
                     : "text-muted-foreground hover:text-foreground"
                 )}
               >
                 Sign Up
               </button>
             </div>
           </div>
         </div>

        {/* Form */}
        <div className="relative overflow-hidden">
          {showConfirmationMessage ? (
          <div 
            key="confirmation"
            className="p-6 text-center space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          >
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-card-foreground mb-3">
                Check your email!
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                We&apos;ve sent you a confirmation link at <strong>{confirmationEmail}</strong>. 
                Please click the link in your email to verify your account.
              </p>
              <p className="text-xs text-muted-foreground">
                Don&apos;t see the email? Check your spam folder or try signing up again.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSwitchToLogin}
                className="flex-1 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 text-sm font-medium text-muted-foreground bg-accent rounded-lg hover:bg-accent/80 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
          ) : (
           <div 
             key={mode}
             className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
           >
             <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-6">
             {/* Error Message */}
             {error && (
               <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                 <p className="text-sm text-destructive">{error}</p>
               </div>
             )}
          {mode === 'signup' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-card-foreground">
                  Username
                </label>
                {isUsernameFocused && (
                  <span className="text-xs text-muted-foreground font-medium">
                    {formData.name.length}/15
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    if (e.target.value.length <= 15) {
                      handleInputChange('name', e.target.value);
                    }
                  }}
                  onFocus={() => setIsUsernameFocused(true)}
                  onBlur={() => setIsUsernameFocused(false)}
                  className={cn(
                    "w-full pl-11 pr-4 py-4 rounded-xl border border-input bg-background text-foreground",
                    "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                    "transition-all duration-200 text-sm"
                  )}
                  placeholder="Choose a username"
                  maxLength={15}
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-card-foreground">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={cn(
                  "w-full pl-11 pr-4 py-4 rounded-xl border border-input bg-background text-foreground",
                  "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                  "transition-all duration-200 text-sm"
                )}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-card-foreground">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={cn(
                  "w-full pl-11 pr-12 py-4 rounded-xl border border-input bg-background text-foreground",
                  "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                  "transition-all duration-200 text-sm"
                )}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-card-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Password Strength Indicator - only show during signup and when password has content */}
          {mode === 'signup' && formData.password.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Password strength</span>
                <span className={cn(
                  "text-xs font-medium",
                  getPasswordStrength(formData.password).strength === 1 && "text-red-500",
                  getPasswordStrength(formData.password).strength === 2 && "text-yellow-500",
                  getPasswordStrength(formData.password).strength === 3 && "text-blue-500",
                  getPasswordStrength(formData.password).strength === 4 && "text-green-500"
                )}>
                  {getPasswordStrength(formData.password).label}
                </span>
              </div>
              <div className="flex space-x-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-all duration-300",
                      level <= getPasswordStrength(formData.password).strength
                        ? getPasswordStrength(formData.password).color
                        : "bg-muted"
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div 
              className={cn(
                "transition-all duration-300 ease-out",
                formData.password.length > 0 
                  ? "max-h-32 opacity-100 translate-y-0" 
                  : "max-h-0 opacity-0 -translate-y-2"
              )}
              style={{
                overflow: formData.password.length > 0 ? 'visible' : 'hidden'
              }}
            >
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-card-foreground">
                   Confirm Password
                 </label>
                 <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                     <Lock className="h-4 w-4 text-muted-foreground" />
                   </div>
                   <input
                     type={showConfirmPassword ? 'text' : 'password'}
                     value={formData.confirmPassword}
                     onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                     onFocus={() => setIsConfirmPasswordFocused(true)}
                     onBlur={() => setIsConfirmPasswordFocused(false)}
                     className={cn(
                       "w-full pl-11 pr-12 py-4 rounded-xl border border-input bg-background text-foreground",
                       "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                       "transition-all duration-200 text-sm"
                     )}
                     placeholder="Confirm your password"
                     required
                   />
                   <button
                     type="button"
                     onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                     className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-card-foreground transition-colors"
                   >
                     {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                   </button>
                 </div>
               </div>
              
               {/* Password length error - show when confirm password is focused and password is too short */}
               {isConfirmPasswordFocused && formData.password.length > 0 && formData.password.length < 8 && (
                 <p className="text-sm text-red-500 mt-2">
                   Password must be at least 8 characters long
                 </p>
               )}
               
               {/* Password mismatch error - only show when passwords don't match */}
               {passwordMismatchError && (
                 <p className="text-sm text-red-500 mt-2">
                   Passwords do not match
                 </p>
               )}
            </div>
          )}

           <button
             type="submit"
             disabled={loading}
             className={cn(
               "w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold transition-all duration-200",
               "bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
               "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary",
               "shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
             )}
           >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              mode === 'login' ? 'Sign In' : 'Create Account'
            )}
          </button>
            </form>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
