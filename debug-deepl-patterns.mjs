// Debug DeepL translation behavior
// This script can be run with a real DeepL token to test translation patterns

export async function debugDeepLTranslation() {
    console.log('🔍 ANALYZING DeepL Translation Pattern Issues');
    console.log('='.repeat(70));

    // Test cases that demonstrate the "zu/zum" problem
    const problemCases = [
        { input: 'To Insert', expected: 'Einfügen', actual: 'zum Einfügen' },
        { input: 'To Put In', expected: 'Einstecken', actual: 'zum Einstecken' },
        { input: 'To Enter', expected: 'Eingeben', actual: 'zum Eingeben' },
        { input: 'To Add', expected: 'Hinzufügen', actual: 'zum Hinzufügen' },
        { input: 'To Remove', expected: 'Entfernen', actual: 'zum Entfernen' }
    ];

    console.log('🚨 IDENTIFIED PATTERN PROBLEM:');
    console.log('DeepL API translates "To [Verb]" → "zum [Verb]" (infinitive with purpose)');
    console.log('But WaniKani meanings should be: "To [Verb]" → "[Verb]" (simple infinitive)');
    console.log('');

    problemCases.forEach(({ input, expected, actual }) => {
        console.log(`❌ "${input}" → "${actual}" (wrong)`);
        console.log(`✅ "${input}" → "${expected}" (correct)`);
        console.log('');
    });

    console.log('🎯 POSSIBLE SOLUTIONS:');
    console.log('');
    console.log('1. PRE-PROCESSING: Remove "To " prefix before sending to DeepL');
    console.log('   "To Insert" → "Insert" → DeepL → "Einfügen" ✅');
    console.log('');
    console.log('2. POST-PROCESSING: Remove "zum/zu " prefix from DeepL result');
    console.log('   "To Insert" → DeepL → "zum Einfügen" → "Einfügen" ✅');
    console.log('');
    console.log('3. CONTEXT HINT: Add context to DeepL request');
    console.log('   Add context: "dictionary definition, infinitive verb"');
    console.log('');
    console.log('4. HYBRID APPROACH: Combine pre-processing + context');
    console.log('');

    console.log('💡 RECOMMENDATION:');
    console.log('Use PRE-PROCESSING (Solution 1) as it\'s most reliable:');
    console.log('- Remove common prefixes: "To ", "A ", "An ", "The "');
    console.log('- Send clean word to DeepL');
    console.log('- Get clean German translation');
    console.log('');

    // Generate test patterns
    console.log('🧪 TEST PATTERNS TO VALIDATE:');
    const testInputs = [
        'To Insert',
        'Insert',
        'To Put In',
        'Put In',
        'To Enter',
        'Enter',
        'A Book',
        'Book',
        'The House',
        'House'
    ];

    testInputs.forEach(input => {
        const cleaned = cleanMeaningForTranslation(input);
        console.log(`"${input}" → clean: "${cleaned}"`);
    });
}

// Helper function to clean meanings before translation
function cleanMeaningForTranslation(meaning) {
    const cleaned = meaning
        .replace(/^To\s+/i, '')     // Remove "To " prefix
        .replace(/^A\s+/i, '')      // Remove "A " prefix  
        .replace(/^An\s+/i, '')     // Remove "An " prefix
        .replace(/^The\s+/i, '')    // Remove "The " prefix
        .trim();

    return cleaned;
}

// Helper function to post-process DeepL results
function cleanDeepLResult(translation) {
    return translation
        .replace(/^zum\s+/i, '')    // Remove "zum " prefix
        .replace(/^zu\s+/i, '')     // Remove "zu " prefix
        .replace(/^der\s+/i, '')    // Remove "der " prefix
        .replace(/^die\s+/i, '')    // Remove "die " prefix
        .replace(/^das\s+/i, '')    // Remove "das " prefix
        .replace(/^ein\s+/i, '')    // Remove "ein " prefix
        .replace(/^eine\s+/i, '')   // Remove "eine " prefix
        .trim();
}

// Export functions for testing
export { cleanMeaningForTranslation, cleanDeepLResult };

// Run debug analysis
debugDeepLTranslation();
