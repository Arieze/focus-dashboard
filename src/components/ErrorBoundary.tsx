import { Component, type ReactNode } from "react";
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error)
      return (
        <main>
          <h1>Focus Dashboard</h1>
          <p role="alert">
            Une erreur empêche l’affichage. Vos données enregistrées sont
            conservées.
          </p>
          <button onClick={() => location.reload()}>Recharger</button>
          <details>
            <summary>Détail de l’erreur</summary>
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {this.state.error.message}
            </pre>
          </details>
        </main>
      );
    return this.props.children;
  }
}
