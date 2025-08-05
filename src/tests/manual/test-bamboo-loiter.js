import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testSpecificWords() {
    const apiKey = process.env.DEEPL_API_KEY;
    const isProTier = process.env.DEEPL_PRO === "true";

    console.log('🔑 API Key:', apiKey ? `${apiKey.slice(0, 8)}...` : 'NOT SET');
    console.log('🏆 Pro Tier:', isProTier);

    if (!apiKey) {
        console.log('❌ No API key found in environment variables');
        return;
    }

    try {
        console.log('\n🧪 Testing problematic words...');

        const baseUrl = isProTier
            ? "https://api.deepl.com/v2/translate"
            : "https://api-free.deepl.com/v2/translate";

        const wordsToTest = ["Bamboo", "Loiter", "bamboo", "loiter", "Ground", "Water", "Fire"];

        for (const word of wordsToTest) {
            try {
                console.log(`\n🔍 Testing: "${word}"`);
                console.log(`   📤 Sending to API: "${word.toLowerCase()}"`);

                const response = await axios.post(baseUrl, {
                    text: [word.toLowerCase()], // Explicitly send lowercase!
                    target_lang: "DE",
                    source_lang: "EN"
                }, {
                    headers: {
                        "Authorization": `DeepL-Auth-Key ${apiKey}`,
                        "Content-Type": "application/json"
                    }
                });

                const result = response.data.translations[0].text;
                console.log(`   ✅ "${word}" → "${result}"`);
                console.log(`   🔍 Same as input: ${word === result ? '❌ YES' : '✅ NO'}`);

                // Wait 1 second between requests
                await new Promise(resolve => setTimeout(resolve, 1100));
            } catch (error) {
                console.log(`   ❌ Error translating "${word}":`, error.message);
            }
        }

        // Test some control words that should translate properly
        console.log('\n🧪 Testing control words...');
        const controlWords = ["ground", "water", "fire", "tree", "person"];

        for (const word of controlWords) {
            try {
                console.log(`\n🔍 Control: "${word}"`);

                const response = await axios.post(baseUrl, {
                    text: [word],
                    target_lang: "DE",
                    source_lang: "EN"
                }, {
                    headers: {
                        "Authorization": `DeepL-Auth-Key ${apiKey}`,
                        "Content-Type": "application/json"
                    }
                });

                const result = response.data.translations[0].text;
                console.log(`   ✅ "${word}" → "${result}"`);

                // Wait 1 second between requests
                await new Promise(resolve => setTimeout(resolve, 1100));
            } catch (error) {
                console.log(`   ❌ Error translating "${word}":`, error.message);
            }
        }

    } catch (error) {
        console.error('❌ General error:', error.message);
    }
}

testSpecificWords();
