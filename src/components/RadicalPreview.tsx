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
    filteredRadicals: Radical[];
    maxPreviewCount?: number;
}

export const RadicalPreview: React.FC<RadicalPreviewProps> = ({
    filteredRadicals,
    maxPreviewCount = 12
}) => {
    if (filteredRadicals.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>👀 Radicals Vorschau</CardTitle>
                    <p className="text-sm text-gray-600">
                        Zeigt die Radicals basierend auf Ihrer Level-Auswahl
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
                    Zeigt die Radicals basierend auf Ihrer Level-Auswahl
                </p>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredRadicals.slice(0, maxPreviewCount).map(radical => (
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
                                        {radical.currentSynonyms.length > 0 ? radical.currentSynonyms.map((synonym, idx) => (
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
                {filteredRadicals.length > maxPreviewCount && (
                    <div className="mt-4 text-center text-sm text-gray-600">
                        ... und {filteredRadicals.length - maxPreviewCount} weitere Radicals
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
