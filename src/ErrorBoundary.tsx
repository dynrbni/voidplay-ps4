import { Component } from 'react';
import type { ReactNode } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <main className="fatal" role="alert"><h1>Unable to display this workspace</h1><p>Reload the page. Saved browser data has not been cleared.</p><button onClick={() => location.reload()}>Reload</button></main> : this.props.children; }
}
