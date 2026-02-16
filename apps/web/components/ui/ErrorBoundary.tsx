'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { PixelButton, PixelBox } from '../PixelComponents';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#2a1d17] flex items-center justify-center p-8 font-pixel">
          <PixelBox variant="wood" title="Error" className="max-w-2xl">
            <div className="flex flex-col items-center gap-6 text-center">
              <AlertTriangle className="text-red-500" size={64} />
              <div>
                <h2 className="text-2xl text-[#eaddcf] mb-2">Something went wrong</h2>
                <p className="text-[#eaddcf]/70 mb-4">
                  The application encountered an unexpected error. Don't worry - your progress is safe!
                </p>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4 text-left bg-black/30 p-4 rounded text-xs">
                    <summary className="cursor-pointer text-yellow-400 mb-2">Error Details</summary>
                    <pre className="text-red-300 overflow-auto">
                      {this.state.error.toString()}
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
              <div className="flex gap-4">
                <PixelButton variant="primary" onClick={this.handleReset}>
                  Reload Page
                </PixelButton>
                <PixelButton variant="neutral" onClick={() => (window.location.href = '/')}>
                  Go to Home
                </PixelButton>
              </div>
            </div>
          </PixelBox>
        </div>
      );
    }

    return this.props.children;
  }
}
