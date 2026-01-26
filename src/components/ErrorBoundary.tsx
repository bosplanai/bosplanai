import React from "react";

type Props = {
  children: React.ReactNode;
  title?: string;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ERROR_BOUNDARY] Uncaught error", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground p-6">
        <div className="mx-auto max-w-3xl space-y-3 rounded-lg border border-border bg-card p-6">
          <h1 className="text-xl font-semibold">
            {this.props.title ?? "App crashed while rendering"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Open the browser console for the full stack trace.
          </p>
          <pre className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs text-foreground">
            {String(this.state.error?.message ?? this.state.error)}
          </pre>
          <button
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
