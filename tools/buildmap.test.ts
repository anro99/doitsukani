import { describe, expect, it } from "vitest";
import { buildTranslations } from "./buildmap";

describe("Vocabulary translation", () => {
  it("should translate a vobulary word using the dicionary", () => {
    const vocab = new Map<string, number>();
    vocab.set("陰気", 1);
    vocab.set("訳しにくい", 2);
    const dictionary = new Map<string, string[]>();
    dictionary.set("陰気", ["Schwermut", "Trübsinn", "Düsterheit"]);

    const { translations, untranslated } = buildTranslations(dictionary, vocab);

    expect(translations.get(1)).toEqual([
      "Schwermut",
      "Trübsinn",
      "Düsterheit",
    ]);
    expect(untranslated).toEqual(["訳しにくい"]);
  });

  it("should handle empty vocabulary", () => {
    const vocab = new Map<string, number>();
    const dictionary = new Map<string, string[]>();

    const { translations, untranslated } = buildTranslations(dictionary, vocab);

    expect(translations.size).toBe(0);
    expect(untranslated.length).toBe(0);
  });

  it("should handle empty dictionary", () => {
    const vocab = new Map<string, number>();
    vocab.set("未知", 1);
    const dictionary = new Map<string, string[]>();

    const { translations, untranslated } = buildTranslations(dictionary, vocab);

    expect(translations.size).toBe(0);
    expect(untranslated).toEqual(["未知"]);
  });

  it("should handle vocabulary with no translations", () => {
    const vocab = new Map<string, number>();
    vocab.set("存在しない", 1);
    vocab.set("別の単語", 2);
    const dictionary = new Map<string, string[]>();
    dictionary.set("違う単語", ["different"]);

    const { translations, untranslated } = buildTranslations(dictionary, vocab);

    expect(translations.size).toBe(0);
    expect(untranslated).toEqual(["存在しない", "別の単語"]);
  });

  it("should handle multiple vocabulary items with translations", () => {
    const vocab = new Map<string, number>();
    vocab.set("水", 1);
    vocab.set("火", 2);
    vocab.set("土", 3);
    const dictionary = new Map<string, string[]>();
    dictionary.set("水", ["Wasser"]);
    dictionary.set("火", ["Feuer"]);
    dictionary.set("土", ["Erde", "Boden"]);

    const { translations, untranslated } = buildTranslations(dictionary, vocab);

    expect(translations.get(1)).toEqual(["Wasser"]);
    expect(translations.get(2)).toEqual(["Feuer"]);
    expect(translations.get(3)).toEqual(["Erde", "Boden"]);
    expect(untranslated.length).toBe(0);
  });

  it("should handle duplicate translations gracefully", () => {
    const vocab = new Map<string, number>();
    vocab.set("水", 1);
    const dictionary = new Map<string, string[]>();
    dictionary.set("水", ["Wasser", "Wasser", "H2O"]); // Duplicate "Wasser"

    const { translations, untranslated } = buildTranslations(dictionary, vocab);

    expect(translations.get(1)).toEqual(["Wasser", "Wasser", "H2O"]);
    // Note: The function might need deduplication logic
  });

  it("should handle large datasets efficiently", () => {
    const vocab = new Map<string, number>();
    const dictionary = new Map<string, string[]>();

    // Create large test data
    for (let i = 0; i < 1000; i++) {
      vocab.set(`単語${i}`, i);
      dictionary.set(`単語${i}`, [`Wort${i}`]);
    }

    const start = performance.now();
    const { translations, untranslated } = buildTranslations(dictionary, vocab);
    const end = performance.now();

    expect(translations.size).toBe(1000);
    expect(untranslated.length).toBe(0);
    expect(end - start).toBeLessThan(100); // Should be fast
  });

  it("should preserve translation order", () => {
    const vocab = new Map<string, number>();
    vocab.set("順序", 1);
    const dictionary = new Map<string, string[]>();
    dictionary.set("順序", ["Reihenfolge", "Ordnung", "Sequenz"]);

    const { translations, untranslated } = buildTranslations(dictionary, vocab);

    expect(translations.get(1)).toEqual(["Reihenfolge", "Ordnung", "Sequenz"]);
  });
});
