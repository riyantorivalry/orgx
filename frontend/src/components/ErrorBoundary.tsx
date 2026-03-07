import { Component, ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    console.error("Unhandled UI error", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="container">
          <section className="card card-error" role="alert">
            <h1>Something went wrong</h1>
            <p>Please refresh the page and try again.</p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
