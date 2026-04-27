import { Component, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { captureException, addBreadcrumb } from '@/lib/sentry';

interface InnerProps {
  children: ReactNode;
  resetKey: string;
}

interface InnerState {
  hasError: boolean;
  error: Error | null;
  resetKey: string;
}

class RouteErrorBoundaryInner extends Component<InnerProps, InnerState> {
  constructor(props: InnerProps) {
    super(props);
    this.state = { hasError: false, error: null, resetKey: props.resetKey };
  }

  static getDerivedStateFromProps(props: InnerProps, state: InnerState): Partial<InnerState> | null {
    // Reset on route change so the user can navigate away from a crashed page.
    if (props.resetKey !== state.resetKey) {
      return { hasError: false, error: null, resetKey: props.resetKey };
    }
    return null;
  }

  static getDerivedStateFromError(error: Error): Partial<InnerState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    captureException(error, {
      componentStack: errorInfo.componentStack ?? undefined,
      route: this.props.resetKey,
    });
    addBreadcrumb('route-error-boundary', 'Route crashed', {
      route: this.props.resetKey,
      errorMessage: error.message,
    });
    if (import.meta.env.DEV) {
      console.error(`RouteErrorBoundary[${this.props.resetKey}] caught:`, error, errorInfo);
    }
  }

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <span className="text-3xl">&#x1F3CC;&#xFE0F;</span>
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">This page hit a snag</h2>
              <p className="text-sm text-muted-foreground">
                You can retry, or head back home — your data is safe.
              </p>
            </div>
            <div className="space-y-2">
              <Button onClick={this.handleRetry} className="w-full">
                Try again
              </Button>
              <Button variant="outline" onClick={this.handleGoHome} className="w-full">
                Go home
              </Button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 text-left p-3 bg-muted rounded-lg">
                <summary className="text-xs font-medium text-muted-foreground cursor-pointer">
                  Error details
                </summary>
                <pre className="mt-2 text-xs text-destructive overflow-auto whitespace-pre-wrap break-words">
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

export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <RouteErrorBoundaryInner resetKey={location.pathname}>{children}</RouteErrorBoundaryInner>;
}
