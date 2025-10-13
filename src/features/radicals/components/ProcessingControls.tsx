import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { Progress } from '../../../shared/components/ui/progress';

interface RadicalsUploadStats {
    created: number;
    updated: number;
    failed: number;
    skipped: number;
}

interface ProcessingControlsProps {
    apiToken: string;
    deeplToken: string;
    synonymMode: 'replace' | 'smart-merge' | 'delete';
    filteredItemsCount: number;
    isProcessing: boolean;
    progress: number;
    translationStatus: string;
    uploadStatus: string;
    uploadStats: RadicalsUploadStats;
    onStartProcessing: () => void;
    onStopProcessing: () => void;
    itemType: string;
}

export const ProcessingControls = ({
    apiToken,
    deeplToken,
    synonymMode,
    filteredItemsCount,
    isProcessing,
    progress,
    translationStatus,
    uploadStatus,
    uploadStats,
    onStartProcessing,
    onStopProcessing,
    itemType
}: ProcessingControlsProps) => {
    const getSynonymModeText = () => {
        switch (synonymMode) {
            case 'replace':
                return '🔄 Ersetzen - Alle Synonyme werden ersetzt';
            case 'smart-merge':
                return '🔀 Smart Merge - Behält bestehende, fügt neue hinzu';
            case 'delete':
                return '🗑️ Löschen - Alle Synonyme werden gelöscht';
            default:
                return '';
        }
    };

    const hasValidTokens = apiToken && deeplToken;
    const canStart = hasValidTokens && !isProcessing && filteredItemsCount > 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle>⚙️ Verarbeitung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Token Status */}
                <div className="space-y-2 text-sm">
                    <div className={`flex items-center gap-2 ${apiToken ? 'text-green-600' : 'text-red-600'}`}>
                        <span>{apiToken ? '✓' : '✗'}</span>
                        <span>WaniKani API Token</span>
                    </div>
                    <div className={`flex items-center gap-2 ${deeplToken ? 'text-green-600' : 'text-red-600'}`}>
                        <span>{deeplToken ? '✓' : '✗'}</span>
                        <span>DeepL API Token</span>
                    </div>
                </div>

                {/* Synonym Mode Display */}
                <div className="text-sm p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="font-medium text-blue-900 mb-1">Modus:</div>
                    <div className="text-blue-700">{getSynonymModeText()}</div>
                </div>

                {/* Item Count */}
                <div className="text-sm p-3 bg-gray-50 border border-gray-200 rounded">
                    <span className="font-medium">{filteredItemsCount}</span> {itemType} ausgewählt
                </div>

                {/* Control Buttons */}
                <div className="flex gap-2">
                    <Button
                        onClick={onStartProcessing}
                        disabled={!canStart}
                        className="flex-1"
                        variant={canStart ? "default" : "secondary"}
                    >
                        {!hasValidTokens ? '⚠️ Tokens benötigt' : '▶️ Verarbeitung starten'}
                    </Button>
                    {isProcessing && (
                        <Button
                            onClick={onStopProcessing}
                            variant="destructive"
                        >
                            ⏹️ Stopp
                        </Button>
                    )}
                </div>

                {/* Progress Display */}
                {isProcessing && (
                    <div className="space-y-3 pt-4 border-t">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium">Gesamtfortschritt</span>
                                <span className="text-gray-600">{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </div>

                        {translationStatus && (
                            <div className="text-sm p-3 bg-blue-50 border border-blue-200 rounded">
                                <div className="font-medium text-blue-900">Übersetzung:</div>
                                <div className="text-blue-700">{translationStatus}</div>
                            </div>
                        )}

                        {uploadStatus && (
                            <div className="text-sm p-3 bg-green-50 border border-green-200 rounded">
                                <div className="font-medium text-green-900">Upload:</div>
                                <div className="text-green-700">{uploadStatus}</div>
                            </div>
                        )}
                    </div>
                )}

                {/* Upload Statistics */}
                {(uploadStats.created > 0 || uploadStats.updated > 0 || uploadStats.failed > 0 || uploadStats.skipped > 0) && (
                    <div className="space-y-2 pt-4 border-t">
                        <div className="font-medium text-sm">Statistik:</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {uploadStats.created > 0 && (
                                <div className="p-2 bg-green-50 border border-green-200 rounded">
                                    <span className="font-medium text-green-900">{uploadStats.created}</span>
                                    <span className="text-green-700"> erstellt</span>
                                </div>
                            )}
                            {uploadStats.updated > 0 && (
                                <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                                    <span className="font-medium text-blue-900">{uploadStats.updated}</span>
                                    <span className="text-blue-700"> aktualisiert</span>
                                </div>
                            )}
                            {uploadStats.failed > 0 && (
                                <div className="p-2 bg-red-50 border border-red-200 rounded">
                                    <span className="font-medium text-red-900">{uploadStats.failed}</span>
                                    <span className="text-red-700"> fehlgeschlagen</span>
                                </div>
                            )}
                            {uploadStats.skipped > 0 && (
                                <div className="p-2 bg-gray-50 border border-gray-200 rounded">
                                    <span className="font-medium text-gray-900">{uploadStats.skipped}</span>
                                    <span className="text-gray-700"> übersprungen</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
