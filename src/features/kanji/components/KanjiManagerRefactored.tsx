import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { TokenManagement } from '../../../shared/components/TokenManagement';
import { LevelSelector } from '../../../shared/components/LevelSelector';
import { ProcessingControls } from '../../../shared/components/processing/ProcessingControls';
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
        translationStatus,
        uploadStatus,
        uploadStats,

        // Streaming states (NEW)
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

    const handleStartProcessing = () => {
        processTranslations(); // No parameter needed - loads all kanji internally
    };

    const handleStopProcessing = () => {
        stopProcessing();
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Doitsukani - WaniKani Kanji Synonyme Manager
                </h1>
                <p className="text-gray-600">
                    Automatische deutsche Übersetzungen für WaniKani Kanji mit DeepL
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
            {isLoadingKanji && (
                <Card>
                    <CardContent className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Lade Kanji von WaniKani...</p>
                    </CardContent>
                </Card>
            )}

            {/* Kanji Preview */}
            {apiToken && filteredKanji.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Kanji Vorschau - Level {selectedLevel}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <KanjiPreview
                            previewKanji={filteredKanji}
                            currentLevelCount={kanjiCount}
                            currentLevelCountLoading={isLoadingKanji}
                            displayedPreviewCount={displayedPreviewCount}
                            isLoadingKanji={isLoadingKanji}
                            onLoadMore={loadMorePreviewKanji}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Processing Controls */}
            {apiToken && filteredKanji.length > 0 && (
                <ProcessingControls
                    apiToken={apiToken}
                    deeplToken={deeplToken}
                    synonymMode={synonymMode}
                    filteredItemsCount={kanjiCount}
                    isProcessing={isProcessing}
                    progress={progress}
                    translationStatus={translationStatus}
                    uploadStatus={uploadStatus}
                    uploadStats={uploadStats}
                    onStartProcessing={handleStartProcessing}
                    onStopProcessing={handleStopProcessing}
                    itemType="kanji"
                    streamingPhases={streamingPhases}
                    streamingResult={streamingResult}
                    errorItems={errorItems}
                    onClearResults={clearResults}
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
