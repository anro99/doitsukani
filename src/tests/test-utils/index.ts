/**
 * Test Utilities Library
 * 
 * Zentrale Export-Datei für alle Test Utilities.
 * 
 * Usage:
 * ```ts
 * import { 
 *   createMockVocabulary, 
 *   setupMockWithDefaults,
 *   assertTextInDocument 
 * } from '@/tests/test-utils';
 * ```
 */

// Mock Factories
export {
    createMockVocabulary,
    createMockVocabularyList,
    createMockKanji,
    createMockKanjiList,
    createMockRadical,
    createMockRadicalList,
    createMockDeepLService,
    createMockWaniKaniClient,
    createMockUploadService,
    createMockProcessingResult,
    createMockStreamingPhases
} from './mock-factories';

// Test Helpers
export {
    renderAndWaitForLoading,
    getByTestIdSafe,
    setupMockWithDefaults,
    setupMockWithSequence,
    setupMockWithError,
    assertMockCalledTimes,
    assertMockCalledWith,
    assertTextInDocument,
    assertTextNotInDocument,
    waitForCondition,
    waitForMockCall,
    clearAllMocks,
    resetAllMocks,
    createErrorMap,
    createProgressCallback
} from './test-helpers';
