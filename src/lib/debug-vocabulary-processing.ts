/**
 * Debug Tool: Vocabulary Processing Issues
 * 
 * This tool helps diagnose issues with:
 * 1. Progress reporting not working (stuck at 0%)
 * 2. Stop functionality not resetting UI state
 * 3. Actual translation/upload not working
 * 4. Preview not showing new translations
 */

import { VocabularyItem } from '../lib/vocabulary-translation';
import { processVocabularyComplete, CompleteProcessingOptions, ProcessingPhase } from '../lib/vocabulary-integration';

export async function debugVocabularyProcessing() {
    console.log('🔍 DEBUG: Starting Vocabulary Processing Diagnosis');

    // Test data - small set for quick debugging
    const testVocabulary: VocabularyItem[] = [
        { id: 1, characters: '犬', meanings: [{ meaning: 'dog', primary: true }] },
        { id: 2, characters: '猫', meanings: [{ meaning: 'cat', primary: true }] }
    ];

    const options: CompleteProcessingOptions = {
        batchSize: 1,
        synonymMode: 'smart-merge',
        apiToken: 'test-api-token', // This should be replaced with real token
        deeplToken: 'test-deepl-token', // This should be replaced with real token
        enableProgressReporting: true,
        stopOnFirstError: false
    };

    const stopSignal = { current: false };
    const progressUpdates: ProcessingPhase[] = [];

    console.log('📊 Setting up progress tracking...');

    const onProgress = (phase: ProcessingPhase) => {
        progressUpdates.push(phase);
        console.log(`📈 PROGRESS: ${phase.phase} - ${phase.status} - ${phase.progress}%`);
        if (phase.currentItem) {
            console.log(`   📝 Current item: ${phase.currentItem}`);
        }
        if (phase.error) {
            console.log(`   ❌ Error: ${phase.error}`);
        }
    };

    try {
        console.log('▶️ Starting processing...');
        const startTime = Date.now();

        const result = await processVocabularyComplete(
            testVocabulary,
            options,
            onProgress,
            stopSignal
        );

        const endTime = Date.now();

        console.log('✅ Processing completed!');
        console.log('📊 RESULTS:');
        console.log('   Success:', result.success);
        console.log('   Total items:', result.totalItems);
        console.log('   Translation success:', result.translationResults.successCount);
        console.log('   Translation errors:', result.translationResults.errorCount);
        console.log('   Upload success:', result.uploadResults.success);
        console.log('   Upload created:', result.uploadResults.createdCount);
        console.log('   Upload updated:', result.uploadResults.updatedCount);
        console.log('   Upload errors:', result.uploadResults.errorCount);
        console.log('   Processing time:', endTime - startTime, 'ms');

        console.log('📈 PROGRESS UPDATES RECEIVED:');
        progressUpdates.forEach((update, i) => {
            console.log(`   ${i + 1}. ${update.phase} - ${update.status} - ${update.progress}%`);
        });

        if (progressUpdates.length === 0) {
            console.log('   ❌ NO progress updates received - this is the problem!');
        }

        // Detailed translation results
        console.log('📝 TRANSLATION DETAILS:');
        result.translationResults.translations.forEach(t => {
            console.log(`   ID ${t.vocabularyId}: ${t.translatedSynonyms.join(', ')} ${t.error ? `(Error: ${t.error})` : ''}`);
        });

        // Upload errors
        if (result.uploadResults.errors.length > 0) {
            console.log('📤 UPLOAD ERRORS:');
            result.uploadResults.errors.forEach(error => {
                console.log(`   ❌ ${error}`);
            });
        }

        return result;

    } catch (error) {
        console.error('❌ FATAL ERROR:', error);
        console.log('📈 Progress updates before error:', progressUpdates.length);
        throw error;
    }
}

/**
 * Debug Stop Functionality
 */
export async function debugStopFunctionality() {
    console.log('🛑 DEBUG: Testing Stop Functionality');

    const testVocabulary: VocabularyItem[] = [
        { id: 1, characters: '犬', meanings: [{ meaning: 'dog', primary: true }] },
        { id: 2, characters: '猫', meanings: [{ meaning: 'cat', primary: true }] },
        { id: 3, characters: '鳥', meanings: [{ meaning: 'bird', primary: true }] }
    ];

    const options: CompleteProcessingOptions = {
        batchSize: 1,
        synonymMode: 'smart-merge',
        apiToken: 'test-api-token',
        deeplToken: 'test-deepl-token',
        enableProgressReporting: true,
        stopOnFirstError: false
    };

    const stopSignal = { current: false };
    let progressCount = 0;

    const onProgress = (phase: ProcessingPhase) => {
        progressCount++;
        console.log(`📈 Progress ${progressCount}: ${phase.phase} - ${phase.progress}%`);

        // Simulate user clicking stop after 2 progress updates
        if (progressCount === 2) {
            console.log('🛑 Simulating STOP button click...');
            stopSignal.current = true;
        }
    };

    try {
        const result = await processVocabularyComplete(testVocabulary, options, onProgress, stopSignal);

        console.log('📊 STOP TEST RESULTS:');
        console.log('   Was stopped?', stopSignal.current);
        console.log('   Items processed:', result.translationResults.translations.length);
        console.log('   Expected: Less than', testVocabulary.length, 'items');
        console.log('   Success despite stop?', result.success);

        if (result.translationResults.translations.length >= testVocabulary.length) {
            console.log('   ❌ PROBLEM: Stop signal was ignored!');
        } else {
            console.log('   ✅ Stop functionality working correctly');
        }

    } catch (error) {
        console.error('❌ Stop test failed:', error);
    }
}

/**
 * Real API Test (requires actual tokens)
 */
export async function testRealAPIIntegration(apiToken: string, deeplToken: string) {
    console.log('🌐 DEBUG: Testing Real API Integration');

    if (!apiToken || !deeplToken) {
        console.log('❌ Missing API tokens - cannot test real integration');
        return;
    }

    // Test with a single vocabulary item to avoid API rate limits
    const testVocabulary: VocabularyItem[] = [
        { id: 12345, characters: 'test', meanings: [{ meaning: 'test', primary: true }] }
    ];

    const options: CompleteProcessingOptions = {
        batchSize: 1,
        synonymMode: 'smart-merge',
        apiToken,
        deeplToken,
        enableProgressReporting: true,
        stopOnFirstError: false
    };

    try {
        console.log('🔄 Testing DeepL translation...');
        const result = await processVocabularyComplete(testVocabulary, options);

        console.log('📊 REAL API TEST RESULTS:');
        console.log('   Translation successful?', result.translationResults.successCount > 0);
        console.log('   Upload attempted?', result.uploadResults.totalItems > 0);
        console.log('   Any errors?', result.translationResults.errorCount + result.uploadResults.errorCount);

        if (result.translationResults.errorCount > 0) {
            console.log('❌ Translation errors found - check DeepL token');
        }

        if (result.uploadResults.errorCount > 0) {
            console.log('❌ Upload errors found - check WaniKani token');
            result.uploadResults.errors.forEach(error => console.log(`   ${error}`));
        }

    } catch (error) {
        console.error('❌ Real API test failed:', error);
    }
}

// Export for easy testing in browser console
if (typeof window !== 'undefined') {
    (window as any).debugVocabulary = {
        testProcessing: debugVocabularyProcessing,
        testStop: debugStopFunctionality,
        testRealAPI: testRealAPIIntegration
    };
}
