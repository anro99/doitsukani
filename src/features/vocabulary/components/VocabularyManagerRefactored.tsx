import { BaseManager } from '../../../shared/components/BaseManager';
import { VocabularyPreview } from './VocabularyPreview';
import { useVocabularyManager } from '../hooks/useVocabularyManager';

export const VocabularyManagerRefactored = () => {
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
        filteredVocabulary,
        vocabularyCount,
        displayedPreviewCount,

        // States
        apiError,
        isLoadingVocabulary,
        isProcessing,
        progress,

        // Streaming processing states
        streamingPhases,
        streamingResult,

        // Error states
        errorItems,

        // Actions
        processTranslations,
        stopProcessing,
        clearResults,
        clearErrors,
        loadMorePreviewVocabulary
    } = useVocabularyManager();

    return (
        <BaseManager
            title="Doitsukani - WaniKani Vocabulary Synonyme Manager"
            subtitle="Automatische deutsche Übersetzungen für WaniKani Vocabulary mit DeepL"
            itemType="vocabulary"
            itemTypeName="Vocabulary"
            spinnerColor="purple-600"

            selectedLevel={selectedLevel as number}
            synonymMode={synonymMode}
            onLevelChange={setSelectedLevel}
            onSynonymModeChange={setSynonymMode}

            apiToken={apiToken}
            deeplToken={deeplToken}
            onApiTokenChange={handleApiTokenChange}
            onDeeplTokenChange={handleDeepLTokenChange}
            apiError={apiError}

            items={filteredVocabulary}
            itemCount={vocabularyCount}

            isLoading={isLoadingVocabulary}
            isProcessing={isProcessing}
            progress={progress}

            streamingPhases={streamingPhases}
            streamingResult={streamingResult}
            errorItems={errorItems}

            onStartProcessing={processTranslations}
            onStopProcessing={stopProcessing}
            onClearResults={clearResults}
            onClearErrors={clearErrors}

            previewComponent={
                <VocabularyPreview
                    previewVocabulary={filteredVocabulary}
                    currentLevelCount={vocabularyCount}
                    currentLevelCountLoading={false}
                    displayedPreviewCount={displayedPreviewCount}
                    isLoadingVocabulary={isLoadingVocabulary}
                    onLoadMore={loadMorePreviewVocabulary}
                    errorItems={errorItems}
                />
            }
        />
    );
};
