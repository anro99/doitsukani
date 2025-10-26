import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Badge } from '../../../shared/components/ui/badge';
import { Alert, AlertDescription } from '../../../shared/components/ui/alert';
import {
    ItemStatusIndicator,
    SynonymBadges,
    PreviewLoadMore
} from '../../../shared/components/processing/ItemPreviewCard';

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

    // Error tracking
    errorItems?: Map<number, string>;
}

export const VocabularyPreview = ({
    previewVocabulary,
    currentLevelCount,
    currentLevelCountLoading = false,
    displayedPreviewCount = 12,
    isLoadingVocabulary = false,
    onLoadMore,
    errorItems = new Map()
}: VocabularyPreviewProps) => {
    // Helper function to get count info for preview display
    const getCountInfo = () => {
        if (currentLevelCountLoading) return 'Lade Count...';
        if (currentLevelCount !== undefined) return `${currentLevelCount} Vocabulary insgesamt`;
        return 'Count nicht verfügbar';
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
                            <SynonymBadges
                                label="Aktuelle Synonyme:"
                                synonyms={vocabulary.currentSynonyms}
                                variant="current"
                                emptyMessage="Keine Synonyme"
                            />

                            {/* Translated Synonyms (if completed) */}
                            {vocabulary.translatedSynonyms && vocabulary.translatedSynonyms.length > 0 && (
                                <>
                                    <SynonymBadges
                                        label="Übersetzte Synonyme:"
                                        synonyms={vocabulary.translatedSynonyms}
                                        variant="translated"
                                    />
                                    <div className="text-xs text-green-600 mt-1">
                                        {vocabulary.translatedSynonyms.join(', ')}
                                    </div>
                                </>
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
                            <ItemStatusIndicator
                                itemId={vocabulary.id}
                                translatedSynonyms={vocabulary.translatedSynonyms}
                                errorItems={errorItems}
                            />
                        </div>
                    ))}
                </div>

                {/* Show "Load More" button and statistics */}
                {onLoadMore && (
                    <PreviewLoadMore
                        displayedCount={displayedPreviewCount}
                        loadedCount={previewVocabulary.length}
                        totalCount={currentLevelCount}
                        isLoading={isLoadingVocabulary}
                        onLoadMore={onLoadMore}
                        itemType="Vocabulary"
                    />
                )}
            </CardContent>
        </Card>
    );
};
