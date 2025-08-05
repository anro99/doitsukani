import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testContextualTranslation() {
    const apiKey = process.env.DEEPL_API_KEY;
    const isProTier = process.env.DEEPL_PRO === "true";
    
    if (!apiKey) {
        console.log('❌ No API key found');
        return;
    }

    const baseUrl = isProTier
        ? "https://api.deepl.com/v2/translate"
        : "https://api-free.deepl.com/v2/translate";

    console.log('🧪 Testing Contextual Translation for "branch"...\n');

    const testCases = [
        {
            text: "branch",
            description: "Original (no context)"
        },
        {
            text: "branch (tree)",
            description: "Simple context in parentheses"
        },
        {
            text: "tree branch",
            description: "Compound word"
        },
        {
            text: "branch of a tree",
            description: "Descriptive phrase"
        },
        {
            text: "A branch is part of a tree that grows out from the trunk",
            description: "Full sentence with definition"
        },
        {
            text: "branch, tree limb",
            description: "With synonym"
        }
    ];

    for (const testCase of testCases) {
        try {
            console.log(`🔍 Testing: "${testCase.text}"`);
            console.log(`📝 Description: ${testCase.description}`);
            
            const response = await axios.post(baseUrl, {
                text: [testCase.text],
                target_lang: "DE",
                source_lang: "EN"
            }, {
                headers: {
                    "Authorization": `DeepL-Auth-Key ${apiKey}`,
                    "Content-Type": "application/json"
                }
            });

            const result = response.data.translations[0].text;
            console.log(`✅ Result: "${result}"`);
            
            // Check if it's the desired "Ast" translation
            if (result.toLowerCase().includes('ast')) {
                console.log('🎯 SUCCESS: Contains "Ast"!');
            } else if (result.toLowerCase().includes('zweig')) {
                console.log('🎯 GOOD: Contains "Zweig" (also correct for tree branch)!');
            } else if (result.toLowerCase().includes('zweigstelle')) {
                console.log('❌ PROBLEM: Still translates to "Zweigstelle" (office branch)');
            } else {
                console.log('🤔 OTHER: Different translation');
            }
            
            console.log('-'.repeat(60));
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1100));
            
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
    }
}

testContextualTranslation();
