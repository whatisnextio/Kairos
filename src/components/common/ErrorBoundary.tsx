import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-base-black flex flex-col items-center justify-center px-6 text-center">
          <h1 className="font-heading text-2xl font-bold text-base-text mb-3 tracking-wide">
            Something went wrong.
          </h1>
          <p className="text-base-subtext text-sm mb-6">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="font-heading text-sm text-accent-green border border-accent-green/30 rounded px-4 py-2"
          >
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
