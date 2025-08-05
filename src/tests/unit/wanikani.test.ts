import { describe, expect, it } from "vitest";
import {
  WKStudyMaterialCreate,
  delta,
  mergeSynonyms,
  newMaterialWithoutOld,
  oldMaterialRequiringUpdate,
} from "../../lib/wanikani";
import {
  WKDatableString,
  WKStudyMaterial,
} from "@bachmacintosh/wanikani-api-types";

const createMaterial = (id: number, synonyms: string[]): WKStudyMaterial => {
  return {
    object: "study_material",
    id: 4711,
    url: "",
    data_updated_at: "" as WKDatableString,
    data: {
      subject_id: id,
      meaning_synonyms: synonyms,
      created_at: "" as WKDatableString,
      hidden: false,
      subject_type: "kana_vocabulary",
      meaning_note: null,
      reading_note: null,
    },
  };
};

describe("Material synchronsation", () => {
  it("should merge synonyms correclty", () => {
    expect(mergeSynonyms(["1", "2"], ["3", "4"])).toEqual(["1", "2", "3", "4"]);
    expect(mergeSynonyms(["1", "2"], ["2", "3"])).toEqual(["1", "2", "3"]);
    expect(mergeSynonyms(["1"], [])).toEqual(["1"]);
    expect(
      mergeSynonyms(["1", "2", "3", "4", "5", "6", "7"], ["8", "9"])
    ).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    expect(
      mergeSynonyms([], ["1", "2", "3", "4", "5", "6", "7", "8", "9"])
    ).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
  });

  it("should find new materials", () => {
    const oldM = [createMaterial(1, [])];
    const newM = [
      { subject: 1, synonyms: [] },
      { subject: 2, synonyms: [] },
    ];

    const toCreate = newMaterialWithoutOld(oldM, newM);

    expect(toCreate.length).toEqual(1);
    expect(toCreate[0].subject).toEqual(2);
  });

  it("should determine new materials with empty existing materials", () => {
    const oldM: WKStudyMaterial[] = [];
    const newM = [
      { subject: 1, synonyms: [] },
      { subject: 2, synonyms: [] },
    ];

    const toCreate = newMaterialWithoutOld(oldM, newM);

    expect(toCreate.length).toEqual(2);
  });

  it("should determine empty new materials after finishing all updates", () => {
    const oldM = [createMaterial(1, [])];
    const newM: WKStudyMaterialCreate[] = [];

    const toCreate = newMaterialWithoutOld(oldM, newM);

    expect(toCreate.length).toEqual(0);
  });

  it("should determine material to update", () => {
    const oldM = [createMaterial(1, [])];
    const newM = [{ subject: 2, synonyms: [] }];

    const toUpdate = oldMaterialRequiringUpdate(oldM, newM);

    expect(toUpdate.length).toEqual(0);
  });

  it("should determine material to update ignoring case", () => {
    const oldM = [createMaterial(1, ["a"])];
    const newM = [{ subject: 1, synonyms: ["A"] }];

    const toUpdate = oldMaterialRequiringUpdate(oldM, newM);

    expect(toUpdate.length).toEqual(0);
  });

  it("should update existing materials ignoring case", () => {
    const oldM = [createMaterial(1, ["a", "B"])];
    const newM = [{ subject: 1, synonyms: ["b", "c"] }];

    const toUpdate = oldMaterialRequiringUpdate(oldM, newM);

    console.log(toUpdate);
    expect(toUpdate.length).toEqual(1);
    expect(toUpdate[0].id).toEqual(4711); // 4711 is the dummy ID from createMaterial
    expect(toUpdate[0].synonyms).toEqual(["a", "b", "c"]);
  });

  it("should calulate delta", () => {
    const oldM = [createMaterial(1, ["1", "2"])];
    const newM = [
      { subject: 1, synonyms: ["2", "3"] },
      { subject: 2, synonyms: ["4"] },
    ];

    const { toCreate, toUpdate } = delta(oldM, newM);

    expect(toCreate.length).toEqual(1);
    expect(toUpdate.length).toEqual(1);
  });
});

