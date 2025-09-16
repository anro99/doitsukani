import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';

interface Vocabulary {
    id: number;
    primaryMeaning: string; // Primary meaning from WaniKani
    alternativeMeanings: string[]; // Alternative meanings from WaniKani
    characters: string;
    level: number;
    currentSynonyms: string[];
    selected: boolean;
    translatedSynonyms: string[];
    meaningMnemonic?: string;
    // Additional vocabulary-specific properties
    readings?: string[]; // Simplified for now to match hook interface
    partsOfSpeech?: string[]; // e.g., ["noun", "suru verb"]
    contextSentences?: Array<{
        en: string;
        ja: string;
    }>;
}

interface VocabularyPreviewProps {
    // Use preview vocabulary instead of filtered ones
    previewVocabulary: Vocabulary[];
    // Count information for preview display
    currentLevelCount?: number;
    currentLevelCountLoading?: boolean;
    // New props for "Load More" functionality
    displayedPreviewCount?: number;
    isLoadingVocabulary?: boolean;
    onLoadMore?: () => void;

    // Live update props (Phase 2)
    processingItems?: Set<number>;
    errorItems?: Map<number, string>;
}

export const VocabularyPreview = ({
    previewVocabulary,
    currentLevelCount,
    currentLevelCountLoading = false,
    displayedPreviewCount = 12,
    isLoadingVocabulary = false,
    onLoadMore,
    processingItems = new Set(),
    errorItems = new Map()
}: VocabularyPreviewProps) => {
    // Helper function to get count info for preview display
    const getCountInfo = () => {
        if (currentLevelCountLoading) return 'Lade Count...';
        if (currentLevelCount !== undefined) return `${currentLevelCount} Vocabulary insgesamt`;
        return 'Count nicht verfügbar';
    };

    // Helper function to determine item status for live updates
    const getItemStatus = (vocabulary: Vocabulary) => {
        const hasError = errorItems.has(vocabulary.id);
        const isProcessing = processingItems.has(vocabulary.id);
        const isCompleted = vocabulary.translatedSynonyms && vocabulary.translatedSynonyms.length > 0;

        // Priority: error > processing > completed > default
        if (hasError) {
            return {
                type: 'error' as const,
                message: errorItems.get(vocabulary.id) || 'Unknown error'
            };
        }
        if (isProcessing) {
            return { type: 'processing' as const };
        }
        if (isCompleted) {
            return { type: 'completed' as const };
        }
        return { type: 'default' as const };
    };

    // Helper function to render status indicator
    const renderStatusIndicator = (vocabulary: Vocabulary) => {
        const status = getItemStatus(vocabulary);

        switch (status.type) {
            case 'error':
                return (
                    <div
                        className="flex items-center gap-1 text-red-500 text-xs mt-2"
                        data-testid={`error-indicator-${vocabulary.id}`}
                        role="alert"
                        aria-label={`Processing failed: ${status.message}`}
                    >
                        <span className="text-red-500">❌</span>
                        <span className="break-words">{status.message}</span>
                    </div>
                );
            case 'processing':
                return (
                    <div
                        className="flex items-center gap-1 text-blue-500 text-xs mt-2"
                        data-testid={`processing-indicator-${vocabulary.id}`}
                        role="status"
                        aria-label="Currently processing"
                    >
                        <span className="animate-spin text-blue-500">⟳</span>
                        <span>Processing...</span>
                    </div>
                );
            case 'completed':
                return (
                    <div
                        className="flex items-center gap-1 text-green-500 text-xs mt-2"
                        data-testid={`completed-indicator-${vocabulary.id}`}
                    >
                        <span className="text-green-500">✅</span>
                        <span>Completed</span>
                    </div>
                );
            default:
                return null;
        }
    };

    // Helper function to format readings
    const formatReadings = (readings?: Vocabulary['readings']) => {
        if (!readings || readings.length === 0) return null;

        return (
            <div className="text-xs text-gray-600 mt-1">
                <span className="font-medium">Readings: </span>
                {readings.map((reading, idx) => (
                    <span key={idx}>
                        {reading}
                        {idx < readings.length - 1 ? ', ' : ''}
                    </span>
                ))}
            </div>
        );
    };

    // Helper function to format parts of speech
    const formatPartsOfSpeech = (partsOfSpeech?: string[]) => {
        if (!partsOfSpeech || partsOfSpeech.length === 0) return null;

        return (
            <div className="flex flex-wrap gap-1 mt-1">
                {partsOfSpeech.map((pos, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        {pos}
                    </Badge>
                ))}
            </div>
        );
    };

    if (previewVocabulary.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>📚 Vocabulary Vorschau</CardTitle>
                    <p className="text-sm text-gray-600">
                        Zeigt die ersten {displayedPreviewCount} Vocabulary basierend auf Ihrer Level-Auswahl
                    </p>
                    <p className="text-xs text-gray-500">
                        {getCountInfo()}
                    </p>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <AlertDescription>
                            Keine Vocabulary für das ausgewählte Level gefunden. Wählen Sie ein anderes Level aus.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>📚 Vocabulary Vorschau</CardTitle>
                <p className="text-sm text-gray-600">
                    Zeigt {Math.min(displayedPreviewCount, previewVocabulary.length)} von {previewVocabulary.length} geladenen Vocabulary
                </p>
                <p className="text-xs text-gray-500">
                    {getCountInfo()}
                </p>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {previewVocabulary.slice(0, displayedPreviewCount).map((vocabulary: Vocabulary) => (
                        <div
                            key={vocabulary.id}
                            className="p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-indigo-50"
                            data-testid={`vocabulary-card-${vocabulary.id}`}
                        >
                            <div className="flex items-start gap-3 mb-3">
                                <span className="text-2xl font-bold text-purple-600 min-w-fit">
                                    {vocabulary.characters}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 break-words">
                                        {vocabulary.primaryMeaning}
                                    </div>
                                    {vocabulary.alternativeMeanings && vocabulary.alternativeMeanings.length > 0 && (
                                        <div className="text-xs text-gray-500 mt-1 break-words">
                                            Alt: {vocabulary.alternativeMeanings.join(', ')}
                                        </div>
                                    )}
                                    {formatReadings(vocabulary.readings)}
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline" className="text-xs">
                                            Level {vocabulary.level}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Parts of Speech */}
                            {formatPartsOfSpeech(vocabulary.partsOfSpeech)}

                            {/* Current Synonyms */}
                            <div className="text-sm text-gray-600 mt-3">
                                <div className="mb-1">
                                    <span className="font-medium">Aktuelle Synonyme:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {vocabulary.currentSynonyms.length > 0 ? vocabulary.currentSynonyms.map((synonym: string, idx: number) => (
                                            <Badge key={idx} variant="secondary" className="text-xs">
                                                {synonym}
                                            </Badge>
                                        )) : (
                                            <span className="text-xs text-gray-400 italic">Keine Synonyme</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Translated Synonyms (if completed) */}
                            {vocabulary.translatedSynonyms && vocabulary.translatedSynonyms.length > 0 && (
                                <div className="text-sm text-gray-600 mt-3">
                                    <div className="mb-1">
                                        <span className="font-medium text-green-700">Übersetzte Synonyme:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {vocabulary.translatedSynonyms.map((synonym: string, idx: number) => (
                                                <Badge key={idx} variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">
                                                    {synonym}
                                                </Badge>
                                            ))}
                                        </div>
                                        <div className="text-xs text-green-600 mt-1">
                                            {vocabulary.translatedSynonyms.join(', ')}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Context Sentences Preview */}
                            {vocabulary.contextSentences && vocabulary.contextSentences.length > 0 && (
                                <div className="mt-2 p-2 bg-white/60 rounded text-xs">
                                    <div className="font-medium text-gray-700 mb-1">Context:</div>
                                    <div className="text-gray-600">
                                        <div className="font-medium">{vocabulary.contextSentences[0].ja}</div>
                                        <div className="text-gray-500">{vocabulary.contextSentences[0].en}</div>
                                    </div>
                                    {vocabulary.contextSentences.length > 1 && (
                                        <div className="text-gray-400 mt-1">
                                            +{vocabulary.contextSentences.length - 1} weitere Beispiele
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Live Status Indicator (Phase 2) */}
                            {renderStatusIndicator(vocabulary)}
                        </div>
                    ))}
                </div>

                {/* Show "Load More" button and statistics */}
                <div className="mt-4 space-y-2">
                    {/* Load More Button */}
                    {onLoadMore && (
                        <div className="text-center">
                            {displayedPreviewCount < previewVocabulary.length ? (
                                <Button
                                    onClick={onLoadMore}
                                    disabled={isLoadingVocabulary}
                                    variant="outline"
                                    className="w-full md:w-auto"
                                >
                                    {isLoadingVocabulary ? 'Lädt...' : `Weitere 12 Vocabulary anzeigen (${previewVocabulary.length - displayedPreviewCount} verbleibend)`}
                                </Button>
                            ) : previewVocabulary.length >= displayedPreviewCount && currentLevelCount && currentLevelCount > previewVocabulary.length ? (
                                <Button
                                    onClick={onLoadMore}
                                    disabled={isLoadingVocabulary}
                                    variant="outline"
                                    className="w-full md:w-auto"
                                >
                                    {isLoadingVocabulary ? 'Lädt weitere Vocabulary...' : `Weitere Vocabulary laden (${currentLevelCount - previewVocabulary.length} im Level verfügbar)`}
                                </Button>
                            ) : null}
                        </div>
                    )}

                    {/* Statistics display */}
                    {(() => {
                        const showingCount = Math.min(displayedPreviewCount, previewVocabulary.length);

                        return (
                            <div className="text-center text-sm text-gray-600 space-y-1">
                                <div>
                                    Angezeigt: {showingCount} von {previewVocabulary.length} geladenen Vocabulary
                                </div>
                                {currentLevelCount && currentLevelCount > previewVocabulary.length && (
                                    <div className="text-xs text-gray-500">
                                        ({currentLevelCount - previewVocabulary.length} weitere Vocabulary im Level verfügbar)
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </CardContent>
        </Card>
    );
};
