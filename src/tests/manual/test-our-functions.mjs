/**
 * Test our own getKanjiCount and getKanjiPreview functions
 * to verify if they respect limit parameters
 */

import axios from 'axios';
import 'dotenv/config';

const API_TOKEN = process.env.WANIKANI_API_TOKEN;

if (!API_TOKEN) {
    console.error('❌ WANIKANI_API_TOKEN not found in environment variables');
    process.exit(1);
}

// Copy the API_LIMITS and functions from wanikani.ts to test them
const API_LIMITS = {
    minTime: 5000,
    maxConcurrent: 1,
};

import Bottleneck from 'bottleneck';

/**
 * Test version of getKanjiCount
 */
const getKanjiCount = async (token, level) => {
    const limiter = new Bottleneck(API_LIMITS);

    let url = "https://api.wanikani.com/v2/subjects?types=kanji&limit=1";

    if (level) {
        url += `&levels=${level}`;
    }

    console.log('🌐 getKanjiCount API call, URL:', url);

    const response = await limiter.schedule(() =>
        axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
    );

    const collection = response.data;
    console.log('📊 getKanjiCount API response:', {
        total_count: collection.total_count,
        data_length: collection.data?.length,
        per_page: collection.pages?.per_page,
        has_next: !!collection.pages?.next_url,
        url: url
    });

    return collection.total_count;
};

/**
 * Test version of getKanjiPreview
 */
const getKanjiPreview = async (token, level, limit = 12) => {
    const limiter = new Bottleneck(API_LIMITS);

    let url = `https://api.wanikani.com/v2/subjects?types=kanji&limit=${limit}`;

    if (level) {
        url += `&levels=${level}`;
    }

    console.log('🌐 getKanjiPreview API call, URL:', url);

    const response = await limiter.schedule(() =>
        axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
    );

    const collection = response.data;
    console.log('📊 getKanjiPreview API response:', {
        total_count: collection.total_count,
        data_length: collection.data?.length,
        per_page: collection.pages?.per_page,
        has_next: !!collection.pages?.next_url,
        requested_limit: limit,
        url: url
    });

    return collection.data;
};

async function testOurFunctions() {
    console.log('🧪 Testing our getKanjiCount and getKanjiPreview functions...\n');

    // Test 1: getKanjiCount with specific level
    console.log('📋 Test 1: getKanjiCount with level 5');
    try {
        const count = await getKanjiCount(API_TOKEN, 5);
        console.log(`✅ getKanjiCount returned: ${count}`);
    } catch (error) {
        console.error('❌ getKanjiCount failed:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: getKanjiCount without level (all kanji)
    console.log('📋 Test 2: getKanjiCount without level (all kanji)');
    try {
        const count = await getKanjiCount(API_TOKEN);
        console.log(`✅ getKanjiCount returned: ${count}`);
    } catch (error) {
        console.error('❌ getKanjiCount failed:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: getKanjiPreview with default limit
    console.log('📋 Test 3: getKanjiPreview with default limit (12) for level 5');
    try {
        const kanji = await getKanjiPreview(API_TOKEN, 5);
        console.log(`✅ getKanjiPreview returned: ${kanji.length} kanji`);
        if (kanji.length > 0) {
            console.log(`🔢 First few IDs: ${kanji.slice(0, 5).map(k => k.id).join(', ')}`);
        }
    } catch (error) {
        console.error('❌ getKanjiPreview failed:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 4: getKanjiPreview with small limit
    console.log('📋 Test 4: getKanjiPreview with limit 5 for level 5');
    try {
        const kanji = await getKanjiPreview(API_TOKEN, 5, 5);
        console.log(`✅ getKanjiPreview returned: ${kanji.length} kanji (expected: 5)`);
        if (kanji.length > 0) {
            console.log(`🔢 IDs: ${kanji.map(k => k.id).join(', ')}`);
        }
    } catch (error) {
        console.error('❌ getKanjiPreview failed:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 5: getKanjiPreview without level filter
    console.log('📋 Test 5: getKanjiPreview with limit 8 without level filter');
    try {
        const kanji = await getKanjiPreview(API_TOKEN, undefined, 8);
        console.log(`✅ getKanjiPreview returned: ${kanji.length} kanji (expected: 8)`);
        if (kanji.length > 0) {
            console.log(`🔢 IDs: ${kanji.map(k => k.id).join(', ')}`);
            // Check level distribution
            const levels = kanji.map(k => k.data.level);
            const levelCounts = levels.reduce((acc, level) => {
                acc[level] = (acc[level] || 0) + 1;
                return acc;
            }, {});
            console.log(`📊 Level distribution: ${JSON.stringify(levelCounts)}`);
        }
    } catch (error) {
        console.error('❌ getKanjiPreview failed:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 6: Direct comparison - what happens with different limits
    console.log('📋 Test 6: Comparison of different limits for level 5');
    const limits = [1, 3, 10, 50];

    for (const limit of limits) {
        try {
            const kanji = await getKanjiPreview(API_TOKEN, 5, limit);
            console.log(`   Limit ${limit}: Got ${kanji.length} kanji`);
            if (kanji.length !== limit && kanji.length !== 45) { // 45 is total for level 5
                console.log(`   ⚠️  Expected ${limit} or 45, got ${kanji.length}`);
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.error(`   ❌ Limit ${limit} failed:`, error.message);
        }
    }
}

// Run the tests
testOurFunctions().then(() => {
    console.log('\n🎉 Function tests completed!');
    console.log('\n📋 Analysis:');
    console.log('- If our functions return more data than expected, they have the same problem');
    console.log('- If they respect limits, we can use them differently');
    console.log('- This will inform our batching strategy');
}).catch(error => {
    console.error('\n❌ Function tests failed:', error);
});
