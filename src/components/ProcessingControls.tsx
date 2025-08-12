import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';

interface UploadStats {
    created: number;
    updated: number;
    failed: number;
    skipped: number;
    successful: number;
}

interface ProcessingControlsProps {
    apiToken: string;
    deeplToken: string;
    synonymMode: 'replace' | 'smart-merge' | 'delete';
    filteredRadicalsCount: number;
    isProcessing: boolean;
    progress: number;
    translationStatus?: string;
    uploadStatus?: string;
    uploadStats: UploadStats;
    onStartProcessing: () => void;
    onStopProcessing: () => void;
}

export const ProcessingControls: React.FC<ProcessingControlsProps> = ({
    apiToken,
    deeplToken,
    synonymMode,
    filteredRadicalsCount,
    isProcessing,
    progress,
    translationStatus,
    uploadStatus,
    uploadStats,
    onStartProcessing,
    onStopProcessing
}) => {
    const canStart = apiToken &&
        (synonymMode === 'delete' || deeplToken) &&
        filteredRadicalsCount > 0 &&
        !isProcessing;

    return (
        <Card>
            <CardHeader>
                <CardTitle>🚀 Verarbeitung starten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-4">
                    <Button
                        onClick={onStartProcessing}
                        disabled={!canStart}
                        className="flex-1"
                    >
                        {isProcessing ? 'Verarbeitung läuft...' : 'Synonyme übersetzen und aktualisieren'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onStopProcessing}
                        disabled={!isProcessing}
                    >
                        Stoppen
                    </Button>
                </div>

                {isProcessing && (
                    <div className="space-y-2">
                        <Progress value={progress} className="w-full" />
                        <p className="text-sm text-gray-600 text-center">
                            {progress}% abgeschlossen
                        </p>
                    </div>
                )}

                {translationStatus && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-700">{translationStatus}</p>
                    </div>
                )}

                {uploadStatus && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700">{uploadStatus}</p>
                        {(uploadStats.created > 0 || uploadStats.updated > 0 || uploadStats.failed > 0 || uploadStats.skipped > 0) && (
                            <div className="text-xs text-green-600 mt-1">
                                ✅ Erstellt: {uploadStats.created} | 🔄 Aktualisiert: {uploadStats.updated} | ❌ Fehler: {uploadStats.failed} | ⏭️ Übersprungen: {uploadStats.skipped}
                            </div>
                        )}
                    </div>
                )}

                <div className="text-sm text-gray-600">
                    <p>📊 <strong>{filteredRadicalsCount}</strong> Radicals werden verarbeitet</p>
                    <p>⚙️ <strong>{synonymMode}</strong> Modus wird verwendet</p>
                    <p>🇩🇪 Übersetzung nach <strong>Deutsch</strong></p>
                </div>
            </CardContent>
        </Card>
    );
};
