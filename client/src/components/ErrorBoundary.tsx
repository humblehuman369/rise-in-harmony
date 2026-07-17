import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

const isDev =
  typeof import.meta !== "undefined" &&
  // Vite injects import.meta.env.DEV
  Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);

function makeErrorId() {
  return `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorId: makeErrorId() };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Always log for operators; never surface stack to end users in production.
    console.error("[ErrorBoundary]", {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-lg p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl mb-2 text-center">Something went wrong.</h2>
            <p className="text-sm text-muted-foreground mb-6 text-center">
              Please reload the page. If this keeps happening, contact support
              {this.state.errorId ? (
                <>
                  {" "}
                  and mention reference{" "}
                  <code className="text-xs">{this.state.errorId}</code>
                </>
              ) : null}
              .
            </p>

            {isDev && this.state.error?.stack ? (
              <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
                <pre className="text-sm text-muted-foreground whitespace-break-spaces">
                  {this.state.error.stack}
                </pre>
              </div>
            ) : null}

            <button
              onClick={() => window.location.reload()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={16} />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
