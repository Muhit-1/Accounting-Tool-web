import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Seal } from './Seal'
import { Button } from './Button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error in app tree:', error, info.componentStack)
  }

  handleReload = () => {
    this.setState({ error: null })
    window.location.assign('/')
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="rise w-full max-w-sm text-center">
          <div className="mb-6 flex flex-col items-center gap-3">
            <Seal size={44} />
          </div>
          <h1 className="mb-2 font-display text-2xl font-bold tracking-tight">Something went wrong</h1>
          <p className="mb-7 text-sm text-ink-soft">
            An unexpected error interrupted this page. Your data is safe — try going back to the dashboard.
          </p>
          <Button type="button" onClick={this.handleReload}>
            Back to dashboard
          </Button>
        </div>
      </div>
    )
  }
}
