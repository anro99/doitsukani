import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { TokenManagement } from '../../../shared/components/TokenManagement';
import { LevelSelector } from '../../../shared/components/LevelSelector';
import { ProcessingControls } from '../../../shared/components/processing/ProcessingControls';
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
        translationStatus,
        uploadStatus,
        uploadStats,

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

    const handleStartProcessing = () => {
        processTranslations(); // No parameter needed - loads all vocabulary internally
    };

    const handleStopProcessing = () => {
        stopProcessing();
    };

    const handleClearResults = () => {
        clearResults();
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Doitsukani - WaniKani Vocabulary Synonyme Manager
                </h1>
                <p className="text-gray-600">
                    Automatische deutsche Übersetzungen für WaniKani Vocabulary mit DeepL
                </p>
            </div>

            {/* Token Management */}
            <TokenManagement
                apiToken={apiToken}
                deeplToken={deeplToken}
                onApiTokenChange={handleApiTokenChange}
                onDeeplTokenChange={handleDeepLTokenChange}
                apiError={apiError}
                synonymMode={synonymMode}
            />

            {/* Settings */}
            {apiToken && (
                <LevelSelector
                    selectedLevel={selectedLevel}
                    onLevelChange={setSelectedLevel}
                    synonymMode={synonymMode}
                    onSynonymModeChange={setSynonymMode}
                />
            )}

            {/* Loading State */}
            {isLoadingVocabulary && (
                <Card>
                    <CardContent className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Lade Vocabulary von WaniKani...</p>
                    </CardContent>
                </Card>
            )}

            {/* Vocabulary Preview */}
            {apiToken && filteredVocabulary.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Vocabulary Vorschau - Level {selectedLevel}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <VocabularyPreview
                            previewVocabulary={filteredVocabulary}
                            currentLevelCount={vocabularyCount}
                            currentLevelCountLoading={isLoadingVocabulary}
                            displayedPreviewCount={displayedPreviewCount}
                            isLoadingVocabulary={isLoadingVocabulary}
                            onLoadMore={loadMorePreviewVocabulary}
                            errorItems={errorItems}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Processing Controls */}
            {apiToken && filteredVocabulary.length > 0 && (
                <ProcessingControls
                    apiToken={apiToken}
                    deeplToken={deeplToken}
                    synonymMode={synonymMode}
                    filteredItemsCount={vocabularyCount}
                    isProcessing={isProcessing}
                    progress={progress}
                    translationStatus={translationStatus}
                    uploadStatus={uploadStatus}
                    uploadStats={uploadStats}
                    onStartProcessing={handleStartProcessing}
                    onStopProcessing={handleStopProcessing}
                    itemType="vocabulary"
                    onClearResults={handleClearResults}

                    // Streaming processing props
                    streamingPhases={streamingPhases}
                    streamingResult={streamingResult}

                    // Error handling
                    errorItems={errorItems}
                    onClearErrors={clearErrors}
                />
            )}

            {/* Help text when no API token */}
            {!apiToken && (
                <Card>
                    <CardHeader>
                        <CardTitle>🚀 Erste Schritte</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center space-y-4">
                            <p className="text-gray-600">
                                Geben Sie Ihren WaniKani API-Token ein, um zu beginnen.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
