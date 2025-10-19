/**
 * Migration Test: Verify that the new precise synonym management functions
 * are correctly integrated into the main vocabulary processing pipeline.
 */

import { describe, test, expect, vi } from 'vitest';

describe('🚀 Legacy Removal Test - Clean Precise Functions', () => {
    test('should only have precise functions (no legacy)', async () => {
        // Use importOriginal to get the real functions, not mocks
        const actual = await vi.importActual('../../../src/features/vocabulary/lib/vocabulary-wanikani-upload') as any;

        expect(typeof actual.uploadVocabularyBatch).toBe('function');
        expect(typeof actual.createOrUpdateStudyMaterial).toBe('function');
        expect(typeof actual.processPreciseSynonymManagement).toBe('function');

        // Legacy functions should not exist
        expect(actual.uploadVocabularyBatchPrecise).toBeUndefined();
        expect(actual.createOrUpdateStudyMaterialPrecise).toBeUndefined();
    });
});
