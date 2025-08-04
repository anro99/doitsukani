import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';

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
    const [targetLanguage, setTargetLanguage] = useState('DE');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress] = useState(0);
    const [results] = useState<ProcessResult[]>([]);

    // Generate comprehensive mock data across all levels
    const generateMockRadicals = (): Radical[] => {
        const radicalsData = [
            // Level 1 Radicals
            { meaning: 'Ground', characters: '一', level: 1, synonyms: ['earth', 'floor'] },
            { meaning: 'Rice', characters: '米', level: 1, synonyms: ['grain', 'cereal'] },
            { meaning: 'Water', characters: '水', level: 1, synonyms: ['H2O', 'liquid'] },
            { meaning: 'Fire', characters: '火', level: 1, synonyms: ['flame', 'burn'] },
            { meaning: 'Tree', characters: '木', level: 1, synonyms: ['wood', 'plant'] },
            { meaning: 'Mouth', characters: '口', level: 1, synonyms: ['opening', 'entrance'] },

            // Level 2 Radicals
            { meaning: 'Big', characters: '大', level: 2, synonyms: ['large', 'huge'] },
            { meaning: 'Small', characters: '小', level: 2, synonyms: ['little', 'tiny'] },
            { meaning: 'Person', characters: '人', level: 2, synonyms: ['human', 'individual'] },
            { meaning: 'Hand', characters: '手', level: 2, synonyms: ['palm', 'finger'] },
            { meaning: 'Woman', characters: '女', level: 2, synonyms: ['female', 'lady'] },
            { meaning: 'Child', characters: '子', level: 2, synonyms: ['kid', 'offspring'] },
            { meaning: 'Spikes', characters: null, level: 2, synonyms: ['thorns', 'needles'] },

            // Level 3 Radicals
            { meaning: 'Sun', characters: '日', level: 3, synonyms: ['solar', 'day'] },
            { meaning: 'Moon', characters: '月', level: 3, synonyms: ['lunar', 'month'] },
            { meaning: 'Mountain', characters: '山', level: 3, synonyms: ['hill', 'peak'] },
            { meaning: 'River', characters: '川', level: 3, synonyms: ['stream', 'flow'] },
            { meaning: 'Field', characters: '田', level: 3, synonyms: ['farm', 'rice field'] },
            { meaning: 'Eye', characters: '目', level: 3, synonyms: ['vision', 'sight'] },
            { meaning: 'Umbrella', characters: null, level: 3, synonyms: ['parasol', 'shade'] },

            // Level 4-5 Radicals
            { meaning: 'Heart', characters: '心', level: 4, synonyms: ['mind', 'emotion'] },
            { meaning: 'Stone', characters: '石', level: 4, synonyms: ['rock', 'mineral'] },
            { meaning: 'Thread', characters: '糸', level: 4, synonyms: ['string', 'fiber'] },
            { meaning: 'Claw', characters: null, level: 4, synonyms: ['talon', 'nail'] },
            { meaning: 'Ear', characters: '耳', level: 5, synonyms: ['hearing', 'listen'] },
            { meaning: 'Grass', characters: '草', level: 5, synonyms: ['plant', 'herb'] },
            { meaning: 'Bamboo', characters: '竹', level: 5, synonyms: ['cane', 'shoot'] },
            { meaning: 'Roof', characters: null, level: 5, synonyms: ['ceiling', 'top'] },

            // Higher level examples
            { meaning: 'Treasure', characters: null, level: 8, synonyms: ['jewel', 'precious'] },
            { meaning: 'Metal', characters: '金', level: 10, synonyms: ['gold', 'mineral'] },
            { meaning: 'Rain', characters: '雨', level: 12, synonyms: ['precipitation', 'shower'] },
            { meaning: 'Leader', characters: null, level: 12, synonyms: ['boss', 'chief'] },
            { meaning: 'Wind', characters: '風', level: 15, synonyms: ['breeze', 'air'] },
            { meaning: 'Psychopath', characters: null, level: 15, synonyms: ['crazy', 'insane'] },
            { meaning: 'Horse', characters: '馬', level: 18, synonyms: ['stallion', 'mare'] },
            { meaning: 'Fish', characters: '魚', level: 20, synonyms: ['marine', 'aquatic'] },
            { meaning: 'Blackjack', characters: null, level: 20, synonyms: ['twenty-one', 'card game'] },
            { meaning: 'Bird', characters: '鳥', level: 25, synonyms: ['avian', 'fowl'] },
            { meaning: 'Wolverine', characters: null, level: 25, synonyms: ['badger', 'animal'] },
            { meaning: 'Squid', characters: null, level: 30, synonyms: ['octopus', 'tentacle'] }
        ];

        return radicalsData.map((radical, index) => ({
            id: index + 1,
            meaning: radical.meaning,
            characters: radical.characters || undefined,
            level: radical.level,
            currentSynonyms: radical.synonyms,
            selected: false,
            translatedSynonyms: [] // Will be filled by DeepL
        }));
    };

    const allMockRadicals = generateMockRadicals();

    // Filter radicals based on level selection - only if API token is provided
    const getFilteredRadicalsByLevel = (): Radical[] => {
        if (!apiToken) {
            return []; // No radicals without API token
        }

        if (selectedLevel === 'all') {
            return allMockRadicals;
        } else {
            return allMockRadicals.filter(r => r.level === selectedLevel);
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
                    />
                    <p className="text-sm text-gray-600">
                        Ihr Token wird nur lokal gespeichert und für API-Aufrufe verwendet.
                    </p>
                </CardContent>
            </Card>

            {/* Level Selection */}
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

            {/* Synonym Mode Selection */}
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

            {/* Language Selection */}
            <Card>
                <CardHeader>
                    <CardTitle>🌐 Zielsprache</CardTitle>
                </CardHeader>
                <CardContent>
                    <select
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value)}
                        className="w-full p-2 border rounded-md"
                    >
                        <option value="DE">Deutsch</option>
                        <option value="ES">Spanisch</option>
                        <option value="FR">Französisch</option>
                        <option value="IT">Italienisch</option>
                        <option value="PT">Portugiesisch</option>
                        <option value="RU">Russisch</option>
                        <option value="JA">Japanisch</option>
                        <option value="ZH">Chinesisch</option>
                    </select>
                </CardContent>
            </Card>

            {/* Radicals Preview */}
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
                                Keine Radicals für die ausgewählten Level gefunden. Wählen Sie andere Level aus.
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
                                                {radical.currentSynonyms.map((synonym, idx) => (
                                                    <Badge key={idx} variant="secondary" className="text-xs">
                                                        {synonym}
                                                    </Badge>
                                                ))}
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

            {/* Processing Controls */}
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
                        <p>🌐 Übersetzung nach <strong>{targetLanguage}</strong></p>
                    </div>
                </CardContent>
            </Card>

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
        </div>
    );
};
