import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVocabularyManager } from '../../hooks/useVocabularyManager';
import * as wanikaniLib from '../../lib/wanikani';
import * as storageLib from '../../lib/storage';

// Mock external dependencies
vi.mock('../../lib/wanikani');
vi.mock('../../lib/storage');

const mockedWanikani = vi.mocked(wanikaniLib);
const mockedStorage = vi.mocked(storageLib);

describe('VocabularyManager Hook Integration Tests (Simple)', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Setup storage mocks - empty by default
        mockedStorage.loadWanikaniToken.mockReturnValue('');
        mockedStorage.loadDeepLToken.mockReturnValue('');
        mockedStorage.saveWanikaniToken.mockImplementation(() => { });
        mockedStorage.saveDeepLToken.mockImplementation(() => { });
        mockedStorage.removeToken.mockImplementation(() => { });

        // Setup API mocks
        mockedWanikani.getVocabularyCount.mockResolvedValue(100);
        mockedWanikani.getVocabularyPreview.mockResolvedValue([]);
        mockedWanikani.getVocabularyStudyMaterials.mockResolvedValue([]);
    });

    describe('Hook State Management', () => {
        it('should initialize with correct default state', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Verify initial state
            expect(result.current.vocabularyCount).toBe(0);
            expect(result.current.selectedLevel).toBe(1);
            expect(result.current.vocabularyData).toEqual([]);
            expect(result.current.isLoading).toBe(false);
        });

        it('should load vocabulary count when token is available', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Act - simulate token loading
            act(() => {
                result.current.handleTokenChange('valid-token');
            });

            // Wait for async operations
            await waitFor(() => {
                expect(result.current.vocabularyCount).toBe(100);
            });

            // Verify API was called
            expect(mockedWanikani.getVocabularyCount).toHaveBeenCalledWith('valid-token', 1);
        });

        it('should handle level changes correctly', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Set initial token
            act(() => {
                result.current.handleTokenChange('test-token');
            });

            // Change level
            act(() => {
                result.current.handleLevelChange('2');
            });

            await waitFor(() => {
                expect(result.current.selectedLevel).toBe(2);
            });

            // Verify storage was called
            expect(mockedStorage.saveSelectedLevel).toHaveBeenCalledWith(2);
        });
    });

    describe('Vocabulary Loading Integration', () => {
        it('should load vocabulary preview successfully', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Setup token
            act(() => {
                result.current.handleTokenChange('test-token');
            });

            // Load preview
            act(() => {
                result.current.loadVocabularyPreview();
            });

            await waitFor(() => {
                expect(result.current.vocabularyData).toHaveLength(1);
                expect(result.current.vocabularyData[0].data.characters).toBe('一');
            });

            expect(mockedWanikani.getVocabularyPreview).toHaveBeenCalledWith(
                'test-token',
                1,
                expect.any(Number)
            );
        });

        it('should handle vocabulary loading errors gracefully', async () => {
            // Mock API error
            mockedWanikani.getVocabularyPreview.mockRejectedValue(new Error('API Error'));

            const { result } = renderHook(() => useVocabularyManager());

            act(() => {
                result.current.handleTokenChange('test-token');
            });

            act(() => {
                result.current.loadVocabularyPreview();
            });

            await waitFor(() => {
                expect(result.current.error).toBeTruthy();
                expect(result.current.vocabularyData).toEqual([]);
            });
        });
    });

    describe('Translation Integration', () => {
        it('should integrate translation service correctly', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Setup tokens
            act(() => {
                result.current.handleTokenChange('test-token');
                result.current.handleDeepLTokenChange('deepl-token');
            });

            // Load vocabulary first
            act(() => {
                result.current.loadVocabularyPreview();
            });

            await waitFor(() => {
                expect(result.current.vocabularyData).toHaveLength(1);
            });

            // Start translation process
            act(() => {
                result.current.handleStartTranslation();
            });

            await waitFor(() => {
                expect(result.current.isProcessing).toBe(false);
            });

            // Verify DeepL was called
            expect(mockedDeepL.translateText).toHaveBeenCalled();
        });

        it('should handle translation errors properly', async () => {
            // Mock translation error
            mockedDeepL.translateText.mockRejectedValue(new Error('Translation failed'));

            const { result } = renderHook(() => useVocabularyManager());

            act(() => {
                result.current.handleTokenChange('test-token');
                result.current.handleDeepLTokenChange('deepl-token');
            });

            act(() => {
                result.current.loadVocabularyPreview();
            });

            await waitFor(() => {
                expect(result.current.vocabularyData).toHaveLength(1);
            });

            act(() => {
                result.current.handleStartTranslation();
            });

            await waitFor(() => {
                expect(result.current.error).toBeTruthy();
                expect(result.current.isProcessing).toBe(false);
            });
        });
    });

    describe('Storage Integration', () => {
        it('should save and load configuration correctly', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Change configuration
            act(() => {
                result.current.handleTokenChange('new-token');
                result.current.handleDeepLTokenChange('new-deepl-token');
                result.current.handleLevelChange('3');
            });

            await waitFor(() => {
                expect(result.current.selectedLevel).toBe(3);
            });

            // Verify storage calls
            expect(mockedStorage.saveWanikaniToken).toHaveBeenCalledWith('new-token');
            expect(mockedStorage.saveDeepLToken).toHaveBeenCalledWith('new-deepl-token');
            expect(mockedStorage.saveSelectedLevel).toHaveBeenCalledWith(3);
        });

        it('should restore configuration from storage on initialization', () => {
            // Mock storage with saved data
            mockedStorage.loadWanikaniToken.mockReturnValue('saved-token');
            mockedStorage.loadSelectedLevel.mockReturnValue(5);

            const { result } = renderHook(() => useVocabularyManager());

            // Verify initial state uses stored values
            expect(result.current.selectedLevel).toBe(5);
        });
    });

    describe('Error Handling Integration', () => {
        it('should clear errors when retrying operations', async () => {
            // Start with an error condition
            mockedWanikani.getVocabularyCount.mockRejectedValue(new Error('Initial error'));

            const { result } = renderHook(() => useVocabularyManager());

            act(() => {
                result.current.handleTokenChange('test-token');
            });

            await waitFor(() => {
                expect(result.current.error).toBeTruthy();
            });

            // Fix the mock and retry
            mockedWanikani.getVocabularyCount.mockResolvedValue(100);

            act(() => {
                result.current.handleTokenChange('test-token');
            });

            await waitFor(() => {
                expect(result.current.error).toBe(null);
                expect(result.current.vocabularyCount).toBe(100);
            });
        });

        it('should handle missing tokens gracefully', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Try to start translation without tokens
            act(() => {
                result.current.handleStartTranslation();
            });

            // Should not crash and should indicate missing configuration
            expect(result.current.isProcessing).toBe(false);
            expect(result.current.error).toBeTruthy();
        });
    });

    describe('State Synchronization', () => {
        it('should keep UI state in sync during operations', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Setup
            act(() => {
                result.current.handleTokenChange('test-token');
                result.current.handleDeepLTokenChange('deepl-token');
            });

            // Start loading
            act(() => {
                result.current.loadVocabularyPreview();
            });

            // Should show loading state
            expect(result.current.isLoading).toBe(true);

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
                expect(result.current.vocabularyData).toHaveLength(1);
            });
        });

        it('should handle rapid state changes correctly', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Rapid changes
            act(() => {
                result.current.handleTokenChange('token1');
                result.current.handleTokenChange('token2');
                result.current.handleLevelChange('1');
                result.current.handleLevelChange('2');
                result.current.handleLevelChange('3');
            });

            await waitFor(() => {
                expect(result.current.selectedLevel).toBe(3);
            });

            // Should end up with final values
            expect(mockedStorage.saveSelectedLevel).toHaveBeenLastCalledWith(3);
        });
    });
});
