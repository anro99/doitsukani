import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';

interface Kanji {
    id: number;
    primaryMeaning: string; // Primary meaning from WaniKani
    alternativeMeanings: string[]; // Alternative meanings from WaniKani
    characters: string;
    level: number;
    currentSynonyms: string[];
    selected: boolean;
    translatedSynonyms: string[];
    meaningMnemonic?: string;
}

interface KanjiPreviewProps {
    // Use preview kanji instead of filtered ones
    previewKanji: Kanji[];
    // Count information for preview display
    currentLevelCount?: number;
    currentLevelCountLoading?: boolean;
    // New props for "Load More" functionality
    displayedPreviewCount?: number;
    isLoadingKanji?: boolean;
    onLoadMore?: () => void;
}

export const KanjiPreview = ({
    previewKanji,
    currentLevelCount,
    currentLevelCountLoading = false,
    displayedPreviewCount = 12,
    isLoadingKanji = false,
    onLoadMore
}: KanjiPreviewProps) => {
    // Helper function to get count info for preview display
    const getCountInfo = () => {
        if (currentLevelCountLoading) return 'Lade Count...';
        if (currentLevelCount !== undefined) return `${currentLevelCount} Kanji insgesamt`;
        return 'Count nicht verfügbar';
    };

    if (previewKanji.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>👀 Kanji Vorschau</CardTitle>
                    <p className="text-sm text-gray-600">
                        Zeigt die ersten {displayedPreviewCount} Kanji basierend auf Ihrer Level-Auswahl
                    </p>
                    <p className="text-xs text-gray-500">
                        {getCountInfo()}
                    </p>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <AlertDescription>
                            Keine Kanji für das ausgewählte Level gefunden. Wählen Sie ein anderes Level aus.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>👀 Kanji Vorschau</CardTitle>
                <p className="text-sm text-gray-600">
                    Zeigt {Math.min(displayedPreviewCount, previewKanji.length)} von {previewKanji.length} geladenen Kanji
                </p>
                <p className="text-xs text-gray-500">
                    {getCountInfo()}
                </p>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {previewKanji.slice(0, displayedPreviewCount).map((kanji: Kanji) => (
                        <div key={kanji.id} className="p-4 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl font-bold text-blue-600">
                                    {kanji.characters}
                                </span>
                                <div>
                                    <div className="font-medium">{kanji.primaryMeaning}</div>
                                    {kanji.alternativeMeanings && kanji.alternativeMeanings.length > 0 && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            Alt: {kanji.alternativeMeanings.join(', ')}
                                        </div>
                                    )}
                                    <Badge variant="outline" className="text-xs">
                                        Level {kanji.level}
                                    </Badge>
                                </div>
                            </div>
                            <div className="text-sm text-gray-600">
                                <div className="mb-1">
                                    <span className="font-medium">Aktuelle Synonyme:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {kanji.currentSynonyms.length > 0 ? kanji.currentSynonyms.map((synonym: string, idx: number) => (
                                            <Badge key={idx} variant="secondary" className="text-xs">
                                                {synonym}
                                            </Badge>
                                        )) : (
                                            <span className="text-xs text-gray-400 italic">Keine Synonyme</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Show "Load More" button and statistics */}
                <div className="mt-4 space-y-2">
                    {/* Load More Button */}
                    {onLoadMore && (
                        <div className="text-center">
                            {displayedPreviewCount < previewKanji.length ? (
                                <Button
                                    onClick={onLoadMore}
                                    disabled={isLoadingKanji}
                                    variant="outline"
                                    className="w-full md:w-auto"
                                >
                                    {isLoadingKanji ? 'Lädt...' : `Weitere 12 Kanji anzeigen (${previewKanji.length - displayedPreviewCount} verbleibend)`}
                                </Button>
                            ) : previewKanji.length >= displayedPreviewCount && currentLevelCount && currentLevelCount > previewKanji.length ? (
                                <Button
                                    onClick={onLoadMore}
                                    disabled={isLoadingKanji}
                                    variant="outline"
                                    className="w-full md:w-auto"
                                >
                                    {isLoadingKanji ? 'Lädt weitere Kanji...' : `Weitere Kanji laden (${currentLevelCount - previewKanji.length} im Level verfügbar)`}
                                </Button>
                            ) : null}
                        </div>
                    )}

                    {/* Statistics display */}
                    {(() => {
                        const showingCount = Math.min(displayedPreviewCount, previewKanji.length);

                        return (
                            <div className="text-center text-sm text-gray-600 space-y-1">
                                <div>
                                    Angezeigt: {showingCount} von {previewKanji.length} geladenen Kanji
                                </div>
                                {currentLevelCount && currentLevelCount > previewKanji.length && (
                                    <div className="text-xs text-gray-500">
                                        ({currentLevelCount - previewKanji.length} weitere Kanji im Level verfügbar)
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
