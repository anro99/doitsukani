import { describe, expect, it } from "vitest";
import {
    extractContextFromMnemonic
} from "../../lib/contextual-translation";

describe("Contextual Translation", () => {
    describe("extractContextFromMnemonic", () => {
        it("should extract context from WaniKani mnemonic", () => {
            const mnemonic = "There's a cross branching off of this stool. Since it's branching out, we'll just call this the branch radical. I guess the tree this stool was made of is coming back to life.";
            const context = extractContextFromMnemonic(mnemonic, "branch");
            expect(context).toBe("There's a cross branching off of this stool. Since it's branching out, we'll just call this the branch radical. I guess the tree this stool was made of is coming back to life.");
        });

        it("should clean HTML tags from mnemonic", () => {
            const mnemonic = "This is a <radical>branch</radical> from a tree.";
            const context = extractContextFromMnemonic(mnemonic, "branch");
            expect(context).toBe("This is a branch from a tree.");
        });

        it("should limit context length", () => {
            const longMnemonic = "A".repeat(300) + ". Another sentence.";
            const context = extractContextFromMnemonic(longMnemonic, "test");
            expect(context!.length).toBeLessThanOrEqual(200);
        });

        it("should return null for short mnemonics", () => {
            const shortMnemonic = "Short.";
            const context = extractContextFromMnemonic(shortMnemonic, "test");
            expect(context).toBeNull();
        });

        it("should return null for empty inputs", () => {
            expect(extractContextFromMnemonic("", "branch")).toBeNull();
            expect(extractContextFromMnemonic("test", "")).toBeNull();
            expect(extractContextFromMnemonic("", "")).toBeNull();
        });

        it("should handle sentence boundary cutting", () => {
            const mnemonic = "First sentence. ".repeat(20) + "Last sentence.";
            const context = extractContextFromMnemonic(mnemonic, "test");
            expect(context).toMatch(/\.$/); // Should end with a period
            expect(context!.length).toBeLessThanOrEqual(200);
        });
    });

    describe("Integration with mock data", () => {
        it("should process branch radical correctly", () => {
            const mockRadical = {
                meanings: [{ meaning: "Branch", primary: true }],
                meaning_mnemonic: "There's a cross branching off of this stool. Since it's branching out, we'll just call this the branch radical. I guess the tree this stool was made of is coming back to life."
            };

            const context = extractContextFromMnemonic(
                mockRadical.meaning_mnemonic,
                mockRadical.meanings[0].meaning
            );

            expect(context).toBe("There's a cross branching off of this stool. Since it's branching out, we'll just call this the branch radical. I guess the tree this stool was made of is coming back to life.");
        });

        it("should handle radicals without context gracefully", () => {
            const mockRadical = {
                meanings: [{ meaning: "Unknown", primary: true }],
                meaning_mnemonic: "This is a completely unknown radical with no keywords."
            };

            const context = extractContextFromMnemonic(
                mockRadical.meaning_mnemonic,
                mockRadical.meanings[0].meaning
            );

            expect(context).toBe("This is a completely unknown radical with no keywords.");
        });

        it("should reject very short mnemonics", () => {
            const mockRadical = {
                meanings: [{ meaning: "Test", primary: true }],
                meaning_mnemonic: "Short."
            };

            const context = extractContextFromMnemonic(
                mockRadical.meaning_mnemonic,
                mockRadical.meanings[0].meaning
            );

            expect(context).toBeNull();
        });
    });
});
