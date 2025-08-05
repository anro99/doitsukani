import { setTimeout } from 'node:timers/promises';
import { translateText } from '../../lib/deepl.js';

// Real API test - only for manual verification
const apiKey = process.env.DEEPL_API_KEY;
const isProTier = process.env.DEEPL_IS_PRO === 'true';

if (!apiKey) {
    console.error('❌ DEEPL_API_KEY not set in environment');
    process.exit(1);
}

console.log('🧪 Testing DeepL Context Parameter Integration\n');

async function testContextTranslation() {
    try {
        console.log('Testing "branch" translation:');

        // Test without context
        const withoutContext = await translateText(
            apiKey,
            'branch',
            'DE',
            isProTier
        );
        console.log(`❌ Without context: "${withoutContext}"`);

        await setTimeout(1100); // Rate limiting

        // Test with context
        const withContext = await translateText(
            apiKey,
            'branch',
            'DE',
            isProTier,
            3,
            'There is a cross branching off of this stool. Since it is branching out, we will just call this the branch radical. I guess the tree this stool was made of is coming back to life.'
        );
        console.log(`✅ With context: "${withContext}"`);

        await setTimeout(1100); // Rate limiting

        // Test ground
        console.log('\nTesting "ground" translation:');
        const groundWithContext = await translateText(
            apiKey,
            'ground',
            'DE',
            isProTier,
            3,
            'This radical consists of a single, horizontal stroke. What is the biggest, single, horizontal stroke? That is the ground. Look at the ground, look at this radical, now look at the ground again.'
        );
        console.log(`✅ Ground with context: "${groundWithContext}"`);

        await setTimeout(1100); // Rate limiting

        // Test drop
        console.log('\nTesting "drop" translation:');
        const dropWithContext = await translateText(
            apiKey,
            'drop',
            'DE',
            isProTier,
            3,
            'This little radical is a drop, maybe of water or some other liquid. Notice how it is only one drop?'
        );
        console.log(`✅ Drop with context: "${dropWithContext}"`);

        console.log('\n🎉 Context parameter integration working!');

    } catch (error) {
        console.error('❌ Error testing context:', error instanceof Error ? error.message : error);
    }
}

testContextTranslation();
