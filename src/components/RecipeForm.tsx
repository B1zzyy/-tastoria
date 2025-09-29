'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Search, Link2, Globe, Instagram } from 'lucide-react';
import { motion } from 'framer-motion';
import GradientText from './GradientText';

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

export type SourceType = 'web' | 'instagram';

interface RecipeFormProps {
  onSubmit: (url: string, sourceType: SourceType) => void;
  loading?: boolean;
  compact?: boolean;
}

export default function RecipeForm({ onSubmit, loading = false, compact = false }: RecipeFormProps) {
  const [url, setUrl] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('web');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && !loading) {
      onSubmit(url.trim(), sourceType);
      setUrl(''); // Clear the input after submission
    }
  };

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        {/* Source Type Selector */}
        <div className="relative">
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as SourceType)}
            className={cn(
              "appearance-none bg-background border border-input rounded-lg px-3 py-2 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
              "transition-all duration-200 hover:border-ring/50 pr-8"
            )}
            disabled={loading}
          >
            <option value="web">🌐 Web</option>
            <option value="instagram">📱 IG</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {sourceType === 'instagram' ? (
              <Instagram className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Link2 className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={sourceType === 'instagram' ? "Paste Instagram reel/post URL..." : "Paste another recipe URL..."}
            className={cn(
              "w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
              "transition-all duration-200 hover:border-ring/50"
            )}
            disabled={loading}
            required
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Source Type Selector */}
      <div className="flex justify-center">
        <div className="relative inline-flex bg-muted rounded-lg p-1">
          {/* Sliding Background */}
          <motion.div
            className="absolute inset-y-1 bg-background rounded-md shadow-sm"
            initial={false}
            animate={{
              x: sourceType === 'web' ? 0 : '93.5%',
              width: '50%'
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
          />
          
          <button
            type="button"
            onClick={() => setSourceType('web')}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 z-10",
              sourceType === 'web' 
                ? "text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Globe className="w-4 h-4" />
            Website
          </button>
          <button
            type="button"
            onClick={() => setSourceType('instagram')}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 z-10",
              sourceType === 'instagram' 
                ? "text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Instagram className="w-4 h-4" />
            Instagram
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {sourceType === 'instagram' ? (
            <Instagram className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Link2 className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={sourceType === 'instagram' ? "Paste an Instagram reel or post URL" : "Paste a recipe URL to remove the clutter"}
          className={cn(
            "w-full pl-10 pr-4 py-4 text-lg rounded-xl border border-input bg-background text-foreground",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
            "transition-all duration-200 hover:border-ring/50 shadow-sm"
          )}
          disabled={loading}
          required
        />
      </div>
      
      <button
        type="submit"
        disabled={!url.trim() || loading}
        className={cn(
          "w-full flex items-center justify-center gap-3 px-8 py-4 text-lg rounded-xl font-semibold transition-all duration-200",
          "bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary",
          "shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        )}
      >
        {loading ? (
          <GradientText
            colors={["#f97316", "#ffffff", "#6b7280", "#374151", "#f97316", "#6b7280"]}
            animationSpeed={10}
            showBorder={false}
            className="text-lg font-semibold"
          >
            Parsing Recipe...
          </GradientText>
        ) : (
          <>
            {sourceType === 'instagram' ? (
              <Instagram className="w-6 h-6" />
            ) : (
              <Search className="w-6 h-6" />
            )}
            {sourceType === 'instagram' ? 'Get Recipe' : 'Get Recipe'}
          </>
        )}
      </button>
    </form>
  );
}
