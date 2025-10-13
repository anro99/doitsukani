import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VocabularyManagerRefactored } from '../../features/vocabulary/components/VocabularyManagerRefactored';

// Mock useVocabularyManager hook
vi.mock('../../features/vocabulary/hooks/useVocabularyManager', () => ({
    useVocabularyManager: vi.fn().mockReturnValue({
        // Settings
        selectedLevel: 1,
        synonymMode: 'smart-merge',
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
    })
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
});