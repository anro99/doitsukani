import { useState, useEffect, useMemo, useRef } from 'react';
import { WKKanji, WKStudyMaterial } from '@bachmacintosh/wanikani-api-types';
import {
    getKanji,
    getKanjiStudyMaterials,
    updateKanjiSynonyms,
    createKanjiSynonyms,
    getKanjiCount,
    getKanjiPreview
} from '../lib/wanikani';
import { translateText } from '../lib/deepl';
import { extractContextFromMnemonic } from '../lib/contextual-translation';
import { loadWanikaniToken, saveWanikaniToken, removeToken, STORAGE_KEYS, loadDeepLToken, saveDeepLToken } from '../lib/storage';
import Bottleneck from 'bottleneck';

// Constants
const TRANSLATION_BATCH_SIZE = 25;

// Rate-Limiting Configuration (same as radicals)
const waniKaniLimiter = new Bottleneck({
    maxConcurrent: 1,
    minTime: 800, // 75 requests/min (800ms between requests)
    reservoir: 75,
    reservoirRefreshAmount: 75,
    reservoirRefreshInterval: 60 * 1000, // 60 seconds
    retryCount: 5,
    jitter: true
});

const deeplLimiter = new Bottleneck({
    maxConcurrent: 2,
    minTime: 100,
    reservoir: 500000,
    reservoirRefreshAmount: 500000,
    reservoirRefreshInterval: 30 * 24 * 60 * 60 * 1000, // 30 days
    retryCount: 3,
    jitter: true
});

export interface Kanji {
    id: number;
    meaning: string;
    characters: string;
    level: number;
    currentSynonyms: string[];
    selected: boolean;
    translatedSynonyms: string[];
    meaningMnemonic?: string;
}

export interface UploadStats {
    created: number;
    updated: number;
    failed: number;
    skipped: number;
    successful: number;
}

export interface ProcessResult {
    kanji: Kanji;
    status: 'success' | 'error' | 'uploaded';
    message: string;
}

export type SynonymMode = 'replace' | 'smart-merge' | 'delete';

