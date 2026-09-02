import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '@/lib/errorMonitor';
import { Button } from "@/components/ui/shadcn/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Where the error boundary is placed (for error context) */
  boundaryName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Production-grade error boundary. Catches uncaught render errors,
 * reports them to the FRELUX error monitoring system, and shows a fallback UI.
 *
 * In production, shows a user-friendly error page with a "try again"
 * button that reloads the route. In development, shows the full
 * error stack for debugging.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const boundary = this.props.boundaryName ?? 'unknown';

    // Report to the FRELUX error monitoring system
    reportError({
      error_type: 'react',
      message: error.message,
      stack_trace: error.stack ?? null,
      feature: boundary,
      metadata: {
        componentStack: import.meta.env.DEV ? errorInfo.componentStack : undefined,
      },
    });

    // Log to console in dev
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', boundary, error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    // Custom fallback
    if (this.props.fallback) return this.props.fallback;

    if (import.meta.env.DEV) {
      return (
        <div role="alert" className="min-h-screen bg-muted/50 p-8">
          <div className="mx-auto max-w-4xl rounded-lg border border-red-200 bg-red-50 p-6">
            <h1 className="mb-2 text-xl font-bold text-red-700">
              Error in {this.props.boundaryName ?? 'component'}
            </h1>
            <pre className="mt-4 overflow-auto rounded bg-red-100 p-4 text-sm text-red-800">
              {this.state.error?.stack}
            </pre>
            <Button
              type="button"
              onClick={this.handleReset}
              className="mt-4 rounded bg-red-600 px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-red-700"
            >
              Try again
            </Button>
          </div>
        </div>
      );
    }

    // Production fallback
    return (
      <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/50 px-4 text-center dark:bg-background">
        <div className="rounded-lg border border-border bg-card p-8 shadow-sm dark:border-white/5 dark:bg-card">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <svg aria-hidden="true" className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground dark:text-primary-foreground">Something went wrong</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground dark:text-muted-foreground">
            FRELUX couldn't complete that request.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button variant="default"
              type="button"
              onClick={this.handleReload}
              className="rounded-lg px-5 py-2.5 text-sm font-medium transition-colors hover:/90"
            >
              Try Again
            </Button>
            <a
              href="/"
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 dark:border-white/10 dark:text-muted-foreground/80 dark:hover:bg-white/5"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
