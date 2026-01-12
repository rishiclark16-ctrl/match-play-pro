import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRefresh = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="text-center space-y-6 max-w-sm">
            {/* Golf-themed error icon */}
            <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
              <span className="text-4xl">🏌️</span>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Something went wrong
              </h1>
              <p className="text-muted-foreground">
                We hit it into the rough. Please try refreshing the page.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={this.handleRefresh}
                className="w-full py-6 text-lg font-semibold rounded-xl"
              >
                Refresh Page
              </Button>
              
              <Button 
                variant="outline"
                onClick={this.handleGoHome}
                className="w-full py-6 text-lg font-semibold rounded-xl"
              >
                Go Home
              </Button>
            </div>

            {/* Show error in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left p-4 bg-muted rounded-xl">
                <summary className="text-sm font-medium text-muted-foreground cursor-pointer">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs text-danger overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
