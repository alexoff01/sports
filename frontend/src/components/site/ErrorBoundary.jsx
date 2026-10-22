import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main id="main" className="container-x flex min-h-[80vh] flex-col justify-center py-32" data-testid="error-page">
        <p className="eyebrow">Error 500</p>
        <h1 className="t-h1 mt-6">Something went wrong.</h1>
        <p className="lead mt-6 max-w-xl">The page could not be displayed. Please reload, or return to the home page.</p>
        <a href="/" className="mt-10 inline-flex min-h-[52px] w-fit items-center border border-volt bg-volt px-7 font-display font-bold uppercase tracking-[0.14em]">
          Back to home
        </a>
      </main>
    );
  }
}
