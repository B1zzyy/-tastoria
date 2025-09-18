'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Recipe Parser Error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const Fallback = this.props.fallback;
        return <Fallback error={this.state.error} resetError={this.resetError} />;
      }

      return <DefaultErrorFallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, resetError }: { error?: Error; resetError: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Oops! Something went wrong
          </h1>
          <p className="text-muted-foreground mb-4">
            We encountered an unexpected error while processing your request.
          </p>
          {error && (
            <details className="text-left mb-4 p-3 bg-muted rounded-lg">
              <summary className="cursor-pointer text-sm font-medium">
                Error Details
              </summary>
              <pre className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                {error.message}
              </pre>
            </details>
          )}
        </div>
        
        <div className="space-y-3">
          <button
            onClick={resetError}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;
