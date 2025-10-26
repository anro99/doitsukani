import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Badge } from '../../../shared/components/ui/badge';
import { Alert, AlertDescription } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';

interface Radical {
    id: number;
    meaning: string;
    characters: string | null;
    level: number;
    currentSynonyms: string[];
    selected: boolean;
    translatedSynonyms: string[];
    meaningMnemonic?: string;
}

interface RadicalPreviewProps {
    // Use preview radicals instead of filtered ones
    previewRadicals: Radical[];
    // Count information for preview display
    currentLevelCount?: number;
    currentLevelCountLoading?: boolean;
    displayedPreviewCount?: number;
    isLoadingRadicals?: boolean;
    onLoadMore?: () => void;
}

export const RadicalPreview = ({
    previewRadicals,
    currentLevelCount,
    currentLevelCountLoading = false,
    displayedPreviewCount = 12,
    isLoadingRadicals = false,
    onLoadMore
}: RadicalPreviewProps) => {
    // Helper function to get count info for preview display
    const getCountInfo = () => {
        if (currentLevelCountLoading) return 'Lade Count...';
        if (currentLevelCount !== undefined) return `${currentLevelCount} Radikale insgesamt`;
        return 'Count nicht verfügbar';
    };

    if (previewRadicals.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>👀 Radicals Vorschau</CardTitle>
                    <p className="text-sm text-gray-600">
                        Zeigt die ersten {displayedPreviewCount} Radicals basierend auf Ihrer Level-Auswahl
                    </p>
                    <p className="text-xs text-gray-500">
                        {getCountInfo()}
                    </p>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <AlertDescription>
                            Keine Radicals für das ausgewählte Level gefunden. Wählen Sie ein anderes Level aus.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>👀 Radicals Vorschau</CardTitle>
                <p className="text-sm text-gray-600">
                    Zeigt die ersten {displayedPreviewCount} Radicals basierend auf Ihrer Level-Auswahl
                </p>
                <p className="text-xs text-gray-500">
                    {getCountInfo()}
                </p>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {previewRadicals.slice(0, displayedPreviewCount).map((radical: Radical) => (
                        <div key={radical.id} className="p-4 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl font-bold">
                                    {radical.characters || ''}
                                </span>
                                <div>
                                    <div className="font-medium">{radical.meaning}</div>
                                    <Badge variant="outline" className="text-xs">
                                        Level {radical.level}
                                    </Badge>
                                </div>
                            </div>
                            <div className="text-sm text-gray-600">
                                <div className="mb-1">
                                    <span className="font-medium">Aktuelle Synonyme:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {radical.currentSynonyms.length > 0 ? radical.currentSynonyms.map((synonym: string, idx: number) => (
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

                {/* Load More Button */}
                {onLoadMore && (
                    <div className="text-center mt-4">
                        {displayedPreviewCount < previewRadicals.length ? (
                            <Button
                                onClick={onLoadMore}
                                disabled={isLoadingRadicals}
                                variant="outline"
                            >
                                {isLoadingRadicals
                                    ? 'Lädt...'
                                    : `Weitere 12 Radicals anzeigen (${previewRadicals.length - displayedPreviewCount} verbleibend)`}
                            </Button>
                        ) : previewRadicals.length >= displayedPreviewCount &&
                          currentLevelCount &&
                          currentLevelCount > previewRadicals.length ? (
                            <Button
                                onClick={onLoadMore}
                                disabled={isLoadingRadicals}
                                variant="outline"
                            >
                                {isLoadingRadicals
                                    ? 'Lädt weitere Radicals...'
                                    : `Weitere Radicals laden (${currentLevelCount - previewRadicals.length} im Level verfügbar)`}
                            </Button>
                        ) : null}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
