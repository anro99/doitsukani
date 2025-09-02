import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';

interface Kanji {
    id: number;
    meaning: string;
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
    maxPreviewCount?: number;
}

export const KanjiPreview: React.FC<KanjiPreviewProps> = ({
    previewKanji,
    currentLevelCount,
    currentLevelCountLoading = false,
    maxPreviewCount = 12
}) => {
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
                        Zeigt die ersten {maxPreviewCount} Kanji basierend auf Ihrer Level-Auswahl
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
                    Zeigt die ersten {maxPreviewCount} Kanji basierend auf Ihrer Level-Auswahl
                </p>
                <p className="text-xs text-gray-500">
                    {getCountInfo()}
                </p>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {previewKanji.slice(0, maxPreviewCount).map((kanji: Kanji) => (
                        <div key={kanji.id} className="p-4 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl font-bold text-blue-600">
                                    {kanji.characters}
                                </span>
                                <div>
                                    <div className="font-medium">{kanji.meaning}</div>
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
                {(() => {
                    const showingCount = previewKanji.length;

                    if (currentLevelCount && currentLevelCount > showingCount) {
                        return (
                            <div className="mt-4 text-center text-sm text-gray-600">
                                ... und {currentLevelCount - showingCount} weitere Kanji
                            </div>
                        );
                    }
                    return null;
                })()}
            </CardContent>
        </Card>
    );
};
