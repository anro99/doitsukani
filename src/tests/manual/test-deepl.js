import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

async function testDeepL() {
    const apiKey = process.env.DEEPL_API_KEY;
    const isProTier = process.env.DEEPL_PRO === "true";

    console.log('🔑 API Key:', apiKey ? `${apiKey.slice(0, 8)}...` : 'NOT SET');
    console.log('🏆 Pro Tier:', isProTier);

    if (!apiKey) {
        console.log('❌ No API key found in environment variables');
        return;
    }

    try {
        console.log('\n🧪 Testing basic translation...');

        const baseUrl = isProTier
            ? "https://api.deepl.com/v2/translate"
            : "https://api-free.deepl.com/v2/translate";

        const response = await axios.post(baseUrl, {
            text: ["Hello, world!"],
            target_lang: "DE",
            source_lang: "EN"
        }, {
            headers: {
                "Authorization": `DeepL-Auth-Key ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        const result = response.data.translations[0].text;
        console.log('✅ Translation result:', result);

        console.log('\n🧪 Testing Japanese kanji...');
        const kanjiResponse = await axios.post(baseUrl, {
            text: ["水"],
            target_lang: "DE",
            source_lang: "JA"
        }, {
            headers: {
                "Authorization": `DeepL-Auth-Key ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        const kanjiResult = kanjiResponse.data.translations[0].text;
        console.log('✅ Kanji result:', kanjiResult);

        console.log('\n🧪 Testing Wanikani radical concepts...');
        const radicals = ["ground", "water", "fire"];
        const batchResponse = await axios.post(baseUrl, {
            text: radicals,
            target_lang: "DE",
            source_lang: "EN"
        }, {
            headers: {
                "Authorization": `DeepL-Auth-Key ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        const batchResult = batchResponse.data.translations.map(t => t.text);
        console.log('✅ Batch result:', batchResult);

        console.log('\n🎉 All tests passed! Your DeepL API key is working correctly.');

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        if (error.response?.status === 403) {
            console.error('🔐 Check if your API key is correct and active');
        }
    }
}

testDeepL();
