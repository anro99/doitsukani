import { useState, useEffect, useMemo, useRef } from 'react';
import { WKRadical, WKStudyMaterial } from '@bachmacintosh/wanikani-api-types';
import { getRadicals, getRadicalStudyMaterials, createRadicalSynonyms, updateRadicalSynonyms } from '../lib/wanikani';
import { translateText } from '../lib/deepl';
import { extractContextFromMnemonic } from '../lib/contextual-translation';
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

    // Settings state
    const [selectedLevel, setSelectedLevel] = useState<number | 'all'>(1);
    const [synonymMode, setSynonymMode] = useState<SynonymMode>('smart-merge');

    // Processing state
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [translationStatus, setTranslationStatus] = useState('');
    const [uploadStatus, setUploadStatus] = useState('');
    const [uploadStats, setUploadStats] = useState<UploadStats>({
        created: 0,
        updated: 0,
        failed: 0,
        skipped: 0,
        successful: 0
    });

    // API state
    const [wkRadicals, setWkRadicals] = useState<WKRadical[]>([]);
    const [studyMaterials, setStudyMaterials] = useState<WKStudyMaterial[]>([]);
    const [isLoadingRadicals, setIsLoadingRadicals] = useState(false);
    const [apiError, setApiError] = useState<string>('');

    // Handle token changes with localStorage persistence
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

    // Convert Wanikani radicals to internal format
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
            console.log('🔧 DEBUG: Study materials refreshed successfully');
        } catch (error) {
            console.error('Error refreshing study materials:', error);
        }
    };

    // Upload a single radical with retry logic
    const uploadSingleRadicalWithRetry = async (
        result: ProcessResult,
        localUploadStats: UploadStats
    ): Promise<UploadStats> => {
        try {
            const radical = result.radical;
            const synonymsToUpload = result.radical.translatedSynonyms;

            if (synonymsToUpload.length === 0 && synonymMode !== 'delete') {
                localUploadStats.skipped++;
                localUploadStats.successful++;
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
            // Check if processing should be stopped (both state and ref)
            if (shouldStopProcessing || stopRef.current) {
                setTranslationStatus(`⏹️ Verarbeitung gestoppt bei Batch ${batchIndex + 1}/${totalBatches}, Item ${i + 1}/${batchSize}`);
                return { ...localUploadStats, stopped: true };
            }

            const radical = batch[i];

            if (synonymMode === 'delete') {
                setTranslationStatus(`🗑️ Batch ${batchIndex + 1}/${totalBatches}: Verarbeite ${i + 1}/${batchSize}: ${radical.meaning}...`);

                // Skip radicals that already have no synonyms
                if (!radical.currentSynonyms || radical.currentSynonyms.length === 0) {
                    console.log(`⏭️ DEBUG: Skipping ${radical.meaning} - already has no synonyms`);
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
                localUploadStats = await uploadSingleRadicalWithRetry(result, localUploadStats);

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
                    localUploadStats = await uploadSingleRadicalWithRetry(result, localUploadStats);

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
        setShouldStopProcessing(false); // Reset stop flag
        stopRef.current = false; // Reset ref flag
        setProgress(0);
        setTranslationStatus('🚀 Starte Batch-Verarbeitung mit Rate-Limiting-Schutz...');

        // Reset stats at start of processing
        setUploadStats({ created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 });

        const filteredRadicals = radicals.filter(r => r.selected);
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
                // Check if processing should be stopped (both state and ref)
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
                    setUploadStatus(`⏹️ Gestoppt! Teilweise abgeschlossen: Erstellt: ${localUploadStats.created}, Aktualisiert: ${localUploadStats.updated}, Fehler: ${localUploadStats.failed}, Übersprungen: ${localUploadStats.skipped}`);
                    break;
                }

                localUploadStats = result;

                // Update progress after each batch
                const processedItems = Math.min((batchIndex + 1) * TRANSLATION_BATCH_SIZE, filteredRadicals.length);
                setProgress(Math.round((processedItems / filteredRadicals.length) * 100));

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
