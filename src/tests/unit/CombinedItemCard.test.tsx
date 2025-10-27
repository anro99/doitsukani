/**
 * Combined Item Card - Unit Tests
 * 
 * Testet die CombinedItemCard Komponente für alle drei Item Types.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CombinedItemCard } from '../../features/combined/components/CombinedItemCard';
import type { CombinedRadical, CombinedKanji, CombinedVocabulary } from '../../features/combined/types/combined-types';

describe('CombinedItemCard Component', () => {
    const mockRadical: CombinedRadical = {
        type: 'radical',
        id: 1,
        characters: '一',
        level: 1,
        selected: false,
        translatedSynonyms: [],
        primaryMeaning: 'Ground',
        meanings: ['Ground'],
        existingSynonyms: ['floor', 'base'],
        meaningMnemonic: 'This is the ground',
    };

    const mockTextOnlyRadical: CombinedRadical = {
        type: 'radical',
        id: 2,
        characters: null, // Text-only radical
        level: 1,
        selected: false,
        translatedSynonyms: [],
        primaryMeaning: 'Leaf',
        meanings: ['Leaf'],
        existingSynonyms: [],
        meaningMnemonic: 'Looks like a leaf',
    };

    const mockKanji: CombinedKanji = {
        type: 'kanji',
        id: 440,
        characters: '一',
        level: 1,
        selected: false,
        translatedSynonyms: ['eins', 'ein'],
        primaryMeaning: 'One',
        alternativeMeanings: ['Single'],
        meanings: ['One', 'Single'],
        existingSynonyms: ['solo'],
        meaningMnemonic: 'This is the number one',
    };

    const mockVocabulary: CombinedVocabulary = {
        type: 'vocabulary',
        id: 2467,
        characters: '一',
        level: 1,
        selected: false,
        translatedSynonyms: ['eins', 'ein'],
        primaryMeaning: 'One',
        alternativeMeanings: ['The number one'],
        meanings: ['One', 'The number one'],
        existingSynonyms: ['ichi'],
    };

    describe('Radical Display', () => {
        it('sollte Radical mit characters korrekt rendern', () => {
            render(<CombinedItemCard item={mockRadical} />);

            // Type Badge
            expect(screen.getByTestId('type-badge-radical')).toHaveTextContent('R');

            // Characters
            expect(screen.getByText('一')).toBeInTheDocument();

            // Primary Meaning
            expect(screen.getByText('Ground')).toBeInTheDocument();

            // Level Badge
            expect(screen.getByText('Level 1')).toBeInTheDocument();

            // Meaning Mnemonic
            expect(screen.getByText(/This is the ground/)).toBeInTheDocument();

            // Existing Synonyms
            expect(screen.getByText('floor')).toBeInTheDocument();
            expect(screen.getByText('base')).toBeInTheDocument();
        });

        it('sollte text-only Radical mit 📝 Icon rendern', () => {
            render(<CombinedItemCard item={mockTextOnlyRadical} />);

            // Icon für text-only radical
            expect(screen.getByText('📝')).toBeInTheDocument();

            // Primary Meaning
            expect(screen.getByText('Leaf')).toBeInTheDocument();

            // Empty synonyms message
            expect(screen.getByText('Keine Synonyme')).toBeInTheDocument();
        });

        it('sollte blaue Farbgebung für Radicals verwenden', () => {
            const { container } = render(<CombinedItemCard item={mockRadical} />);

            const card = container.querySelector('[data-testid="combined-card-radical-1"]');
            expect(card).toHaveClass('from-blue-50', 'to-cyan-50', 'border-blue-200');
        });
    });

    describe('Kanji Display', () => {
        it('sollte Kanji korrekt rendern', () => {
            render(<CombinedItemCard item={mockKanji} />);

            // Type Badge
            expect(screen.getByTestId('type-badge-kanji')).toHaveTextContent('K');

            // Characters
            expect(screen.getByText('一')).toBeInTheDocument();

            // Primary Meaning
            expect(screen.getByText('One')).toBeInTheDocument();

            // Alternative Meanings
            expect(screen.getByText(/Alt: Single/)).toBeInTheDocument();

            // Level Badge
            expect(screen.getByText('Level 1')).toBeInTheDocument();

            // Meaning Mnemonic
            expect(screen.getByText(/This is the number one/)).toBeInTheDocument();

            // Existing Synonyms
            expect(screen.getByText('solo')).toBeInTheDocument();

            // Translated Synonyms
            expect(screen.getByText('eins')).toBeInTheDocument();
            expect(screen.getByText('ein')).toBeInTheDocument();
        });

        it('sollte pinke Farbgebung für Kanji verwenden', () => {
            const { container } = render(<CombinedItemCard item={mockKanji} />);

            const card = container.querySelector('[data-testid="combined-card-kanji-440"]');
            expect(card).toHaveClass('from-pink-50', 'to-rose-50', 'border-pink-200');
        });

        it('sollte alternativeMeanings korrekt anzeigen', () => {
            render(<CombinedItemCard item={mockKanji} />);

            const altText = screen.getByText(/Alt:/);
            expect(altText).toHaveTextContent('Alt: Single');
        });
    });

    describe('Vocabulary Display', () => {
        it('sollte Vocabulary korrekt rendern', () => {
            render(<CombinedItemCard item={mockVocabulary} />);

            // Type Badge
            expect(screen.getByTestId('type-badge-vocabulary')).toHaveTextContent('V');

            // Characters
            expect(screen.getByText('一')).toBeInTheDocument();

            // Primary Meaning
            expect(screen.getByText('One')).toBeInTheDocument();

            // Alternative Meanings
            expect(screen.getByText(/Alt: The number one/)).toBeInTheDocument();

            // Level Badge
            expect(screen.getByText('Level 1')).toBeInTheDocument();

            // Existing Synonyms
            expect(screen.getByText('ichi')).toBeInTheDocument();

            // Translated Synonyms
            expect(screen.getByText('eins')).toBeInTheDocument();
            expect(screen.getByText('ein')).toBeInTheDocument();
        });

        it('sollte lila Farbgebung für Vocabulary verwenden', () => {
            const { container } = render(<CombinedItemCard item={mockVocabulary} />);

            const card = container.querySelector('[data-testid="combined-card-vocabulary-2467"]');
            expect(card).toHaveClass('from-purple-50', 'to-indigo-50', 'border-purple-200');
        });
    });

    describe('Translated Synonyms Display', () => {
        it('sollte translated synonyms anzeigen wenn vorhanden', () => {
            render(<CombinedItemCard item={mockKanji} />);

            // Label
            expect(screen.getByText('Übersetzte Synonyme:')).toBeInTheDocument();

            // Synonyms
            expect(screen.getByText('eins')).toBeInTheDocument();
            expect(screen.getByText('ein')).toBeInTheDocument();
        });

        it('sollte keine translated synonyms anzeigen wenn leer', () => {
            const itemWithoutTranslations = { ...mockRadical, translatedSynonyms: [] };
            render(<CombinedItemCard item={itemWithoutTranslations} />);

            expect(screen.queryByText('Übersetzte Synonyme:')).not.toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('sollte Items ohne alternativeMeanings korrekt rendern', () => {
            const kanjiWithoutAlts: CombinedKanji = {
                ...mockKanji,
                alternativeMeanings: [],
            };

            render(<CombinedItemCard item={kanjiWithoutAlts} />);

            expect(screen.getByText('One')).toBeInTheDocument();
            expect(screen.queryByText(/Alt:/)).not.toBeInTheDocument();
        });

        it('sollte Items ohne meaningMnemonic korrekt rendern', () => {
            const radicalWithoutMnemonic: CombinedRadical = {
                ...mockRadical,
                meaningMnemonic: undefined,
            };

            render(<CombinedItemCard item={radicalWithoutMnemonic} />);

            expect(screen.getByText('Ground')).toBeInTheDocument();
            expect(screen.queryByText(/💡/)).not.toBeInTheDocument();
        });

        it('sollte Items ohne existingSynonyms korrekt rendern', () => {
            const itemWithoutSynonyms: CombinedVocabulary = {
                ...mockVocabulary,
                existingSynonyms: [],
            };

            render(<CombinedItemCard item={itemWithoutSynonyms} />);

            expect(screen.getByText('Keine Synonyme')).toBeInTheDocument();
        });

        it('sollte unterschiedliche Level korrekt anzeigen', () => {
            const level5Item = { ...mockRadical, level: 5 };
            render(<CombinedItemCard item={level5Item} />);

            expect(screen.getByText('Level 5')).toBeInTheDocument();
        });
    });

    describe('Type Badge Rendering', () => {
        it('sollte alle drei Type Badges korrekt rendern', () => {
            const { rerender } = render(<CombinedItemCard item={mockRadical} />);
            expect(screen.getByTestId('type-badge-radical')).toHaveTextContent('R');

            rerender(<CombinedItemCard item={mockKanji} />);
            expect(screen.getByTestId('type-badge-kanji')).toHaveTextContent('K');

            rerender(<CombinedItemCard item={mockVocabulary} />);
            expect(screen.getByTestId('type-badge-vocabulary')).toHaveTextContent('V');
        });
    });
});
