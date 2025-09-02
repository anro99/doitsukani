// Debug script to check WaniKani meanings structure

// Mock example of WaniKani API response for a Kanji
const mockKanjiResponse = {
    id: 440,
    data: {
        meanings: [
            {
                meaning: "ground",
                primary: true,
                accepted_answer: true
            },
            {
                meaning: "earth",
                primary: false,
                accepted_answer: true
            },
            {
                meaning: "soil",
                primary: false,
                accepted_answer: true
            },
            {
                meaning: "dirt",
                primary: false,
                accepted_answer: false  // This should be filtered out
            }
        ],
        characters: "土",
        level: 1
    }
};

// Test the logic from convertToInternalFormat (corrected version)
function testMeaningsExtraction(kanji) {
    console.log('Original WaniKani data:');
    console.log(JSON.stringify(kanji.data.meanings, null, 2));

    // Get primary meaning (corrected logic)
    const primaryMeaningObj = kanji.data.meanings.find(m => m.primary) || kanji.data.meanings[0];
    const primaryMeaning = primaryMeaningObj?.meaning || 'Unknown';

    // Get alternative meanings (accepted answers excluding the primary meaning)
    const alternativeMeanings = kanji.data.meanings
        .filter(m => m.accepted_answer && m.meaning !== primaryMeaning)
        .map(m => m.meaning);

    console.log('\nExtracted data:');
    console.log('Primary Meaning:', primaryMeaning);
    console.log('Alternative Meanings:', alternativeMeanings);

    return { primaryMeaning, alternativeMeanings };
}

// Test edge case: No primary meaning
const edgeCaseKanji = {
    id: 441,
    data: {
        meanings: [
            {
                meaning: "first",
                primary: false,
                accepted_answer: true
            },
            {
                meaning: "second",
                primary: false,
                accepted_answer: true
            }
        ],
        characters: "例",
        level: 2
    }
};

console.log('=== Testing Normal Case ===');
testMeaningsExtraction(mockKanjiResponse);

console.log('\n=== Testing Edge Case (No Primary) ===');
testMeaningsExtraction(edgeCaseKanji);

// Test another edge case: Empty meanings
const emptyMeaningsKanji = {
    id: 442,
    data: {
        meanings: [],
        characters: "空",
        level: 3
    }
};

console.log('\n=== Testing Edge Case (Empty Meanings) ===');
testMeaningsExtraction(emptyMeaningsKanji);
