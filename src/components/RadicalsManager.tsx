import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { getRadicals, getRadicalStudyMaterials } from '../lib/wanikani';
import { WKRadical, WKStudyMaterial } from '@bachmacintosh/wanikani-api-types';

interface Radical {
    id: number;
    meaning: string;
    characters?: string;
    level: number;
    currentSynonyms: string[];
    selected: boolean;
    translatedSynonyms?: string[];
}

type SynonymMode = 'replace' | 'add' | 'smart-merge';

interface ProcessResult {
    radical: Radical;
    status: 'success' | 'error' | 'processing';
    message?: string;
}

export const RadicalsManager: React.FC = () => {
    const [apiToken, setApiToken] = useState('');
    const [selectedLevel, setSelectedLevel] = useState<number | 'all'>(1);
    const [synonymMode, setSynonymMode] = useState<SynonymMode>('smart-merge');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress] = useState(0);
    const [results] = useState<ProcessResult[]>([]);

    // API Integration State
    const [wkRadicals, setWkRadicals] = useState<WKRadical[]>([]);
    const [studyMaterials, setStudyMaterials] = useState<WKStudyMaterial[]>([]);
    const [isLoadingRadicals, setIsLoadingRadicals] = useState(false);
    const [apiError, setApiError] = useState<string>('');

    // Load radicals from Wanikani API when token changes
    useEffect(() => {
        if (apiToken.trim()) {
            loadRadicalsFromAPI();
        } else {
            setWkRadicals([]);
            setStudyMaterials([]);
            setApiError('');
        }
    }, [apiToken]);

    // Convert Wanikani radicals to our internal format
    const convertToInternalFormat = (wkRadicals: WKRadical[], studyMaterials: WKStudyMaterial[]): Radical[] => {
        const studyMaterialsMap = new Map<number, WKStudyMaterial>();
        studyMaterials.forEach(sm => studyMaterialsMap.set(sm.data.subject_id, sm));

        return wkRadicals.map(radical => ({
            id: radical.id,
            meaning: radical.data.meanings[0]?.meaning || 'Unknown',
            characters: radical.data.characters || undefined,
            level: radical.data.level,
            currentSynonyms: studyMaterialsMap.get(radical.id)?.data.meaning_synonyms || [],
            selected: false,
            translatedSynonyms: []
        }));
    };

    // Load radicals from Wanikani API
    const loadRadicalsFromAPI = async () => {
        setIsLoadingRadicals(true);
        setApiError('');

        try {
            // Get radicals from Wanikani
            const radicals = await getRadicals(apiToken);

            // Get existing study materials for these radicals
            const subjectIds = radicals.map(r => r.id.toString()).join(',');
            const materials = await getRadicalStudyMaterials(apiToken, undefined, {
                subject_ids: subjectIds
            });

            setWkRadicals(radicals);
            setStudyMaterials(materials);

        } catch (error) {
            console.error('Error loading radicals:', error);
            setApiError('Fehler beim Laden der Radicals. Bitte überprüfen Sie Ihren API-Token.');
        } finally {
            setIsLoadingRadicals(false);
        }
    };

    // Convert and filter radicals based on level selection
    const getFilteredRadicalsByLevel = (): Radical[] => {
        if (!apiToken || wkRadicals.length === 0) {
            return []; // No radicals without API token or data
        }

        const internalRadicals = convertToInternalFormat(wkRadicals, studyMaterials);

        if (selectedLevel === 'all') {
            return internalRadicals;
        } else {
            return internalRadicals.filter(r => r.level === selectedLevel);
        }
    };

    const filteredRadicals = getFilteredRadicalsByLevel();

    const getModeDescription = (mode: SynonymMode): string => {
        switch (mode) {
            case 'replace':
                return 'Ersetzt alle vorhandenen Synonyme durch Übersetzungen';
            case 'add':
                return 'Fügt Übersetzungen zu vorhandenen Synonymen hinzu';
            case 'smart-merge':
                return 'Fügt nur neue Übersetzungen hinzu (keine Duplikate)';
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    🌸 Radicals Manager
                </h1>
                <p className="text-gray-600">
                    Verwalte und übersetze Wanikani Radicals mit DeepL
                </p>
            </div>

            {/* API Token Input */}
            <Card>
                <CardHeader>
                    <CardTitle>🔑 Wanikani API Token</CardTitle>
                </CardHeader>
                <CardContent>
                    <Input
                        type="password"
                        placeholder="Geben Sie Ihren Wanikani API Token ein..."
                        value={apiToken}
                        onChange={(e) => setApiToken(e.target.value)}
                        className="mb-4"
                        disabled={isLoadingRadicals}
                    />
                    <p className="text-sm text-gray-600">
                        Ihr Token wird nur lokal gespeichert und für API-Aufrufe verwendet.
                    </p>
                    {isLoadingRadicals && (
                        <div className="mt-2 text-sm text-blue-600">
                            🔄 Lade Radicals von Wanikani...
                        </div>
                    )}
                    {apiError && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            {apiError}
                        </div>
                    )}
                    {apiToken && wkRadicals.length > 0 && (
                        <div className="mt-2 text-sm text-green-600">
                            ✅ {wkRadicals.length} Radicals erfolgreich geladen
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Level Selection - Only show if we have data */}
            {apiToken && wkRadicals.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>📊 Level Auswahl</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Label htmlFor="level-select">Level auswählen:</Label>
                            <select
                                id="level-select"
                                value={selectedLevel}
                                onChange={(e) => setSelectedLevel(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                className="w-48 p-2 border rounded-md"
                                disabled={isLoadingRadicals}
                            >
                                <option value="all">Alle Level (1-60)</option>
                                {Array.from({ length: 60 }, (_, i) => i + 1).map(level => (
                                    <option key={level} value={level}>
                                        Level {level}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 mb-2">
                                Gefilterte Radicals: {filteredRadicals.length}
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {selectedLevel === 'all' ? (
                                    <Badge variant="secondary" className="text-xs">
                                        Alle Level ({filteredRadicals.length} Radicals)
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="text-xs">
                                        Level {selectedLevel} ({filteredRadicals.length} Radicals)
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Synonym Mode Selection - Only show if we have data */}
            {apiToken && wkRadicals.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>⚙️ Synonym Modus</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup
                            value={synonymMode}
                            onValueChange={(value: SynonymMode) => setSynonymMode(value)}
                            className="space-y-3"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="smart-merge" id="smart-merge" />
                                <Label htmlFor="smart-merge" className="cursor-pointer">
                                    <span className="font-medium">Smart Merge</span>
                                    <span className="text-sm text-gray-600 ml-2">
                                        (Empfohlen) - {getModeDescription('smart-merge')}
                                    </span>
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="add" id="add" />
                                <Label htmlFor="add" className="cursor-pointer">
                                    <span className="font-medium">Hinzufügen</span>
                                    <span className="text-sm text-gray-600 ml-2">
                                        - {getModeDescription('add')}
                                    </span>
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="replace" id="replace" />
                                <Label htmlFor="replace" className="cursor-pointer">
                                    <span className="font-medium">Ersetzen</span>
                                    <span className="text-sm text-gray-600 ml-2">
                                        - {getModeDescription('replace')}
                                    </span>
                                </Label>
                            </div>
                        </RadioGroup>
                    </CardContent>
                </Card>
            )}

            {/* Radicals Preview - Only show if we have data */}
            {apiToken && wkRadicals.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>👁️ Radicals Vorschau</CardTitle>
                        <p className="text-sm text-gray-600">
                            Zeigt die Radicals basierend auf Ihrer Level-Auswahl
                        </p>
                    </CardHeader>
                    <CardContent>
                        {filteredRadicals.length === 0 ? (
                            <Alert>
                                <AlertDescription>
                                    Keine Radicals für das ausgewählte Level gefunden. Wählen Sie ein anderes Level aus.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredRadicals.slice(0, 12).map(radical => (
                                    <div key={radical.id} className="p-4 border rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-2xl font-bold">
                                                {radical.characters || '🔸'}
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
                        )}
                        {filteredRadicals.length > 12 && (
                            <div className="mt-4 text-center text-sm text-gray-600">
                                ... und {filteredRadicals.length - 12} weitere Radicals
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Processing Controls - Only show if we have data */}
            {apiToken && wkRadicals.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>🚀 Verarbeitung starten</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-4">
                            <Button
                                onClick={() => setIsProcessing(true)}
                                disabled={!apiToken || filteredRadicals.length === 0 || isProcessing}
                                className="flex-1"
                            >
                                {isProcessing ? 'Verarbeitung läuft...' : 'Synonyme übersetzen und aktualisieren'}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setIsProcessing(false)}
                                disabled={!isProcessing}
                            >
                                Stoppen
                            </Button>
                        </div>

                        {isProcessing && (
                            <div className="space-y-2">
                                <Progress value={progress} className="w-full" />
                                <p className="text-sm text-gray-600 text-center">
                                    {progress}% abgeschlossen
                                </p>
                            </div>
                        )}

                        <div className="text-sm text-gray-600">
                            <p>📊 <strong>{filteredRadicals.length}</strong> Radicals werden verarbeitet</p>
                            <p>🎯 <strong>{synonymMode}</strong> Modus wird verwendet</p>
                            <p>🌐 Übersetzung nach <strong>Deutsch</strong></p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Results */}
            {results.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>📋 Ergebnisse</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {results.map((result, index) => (
                                <div
                                    key={index}
                                    className={`p-3 rounded-lg ${result.status === 'success'
                                            ? 'bg-green-50 border border-green-200'
                                            : result.status === 'error'
                                                ? 'bg-red-50 border border-red-200'
                                                : 'bg-blue-50 border border-blue-200'
                                        }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">
                                            {result.radical.meaning}
                                        </span>
                                        <Badge
                                            variant={
                                                result.status === 'success'
                                                    ? 'default'
                                                    : result.status === 'error'
                                                        ? 'destructive'
                                                        : 'secondary'
                                            }
                                        >
                                            {result.status}
                                        </Badge>
                                    </div>
                                    {result.message && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            {result.message}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Help text when no API token */}
            {!apiToken && (
                <Card>
                    <CardHeader>
                        <CardTitle>🌟 Erste Schritte</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center space-y-4">
                            <p className="text-gray-600">
                                Geben Sie Ihren Wanikani API-Token ein, um zu beginnen.
                            </p>
                            <div className="text-sm text-gray-500 space-y-2">
                                <p><strong>📋 So erhalten Sie Ihren API-Token:</strong></p>
                                <ol className="list-decimal list-inside space-y-1 text-left max-w-md mx-auto">
                                    <li>Besuchen Sie <a href="https://www.wanikani.com/settings/personal_access_tokens" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Wanikani API Tokens</a></li>
                                    <li>Klicken Sie auf "Generate a new token"</li>
                                    <li>Wählen Sie die Berechtigungen: "study_materials:create" und "study_materials:update"</li>
                                    <li>Klicken Sie auf "Generate token"</li>
                                    <li>Kopieren Sie den Token und fügen Sie ihn oben ein</li>
                                </ol>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
