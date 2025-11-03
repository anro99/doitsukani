/**
 * CombinedManagerRefactored Component
 * 
 * Refactored Combined Manager basierend auf BaseManager.
 * Vereinheitlicht die UI mit Vocabulary/Kanji/Radicals Managern.
 * 
 * Features:
 * - BaseManager Integration
 * - Combined Items Preview (Radicals, Kanji, Vocabulary)
 * - Type-spezifische Statistiken (byType breakdown)
 * - Streaming Processing mit Live-Updates
 * - Error Tracking & Display
 */

import { BaseManager } from '../../../shared/components/BaseManager';
import { useCombinedManager } from '../hooks/useCombinedManager';
import { CombinedPreview } from './CombinedPreview';

export const CombinedManagerRefactored = () => {
    const {
        // Settings
        selectedLevel,
        synonymMode,
        setSynonymMode,
        setSelectedLevel,

        // Tokens
        apiToken,
        handleApiTokenChange,
        deeplToken,
        handleDeepLTokenChange,

        // Data
        combinedItems,
        radicalCount,
        kanjiCount,
        vocabularyCount,
        displayedPreviewCount,

        // States
        apiError,
        isLoadingItems,
        isProcessing,
        progress,

        // Streaming states
        streamingResult,
        errorItems,

        // Actions
        startProcessing,
        stopProcessing,
        clearResults,
        clearErrors,
        loadMorePreviewItems
    } = useCombinedManager();

    return (
        <BaseManager
            title="Doitsukani - WaniKani Combined Manager"
            subtitle="Kombinierte Verarbeitung von Radicals, Kanji und Vocabulary mit deutschen Übersetzungen"
            itemType="combined"
            itemTypeName="Combined"
            spinnerColor="blue-600"

            selectedLevel={selectedLevel as number}
            synonymMode={synonymMode}
            onLevelChange={setSelectedLevel}
            onSynonymModeChange={setSynonymMode}

            apiToken={apiToken}
            deeplToken={deeplToken}
            onApiTokenChange={handleApiTokenChange}
            onDeeplTokenChange={handleDeepLTokenChange}
            apiError={apiError}

            items={combinedItems}

            isLoading={isLoadingItems}
            isProcessing={isProcessing}
            progress={progress}

            streamingPhases={undefined} // TODO: Add in Todo 6
            streamingResult={streamingResult}
            errorItems={errorItems}

            onStartProcessing={startProcessing}
            onStopProcessing={stopProcessing}
            onClearResults={clearResults}
            onClearErrors={clearErrors}

            previewComponent={
                <CombinedPreview
                    previewItems={combinedItems}
                    radicalCount={radicalCount}
                    kanjiCount={kanjiCount}
                    vocabularyCount={vocabularyCount}
                    displayedPreviewCount={displayedPreviewCount}
                    isLoading={isLoadingItems}
                    onLoadMore={loadMorePreviewItems}
                    errorItems={errorItems}
                />
            }
        />
    );
};
