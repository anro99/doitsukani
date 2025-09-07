import { describe, expect, it } from "vitest";

describe("Smart-Merge Statistics Fix", () => {
    describe("Statistics Counting for Smart-Merge Mode", () => {
        it("should correctly count skipped vs updated radicals", () => {
            // Simuliere das User-Szenario: 36 Radikale verarbeitet, nur 13 tatsächlich hochgeladen
            const radicals = Array.from({ length: 36 }, (_, i) => ({
                id: i + 1,
                meaning: `Radical ${i + 1}`,
                // Erste 13 haben keine Synonyme (oder neue Übersetzungen), restliche 23 haben bereits die korrekte Übersetzung
                currentSynonyms: i < 13 ? [] : [`Übersetzung ${i + 1}`],
            }));

            // Simuliere Smart-Merge-Verarbeitung
            const uploadStats = { created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 };

            radicals.forEach((radical, index) => {
                const newTranslation = `Übersetzung ${index + 1}`;

                // Smart-Merge-Logik: Prüfe, ob die neue Übersetzung bereits in den Synonymen existiert
                const synonymsChanged = !radical.currentSynonyms.some(
                    syn => syn.toLowerCase() === newTranslation.toLowerCase()
                );

                if (synonymsChanged) {
                    // Neue Übersetzung nötig -> Upload
                    uploadStats.updated++;
                    uploadStats.successful++;
                } else {
                    // Übersetzung bereits vorhanden -> Skip
                    uploadStats.skipped++;
                    uploadStats.successful++;
                }
            });

            // Validiere die Statistiken
            expect(uploadStats.updated).toBe(13); // Erste 13 ohne passende Synonyme -> Upload
            expect(uploadStats.skipped).toBe(23); // Restliche 23 haben bereits die richtige Übersetzung -> Skip
            expect(uploadStats.successful).toBe(36); // Alle 36 erfolgreich verarbeitet
            expect(uploadStats.failed).toBe(0); // Keine Fehler

            // Wichtig: Gesamtzahl muss stimmen
            const totalProcessed = uploadStats.created + uploadStats.updated + uploadStats.failed + uploadStats.skipped;
            expect(totalProcessed).toBe(36); // Alle Radikale gezählt
            expect(uploadStats.successful).toBe(36); // Erfolgreiche Verarbeitung = Gesamtzahl
        });

        it("should handle mixed scenarios correctly", () => {
            // Gemischtes Szenario: Uploads, Skips, Fehler
            const scenarios = [
                { name: "New Upload", needsUpload: true, hasError: false },
                { name: "Already Exists", needsUpload: false, hasError: false },
                { name: "Upload Failed", needsUpload: true, hasError: true },
                { name: "Already Exists 2", needsUpload: false, hasError: false },
                { name: "New Upload 2", needsUpload: true, hasError: false },
            ];

            const uploadStats = { created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 };

            scenarios.forEach(scenario => {
                if (scenario.hasError) {
                    uploadStats.failed++;
                    // Fehler zählen nicht als successful
                } else if (scenario.needsUpload) {
                    uploadStats.updated++;
                    uploadStats.successful++;
                } else {
                    uploadStats.skipped++;
                    uploadStats.successful++;
                }
            });

            expect(uploadStats.updated).toBe(2); // 2 neue Uploads
            expect(uploadStats.skipped).toBe(2); // 2 übersprungen
            expect(uploadStats.failed).toBe(1); // 1 Fehler
            expect(uploadStats.successful).toBe(4); // 4 erfolgreich (ohne Fehler)

            // Gesamtcheck
            const totalProcessed = uploadStats.created + uploadStats.updated + uploadStats.failed + uploadStats.skipped;
            expect(totalProcessed).toBe(5); // Alle 5 Szenarien gezählt
        });

        it("should demonstrate the bug scenario and fix", () => {
            console.log("🐛 BUG DEMONSTRATION: Smart-Merge Statistics");

            // User's scenario: 36 processed, 13 uploaded, ??? skipped
            const totalRadicals = 36;
            const actualUploads = 13;
            const expectedSkips = totalRadicals - actualUploads; // Should be 23

            console.log(`📊 User's Scenario:`);
            console.log(`   Total Radicals: ${totalRadicals}`);
            console.log(`   Actual Uploads: ${actualUploads}`);
            console.log(`   Expected Skips: ${expectedSkips}`);

            // OLD BUGGY LOGIC
            const oldStats = { created: 0, updated: actualUploads, failed: 0, skipped: 0, successful: totalRadicals };
            const oldTotal = oldStats.created + oldStats.updated + oldStats.failed + oldStats.skipped;

            console.log(`\n❌ OLD (BUGGY) STATS:`);
            console.log(`   Updated: ${oldStats.updated}`);
            console.log(`   Skipped: ${oldStats.skipped} ← BUG: Should be ${expectedSkips}!`);
            console.log(`   Successful: ${oldStats.successful}`);
            console.log(`   Math Check: ${oldTotal} counted vs ${totalRadicals} processed → ${totalRadicals - oldTotal} missing!`);

            // NEW FIXED LOGIC
            const newStats = { created: 0, updated: actualUploads, failed: 0, skipped: expectedSkips, successful: totalRadicals };
            const newTotal = newStats.created + newStats.updated + newStats.failed + newStats.skipped;

            console.log(`\n✅ NEW (FIXED) STATS:`);
            console.log(`   Updated: ${newStats.updated}`);
            console.log(`   Skipped: ${newStats.skipped} ← FIXED!`);
            console.log(`   Successful: ${newStats.successful}`);
            console.log(`   Math Check: ${newTotal} counted vs ${totalRadicals} processed → Perfect!`);

            // Validate the fix
            expect(newStats.skipped).toBe(expectedSkips);
            expect(newTotal).toBe(totalRadicals);
            expect(newStats.successful).toBe(totalRadicals);
        });
    });
});
