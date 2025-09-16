import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VocabularyPreview } from '../../components/VocabularyPreview';

// Mock vocabulary data for testing
const mockVocabulary = [
    {
        id: 1,
        primaryMeaning: 'dog',
        alternativeMeanings: ['puppy'],
        characters: '犬',
        level: 1,
        currentSynonyms: [],
        selected: true,
        translatedSynonyms: [],
        readings: ['いぬ']
    },
    {
        id: 2,
        primaryMeaning: 'cat',
        alternativeMeanings: ['kitty'],
        characters: '猫',
        level: 1,
        currentSynonyms: [],
        selected: true,
        translatedSynonyms: [],
        readings: ['ねこ']
    },
    {
        id: 3,
        primaryMeaning: 'house',
        alternativeMeanings: ['home'],
        characters: '家',
        level: 2,
        currentSynonyms: [],
        selected: true,
        translatedSynonyms: [],
        readings: ['いえ']
    }
];

describe('🎯 Phase 2 Task 3: VocabularyPreview Live Updates', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Live Processing Status Display', () => {
        it('should show processing status for items currently being processed', () => {
            const processingItems = new Set([1, 2]); // Items 1 and 2 are being processed
            const errorItems = new Map<number, string>();

            render(
                <VocabularyPreview
                    previewVocabulary={mockVocabulary}
                    processingItems={processingItems}
                    errorItems={errorItems}
                />
            );

            // Should show processing indicators for items 1 and 2
            expect(screen.getByText('犬')).toBeInTheDocument();
            expect(screen.getByText('猫')).toBeInTheDocument();

            // Should have processing indicators
            expect(screen.getByTestId('processing-indicator-1')).toBeInTheDocument();
            expect(screen.getByTestId('processing-indicator-2')).toBeInTheDocument();
            expect(screen.queryByTestId('processing-indicator-3')).not.toBeInTheDocument();
        });

        it('should show error status for items with errors', () => {
            const processingItems = new Set<number>();
            const errorItems = new Map([[1, 'Translation failed'], [3, 'Network error']]);

            render(
                <VocabularyPreview
                    previewVocabulary={mockVocabulary}
                    processingItems={processingItems}
                    errorItems={errorItems}
                />
            );

            // Should show error indicators
            expect(screen.getByTestId('error-indicator-1')).toBeInTheDocument();
            expect(screen.getByTestId('error-indicator-3')).toBeInTheDocument();
            expect(screen.queryByTestId('error-indicator-2')).not.toBeInTheDocument();

            // Should show error messages
            expect(screen.getByText('Translation failed')).toBeInTheDocument();
            expect(screen.getByText('Network error')).toBeInTheDocument();
        });

        it('should show completed status for successfully processed items', () => {
            const processingItems = new Set<number>();
            const errorItems = new Map<number, string>();

            // Mock vocabulary with some completed translations
            const completedVocabulary = mockVocabulary.map(item =>
                item.id === 2 ? { ...item, translatedSynonyms: ['cat', 'katze'] } : item
            );

            render(
                <VocabularyPreview
                    previewVocabulary={completedVocabulary}
                    processingItems={processingItems}
                    errorItems={errorItems}
                />
            );

            // Should show completion indicator for item with translations
            expect(screen.getByTestId('completed-indicator-2')).toBeInTheDocument();
            expect(screen.queryByTestId('completed-indicator-1')).not.toBeInTheDocument();
            expect(screen.queryByTestId('completed-indicator-3')).not.toBeInTheDocument();

            // Should show translated synonyms
            expect(screen.getByText('cat, katze')).toBeInTheDocument();
        });

        it('should prioritize status display: error > processing > completed > default', () => {
            const processingItems = new Set([1, 2]); // Items 1 and 2 processing
            const errorItems = new Map([[1, 'Failed']]); // Item 1 also has error

            const vocabularyWithTranslations = mockVocabulary.map(item => ({
                ...item,
                translatedSynonyms: item.id === 1 ? ['dog', 'hund'] : []
            }));

            render(
                <VocabularyPreview
                    previewVocabulary={vocabularyWithTranslations}
                    processingItems={processingItems}
                    errorItems={errorItems}
                />
            );

            // Item 1 should show error (highest priority) despite being in processing and having translations
            expect(screen.getByTestId('error-indicator-1')).toBeInTheDocument();
            expect(screen.queryByTestId('processing-indicator-1')).not.toBeInTheDocument();
            expect(screen.queryByTestId('completed-indicator-1')).not.toBeInTheDocument();

            // Item 2 should show processing (no error)
            expect(screen.getByTestId('processing-indicator-2')).toBeInTheDocument();
            expect(screen.queryByTestId('error-indicator-2')).not.toBeInTheDocument();
        });
    });

    describe('Visual Status Indicators', () => {
        it('should use appropriate colors and icons for different statuses', () => {
            const processingItems = new Set([1]);
            const errorItems = new Map([[2, 'Error']]);
            const completedVocabulary = mockVocabulary.map(item =>
                item.id === 3 ? { ...item, translatedSynonyms: ['house'] } : item
            );

            render(
                <VocabularyPreview
                    previewVocabulary={completedVocabulary}
                    processingItems={processingItems}
                    errorItems={errorItems}
                />
            );

            // Processing item should have blue indicator with spinning element
            const processingIndicator = screen.getByTestId('processing-indicator-1');
            expect(processingIndicator).toHaveClass('text-blue-500');

            // The spinning animation is on the child span element
            const spinningElement = processingIndicator.querySelector('.animate-spin');
            expect(spinningElement).toBeInTheDocument();

            // Error item should have red indicator
            const errorIndicator = screen.getByTestId('error-indicator-2');
            expect(errorIndicator).toHaveClass('text-red-500');

            // Completed item should have green indicator
            const completedIndicator = screen.getByTestId('completed-indicator-3');
            expect(completedIndicator).toHaveClass('text-green-500');
        });

        it('should show loading animation only for processing items', () => {
            const processingItems = new Set([1]);
            const errorItems = new Map<number, string>();

            render(
                <VocabularyPreview
                    previewVocabulary={mockVocabulary}
                    processingItems={processingItems}
                    errorItems={errorItems}
                />
            );

            // Only processing items should have animation
            const processingIndicator = screen.getByTestId('processing-indicator-1');
            const spinningElement = processingIndicator.querySelector('.animate-spin');
            expect(spinningElement).toBeInTheDocument();

            // Non-processing items should not have processing indicators at all
            expect(screen.queryByTestId('processing-indicator-2')).not.toBeInTheDocument();
            expect(screen.queryByTestId('processing-indicator-3')).not.toBeInTheDocument();
        });
    });

    describe('Real-time Updates Handling', () => {
        it('should update status when processingItems change', () => {
            let processingItems = new Set([1]);
            const errorItems = new Map<number, string>();

            const { rerender } = render(
                <VocabularyPreview
                    previewVocabulary={mockVocabulary}
                    processingItems={processingItems}
                    errorItems={errorItems}
                />
            );

            // Initially item 1 is processing
            expect(screen.getByTestId('processing-indicator-1')).toBeInTheDocument();

            // Update to process item 2 instead
            processingItems = new Set([2]);

            rerender(
                <VocabularyPreview
                    previewVocabulary={mockVocabulary}
                    processingItems={processingItems}
                    errorItems={errorItems}
                />
            );

            // Item 1 should no longer be processing, item 2 should be
            expect(screen.queryByTestId('processing-indicator-1')).not.toBeInTheDocument();
            expect(screen.getByTestId('processing-indicator-2')).toBeInTheDocument();
        });

        it('should update status when errorItems change', () => {
            const processingItems = new Set<number>();
            let errorItems = new Map<number, string>();

            const { rerender } = render(
                <VocabularyPreview
                    previewVocabulary={mockVocabulary}
                    processingItems={processingItems}
                    errorItems={errorItems}
                />
            );

            // Initially no errors
            expect(screen.queryByTestId('error-indicator-1')).not.toBeInTheDocument();

            // Add error for item 1
            errorItems = new Map([[1, 'New error']]);

            rerender(
                <VocabularyPreview
                    previewVocabulary={mockVocabulary}
                    processingItems={processingItems}
                    errorItems={errorItems}
                />
            );

            // Should now show error indicator
            expect(screen.getByTestId('error-indicator-1')).toBeInTheDocument();
            expect(screen.getByText('New error')).toBeInTheDocument();
        });

        it('should handle rapid status transitions smoothly', () => {
            const processingItems = new Set([1]);
            const errorItems = new Map<number, string>();

            const { rerender } = render(
                <VocabularyPreview
                    previewVocabulary={mockVocabulary}
                    processingItems={processingItems}
                    errorItems={errorItems}
                />
            );

            // Start processing
            expect(screen.getByTestId('processing-indicator-1')).toBeInTheDocument();

            // Transition to error
            rerender(
                <VocabularyPreview
                    previewVocabulary={mockVocabulary}
                    processingItems={new Set()}
                    errorItems={new Map([[1, 'Failed']])}
                />
            );

            expect(screen.queryByTestId('processing-indicator-1')).not.toBeInTheDocument();
            expect(screen.getByTestId('error-indicator-1')).toBeInTheDocument();

            // Clear error (back to normal)
            rerender(
                <VocabularyPreview
                    previewVocabulary={mockVocabulary}
                    processingItems={new Set()}
                    errorItems={new Map()}
                />
            );

            expect(screen.queryByTestId('error-indicator-1')).not.toBeInTheDocument();
        });
    });

    describe('Performance and Accessibility', () => {
        it('should maintain performance with large datasets and frequent updates', () => {
            // Create larger dataset
            const largeVocabulary = Array.from({ length: 100 }, (_, i) => ({
                id: i + 1,
                primaryMeaning: `meaning${i + 1}`,
                alternativeMeanings: [],
                characters: `字${i + 1}`,
                level: 1,
                currentSynonyms: [],
                selected: true,
                translatedSynonyms: [],
                readings: [`reading${i + 1}`]
            }));

            const startTime = performance.now();

            render(
                <VocabularyPreview
                    previewVocabulary={largeVocabulary}
                    processingItems={new Set([1, 50, 99])}
                    errorItems={new Map([[25, 'Error'], [75, 'Another error']])}
                />
            );

            const renderTime = performance.now() - startTime;

            // Should render within reasonable time (less than 100ms for 100 items)
            expect(renderTime).toBeLessThan(100);

            // Should still show correct indicators for displayed items (first 12)
            expect(screen.getByTestId('processing-indicator-1')).toBeInTheDocument();
            // Item 50 would not be displayed as we only show first 12 by default
            expect(screen.queryByTestId('processing-indicator-50')).not.toBeInTheDocument();
            // But processing should still work properly for displayed items with errors
        });

        it('should provide proper accessibility attributes for status indicators', () => {
            const processingItems = new Set([1]);
            const errorItems = new Map([[2, 'Translation failed']]);

            render(
                <VocabularyPreview
                    previewVocabulary={mockVocabulary}
                    processingItems={processingItems}
                    errorItems={errorItems}
                />
            );

            // Processing indicator should have proper aria attributes
            const processingIndicator = screen.getByTestId('processing-indicator-1');
            expect(processingIndicator).toHaveAttribute('aria-label', 'Currently processing');
            expect(processingIndicator).toHaveAttribute('role', 'status');

            // Error indicator should have proper aria attributes
            const errorIndicator = screen.getByTestId('error-indicator-2');
            expect(errorIndicator).toHaveAttribute('aria-label', 'Processing failed: Translation failed');
            expect(errorIndicator).toHaveAttribute('role', 'alert');
        });
    });
});
