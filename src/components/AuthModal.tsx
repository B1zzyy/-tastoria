'use client';

import { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

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
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(false);
  
  const { signUp, signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (mode === 'signup') {
        const { error } = await signUp(formData.email, formData.password, formData.name);
        
        if (error) {
          setError(error.message);
          return;
        }
        // Show confirmation message for signup
        setShowConfirmationMessage(true);
        setFormData({ name: '', email: '', password: '' });
        setError(null);
      } else {
        console.log('Starting sign in...');
        const { error } = await signIn(formData.email, formData.password);
        console.log('Sign in result:', { error });
        
        if (error) {
          setError(error.message);
          return;
        }
        // Success - close modal and reset form for login
        console.log('Sign in successful, closing modal');
        onClose();
        setFormData({ name: '', email: '', password: '' });
        setError(null);
      }
    } catch (err) {
      if (err instanceof Error) {
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
  };

  const handleCloseModal = () => {
    setShowConfirmationMessage(false);
    setError(null);
    setFormData({ name: '', email: '', password: '' });
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
      <div className="relative bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-card-foreground">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <button
            onClick={handleCloseModal}
            className="p-2 text-muted-foreground hover:text-card-foreground rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        {showConfirmationMessage ? (
          <div className="p-6 text-center space-y-6">
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
                We&apos;ve sent you a confirmation link at <strong>{formData.email}</strong>. 
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
          <div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground",
                    "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                    "transition-all duration-200"
                  )}
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={cn(
                  "w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground",
                  "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                  "transition-all duration-200"
                )}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={cn(
                  "w-full pl-10 pr-12 py-3 rounded-lg border border-input bg-background text-foreground",
                  "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                  "transition-all duration-200"
                )}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-card-foreground"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200",
              "bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary",
              "shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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

            {/* Footer */}
            <div className="p-6 pt-0 text-center">
              <p className="text-sm text-muted-foreground">
                {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => onModeChange(mode === 'login' ? 'signup' : 'login')}
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
