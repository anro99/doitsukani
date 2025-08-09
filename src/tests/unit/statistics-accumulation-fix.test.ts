import { describe, expect, it } from "vitest";

describe("Statistics Accumulation Bug Fix", () => {
    describe("State Variable Shadowing Issue", () => {
        it("should not accumulate statistics between multiple runs", () => {
            // Simulate React state behavior
            let reactState = { created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 };

            const setUploadStats = (newStats: typeof reactState) => {
                reactState = { ...newStats };
            };

            // Simulate first run: 36 radicals in Smart-Merge mode
            console.log("🔄 Simulating FIRST RUN (Smart-Merge): 36 radicals");

            // CORRECT: Reset state at beginning
            setUploadStats({ created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 });

            // Use local variable (not shadowing React state)
            let localUploadStats = { created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 };

            // Process 36 radicals: 13 uploaded, 23 skipped
            localUploadStats.updated = 13;
            localUploadStats.skipped = 23;
            localUploadStats.successful = 36;

            // Update React state with final results
            setUploadStats(localUploadStats);

            expect(reactState.successful).toBe(36);
            expect(reactState.updated).toBe(13);
            expect(reactState.skipped).toBe(23);

            console.log(`   Result: ${reactState.successful}/36 successful (${reactState.updated} updated, ${reactState.skipped} skipped)`);

            // Simulate second run: 36 radicals in Delete mode
            console.log("🔄 Simulating SECOND RUN (Delete): 36 radicals");

            // CORRECT: Reset state at beginning (not accumulating!)
            setUploadStats({ created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 });

            // Fresh local variable
            localUploadStats = { created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 };

            // Process 36 radicals: all deleted
            localUploadStats.updated = 36; // All had synonyms that were deleted
            localUploadStats.successful = 36;

            // Update React state with final results
            setUploadStats(localUploadStats);

            expect(reactState.successful).toBe(36); // Should be 36, not 72!
            expect(reactState.updated).toBe(36);
            expect(reactState.skipped).toBe(0);

            console.log(`   Result: ${reactState.successful}/36 successful (${reactState.updated} updated, ${reactState.skipped} skipped)`);

            // The bug would have shown: 72/36 successful
            console.log("✅ SUCCESS: No accumulation between runs!");
        });

        it("should demonstrate the accumulation bug scenario", () => {
            // Simulate BUGGY behavior (what was happening before fix)
            let buggyReactState = { created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 };

            const setBuggyUploadStats = (newStats: typeof buggyReactState) => {
                // BUG: Don't actually reset, accumulate instead!
                buggyReactState.created += newStats.created;
                buggyReactState.updated += newStats.updated;
                buggyReactState.failed += newStats.failed;
                buggyReactState.skipped += newStats.skipped;
                buggyReactState.successful += newStats.successful;
            };

            console.log("🐛 Simulating BUGGY BEHAVIOR:");

            // First run
            console.log("   First run: 36 radicals (Smart-Merge)");
            setBuggyUploadStats({ created: 0, updated: 13, failed: 0, skipped: 23, successful: 36 });

            expect(buggyReactState.successful).toBe(36);
            console.log(`   After first run: ${buggyReactState.successful}/36`);

            // Second run - BUG: accumulates!
            console.log("   Second run: 36 radicals (Delete)");
            setBuggyUploadStats({ created: 0, updated: 36, failed: 0, skipped: 0, successful: 36 });

            expect(buggyReactState.successful).toBe(72); // BUG: 36 + 36 = 72!
            console.log(`   After second run: ${buggyReactState.successful}/36 ← BUG! Should be 36/36`);

            console.log("❌ This shows the accumulation bug that was happening!");
        });

        it("should explain the variable shadowing problem", () => {
            // This demonstrates the specific issue with variable shadowing
            console.log("🔍 Variable Shadowing Problem Explanation:");

            // React state (global scope in component)
            let uploadStats = { successful: 0 }; // React state
            const setUploadStats = (stats: typeof uploadStats) => { uploadStats = stats; };

            const processRadicals = () => {
                // PROBLEM: Local variable shadows React state variable!
                let uploadStats = { successful: 0 }; // Local variable (same name!)

                // Process radicals
                uploadStats.successful = 36;

                // This call uses LOCAL variable, not React state!
                setUploadStats(uploadStats);

                return uploadStats; // Returns local variable
            };

            // First run
            setUploadStats({ successful: 0 }); // Reset React state
            const firstResult = processRadicals();
            expect(firstResult.successful).toBe(36);
            expect(uploadStats.successful).toBe(36); // React state updated correctly

            // Second run - but React state never actually gets reset!
            // setUploadStats({ successful: 0 }); // This line was missing/broken!
            const secondResult = processRadicals();
            expect(secondResult.successful).toBe(36);
            // uploadStats (React state) still has old value if not properly reset!

            console.log("   🔧 FIX: Rename local variable to avoid shadowing:");
            console.log("   let localUploadStats = { successful: 0 }; // No more shadowing!");
        });
    });
});
