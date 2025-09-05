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
const MAX_SYNONYMS_WANIKANI = 8; // WaniKani API limit for synonyms
const MAX_SYNONYM_BYTES = 63; // WaniKani has 64 byte limit, using 63 for minimal safety margin

/**
 * Get UTF-8 byte length of a string (browser-compatible)
 */
const getByteLength = (str: string): number => {
    return new TextEncoder().encode(str).length;
};

/**
 * Truncate synonym to fit WaniKani's 64-byte limit per synonym.
 * Uses 63-byte safety margin for minimal overhead.
 * Adds "~" indicator when truncated.
 */
const truncateSynonym = (str: string): string => {
    let truncated = str.replace(/…/g, "~"); // Replace ellipsis (3 bytes) with tilde (1 byte)
    let wasTruncated = false;

    while (getByteLength(truncated) > MAX_SYNONYM_BYTES) {
        truncated = truncated.slice(0, -1);
        wasTruncated = true;
    }

    if (wasTruncated) {
        // Make sure we have space for the "~"
        while (getByteLength(truncated + "~") > MAX_SYNONYM_BYTES) {
            truncated = truncated.slice(0, -1);
        }
        truncated += "~";
    }

    return truncated;
};

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
    primaryMeaning: string; // Primary meaning from WaniKani
    alternativeMeanings: string[]; // Alternative meanings from WaniKani
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
    const [selectedKanjiCount, setSelectedKanjiCount] = useState<number>(0); // Count of selected kanji for processing

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

        return wkKanji.map(kanji => {
            // Get primary meaning
            const primaryMeaningObj = kanji.data.meanings.find(m => m.primary) || kanji.data.meanings[0];
            const primaryMeaning = primaryMeaningObj?.meaning || 'Unknown';

            // Get alternative meanings (accepted answers excluding the primary meaning)
            const alternativeMeanings = kanji.data.meanings
                .filter(m => m.accepted_answer && m.meaning !== primaryMeaning)
                .map(m => m.meaning);

            return {
                id: kanji.id,
                primaryMeaning,
                alternativeMeanings,
                characters: kanji.data.characters,
                level: kanji.data.level,
                currentSynonyms: studyMaterialsMap.get(kanji.id)?.data.meaning_synonyms || [],
                selected: true,
                translatedSynonyms: [],
                meaningMnemonic: kanji.data.meaning_mnemonic || undefined
            };
        });
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

    // Load kanji in batches for processing (no longer loads all at once)
    const loadKanjiBatch = async (offset: number = 0, limit: number = TRANSLATION_BATCH_SIZE): Promise<{ kanji: Kanji[], hasMore: boolean, totalCount: number }> => {
        try {
            const options: { levels?: string; limit: number; offset: number } = {
                limit,
                offset
            };

            if (selectedLevel !== 'all') {
                options.levels = selectedLevel.toString();
            }

            console.log(`Loading kanji batch: offset=${offset}, limit=${limit}, level=${selectedLevel}`);

            // Load kanji batch
            const kanjiResponse = await getKanji(apiToken, undefined, options);
            console.log(`API returned ${kanjiResponse.length} kanji for offset=${offset}`);

            // If we got fewer kanji than requested, there are no more
            const hasMore = kanjiResponse.length === limit;

            // Early return if no kanji found
            if (kanjiResponse.length === 0) {
                return {
                    kanji: [],
                    hasMore: false,
                    totalCount: totalKanjiCount || 0
                };
            }

            // Get study materials only for this batch
            const subjectIds = kanjiResponse.map(k => k.id.toString()).join(',');
            const studyMaterials = await getKanjiStudyMaterials(apiToken, undefined, {
                subject_ids: subjectIds
            });

            // Convert to internal format
            const convertedKanji = convertToInternalFormat(kanjiResponse, studyMaterials);

            return {
                kanji: convertedKanji,
                hasMore,
                totalCount: totalKanjiCount || 0
            };

        } catch (error) {
            console.error('Error loading kanji batch:', error);
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
                const updatedStudyMaterial = await executeWithWaniKaniLimiter(
                    () => updateKanjiSynonyms(apiToken, existingStudyMaterial.id, synonymsToUpload),
                    `update-${kanji.id}`
                );
                localUploadStats.updated++;

                // Update local study materials to reflect the new synonyms
                if (updatedStudyMaterial) {
                    setStudyMaterials(prevStudyMaterials =>
                        prevStudyMaterials.map(sm =>
                            sm.id === existingStudyMaterial.id
                                ? updatedStudyMaterial
                                : sm
                        )
                    );
                }
            } else {
                const newStudyMaterial = await executeWithWaniKaniLimiter(
                    () => createKanjiSynonyms(apiToken, kanji.id, synonymsToUpload),
                    `create-${kanji.id}`
                );
                localUploadStats.created++;

                // Add new study material to local state
                if (newStudyMaterial) {
                    setStudyMaterials(prevStudyMaterials => [...prevStudyMaterials, newStudyMaterial]);
                }
            }

            localUploadStats.successful++;

        } catch (error) {
            console.error(`Upload failed for ${result.kanji.primaryMeaning}:`, error);

            if (error instanceof Error && error.message === 'Processing stopped by user') {
                return localUploadStats;
            }

            result.status = 'error';
            result.message = `❌ Upload fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`;
            localUploadStats.failed++;
        }

        return localUploadStats;
    };

    // Helper function to translate all meanings (primary + alternatives) with smart synonym management
    const translateAllMeanings = async (kanji: Kanji): Promise<{ primary: string | null, alternatives: string[] }> => {
        const translations = { primary: null as string | null, alternatives: [] as string[] };

        // First, translate the primary meaning
        try {
            const context = extractContextFromMnemonic(
                kanji.meaningMnemonic || '',
                kanji.primaryMeaning
            );

            const primaryTranslation = await executeWithDeepLLimiter(
                () => translateText(
                    deeplToken,
                    kanji.primaryMeaning,
                    'DE',
                    false,
                    3,
                    context || undefined
                ),
                `translate-primary-${kanji.primaryMeaning}-${kanji.id}`
            );

            const cleanedPrimary = primaryTranslation.trim();
            if (cleanedPrimary && cleanedPrimary.length > 0) {
                translations.primary = truncateSynonym(cleanedPrimary);
            }
        } catch (error) {
            console.warn(`Primary translation failed for "${kanji.primaryMeaning}":`, error);
        }

        // Then translate alternative meanings
        for (const alternativeMeaning of kanji.alternativeMeanings) {
            try {
                const context = extractContextFromMnemonic(
                    kanji.meaningMnemonic || '',
                    alternativeMeaning
                );

                const altTranslation = await executeWithDeepLLimiter(
                    () => translateText(
                        deeplToken,
                        alternativeMeaning,
                        'DE',
                        false,
                        3,
                        context || undefined
                    ),
                    `translate-alt-${alternativeMeaning}-${kanji.id}`
                );

                const cleanedAlt = altTranslation.trim();
                if (cleanedAlt && cleanedAlt.length > 0) {
                    translations.alternatives.push(truncateSynonym(cleanedAlt));
                }
            } catch (error) {
                console.warn(`Alternative translation failed for "${alternativeMeaning}":`, error);
                // Continue with next alternative
            }
        }

        return translations;
    };

    // Helper function to merge translations with existing synonyms (Primary drops last)
    const mergeTranslationsWithSynonyms = (
        translations: { primary: string | null, alternatives: string[] },
        currentSynonyms: string[],
        synonymMode: string
    ): string[] => {
        switch (synonymMode) {
            case 'replace': {
                // In replace mode: Primary first, then alternatives, respect limit
                const allNewTranslations = [];

                // Add primary first
                if (translations.primary) {
                    allNewTranslations.push(translations.primary);
                }

                // Add alternatives after primary
                for (const alt of translations.alternatives) {
                    if (allNewTranslations.length < MAX_SYNONYMS_WANIKANI) {
                        allNewTranslations.push(alt);
                    }
                }

                return allNewTranslations;
            }

            case 'smart-merge': {
                // Start with existing synonyms
                const existing = currentSynonyms || [];
                const merged = [...existing];

                // Add primary translation first (if not duplicate and space available)
                if (translations.primary && merged.length < MAX_SYNONYMS_WANIKANI) {
                    const isPrimaryExists = merged.some(syn =>
                        syn.toLowerCase().trim() === translations.primary!.toLowerCase().trim()
                    );

                    if (!isPrimaryExists) {
                        merged.push(translations.primary);
                    }
                }

                // Add alternatives after primary (only if space available)
                for (const alt of translations.alternatives) {
                    if (merged.length >= MAX_SYNONYMS_WANIKANI) break;

                    const isAlreadyExists = merged.some(syn =>
                        syn.toLowerCase().trim() === alt.toLowerCase().trim()
                    );

                    if (!isAlreadyExists) {
                        merged.push(alt);
                    }
                }

                return merged;
            }

            default:
                return currentSynonyms || [];
        }
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
                setTranslationStatus(`🗑️ Batch ${batchIndex + 1}/${totalBatches}: Verarbeite ${currentItemIndex}/${totalKanjiCount}: ${kanji.primaryMeaning}...`);

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
                    message: `🗑️ Synonyme gelöscht: ${kanji.primaryMeaning}`
                };

                setUploadStatus(`📤 Batch ${batchIndex + 1}: Lade ${currentItemIndex}/${totalKanjiCount}: ${kanji.primaryMeaning}...`);
                localUploadStats = await uploadSingleKanjiWithRetry(result, localUploadStats);

            } else {
                // Translation modes - now handles Primary + Alternative meanings
                setTranslationStatus(`🌐 Batch ${batchIndex + 1}/${totalBatches}: Übersetze ${currentItemIndex}/${totalKanjiCount}: ${kanji.primaryMeaning} + ${kanji.alternativeMeanings.length} Alternative...`);

                try {
                    // Translate all meanings (primary + alternatives)
                    const allTranslations = await translateAllMeanings(kanji);

                    if (!allTranslations.primary && allTranslations.alternatives.length === 0) {
                        console.warn(`No translations found for kanji: ${kanji.primaryMeaning}`);
                        localUploadStats.failed++;
                        continue;
                    }

                    // Merge translations with existing synonyms based on mode
                    const newSynonyms = mergeTranslationsWithSynonyms(
                        allTranslations,
                        kanji.currentSynonyms || [],
                        synonymMode
                    );

                    const updatedKanji: Kanji = {
                        ...kanji,
                        translatedSynonyms: newSynonyms,
                        currentSynonyms: newSynonyms
                    };

                    const totalTranslations = (allTranslations.primary ? 1 : 0) + allTranslations.alternatives.length;
                    const translationSummary = totalTranslations > 1
                        ? `${totalTranslations} Bedeutungen übersetzt (${allTranslations.primary ? 'Primary' : ''}${allTranslations.primary && allTranslations.alternatives.length > 0 ? ' + ' : ''}${allTranslations.alternatives.length > 0 ? allTranslations.alternatives.length + ' Alt' : ''})`
                        : allTranslations.primary
                            ? `"${kanji.primaryMeaning}" → "${allTranslations.primary}"`
                            : `${allTranslations.alternatives.length} Alternative übersetzt`;

                    const result: ProcessResult = {
                        kanji: updatedKanji,
                        status: 'success',
                        message: `🌐 ${translationSummary} (${newSynonyms.length}/${MAX_SYNONYMS_WANIKANI} Synonyme)`
                    };

                    setUploadStatus(`📤 Batch ${batchIndex + 1}: Lade ${currentItemIndex}/${totalKanjiCount}: ${kanji.primaryMeaning}...`);
                    localUploadStats = await uploadSingleKanjiWithRetry(result, localUploadStats);

                } catch (error) {
                    console.error(`Translation failed for ${kanji.primaryMeaning}:`, error);

                    if (error instanceof Error && error.message === 'Processing stopped by user') {
                        setTranslationStatus(`⏹️ Übersetzung gestoppt bei ${kanji.primaryMeaning}`);
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

    // Start processing - processes kanji in batches to avoid loading all at once
    const startProcessing = async () => {
        if (synonymMode !== 'delete' && !deeplToken) {
            setTranslationStatus('❌ DeepL Token fehlt für Übersetzung.');
            return;
        }

        setIsProcessing(true);
        setShouldStopProcessing(false);
        stopRef.current = false;
        setProgress(0);
        setTranslationStatus('� Starte Batch-Verarbeitung...');

        try {
            // Process kanji in batches to avoid loading all at once
            await processBatchesSequentially();

        } catch (error) {
            console.error('Error starting processing:', error);
            setTranslationStatus('❌ Fehler beim Verarbeiten der Kanji.');
            setIsProcessing(false);
        }
    };

    // Process kanji in sequential batches
    const processBatchesSequentially = async () => {
        setUploadStats({ created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 });

        let offset = 0;
        let processedCount = 0;
        let hasMore = true;
        let batchNumber = 1;
        const batchSize = TRANSLATION_BATCH_SIZE;

        while (hasMore && !stopRef.current) {
            try {
                // Load next batch
                setTranslationStatus(`📦 Lade Batch ${batchNumber} (Kanji ${offset + 1}-${offset + batchSize})...`);
                const batchResult = await loadKanjiBatch(offset, batchSize);

                // If no kanji in this batch, we're done
                if (batchResult.kanji.length === 0) {
                    console.log('No more kanji found, ending batch processing');
                    break;
                }

                console.log(`Loaded batch ${batchNumber}: ${batchResult.kanji.length} kanji`);

                // Filter selected kanji from this batch
                const selectedKanji = batchResult.kanji.filter(k => k.selected);
                console.log(`Selected kanji in batch ${batchNumber}: ${selectedKanji.length}`);

                if (selectedKanji.length > 0) {
                    // Process this batch
                    await processTranslations(selectedKanji);
                }

                processedCount += batchResult.kanji.length;
                offset += batchSize;
                batchNumber++;

                // Check if we have more based on actual returned data
                hasMore = batchResult.kanji.length === batchSize && batchResult.hasMore;

                // Update progress based on total count
                if (batchResult.totalCount > 0) {
                    const progressPercent = Math.min((processedCount / batchResult.totalCount) * 100, 100);
                    setProgress(progressPercent);
                }

                // Add small delay between batches to avoid rate limiting
                if (hasMore) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

            } catch (error) {
                console.error('Error processing batch:', error);

                // Check if it's a rate limit error (429)
                if (error && typeof error === 'object' && 'response' in error &&
                    error.response && typeof error.response === 'object' &&
                    'status' in error.response && error.response.status === 429) {
                    setTranslationStatus('⏳ Rate limit erreicht, warte 60 Sekunden...');
                    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 60 seconds
                    // Don't increment offset or batch number, try the same batch again
                    continue;
                } else {
                    setTranslationStatus('❌ Fehler bei Batch-Verarbeitung.');
                    break;
                }
            }
        }

        if (!stopRef.current) {
            setTranslationStatus('✅ Alle Batches verarbeitet.');
        }

        setIsProcessing(false);
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

        setSelectedKanjiCount(filteredKanjiData.length); // Update the count for UI display
        setTranslationStatus(`📊 ${filteredKanjiData.length} ausgewählte Kanji gefunden. Starte Verarbeitung...`);

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
            setSelectedKanjiCount(0); // Reset selected count after processing
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

    // Kanji count for display - use selected count during processing, otherwise total count
    const kanjiCount = selectedKanjiCount > 0 ? selectedKanjiCount : (totalKanjiCount > 0 ? totalKanjiCount : filteredKanji.length);

    console.log('🔢 Kanji count calculation:', {
        totalKanjiCount,
        selectedKanjiCount,
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
