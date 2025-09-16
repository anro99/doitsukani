import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProcessingControls } from '../../components/ProcessingControls';

const mockProps = {
    apiToken: 'test-api-token',
    deeplToken: 'test-deepl-token',
    synonymMode: 'smart-merge' as const,
    filteredItemsCount: 10,
    isProcessing: false,
    progress: 0,
    uploadStats: {
        created: 0,
        updated: 0,
        failed: 0,
        skipped: 0,
        successful: 0
    },
    onStartProcessing: vi.fn(),
    onStopProcessing: vi.fn(),
    itemType: 'vocabulary' as const
};

describe('🎯 Phase 2 Task 4: ProcessingControls Live Feedback', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Live Processing Status Display', () => {
        it('should show currently processing items count', () => {
            const processingItems = new Set([1, 3, 5]);

            render(
                <ProcessingControls
                    {...mockProps}
                    isProcessing={true}
                    processingItems={processingItems}
                />
            );

            // Should show processing count
            expect(screen.getByTestId('processing-items-count')).toBeInTheDocument();
            expect(screen.getByText('3 items currently processing')).toBeInTheDocument();
        });

        it('should show error items count and details', () => {
            const errorItems = new Map([
                [1, 'Translation failed'],
                [2, 'Network timeout'],
                [4, 'Invalid response']
            ]);

            render(
                <ProcessingControls
                    {...mockProps}
                    errorItems={errorItems}
                />
            );

            // Should show error count
            expect(screen.getByTestId('error-items-count')).toBeInTheDocument();
            expect(screen.getByText('3 items failed')).toBeInTheDocument();

            // Should show error details
            expect(screen.getByTestId('error-items-details')).toBeInTheDocument();
            expect(screen.getByText('Item 1: Translation failed')).toBeInTheDocument();
            expect(screen.getByText('Item 2: Network timeout')).toBeInTheDocument();
            expect(screen.getByText('Item 4: Invalid response')).toBeInTheDocument();
        });

        it('should show combined processing and error status', () => {
            const processingItems = new Set([1, 2]);
            const errorItems = new Map([[3, 'Failed'], [4, 'Error']]);

            render(
                <ProcessingControls
                    {...mockProps}
                    isProcessing={true}
                    processingItems={processingItems}
                    errorItems={errorItems}
                />
            );

            // Should show both counts
            expect(screen.getByText('2 items currently processing')).toBeInTheDocument();
            expect(screen.getByText('2 items failed')).toBeInTheDocument();
        });

        it('should hide live status when not processing and no errors', () => {
            render(<ProcessingControls {...mockProps} />);

            // Should not show live status indicators
            expect(screen.queryByTestId('processing-items-count')).not.toBeInTheDocument();
            expect(screen.queryByTestId('error-items-count')).not.toBeInTheDocument();
            expect(screen.queryByTestId('live-status-section')).not.toBeInTheDocument();
        });

        it('should show most recent processing item', () => {
            const processingItems = new Set([1, 3, 5]);
            const currentProcessingItem = { id: 3, characters: '猫', primaryMeaning: 'cat' };

            render(
                <ProcessingControls
                    {...mockProps}
                    isProcessing={true}
                    processingItems={processingItems}
                    currentProcessingItem={currentProcessingItem}
                />
            );

            // Should show current item details
            expect(screen.getByTestId('current-processing-item')).toBeInTheDocument();
            expect(screen.getByText('Currently processing: 猫 (cat)')).toBeInTheDocument();
        });
    });

    describe('Visual Status Indicators', () => {
        it('should use appropriate colors for different statuses', () => {
            const processingItems = new Set([1, 2]);
            const errorItems = new Map([[3, 'Failed']]);

            render(
                <ProcessingControls
                    {...mockProps}
                    isProcessing={true}
                    processingItems={processingItems}
                    errorItems={errorItems}
                />
            );

            // Processing count should be blue
            const processingCount = screen.getByTestId('processing-items-count');
            expect(processingCount).toHaveClass('text-blue-600');

            // Error count should be red
            const errorCount = screen.getByTestId('error-items-count');
            expect(errorCount).toHaveClass('text-red-600');
        });

        it('should show pulsing animation for active processing', () => {
            const processingItems = new Set([1]);

            render(
                <ProcessingControls
                    {...mockProps}
                    isProcessing={true}
                    processingItems={processingItems}
                />
            );

            // Processing indicator should have pulse animation
            const processingIndicator = screen.getByTestId('processing-indicator');
            expect(processingIndicator).toHaveClass('animate-pulse');
        });

        it('should display processing phase information', () => {
            const streamingPhases = {
                translationPhase: {
                    progress: 60,
                    phase: 'translation' as const,
                    status: 'in-progress' as const
                },
                uploadPhase: {
                    progress: 20,
                    phase: 'upload' as const,
                    status: 'in-progress' as const
                },
                overallPhase: {
                    progress: 40,
                    phase: 'both' as const,
                    status: 'in-progress' as const
                }
            };

            render(
                <ProcessingControls
                    {...mockProps}
                    isProcessing={true}
                    streamingPhases={streamingPhases}
                />
            );

            // Should show phase information
            expect(screen.getByText('Translation: 60%')).toBeInTheDocument();
            expect(screen.getByText('Upload: 20%')).toBeInTheDocument();
        });
    });

    describe('Real-time Updates', () => {
        it('should update counts when processingItems change', () => {
            let processingItems = new Set([1]);

            const { rerender } = render(
                <ProcessingControls
                    {...mockProps}
                    isProcessing={true}
                    processingItems={processingItems}
                />
            );

            expect(screen.getByText('1 items currently processing')).toBeInTheDocument();

            // Update processing items
            processingItems = new Set([1, 2, 3]);

            rerender(
                <ProcessingControls
                    {...mockProps}
                    isProcessing={true}
                    processingItems={processingItems}
                />
            );

            expect(screen.getByText('3 items currently processing')).toBeInTheDocument();
        });

        it('should update error display when errorItems change', () => {
            let errorItems = new Map([[1, 'Error 1']]);

            const { rerender } = render(
                <ProcessingControls
                    {...mockProps}
                    errorItems={errorItems}
                />
            );

            expect(screen.getByText('1 items failed')).toBeInTheDocument();
            expect(screen.getByText('Item 1: Error 1')).toBeInTheDocument();

            // Add more errors
            errorItems = new Map([[1, 'Error 1'], [2, 'Error 2']]);

            rerender(
                <ProcessingControls
                    {...mockProps}
                    errorItems={errorItems}
                />
            );

            expect(screen.getByText('2 items failed')).toBeInTheDocument();
            expect(screen.getByText('Item 2: Error 2')).toBeInTheDocument();
        });

        it('should clear live status when processing completes', () => {
            const { rerender } = render(
                <ProcessingControls
                    {...mockProps}
                    isProcessing={true}
                    processingItems={new Set([1])}
                />
            );

            expect(screen.getByTestId('processing-items-count')).toBeInTheDocument();

            // Complete processing
            rerender(
                <ProcessingControls
                    {...mockProps}
                    isProcessing={false}
                    processingItems={new Set()}
                />
            );

            expect(screen.queryByTestId('processing-items-count')).not.toBeInTheDocument();
        });
    });

    describe('Error Management', () => {
        it('should provide clear error button when errors exist', () => {
            const errorItems = new Map([[1, 'Error']]);
            const onClearErrors = vi.fn();

            render(
                <ProcessingControls
                    {...mockProps}
                    errorItems={errorItems}
                    onClearErrors={onClearErrors}
                />
            );

            const clearButton = screen.getByTestId('clear-errors-button');
            expect(clearButton).toBeInTheDocument();
            expect(screen.getByText('Clear Errors')).toBeInTheDocument();

            clearButton.click();
            expect(onClearErrors).toHaveBeenCalledOnce();
        });

        it('should limit error display to prevent UI overflow', () => {
            // Create many errors
            const manyErrors = new Map();
            for (let i = 1; i <= 20; i++) {
                manyErrors.set(i, `Error ${i}`);
            }

            render(
                <ProcessingControls
                    {...mockProps}
                    errorItems={manyErrors}
                />
            );

            expect(screen.getByText('20 items failed')).toBeInTheDocument();

            // Should show only first 5 errors and "show more" indicator
            expect(screen.getByText('Item 1: Error 1')).toBeInTheDocument();
            expect(screen.getByText('Item 5: Error 5')).toBeInTheDocument();
            expect(screen.getByText('... and 15 more errors')).toBeInTheDocument();
        });

        it('should expand error list when show more is clicked', () => {
            const manyErrors = new Map();
            for (let i = 1; i <= 8; i++) {
                manyErrors.set(i, `Error ${i}`);
            }

            render(
                <ProcessingControls
                    {...mockProps}
                    errorItems={manyErrors}
                />
            );

            // Initially shows first 5
            expect(screen.getByText('... and 3 more errors')).toBeInTheDocument();
            expect(screen.queryByText('Item 8: Error 8')).not.toBeInTheDocument();

            // Click show more
            const showMoreButton = screen.getByTestId('show-more-errors');
            showMoreButton.click();

            // Should now show all errors
            expect(screen.getByText('Item 8: Error 8')).toBeInTheDocument();
            expect(screen.queryByText('... and 3 more errors')).not.toBeInTheDocument();
        });
    });

    describe('Performance and Accessibility', () => {
        it('should handle frequent updates without performance issues', () => {
            const { rerender } = render(<ProcessingControls {...mockProps} />);

            const iterations = 50;
            const startTime = performance.now();

            // Simulate rapid updates
            for (let i = 0; i < iterations; i++) {
                rerender(
                    <ProcessingControls
                        {...mockProps}
                        isProcessing={true}
                        processingItems={new Set([i % 5 + 1])}
                        errorItems={new Map([[i % 3 + 1, `Error ${i}`]])}
                    />
                );
            }

            const updateTime = performance.now() - startTime;

            // Should handle updates efficiently (less than 50ms for 50 updates)
            expect(updateTime).toBeLessThan(50);
        });

        it('should provide proper accessibility attributes', () => {
            const processingItems = new Set([1]);
            const errorItems = new Map([[2, 'Error']]);

            render(
                <ProcessingControls
                    {...mockProps}
                    isProcessing={true}
                    processingItems={processingItems}
                    errorItems={errorItems}
                />
            );

            // Processing status should have proper aria labels
            const processingStatus = screen.getByTestId('processing-items-count');
            expect(processingStatus).toHaveAttribute('aria-label', 'Processing status');
            expect(processingStatus).toHaveAttribute('role', 'status');

            // Error status should have proper aria labels
            const errorStatus = screen.getByTestId('error-items-count');
            expect(errorStatus).toHaveAttribute('aria-label', 'Error status');
            expect(errorStatus).toHaveAttribute('role', 'alert');
        });
    });
});
