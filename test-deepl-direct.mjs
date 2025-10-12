// Node.js 18+ has built-in fetch
// Test DeepL API directly with different inputs
const DEEPL_TOKEN = process.env.DEEPL_TOKEN || 'your-token-here';

async function testDeepLTranslation(text, sourceLanguage = 'EN', targetLanguage = 'DE') {
    try {
        const response = await fetch('https://api-free.deepl.com/v2/translate', {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${DEEPL_TOKEN}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                text: text,
                source_lang: sourceLanguage,
                target_lang: targetLanguage
            })
        });

        if (!response.ok) {
            throw new Error(`DeepL API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.translations[0]?.text || 'No translation';
    } catch (error) {
        console.error(`Error translating "${text}":`, error.message);
        return `ERROR: ${error.message}`;
    }
}

async function runTests() {
    console.log('🧪 Testing DeepL API directly...\n');

    // Test cases from the vocabulary issue
    const testCases = [
        'To Insert',
        'To Put In',
        'To Enter',
        'To Add',
        'To Place',
        'To Remove',
        'To Delete',
        'To Create',
        'To Make',
        'To Take',
        // Test without "To"
        'Insert',
        'Put In',
        'Enter',
        'Add',
        'Place',
        'Remove',
        'Delete',
        'Create',
        'Make',
        'Take',
        // Test with article
        'The insertion',
        'The creation',
        'An insertion',
        'A creation'
    ];

    console.log('='.repeat(60));
    console.log('TESTING VERBS WITH "TO"');
    console.log('='.repeat(60));

    for (const testCase of testCases.slice(0, 10)) {
        const result = await testDeepLTranslation(testCase);
        console.log(`"${testCase}" → "${result}"`);
        await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
    }

    console.log('\n' + '='.repeat(60));
    console.log('TESTING VERBS WITHOUT "TO"');
    console.log('='.repeat(60));

    for (const testCase of testCases.slice(10, 20)) {
        const result = await testDeepLTranslation(testCase);
        console.log(`"${testCase}" → "${result}"`);
        await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
    }

    console.log('\n' + '='.repeat(60));
    console.log('TESTING WITH ARTICLES');
    console.log('='.repeat(60));

    for (const testCase of testCases.slice(20)) {
        const result = await testDeepLTranslation(testCase);
        console.log(`"${testCase}" → "${result}"`);
        await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
    }

    console.log('\n🔍 Analysis:');
    console.log('- Compare how "To Insert" vs "Insert" is translated');
    console.log('- Check if DeepL API consistently adds "zum/zu" for "To..." verbs');
    console.log('- DeepL Windows App might use different context or settings');
}

// Run tests
runTests().catch(console.error);

export { testDeepLTranslation };
