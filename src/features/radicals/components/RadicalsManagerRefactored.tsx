import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { TokenManagement } from '../../../shared/components/TokenManagement';
import { LevelSelector } from '../../../shared/components/LevelSelector';
import { ProcessingControls } from '../../../shared/components/processing/ProcessingControls';
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
        translationStatus,
        uploadStatus,
        uploadStats,
        wkRadicals,
        isLoadingRadicals,
        apiError,
        filteredRadicals,
        // New optimized loading state - simplified
        currentLevelCount,
        currentLevelCountLoading,
        previewRadicals,

        // Streaming states (NEW)
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
    } = useRadicalsManager();

    const handleStartProcessing = () => {
        processTranslations();
    };

    const handleStopProcessing = () => {
        stopProcessing();
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Doitsukani - WaniKani Radicals Synonyme Manager
                </h1>
                <p className="text-gray-600">
                    Automatische Übersetzung von WaniKani Radicals-Bedeutungen als deutsche Synonyme
                </p>
            </div>

            {/* Token Management */}
            <TokenManagement
                apiToken={apiToken}
                deeplToken={deeplToken}
                onApiTokenChange={handleApiTokenChange}
                onDeeplTokenChange={handleDeeplTokenChange}
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
            {isLoadingRadicals && (
                <Card>
                    <CardContent className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Lade Radicals von Wanikani...</p>
                    </CardContent>
                </Card>
            )}

            {/* Radicals Preview - shows count info but level dropdown doesn't */}
            {apiToken && wkRadicals.length > 0 && (
                <RadicalPreview
                    previewRadicals={previewRadicals}
                    currentLevelCount={currentLevelCount}
                    currentLevelCountLoading={currentLevelCountLoading}
                />
            )}

            {/* Processing Controls */}
            {apiToken && wkRadicals.length > 0 && (
                <ProcessingControls
                    apiToken={apiToken}
                    deeplToken={deeplToken}
                    synonymMode={synonymMode}
                    filteredItemsCount={filteredRadicals.length}
                    isProcessing={isProcessing}
                    progress={progress}
                    translationStatus={translationStatus}
                    uploadStatus={uploadStatus}
                    uploadStats={uploadStats}
                    onStartProcessing={handleStartProcessing}
                    onStopProcessing={handleStopProcessing}
                    itemType="radicals"
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
                                Geben Sie Ihren Wanikani API-Token ein, um zu beginnen.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
