import { Component, type ErrorInfo, type ReactNode } from 'react'

type BoundaryState = { failed: boolean }

export class AppErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { failed: false }

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {}

  render() {
    if (this.state.failed) {
      return <main className="error-page"><h1>Не удалось открыть EDU</h1><p>Перезапустите мини-приложение в MAX.</p></main>
    }
    return this.props.children
  }
}
