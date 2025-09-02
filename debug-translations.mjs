// Debug script to test the new translation logic with Primary + Alternative meanings

// Mock Kanji with Primary and Alternative meanings
const mockKanjiWithAlternatives = {
    id: 440,
    primaryMeaning: "ground",
    alternativeMeanings: ["earth", "soil"],
    characters: "土",
    level: 1,
    currentSynonyms: ["Erde"], // Already has one German synonym
    selected: true,
    translatedSynonyms: [],
    meaningMnemonic: "The ground is made of earth and soil"
};

const mockKanjiWithoutAlternatives = {
    id: 441,
    primaryMeaning: "sun",
    alternativeMeanings: [],
    characters: "日",
    level: 1,
    currentSynonyms: [],
    selected: true,
    translatedSynonyms: [],
    meaningMnemonic: "The sun shines bright"
};

const mockKanjiWithManyAlternatives = {
    id: 442,
    primaryMeaning: "water",
    alternativeMeanings: ["liquid", "fluid", "aqua", "H2O", "hydro", "wet stuff", "clear liquid", "drinkable"],
    characters: "水",
    level: 1,
    currentSynonyms: ["Wasser", "Flüssigkeit", "Aqua", "H2O", "Hydro"], // 5 existing synonyms
    selected: true,
    translatedSynonyms: [],
    meaningMnemonic: "Water is essential for life"
};

// Edge case: Testing limit enforcement with priority
const mockKanjiWithLimitTest = {
    id: 443,
    primaryMeaning: "extreme",
    alternativeMeanings: ["very", "super", "ultra", "max", "intense", "high", "peak", "ultimate"],
    characters: "極",
    level: 1,
    currentSynonyms: ["extrem", "sehr"], // 2 existing synonyms, space for 6 more
    selected: true,
    translatedSynonyms: [],
    meaningMnemonic: "Extreme situations require extreme measures"
};

const MAX_SYNONYMS_WANIKANI = 8; // WaniKani API limit

// Mock translation function (simulates DeepL)
const mockTranslate = (meaning) => {
    const translations = {
        "ground": "Grund",
        "earth": "Erde",
        "soil": "Boden",
        "sun": "Sonne",
        "water": "Wasser",
        "liquid": "Flüssigkeit",
        "fluid": "Flüssigstoff",
        "aqua": "Aqua",
        "H2O": "H2O",
        "hydro": "Hydro",
        "wet stuff": "nasses Zeug",
        "clear liquid": "klare Flüssigkeit",
        "drinkable": "trinkbar",
        "extreme": "extrem",
        "very": "sehr",
        "super": "super",
        "ultra": "ultra",
        "max": "maximal",
        "intense": "intensiv",
        "high": "hoch",
        "peak": "Spitze",
        "ultimate": "ultimativ"
    };
    return translations[meaning] || `${meaning}_DE`;
};

// Mock translation function for all meanings with new structure
const translateAllMeanings = async (kanji) => {
    const translations = { primary: null, alternatives: [] };

    // Translate primary
    try {
        const primaryTranslation = mockTranslate(kanji.primaryMeaning);
        translations.primary = primaryTranslation.trim() || null;
    } catch (error) {
        console.warn(`Primary translation failed for "${kanji.primaryMeaning}":`, error);
    }

    // Translate alternatives
    for (const alternativeMeaning of kanji.alternativeMeanings) {
        try {
            const altTranslation = mockTranslate(alternativeMeaning);
            const cleanedAlt = altTranslation.trim();
            if (cleanedAlt && cleanedAlt.length > 0) {
                translations.alternatives.push(cleanedAlt);
            }
        } catch (error) {
            console.warn(`Alternative translation failed for "${alternativeMeaning}":`, error);
        }
    }

    return translations;
};