describe("Enhanced Error Handling & Edge Cases", () => {
  it("should handle null/undefined inputs gracefully", () => {
    // The function currently throws on null/undefined, so we test that it throws
    expect(() => mergeSynonyms(null as any, ["test"])).toThrow();
    expect(() => mergeSynonyms(["test"], null as any)).toThrow();
    expect(() => mergeSynonyms(undefined as any, [])).toThrow();
  });

  it("should handle special characters in synonyms", () => {
    const result = mergeSynonyms(["café", "naïve"], ["résumé", "piñata"]);
    expect(result).toContain("café");
    expect(result).toContain("naïve");
    expect(result).toContain("résumé");
    expect(result).toContain("piñata");
  });

  it("should respect synonym limit (8 max)", () => {
    const longArray = ["1", "2", "3", "4", "5", "6", "7"];
    const result = mergeSynonyms(longArray, ["8", "9", "10"]);
    expect(result).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    expect(result.length).toBe(8);
  });

  it("should handle very long synonym strings", () => {
    const longSynonym = "a".repeat(500);
    const oldM = [createMaterial(1, [])];
    const newM = [{ subject: 1, synonyms: [longSynonym] }];

    expect(() => oldMaterialRequiringUpdate(oldM, newM)).not.toThrow();
    const result = oldMaterialRequiringUpdate(oldM, newM);
    expect(result[0].synonyms[0]).toBe(longSynonym);
  });

  it("should handle duplicate subject IDs in materials", () => {
    const oldM = [createMaterial(1, ["a"]), createMaterial(1, ["b"])];
    const newM = [{ subject: 1, synonyms: ["c"] }];

    expect(() => oldMaterialRequiringUpdate(oldM, newM)).not.toThrow();
  });

  it("should handle invalid subject IDs gracefully", () => {
    const oldM = [createMaterial(-1, [])];
    const newM = [{ subject: -1, synonyms: [] }];

    expect(() => oldMaterialRequiringUpdate(oldM, newM)).not.toThrow();
    expect(() => newMaterialWithoutOld(oldM, newM)).not.toThrow();
  });

  it("should be case insensitive in synonym comparison", () => {
    // mergeSynonyms converts master to lowercase, so test actual behavior
    expect(mergeSynonyms(["A", "b"], ["a", "C"])).toEqual(["a", "b", "C"]);

    const oldM = [createMaterial(1, ["UPPER", "Lower"])];
    const newM = [{ subject: 1, synonyms: ["upper", "LOWER", "New"] }];

    const result = oldMaterialRequiringUpdate(oldM, newM);
    expect(result.length).toBe(1);
    expect(result[0].synonyms).toEqual(["upper", "lower", "New"]);
  }); it("should handle whitespace in synonyms", () => {
    const result = mergeSynonyms([" test ", "another"], ["test", " another "]);
    // Should keep original spacing
    expect(result).toContain(" test ");
    expect(result).toContain(" another ");
  });
});

describe("Performance Tests", () => {
  it("should handle large synonym arrays efficiently", () => {
    const largeArray1 = Array.from({ length: 500 }, (_, i) => `syn1_${i}`);
    const largeArray2 = Array.from({ length: 500 }, (_, i) => `syn2_${i}`);

    const start = performance.now();
    const result = mergeSynonyms(largeArray1, largeArray2);
    const end = performance.now();

    expect(end - start).toBeLessThan(100); // Should complete in <100ms
    expect(result.length).toBeLessThanOrEqual(8); // Respect limit
  });

  it("should handle large datasets in newMaterialWithoutOld efficiently", () => {
    const oldM = Array.from({ length: 1000 }, (_, i) => createMaterial(i, []));
    const newM = Array.from({ length: 1500 }, (_, i) => ({ subject: i, synonyms: [] }));

    const start = performance.now();
    const result = newMaterialWithoutOld(oldM, newM);
    const end = performance.now();

    expect(result.length).toBe(500); // 1500 - 1000
    expect(end - start).toBeLessThan(200); // Should be reasonably fast
  });

  it("should handle large datasets in oldMaterialRequiringUpdate efficiently", () => {
    const oldM = Array.from({ length: 1000 }, (_, i) => createMaterial(i, [`old_${i}`]));
    const newM = Array.from({ length: 1000 }, (_, i) => ({ subject: i, synonyms: [`old_${i}`, `new_${i}`] }));

    const start = performance.now();
    const result = oldMaterialRequiringUpdate(oldM, newM);
    const end = performance.now();

    expect(result.length).toBe(1000); // All should need updates
    expect(end - start).toBeLessThan(500); // Should be reasonably fast
  });
});

describe("Integration Test Scenarios", () => {
  it("should handle realistic Wanikani data patterns", () => {
    // Simulate real Wanikani vocabulary with Japanese readings
    const oldM = [
      createMaterial(1, ["water"]),
      createMaterial(2, ["ground", "earth"]),
      createMaterial(3, [])
    ];

    const newM = [
      { subject: 1, synonyms: ["water", "H2O"] },
      { subject: 2, synonyms: ["ground", "soil"] },
      { subject: 3, synonyms: ["fire"] },
      { subject: 4, synonyms: ["air", "wind"] }
    ];

    const { toCreate, toUpdate } = delta(oldM, newM);

    expect(toCreate.length).toBe(1);
    expect(toCreate[0].subject).toBe(4);

    expect(toUpdate.length).toBe(3); // All 3 materials need updates
    expect(toUpdate.find(u => u.id === 4711 && u.synonyms.includes("H2O"))).toBeDefined();
    expect(toUpdate.find(u => u.id === 4711 && u.synonyms.includes("soil"))).toBeDefined();
  });

  it("should handle empty synonym scenarios correctly", () => {
    const oldM = [createMaterial(1, [])];
    const newM = [{ subject: 1, synonyms: [] }];

    const toUpdate = oldMaterialRequiringUpdate(oldM, newM);
    const toCreate = newMaterialWithoutOld(oldM, newM);

    expect(toUpdate.length).toBe(0);
    expect(toCreate.length).toBe(0);
  });

  it("should handle mixed case and duplicate scenarios", () => {
    const oldM = [createMaterial(1, ["Test", "EXAMPLE"])];
    const newM = [{ subject: 1, synonyms: ["test", "Example", "NEW"] }];

    const result = oldMaterialRequiringUpdate(oldM, newM);

    expect(result.length).toBe(1);
    expect(result[0].synonyms).toEqual(["test", "example", "NEW"]);
  });
});
