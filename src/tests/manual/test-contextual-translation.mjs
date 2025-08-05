import { translateRadicalWithContext } from "../../lib/contextual-translation.ts";
import dotenv from "dotenv";

dotenv.config();

// Set NODE_ENV to 'test' to force direct API URLs instead of proxy URLs
process.env.NODE_ENV = 'test';

async function testContextualRadicalTranslation() {
    const apiKey = process.env.DEEPL_API_KEY;

    if (!apiKey) {
        console.log('❌ No DeepL API key found');
        return;
    }

    console.log('🧪 Testing Contextual Radical Translation...\n');

    // Test cases with real WaniKani mnemonic content
    const testRadicals = [
        {
            meanings: [{ meaning: "Branch", primary: true }],
            meaning_mnemonic: "There's a cross branching off of this stool. Since it's branching out, we'll just call this the branch radical. I guess the tree this stool was made of is coming back to life in the form of this little branch."
        },
        {
            meanings: [{ meaning: "Ground", primary: true }],
            meaning_mnemonic: "This radical consists of a single, horizontal stroke. What's the biggest, single, horizontal stroke? That's the ground. Look at the ground, look at this radical, now look at the ground again."
        },
        {
            meanings: [{ meaning: "Drop", primary: true }],
            meaning_mnemonic: "This little radical is a drop, maybe of water or some other liquid. Notice how it's only one drop? Sometimes radicals and kanji will have multiple drops, but this one is just a single drop."
        },
        {
            meanings: [{ meaning: "Big", primary: true }],
            meaning_mnemonic: "This radical looks just like a stick figure—more specifically, a really big guy with his arms stretched out nice and big. When you think of this radical, think of a big person with their arms stretched out wide."
        },
        {
            meanings: [{ meaning: "Fire", primary: true }],
            meaning_mnemonic: "This is the radical for fire. It's got three little flames on top and even a couple logs underneath. But if it helps you can also think of this as a campfire."
        }
    ];

    for (const radical of testRadicals) {
        try {
            console.log(`🔍 Testing: "${radical.meanings[0].meaning}"`);
            console.log(`📝 Mnemonic: ${radical.meaning_mnemonic.substring(0, 100)}...`);

            const result = await translateRadicalWithContext(
                apiKey,
                radical,
                'DE',
                false // not pro tier
            );

            console.log(`📊 Results:`);
            console.log(`   Original: "${result.original}"`);
            console.log(`   Contextual: "${result.contextual}"`);
            console.log(`   Context used: ${result.context || 'none'}`);
            console.log(`   Improved: ${result.improved ? '✅ YES' : '❌ NO'}`);

            if (result.improved) {
                console.log(`🎯 SUCCESS: Contextual translation differs from original!`);
            } else {
                console.log(`ℹ️ No improvement detected (context may not be needed)`);
            }

            console.log('-'.repeat(80));

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 2500));

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.log(`❌ Error testing "${radical.meanings[0].meaning}": ${errorMessage}`);
        }
    }

    console.log('\n🎉 Contextual translation testing complete!');
}

testContextualRadicalTranslation().catch(console.error);
