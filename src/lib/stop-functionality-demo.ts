/**
 * Demo: Stop Signal Functionality in Vocabulary Processing
 * 
 * This demonstrates how the Stop button should work in the UI:
 * 
 * 1. User starts vocabulary processing
 * 2. Processing begins with translation phase
 * 3. User clicks "Stop" button during processing
 * 4. Stop signal is activated (stopSignal.current = true)
 * 5. Processing stops gracefully after current item
 * 6. Results are returned with partial success
 */

import { processVocabularyComplete, CompleteProcessingOptions, ProcessingPhase } from '../lib/vocabulary-integration';
import { VocabularyItem } from '../lib/vocabulary-translation';

export async function demoStopFunctionality() {
    console.log('🎬 Demo: Stop Signal Functionality');

    // Sample vocabulary data
    const testVocabulary: VocabularyItem[] = [
        { id: 1, characters: '犬', meanings: [{ meaning: 'dog', primary: true }] },
        { id: 2, characters: '猫', meanings: [{ meaning: 'cat', primary: true }] },
        { id: 3, characters: '鳥', meanings: [{ meaning: 'bird', primary: true }] },
        { id: 4, characters: '魚', meanings: [{ meaning: 'fish', primary: true }] },
        { id: 5, characters: '馬', meanings: [{ meaning: 'horse', primary: true }] }
    ];

    const options: CompleteProcessingOptions = {
        batchSize: 2,
        synonymMode: 'smart-merge',
        apiToken: 'demo-api-token',
        deeplToken: 'demo-deepl-token',
        enableProgressReporting: true,
        stopOnFirstError: false
    };

    // Create stop signal (this would be managed by React in real usage)
    const stopSignal = { current: false };

    // Simulate user clicking stop after 2 seconds
    setTimeout(() => {
        console.log('🛑 User clicked STOP button!');
        stopSignal.current = true;
    }, 2000);

    // Progress tracking
    const progressCallback = (phase: ProcessingPhase) => {
        console.log(`📊 Progress: ${phase.phase} - ${phase.status} - ${phase.progress}%`);
        if (phase.currentItem) {
            console.log(`   Current item: ${phase.currentItem}`);
        }
    };

    console.log('▶️ Starting vocabulary processing...');

    try {
        // This is how the useVocabularyManager hook calls it
        const result = await processVocabularyComplete(
            testVocabulary,
            options,
            progressCallback,
            stopSignal  // The key addition - stop signal support
        );

        console.log('✅ Processing completed:');
        console.log('   Success:', result.success);
        console.log('   Total items:', result.totalItems);
        console.log('   Translated:', result.translationResults.successCount);
        console.log('   Upload success:', result.uploadResults.success);
        console.log('   Processing time:', result.processingTime, 'ms');

        if (stopSignal.current) {
            console.log('🎯 Processing was successfully stopped by user!');
        }

    } catch (error) {
        console.error('❌ Processing failed:', error);
    }
}

/**
 * Integration with React Hook Usage:
 * 
 * const { processVocabularyComplete } = await import('../lib/vocabulary-integration');
 * const result = await processVocabularyComplete(
 *     vocabularyItems, 
 *     options, 
 *     (phase) => {
 *         setCurrentPhase(phase);
 *         setProgress(phase.progress);
 *     },
 *     stopSignalRef.current  // ← This enables the Stop button!
 * );
 * 
 * The stopProcessing function in the hook simply sets:
 * stopSignalRef.current.current = true;
 * 
 * UI Button:
 * <Button onClick={onStopProcessing} disabled={!isProcessing}>
 *     {isProcessing ? '⏹️ Stop Translation' : 'Stop'}
 * </Button>
 */
