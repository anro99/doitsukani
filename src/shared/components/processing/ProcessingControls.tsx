import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';

// ============================================================================
// Generic Types for Processing Controls
// ============================================================================

export interface UploadStats {
    created: number;
    updated: number;
    failed: number;
    skipped: number;
    successful: number;
}

export interface StreamingProcessingPhase {
    translationPhase: {
        status: string;
        progress: number;
    };
    uploadPhase: {
        status: string;
        progress: number;
    };
    overallPhase: {
        status: string;
        progress: number;
        currentItem?: string;
    };
}

export interface StreamingCompleteProcessingResult {
    success: boolean;
    wasStopped?: boolean;
    totalItems: number;
    translationCount: number;
    uploadCount: number;
    errorCount: number;
    processingTime: number;
    phases?: any[];
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
    onClearResults?: () => void;
    itemType: 'radicals' | 'kanji' | 'vocabulary';

    // Streaming processing props
    streamingPhases?: StreamingProcessingPhase | null;
    streamingResult?: StreamingCompleteProcessingResult | null;

    // Error handling
    errorItems?: Map<number, string>;
    onClearErrors?: () => void;
}

// ============================================================================
// Shared ProcessingControls Component
// ============================================================================

/**
 * Shared ProcessingControls component für Vocabulary, Kanji und Radicals.
 * 
 * Features:
 * - Dual Progress Bars (Translation + Upload)
 * - Stop/Error/Success State Unterscheidung
 * - Error Details mit Show More/Less
 * - Clear Results Button
 * - Responsive UI mit TailwindCSS
 */
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
    itemType,

    // Streaming processing props
    streamingPhases,
    streamingResult,

    // Error handling
    errorItems,
    onClearErrors
}: ProcessingControlsProps) => {
    const [showErrorDetails, setShowErrorDetails] = useState(false);

    const canStart = apiToken &&
        (synonymMode === 'delete' || deeplToken) &&
        filteredItemsCount > 0 &&
        !isProcessing;

    // Item type display name
    const itemTypeName = itemType === 'kanji' ? 'Kanji' : itemType === 'vocabulary' ? 'Vocabulary' : 'Radicals';

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
                        className={`flex-1 ${streamingResult?.wasStopped
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : streamingResult?.success
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
                                {streamingResult.wasStopped
                                    ? '▶️ Continue Processing'
                                    : streamingResult.success ? '✅ Process Again' : '⚠️ Retry Processing'}
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
                        {/* Dual Progress Bars */}
                        {streamingPhases && (
                            <div className="space-y-4">
                                {/* Translation Progress */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🔄</span>
                                        <span className="text-sm font-medium text-blue-700">Translation</span>
                                        <span className="text-xs text-gray-500 ml-auto">
                                            {streamingPhases.translationPhase.status}
                                        </span>
                                    </div>
                                    <Progress
                                        value={streamingPhases.translationPhase.progress}
                                        className="w-full bg-blue-100"
                                    />
                                    <p className="text-xs text-blue-600 text-center">
                                        {streamingPhases.translationPhase.progress}% translated
                                    </p>
                                </div>

                                {/* Upload Progress */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">📤</span>
                                        <span className="text-sm font-medium text-green-700">Upload</span>
                                        <span className="text-xs text-gray-500 ml-auto">
                                            {streamingPhases.uploadPhase.status}
                                        </span>
                                    </div>
                                    <Progress
                                        value={streamingPhases.uploadPhase.progress}
                                        className="w-full bg-green-100"
                                    />
                                    <p className="text-xs text-green-600 text-center">
                                        {streamingPhases.uploadPhase.progress}% uploaded
                                    </p>
                                </div>

                                {/* Current Item */}
                                {streamingPhases.overallPhase.currentItem && (
                                    <p className="text-xs text-gray-600 text-center">
                                        Verarbeite: <span className="font-mono font-bold">{streamingPhases.overallPhase.currentItem}</span>
                                    </p>
                                )}

                                {/* Overall Progress */}
                                <div className="pt-2 border-t border-gray-200">
                                    <p className="text-sm text-gray-700 text-center">
                                        Gesamt: {streamingPhases.overallPhase.progress}% abgeschlossen
                                    </p>
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
                    <div className={`p-3 border rounded-lg ${streamingResult.wasStopped
                        ? 'bg-blue-50 border-blue-200'
                        : streamingResult.success
                            ? 'bg-green-50 border-green-200'
                            : 'bg-orange-50 border-orange-200'
                        }`}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🚀</span>
                            <span className="text-lg">{
                                streamingResult.wasStopped
                                    ? '⏹️'
                                    : streamingResult.success ? '✅' : '⚠️'
                            }</span>
                            <h4 className={`text-sm font-medium ${streamingResult.wasStopped
                                ? 'text-blue-800'
                                : streamingResult.success ? 'text-green-800' : 'text-orange-800'
                                }`}>
                                {streamingResult.wasStopped
                                    ? 'Processing Stopped by User'
                                    : `Streaming Processing ${streamingResult.success ? 'Completed' : 'Completed with Errors'}`
                                }
                            </h4>
                        </div>

                        <div className={`text-xs grid grid-cols-2 gap-2 ${streamingResult.wasStopped
                            ? 'text-blue-700'
                            : streamingResult.success ? 'text-green-700' : 'text-orange-700'
                            }`}>
                            <div>📊 Items: <strong>{streamingResult.totalItems}</strong></div>
                            <div>⏱️ Time: <strong>{(streamingResult.processingTime / 1000).toFixed(1)}s</strong></div>
                            <div>🔄 Translated: <strong>{streamingResult.translationCount}</strong></div>
                            <div>📤 Uploaded: <strong>{streamingResult.uploadCount}</strong></div>
                            <div>❌ Errors: <strong>{streamingResult.errorCount}</strong></div>
                        </div>

                        {streamingResult.errorCount > 0 && (
                            <div className="mt-2 text-xs text-red-600">
                                <div>❌ {streamingResult.errorCount} items had processing errors</div>
                            </div>
                        )}
                    </div>
                )}

                {/* Error Details Section */}
                {errorItems && errorItems.size > 0 && (
                    <div className="mt-4 p-4 border rounded-lg bg-red-50" data-testid="error-details">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-red-700">Processing Errors</h4>
                            <button
                                onClick={onClearErrors}
                                className="text-xs text-red-600 hover:text-red-800 underline"
                                data-testid="clear-errors-button"
                            >
                                Clear Errors
                            </button>
                        </div>
                        <div className="space-y-1" data-testid="error-items-details">
                            {Array.from(errorItems.entries())
                                .slice(0, showErrorDetails ? errorItems.size : 5)
                                .map(([id, error]) => (
                                    <div key={id} className="text-xs text-red-600 bg-white p-2 rounded border">
                                        {`Item ${id}: ${error}`}
                                    </div>
                                ))}
                            {errorItems.size > 5 && (
                                <div className="text-center">
                                    <button
                                        onClick={() => setShowErrorDetails(!showErrorDetails)}
                                        className="text-xs text-red-700 hover:text-red-900 underline"
                                        data-testid="show-more-errors"
                                    >
                                        {showErrorDetails
                                            ? 'Show Less'
                                            : `... and ${errorItems.size - 5} more errors`
                                        }
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="text-sm text-gray-600">
                    <p>📊 <strong>{filteredItemsCount}</strong> {itemTypeName} werden verarbeitet</p>
                    <p>⚙️ <strong>{synonymMode}</strong> Modus wird verwendet</p>
                    <p>🇩🇪 Übersetzung nach <strong>Deutsch</strong></p>
                </div>
            </CardContent>
        </Card>
    );
};
