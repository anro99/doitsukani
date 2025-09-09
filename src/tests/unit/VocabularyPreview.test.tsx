import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VocabularyPreview } from '../../components/VocabularyPreview';

// Mock interface für Vocabulary
const mockVocabulary = [
    {
        id: 1,
        primaryMeaning: "dog",
        alternativeMeanings: ["puppy", "hound"],
        characters: "犬",
        level: 1,
        currentSynonyms: ["Hund"],
        selected: false,
        translatedSynonyms: [],
        readings: ["いぬ", "けん"],
        partsOfSpeech: ["noun"],
        contextSentences: [
            {
                ja: "犬が走っています。",
                en: "The dog is running."
            }
        ]
    },
    {
        id: 2,
        primaryMeaning: "cat",
        alternativeMeanings: [],
        characters: "猫",
        level: 1,
        currentSynonyms: [],
        selected: false,
        translatedSynonyms: [],
        readings: ["ねこ", "びょう"],
        partsOfSpeech: ["noun"]
    }
];

describe('📚 VocabularyPreview Component Tests', () => {
    describe('Empty State', () => {
        it('should display empty state when no vocabulary provided', () => {
            render(
                <VocabularyPreview
                    previewVocabulary={[]}
                    currentLevelCount={0}
                    currentLevelCountLoading={false}
                />
            );

            expect(screen.getByText('📚 Vocabulary Vorschau')).toBeInTheDocument();
            expect(screen.getByText(/Keine Vocabulary für das ausgewählte Level gefunden/)).toBeInTheDocument();
        });

        it('should show loading state for count', () => {
            render(
                <VocabularyPreview
                    previewVocabulary={[]}
                    currentLevelCount={undefined}
                    currentLevelCountLoading={true}
                />
            );

            expect(screen.getByText('Lade Count...')).toBeInTheDocument();
        });
    });

    describe('Vocabulary Display', () => {
        it('should display vocabulary with all information', () => {
            render(
                <VocabularyPreview
                    previewVocabulary={mockVocabulary}
                    currentLevelCount={10}
                    currentLevelCountLoading={false}
                />
            );

            // Check main vocabulary display
            expect(screen.getByText('犬')).toBeInTheDocument();
            expect(screen.getByText('dog')).toBeInTheDocument();
            expect(screen.getByText('Alt: puppy, hound')).toBeInTheDocument();

            // Check readings (text is split across multiple elements)
            expect(screen.getByText('Readings:')).toBeInTheDocument();
            expect(screen.getByText('いぬ')).toBeInTheDocument();
            expect(screen.getByText('けん')).toBeInTheDocument();

            // Check parts of speech
            expect(screen.getByText('noun')).toBeInTheDocument();

            // Check synonyms
            expect(screen.getByText('Hund')).toBeInTheDocument();

            // Check context sentences
            expect(screen.getByText('犬が走っています。')).toBeInTheDocument();
            expect(screen.getByText('The dog is running.')).toBeInTheDocument();
        });

        it('should handle vocabulary without optional fields', () => {
            const minimalVocabulary = [{
                id: 3,
                primaryMeaning: "water",
                alternativeMeanings: [],
                characters: "水",
                level: 1,
                currentSynonyms: [],
                selected: false,
                translatedSynonyms: []
            }];

            render(
                <VocabularyPreview
                    previewVocabulary={minimalVocabulary}
                    currentLevelCount={1}
                    currentLevelCountLoading={false}
                />
            );

            expect(screen.getByText('水')).toBeInTheDocument();
            expect(screen.getByText('water')).toBeInTheDocument();
            expect(screen.getByText('Keine Synonyme')).toBeInTheDocument();
        });

        it('should respect displayedPreviewCount limit', () => {
            render(
                <VocabularyPreview
                    previewVocabulary={mockVocabulary}
                    currentLevelCount={10}
                    currentLevelCountLoading={false}
                    displayedPreviewCount={1}
                />
            );

            expect(screen.getByText('犬')).toBeInTheDocument();
            expect(screen.queryByText('猫')).not.toBeInTheDocument();
            expect(screen.getByText(/Zeigt 1 von 2 geladenen Vocabulary/)).toBeInTheDocument();
        });
    });

    describe('Load More Functionality', () => {
        it('should show load more button when appropriate', () => {
            const mockOnLoadMore = vi.fn();

            render(
                <VocabularyPreview
                    previewVocabulary={mockVocabulary}
                    currentLevelCount={10}
                    currentLevelCountLoading={false}
                    displayedPreviewCount={1}
                    onLoadMore={mockOnLoadMore}
                />
            );

            const loadMoreButton = screen.getByText(/Weitere 12 Vocabulary anzeigen/);
            expect(loadMoreButton).toBeInTheDocument();
        });

        it('should show statistics correctly', () => {
            render(
                <VocabularyPreview
                    previewVocabulary={mockVocabulary}
                    currentLevelCount={20}
                    currentLevelCountLoading={false}
                    displayedPreviewCount={2}
                />
            );

            expect(screen.getByText('Angezeigt: 2 von 2 geladenen Vocabulary')).toBeInTheDocument();
            expect(screen.getByText('(18 weitere Vocabulary im Level verfügbar)')).toBeInTheDocument();
        });
    });

    describe('Context Sentences', () => {
        it('should show multiple context indicator', () => {
            const vocabularyWithMultipleContext = [{
                ...mockVocabulary[0],
                contextSentences: [
                    { ja: "犬が走っています。", en: "The dog is running." },
                    { ja: "大きい犬です。", en: "It is a big dog." },
                    { ja: "犬を飼っています。", en: "I have a dog." }
                ]
            }];

            render(
                <VocabularyPreview
                    previewVocabulary={vocabularyWithMultipleContext}
                    currentLevelCount={1}
                    currentLevelCountLoading={false}
                />
            );

            expect(screen.getByText('+2 weitere Beispiele')).toBeInTheDocument();
        });
    });
});
