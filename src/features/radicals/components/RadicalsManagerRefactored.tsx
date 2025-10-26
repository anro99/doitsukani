import { BaseManager } from '../../../shared/components/BaseManager';
import { RadicalPreview } from './RadicalPreview';
import { useRadicalsManager } from '../hooks/useRadicalsManager';

export const RadicalsManagerRefactored = () => {
    const {
        // State
        apiToken,
        deeplToken,
        selectedLevel,
        synonymMode,
        isProcessing,
        progress,
        wkRadicals,
        isLoadingRadicals,
        apiError,
        filteredRadicals,
        currentLevelCount,
        currentLevelCountLoading,
        previewRadicals,
        displayedPreviewCount,

        // Streaming states
        streamingPhases,
        streamingResult,
        errorItems,

        // Actions
        handleApiTokenChange,
        handleDeeplTokenChange,
        setSelectedLevel,
        setSynonymMode,
        processTranslations,
        stopProcessing,
        clearResults,
        clearErrors,
        loadMorePreviewRadicals,
    } = useRadicalsManager();

    return (
        <BaseManager
            title="Doitsukani - WaniKani Radicals Synonyme Manager"
            subtitle="Automatische Übersetzung von WaniKani Radicals-Bedeutungen als deutsche Synonyme"
            itemType="radicals"
            itemTypeName="Radicals"
            spinnerColor="blue-600"

            selectedLevel={selectedLevel as number}
            synonymMode={synonymMode}
            onLevelChange={setSelectedLevel}
            onSynonymModeChange={setSynonymMode}

            apiToken={apiToken}
            deeplToken={deeplToken}
            onApiTokenChange={handleApiTokenChange}
            onDeeplTokenChange={handleDeeplTokenChange}
            apiError={apiError}

            items={wkRadicals}
            itemCount={currentLevelCount}

            isLoading={isLoadingRadicals}
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
                <RadicalPreview
                    previewRadicals={previewRadicals}
                    currentLevelCount={currentLevelCount}
                    currentLevelCountLoading={currentLevelCountLoading}
                    displayedPreviewCount={displayedPreviewCount}
                    isLoadingRadicals={isLoadingRadicals}
                    onLoadMore={loadMorePreviewRadicals}
                />
            }
        />
    );
};
