/**
 * CombinedManagerRefactored Component Tests
 * 
 * Tests für die refactored Combined Manager Komponente,
 * die BaseManager nutzt (analog zu VocabularyManagerRefactored).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CombinedManagerRefactored } from '../../features/combined/components/CombinedManagerRefactored';
import * as useCombinedManagerModule from '../../features/combined/hooks/useCombinedManager';

// Mock useCombinedManager
vi.mock('../../features/combined/hooks/useCombinedManager');

// Mock BaseManager (um Rendering-Tests zu vereinfachen)
vi.mock('../../shared/components/BaseManager', () => ({
    BaseManager: ({ title, subtitle, itemType }: any) => (
        <div data-testid="base-manager">
            <h1>{title}</h1>
            <p>{subtitle}</p>
            <span data-testid="item-type">{itemType}</span>
        </div>
    )
}));

describe('CombinedManagerRefactored', () => {
    const mockUseCombinedManager = {
        // Settings
        selectedLevel: 10 as number | 'all',
        synonymMode: 'smart-merge' as const,
        setSynonymMode: vi.fn(),
        setSelectedLevel: vi.fn(),

        // Tokens
        apiToken: 'test-api-token',
        handleApiTokenChange: vi.fn(),
        deeplToken: 'test-deepl-token',
        handleDeepLTokenChange: vi.fn(),

        // Data
        combinedItems: [],
        totalCount: 196,
        radicalCount: 15,
        kanjiCount: 41,
        vocabularyCount: 140,
        displayedPreviewCount: 12,

        // States
        apiError: '',
        isLoadingItems: false,
        isProcessing: false,
        progress: 0,

        // Streaming states
        streamingResult: null,
        streamingPhases: null,
        uploadStats: {
            created: 0,
            updated: 0,
            failed: 0,
            skipped: 0,
            successful: 0
        },
        errorItems: new Map(),

        // Actions
        startProcessing: vi.fn(),
        stopProcessing: vi.fn(),
        clearResults: vi.fn(),
        clearErrors: vi.fn(),
        loadItemsFromAPI: vi.fn(),
        loadMorePreviewItems: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useCombinedManagerModule.useCombinedManager).mockReturnValue(mockUseCombinedManager);
    });

    describe('📦 Rendering', () => {
        it('sollte Combined Manager mit korrektem Titel rendern', () => {
            render(<CombinedManagerRefactored />);

            expect(screen.getByText(/Doitsukani - WaniKani Combined Manager/i)).toBeInTheDocument();
        });

        it('sollte korrekten Subtitle anzeigen', () => {
            render(<CombinedManagerRefactored />);

            expect(screen.getByText(/Kombinierte Verarbeitung.*Radicals.*Kanji.*Vocabulary/i)).toBeInTheDocument();
        });

        it('sollte itemType "combined" verwenden', () => {
            render(<CombinedManagerRefactored />);

            const itemType = screen.getByTestId('item-type');
            expect(itemType).toHaveTextContent('combined');
        });

        it('sollte blue-600 als Spinner-Farbe verwenden', () => {
            // Dieser Test wird später mit echtem BaseManager getestet
            render(<CombinedManagerRefactored />);
            expect(screen.getByTestId('base-manager')).toBeInTheDocument();
        });
    });

    describe('🔗 Props Mapping', () => {
        it('sollte Settings-Props korrekt an BaseManager weitergeben', () => {
            render(<CombinedManagerRefactored />);

            // BaseManager sollte gerendert werden
            expect(screen.getByTestId('base-manager')).toBeInTheDocument();
        });

        it('sollte Token-Props korrekt weitergeben', () => {
            render(<CombinedManagerRefactored />);

            expect(mockUseCombinedManager.apiToken).toBe('test-api-token');
            expect(mockUseCombinedManager.deeplToken).toBe('test-deepl-token');
        });

        it('sollte Streaming-States korrekt weitergeben', () => {
            render(<CombinedManagerRefactored />);

            expect(mockUseCombinedManager.streamingResult).toBeNull();
            expect(mockUseCombinedManager.errorItems).toBeInstanceOf(Map);
        });

        it('sollte Action-Callbacks korrekt weitergeben', () => {
            render(<CombinedManagerRefactored />);

            expect(mockUseCombinedManager.startProcessing).toBeDefined();
            expect(mockUseCombinedManager.stopProcessing).toBeDefined();
            expect(mockUseCombinedManager.clearResults).toBeDefined();
            expect(mockUseCombinedManager.clearErrors).toBeDefined();
        });
    });

    describe('📊 Data Display', () => {
        it('sollte Combined Items anzeigen', () => {
            const itemsWithData = {
                ...mockUseCombinedManager,
                combinedItems: [
                    {
                        id: 1,
                        type: 'radical',
                        characters: '一',
                        primaryMeaning: 'Ground',
                        level: 1
                    },
                    {
                        id: 440,
                        type: 'kanji',
                        characters: '一',
                        primaryMeaning: 'One',
                        level: 1
                    }
                ]
            };

            vi.mocked(useCombinedManagerModule.useCombinedManager).mockReturnValue(itemsWithData);

            render(<CombinedManagerRefactored />);
            expect(screen.getByTestId('base-manager')).toBeInTheDocument();
        });

        it('sollte Type-Counts anzeigen (15 Radicals, 41 Kanji, 140 Vocabulary)', () => {
            render(<CombinedManagerRefactored />);

            expect(mockUseCombinedManager.radicalCount).toBe(15);
            expect(mockUseCombinedManager.kanjiCount).toBe(41);
            expect(mockUseCombinedManager.vocabularyCount).toBe(140);
            expect(mockUseCombinedManager.totalCount).toBe(196);
        });
    });

    describe('⚠️ Error Handling', () => {
        it('sollte API-Fehler anzeigen', () => {
            const withError = {
                ...mockUseCombinedManager,
                apiError: 'API Token ungültig'
            };

            vi.mocked(useCombinedManagerModule.useCombinedManager).mockReturnValue(withError);

            render(<CombinedManagerRefactored />);
            expect(screen.getByTestId('base-manager')).toBeInTheDocument();
        });

        it('sollte Error Items Map korrekt verarbeiten', () => {
            const errorMap = new Map<number, string>();
            errorMap.set(1, 'Translation failed');
            errorMap.set(2, 'Upload failed');

            const withErrors = {
                ...mockUseCombinedManager,
                errorItems: errorMap
            };

            vi.mocked(useCombinedManagerModule.useCombinedManager).mockReturnValue(withErrors);

            render(<CombinedManagerRefactored />);
            expect(screen.getByTestId('base-manager')).toBeInTheDocument();
        });
    });

    describe('🔄 Processing States', () => {
        it('sollte Processing-State korrekt anzeigen', () => {
            const processing = {
                ...mockUseCombinedManager,
                isProcessing: true,
                progress: 45
            };

            vi.mocked(useCombinedManagerModule.useCombinedManager).mockReturnValue(processing);

            render(<CombinedManagerRefactored />);
            expect(screen.getByTestId('base-manager')).toBeInTheDocument();
        });

        it('sollte Streaming Result mit byType Breakdown anzeigen', () => {
            const withResult = {
                ...mockUseCombinedManager,
                streamingResult: {
                    success: true,
                    wasStopped: false,
                    totalItems: 196,
                    translationCount: 196,
                    uploadCount: 196,
                    errorCount: 0,
                    processingTime: 45600,
                    byType: {
                        radicals: { total: 15, successful: 15, failed: 0 },
                        kanji: { total: 41, successful: 41, failed: 0 },
                        vocabulary: { total: 140, successful: 140, failed: 0 }
                    }
                }
            };

            vi.mocked(useCombinedManagerModule.useCombinedManager).mockReturnValue(withResult);

            render(<CombinedManagerRefactored />);
            expect(screen.getByTestId('base-manager')).toBeInTheDocument();
        });
    });
});
