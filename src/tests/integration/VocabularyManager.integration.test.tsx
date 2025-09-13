import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VocabularyManagerRefactored } from '../../components/VocabularyManagerRefactored';

// Import the actual hooks and functions for integration testing
import { useVocabularyManager } from '../../hooks/useVocabularyManager';
import * as wanikaniVocab from '../../lib/wanikani';

// Mock external dependencies
vi.mock('../../lib/wanikani', () => ({
    getVocabulary: vi.fn(),
    getVocabularyCount: vi.fn(),
    getVocabularyPreview: vi.fn(),
    updateVocabularySynonyms: vi.fn(),
    createVocabularySynonyms: vi.fn()
}));

vi.mock('../../lib/deepl', () => ({
    translateText: vi.fn(),
    detectLanguage: vi.fn()
}));

vi.mock('../../lib/storage', () => ({
    loadFromStorage: vi.fn(),
    saveToStorage: vi.fn()
}));

describe('🚀 VocabularyManager Integration Tests', () => {
    beforeEach(() => {
        // Reset all mocks before each test
        vi.clearAllMocks();

        // Setup default mock responses
        (wanikaniVocab.getVocabularyCount as any).mockResolvedValue(150);
        (wanikaniVocab.getVocabularyPreview as any).mockResolvedValue([
            {
                id: 1,
                characters: '一',
                meanings: [{ meaning: 'one' }],
                readings: [{ reading: 'いち' }],
                parts_of_speech: ['noun'],
                level: 1,
                context_sentences: [
                    { en: 'I have one apple.', ja: '私はりんごを一つ持っています。' }
                ]
            },
            {
                id: 2,
                characters: '二',
                meanings: [{ meaning: 'two' }],
                readings: [{ reading: 'に' }],
                parts_of_speech: ['noun'],
                level: 1,
                context_sentences: [
                    { en: 'I have two books.', ja: '私は本を二冊持っています。' }
                ]
            }
        ]);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('End-to-End User Journey', () => {
        it('should complete full vocabulary workflow from token input to translation processing', async () => {
            render(<VocabularyManagerRefactored />);

            // Step 1: Initial state - no API token
            expect(screen.getByText('🚀 Erste Schritte')).toBeInTheDocument();
            expect(screen.getByText('Geben Sie Ihren WaniKani API-Token ein, um zu beginnen.')).toBeInTheDocument();

            // Step 2: Enter API token
            const apiTokenInput = screen.getByLabelText(/WaniKani API Token/i);
            fireEvent.change(apiTokenInput, { target: { value: 'test-api-token-12345' } });

            // Step 3: Wait for vocabulary count to load
            await waitFor(() => {
                expect(wanikaniVocab.getVocabularyCount).toHaveBeenCalledWith('test-api-token-12345');
            });

            // Step 4: Select level and load vocabulary
            const levelSelector = screen.getByLabelText(/Level auswählen/i);
            fireEvent.change(levelSelector, { target: { value: '1' } });

            // Wait for vocabulary to load
            await waitFor(() => {
                expect(wanikaniVocab.getVocabularyPreview).toHaveBeenCalledWith(
                    'test-api-token-12345',
                    1
                );
            });

            // Step 5: Verify vocabulary preview is displayed
            await waitFor(() => {
                expect(screen.getByText('一')).toBeInTheDocument();
                expect(screen.getByText('二')).toBeInTheDocument();
            });

            // Step 6: Enter DeepL token
            const deeplTokenInput = screen.getByLabelText(/DeepL API Token/i);
            fireEvent.change(deeplTokenInput, { target: { value: 'deepl-test-token' } });

            // Step 7: Start processing
            const processButton = screen.getByRole('button', { name: /Übersetzungen verarbeiten/i });
            fireEvent.click(processButton);

            // Step 8: Verify processing state
            await waitFor(() => {
                expect(screen.getByText(/Verarbeitung läuft/i)).toBeInTheDocument();
            });
        });

        it('should handle vocabulary level switching with proper data updates', async () => {
            render(<VocabularyManagerRefactored />);

            // Setup with API token
            const apiTokenInput = screen.getByLabelText(/WaniKani API Token/i);
            await user.type(apiTokenInput, 'test-token');

            // Wait for initial load
            await waitFor(() => {
                expect(wanikaniVocab.getVocabularyCount).toHaveBeenCalled();
            });

            // Switch to level 2
            (wanikaniVocab.getVocabularyPreview as any).mockResolvedValueOnce([
                {
                    id: 3,
                    characters: '三',
                    meanings: [{ meaning: 'three' }],
                    readings: [{ reading: 'さん' }],
                    parts_of_speech: ['noun'],
                    level: 2
                }
            ]);

            const levelSelector = screen.getByLabelText(/Level auswählen/i);
            await user.selectOptions(levelSelector, '2');

            // Verify new vocabulary is loaded
            await waitFor(() => {
                expect(wanikaniVocab.getVocabularyPreview).toHaveBeenCalledWith('test-token', 2);
            });

            await waitFor(() => {
                expect(screen.getByText('三')).toBeInTheDocument();
            });
        });

        it('should handle error states gracefully throughout the workflow', async () => {
            render(<VocabularyManagerRefactored />);

            // Setup API token
            const apiTokenInput = screen.getByLabelText(/WaniKani API Token/i);
            await user.type(apiTokenInput, 'invalid-token');

            // Mock API error
            (wanikaniVocab.getVocabularyCount as any).mockRejectedValueOnce(
                new Error('Unauthorized: Invalid API token')
            );

            // Wait for error to appear
            await waitFor(() => {
                expect(screen.getByText(/Fehler beim Laden/i)).toBeInTheDocument();
            });
        });
    });

    describe('Component Integration', () => {
        it('should properly integrate VocabularyPreview with VocabularyManager state', async () => {
            render(<VocabularyManagerRefactored />);

            // Setup with valid token
            const apiTokenInput = screen.getByLabelText(/WaniKani API Token/i);
            await user.type(apiTokenInput, 'test-token');

            // Load vocabulary
            const levelSelector = screen.getByLabelText(/Level auswählen/i);
            await user.selectOptions(levelSelector, '1');

            // Wait for vocabulary to load and verify preview components
            await waitFor(() => {
                // Check that vocabulary items are rendered with all their data
                expect(screen.getByText('一')).toBeInTheDocument();
                expect(screen.getByText('one')).toBeInTheDocument();
                expect(screen.getByText('いち')).toBeInTheDocument();
                expect(screen.getByText('noun')).toBeInTheDocument();
            });

            // Verify context sentences are displayed
            expect(screen.getByText('I have one apple.')).toBeInTheDocument();
            expect(screen.getByText('私はりんごを一つ持っています。')).toBeInTheDocument();
        });

        it('should handle processing controls integration with hook state', async () => {
            render(<VocabularyManagerRefactored />);

            // Setup tokens
            const apiTokenInput = screen.getByLabelText(/WaniKani API Token/i);
            await user.type(apiTokenInput, 'test-token');

            const deeplTokenInput = screen.getByLabelText(/DeepL API Token/i);
            await user.type(deeplTokenInput, 'deepl-token');

            // Load vocabulary
            const levelSelector = screen.getByLabelText(/Level auswählen/i);
            await user.selectOptions(levelSelector, '1');

            await waitFor(() => {
                expect(screen.getByText('一')).toBeInTheDocument();
            });

            // Start processing
            const processButton = screen.getByRole('button', { name: /Übersetzungen verarbeiten/i });
            await user.click(processButton);

            // Verify processing state changes
            await waitFor(() => {
                expect(screen.getByText(/Verarbeitung läuft/i)).toBeInTheDocument();
                expect(screen.getByRole('button', { name: /Stoppen/i })).toBeInTheDocument();
            });
        });
    });

    describe('Real Hook Integration', () => {
        it('should test actual useVocabularyManager hook behavior without mocking', async () => {
            // This test uses the real hook to ensure integration works
            const TestComponent = () => {
                const hook = useVocabularyManager();

                return (
                    <div>
                        <span data-testid="vocabulary-count">{hook.vocabularyCount}</span>
                        <span data-testid="loading-state">{hook.isLoadingVocabulary ? 'loading' : 'idle'}</span>
                        <span data-testid="selected-level">{hook.selectedLevel}</span>
                        <button
                            onClick={() => hook.setSelectedLevel(2)}
                            data-testid="change-level"
                        >
                            Change Level
                        </button>
                    </div>
                );
            };

            render(<TestComponent />);

            // Verify initial state
            expect(screen.getByTestId('vocabulary-count')).toHaveTextContent('0');
            expect(screen.getByTestId('loading-state')).toHaveTextContent('idle');
            expect(screen.getByTestId('selected-level')).toHaveTextContent('1');

            // Test level change
            const changeLevelButton = screen.getByTestId('change-level');
            await user.click(changeLevelButton);

            // Verify state update
            expect(screen.getByTestId('selected-level')).toHaveTextContent('2');
        });
    });
});
