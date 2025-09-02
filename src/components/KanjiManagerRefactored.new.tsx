import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TokenManagement } from './TokenManagement';
import { LevelSelector } from './LevelSelector';
import { ProcessingControls } from './ProcessingControls';
import { KanjiPreview } from './KanjiPreview';
import { useKanjiManager } from '../hooks/useKanjiManager';

export const KanjiManagerRefactored: React.FC = () => {
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

        // States
        isLoadingKanji,
        apiError,
        isProcessing,
        progress,
        translationStatus,
        uploadStatus,
        uploadStats,

        // Actions
        processTranslations,
        stopProcessing
    } = useKanjiManager();

    const handleStartProcessing = () => {
        console.log('🚀 DEBUG: handleStartProcessing called');
        console.log('🚀 DEBUG: filteredKanji.length:', filteredKanji.length);
        console.log('🚀 DEBUG: apiToken exists:', !!apiToken);
        console.log('🚀 DEBUG: deeplToken exists:', !!deeplToken);
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
                    Automatische deutsche Übersetzungen für WaniKani Kanji mit DeepL
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column: Configuration */}
                <div className="lg:col-span-1 space-y-6">
                    <TokenManagement
                        apiToken={apiToken}
                        deeplToken={deeplToken}
                        onApiTokenChange={handleApiTokenChange}
                        onDeeplTokenChange={handleDeepLTokenChange}
                        apiError={apiError}
                        synonymMode={synonymMode}
                    />

                    <LevelSelector
                        selectedLevel={selectedLevel}
                        onLevelChange={setSelectedLevel}
                        synonymMode={synonymMode}
                        onSynonymModeChange={setSynonymMode}
                    />

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
                    />
                </div>

                {/* Right columns: Preview */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Kanji Vorschau - Level {selectedLevel}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {apiError && (
                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                    <strong>Fehler:</strong> {apiError}
                                </div>
                            )}

                            <KanjiPreview
                                previewKanji={filteredKanji}
                                maxPreviewCount={100}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
