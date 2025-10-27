/**
 * Combined Preview Component - Unit Tests
 * 
 * Testet die CombinedPreview Komponente mit Type Counters und Mixed Items.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CombinedPreview } from '../../features/combined/components/CombinedPreview';
import type { CombinedRadical, CombinedKanji, CombinedVocabulary } from '../../features/combined/types/combined-types';

describe('CombinedPreview Component', () => {
    const mockRadical: CombinedRadical = {
        type: 'radical',
        id: 1,
        characters: '一',
        level: 1,
        selected: false,
        translatedSynonyms: [],
        primaryMeaning: 'Ground',
        meanings: ['Ground'],
        existingSynonyms: ['floor'],
    };

    const mockKanji: CombinedKanji = {
        type: 'kanji',
        id: 440,
        characters: '一',
        level: 1,
        selected: false,
        translatedSynonyms: [],
        primaryMeaning: 'One',
        alternativeMeanings: ['Single'],
        meanings: ['One'],
        existingSynonyms: [],
    };

    const mockVocabulary: CombinedVocabulary = {
        type: 'vocabulary',
        id: 2467,
        characters: '一',
        level: 1,
        selected: false,
        translatedSynonyms: [],
        primaryMeaning: 'One',
        alternativeMeanings: [],
        meanings: ['One'],
        existingSynonyms: [],
    };

    describe('Empty State', () => {
        it('sollte Empty State anzeigen wenn keine Items vorhanden', () => {
            render(<CombinedPreview previewItems={[]} />);

            expect(screen.getByText('🎯 Combined Vorschau')).toBeInTheDocument();
            expect(screen.getByText(/Keine Items für das ausgewählte Level gefunden/)).toBeInTheDocument();
        });

        it('sollte displayedPreviewCount in Empty State anzeigen', () => {
            render(<CombinedPreview previewItems={[]} displayedPreviewCount={15} />);

            expect(screen.getByText(/Zeigt die ersten 15 Items/)).toBeInTheDocument();
        });
    });

    describe('Type Counters', () => {
        it('sollte Type Counters korrekt für Mixed Items berechnen', () => {
            const mixedItems = [mockRadical, mockKanji, mockVocabulary];

            render(
                <CombinedPreview
                    previewItems={mixedItems}
                    totalRadicals={5}
                    totalKanji={10}
                    totalVocabulary={15}
                />
            );

            // Check header text zeigt per-Type Counts
            expect(screen.getByText(/1 von 5 Radicals, 1 von 10 Kanji und 1 von 15 Vocabulary/)).toBeInTheDocument();
        });

        it('sollte Type Counters für nur Radicals korrekt anzeigen', () => {
            const radicals = [mockRadical, { ...mockRadical, id: 2 }];

            render(
                <CombinedPreview
                    previewItems={radicals}
                    totalRadicals={5}
                    totalKanji={10}
                    totalVocabulary={15}
                />
            );

            expect(screen.getByText(/2 von 5 Radicals, 0 von 10 Kanji und 0 von 15 Vocabulary/)).toBeInTheDocument();
        });

        it('sollte Type Counters für nur Vocabulary korrekt anzeigen', () => {
            const vocabularies = [mockVocabulary, { ...mockVocabulary, id: 2468 }, { ...mockVocabulary, id: 2469 }];

            render(
                <CombinedPreview
                    previewItems={vocabularies}
                    totalRadicals={5}
                    totalKanji={10}
                    totalVocabulary={15}
                />
            );

            expect(screen.getByText(/0 von 5 Radicals, 0 von 10 Kanji und 3 von 15 Vocabulary/)).toBeInTheDocument();
        });

        it('sollte separate Counters für displayed vs loaded Items anzeigen', () => {
            const manyItems = [
                mockRadical,
                mockKanji,
                mockVocabulary,
                { ...mockRadical, id: 2 },
                { ...mockKanji, id: 441 },
            ];

            render(
                <CombinedPreview
                    previewItems={manyItems}
                    displayedPreviewCount={3}
                    totalRadicals={5}
                    totalKanji={10}
                    totalVocabulary={15}
                />
            );

            // Die separate Counter-Sections wurden entfernt, jetzt nur Header-Text
            expect(screen.getByText(/2 von 5 Radicals, 2 von 10 Kanji und 1 von 15 Vocabulary/)).toBeInTheDocument();
        });
    });

    describe('Item Display', () => {
        it('sollte alle Items anzeigen wenn displayedPreviewCount größer als Array', () => {
            const items = [mockRadical, mockKanji];

            render(<CombinedPreview previewItems={items} displayedPreviewCount={10} />);

            expect(screen.getByTestId('combined-card-radical-1')).toBeInTheDocument();
            expect(screen.getByTestId('combined-card-kanji-440')).toBeInTheDocument();
        });

        it('sollte nur displayedPreviewCount Items anzeigen', () => {
            const items = [
                mockRadical,
                mockKanji,
                mockVocabulary,
                { ...mockRadical, id: 2 },
            ];

            render(<CombinedPreview previewItems={items} displayedPreviewCount={2} />);

            expect(screen.getByTestId('combined-card-radical-1')).toBeInTheDocument();
            expect(screen.getByTestId('combined-card-kanji-440')).toBeInTheDocument();
            expect(screen.queryByTestId('combined-card-vocabulary-2467')).not.toBeInTheDocument();
        });

        it('sollte Items in der gegebenen Reihenfolge anzeigen', () => {
            const items = [mockVocabulary, mockRadical, mockKanji];

            const { container } = render(<CombinedPreview previewItems={items} />);

            const cards = container.querySelectorAll('[data-testid^="combined-card-"]');
            expect(cards[0]).toHaveAttribute('data-testid', 'combined-card-vocabulary-2467');
            expect(cards[1]).toHaveAttribute('data-testid', 'combined-card-radical-1');
            expect(cards[2]).toHaveAttribute('data-testid', 'combined-card-kanji-440');
        });
    });

    describe('Count Information', () => {
        it('sollte currentLevelCount anzeigen wenn vorhanden', () => {
            render(
                <CombinedPreview
                    previewItems={[mockRadical]}
                    currentLevelCount={50}
                    totalRadicals={20}
                    totalKanji={15}
                    totalVocabulary={15}
                />
            );

            // Neue UI zeigt per-Type Counts, nicht "X Items insgesamt"
            expect(screen.getByText(/1 von 20 Radicals/)).toBeInTheDocument();
        });

        it('sollte Loading State für Count anzeigen', () => {
            render(
                <CombinedPreview
                    previewItems={[mockRadical]}
                    currentLevelCountLoading={true}
                    totalRadicals={5}
                    totalKanji={10}
                    totalVocabulary={15}
                />
            );

            // Der neue Header-Text zeigt immer per-Type Counts an
            expect(screen.getByText(/1 von 5 Radicals/)).toBeInTheDocument();
        });

        it('sollte "Count nicht verfügbar" anzeigen wenn kein Count', () => {
            // Mit den neuen Props werden Default-Werte (0) verwendet
            render(<CombinedPreview previewItems={[mockRadical]} />);

            // Zeigt "1 von 0" weil totalRadicals=0 (default)
            expect(screen.getByText(/1 von 0 Radicals/)).toBeInTheDocument();
        });

        it('sollte Anzahl angezeigter Items korrekt berechnen', () => {
            const items = [mockRadical, mockKanji, mockVocabulary];

            render(
                <CombinedPreview
                    previewItems={items}
                    displayedPreviewCount={2}
                    totalRadicals={5}
                    totalKanji={10}
                    totalVocabulary={15}
                />
            );

            // Neue UI zeigt per-Type Counts statt "X von Y geladenen Items"
            expect(screen.getByText(/1 von 5 Radicals, 1 von 10 Kanji und 1 von 15 Vocabulary/)).toBeInTheDocument();
        });
    });

    describe('Load More Functionality', () => {
        it('sollte Load More Button anzeigen wenn mehr Items als displayed', () => {
            const onLoadMore = vi.fn();
            const items = [mockRadical, mockKanji, mockVocabulary, { ...mockRadical, id: 2 }];

            render(
                <CombinedPreview
                    previewItems={items}
                    displayedPreviewCount={2}
                    currentLevelCount={10}
                    onLoadMore={onLoadMore}
                />
            );

            // Button-Text verwendet jetzt "Items" statt "Radicals"
            expect(screen.getByRole('button', { name: /Weitere.*Items anzeigen/i })).toBeInTheDocument();
        });

        it('sollte Load More Button nicht anzeigen wenn alle Items displayed', () => {
            const onLoadMore = vi.fn();
            const items = [mockRadical, mockKanji];

            render(
                <CombinedPreview
                    previewItems={items}
                    displayedPreviewCount={2}
                    onLoadMore={onLoadMore}
                />
            );

            expect(screen.queryByRole('button', { name: /Weitere/i })).not.toBeInTheDocument();
        });

        it('sollte onLoadMore aufrufen beim Klick', () => {
            const onLoadMore = vi.fn();
            const items = [mockRadical, mockKanji, mockVocabulary];

            render(
                <CombinedPreview
                    previewItems={items}
                    displayedPreviewCount={2}
                    onLoadMore={onLoadMore}
                />
            );

            const button = screen.getByRole('button', { name: /Weitere/i });
            fireEvent.click(button);

            expect(onLoadMore).toHaveBeenCalledTimes(1);
        });

        it('sollte Load More Button disablen während Loading', () => {
            const onLoadMore = vi.fn();
            const items = [mockRadical, mockKanji, mockVocabulary];

            render(
                <CombinedPreview
                    previewItems={items}
                    displayedPreviewCount={2}
                    isLoadingItems={true}
                    onLoadMore={onLoadMore}
                />
            );

            const button = screen.getByRole('button', { name: /Lädt/i });
            expect(button).toBeDisabled();
        });
    });

    describe('Edge Cases', () => {
        it('sollte mit leerem Array korrekt umgehen', () => {
            render(<CombinedPreview previewItems={[]} />);

            expect(screen.getByText(/Keine Items/)).toBeInTheDocument();
        });

        it('sollte mit displayedPreviewCount=0 korrekt umgehen', () => {
            const items = [mockRadical];

            render(<CombinedPreview previewItems={items} displayedPreviewCount={0} />);

            expect(screen.queryByTestId('combined-card-radical-1')).not.toBeInTheDocument();
        });

        it('sollte mit sehr großem displayedPreviewCount umgehen', () => {
            const items = [mockRadical, mockKanji];

            render(<CombinedPreview previewItems={items} displayedPreviewCount={1000} />);

            expect(screen.getByTestId('combined-card-radical-1')).toBeInTheDocument();
            expect(screen.getByTestId('combined-card-kanji-440')).toBeInTheDocument();
        });

        it('sollte mit nur einem Item-Type korrekt umgehen', () => {
            const onlyRadicals = [mockRadical, { ...mockRadical, id: 2 }];

            render(
                <CombinedPreview
                    previewItems={onlyRadicals}
                    totalRadicals={5}
                    totalKanji={10}
                    totalVocabulary={15}
                />
            );

            // Neue UI zeigt per-Type Counts im Header
            expect(screen.getByText(/2 von 5 Radicals, 0 von 10 Kanji und 0 von 15 Vocabulary/)).toBeInTheDocument();
        });
    });

    describe('Visual Rendering', () => {
        it('sollte Grid Layout für Items verwenden', () => {
            const items = [mockRadical, mockKanji, mockVocabulary];

            const { container } = render(<CombinedPreview previewItems={items} />);

            const grid = container.querySelector('.grid');
            expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
        });

        it('sollte farbige Indicators für Type Counters haben', () => {
            const items = [mockRadical];

            const { container } = render(
                <CombinedPreview
                    previewItems={items}
                    totalRadicals={5}
                    totalKanji={10}
                    totalVocabulary={15}
                />
            );

            // TypeCounters-Komponente wurde entfernt, also keine farbigen Dots mehr
            // Neue UI zeigt nur Text im Header
            expect(screen.getByText(/1 von 5 Radicals/)).toBeInTheDocument();
        });
    });
});