// Updated helper function to merge translations with correct order (Primary first)
const mergeTranslationsWithSynonyms = (translations, currentSynonyms, synonymMode) => {
    switch (synonymMode) {
        case 'replace': {
            const allNewTranslations = [];

            // Add primary first
            if (translations.primary) {
                allNewTranslations.push(translations.primary);
            }

            // Add alternatives after primary
            for (const alt of translations.alternatives) {
                if (allNewTranslations.length < MAX_SYNONYMS_WANIKANI) {
                    allNewTranslations.push(alt);
                }
            }

            return allNewTranslations;
        }

        case 'smart-merge': {
            const existing = currentSynonyms || [];
            const merged = [...existing];

            // Add primary translation first (if not duplicate and space available)
            if (translations.primary && merged.length < MAX_SYNONYMS_WANIKANI) {
                const isPrimaryExists = merged.some(syn =>
                    syn.toLowerCase().trim() === translations.primary.toLowerCase().trim()
                );

                if (!isPrimaryExists) {
                    merged.push(translations.primary);
                }
            }

            // Add alternatives after primary (only if space available)
            for (const alt of translations.alternatives) {
                if (merged.length >= MAX_SYNONYMS_WANIKANI) break;

                const isAlreadyExists = merged.some(syn =>
                    syn.toLowerCase().trim() === alt.toLowerCase().trim()
                );

                if (!isAlreadyExists) {
                    merged.push(alt);
                }
            }

            return merged;
        }

        default:
            return currentSynonyms || [];
    }
};// Test function
const testTranslationLogic = async (kanji, mode) => {
    console.log(`\n=== Testing ${kanji.characters} (${kanji.primaryMeaning}) with mode: ${mode} ===`);
    console.log('Input:', {
        primaryMeaning: kanji.primaryMeaning,
        alternativeMeanings: kanji.alternativeMeanings,
        currentSynonyms: kanji.currentSynonyms
    });

    // Translate all meanings
    const allTranslations = await translateAllMeanings(kanji);
    console.log('Translation Result:', {
        primary: allTranslations.primary,
        alternatives: allTranslations.alternatives
    });

    // Merge with existing synonyms
    const finalSynonyms = mergeTranslationsWithSynonyms(
        allTranslations,
        kanji.currentSynonyms,
        mode
    );

    console.log('Final Synonyms:', finalSynonyms);
    console.log(`Count: ${finalSynonyms.length}/${MAX_SYNONYMS_WANIKANI} (within limit: ${finalSynonyms.length <= MAX_SYNONYMS_WANIKANI})`);

    // Show prioritization
    const totalTranslations = (allTranslations.primary ? 1 : 0) + allTranslations.alternatives.length;
    const includedPrimary = allTranslations.primary && finalSynonyms.includes(allTranslations.primary);
    const includedAlternatives = allTranslations.alternatives.filter(alt => finalSynonyms.includes(alt));

    console.log('Prioritization Result:');
    console.log(`  Primary "${allTranslations.primary}" included: ${includedPrimary}`);
    console.log(`  Alternatives included: ${includedAlternatives.length}/${allTranslations.alternatives.length}`);
    console.log(`  ${totalTranslations > finalSynonyms.length ? '⚠️ Some translations dropped due to limit' : '✅ All translations included'}`);

    return finalSynonyms;
};

// Test various scenarios
console.log('🧪 Testing Extended Translation Logic with Primary + Alternative Meanings');
console.log('🎯 Correct Order: Primary FIRST, then Alternatives\n');

// Test 1: Normal case with alternatives
await testTranslationLogic(mockKanjiWithAlternatives, 'smart-merge');

// Test 2: No alternatives
await testTranslationLogic(mockKanjiWithoutAlternatives, 'smart-merge');

// Test 3: Many alternatives (should respect limit, Primary drops last)
await testTranslationLogic(mockKanjiWithManyAlternatives, 'smart-merge');

// Test 4: Replace mode
await testTranslationLogic(mockKanjiWithManyAlternatives, 'replace');

// Test 5: Limit enforcement test (should prioritize alternatives over primary)
await testTranslationLogic(mockKanjiWithLimitTest, 'smart-merge');

// Test 6: Limit enforcement with replace mode
await testTranslationLogic(mockKanjiWithLimitTest, 'replace');

console.log('\n✅ Translation logic testing completed!');
