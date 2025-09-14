import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { ProcessingPhase, CompleteProcessingResult, ProcessingStatistics } from '../lib/vocabulary-integration';

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

    // New integrated processing props
    currentPhase?: ProcessingPhase | null;
    processingResult?: CompleteProcessingResult | null;
    processingStatistics?: ProcessingStatistics | null;
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

    // New integrated processing props
    currentPhase,
    processingResult,
    processingStatistics
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
                        className={`flex-1 ${processingResult?.success
                                ? 'bg-green-600 hover:bg-green-700'
                                : processingResult && !processingResult.success
                                    ? 'bg-orange-600 hover:bg-orange-700'
                                    : ''
                            }`}
                        variant={processingResult ? "default" : "default"}
                    >
                        {isProcessing ? (
                            <>
                                {currentPhase?.phase === 'translation' && '🔄 Translating...'}
                                {currentPhase?.phase === 'upload' && '📤 Uploading...'}
                                {!currentPhase && 'Verarbeitung läuft...'}
                            </>
                        ) : processingResult ? (
                            <>
                                {processingResult.success ? '✅ Process Again' : '⚠️ Retry Processing'}
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
                        {isProcessing ? (
                            <>
                                {currentPhase?.phase === 'translation' && '⏹️ Stop Translation'}
                                {currentPhase?.phase === 'upload' && '⏹️ Stop Upload'}
                                {!currentPhase && '⏹️ Stoppen'}
                            </>
                        ) : (
                            'Stoppen'
                        )}
                    </Button>

                    {processingResult && !isProcessing && onClearResults && (
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
                        {/* Enhanced Phase-based Progress */}
                        {currentPhase && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    {currentPhase.phase === 'translation' && <span className="text-lg">🔄</span>}
                                    {currentPhase.phase === 'upload' && <span className="text-lg">📤</span>}
                                    <span className="text-sm font-medium text-gray-700">
                                        {currentPhase.phase === 'translation' ? 'Übersetzung läuft...' : 'Upload zu WaniKani...'}
                                    </span>
                                    <span className="text-xs text-gray-500 ml-auto">
                                        {currentPhase.status}
                                    </span>
                                </div>

                                <Progress value={currentPhase.progress} className="w-full" />

                                {currentPhase.currentItem && (
                                    <p className="text-xs text-gray-600 text-center">
                                        Verarbeite: <span className="font-mono">{currentPhase.currentItem}</span>
                                    </p>
                                )}

                                <p className="text-sm text-gray-600 text-center">
                                    {currentPhase.progress}% abgeschlossen
                                </p>
                            </div>
                        )}

                        {/* Fallback for non-integrated processing */}
                        {!currentPhase && (
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

                {/* Enhanced Statistics Display */}
                {processingStatistics && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <h4 className="text-sm font-medium text-purple-800 mb-2">📈 Processing Statistics</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs text-purple-700">
                            <div>✅ Success Rate: <strong>{processingStatistics.successRate.toFixed(1)}%</strong></div>
                            <div>⏱️ Time: <strong>{(processingStatistics.averageProcessingTime / 1000).toFixed(1)}s</strong></div>
                            <div>📝 Translated: <strong>{processingStatistics.totalTranslated}</strong></div>
                            <div>📤 Uploaded: <strong>{processingStatistics.totalUploaded}</strong></div>
                            <div>❌ Errors: <strong>{processingStatistics.totalErrors}</strong></div>
                            <div>🔢 Total: <strong>{processingStatistics.totalProcessed}</strong></div>
                        </div>
                    </div>
                )}

                {/* Processing Result Summary */}
                {processingResult && !isProcessing && (
                    <div className={`p-3 border rounded-lg ${processingResult.success
                            ? 'bg-green-50 border-green-200'
                            : 'bg-orange-50 border-orange-200'
                        }`}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{processingResult.success ? '✅' : '⚠️'}</span>
                            <h4 className={`text-sm font-medium ${processingResult.success ? 'text-green-800' : 'text-orange-800'
                                }`}>
                                Processing {processingResult.success ? 'Completed' : 'Completed with Errors'}
                            </h4>
                        </div>

                        <div className={`text-xs grid grid-cols-2 gap-2 ${processingResult.success ? 'text-green-700' : 'text-orange-700'
                            }`}>
                            <div>📊 Items: <strong>{processingResult.totalItems}</strong></div>
                            <div>⏱️ Time: <strong>{(processingResult.processingTime / 1000).toFixed(1)}s</strong></div>
                            <div>🔄 Translated: <strong>{processingResult.translationResults.successCount}</strong></div>
                            <div>📤 Uploaded: <strong>{processingResult.uploadResults.createdCount + processingResult.uploadResults.updatedCount}</strong></div>
                        </div>

                        {processingResult.uploadResults.errors.length > 0 && (
                            <div className="mt-2 text-xs text-red-600">
                                <summary className="cursor-pointer">❌ {processingResult.uploadResults.errors.length} Errors (click to expand)</summary>
                                <details className="mt-1">
                                    {processingResult.uploadResults.errors.slice(0, 3).map((error, idx) => (
                                        <div key={idx} className="text-xs text-red-500 pl-2">• {error}</div>
                                    ))}
                                    {processingResult.uploadResults.errors.length > 3 && (
                                        <div className="text-xs text-red-400 pl-2">... and {processingResult.uploadResults.errors.length - 3} more</div>
                                    )}
                                </details>
                            </div>
                        )}
                    </div>
                )}

                <div className="text-sm text-gray-600">
                    <p>📊 <strong>{filteredItemsCount}</strong> {itemType === 'kanji' ? 'Kanji' : itemType === 'vocabulary' ? 'Vocabulary' : 'Radicals'} werden verarbeitet</p>
                    <p>⚙️ <strong>{synonymMode}</strong> Modus wird verwendet</p>
                    <p>🇩🇪 Übersetzung nach <strong>Deutsch</strong></p>
                </div>
            </CardContent>
        </Card>
    );
};
