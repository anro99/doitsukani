import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';

interface Radical {
    id: number;
    meaning: string;
    characters?: string;
    level: number;
    currentSynonyms: string[];
    selected: boolean;
    translatedSynonyms: string[];
    meaningMnemonic?: string;
}

interface RadicalPreviewProps {
    // Use preview radicals instead of filtered ones
    previewRadicals: Radical[];
    // selectedLevel: number | 'all'; // Not needed anymore
    // Simplified count information - only current level
    currentLevelCount?: number;
    currentLevelCountLoading?: boolean;
    maxPreviewCount?: number;
}

export const RadicalPreview: React.FC<RadicalPreviewProps> = ({
    previewRadicals,
    // selectedLevel, // Not used anymore - count is passed directly
    currentLevelCount,
    currentLevelCountLoading = false,
    maxPreviewCount = 12
}) => {
    // Simplified helper function to get count info
    const getCountInfo = () => {
        if (currentLevelCountLoading) return 'Lade Count...';
        if (currentLevelCount !== undefined) return `${currentLevelCount} Radikale insgesamt`;
        return 'Count nicht verfügbar';
    }; if (previewRadicals.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>👀 Radicals Vorschau</CardTitle>
                    <p className="text-sm text-gray-600">
                        Zeigt die ersten {maxPreviewCount} Radicals basierend auf Ihrer Level-Auswahl
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
                    Zeigt die ersten {maxPreviewCount} Radicals basierend auf Ihrer Level-Auswahl
                </p>
                <p className="text-xs text-gray-500">
                    {getCountInfo()}
                </p>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {previewRadicals.slice(0, maxPreviewCount).map((radical: Radical) => {
                        // Check if this radical has been translated (has German synonyms)
                        const hasGermanSynonyms = radical.currentSynonyms.some(synonym =>
                            /[äöüß]|(\b(der|die|das|ein|eine|und|oder|mit|von|zu|auf|in|an|bei|für|durch|über|unter|nach|vor|ohne|gegen|zwischen|während|seit|bis|wegen|trotz|innerhalb|außerhalb|aufgrund|anstatt|statt|anhand|mittels|dank|laut|gemäß|entsprechend|bezüglich|hinsichtlich|zwecks)\b)/i.test(synonym)
                        );

                        return (
                            <div key={radical.id} className={`p-4 border rounded-lg ${hasGermanSynonyms ? 'border-green-200 bg-green-50' : ''}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl font-bold">
                                        {radical.characters || ''}
                                    </span>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <div className="font-medium">{radical.meaning}</div>
                                            {hasGermanSynonyms && (
                                                <Badge variant="default" className="text-xs bg-green-600">
                                                    ✅ Übersetzt
                                                </Badge>
                                            )}
                                        </div>
                                        <Badge variant="outline" className="text-xs mt-1">
                                            Level {radical.level}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-600">
                                    <div className="mb-1">
                                        <span className="font-medium">Aktuelle Synonyme:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {radical.currentSynonyms.length > 0 ? radical.currentSynonyms.map((synonym: string, idx: number) => {
                                                // Highlight German synonyms
                                                const isGerman = /[äöüß]|(\b(der|die|das|ein|eine|und|oder|mit|von|zu|auf|in|an|bei|für|durch|über|unter|nach|vor|ohne|gegen|zwischen|während|seit|bis|wegen|trotz|innerhalb|außerhalb|aufgrund|anstatt|statt|anhand|mittels|dank|laut|gemäß|entsprechend|bezüglich|hinsichtlich|zwecks)\b)/i.test(synonym);
                                                return (
                                                    <Badge
                                                        key={idx}
                                                        variant={isGerman ? "default" : "secondary"}
                                                        className={`text-xs ${isGerman ? 'bg-green-100 text-green-800 border-green-300' : ''}`}
                                                    >
                                                        {synonym}
                                                    </Badge>
                                                );
                                            }) : (
                                                <span className="text-xs text-gray-400 italic">Keine Synonyme</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {(() => {
                    const showingCount = previewRadicals.length;

                    if (currentLevelCount && currentLevelCount > showingCount) {
                        return (
                            <div className="mt-4 text-center text-sm text-gray-600">
                                ... und {currentLevelCount - showingCount} weitere Radicals
                            </div>
                        );
                    }
                    return null;
                })()}
            </CardContent>
        </Card>
    );
};
