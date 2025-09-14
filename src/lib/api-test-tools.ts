/**
 * Direct DeepL API Test
 * This will help diagnose if the DeepL API is actually working
 */

import { translateText } from '../lib/deepl';

export async function testDeepLDirectly(deeplToken: string) {
    console.log('🧪 Testing DeepL API directly...');

    const testWords = ['hello', 'dog', 'cat', 'bird'];

    for (const word of testWords) {
        try {
            console.log(`🔄 Testing translation of: "${word}"`);
            const result = await translateText(deeplToken, word, 'DE');
            console.log(`✅ Translation result: "${word}" → "${result}"`);

            if (!result || result.trim() === '') {
                console.log(`❌ Empty translation result for "${word}"`);
            }
        } catch (error) {
            console.error(`❌ Translation failed for "${word}":`, error);
        }
    }
}

/**
 * Test Vocabulary Translation Pipeline
 */
import { translateVocabularyMeanings, VocabularyItem } from '../lib/vocabulary-translation';

export async function testVocabularyTranslation(deeplToken: string) {
    console.log('🧪 Testing Vocabulary Translation Pipeline...');

    const testVocab: VocabularyItem = {
        id: 123,
        characters: 'テスト',
        meanings: [
            { meaning: 'hello', primary: true },
            { meaning: 'greeting', primary: false }
        ]
    };

    try {
        console.log('🔄 Translating vocabulary:', testVocab);
        const result = await translateVocabularyMeanings(testVocab, deeplToken);
        console.log('✅ Vocabulary translation result:', result);

        if (result.error) {
            console.log('❌ Translation error:', result.error);
        }

        if (result.translatedSynonyms.length === 0) {
            console.log('❌ No synonyms were translated');
        } else {
            console.log('✅ Translated synonyms:', result.translatedSynonyms);
        }

        return result;
    } catch (error) {
        console.error('❌ Vocabulary translation pipeline failed:', error);
        return null;
    }
}

/**
 * Test Progress Reporting
 */
import { processVocabularyComplete } from '../lib/vocabulary-integration';

export async function testProgressReporting(apiToken: string, deeplToken: string) {
    console.log('🧪 Testing Progress Reporting...');

    const testVocabulary: VocabularyItem[] = [
        { id: 1, characters: 'テスト1', meanings: [{ meaning: 'test1', primary: true }] },
        { id: 2, characters: 'テスト2', meanings: [{ meaning: 'test2', primary: true }] }
    ];

    const progressUpdates: any[] = [];

    const onProgress = (phase: any) => {
        progressUpdates.push(phase);
        console.log(`📊 PROGRESS UPDATE: ${phase.phase} - ${phase.status} - ${phase.progress}%`);
    };

    try {
        const result = await processVocabularyComplete(
            testVocabulary,
            {
                batchSize: 1,
                synonymMode: 'smart-merge',
                apiToken,
                deeplToken,
                enableProgressReporting: true,
                stopOnFirstError: false
            },
            onProgress
        );

        console.log('🎯 Progress test completed:', {
            totalProgressUpdates: progressUpdates.length,
            finalResult: result.success,
            translationSuccess: result.translationResults.successCount,
            uploadSuccess: result.uploadResults.success
        });

        if (progressUpdates.length === 0) {
            console.log('❌ NO PROGRESS UPDATES RECEIVED - This is the problem!');
        }

        return { result, progressUpdates };
    } catch (error) {
        console.error('❌ Progress test failed:', error);
        return null;
    }
}

// Export for browser console use
if (typeof window !== 'undefined') {
    (window as any).testAPI = {
        deepl: testDeepLDirectly,
        vocabulary: testVocabularyTranslation,
        progress: testProgressReporting
    };

    console.log('🔧 API Test tools loaded. Use:');
    console.log('  testAPI.deepl("your-deepl-token")');
    console.log('  testAPI.vocabulary("your-deepl-token")');
    console.log('  testAPI.progress("your-api-token", "your-deepl-token")');
}
