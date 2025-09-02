// Simple DeepL API test
async function testDeepL() {
    const axios = require('axios');

    console.log('Testing DeepL API...');

    try {
        // Test using the proxy URL
        const response = await axios.post('http://localhost:5176/api/deepl/v2/translate', {
            text: ["water"],
            target_lang: "DE",
            source_lang: "EN"
        }, {
            headers: {
                "Authorization": "DeepL-Auth-Key YOUR_API_KEY_HERE",
                "Content-Type": "application/json"
            },
            timeout: 10000
        });

        console.log('✅ Success:', response.data);
    } catch (error) {
        console.log('❌ Error:', error.message);
        if (error.response) {
            console.log('Response status:', error.response.status);
            console.log('Response data:', error.response.data);
        }
    }
}

testDeepL();
