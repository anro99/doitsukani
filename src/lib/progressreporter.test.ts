import { describe, expect, it } from "vitest";
import { Progress, progressAtom, readProgressAtom, writeProgressAtom } from "./progressreporter";
import { createStore } from "jotai";

describe("ProgressReporter", () => {
    it("should create progress atom with initial values", () => {
        const store = createStore();
        const initialProgress = store.get(progressAtom);

        expect(initialProgress).toEqual({
            text: "",
            currentStep: 0,
            lastStep: 0
        });
    });

    it("should update progress through writeProgressAtom", () => {
        const store = createStore();
        const newProgress: Progress = {
            text: "Testing",
            currentStep: 50,
            lastStep: 100
        };

        store.set(writeProgressAtom, newProgress);
        const result = store.get(progressAtom);

        expect(result).toEqual(newProgress);
    });

    it("should read progress through readProgressAtom", () => {
        const store = createStore();
        const testProgress: Progress = {
            text: "Reading test",
            currentStep: 25,
            lastStep: 50
        };

        store.set(progressAtom, testProgress);
        const result = store.get(readProgressAtom);

        expect(result).toEqual(testProgress);
    });

    it("should handle multiple progress updates", () => {
        const store = createStore();

        const progress1: Progress = { text: "Step 1", currentStep: 33, lastStep: 100 };
        const progress2: Progress = { text: "Step 2", currentStep: 66, lastStep: 100 };
        const progress3: Progress = { text: "Step 3", currentStep: 100, lastStep: 100 };

        store.set(writeProgressAtom, progress1);
        expect(store.get(progressAtom)).toEqual(progress1);

        store.set(writeProgressAtom, progress2);
        expect(store.get(progressAtom)).toEqual(progress2);

        store.set(writeProgressAtom, progress3);
        expect(store.get(progressAtom)).toEqual(progress3);
    });

    it("should handle edge case values", () => {
        const store = createStore();

        const edgeProgress: Progress = {
            text: "",
            currentStep: 0,
            lastStep: 0
        };

        store.set(writeProgressAtom, edgeProgress);
        const result = store.get(progressAtom);

        expect(result).toEqual(edgeProgress);
    });

    it("should handle negative values", () => {
        const store = createStore();

        const negativeProgress: Progress = {
            text: "Negative test",
            currentStep: -1,
            lastStep: -10
        };

        store.set(writeProgressAtom, negativeProgress);
        const result = store.get(progressAtom);

        expect(result).toEqual(negativeProgress);
    });

    it("should handle large numbers", () => {
        const store = createStore();

        const largeProgress: Progress = {
            text: "Large numbers",
            currentStep: 999999,
            lastStep: 1000000
        };

        store.set(writeProgressAtom, largeProgress);
        const result = store.get(progressAtom);

        expect(result).toEqual(largeProgress);
    });

    it("should handle special characters in text", () => {
        const store = createStore();

        const specialProgress: Progress = {
            text: "水火土 - Special chars!",
            currentStep: 50,
            lastStep: 100
        };

        store.set(writeProgressAtom, specialProgress);
        const result = store.get(progressAtom);

        expect(result.text).toBe("水火土 - Special chars!");
    });

    it("should maintain state independence", () => {
        const store1 = createStore();
        const store2 = createStore();

        const progress1: Progress = { text: "Store 1", currentStep: 25, lastStep: 100 };
        const progress2: Progress = { text: "Store 2", currentStep: 75, lastStep: 100 };

        store1.set(writeProgressAtom, progress1);
        store2.set(writeProgressAtom, progress2);

        expect(store1.get(progressAtom)).toEqual(progress1);
        expect(store2.get(progressAtom)).toEqual(progress2);
    });
});
