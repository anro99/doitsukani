import { useState, useEffect, useMemo, useRef } from 'react';
import { Subject, StudyMaterial } from '@bachman-dev/wanikani-api-types';
import { getRadicals, getRadicalStudyMaterials, createRadicalSynonyms, updateRadicalSynonyms, getRadicalCount, getRadicalsPreview } from '../../../shared/lib/wanikani';

// Type alias for better readability
type RadicalSubject = Subject & { object: 'radical' };
type WKStudyMaterial = StudyMaterial; // Compatibility alias
import { translateText } from '../../../shared/lib/deepl';
import { extractContextFromMnemonic } from '../../../shared/lib/contextual-translation';
import { loadWanikaniToken, saveWanikaniToken, removeToken, STORAGE_KEYS, loadDeepLToken, saveDeepLToken } from '../../../shared/lib/storage';
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

export interface Radical {
    id: number;
    meaning: string;
    characters?: string;
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
    radical: Radical;
    status: 'success' | 'error' | 'uploaded';
    message: string;
}

export type SynonymMode = 'replace' | 'smart-merge' | 'delete';

export function useRadicalsManager() {
    // Stop processing flag with ref for immediate access
    const stopRef = useRef(false);

    // React 19 compatibility: Track component mount state
    const mountedRef = useRef(true);

    // Reset stopRef when component mounts or re-mounts
    useEffect(() => {
        stopRef.current = false; // Always start with false
        return () => {
            mountedRef.current = false;
            // DON'T set stopRef.current = true here - it causes premature stopping
        };
    }, []);

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
    const [wkRadicals, setWkRadicals] = useState<RadicalSubject[]>([]);
    const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);

    // New state for optimized loading - simplified: only current level
    const [currentLevelCount, setCurrentLevelCount] = useState<number | undefined>(undefined);
    const [currentLevelCountLoading, setCurrentLevelCountLoading] = useState(false);
    const [previewRadicals, setPreviewRadicals] = useState<Radical[]>([]); // Changed to Radical[]
    const [isLoadingRadicals, setIsLoadingRadicals] = useState(false);
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

    // Convert Wanikani radicals to internal format
    const convertToInternalFormat = (wkRadicals: RadicalSubject[], studyMaterials: StudyMaterial[]): Radical[] => {
        const studyMaterialsMap = new Map<number, StudyMaterial>();
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
            translatedSynonyms: [],
            meaningMnemonic: radical.data.meaning_mnemonic || undefined
        }));
    };

    // Filter radicals by selected level
    const filteredRadicals = useMemo(() => {
        if (wkRadicals.length === 0) return [];

        const internalRadicals = convertToInternalFormat(wkRadicals, studyMaterials);

        if (selectedLevel === 'all') {
            return internalRadicals;
        }

        return internalRadicals.filter(radical => radical.level === selectedLevel);
    }, [wkRadicals, studyMaterials, selectedLevel]);

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

    // Refresh study materials to show updated synonyms immediately
    const refreshStudyMaterials = async () => {
        if (!apiToken || wkRadicals.length === 0) return;

        try {
            const subjectIds = wkRadicals.map(r => r.id.toString()).join(',');
            const materials = await getRadicalStudyMaterials(apiToken, undefined, {
                subject_ids: subjectIds
            });
            setStudyMaterials(materials);
        } catch (error) {
            console.error('Error refreshing study materials:', error);
        }
    };

    // Update specific radical in preview after successful upload
    const updatePreviewRadicalSynonyms = (radicalId: number, newSynonyms: string[]) => {
        setPreviewRadicals(prevPreview =>
            prevPreview.map(previewRadical => {
                if (previewRadical.id === radicalId) {
                    return {
                        ...previewRadical,
                        currentSynonyms: newSynonyms
                    };
                }
                return previewRadical;
            })
        );
    };

    // Upload a single radical with retry logic
    const uploadSingleRadicalWithRetry = async (
        result: ProcessResult,
        localUploadStats: UploadStats,
        radicalIndex: number
    ): Promise<UploadStats> => {
        try {
            const radical = result.radical;
            const synonymsToUpload = result.radical.translatedSynonyms;

            if (synonymsToUpload.length === 0 && synonymMode !== 'delete') {
                localUploadStats.skipped++;
                localUploadStats.successful++;

                // Update real-time progress
                setProcessedCount(radicalIndex + 1);
                const newProgress = totalCountForProcessingRef.current > 0 ? ((radicalIndex + 1) / totalCountForProcessingRef.current) * 100 : 0;
                setProgress(Math.round(newProgress));

                return localUploadStats;
            }

            // 🔧 CRITICAL FIX: Check if study material exists in studyMaterials array
            const existingStudyMaterial = studyMaterials.find(sm => sm.data.subject_id === radical.id);

            if (existingStudyMaterial) {
                // Update existing study material using the study_material ID, not the subject ID
                await executeWithWaniKaniLimiter(
                    () => updateRadicalSynonyms(apiToken, existingStudyMaterial.id, synonymsToUpload),
                    `update-${radical.id}`
                );
                localUploadStats.updated++;
            } else {
                // Create new study material using the subject ID
                await executeWithWaniKaniLimiter(
                    () => createRadicalSynonyms(apiToken, radical.id, synonymsToUpload),
                    `create-${radical.id}`
                );
                localUploadStats.created++;
            }

            localUploadStats.successful++;

            // 🚀 Real-time progress update after successful upload
            setProcessedCount(radicalIndex + 1);
            const newProgress = totalCountForProcessingRef.current > 0 ? ((radicalIndex + 1) / totalCountForProcessingRef.current) * 100 : 0;
            setProgress(Math.round(newProgress));

            // Live status update
            setUploadStatus(`✅ ${radical.characters || radical.meaning} erfolgreich aktualisiert (${radicalIndex + 1}/${totalCountForProcessingRef.current})`);

            // 🚀 NEW: Immediately update preview radicals for this specific radical
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

            updatePreviewRadicalSynonyms(radical.id, finalSynonyms);

        } catch (error) {
            console.error(`Upload failed for ${result.radical.meaning}:`, error);

            // Check if error is due to stop
            if (error instanceof Error && error.message === 'Processing stopped by user') {
                // Don't count as failed if stopped by user
                return localUploadStats;
            }

            result.status = 'error';
            result.message = `❌ Upload fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`;
            localUploadStats.failed++;

            // Update progress even on failure
            setProcessedCount(radicalIndex + 1);
            const newProgress = totalCountForProcessingRef.current > 0 ? ((radicalIndex + 1) / totalCountForProcessingRef.current) * 100 : 0;
            setProgress(Math.round(newProgress));
        }

        return localUploadStats;
    };    // Process a batch of radicals with batch progress tracking
    const processBatch = async (
        batch: Radical[],
        batchIndex: number,
        totalBatches: number,
        localUploadStats: UploadStats
    ) => {
        const batchSize = batch.length;
        setTranslationStatus(`📦 Verarbeite Batch ${batchIndex + 1}/${totalBatches} (${batchSize} Radicals)...`);

        for (let i = 0; i < batch.length; i++) {
            // Only check stopRef for actual stopping - shouldStopProcessing is just for UI
            if (stopRef.current) {
                setTranslationStatus(`⏹️ Verarbeitung gestoppt bei Batch ${batchIndex + 1}/${totalBatches}, Item ${i + 1}/${batchSize}`);
                return { ...localUploadStats, stopped: true };
            }

            const radical = batch[i];

            if (synonymMode === 'delete') {
                setTranslationStatus(`🗑️ Batch ${batchIndex + 1}/${totalBatches}: Verarbeite ${i + 1}/${batchSize}: ${radical.meaning}...`);

                // Skip radicals that already have no synonyms
                if (!radical.currentSynonyms || radical.currentSynonyms.length === 0) {
                    localUploadStats.skipped++;
                    localUploadStats.successful++;
                    continue;
                }

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

                setUploadStatus(`📤 Batch ${batchIndex + 1}: Lade ${i + 1}/${batchSize}: ${radical.meaning}...`);
                localUploadStats = await uploadSingleRadicalWithRetry(result, localUploadStats, (batchIndex * TRANSLATION_BATCH_SIZE) + i);

            } else {
                // Translation modes
                setTranslationStatus(`🌐 Batch ${batchIndex + 1}/${totalBatches}: Übersetze ${i + 1}/${batchSize}: ${radical.meaning}...`);

                try {
                    const context = extractContextFromMnemonic(
                        radical.meaningMnemonic || '',
                        radical.meaning
                    );

                    const translation = await executeWithDeepLLimiter(
                        () => translateText(
                            deeplToken,
                            radical.meaning,
                            'DE',
                            false,
                            3,
                            context || undefined
                        ),
                        `translate-${radical.meaning}`
                    );

                    // Apply synonym mode logic
                    let newSynonyms: string[] = [];
                    const currentSynonyms = radical.currentSynonyms || [];
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

                    const updatedRadical: Radical = {
                        ...radical,
                        translatedSynonyms: newSynonyms,
                        currentSynonyms: newSynonyms
                    };

                    const result: ProcessResult = {
                        radical: updatedRadical,
                        status: 'success',
                        message: `🌐 Übersetzt: "${radical.meaning}" → "${translatedSynonym}"`
                    };

                    setUploadStatus(`📤 Batch ${batchIndex + 1}: Lade ${i + 1}/${batchSize}: ${radical.meaning}...`);
                    localUploadStats = await uploadSingleRadicalWithRetry(result, localUploadStats, (batchIndex * TRANSLATION_BATCH_SIZE) + i);

                } catch (error) {
                    console.error(`Translation failed for ${radical.meaning}:`, error);

                    // Check if error is due to stop
                    if (error instanceof Error && error.message === 'Processing stopped by user') {
                        setTranslationStatus(`⏹️ Übersetzung gestoppt bei ${radical.meaning}`);
                        return { ...localUploadStats, stopped: true };
                    }

                    localUploadStats.failed++;
                }
            }
        }

        return localUploadStats;
    };

    // Process translations (enhanced implementation with DeepL)
    const processTranslations = async (radicals: Radical[]) => {
        if (synonymMode !== 'delete' && !deeplToken) {
            setTranslationStatus('❌ DeepL Token fehlt für Übersetzung.');
            return;
        }

        if (radicals.length === 0) {
            setTranslationStatus('❌ Keine Radicals ausgewählt.');
            return;
        }

        setIsProcessing(true);
        // Only reset stopRef - shouldStopProcessing is not needed
        stopRef.current = false; // Reset ref flag
        setProgress(0);
        setTranslationStatus('🚀 Starte Batch-Verarbeitung mit Rate-Limiting-Schutz...');

        // Reset stats at start of processing
        setUploadStats({ created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 });

        const filteredRadicals = radicals.filter(r => r.selected);

        // Initialize real-time progress tracking
        setTotalCountForProcessing(filteredRadicals.length);
        totalCountForProcessingRef.current = filteredRadicals.length; // Update ref for async access
        setProcessedCount(0);

        let localUploadStats = { created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 };

        try {
            // Split radicals into batches
            const batches = [];
            for (let i = 0; i < filteredRadicals.length; i += TRANSLATION_BATCH_SIZE) {
                batches.push(filteredRadicals.slice(i, i + TRANSLATION_BATCH_SIZE));
            }

            const totalBatches = batches.length;
            setTranslationStatus(`📦 Verarbeite ${filteredRadicals.length} Radicals in ${totalBatches} Batches (${TRANSLATION_BATCH_SIZE} pro Batch)...`);

            // Process each batch
            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                // Only check stopRef for actual stopping - shouldStopProcessing is just for UI
                if (stopRef.current) {
                    setTranslationStatus(`⏹️ Verarbeitung vom Benutzer gestoppt nach ${batchIndex} von ${totalBatches} Batches`);
                    setUploadStatus(`⏹️ Gestoppt! Teilweise abgeschlossen: Erstellt: ${localUploadStats.created}, Aktualisiert: ${localUploadStats.updated}, Fehler: ${localUploadStats.failed}, Übersprungen: ${localUploadStats.skipped}`);
                    break;
                }

                const batch = batches[batchIndex];
                const result = await processBatch(batch, batchIndex, totalBatches, localUploadStats);

                // Check if processBatch was stopped
                if ('stopped' in result && (result as any).stopped) {
                    localUploadStats = { ...result };
                    delete (localUploadStats as any).stopped;
                    setUploadStatus(`⏹️ Gestoppt! Teilweise abgeschlossen: Erstellt: ${localUploadStats.created}, Aktualisiert: ${localUploadStats.updated}, Fehler: ${localUploadStats.failed}, Übersprungen: ${localUploadStats.skipped}`);
                    break;
                }

                localUploadStats = result;

                // Progress is now updated in real-time by uploadSingleRadicalWithRetry
                // No need to update here as it would overwrite individual radical progress

                // Update React state with current statistics
                setUploadStats({ ...localUploadStats });
            }

            // Final status message
            const totalSuccessful = localUploadStats.successful;
            const totalProcessed = filteredRadicals.length;

            let statusMessage = `✅ Verarbeitung abgeschlossen! ${totalSuccessful}/${totalProcessed} erfolgreich verarbeitet`;

            // Add detailed breakdown
            const details = [];
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
                await refreshStudyMaterials();
            }

        } catch (error) {
            console.error('Processing error:', error);
            if (mountedRef.current) {
                setTranslationStatus(`❌ Fehler bei der Verarbeitung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
            }
        } finally {
            // Always reset processing state, even if component unmounted
            setIsProcessing(false);
        }
    };

    // Stop processing function
    const stopProcessing = () => {
        // Only set stopRef - shouldStopProcessing is not needed for actual stopping
        stopRef.current = true;
        setIsProcessing(false);

        // Set status messages to indicate stopping
        setTranslationStatus('⏹️ Stoppe Verarbeitung...');
        setUploadStatus('⏹️ Verarbeitung gestoppt');
    };

    // Load radical count when level changes (simplified - only current level)
    useEffect(() => {
        const loadCurrentLevelCount = async () => {
            if (!apiToken) return;

            // If we're already loading, don't start again
            if (currentLevelCountLoading) {
                return;
            }

            setCurrentLevelCountLoading(true);

            try {
                const count = await getRadicalCount(
                    apiToken,
                    selectedLevel === 'all' ? undefined : selectedLevel
                );

                setCurrentLevelCount(count);

            } catch (error) {
                console.error(`Error loading count for level ${selectedLevel}:`, error);
                setCurrentLevelCount(undefined);
            } finally {
                setCurrentLevelCountLoading(false);
            }
        };

        loadCurrentLevelCount();
    }, [selectedLevel, apiToken]); // Simplified dependencies

    // Load preview radicals when level changes
    useEffect(() => {
        const loadPreviewRadicals = async () => {
            if (!apiToken) return;

            try {
                const preview = await getRadicalsPreview(
                    apiToken,
                    selectedLevel === 'all' ? undefined : selectedLevel,
                    12
                );

                // Also load study materials for the preview radicals to show synonyms
                let previewStudyMaterials: WKStudyMaterial[] = [];
                if (preview.length > 0) {
                    previewStudyMaterials = await getRadicalStudyMaterials(apiToken);
                }

                // Convert WKRadical[] to Radical[] format with actual synonyms
                const convertedPreview: Radical[] = preview.map(wkRadical => {
                    // Find study material for this radical
                    const studyMaterial = previewStudyMaterials.find(
                        sm => sm.data.subject_id === wkRadical.id
                    );
                    const currentSynonyms = studyMaterial?.data.meaning_synonyms || [];

                    return {
                        id: wkRadical.id,
                        meaning: wkRadical.data.meanings[0]?.meaning || '',
                        characters: wkRadical.data.characters || wkRadical.data.character_images?.[0]?.url,
                        level: wkRadical.data.level,
                        currentSynonyms: currentSynonyms, // Now has real synonyms
                        selected: false,
                        translatedSynonyms: [],
                        meaningMnemonic: wkRadical.data.meaning_mnemonic
                    };
                });

                setPreviewRadicals(convertedPreview);

            } catch (error) {
                console.error('Error loading preview radicals:', error);
                setPreviewRadicals([]);
            }
        };

        loadPreviewRadicals();
    }, [selectedLevel, apiToken]);

    // Update preview radicals when study materials change (to reflect translation progress)
    useEffect(() => {
        const updatePreviewWithLatestSynonyms = () => {
            if (previewRadicals.length === 0 || studyMaterials.length === 0) return;

            // Check if any synonyms actually changed to avoid unnecessary updates
            let hasChanges = false;
            const updatedPreview: Radical[] = previewRadicals.map(previewRadical => {
                // Find updated study material for this radical
                const updatedStudyMaterial = studyMaterials.find(
                    sm => sm.data.subject_id === previewRadical.id
                );

                if (updatedStudyMaterial) {
                    const newSynonyms = updatedStudyMaterial.data.meaning_synonyms || [];
                    // Check if synonyms actually changed
                    if (JSON.stringify(newSynonyms) !== JSON.stringify(previewRadical.currentSynonyms)) {
                        hasChanges = true;
                        return {
                            ...previewRadical,
                            currentSynonyms: newSynonyms
                        };
                    }
                }

                return previewRadical;
            });

            // Only update if there are actual changes
            if (hasChanges) {
                setPreviewRadicals(updatedPreview);
            }
        };

        updatePreviewWithLatestSynonyms();
    }, [studyMaterials]); // Only depend on studyMaterials, not previewRadicals

    // Load radicals when API token changes
    useEffect(() => {
        if (apiToken.trim()) {
            loadRadicalsFromAPI();
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
        wkRadicals,
        studyMaterials,
        isLoadingRadicals,
        apiError,
        filteredRadicals,
        // New optimized loading state - simplified
        currentLevelCount,
        currentLevelCountLoading,
        previewRadicals,
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
        loadRadicalsFromAPI,
        refreshStudyMaterials
    };
}
