import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VocabularyManagerRefactored } from '../../components/VocabularyManagerRefactored';

// Mock useVocabularyManager hook
vi.mock('../../hooks/useVocabularyManager', () => ({
    useVocabularyManager: vi.fn(() => ({
        // Settings
        selectedLevel: 1,
        synonymMode: 'smart-merge' as const,
        setSynonymMode: vi.fn(),
        setSelectedLevel: vi.fn(),

        // Tokens  
        apiToken: '',
        handleApiTokenChange: vi.fn(),
        deeplToken: '',
        handleDeepLTokenChange: vi.fn(),

        // Data
        filteredVocabulary: [],
        vocabularyCount: 0,
        displayedPreviewCount: 12,

        // States
        apiError: '',
        isLoadingVocabulary: false,
        isProcessing: false,
        progress: 0,
        translationStatus: '',
        uploadStatus: '',
        uploadStats: {
            created: 0,
            updated: 0,
            failed: 0,
            skipped: 0,
            successful: 0
        },

        // Actions
        processTranslations: vi.fn(),
        stopProcessing: vi.fn(),
        loadMorePreviewVocabulary: vi.fn()
    }))
}));

describe('📚 VocabularyManagerRefactored Component Tests', () => {
    describe('Initial State', () => {
        it('should render the main title and description', () => {
            render(<VocabularyManagerRefactored />);

            expect(screen.getByText('Doitsukani - WaniKani Vocabulary Synonyme Manager')).toBeInTheDocument();
            expect(screen.getByText('Automatische deutsche Übersetzungen für WaniKani Vocabulary mit DeepL')).toBeInTheDocument();
        });

        it('should show help text when no API token is provided', () => {
            render(<VocabularyManagerRefactored />);

            expect(screen.getByText('🚀 Erste Schritte')).toBeInTheDocument();
            expect(screen.getByText('Geben Sie Ihren WaniKani API-Token ein, um zu beginnen.')).toBeInTheDocument();
        });
    });

    describe('With API Token', () => {
        beforeEach(() => {
            // Reset mock to provide API token  
            const mockHook = vi.mocked(require('../../hooks/useVocabularyManager'));
            mockHook.useVocabularyManager.mockReturnValue({
                // Settings
                selectedLevel: 1,
                synonymMode: 'smart-merge' as const,
                setSynonymMode: vi.fn(),
                setSelectedLevel: vi.fn(),

                // Tokens  
                apiToken: 'test-token',
                handleApiTokenChange: vi.fn(),
                deeplToken: 'deepl-token',
                handleDeepLTokenChange: vi.fn(),

                // Data
                filteredVocabulary: [
                    {
                        id: 1,
                        primaryMeaning: "dog",
                        alternativeMeanings: [],
                        characters: "犬",
                        level: 1,
                        currentSynonyms: ["Hund"],
                        selected: false,
                        translatedSynonyms: [],
                        readings: ["いぬ"]
                    }
                ],
                vocabularyCount: 10,
                displayedPreviewCount: 12,

                // States
                apiError: '',
                isLoadingVocabulary: false,
                isProcessing: false,
                progress: 0,
                translationStatus: '',
                uploadStatus: '',
                uploadStats: {
                    created: 0,
                    updated: 0,
                    failed: 0,
                    skipped: 0,
                    successful: 0
                },

                // Actions
                processTranslations: vi.fn(),
                stopProcessing: vi.fn(),
                loadMorePreviewVocabulary: vi.fn()
            });
        });

        it('should show vocabulary preview when data is available', () => {
            render(<VocabularyManagerRefactored />);

            expect(screen.getByText('Vocabulary Vorschau - Level 1')).toBeInTheDocument();
        });

        it('should show processing controls when vocabulary is available', () => {
            render(<VocabularyManagerRefactored />);

            expect(screen.getByText('🚀 Verarbeitung starten')).toBeInTheDocument();
        });
    });

    describe('Loading State', () => {
        beforeEach(() => {
            const mockHook = vi.mocked(require('../../hooks/useVocabularyManager'));
            mockHook.useVocabularyManager.mockReturnValue({
                // Settings
                selectedLevel: 1,
                synonymMode: 'smart-merge' as const,
                setSynonymMode: vi.fn(),
                setSelectedLevel: vi.fn(),

                // Tokens  
                apiToken: 'test-token',
                handleApiTokenChange: vi.fn(),
                deeplToken: '',
                handleDeepLTokenChange: vi.fn(),

                // Data
                filteredVocabulary: [],
                vocabularyCount: 0,
                displayedPreviewCount: 12,

                // States
                apiError: '',
                isLoadingVocabulary: true,
                isProcessing: false,
                progress: 0,
                translationStatus: '',
                uploadStatus: '',
                uploadStats: {
                    created: 0,
                    updated: 0,
                    failed: 0,
                    skipped: 0,
                    successful: 0
                },

                // Actions
                processTranslations: vi.fn(),
                stopProcessing: vi.fn(),
                loadMorePreviewVocabulary: vi.fn()
            });
        });

        it('should show loading state when vocabulary is being loaded', () => {
            render(<VocabularyManagerRefactored />);

            expect(screen.getByText('Lade Vocabulary von WaniKani...')).toBeInTheDocument();
        });
    });
});
