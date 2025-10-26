import React from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';

/**
 * Props für ErrorBoundary
 */
interface ErrorBoundaryProps {
    children: React.ReactNode;
    /**
     * Optionaler Fallback wenn Fehler auftritt
     * Wenn nicht angegeben, wird Standard-Fehler-UI verwendet
     */
    fallback?: React.ReactElement;
    /**
     * Callback wenn Fehler auftritt
     * Nützlich für Logging zu externen Services
     */
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * State für ErrorBoundary
 */
interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 * 
 * Fängt JavaScript-Fehler in der Component-Tree ab und verhindert
 * den "White Screen of Death". Zeigt stattdessen eine benutzerfreundliche
 * Fehler-UI an.
 * 
 * **Verwendung:**
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 * 
 * **Mit Custom Fallback:**
 * ```tsx
 * <ErrorBoundary fallback={<div>Oops! Something went wrong</div>}>
 *   <App />
 * </ErrorBoundary>
 * ```
 * 
 * **Mit Error Logging:**
 * ```tsx
 * <ErrorBoundary onError={(error, errorInfo) => logToService(error, errorInfo)}>
 *   <App />
 * </ErrorBoundary>
 * ```
 * 
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    /**
     * Wird aufgerufen wenn ein Error in einem Child-Component auftritt
     */
    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return {
            hasError: true,
            error,
        };
    }

    /**
     * Wird nach getDerivedStateFromError aufgerufen
     * Hier können wir Error-Logging durchführen
     */
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // Log error zu Console für Development
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // Update State mit Error-Info
        this.setState({
            errorInfo,
        });

        // Rufe optionalen Callback auf
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    /**
     * Reset Error State und versuche erneut zu rendern
     */
    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    /**
     * Reload Page (für schwerwiegende Fehler)
     */
    handleReload = (): void => {
        window.location.reload();
    };

    /**
     * Rendert Standard-Fehler-UI
     */
    renderDefaultFallback(): React.ReactElement {
        const { error, errorInfo } = this.state;

        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                <Card className="max-w-2xl w-full">
                    <CardHeader>
                        <CardTitle className="text-red-600 flex items-center gap-2">
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                            Oops! Etwas ist schief gelaufen
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <Alert variant="destructive">
                            <AlertTitle>Fehler Details</AlertTitle>
                            <AlertDescription>
                                <div className="mt-2 text-sm">
                                    <strong>Fehlermeldung:</strong>
                                    <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                                        {error?.message || 'Unbekannter Fehler'}
                                    </pre>
                                </div>
                            </AlertDescription>
                        </Alert>

                        <details className="text-sm">
                            <summary className="cursor-pointer hover:text-blue-600">
                                🔍 Technische Details (für Entwickler)
                            </summary>
                            <div className="mt-2 space-y-2">
                                <div>
                                    <strong>Stack Trace:</strong>
                                    <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto max-h-48">
                                        {error?.stack || 'Nicht verfügbar'}
                                    </pre>
                                </div>
                                {errorInfo && (
                                    <div>
                                        <strong>Component Stack:</strong>
                                        <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto max-h-48">
                                            {errorInfo.componentStack}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </details>

                        <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm">
                            <strong className="text-blue-800">💡 Was kannst du tun?</strong>
                            <ul className="mt-2 space-y-1 text-blue-700">
                                <li>• Klicke auf "Erneut versuchen" um die Seite neu zu laden</li>
                                <li>• Falls das Problem weiterhin besteht, leere den Browser-Cache</li>
                                <li>• Melde den Fehler mit den technischen Details oben</li>
                            </ul>
                        </div>
                    </CardContent>

                    <CardFooter className="flex gap-2">
                        <Button onClick={this.handleReset} variant="outline">
                            Zurück
                        </Button>
                        <Button onClick={this.handleReload}>
                            Erneut versuchen
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    render(): React.ReactNode {
        if (this.state.hasError) {
            // Zeige Custom Fallback wenn vorhanden, sonst Standard-UI
            return this.props.fallback || this.renderDefaultFallback();
        }

        return this.props.children;
    }
}

/**
 * Hook-basierte ErrorBoundary für funktionale Komponenten
 * 
 * Hinweis: React unterstützt aktuell keine Hook-based Error Boundaries,
 * daher ist dies ein Wrapper um die Class-based ErrorBoundary.
 * 
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <ErrorBoundaryWrapper>
 *       <MyComponent />
 *     </ErrorBoundaryWrapper>
 *   );
 * }
 * ```
 */
export function ErrorBoundaryWrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return <ErrorBoundary>{children}</ErrorBoundary>;
}
