import React from 'react';
import { reportRendererStartupFailure } from '../diagnostics/startup-diagnostics';
import { messages } from '../localization/messages';

export class StartupErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(): void {
    reportRendererStartupFailure();
  }

  render(): React.ReactNode {
    if (this.state.failed) {
      return <main className="page"><section className="card" role="alert">
        <h1>{messages.en.startupTitle}</h1>
        <p>{messages.en.startupHint}</p>
      </section></main>;
    }
    return this.props.children;
  }
}
