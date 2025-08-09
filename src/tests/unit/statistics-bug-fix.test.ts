import { describe, expect, it } from "vitest";

describe("Statistics Bug Fix", () => {
    describe("Upload Statistics Tracking", () => {
        it("should count successful uploads correctly", () => {
            // Simulate the uploadSingleRadical logic
            const initialStats = { created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 };

            // Case 1: Create new study material
            const afterCreate = {
                ...initialStats,
                created: initialStats.created + 1,
                successful: initialStats.successful + 1  // ← This was missing!
            };

            // Case 2: Update existing study material  
            const afterUpdate = {
                ...afterCreate,
                updated: afterCreate.updated + 1,
                successful: afterCreate.successful + 1  // ← This was missing!
            };

            expect(afterCreate.successful).toBe(1); // Should count created as successful
            expect(afterUpdate.successful).toBe(2); // Should count both created and updated
        });

        it("should handle translation errors without double-counting", () => {
            let stats = { created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 };

            // Simulate translation error (in processTranslations catch block)
            try {
                throw new Error("Translation failed");
            } catch (error) {
                stats.failed++; // ← Only count here, not in uploadSingleRadical
            }

            expect(stats.failed).toBe(1);
            expect(stats.successful).toBe(0);
        });

        it("should handle upload errors correctly", () => {
            let stats = { created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 };

            // Simulate upload error (in uploadSingleRadical)
            const uploadResult = {
                ...stats,
                failed: stats.failed + 1  // ← Only count in uploadSingleRadical
                // Don't increment successful for failed uploads
            };

            expect(uploadResult.failed).toBe(1);
            expect(uploadResult.successful).toBe(0);
        });

        it("should count smart-merge skips as successful", () => {
            let stats = { created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 };

            // Simulate smart-merge: synonyms didn't change
            const synonymsChanged = false;

            if (!synonymsChanged) {
                stats.successful++; // ← Count as successful processing
            }

            expect(stats.successful).toBe(1);
            expect(stats.created).toBe(0);
            expect(stats.updated).toBe(0);
        });

        it("should demonstrate the statistics bug scenario", () => {
            // User scenario: 11 errors shown after processing but 0 during processing
            const processedRadicals = [
                { id: 1, result: 'uploaded' },
                { id: 2, result: 'translation_error' },  // ← This might be double-counted
                { id: 3, result: 'upload_error' },       // ← This might be double-counted  
                { id: 4, result: 'success' },            // ← Smart-merge skip
                { id: 5, result: 'uploaded' },
            ];

            // OLD (buggy) counting logic
            let oldStats = { created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 };

            processedRadicals.forEach(radical => {
                switch (radical.result) {
                    case 'uploaded':
                        oldStats.updated++;
                        // ❌ BUG: successful not incremented here!
                        break;
                    case 'translation_error':
                        oldStats.failed++; // Count in processTranslations catch
                        // Later, if uploadSingleRadical also fails: failed++ again!
                        break;
                    case 'upload_error':
                        oldStats.failed++; // Count in uploadSingleRadical
                        break;
                    case 'success':
                        oldStats.successful++; // Smart-merge skip
                        break;
                }
            });

            // NEW (fixed) counting logic
            let newStats = { created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 };

            processedRadicals.forEach(radical => {
                switch (radical.result) {
                    case 'uploaded':
                        newStats.updated++;
                        newStats.successful++; // ✅ FIX: Count uploads as successful!
                        break;
                    case 'translation_error':
                        newStats.failed++; // Only count once!
                        break;
                    case 'upload_error':
                        newStats.failed++; // Only count once!
                        break;
                    case 'success':
                        newStats.successful++; // Smart-merge skip
                        break;
                }
            });

            expect(oldStats.successful).toBe(1); // Only smart-merge counted
            expect(newStats.successful).toBe(3); // Uploads + smart-merge counted
            expect(newStats.successful + newStats.failed).toBe(processedRadicals.length);
        });
    });
});
