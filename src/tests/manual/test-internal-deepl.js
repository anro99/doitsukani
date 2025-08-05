import { translateText } from '../../lib/deepl.ts';
import dotenv from 'dotenv';

dotenv.config();

// Set NODE_ENV to 'test' to force direct API URLs instead of proxy URLs
// This allows the manual test to work with the real DeepL API directly
process.env.NODE_ENV = 'test';

async function testInternalFunction() {
    const apiKey = process.env.DEEPL_API_KEY;

    console.log('🧪 Testing with internal translateText function...');

    const testWords = ["Bamboo", "Loiter", "Ground", "Water"];

    for (const word of testWords) {
        try {
            console.log(`\n🔍 Testing: "${word}"`);
            const result = await translateText(apiKey, word, 'DE', false);
            console.log(`   ✅ "${word}" → "${result}"`);
            console.log(`   🔍 Same as input: ${word === result ? '❌ YES' : '✅ NO'}`);

            // Wait between requests
            await new Promise(resolve => setTimeout(resolve, 1100));
        } catch (error) {
            console.log(`   ❌ Error translating "${word}":`, error.message);
        }
    }
}

testInternalFunction().catch(console.error);
