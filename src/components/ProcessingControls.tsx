import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { StreamingProcessingPhase, StreamingCompleteProcessingResult } from '../lib/vocabulary-streaming-integration';

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
    filteredItemsCount: number;
    isProcessing: boolean;
    progress: number;
    translationStatus?: string;
    uploadStatus?: string;
    uploadStats: UploadStats;
    onStartProcessing: () => void;
    onStopProcessing: () => void;
    onClearResults?: () => void; // Optional callback to clear processing results
    itemType?: 'radicals' | 'kanji' | 'vocabulary'; // Optional prop to specify the type

    // Streaming processing props
    streamingPhases?: StreamingProcessingPhase | null;
    streamingResult?: StreamingCompleteProcessingResult | null;
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
    onClearResults,
    itemType = 'radicals', // Default to radicals for backward compatibility

    // Streaming processing props
    streamingPhases,
    streamingResult
}: ProcessingControlsProps) => {
    const canStart = apiToken &&
        (synonymMode === 'delete' || deeplToken) &&
        filteredItemsCount > 0 &&
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
                        className={`flex-1 ${streamingResult?.success
                            ? 'bg-green-600 hover:bg-green-700'
                            : streamingResult && !streamingResult.success
                                ? 'bg-orange-600 hover:bg-orange-700'
                                : ''
                            }`}
                        variant={streamingResult ? "default" : "default"}
                    >
                        {isProcessing ? (
                            'Streaming läuft...'
                        ) : streamingResult ? (
                            <>
                                {streamingResult.success ? '✅ Process Again' : '⚠️ Retry Processing'}
                            </>
                        ) : (
                            '▶️ Synonyme übersetzen und aktualisieren'
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onStopProcessing}
                        disabled={!isProcessing}
                        className={isProcessing ? 'border-red-300 text-red-600 hover:bg-red-50' : ''}
                    >
                        {isProcessing ? '⏹️ Stoppen' : 'Stoppen'}
                    </Button>

                    {streamingResult && !isProcessing && onClearResults && (
                        <Button
                            variant="ghost"
                            onClick={onClearResults}
                            className="px-3 text-gray-500 hover:text-gray-700"
                            title="Clear Results"
                        >
                            🗑️
                        </Button>
                    )}
                </div>

                {isProcessing && (
                    <div className="space-y-4">
                        {/* Unified Progress Bar */}
                        {streamingPhases && (
                            <div className="space-y-4">
                                <div className="text-sm font-medium text-gray-700 text-center">
                                    🚀 Vocabulary Processing Progress
                                </div>

                                {/* Main Progress Bar */}
                                <div className="space-y-2">
                                    <Progress
                                        value={streamingPhases.overallPhase.progress}
                                        className="w-full h-3 bg-gray-100"
                                    />
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">
                                            {streamingPhases.overallPhase.completedItems || 0} abgeschlossen
                                        </span>
                                        <span className="font-medium text-gray-800">
                                            {streamingPhases.overallPhase.progress}%
                                        </span>
                                        <span className="text-red-600">
                                            {streamingPhases.overallPhase.errorItems || 0} Fehler
                                        </span>
                                    </div>
                                </div>

                                {/* Activity Indicators */}
                                <div className="space-y-2 pt-2 border-t border-gray-200">
                                    <div className="text-xs font-medium text-gray-600 text-center">Aktuelle Aktivitäten</div>

                                    {/* Translation Activity */}
                                    {streamingPhases.translationPhase.currentItem && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="text-blue-500">🔄</span>
                                            <span className="text-blue-700">Übersetze:</span>
                                            <span className="font-mono font-bold">{streamingPhases.translationPhase.currentItem}</span>
                                        </div>
                                    )}

                                    {/* Upload Activity */}
                                    {streamingPhases.uploadPhase.currentItem && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="text-green-500">📤</span>
                                            <span className="text-green-700">Lade hoch:</span>
                                            <span className="font-mono font-bold">{streamingPhases.uploadPhase.currentItem}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Fallback Progress */}
                        {!streamingPhases && (
                            <div className="space-y-2">
                                <Progress value={progress} className="w-full" />
                                <p className="text-sm text-gray-600 text-center">
                                    {progress}% abgeschlossen
                                </p>
                            </div>
                        )}
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

                {/* Streaming Processing Result Summary */}
                {streamingResult && !isProcessing && (
                    <div className={`p-3 border rounded-lg ${streamingResult.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-orange-50 border-orange-200'
                        }`}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🚀</span>
                            <span className="text-lg">{streamingResult.success ? '✅' : '⚠️'}</span>
                            <h4 className={`text-sm font-medium ${streamingResult.success ? 'text-green-800' : 'text-orange-800'
                                }`}>
                                Streaming Processing {streamingResult.success ? 'Completed' : 'Completed with Errors'}
                            </h4>
                        </div>

                        <div className={`text-xs grid grid-cols-2 gap-2 ${streamingResult.success ? 'text-green-700' : 'text-orange-700'
                            }`}>
                            <div>📊 Items: <strong>{streamingResult.totalItems}</strong></div>
                            <div>⏱️ Time: <strong>{(streamingResult.processingTime / 1000).toFixed(1)}s</strong></div>
                            <div>🔄 Translated: <strong>{streamingResult.translationCount}</strong></div>
                            <div>📤 Uploaded: <strong>{streamingResult.uploadCount}</strong></div>
                            <div>❌ Errors: <strong>{streamingResult.errorCount}</strong></div>
                            <div>⚡ Mode: <strong>Streaming</strong></div>
                        </div>

                        {streamingResult.errorCount > 0 && (
                            <div className="mt-2 text-xs text-red-600">
                                <div>❌ {streamingResult.errorCount} items had processing errors</div>
                            </div>
                        )}
                    </div>
                )}

                <div className="text-sm text-gray-600">
                    <p>📊 <strong>{filteredItemsCount}</strong> {itemType === 'kanji' ? 'Kanji' : itemType === 'vocabulary' ? 'Vocabulary' : 'Radicals'} werden verarbeitet</p>
                    <p>⚙️ <strong>{synonymMode}</strong> Modus wird verwendet</p>
                    <p>🇩🇪 Übersetzung nach <strong>Deutsch</strong></p>
                    <p>⚡ <strong>Streaming Mode</strong> - Parallel translation & upload</p>
                </div>
            </CardContent>
        </Card>
    );
};
