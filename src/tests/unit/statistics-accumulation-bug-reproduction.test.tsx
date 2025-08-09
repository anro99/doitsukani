import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RadicalsManager } from '../../components/RadicalsManager';

// Mock the external dependencies
vi.mock('../../lib/wanikani', () => ({
    getRadicals: vi.fn(),
    getRadicalStudyMaterials: vi.fn(),
    createRadicalSynonyms: vi.fn(),
    updateRadicalSynonyms: vi.fn(),
}));

vi.mock('../../lib/deepl', () => ({
    translateText: vi.fn(),
}));

vi.mock('../../lib/contextual-translation', () => ({
    extractContextFromMnemonic: vi.fn(),
}));

/**
 * STATISTICS ACCUMULATION BUG REPRODUCTION TEST
 * 
 * This test reproduces the exact bug reported by the user:
 * - Smart-Merge: 36 radicals processed successfully
 * - Delete: 36 radicals processed successfully  
 * - BUG: Shows "72/36 successfully processed" instead of "36/36"
 * 
 * The issue is that React state accumulates between consecutive runs
 * even with the session-based reset mechanism.
 */
describe('Statistics Accumulation Bug - Real World Reproduction', () => {
    let mockGetRadicals: any;
    let mockGetRadicalStudyMaterials: any;
    let mockCreateRadicalSynonyms: any;
    let mockUpdateRadicalSynonyms: any;
    let mockTranslateText: any;
    let mockExtractContextFromMnemonic: any;

    beforeEach(() => {
        // Clear all mocks
        vi.clearAllMocks();

        // Setup localStorage mocks
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: vi.fn(() => null),
                setItem: vi.fn(),
                removeItem: vi.fn(),
            },
            writable: true,
        });

        // Import mocks after clearing
        const wanikaniMock = require('../../lib/wanikani');
        const deeplMock = require('../../lib/deepl');
        const contextMock = require('../../lib/contextual-translation');

        mockGetRadicals = wanikaniMock.getRadicals;
        mockGetRadicalStudyMaterials = wanikaniMock.getRadicalStudyMaterials;
        mockCreateRadicalSynonyms = wanikaniMock.createRadicalSynonyms;
        mockUpdateRadicalSynonyms = wanikaniMock.updateRadicalSynonyms;
        mockTranslateText = deeplMock.translateText;
        mockExtractContextFromMnemonic = contextMock.extractContextFromMnemonic;

        // Setup successful mock responses for a realistic scenario
        mockGetRadicals.mockResolvedValue([
            { id: 1, meaning: 'Ground', level: 1, characters: '一' },
            { id: 2, meaning: 'Person', level: 1, characters: '人' },
            { id: 3, meaning: 'Enter', level: 1, characters: '入' },
        ]);

        mockGetRadicalStudyMaterials.mockResolvedValue([
            { subject_id: 1, meaning_synonyms: ['Boden'] },
            { subject_id: 2, meaning_synonyms: ['Person', 'Mensch'] },
            { subject_id: 3, meaning_synonyms: [] }, // No existing synonyms
        ]);

        mockTranslateText.mockImplementation(async (_token: string, text: string) => {
            const translations: Record<string, string> = {
                'Ground': 'Boden',
                'Person': 'Person',
                'Enter': 'Eingeben'
            };
            return translations[text] || text;
        });

        mockExtractContextFromMnemonic.mockReturnValue(null);
        mockUpdateRadicalSynonyms.mockResolvedValue({ success: true });
        mockCreateRadicalSynonyms.mockResolvedValue({ success: true });

        // Mock timers for timeout control
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('should reproduce the statistics accumulation bug between Smart-Merge and Delete runs', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        render(<RadicalsManager />);

        // Wait for component to load
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...')).toBeInTheDocument();
        });

        // Setup API tokens
        const wkTokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
        const deeplTokenInput = screen.getByPlaceholderText('Geben Sie Ihren DeepL API Token ein...');

        await user.type(wkTokenInput, 'test-wk-token');
        await user.type(deeplTokenInput, 'test-deepl-token');

        // Wait for radicals to load
        await waitFor(() => {
            expect(screen.getByText(/Radicals erfolgreich geladen/)).toBeInTheDocument();
        }, { timeout: 5000 });

        // Select all radicals
        const selectAllCheckbox = screen.getByLabelText('Alle auswählen');
        await user.click(selectAllCheckbox);

        // === PHASE 1: Smart-Merge Run ===
        console.log('🧪 TEST: Starting Smart-Merge phase...');

        // Set to Smart-Merge mode
        const smartMergeRadio = screen.getByLabelText(/Smart-Merge/);
        await user.click(smartMergeRadio);

        // Start processing
        const processButton = screen.getByRole('button', { name: /Synonyme übersetzen und aktualisieren/ });
        await user.click(processButton);

        // Wait for processing to complete
        await waitFor(() => {
            expect(screen.getByText(/Verarbeitung abgeschlossen/)).toBeInTheDocument();
        }, { timeout: 10000 });

        // Capture Smart-Merge stats
        const smartMergeStatsElement = screen.getByText(/erfolgreich verarbeitet/);
        const smartMergeStatsText = smartMergeStatsElement.textContent || '';
        console.log('🧪 TEST: Smart-Merge stats:', smartMergeStatsText);

        // Extract numbers from the stats text (expecting something like "3/3 erfolgreich verarbeitet")
        const smartMergeMatch = smartMergeStatsText.match(/(\d+)\/(\d+)\s+erfolgreich verarbeitet/);
        expect(smartMergeMatch).toBeTruthy();
        const smartMergeProcessed = parseInt(smartMergeMatch![1], 10);
        const smartMergeTotal = parseInt(smartMergeMatch![2], 10);

        console.log(`🧪 TEST: Smart-Merge processed ${smartMergeProcessed}/${smartMergeTotal} radicals`);
        expect(smartMergeProcessed).toBeGreaterThan(0);
        expect(smartMergeTotal).toBeGreaterThan(0);

        // === PHASE 2: Delete Run (The Critical Test) ===
        console.log('🧪 TEST: Starting Delete phase immediately after Smart-Merge...');

        // Switch to Delete mode WITHOUT waiting for the 3-second reset
        // This simulates the user quickly switching modes
        const deleteRadio = screen.getByLabelText(/Alle Synonyme löschen/);
        await user.click(deleteRadio);

        // Start Delete processing immediately
        const deleteButton = screen.getByRole('button', { name: /Synonyme übersetzen und aktualisieren/ });
        await user.click(deleteButton);

        // Wait for Delete processing to complete
        await waitFor(() => {
            // Look for completion message that's different from Smart-Merge
            const completionMessages = screen.getAllByText(/Verarbeitung abgeschlossen/);
            expect(completionMessages.length).toBeGreaterThanOrEqual(1);
        }, { timeout: 10000 });

        // Capture Delete stats - this is where the bug should manifest
        await waitFor(() => {
            const deleteStatsElements = screen.getAllByText(/erfolgreich verarbeitet/);
            const deleteStatsElement = deleteStatsElements[deleteStatsElements.length - 1]; // Get the latest one
            const deleteStatsText = deleteStatsElement.textContent || '';
            console.log('🧪 TEST: Delete stats:', deleteStatsText);

            // Extract numbers from the delete stats
            const deleteMatch = deleteStatsText.match(/(\d+)\/(\d+)\s+erfolgreich verarbeitet/);
            expect(deleteMatch).toBeTruthy();
            const deleteProcessed = parseInt(deleteMatch![1], 10);
            const deleteTotal = parseInt(deleteMatch![2], 10);

            console.log(`🧪 TEST: Delete processed ${deleteProcessed}/${deleteTotal} radicals`);

            // BUG REPRODUCTION CHECK:
            // If the bug exists, deleteProcessed will be smartMergeProcessed + deleteActualProcessed
            // If the bug is fixed, deleteProcessed should equal deleteTotal

            console.log('🧪 TEST: Checking for accumulation bug...');
            console.log(`🧪 TEST: Expected: ${deleteTotal}/${deleteTotal}`);
            console.log(`🧪 TEST: Actual: ${deleteProcessed}/${deleteTotal}`);

            if (deleteProcessed === smartMergeProcessed + deleteTotal) {
                console.log('🚨 BUG REPRODUCED: Statistics are accumulating!');
                console.log(`🚨 Smart-Merge: ${smartMergeProcessed}, Delete: ${deleteTotal}, Shown: ${deleteProcessed}`);

                // This assertion will fail if the bug exists, proving we've reproduced it
                expect(deleteProcessed).toBe(deleteTotal); // Should be equal, not accumulated

            } else if (deleteProcessed === deleteTotal) {
                console.log('✅ BUG FIXED: Statistics are correctly isolated');
                expect(deleteProcessed).toBe(deleteTotal);

            } else {
                console.log(`⚠️ UNEXPECTED: Got ${deleteProcessed}, expected either ${deleteTotal} (fixed) or ${smartMergeProcessed + deleteTotal} (bug)`);
                // Log for debugging
                expect(deleteProcessed).toBe(deleteTotal);
            }
        }, { timeout: 5000 });

        // Fast-forward timers to trigger any pending resets
        vi.advanceTimersByTime(5000);
    }, { timeout: 30000 });

    it('should demonstrate the session timing issue', async () => {
        // This test shows that the 3-second timeout doesn't help if the user
        // starts a new processing run before the timeout completes

        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        render(<RadicalsManager />);

        // Setup tokens and radicals
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...')).toBeInTheDocument();
        });

        const wkTokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
        const deeplTokenInput = screen.getByPlaceholderText('Geben Sie Ihren DeepL API Token ein...');

        await user.type(wkTokenInput, 'test-wk-token');
        await user.type(deeplTokenInput, 'test-deepl-token');

        await waitFor(() => {
            expect(screen.getByText(/Radicals erfolgreich geladen/)).toBeInTheDocument();
        }, { timeout: 5000 });

        const selectAllCheckbox = screen.getByLabelText('Alle auswählen');
        await user.click(selectAllCheckbox);

        // First run
        const smartMergeRadio = screen.getByLabelText(/Smart-Merge/);
        await user.click(smartMergeRadio);

        const processButton = screen.getByRole('button', { name: /Synonyme übersetzen und aktualisieren/ });
        await user.click(processButton);

        await waitFor(() => {
            expect(screen.getByText(/Verarbeitung abgeschlossen/)).toBeInTheDocument();
        }, { timeout: 10000 });

        // Immediately start second run before 3-second timeout
        console.log('🧪 TEST: Starting second run immediately (before 3-second reset)');

        const deleteRadio = screen.getByLabelText(/Alle Synonyme löschen/);
        await user.click(deleteRadio);
        await user.click(processButton);

        // The key insight: React state updates are still pending from the first run
        // when the second run starts, leading to accumulation

        await waitFor(() => {
            const completionMessages = screen.getAllByText(/Verarbeitung abgeschlossen/);
            expect(completionMessages.length).toBeGreaterThanOrEqual(1);
        }, { timeout: 10000 });

        // Advance timers to see what happens with delayed resets
        vi.advanceTimersByTime(5000);

        console.log('🧪 TEST: Session timing test completed');
    }, { timeout: 30000 });
});
