import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { getRadicals, getRadicalStudyMaterials, createRadicalSynonyms, updateRadicalSynonyms } from '../lib/wanikani';
import { WKRadical, WKStudyMaterial } from '@bachmacintosh/wanikani-api-types';
import { translateText } from '../lib/deepl';

interface Radical {
    id: number;
    meaning: string;
    characters?: string;
    level: number;
    currentSynonyms: string[];
    selected: boolean;
    translatedSynonyms?: string[];
}

type SynonymMode = 'replace' | 'smart-merge' | 'delete';

interface ProcessResult {
    radical: Radical;
    status: 'success' | 'error' | 'processing' | 'translated' | 'uploaded';
    message?: string;
    originalSynonyms?: string[];
    newSynonyms?: string[];
}

export const RadicalsManager: React.FC = () => {
    const [apiToken, setApiToken] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('wanikani-api-token') || '';
        }
        return '';
    });
    const [deeplToken, setDeeplToken] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('deepl-api-token') || '';
        }
        return '';
    });
    const [selectedLevel, setSelectedLevel] = useState<number | 'all'>(1);
    const [synonymMode, setSynonymMode] = useState<SynonymMode>('smart-merge');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<ProcessResult[]>([]);
    const [translationStatus, setTranslationStatus] = useState('');
    const [uploadStatus, setUploadStatus] = useState('');
    const [uploadStats, setUploadStats] = useState({ created: 0, updated: 0, failed: 0 });

    // API Integration State
    const [wkRadicals, setWkRadicals] = useState<WKRadical[]>([]);
    const [studyMaterials, setStudyMaterials] = useState<WKStudyMaterial[]>([]);
    const [isLoadingRadicals, setIsLoadingRadicals] = useState(false);
    const [apiError, setApiError] = useState<string>('');

    // Handle API token changes with localStorage persistence
    const handleApiTokenChange = (token: string) => {
        setApiToken(token);
        if (typeof window !== 'undefined') {
            if (token.trim()) {
                localStorage.setItem('wanikani-api-token', token);
            } else {
                localStorage.removeItem('wanikani-api-token');
            }
        }
    };

    // Handle DeepL token changes with localStorage persistence
    const handleDeeplTokenChange = (token: string) => {
        setDeeplToken(token);
        if (typeof window !== 'undefined') {
            if (token.trim()) {
                localStorage.setItem('deepl-api-token', token);
            } else {
                localStorage.removeItem('deepl-api-token');
            }
        }
    };

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
        studyMaterials?.forEach(sm => {
            if (sm?.data?.subject_id) {
                studyMaterialsMap.set(sm.data.subject_id, sm);
            }
        });

        return wkRadicals.map(radical => ({
            id: radical.id,
            meaning: radical.data.meanings[0]?.meaning || 'Unknown',
            characters: radical.data.characters || undefined,
            level: radical.data.level,
            currentSynonyms: studyMaterialsMap.get(radical.id)?.data.meaning_synonyms || [],
            selected: true,
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

    // 🔧 FIX: Refresh study materials to show updated synonyms immediately
    const refreshStudyMaterials = async () => {
        if (!apiToken || wkRadicals.length === 0) return;

        try {
            const subjectIds = wkRadicals.map(r => r.id.toString()).join(',');
            const materials = await getRadicalStudyMaterials(apiToken, undefined, {
                subject_ids: subjectIds
            });
            setStudyMaterials(materials);
            console.log('🔧 DEBUG: Study materials refreshed successfully');
        } catch (error) {
            console.error('Error refreshing study materials:', error);
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
            case 'smart-merge':
                return 'Fügt nur neue Übersetzungen hinzu (keine Duplikate)';
            case 'delete':
                return 'Löscht alle Synonyme (leere Liste)';
        }
    };

    // 🔧 Upload single radical to Wanikani
    const uploadSingleRadical = async (result: ProcessResult, totalStats: { created: number, updated: number, failed: number }): Promise<{ created: number, updated: number, failed: number }> => {
        if (!apiToken) {
            result.status = 'error';
            result.message = '❌ Kein API Token verfügbar';
            return { ...totalStats, failed: totalStats.failed + 1 };
        }

        const radical = result.radical;

        try {
            // Check if study material already exists for this radical
            const existingStudyMaterial = studyMaterials.find(sm => sm.data.subject_id === radical.id);

            console.log(`🔧 DEBUG: Processing radical ${radical.id} (${radical.meaning})`);
            console.log(`🔧 DEBUG: Existing study material:`, existingStudyMaterial);
            console.log(`🔧 DEBUG: New synonyms to upload:`, radical.currentSynonyms);

            // 🔧 CRITICAL FIX: Apply mode-specific validation before uploading 
            const rawSynonyms = radical.currentSynonyms || [];
            let validSynonyms: string[] = [];

            // Apply same logic as in translation phase
            switch (synonymMode) {
                case 'delete':
                    // Delete mode: Always empty array
                    validSynonyms = [];
                    break;
                case 'replace':
                case 'smart-merge':
                default:
                    // Other modes: Deduplicate case-insensitively but preserve original case - keep first occurrence
                    const seenUploadSynonyms = new Map<string, string>();
                    rawSynonyms
                        .map(syn => typeof syn === 'string' ? syn.trim() : '')
                        .filter(syn => syn.length > 0)
                        .forEach(syn => {
                            const lowerKey = syn.toLowerCase();
                            if (!seenUploadSynonyms.has(lowerKey)) {
                                seenUploadSynonyms.set(lowerKey, syn); // Keep first occurrence
                            }
                        });
                    validSynonyms = [...seenUploadSynonyms.values()]; // Get unique values preserving original case
                    break;
            }

            console.log(`🔧 DEBUG: Raw synonyms from radical:`, rawSynonyms);
            console.log(`🔧 DEBUG: Synonym mode applied: ${synonymMode}`);
            console.log(`🔧 DEBUG: Final synonyms for upload:`, validSynonyms);

            // For DELETE mode, empty arrays are valid and should be uploaded
            // For other modes, we need at least one synonym
            if (validSynonyms.length === 0 && synonymMode !== 'delete') {
                console.log(`⚠️ DEBUG: No valid synonyms to upload for ${radical.meaning}`);
                result.status = 'error';
                result.message = `❌ Keine gültigen Synonyme zum Upload für "${radical.meaning}"`;
                return { ...totalStats, failed: totalStats.failed + 1 };
            } else {
                if (existingStudyMaterial) {
                    // Update existing study material
                    console.log(`🔄 DEBUG: Updating existing study material ${existingStudyMaterial.id} with ${validSynonyms.length} synonyms (DELETE mode: ${synonymMode === 'delete'})`);
                    const updatedStudyMaterial = await updateRadicalSynonyms(
                        apiToken,
                        existingStudyMaterial.id,
                        validSynonyms
                    );

                    // 🔧 FIX: Update local studyMaterials state to reflect the changes immediately
                    setStudyMaterials(prevMaterials =>
                        prevMaterials.map(sm =>
                            sm.id === existingStudyMaterial.id
                                ? updatedStudyMaterial
                                : sm
                        )
                    );

                    return { ...totalStats, updated: totalStats.updated + 1 };
                } else {
                    // Create new study material
                    console.log(`➕ DEBUG: Creating new study material for radical ${radical.id} with ${validSynonyms.length} synonyms (DELETE mode: ${synonymMode === 'delete'})`);
                    const newStudyMaterial = await createRadicalSynonyms(
                        apiToken,
                        radical.id,
                        validSynonyms
                    );

                    // 🔧 FIX: Add new study material to local state
                    setStudyMaterials(prevMaterials => [...prevMaterials, newStudyMaterial]);

                    return { ...totalStats, created: totalStats.created + 1 };
                }
            }

        } catch (error) {
            console.error(`❌ DEBUG: Upload error for ${radical.meaning}:`, error);
            result.status = 'error';
            result.message = `❌ Upload-Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`;
            return { ...totalStats, failed: totalStats.failed + 1 };
        }
    };

    // 🔧 CRITICAL: Process translation with mode-specific synonym logic
    const processTranslations = async (selectedRadicals: Radical[]) => {
        if (synonymMode !== 'delete' && !deeplToken) {
            setTranslationStatus('❌ DeepL Token fehlt für Übersetzung.');
            return;
        }

        if (selectedRadicals.length === 0) {
            setTranslationStatus('❌ Keine Radicals ausgewählt.');
            return;
        }

        setIsProcessing(true);
        setProgress(0);
        setTranslationStatus('🔄 Starte Verarbeitung...');
        setResults([]);
        setUploadStats({ created: 0, updated: 0, failed: 0 });

        const processResults: ProcessResult[] = [];
        const filteredRadicals = selectedRadicals.filter(r => r.selected);
        let uploadStats = { created: 0, updated: 0, failed: 0 };

        try {
            // Handle delete mode without translation
            if (synonymMode === 'delete') {
                setTranslationStatus(`🗑️ Verarbeite ${filteredRadicals.length} Radicals im DELETE-Modus...`);

                for (let i = 0; i < filteredRadicals.length; i++) {
                    const radical = filteredRadicals[i];
                    setTranslationStatus(`🗑️ Verarbeite ${i + 1}/${filteredRadicals.length}: ${radical.meaning}...`);

                    const updatedRadical: Radical = {
                        ...radical,
                        translatedSynonyms: [],
                        currentSynonyms: []
                    };

                    const result: ProcessResult = {
                        radical: updatedRadical,
                        status: 'success',
                        message: `🗑️ Synonyme gelöscht für "${radical.meaning}"`
                    };

                    // Immediately upload to Wanikani
                    setUploadStatus(`📤 Lade ${i + 1}/${filteredRadicals.length}: ${radical.meaning}...`);
                    uploadStats = await uploadSingleRadical(result, uploadStats);

                    if (result.status === 'error') {
                        // Upload failed, keep error status and message from uploadSingleRadical
                    } else {
                        result.status = 'uploaded';
                        if (synonymMode === 'delete') {
                            result.message = `🗑️ Erfolgreich gelöscht: Alle Synonyme entfernt`;
                        }
                    }

                    processResults.push(result);
                    setResults([...processResults]); // Update results in real-time
                    setUploadStats(uploadStats); // Update upload stats in real-time

                    setProgress(Math.round((i + 1) / filteredRadicals.length * 100));
                }
            } else {
                // Handle translation modes with immediate upload
                setTranslationStatus(`🌐 Verarbeite ${filteredRadicals.length} Radicals mit Übersetzung...`);

                for (let i = 0; i < filteredRadicals.length; i++) {
                    const radical = filteredRadicals[i];
                    setTranslationStatus(`🌐 Übersetze ${i + 1}/${filteredRadicals.length}: ${radical.meaning}...`);

                    try {
                        const translation = await translateText(deeplToken, radical.meaning, 'DE', false);

                        // Apply synonym mode logic
                        let newSynonyms: string[] = [];
                        const currentSynonyms = radical.currentSynonyms || [];
                        const translatedSynonym = translation.trim(); // Keep original case

                        console.log(`🔧 DEBUG: Processing synonym logic for "${radical.meaning}"`);
                        console.log(`🔧 DEBUG: Current synonyms:`, currentSynonyms);
                        console.log(`🔧 DEBUG: New translation:`, translatedSynonym);

                        switch (synonymMode) {
                            case 'replace':
                                newSynonyms = [translatedSynonym];
                                break;
                            case 'smart-merge':
                                // Case-insensitive comparison but preserve original case
                                if (!currentSynonyms.some(syn => syn.toLowerCase().trim() === translatedSynonym.toLowerCase())) {
                                    newSynonyms = [...currentSynonyms, translatedSynonym];
                                } else {
                                    newSynonyms = currentSynonyms;
                                }
                                break;
                        }

                        // Clean synonyms but preserve case - keep first occurrence of each case-insensitive match
                        const seenSynonyms = new Map<string, string>();
                        newSynonyms
                            .map(syn => syn.trim())
                            .filter(syn => syn.length > 0)
                            .forEach(syn => {
                                const lowerKey = syn.toLowerCase();
                                if (!seenSynonyms.has(lowerKey)) {
                                    seenSynonyms.set(lowerKey, syn); // Keep first occurrence
                                }
                            });
                        const cleanedSynonyms = [...seenSynonyms.values()]; // Get unique values preserving original case

                        console.log(`🔧 DEBUG: After processing:`, cleanedSynonyms);

                        const updatedRadical: Radical = {
                            ...radical,
                            translatedSynonyms: [translation],
                            currentSynonyms: cleanedSynonyms
                        };

                        const result: ProcessResult = {
                            radical: updatedRadical,
                            status: 'success',
                            message: `Übersetzt: "${radical.meaning}" → "${translation}"`
                        };

                        // Immediately upload to Wanikani after translation
                        setUploadStatus(`📤 Lade ${i + 1}/${filteredRadicals.length}: ${radical.meaning}...`);
                        uploadStats = await uploadSingleRadical(result, uploadStats);

                        if (result.status === 'error') {
                            // Upload failed, keep error status and message from uploadSingleRadical
                        } else {
                            result.status = 'uploaded';
                            result.message = `✅ Erfolgreich hochgeladen: ${cleanedSynonyms.join(', ')}`;
                        }

                        processResults.push(result);

                    } catch (error) {
                        const result: ProcessResult = {
                            radical,
                            status: 'error',
                            message: `❌ Übersetzungsfehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
                        };
                        processResults.push(result);
                        uploadStats.failed++;
                    }

                    setResults([...processResults]); // Update results in real-time
                    setUploadStats(uploadStats); // Update upload stats in real-time
                    setProgress(Math.round((i + 1) / filteredRadicals.length * 100));
                }
            }

            setResults(processResults);
            const successCount = processResults.filter(r => r.status === 'uploaded').length;
            const action = synonymMode === 'delete' ? 'gelöscht' : 'übersetzt und hochgeladen';
            setTranslationStatus(`✅ Verarbeitung abgeschlossen! ${successCount}/${processResults.length} erfolgreich ${action}.`);
            setUploadStatus(`✅ Upload abgeschlossen! Erstellt: ${uploadStats.created}, Aktualisiert: ${uploadStats.updated}, Fehler: ${uploadStats.failed}`);

            // 🔧 FIX: Auto-refresh study materials after processing to ensure UI shows latest data
            if (successCount > 0) {
                console.log('🔧 DEBUG: Auto-refreshing study materials after successful uploads');
                await refreshStudyMaterials();
            }

        } catch (error) {
            console.error('Processing error:', error);
            setTranslationStatus(`❌ Fehler bei der Verarbeitung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
        } finally {
            setIsProcessing(false);
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
                        onChange={(e) => handleApiTokenChange(e.target.value)}
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
                        <div className="mt-2 flex items-center justify-between">
                            <div className="text-sm text-green-600">
                                ✅ {wkRadicals.length} Radicals erfolgreich geladen
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={refreshStudyMaterials}
                                disabled={isLoadingRadicals}
                                className="text-xs"
                            >
                                🔄 Synonyme aktualisieren
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* DeepL API Token Input */}
            <Card>
                <CardHeader>
                    <CardTitle>🌐 DeepL API Token</CardTitle>
                </CardHeader>
                <CardContent>
                    <Input
                        type="password"
                        placeholder="Geben Sie Ihren DeepL API Token ein..."
                        value={deeplToken}
                        onChange={(e) => handleDeeplTokenChange(e.target.value)}
                        className="mb-4"
                        disabled={isProcessing}
                    />
                    <p className="text-sm text-gray-600">
                        Ihr DeepL Token wird für die automatische Übersetzung der Radical-Bedeutungen verwendet.
                    </p>
                    {deeplToken && (
                        <div className="mt-2 text-sm text-green-600">
                            ✅ DeepL Token eingegeben
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
                                <RadioGroupItem value="replace" id="replace" />
                                <Label htmlFor="replace" className="cursor-pointer">
                                    <span className="font-medium">Ersetzen</span>
                                    <span className="text-sm text-gray-600 ml-2">
                                        - {getModeDescription('replace')}
                                    </span>
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="delete" id="delete" />
                                <Label htmlFor="delete" className="cursor-pointer">
                                    <span className="font-medium">Löschen</span>
                                    <span className="text-sm text-gray-600 ml-2">
                                        - {getModeDescription('delete')}
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
                                onClick={() => processTranslations(filteredRadicals)}
                                disabled={!apiToken || (synonymMode !== 'delete' && !deeplToken) || filteredRadicals.length === 0 || isProcessing}
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

                        {/* Status displays */}
                        {translationStatus && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-700">{translationStatus}</p>
                            </div>
                        )}

                        {uploadStatus && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm text-green-700">{uploadStatus}</p>
                                {uploadStats.created > 0 || uploadStats.updated > 0 || uploadStats.failed > 0 ? (
                                    <div className="text-xs text-green-600 mt-1">
                                        Erstellt: {uploadStats.created} | Aktualisiert: {uploadStats.updated} | Fehler: {uploadStats.failed}
                                    </div>
                                ) : null}
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
