/**
 * Combined Manager - Main Component
 * 
 * Hauptkomponente für das Combined Manager Feature.
 * Verwaltet Radicals, Kanji und Vocabulary gleichzeitig.
 * 
 * Features:
 * - BaseManager Integration
 * - Vollständiger Workflow (Tokens → Level → Preview → Processing)
 * - Type-spezifische Statistiken
 * - Mixed Item Processing
 */

import { BaseManager } from '../../../shared/components/BaseManager';
import { CombinedPreview } from './CombinedPreview';
import { useCombinedManager } from '../hooks/useCombinedManager';

/**
 * Combined Manager Component
 * 
 * Vereint Radicals, Kanji und Vocabulary Management in einer Komponente.
 * Nutzt BaseManager für gemeinsame UI-Struktur und useCombinedManager für State.
 */
export const CombinedManager = () => {
    const {
        // Settings
        selectedLevel,
        setSelectedLevel,
        synonymMode,
        setSynonymMode,

        // Tokens
        apiToken,
        handleApiTokenChange,
        deeplToken,
        handleDeepLTokenChange,

        // Data
        combinedItems,
        totalCount,
        displayedPreviewCount,

        // Loading states
        isLoadingItems,
        apiError,

        // Processing states
        isProcessing,
        progress,

        // Actions
        startProcessing,
        stopProcessing,
        clearResults,
        loadMorePreviewItems,
    } = useCombinedManager();

    return (
        <BaseManager
            title="Doitsukani - WaniKani Combined Manager"
            subtitle="Automatische deutsche Übersetzungen für Radicals, Kanji und Vocabulary mit DeepL"
            itemType="vocabulary" // Generic label für BaseManager
            itemTypeName="Items" // Generic name für Mixed Items
            spinnerColor="indigo-600"

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

            onStartProcessing={startProcessing}
            onStopProcessing={stopProcessing}
            onClearResults={clearResults}

            previewComponent={
                <CombinedPreview
                    previewItems={combinedItems}
                    currentLevelCount={totalCount}
                    currentLevelCountLoading={false}
                    displayedPreviewCount={displayedPreviewCount}
                    isLoadingItems={isLoadingItems}
                    onLoadMore={loadMorePreviewItems}
                />
            }
        />
    );
};