export function useKanjiManager() {
    // Simplified stop processing (same as radicals)
    const [shouldStopProcessing, setShouldStopProcessing] = useState(false);
    const stopRef = useRef(false);

    // Simplified rate-limited execution helpers
    const executeWithWaniKaniLimiter = async <T>(
        fn: () => Promise<T>,
        id: string
    ): Promise<T> => {
        if (stopRef.current) {
            throw new Error('Processing stopped by user');
        }
        return waniKaniLimiter.schedule({ id }, fn);
    };

    const executeWithDeepLLimiter = async <T>(
        fn: () => Promise<T>,
        id: string
    ): Promise<T> => {
        if (stopRef.current) {
            throw new Error('Processing stopped by user');
        }
        return deeplLimiter.schedule({ id }, fn);
    };

    // Token state
    const [apiToken, setApiToken] = useState(() => {
        if (typeof window !== 'undefined') {
            return loadWanikaniToken();
        }
        return '';
    });

    const [deeplToken, setDeeplToken] = useState(() => {
        if (typeof window !== 'undefined') {
            return loadDeepLToken();
        }
        return '';
    });

    // Settings state
    const [selectedLevel, setSelectedLevel] = useState<number | 'all'>(1);
    const [synonymMode, setSynonymMode] = useState<SynonymMode>('smart-merge');

    // Simplified processing state (same as radicals)
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [translationStatus, setTranslationStatus] = useState('');
    const [uploadStatus, setUploadStatus] = useState('');

    // Upload stats
    const [uploadStats, setUploadStats] = useState<UploadStats>({
        created: 0,
        updated: 0,
        failed: 0,
        skipped: 0,
        successful: 0
    });

    // Simplified API state (same as radicals)
    const [wkKanji, setWkKanji] = useState<WKKanji[]>([]);
    const [studyMaterials, setStudyMaterials] = useState<WKStudyMaterial[]>([]);
    const [isLoadingKanji, setIsLoadingKanji] = useState(false);
    const [apiError, setApiError] = useState<string>('');
    const [totalKanjiCount, setTotalKanjiCount] = useState<number>(0);

    // Debug: Log every change to totalKanjiCount
    useEffect(() => {
        console.log('🔄 totalKanjiCount changed to:', totalKanjiCount);
    }, [totalKanjiCount]);

    // Handle token changes
    const handleApiTokenChange = (token: string) => {
        setApiToken(token);
        if (typeof window !== 'undefined') {
            if (token.trim()) {
                saveWanikaniToken(token);
            } else {
                removeToken(STORAGE_KEYS.WANIKANI_TOKEN);
            }
        }
    };

    const handleDeepLTokenChange = (token: string) => {
        setDeeplToken(token);
        if (typeof window !== 'undefined') {
            if (token.trim()) {
                saveDeepLToken(token);
            } else {
                removeToken(STORAGE_KEYS.DEEPL_TOKEN);
            }
        }
    };

    // Convert Wanikani kanji to internal format (simplified)
    const convertToInternalFormat = (wkKanji: WKKanji[], studyMaterials: WKStudyMaterial[]): Kanji[] => {
        const studyMaterialsMap = new Map<number, WKStudyMaterial>();
        studyMaterials?.forEach(sm => {
            if (sm?.data?.subject_id) {
                studyMaterialsMap.set(sm.data.subject_id, sm);
            }
        });

        return wkKanji.map(kanji => ({
            id: kanji.id,
            meaning: kanji.data.meanings[0]?.meaning || 'Unknown',
            characters: kanji.data.characters,
            level: kanji.data.level,
            currentSynonyms: studyMaterialsMap.get(kanji.id)?.data.meaning_synonyms || [],
            selected: true,
            translatedSynonyms: [],
            meaningMnemonic: kanji.data.meaning_mnemonic || undefined
        }));
    };

    // Simplified filter kanji by selected level (same logic as radicals)
    const filteredKanji = useMemo(() => {
        if (wkKanji.length === 0) return [];

        const internalKanji = convertToInternalFormat(wkKanji, studyMaterials);

        if (selectedLevel === 'all') {
            return internalKanji;
        }

        return internalKanji.filter(kanji => kanji.level === selectedLevel);
    }, [wkKanji, studyMaterials, selectedLevel]);

    // Load kanji count using specialized function
    const loadKanjiCount = async () => {
        try {
            const level = selectedLevel === 'all' ? undefined : selectedLevel;
            console.log('🔍 Loading kanji count for level:', level);
            const count = await getKanjiCount(apiToken, level);
            console.log('📊 Received kanji count:', count, 'for level:', level);
            console.log('🔄 Setting totalKanjiCount to:', count);
            setTotalKanjiCount(count);
            console.log('✅ totalKanjiCount should now be:', count);
        } catch (error) {
            console.error('Error loading kanji count:', error);
            setTotalKanjiCount(0);
        }
    };

    // Load kanji preview using specialized function (similar to radicals)
    const loadKanjiFromAPI = async () => {
        setIsLoadingKanji(true);
        setApiError('');

        try {
            const level = selectedLevel === 'all' ? undefined : selectedLevel;

            // Load preview kanji (limited)
            const previewKanji = await getKanjiPreview(apiToken, level, 15);
            setWkKanji(previewKanji);

            // Load study materials for preview kanji
            if (previewKanji.length > 0) {
                const subjectIds = previewKanji.map(k => k.id.toString()).join(',');
                const studyMaterialsData = await getKanjiStudyMaterials(apiToken, undefined, {
                    subject_ids: subjectIds
                });
                setStudyMaterials(studyMaterialsData);
            }

            // Load total count separately
            await loadKanjiCount();

        } catch (error) {
            console.error('Error loading kanji:', error);
            setApiError('Fehler beim Laden der Kanji. Bitte überprüfen Sie Ihren API-Token.');
        } finally {
            setIsLoadingKanji(false);
        }
    };

    // Load all kanji for processing (when user starts processing)
    const loadAllKanjiForProcessing = async (): Promise<Kanji[]> => {
        try {
            const options: { levels?: string } = {};

            if (selectedLevel !== 'all') {
                options.levels = selectedLevel.toString();
            }

            // Load all kanji for the selected level
            const allKanji = await getKanji(apiToken, undefined, options);

            // Get study materials for all kanji
            const subjectIds = allKanji.map(k => k.id.toString()).join(',');
            const allStudyMaterials = await getKanjiStudyMaterials(apiToken, undefined, {
                subject_ids: subjectIds
            });

            // Convert to internal format
            return convertToInternalFormat(allKanji, allStudyMaterials);

        } catch (error) {
            console.error('Error loading all kanji for processing:', error);
            throw error;
        }
    };

    // Simplified upload single kanji (same as radicals)
    const uploadSingleKanjiWithRetry = async (
        result: ProcessResult,
        localUploadStats: UploadStats
    ): Promise<UploadStats> => {
        try {
            const kanji = result.kanji;
            const synonymsToUpload = result.kanji.translatedSynonyms;

            if (synonymsToUpload.length === 0 && synonymMode !== 'delete') {
                localUploadStats.skipped++;
                localUploadStats.successful++;
                return localUploadStats;
            }

            const existingStudyMaterial = studyMaterials.find(sm => sm.data.subject_id === kanji.id);

            if (existingStudyMaterial) {
                await executeWithWaniKaniLimiter(
                    () => updateKanjiSynonyms(apiToken, existingStudyMaterial.id, synonymsToUpload),
                    `update-${kanji.id}`
                );
                localUploadStats.updated++;
            } else {
                await executeWithWaniKaniLimiter(
                    () => createKanjiSynonyms(apiToken, kanji.id, synonymsToUpload),
                    `create-${kanji.id}`
                );
                localUploadStats.created++;
            }

            localUploadStats.successful++;

        } catch (error) {
            console.error(`Upload failed for ${result.kanji.meaning}:`, error);

            if (error instanceof Error && error.message === 'Processing stopped by user') {
                return localUploadStats;
            }

            result.status = 'error';
            result.message = `❌ Upload fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`;
            localUploadStats.failed++;
        }

        return localUploadStats;
    };

    // Simplified process batch (same structure as radicals)
    const processBatch = async (
        batch: Kanji[],
        batchIndex: number,
        totalBatches: number,
        localUploadStats: UploadStats,
        totalKanjiCount: number,
        processedSoFar: number
    ) => {
        const batchSize = batch.length;
        setTranslationStatus(`📦 Verarbeite Batch ${batchIndex + 1}/${totalBatches} (${batchSize} Kanji)...`);

        for (let i = 0; i < batch.length; i++) {
            if (shouldStopProcessing || stopRef.current) {
                setTranslationStatus(`⏹️ Verarbeitung gestoppt bei Batch ${batchIndex + 1}/${totalBatches}, Item ${i + 1}/${batchSize}`);
                return { ...localUploadStats, stopped: true };
            }

            const kanji = batch[i];
            const currentItemIndex = processedSoFar + i + 1; // Current position in total items

            if (synonymMode === 'delete') {
                setTranslationStatus(`🗑️ Batch ${batchIndex + 1}/${totalBatches}: Verarbeite ${currentItemIndex}/${totalKanjiCount}: ${kanji.meaning}...`);

                if (!kanji.currentSynonyms || kanji.currentSynonyms.length === 0) {
                    localUploadStats.skipped++;
                    localUploadStats.successful++;
                    continue;
                }

                const updatedKanji: Kanji = {
                    ...kanji,
                    translatedSynonyms: [],
                    currentSynonyms: []
                };

                const result: ProcessResult = {
                    kanji: updatedKanji,
                    status: 'success',
                    message: `🗑️ Synonyme gelöscht: ${kanji.meaning}`
                };

                setUploadStatus(`📤 Batch ${batchIndex + 1}: Lade ${currentItemIndex}/${totalKanjiCount}: ${kanji.meaning}...`);
                localUploadStats = await uploadSingleKanjiWithRetry(result, localUploadStats);

            } else {
                // Translation modes
                setTranslationStatus(`🌐 Batch ${batchIndex + 1}/${totalBatches}: Übersetze ${currentItemIndex}/${totalKanjiCount}: ${kanji.meaning}...`);

                try {
                    const context = extractContextFromMnemonic(
                        kanji.meaningMnemonic || '',
                        kanji.meaning
                    );

                    const translation = await executeWithDeepLLimiter(
                        () => translateText(
                            deeplToken,
                            kanji.meaning,
                            'DE',
                            false,
                            3,
                            context || undefined
                        ),
                        `translate-${kanji.meaning}`
                    );

                    // Apply synonym mode logic
                    let newSynonyms: string[] = [];
                    const currentSynonyms = kanji.currentSynonyms || [];
                    const translatedSynonym = translation.trim();

                    switch (synonymMode) {
                        case 'replace':
                            newSynonyms = [translatedSynonym];
                            break;
                        case 'smart-merge':
                            if (!currentSynonyms.some(syn => syn.toLowerCase().trim() === translatedSynonym.toLowerCase())) {
                                newSynonyms = [...currentSynonyms, translatedSynonym];
                            } else {
                                newSynonyms = currentSynonyms;
                            }
                            break;
                    }

                    const updatedKanji: Kanji = {
                        ...kanji,
                        translatedSynonyms: newSynonyms,
                        currentSynonyms: newSynonyms
                    };

                    const result: ProcessResult = {
                        kanji: updatedKanji,
                        status: 'success',
                        message: `🌐 Übersetzt: "${kanji.meaning}" → "${translatedSynonym}"`
                    };

                    setUploadStatus(`📤 Batch ${batchIndex + 1}: Lade ${currentItemIndex}/${totalKanjiCount}: ${kanji.meaning}...`);
                    localUploadStats = await uploadSingleKanjiWithRetry(result, localUploadStats);

                } catch (error) {
                    console.error(`Translation failed for ${kanji.meaning}:`, error);

                    if (error instanceof Error && error.message === 'Processing stopped by user') {
                        setTranslationStatus(`⏹️ Übersetzung gestoppt bei ${kanji.meaning}`);
                        return { ...localUploadStats, stopped: true };
                    }

                    localUploadStats.failed++;
                }
            }

            // Update progress after each kanji (whether successful or failed)
            const progressPercent = (currentItemIndex / totalKanjiCount) * 100;
            setProgress(Math.round(progressPercent));
        }

        return localUploadStats;
    };

    // Start processing - loads all kanji first, then processes them
    const startProcessing = async () => {
        if (synonymMode !== 'delete' && !deeplToken) {
            setTranslationStatus('❌ DeepL Token fehlt für Übersetzung.');
            return;
        }

        setIsProcessing(true);
        setShouldStopProcessing(false);
        stopRef.current = false;
        setProgress(0);
        setTranslationStatus('📦 Lade alle Kanji für Verarbeitung...');

        try {
            // Load all kanji for the selected level
            const allKanji = await loadAllKanjiForProcessing();

            if (allKanji.length === 0) {
                setTranslationStatus('❌ Keine Kanji gefunden.');
                setIsProcessing(false);
                return;
            }

            // Start processing with all kanji
            await processTranslations(allKanji);

        } catch (error) {
            console.error('Error starting processing:', error);
            setTranslationStatus('❌ Fehler beim Laden der Kanji für Verarbeitung.');
            setIsProcessing(false);
        }
    };

    // Simplified process translations (now takes kanji as parameter)
    const processTranslations = async (kanji: Kanji[]) => {
        setTranslationStatus('🚀 Starte Batch-Verarbeitung...');

        setUploadStats({ created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 });

        const filteredKanjiData = kanji.filter(k => k.selected);

        if (filteredKanjiData.length === 0) {
            setTranslationStatus('❌ Keine ausgewählten Kanji gefunden.');
            setIsProcessing(false);
            return;
        }

        let localUploadStats: UploadStats = { created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 };

        try {
            // Create batches
            const batches: Kanji[][] = [];
            for (let i = 0; i < filteredKanjiData.length; i += TRANSLATION_BATCH_SIZE) {
                batches.push(filteredKanjiData.slice(i, i + TRANSLATION_BATCH_SIZE));
            }

            const totalBatches = batches.length;
            let processedItems = 0; // Track individual processed items

            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                if (shouldStopProcessing || stopRef.current) {
                    setTranslationStatus(`⏹️ Verarbeitung vom Benutzer gestoppt nach ${batchIndex} von ${totalBatches} Batches`);
                    break;
                }

                const batch = batches[batchIndex];
                const result = await processBatch(
                    batch,
                    batchIndex,
                    totalBatches,
                    localUploadStats,
                    filteredKanjiData.length,
                    processedItems
                );

                if ((result as any).stopped) {
                    localUploadStats = { ...result };
                    delete (localUploadStats as any).stopped;
                    break;
                }

                localUploadStats = result;
                processedItems += batch.length; // Update processed items count

                // Progress is already updated in processBatch for each individual kanji
                // No need to update it here again
            }

            // Final status
            let statusMessage = `🎉 Verarbeitung abgeschlossen! ${localUploadStats.successful} von ${filteredKanjiData.length} Kanji verarbeitet`;

            const details: string[] = [];
            if (localUploadStats.created > 0) details.push(`${localUploadStats.created} erstellt`);
            if (localUploadStats.updated > 0) details.push(`${localUploadStats.updated} aktualisiert`);
            if (localUploadStats.failed > 0) details.push(`${localUploadStats.failed} fehlgeschlagen`);
            if (localUploadStats.skipped > 0) details.push(`${localUploadStats.skipped} übersprungen`);

            if (details.length > 0) {
                statusMessage += ` (${details.join(', ')})`;
            }

            setTranslationStatus(statusMessage);
            setUploadStatus(`✅ Abgeschlossen: ${details.join(', ')}`);

        } catch (error) {
            console.error('Error during batch processing:', error);
            setTranslationStatus('❌ Fehler bei der Verarbeitung.');
            setUploadStatus('❌ Verarbeitung abgebrochen.');
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }

        setUploadStats(localUploadStats);
    };

    // Stop processing
    const stopProcessing = () => {
        setShouldStopProcessing(true);
        stopRef.current = true;
    };

    // Load kanji when component mounts or token/level changes
    useEffect(() => {
        if (apiToken) {
            loadKanjiFromAPI();
        }
    }, [apiToken, selectedLevel]);

    // Kanji count for display - use total count or filtered count
    const kanjiCount = totalKanjiCount > 0 ? totalKanjiCount : filteredKanji.length;

    console.log('🔢 Kanji count calculation:', {
        totalKanjiCount,
        filteredKanjiLength: filteredKanji.length,
        selectedLevel,
        finalKanjiCount: kanjiCount
    });

    return {
        // Settings
        selectedLevel,
        setSelectedLevel,
        synonymMode,
        setSynonymMode,

        // Tokens
        apiToken,
        handleApiTokenChange,
        deeplToken,
        handleDeepLTokenChange,

        // Data
        filteredKanji,
        kanjiCount,

        // Loading states
        isLoadingKanji,
        apiError,

        // Processing states
        isProcessing,
        progress,
        translationStatus,
        uploadStatus,
        uploadStats,

        // Actions
        processTranslations: startProcessing, // Use startProcessing instead
        stopProcessing,
        loadKanjiFromAPI
    };
}
