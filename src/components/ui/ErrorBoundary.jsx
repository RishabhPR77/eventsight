import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="max-w-sm text-ink-soft">Please reload the page. Your saved work is safe.</p>
        <button
          type="button"
          onClick={() => window.location.assign("/")}
          className="mt-2 h-11 rounded-xl bg-brand px-5 font-semibold text-white"
        >
          Reload SponsorWise
        </button>
      </div>
    );
  }
}
