import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../../shared/components/ErrorBoundary';

/**
 * Test-Component die einen Fehler wirft
 */
function ThrowError({ shouldThrow }: { shouldThrow?: boolean }): React.ReactElement {
    if (shouldThrow) {
        throw new Error('Test Error Message');
    }
    return <div>Working Component</div>;
}

describe('ErrorBoundary', () => {
    // Suppress console.error für diese Tests
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    describe('Normal Rendering', () => {
        it('sollte Children normal rendern wenn kein Fehler auftritt', () => {
            render(
                <ErrorBoundary>
                    <div>Test Content</div>
                </ErrorBoundary>
            );

            expect(screen.getByText('Test Content')).toBeInTheDocument();
        });

        it('sollte mehrere Children rendern', () => {
            render(
                <ErrorBoundary>
                    <div>Child 1</div>
                    <div>Child 2</div>
                    <div>Child 3</div>
                </ErrorBoundary>
            );

            expect(screen.getByText('Child 1')).toBeInTheDocument();
            expect(screen.getByText('Child 2')).toBeInTheDocument();
            expect(screen.getByText('Child 3')).toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        it('sollte Fehler-UI anzeigen wenn Child einen Error wirft', () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            // Prüfe ob Standard-Fehler-UI angezeigt wird
            expect(screen.getByText(/Oops! Etwas ist schief gelaufen/i)).toBeInTheDocument();
            // Verwende getAllByText da Text mehrfach vorkommt (Fehlermeldung + Stack Trace)
            const errorMessages = screen.getAllByText(/Test Error Message/i);
            expect(errorMessages.length).toBeGreaterThan(0);
        });

        it('sollte Error Message in der UI anzeigen', () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByText('Test Error Message')).toBeInTheDocument();
        });

        it('sollte "Erneut versuchen" Button anzeigen', () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByRole('button', { name: /Erneut versuchen/i })).toBeInTheDocument();
        });

        it('sollte "Zurück" Button anzeigen', () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByRole('button', { name: /Zurück/i })).toBeInTheDocument();
        });
    });

    describe('Custom Fallback', () => {
        it('sollte custom fallback rendern wenn vorhanden', () => {
            const customFallback = <div>Custom Error UI</div>;

            render(
                <ErrorBoundary fallback={customFallback}>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
            expect(screen.queryByText(/Oops! Etwas ist schief gelaufen/i)).not.toBeInTheDocument();
        });
    });

    describe('Error Callback', () => {
        it('sollte onError callback aufrufen wenn Fehler auftritt', () => {
            const onError = vi.fn();

            render(
                <ErrorBoundary onError={onError}>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Test Error Message',
                }),
                expect.objectContaining({
                    componentStack: expect.any(String),
                })
            );
        });

        it('sollte nicht crashen wenn kein onError callback vorhanden', () => {
            expect(() => {
                render(
                    <ErrorBoundary>
                        <ThrowError shouldThrow={true} />
                    </ErrorBoundary>
                );
            }).not.toThrow();
        });
    });

    describe('Reset Functionality', () => {
        it('sollte Component neu rendern nach Reset', async () => {
            const user = userEvent.setup();
            let shouldThrow = true;

            const TestComponent = () => {
                if (shouldThrow) {
                    throw new Error('Test Error');
                }
                return <div>Success!</div>;
            };

            render(
                <ErrorBoundary>
                    <TestComponent />
                </ErrorBoundary>
            );

            // Fehler-UI sollte sichtbar sein
            expect(screen.getByText(/Oops! Etwas ist schief gelaufen/i)).toBeInTheDocument();

            // Reset Error State
            shouldThrow = false;
            const resetButton = screen.getByRole('button', { name: /Zurück/i });
            await user.click(resetButton);

            // Component sollte normal rendern
            expect(screen.getByText('Success!')).toBeInTheDocument();
        });
    });

    describe('Technical Details', () => {
        it('sollte Stack Trace in Details anzeigen', () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            const details = screen.getByText(/Technische Details/i);
            expect(details).toBeInTheDocument();
        });

        it('sollte Hilfetext anzeigen', () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByText(/Was kannst du tun?/i)).toBeInTheDocument();
            expect(screen.getByText(/Klicke auf "Erneut versuchen"/i)).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('sollte mit null Children umgehen', () => {
            render(
                <ErrorBoundary>
                    {null}
                </ErrorBoundary>
            );

            // Sollte nicht crashen
            expect(document.body).toBeInTheDocument();
        });

        it('sollte mit undefined Children umgehen', () => {
            render(
                <ErrorBoundary>
                    {undefined}
                </ErrorBoundary>
            );

            // Sollte nicht crashen
            expect(document.body).toBeInTheDocument();
        });

        it('sollte mehrere Errors nacheinander handhaben', () => {
            const { rerender } = render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={false} />
                </ErrorBoundary>
            );

            expect(screen.getByText('Working Component')).toBeInTheDocument();

            // Trigger Error
            rerender(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByText(/Oops! Etwas ist schief gelaufen/i)).toBeInTheDocument();
        });
    });
});
