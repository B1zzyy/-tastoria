'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Link2, Globe, Instagram, Facebook, Send } from 'lucide-react';
import { motion } from 'framer-motion';

// Custom Arrow Right component using the provided SVG
const ArrowRight = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    width="24" 
    height="24" 
    fill="none"
    className={className}
  >
    <path 
      d="M18.5 12L4.99997 12" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    <path 
      d="M13 18C13 18 19 13.5811 19 12C19 10.4188 13 6 13 6" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
  </svg>
);

export type SourceType = 'web' | 'instagram' | 'facebook';

interface RecipeFormProps {
  onSubmit: (url: string, sourceType: SourceType) => void;
  loading?: boolean;
  compact?: boolean;
}

export default function RecipeForm({ onSubmit, loading = false, compact = false }: RecipeFormProps) {
  const [url, setUrl] = useState('');
  const [detectedSourceType, setDetectedSourceType] = useState<SourceType>('web');

  // Function to detect source type from URL
  const detectSourceType = (url: string): SourceType => {
    if (!url) return 'web';
    
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('instagram.com') || lowerUrl.includes('instagr.am')) {
      return 'instagram';
    } else if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com')) {
      return 'facebook';
    } else {
      return 'web';
    }
  };

  // Update detected source type when URL changes
  useEffect(() => {
    const newSourceType = detectSourceType(url);
    setDetectedSourceType(newSourceType);
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && !loading) {
      onSubmit(url.trim(), detectedSourceType);
      setUrl(''); // Clear the input after submission
    }
  };

  // Function to get the appropriate icon based on detected source type
  const getSourceIcon = (sourceType: SourceType) => {
    switch (sourceType) {
      case 'instagram':
        return <Instagram className="h-4 w-4 text-muted-foreground" />;
      case 'facebook':
        return <Facebook className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Link2 className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Function to get placeholder text based on detected source type
  const getPlaceholderText = (sourceType: SourceType) => {
    switch (sourceType) {
      case 'instagram':
        return "Paste Instagram reel/post URL...";
      case 'facebook':
        return "Paste Facebook post URL...";
      default:
        return "Paste any recipe URL...";
    }
  };

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {getSourceIcon(detectedSourceType)}
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={getPlaceholderText(detectedSourceType)}
            className={cn(
              "w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
              "transition-all duration-200 hover:border-ring/50"
            )}
            disabled={loading}
            required
            data-tutorial="url-input"
          />
        </div>
        
        <button
          type="submit"
          disabled={!url.trim() || loading}
          className={cn(
            "flex items-center justify-center p-2 rounded-lg font-medium transition-all duration-200",
            "bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary",
            "min-w-[40px] h-[40px]"
          )}
          data-tutorial="parse-button"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <ArrowRight className="w-5 h-5" />
          )}
        </button>
      </form>
    );
  }

  // Function to get the main form icon
  const getMainFormIcon = (sourceType: SourceType) => {
    switch (sourceType) {
      case 'instagram':
        return <Instagram className="h-5 w-5 text-muted-foreground" />;
      case 'facebook':
        return <Facebook className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Link2 className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // Function to get main form placeholder text
  const getMainFormPlaceholder = (sourceType: SourceType) => {
    switch (sourceType) {
      case 'instagram':
        return "instagram.com/reel/...";
      case 'facebook':
        return "facebook.com/posts/...";
      default:
        return "bbcgoodfood.com/recipes/...";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Dynamic Info Text based on detected source */}
      {detectedSourceType === 'instagram' && (
        <div className="text-center px-4">
          <p className="text-xs text-muted-foreground">
            We&apos;ll extract the recipe content from the Instagram post. If the post doesn&apos;t include full instructions, we&apos;ll generate some for you.
          </p>
        </div>
      )}

      {detectedSourceType === 'facebook' && (
        <div className="text-center px-4">
          <p className="text-xs text-muted-foreground">
            We&apos;ll extract the recipe content from the Facebook post. If the post doesn&apos;t include full instructions, we&apos;ll generate some for you.
          </p>
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {getMainFormIcon(detectedSourceType)}
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && url.trim() && !loading) {
              handleSubmit(e);
            }
          }}
          placeholder={getMainFormPlaceholder(detectedSourceType)}
          className={cn(
            "w-full pl-10 pr-12 py-4 text-lg rounded-xl border border-input bg-background text-foreground",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
            "transition-all duration-200 hover:border-ring/50 shadow-sm"
          )}
          disabled={loading}
          required
          data-tutorial="url-input"
        />
        <button
          type="submit"
          disabled={!url.trim() || loading}
          className={cn(
            "absolute inset-y-0 right-0 flex items-center justify-center w-16 rounded-r-xl transition-all duration-200",
            "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
          )}
          data-tutorial="parse-button"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </form>
  );
}
