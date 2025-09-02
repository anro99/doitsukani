import { useState, useEffect, useMemo, useRef } from 'react';
import { WKKanji, WKStudyMaterial } from '@bachmacintosh/wanikani-api-types';
import { 
    getKanji, 
    getKanjiStudyMaterials, 
    getKanjiCount, 
    getKanjiPreview,
    createStudyMaterials,
    updateSynonyms,
    WKStudyMaterialCreate,
    WKStudyMaterialUpdate
} from '../lib/wanikani';
import { translateText } from '../lib/deepl';
import { extractContextFromMnemonic } from '../lib/contextual-translation';
import { loadWanikaniToken, saveWanikaniToken, removeToken, STORAGE_KEYS, loadDeepLToken, saveDeepLToken } from '../lib/storage';
import Bottleneck from 'bottleneck';

// Constants
const TRANSLATION_BATCH_SIZE = 25;

// Rate-Limiting Configuration
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
    // Stop processing flag with ref for immediate access
    const [shouldStopProcessing, setShouldStopProcessing] = useState(false);
    const stopRef = useRef(false);

    // Rate-limited execution helpers with stop check
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

    // Token state with localStorage persistence
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

    // Processing state
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [translationStatus, setTranslationStatus] = useState('');
    const [uploadStatus, setUploadStatus] = useState('');

    // Real-time progress tracking
    const [processedCount, setProcessedCount] = useState(0);
    const [totalCountForProcessing, setTotalCountForProcessing] = useState(0);
    const totalCountForProcessingRef = useRef(0); // Ref for access in async functions
    const [uploadStats, setUploadStats] = useState<UploadStats>({
        created: 0,
        updated: 0,
        failed: 0,
        skipped: 0,
        successful: 0
    });

    // API state
    const [wkKanji, setWkKanji] = useState<WKKanji[]>([]);
    const [studyMaterials, setStudyMaterials] = useState<WKStudyMaterial[]>([]);

    // New state for optimized loading - simplified: only current level
    const [currentLevelCount, setCurrentLevelCount] = useState<number | undefined>(undefined);
    const [currentLevelCountLoading, setCurrentLevelCountLoading] = useState(false);
    const [previewKanji, setPreviewKanji] = useState<Kanji[]>([]);
    const [isLoadingKanji, setIsLoadingKanji] = useState(false);
    const [apiError, setApiError] = useState<string>('');

    // Handle token changes with localStorage persistence
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

    const handleDeeplTokenChange = (token: string) => {
        setDeeplToken(token);
        if (typeof window !== 'undefined') {
            if (token.trim()) {
                saveDeepLToken(token);
            } else {
                removeToken(STORAGE_KEYS.DEEPL_TOKEN);
            }
        }
    };

    // Convert Wanikani kanji to internal format
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

    // Filter kanji by selected level
    const filteredKanji = useMemo(() => {
        if (wkKanji.length === 0) return [];

        const internalKanji = convertToInternalFormat(wkKanji, studyMaterials);

        if (selectedLevel === 'all') {
            return internalKanji;
        }

        return internalKanji.filter(kanji => kanji.level === selectedLevel);
    }, [wkKanji, studyMaterials, selectedLevel]);

    // Load kanji from Wanikani API
    const loadKanjiFromAPI = async () => {
        setIsLoadingKanji(true);
        setApiError('');

        try {
            // Get kanji from Wanikani
            const kanji = await getKanji(apiToken);

            // Get existing study materials for these kanji
            const subjectIds = kanji.map(k => k.id.toString()).join(',');
            const materials = await getKanjiStudyMaterials(apiToken, undefined, {
                subject_ids: subjectIds
            });

            setWkKanji(kanji);
            setStudyMaterials(materials);

        } catch (error) {
            console.error('Error loading kanji:', error);
            setApiError('Fehler beim Laden der Kanji. Bitte überprüfen Sie Ihren API-Token.');
        } finally {
            setIsLoadingKanji(false);
        }
    };

    // Refresh study materials to show updated synonyms immediately
    const refreshStudyMaterials = async () => {
        if (!apiToken || wkKanji.length === 0) return;

        try {
            const subjectIds = wkKanji.map(k => k.id.toString()).join(',');
            const materials = await getKanjiStudyMaterials(apiToken, undefined, {
                subject_ids: subjectIds
            });
            setStudyMaterials(materials);
            console.log('🔧 DEBUG: Kanji study materials refreshed successfully');
        } catch (error) {
            console.error('Error refreshing kanji study materials:', error);
        }
    };

    // Update specific kanji in preview after successful upload
    const updatePreviewKanjiSynonyms = (kanjiId: number, newSynonyms: string[]) => {
        setPreviewKanji(prevPreview =>
            prevPreview.map(previewKanji => {
                if (previewKanji.id === kanjiId) {
                    console.log(`🔄 Updating preview for kanji ${kanjiId} with ${newSynonyms.length} new synonyms`);
                    return {
                        ...previewKanji,
                        currentSynonyms: newSynonyms
                    };
                }
                return previewKanji;
            })
        );
    };

    // Upload single kanji with retries
    const uploadSingleKanjiWithRetry = async (
        result: ProcessResult,
        localUploadStats: UploadStats,
        kanjiIndex: number
    ): Promise<UploadStats> => {
        const kanji = result.kanji;
        const synonymsToUpload = result.kanji.translatedSynonyms;

        try {
            // Skip if no synonyms to upload and not in delete mode
            if (synonymsToUpload.length === 0 && synonymMode !== 'delete') {
                console.log(`⏭️ Skipping ${kanji.meaning} - no synonyms to upload`);
                localUploadStats.skipped++;
                localUploadStats.successful++;
                
                // Update progress for skipped items too
                setProcessedCount(kanjiIndex + 1);
                const newProgress = totalCountForProcessingRef.current > 0 ? ((kanjiIndex + 1) / totalCountForProcessingRef.current) * 100 : 0;
                setProgress(Math.round(newProgress));
                
                return localUploadStats;
            }

            const existingStudyMaterial = studyMaterials.find(sm => sm.data.subject_id === kanji.id);

            if (existingStudyMaterial) {
                // Update existing study material using the study_material ID, not the subject ID
                const updateData: WKStudyMaterialUpdate = {
                    id: existingStudyMaterial.id,
                    synonyms: synonymsToUpload
                };
                await executeWithWaniKaniLimiter(
                    () => updateSynonyms(apiToken, waniKaniLimiter, updateData),
                    `update-${kanji.id}`
                );
                localUploadStats.updated++;
            } else {
                // Create new study material using the subject ID
                const createData: WKStudyMaterialCreate = {
                    subject: kanji.id,
                    synonyms: synonymsToUpload
                };
                await executeWithWaniKaniLimiter(
                    () => createStudyMaterials(apiToken, waniKaniLimiter, createData),
                    `create-${kanji.id}`
                );
                localUploadStats.created++;
            }

            localUploadStats.successful++;

            // 🚀 Real-time progress update after successful upload
            setProcessedCount(kanjiIndex + 1);
            const newProgress = totalCountForProcessingRef.current > 0 ? ((kanjiIndex + 1) / totalCountForProcessingRef.current) * 100 : 0;
            setProgress(Math.round(newProgress));

            // Live status update
            setUploadStatus(`✅ ${kanji.characters || kanji.meaning} erfolgreich aktualisiert (${kanjiIndex + 1}/${totalCountForProcessingRef.current})`);

            // 🚀 NEW: Immediately update preview kanji for this specific kanji
            // Calculate final synonyms based on mode
            let finalSynonyms: string[];
            if (synonymMode === 'delete') {
                finalSynonyms = [];
            } else if (synonymMode === 'smart-merge') {
                // Merge existing synonyms with new ones
                const existingSynonyms = existingStudyMaterial?.data.meaning_synonyms || [];
                finalSynonyms = [...new Set([...existingSynonyms, ...synonymsToUpload])];
            } else { // 'replace'
                finalSynonyms = synonymsToUpload;
            }

            updatePreviewKanjiSynonyms(kanji.id, finalSynonyms);

        } catch (error) {
            console.error(`Upload failed for ${result.kanji.meaning}:`, error);

            // Check if error is due to stop
            if (error instanceof Error && error.message === 'Processing stopped by user') {
                // Don't count as failed if stopped by user
                return localUploadStats;
            }

            result.status = 'error';
            result.message = `❌ Upload fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`;
            localUploadStats.failed++;

            // Update progress even on failure
            setProcessedCount(kanjiIndex + 1);
            const newProgress = totalCountForProcessingRef.current > 0 ? ((kanjiIndex + 1) / totalCountForProcessingRef.current) * 100 : 0;
            setProgress(Math.round(newProgress));
        }

        return localUploadStats;
    };

    // Process a batch of kanji with batch progress tracking
    const processBatch = async (
        batch: Kanji[],
        batchIndex: number,
        totalBatches: number,
        localUploadStats: UploadStats
    ) => {
        const batchSize = batch.length;
        setTranslationStatus(`📦 Verarbeite Batch ${batchIndex + 1}/${totalBatches} (${batchSize} Kanji)...`);

        for (let i = 0; i < batch.length; i++) {
            // Check if processing should be stopped (both state and ref)
            if (shouldStopProcessing || stopRef.current) {
                setTranslationStatus(`⏹️ Verarbeitung gestoppt bei Batch ${batchIndex + 1}/${totalBatches}, Item ${i + 1}/${batchSize}`);
                return { ...localUploadStats, stopped: true };
            }

            const kanji = batch[i];

            if (synonymMode === 'delete') {
                setTranslationStatus(`🗑️ Batch ${batchIndex + 1}/${totalBatches}: Verarbeite ${i + 1}/${batchSize}: ${kanji.meaning}...`);

                // Skip kanji that already have no synonyms
                if (!kanji.currentSynonyms || kanji.currentSynonyms.length === 0) {
                    console.log(`⏭️ DEBUG: Skipping ${kanji.meaning} - already has no synonyms`);
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
                    message: `🗑️ Synonyme gelöscht für "${kanji.meaning}"`
                };

                setUploadStatus(`📤 Batch ${batchIndex + 1}: Lade ${i + 1}/${batchSize}: ${kanji.meaning}...`);
                localUploadStats = await uploadSingleKanjiWithRetry(result, localUploadStats, (batchIndex * TRANSLATION_BATCH_SIZE) + i);

            } else {
                // Translation modes
                setTranslationStatus(`🌐 Batch ${batchIndex + 1}/${totalBatches}: Übersetze ${i + 1}/${batchSize}: ${kanji.meaning}...`);

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
                                newSynonyms = currentSynonyms; // No change needed
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

                    setUploadStatus(`📤 Batch ${batchIndex + 1}: Lade ${i + 1}/${batchSize}: ${kanji.meaning}...`);
                    localUploadStats = await uploadSingleKanjiWithRetry(result, localUploadStats, (batchIndex * TRANSLATION_BATCH_SIZE) + i);

                } catch (error) {
                    console.error(`Translation failed for ${kanji.meaning}:`, error);

                    // Check if error is due to stop
                    if (error instanceof Error && error.message === 'Processing stopped by user') {
                        setTranslationStatus(`⏹️ Übersetzung gestoppt bei ${kanji.meaning}`);
                        return { ...localUploadStats, stopped: true };
                    }

                    localUploadStats.failed++;
                }
            }
        }

        return localUploadStats;
    };

    // Process translations (enhanced implementation with DeepL)
    const processTranslations = async (kanji: Kanji[]) => {
        if (synonymMode !== 'delete' && !deeplToken) {
            setTranslationStatus('❌ DeepL Token fehlt für Übersetzung.');
            return;
        }

        if (kanji.length === 0) {
            setTranslationStatus('❌ Keine Kanji ausgewählt.');
            return;
        }

        setIsProcessing(true);
        setShouldStopProcessing(false); // Reset stop flag
        stopRef.current = false; // Reset ref flag
        setProgress(0);
        setTranslationStatus('🚀 Starte Batch-Verarbeitung mit Rate-Limiting-Schutz...');

        // Reset stats at start of processing
        setUploadStats({ created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 });

        const filteredKanji = kanji.filter(k => k.selected);

        // Initialize real-time progress tracking
        setTotalCountForProcessing(filteredKanji.length);
        totalCountForProcessingRef.current = filteredKanji.length; // Update ref
        setProcessedCount(0);

        let localUploadStats: UploadStats = { created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 };

        try {
            // Create batches for processing
            const batches: Kanji[][] = [];
            for (let i = 0; i < filteredKanji.length; i += TRANSLATION_BATCH_SIZE) {
                batches.push(filteredKanji.slice(i, i + TRANSLATION_BATCH_SIZE));
            }

            const totalBatches = batches.length;
            console.log(`🚀 Processing ${filteredKanji.length} kanji in ${totalBatches} batches (${TRANSLATION_BATCH_SIZE} per batch)`);

            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                // Check if processing should be stopped
                if (shouldStopProcessing || stopRef.current) {
                    setTranslationStatus(`⏹️ Verarbeitung vom Benutzer gestoppt nach ${batchIndex} von ${totalBatches} Batches`);
                    setUploadStatus(`⏹️ Gestoppt! Teilweise abgeschlossen: Erstellt: ${localUploadStats.created}, Aktualisiert: ${localUploadStats.updated}, Fehler: ${localUploadStats.failed}, Übersprungen: ${localUploadStats.skipped}`);
                    break;
                }

                const batch = batches[batchIndex];
                const result = await processBatch(batch, batchIndex, totalBatches, localUploadStats);

                // Check if processBatch was stopped
                if ((result as any).stopped) {
                    localUploadStats = { ...result };
                    delete (localUploadStats as any).stopped;
                    break;
                }

                localUploadStats = result;
            }

            // Final status update
            let statusMessage = `🎉 Verarbeitung abgeschlossen! ${localUploadStats.successful} von ${filteredKanji.length} Kanji verarbeitet`;
            
            const details: string[] = [];
            if (localUploadStats.created > 0) details.push(`${localUploadStats.created} erstellt`);
            if (localUploadStats.updated > 0) details.push(`${localUploadStats.updated} aktualisiert`);
            if (localUploadStats.skipped > 0) details.push(`${localUploadStats.skipped} übersprungen`);
            if (localUploadStats.failed > 0) details.push(`${localUploadStats.failed} fehlerhaft`);

            if (details.length > 1) {
                statusMessage += ` (${details.join(', ')})`;
            }
            statusMessage += '.';

            setTranslationStatus(statusMessage);
            setUploadStatus(`✅ Upload abgeschlossen! Erstellt: ${localUploadStats.created}, Aktualisiert: ${localUploadStats.updated}, Fehler: ${localUploadStats.failed}, Übersprungen: ${localUploadStats.skipped}`);

            // Update React state with final statistics
            setUploadStats({ ...localUploadStats });

            // Auto-refresh study materials after processing
            if (localUploadStats.created > 0 || localUploadStats.updated > 0) {
                console.log('🔧 DEBUG: Auto-refreshing kanji study materials after successful uploads');
                await refreshStudyMaterials();
            }

        } catch (error) {
            console.error('Processing error:', error);
            setTranslationStatus(`❌ Fehler bei der Verarbeitung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Stop processing function
    const stopProcessing = () => {
        console.log('🛑 STOP: User clicked stop button');
        setShouldStopProcessing(true);
        stopRef.current = true;
        setIsProcessing(false);

        // Set status messages to indicate stopping
        setTranslationStatus('⏹️ Stoppe Verarbeitung...');
        setUploadStatus('⏹️ Verarbeitung gestoppt');

        console.log('🛑 STOP: All flags set');
    };

    // Load kanji count when level changes (simplified - only current level)
    useEffect(() => {
        const loadCurrentLevelCount = async () => {
            if (!apiToken) return;

            // If we're already loading, don't start again
            if (currentLevelCountLoading) {
                console.log('Count already loading...');
                return;
            }

            console.log(`Loading kanji count for level ${selectedLevel}...`);
            setCurrentLevelCountLoading(true);

            try {
                const count = await getKanjiCount(
                    apiToken,
                    selectedLevel === 'all' ? undefined : selectedLevel
                );

                setCurrentLevelCount(count);
                console.log(`Loaded ${count} kanji for level ${selectedLevel}`);

            } catch (error) {
                console.error(`Error loading kanji count for level ${selectedLevel}:`, error);
                setCurrentLevelCount(undefined);
            } finally {
                setCurrentLevelCountLoading(false);
            }
        };

        loadCurrentLevelCount();
    }, [selectedLevel, apiToken]); // Simplified dependencies

    // Load preview kanji when level changes
    useEffect(() => {
        const loadPreviewKanji = async () => {
            if (!apiToken) return;

            console.log(`Loading preview kanji for level ${selectedLevel}...`);

            try {
                const preview = await getKanjiPreview(
                    apiToken,
                    selectedLevel === 'all' ? undefined : selectedLevel,
                    12
                );

                // Also load study materials for the preview kanji to show synonyms
                let previewStudyMaterials: WKStudyMaterial[] = [];
                if (preview.length > 0) {
                    console.log('Loading study materials for preview kanji...');
                    previewStudyMaterials = await getKanjiStudyMaterials(apiToken);
                }

                // Convert WKKanji[] to Kanji[] format with actual synonyms
                const convertedPreview: Kanji[] = preview.map(wkKanji => {
                    // Find study material for this kanji
                    const studyMaterial = previewStudyMaterials.find(
                        sm => sm.data.subject_id === wkKanji.id
                    );
                    const currentSynonyms = studyMaterial?.data.meaning_synonyms || [];

                    return {
                        id: wkKanji.id,
                        meaning: wkKanji.data.meanings[0]?.meaning || '',
                        characters: wkKanji.data.characters,
                        level: wkKanji.data.level,
                        currentSynonyms: currentSynonyms, // Now has real synonyms
                        selected: false,
                        translatedSynonyms: [],
                        meaningMnemonic: wkKanji.data.meaning_mnemonic
                    };
                });

                setPreviewKanji(convertedPreview);
                console.log(`Loaded ${convertedPreview.length} preview kanji for level ${selectedLevel}`);

            } catch (error) {
                console.error('Error loading preview kanji:', error);
                setPreviewKanji([]);
            }
        };

        loadPreviewKanji();
    }, [selectedLevel, apiToken]);

    // Update preview kanji when study materials change (to reflect translation progress)
    useEffect(() => {
        const updatePreviewWithLatestSynonyms = () => {
            if (previewKanji.length === 0 || studyMaterials.length === 0) return;

            console.log('🔄 Updating preview kanji with latest synonyms...');

            // Check if any synonyms actually changed to avoid unnecessary updates
            let hasChanges = false;
            const updatedPreview: Kanji[] = previewKanji.map(previewKanji => {
                // Find updated study material for this kanji
                const updatedStudyMaterial = studyMaterials.find(
                    sm => sm.data.subject_id === previewKanji.id
                );

                if (updatedStudyMaterial) {
                    const newSynonyms = updatedStudyMaterial.data.meaning_synonyms || [];
                    // Check if synonyms actually changed
                    if (JSON.stringify(newSynonyms) !== JSON.stringify(previewKanji.currentSynonyms)) {
                        hasChanges = true;
                        return {
                            ...previewKanji,
                            currentSynonyms: newSynonyms
                        };
                    }
                }

                return previewKanji;
            });

            // Only update if there are actual changes
            if (hasChanges) {
                setPreviewKanji(updatedPreview);
                console.log('✅ Preview kanji updated with latest synonyms');
            }
        };

        updatePreviewWithLatestSynonyms();
    }, [studyMaterials]); // Only depend on studyMaterials, not previewKanji

    // Load kanji when API token changes
    useEffect(() => {
        if (apiToken.trim()) {
            loadKanjiFromAPI();
        }
    }, [apiToken]);

    return {
        // State
        apiToken,
        deeplToken,
        selectedLevel,
        synonymMode,
        isProcessing,
        progress,
        translationStatus,
        uploadStatus,
        uploadStats,
        wkKanji,
        studyMaterials,
        isLoadingKanji,
        apiError,
        filteredKanji,
        // New optimized loading state - simplified
        currentLevelCount,
        currentLevelCountLoading,
        previewKanji,
        // Real-time progress tracking
        processedCount,
        totalCountForProcessing,

        // Actions
        handleApiTokenChange,
        handleDeeplTokenChange,
        setSelectedLevel,
        setSynonymMode,
        setIsProcessing,
        setProgress,
        setTranslationStatus,
        setUploadStatus,
        setUploadStats,
        processTranslations,
        stopProcessing,
        loadKanjiFromAPI,
        refreshStudyMaterials
    };
}
