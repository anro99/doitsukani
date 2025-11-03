import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProcessingControls, StreamingCompleteProcessingResult } from '@/shared/components/processing/ProcessingControls';

describe('ProcessingControls', () => {
    const defaultProps = {
        apiToken: 'test-token',
        deeplToken: 'deepl-token',
        synonymMode: 'smart-merge' as const,
        filteredItemsCount: 10,
        isProcessing: false,
        progress: 0,
        onStartProcessing: vi.fn(),
        onStopProcessing: vi.fn(),
        itemType: 'vocabulary' as const,
    };

    describe('Combined Manager byType breakdown', () => {
        it('sollte byType breakdown für Combined Manager anzeigen', () => {
            const streamingResult: StreamingCompleteProcessingResult = {
                success: true,
                wasStopped: false,
                totalItems: 196,
                translationCount: 196,
                uploadCount: 196,
                errorCount: 0,
                processingTime: 24600,
                byType: {
                    radicals: { total: 15, successful: 15, failed: 0 },
                    kanji: { total: 41, successful: 41, failed: 0 },
                    vocabulary: { total: 140, successful: 140, failed: 0 },
                },
            };

            render(
                <ProcessingControls
                    {...defaultProps}
                    itemType="combined"
                    streamingResult={streamingResult}
                />
            );

            // Prüfe auf Breakdown-Überschrift
            expect(screen.getByText('📋 Breakdown by Type:')).toBeInTheDocument();

            // Prüfe auf Type-Counts
            expect(screen.getByText(/Radicals:/)).toBeInTheDocument();
            expect(screen.getByText(/15\/15/)).toBeInTheDocument();

            expect(screen.getByText(/Kanji:/)).toBeInTheDocument();
            expect(screen.getByText(/41\/41/)).toBeInTheDocument();

            expect(screen.getByText(/Vocabulary:/)).toBeInTheDocument();
            expect(screen.getByText(/140\/140/)).toBeInTheDocument();
        });

        it('sollte byType breakdown NICHT anzeigen für andere Item-Types', () => {
            const streamingResult: StreamingCompleteProcessingResult = {
                success: true,
                wasStopped: false,
                totalItems: 50,
                translationCount: 50,
                uploadCount: 50,
                errorCount: 0,
                processingTime: 5000,
            };

            render(
                <ProcessingControls
                    {...defaultProps}
                    itemType="vocabulary"
                    streamingResult={streamingResult}
                />
            );

            // Kein Breakdown für Vocabulary
            expect(screen.queryByText('📋 Breakdown by Type:')).not.toBeInTheDocument();
        });

        it('sollte Failed-Count im byType breakdown anzeigen', () => {
            const streamingResult: StreamingCompleteProcessingResult = {
                success: false,
                wasStopped: false,
                totalItems: 196,
                translationCount: 190,
                uploadCount: 190,
                errorCount: 6,
                processingTime: 24600,
                byType: {
                    radicals: { total: 15, successful: 13, failed: 2 },
                    kanji: { total: 41, successful: 39, failed: 2 },
                    vocabulary: { total: 140, successful: 138, failed: 2 },
                },
            };

            render(
                <ProcessingControls
                    {...defaultProps}
                    itemType="combined"
                    streamingResult={streamingResult}
                />
            );

            // Prüfe auf Failed-Counts
            expect(screen.getByText(/13\/15/)).toBeInTheDocument();
            expect(screen.getByText(/39\/41/)).toBeInTheDocument();
            expect(screen.getByText(/138\/140/)).toBeInTheDocument();
        });
    });

    describe('Standard Result Display', () => {
        it('sollte Standard-Statistiken anzeigen', () => {
            const streamingResult: StreamingCompleteProcessingResult = {
                success: true,
                wasStopped: false,
                totalItems: 50,
                translationCount: 50,
                uploadCount: 50,
                errorCount: 0,
                processingTime: 5000,
            };

            render(
                <ProcessingControls
                    {...defaultProps}
                    streamingResult={streamingResult}
                />
            );

            // Standard-Stats
            expect(screen.getByText(/Items:/)).toBeInTheDocument();
            expect(screen.getByText(/📊 Items:/)).toBeInTheDocument();
            expect(screen.getByText(/Time:/)).toBeInTheDocument();
            expect(screen.getByText(/5\.0s/)).toBeInTheDocument();
            expect(screen.getByText(/Translated:/)).toBeInTheDocument();
            expect(screen.getByText(/Uploaded:/)).toBeInTheDocument();
            expect(screen.getByText(/Errors:/)).toBeInTheDocument();

            // Verrifiziere dass keine byType breakdown angezeigt wird
            expect(screen.queryByText('📋 Breakdown by Type:')).not.toBeInTheDocument();
        });
    });
});
