'use client';

import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ className, size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className={cn(
          'border-4 border-muted border-t-primary rounded-full animate-spin',
          sizeClasses[size],
          className
        )}
      />
      <div className="text-center">
        <p className="text-lg font-medium text-foreground mb-1">
          Parsing your recipe...
        </p>
        <p className="text-sm text-muted-foreground">
          This may take a few seconds
        </p>
      </div>
    </div>
  );
}
