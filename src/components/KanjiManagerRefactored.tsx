import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TokenManagement } from './TokenManagement';
import { LevelSelector } from './LevelSelector';
import { ProcessingControls } from './ProcessingControls';
import { KanjiPreview } from './KanjiPreview';
import { useKanjiManager } from '../hooks/useKanjiManager';

export const KanjiManagerRefactored: React.FC = () => {
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
        wkKanji,
        isLoadingKanji,
        apiError,
        filteredKanji,
        // New optimized loading state - simplified
        currentLevelCount,
        currentLevelCountLoading,
        previewKanji,

        // Actions
        handleApiTokenChange,
        handleDeeplTokenChange,
        setSelectedLevel,
        setSynonymMode,
        processTranslations,
        stopProcessing
    } = useKanjiManager();

    const handleStartProcessing = () => {
        processTranslations(filteredKanji);
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
                    Automatische Übersetzung von WaniKani Kanji-Bedeutungen als deutsche Synonyme
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
            {isLoadingKanji && (
                <Card>
                    <CardContent className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Lade Kanji von Wanikani...</p>
                    </CardContent>
                </Card>
            )}

            {/* Kanji Preview - shows count info and preview */}
            {apiToken && wkKanji.length > 0 && (
                <KanjiPreview
                    previewKanji={previewKanji}
                    currentLevelCount={currentLevelCount}
                    currentLevelCountLoading={currentLevelCountLoading}
                />
            )}

            {/* Processing Controls */}
            {apiToken && wkKanji.length > 0 && (
                <ProcessingControls
                    apiToken={apiToken}
                    deeplToken={deeplToken}
                    synonymMode={synonymMode}
                    filteredRadicalsCount={filteredKanji.length}
                    isProcessing={isProcessing}
                    progress={progress}
                    translationStatus={translationStatus}
                    uploadStatus={uploadStatus}
                    uploadStats={uploadStats}
                    onStartProcessing={handleStartProcessing}
                    onStopProcessing={handleStopProcessing}
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
