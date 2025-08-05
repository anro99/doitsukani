import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testDeepLContext() {
    const apiKey = process.env.DEEPL_API_KEY;
    const isProTier = process.env.DEEPL_PRO === "true";
    
    if (!apiKey) {
        console.log('❌ No API key found');
        return;
    }

    const baseUrl = isProTier
        ? "https://api.deepl.com/v2/translate"
        : "https://api-free.deepl.com/v2/translate";

    console.log('🧪 Testing DeepL native context parameter...\n');

    const testCases = [
        {
            text: "branch",
            context: null,
            description: "Without context"
        },
        {
            text: "branch",
            context: "This radical represents a tree branch or limb that grows from the trunk",
            description: "With tree context"
        },
        {
            text: "branch",
            context: "There's a cross branching off of this stool. Since it's branching out, we'll just call this the branch radical. I guess the tree this stool was made of is coming back to life.",
            description: "With actual WaniKani mnemonic"
        },
        {
            text: "ground",
            context: "This radical consists of a single, horizontal stroke. What's the biggest, single, horizontal stroke? That's the ground. Look at the ground beneath your feet, the earth and soil.",
            description: "Ground with earth context"
        },
        {
            text: "drop",
            context: "This little radical is a drop, maybe of water or some other liquid. Notice how it's only one drop?",
            description: "Drop with water context"
        }
    ];

    for (const testCase of testCases) {
        try {
            console.log(`🔍 Testing: "${testCase.text}"`);
            console.log(`📝 Description: ${testCase.description}`);
            
            const requestBody = {
                text: [testCase.text],
                target_lang: "DE",
                source_lang: "EN"
            };

            if (testCase.context) {
                requestBody.context = testCase.context;
                console.log(`🎯 Context: "${testCase.context.substring(0, 80)}..."`);
            }
            
            const response = await axios.post(baseUrl, requestBody, {
                headers: {
                    "Authorization": `DeepL-Auth-Key ${apiKey}`,
                    "Content-Type": "application/json"
                }
            });

            const result = response.data.translations[0].text;
            console.log(`✅ Result: "${result}"`);
            
            // Analyze the result
            const text = testCase.text.toLowerCase();
            const translation = result.toLowerCase();
            
            if (text === 'branch') {
                if (translation.includes('ast') || translation.includes('zweig')) {
                    console.log('🎯 SUCCESS: Tree branch translation!');
                } else if (translation.includes('zweigstelle') || translation.includes('filiale')) {
                    console.log('❌ PROBLEM: Business branch translation');
                } else {
                    console.log('🤔 OTHER: Different translation');
                }
            } else if (text === 'ground') {
                if (translation.includes('boden') || translation.includes('erde')) {
                    console.log('🎯 SUCCESS: Earth/soil translation!');
                } else {
                    console.log('🤔 OTHER: Different translation');
                }
            }
            
            console.log('-'.repeat(80));
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1100));
            
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
    }
}

testDeepLContext();
