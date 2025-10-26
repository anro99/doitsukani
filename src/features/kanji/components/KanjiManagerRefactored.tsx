import { BaseManager } from '../../../shared/components/BaseManager';
import { KanjiPreview } from './KanjiPreview';
import { useKanjiManager } from '../hooks/useKanjiManager';

export const KanjiManagerRefactored = () => {
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
        filteredKanji,
        kanjiCount,
        displayedPreviewCount,

        // States
        apiError,
        isLoadingKanji,
        isProcessing,
        progress,

        // Streaming states
        streamingPhases,
        streamingResult,
        errorItems,

        // Actions
        processTranslations,
        stopProcessing,
        loadMorePreviewKanji,
        clearResults,
        clearErrors,
    } = useKanjiManager();

    return (
        <BaseManager
            title="Doitsukani - WaniKani Kanji Synonyme Manager"
            subtitle="Automatische deutsche Übersetzungen für WaniKani Kanji mit DeepL"
            itemType="kanji"
            itemTypeName="Kanji"
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

            items={filteredKanji}
            itemCount={kanjiCount}

            isLoading={isLoadingKanji}
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
                <KanjiPreview
                    previewKanji={filteredKanji}
                    currentLevelCount={kanjiCount}
                    currentLevelCountLoading={false}
                    displayedPreviewCount={displayedPreviewCount}
                    isLoadingKanji={isLoadingKanji}
                    onLoadMore={loadMorePreviewKanji}
                />
            }
        />
    );
};
