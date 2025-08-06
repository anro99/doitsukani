import { describe, expect, it } from "vitest";

describe("Statistics Counting Bug", () => {
    describe("The problem: Missing 'success' status in counting", () => {
        it("should demonstrate the bug where totals don't add up", () => {
            // Realistic scenario: User translates radicals with smart-merge enabled
            const processResults = [
                { status: 'uploaded', radical: { meaning: 'Ground' } },   // New translation uploaded
                { status: 'success', radical: { meaning: 'Tree' } },      // Already correctly translated (smart-merge)
                { status: 'uploaded', radical: { meaning: 'Fire' } },     // New translation uploaded
                { status: 'success', radical: { meaning: 'Water' } },     // Already correctly translated (smart-merge)
                { status: 'success', radical: { meaning: 'Mountain' } },  // Already correctly translated (smart-merge)
            ];

            // OLD (buggy) logic - only counts 'uploaded' and 'skipped'
            const oldSuccessCount = processResults.filter(r => r.status === 'uploaded').length;
            const oldSkippedCount = processResults.filter(r => r.status === 'skipped').length;
            const oldTotal = oldSuccessCount + oldSkippedCount;

            expect(oldSuccessCount).toBe(2); // Only uploaded items
            expect(oldSkippedCount).toBe(0); // No DELETE mode skips
            expect(oldTotal).toBe(2); // Bug: Only 2/5 counted as successful!

            // This is what the user experienced: 2/5 instead of 5/5
            expect(oldTotal).toBeLessThan(processResults.length); // Numbers don't add up!

            // NEW (fixed) logic - counts all successful types
            const uploadedCount = processResults.filter(r => r.status === 'uploaded').length;
            const successCount = processResults.filter(r => r.status === 'success').length;
            const skippedCount = processResults.filter(r => r.status === 'skipped').length;
            const errorCount = processResults.filter(r => r.status === 'error').length;
            const totalSuccessful = uploadedCount + successCount + skippedCount;

            expect(uploadedCount).toBe(2); // New translations
            expect(successCount).toBe(3);  // Already correct (was missing!)
            expect(skippedCount).toBe(0);  // No DELETE mode
            expect(errorCount).toBe(0);    // No errors
            expect(totalSuccessful).toBe(5); // Fix: All 5/5 counted correctly!

            expect(totalSuccessful + errorCount).toBe(processResults.length); // Numbers add up!
        });

        it("should demonstrate different scenarios where 'success' status occurs", () => {
            // Scenario 1: Smart-merge finds no changes needed
            const smartMergeResults = [
                { status: 'uploaded' }, // Had to translate and upload
                { status: 'success' },  // Smart-merge: translation already correct
                { status: 'success' },  // Smart-merge: translation already correct
            ];

            const totalSuccessful = smartMergeResults.filter(r =>
                r.status === 'uploaded' || r.status === 'success' || r.status === 'skipped'
            ).length;

            expect(totalSuccessful).toBe(3); // All should be counted as successful
        });

        it("should generate correct status messages with the fix", () => {
            const mixedResults = [
                { status: 'uploaded' }, // 2 new uploads
                { status: 'uploaded' },
                { status: 'success' },  // 2 already correct
                { status: 'success' },
                { status: 'skipped' },  // 1 skipped (DELETE mode)
                { status: 'error' },    // 1 error
            ];

            const uploadedCount = mixedResults.filter(r => r.status === 'uploaded').length;
            const successCount = mixedResults.filter(r => r.status === 'success').length;
            const skippedCount = mixedResults.filter(r => r.status === 'skipped').length;
            const errorCount = mixedResults.filter(r => r.status === 'error').length;
            const totalSuccessful = uploadedCount + successCount + skippedCount;

            // Build status message like the real code
            const details = [];
            if (uploadedCount > 0) details.push(`${uploadedCount} übersetzt und hochgeladen`);
            if (successCount > 0) details.push(`${successCount} bereits korrekt`);
            if (skippedCount > 0) details.push(`${skippedCount} übersprungen`);
            if (errorCount > 0) details.push(`${errorCount} fehlerhaft`);

            const statusMessage = `✅ Verarbeitung abgeschlossen! ${totalSuccessful}/${mixedResults.length} erfolgreich verarbeitet (${details.join(', ')}).`;

            expect(statusMessage).toBe("✅ Verarbeitung abgeschlossen! 5/6 erfolgreich verarbeitet (2 übersetzt und hochgeladen, 2 bereits korrekt, 1 übersprungen, 1 fehlerhaft).");
            expect(totalSuccessful + errorCount).toBe(mixedResults.length); // Perfect math!
        });
    });

    describe("Real-world scenarios that caused the bug", () => {
        it("should handle scenario where most translations are already correct", () => {
            // User translates 20 radicals, but 15 are already correctly translated
            const results = [
                ...Array(5).fill({ status: 'uploaded' }),  // 5 new translations
                ...Array(15).fill({ status: 'success' }),  // 15 already correct (smart-merge)
            ];

            const uploadedCount = results.filter(r => r.status === 'uploaded').length;
            const successCount = results.filter(r => r.status === 'success').length;
            const totalSuccessful = uploadedCount + successCount;

            expect(uploadedCount).toBe(5);
            expect(successCount).toBe(15);
            expect(totalSuccessful).toBe(20);
            expect(totalSuccessful).toBe(results.length); // All accounted for
        });

        it("should handle DELETE mode mixed with translation results", () => {
            // Mixed scenario: some radicals from translation, some from DELETE mode
            const results = [
                { status: 'uploaded' }, // Translation uploaded
                { status: 'success' },  // Translation already correct
                { status: 'skipped' },  // DELETE mode: no synonyms to delete
                { status: 'uploaded' }, // DELETE mode: synonyms deleted
            ];

            const uploadedCount = results.filter(r => r.status === 'uploaded').length;
            const successCount = results.filter(r => r.status === 'success').length;
            const skippedCount = results.filter(r => r.status === 'skipped').length;
            const totalSuccessful = uploadedCount + successCount + skippedCount;

            expect(totalSuccessful).toBe(4);
            expect(totalSuccessful).toBe(results.length); // Perfect accounting
        });
    });
});
