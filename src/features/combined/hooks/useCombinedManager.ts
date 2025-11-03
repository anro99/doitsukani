/**
 * useCombinedManager Hook
 * 
 * Manages combined processing of Radicals, Kanji and Vocabulary
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import {
    loadWanikaniToken,
    saveWanikaniToken,
    removeToken,
    STORAGE_KEYS,
    loadDeepLToken,
    saveDeepLToken
} from '../../../shared/lib/storage';
import {
    fetchCombinedPreview,
    fetchCombinedSubjects,
    fetchCombinedStudyMaterials,
    convertToCombinedItem,
    getCombinedCount
} from '../lib/combined-wanikani';
import { processCombinedStreaming } from '../lib/combined-streaming-integration';
import type { CombinedItem } from '../types/combined-types';
import { isRadical, isKanji, isVocabulary } from '../types/combined-types'; export type SynonymMode = 'replace' | 'smart-merge' | 'delete';

export interface CombinedManagerState {
    // Settings
    selectedLevel: number | 'all';
    setSelectedLevel: (level: number | 'all') => void;
    synonymMode: SynonymMode;
    setSynonymMode: (mode: SynonymMode) => void;

    // Tokens
    apiToken: string;
    handleApiTokenChange: (token: string) => void;
    deeplToken: string;
    handleDeepLTokenChange: (token: string) => void;

    // Data
    combinedItems: CombinedItem[];
    totalCount: number;
    radicalCount: number;
    kanjiCount: number;
    vocabularyCount: number;
    displayedPreviewCount: number;

    // Loading states
    isLoadingItems: boolean;
    apiError: string;

    // Processing states
    isProcessing: boolean;
    progress: number;
    streamingResult: import('../lib/combined-streaming-integration').CombinedProcessingResult | null;
    streamingPhases: import('@/shared/components/processing/ProcessingControls').StreamingProcessingPhase | null;

    // Upload stats für UI
    uploadStats: import('../lib/combined-types').CombinedUploadStats;

    // Error tracking
    errorItems: Map<number, string>;

    // Actions
    loadItemsFromAPI: () => Promise<void>;
    loadMorePreviewItems: () => Promise<void>;
    startProcessing: () => Promise<void>;
    stopProcessing: () => void;
    clearResults: () => void;
    clearErrors: () => void;
}

export function useCombinedManager(): CombinedManagerState {
    // React 19 compatibility: Track component mount state
    const mountedRef = useRef(false);

    // Set mounted to true when component mounts, false when unmounts
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

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

    // Preview display state
    const [displayedPreviewCount, setDisplayedPreviewCount] = useState(12);
    const PREVIEW_BATCH_SIZE = 12;

    // API state
    const [combinedItems, setCombinedItems] = useState<CombinedItem[]>([]);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [apiError, setApiError] = useState<string>('');
    const [totalItemCount, setTotalItemCount] = useState<number>(0);

    // Separate States für total verfügbare Counts (von API)
    const [totalRadicalCount, setTotalRadicalCount] = useState<number>(0);
    const [totalKanjiCount, setTotalKanjiCount] = useState<number>(0);
    const [totalVocabularyCount, setTotalVocabularyCount] = useState<number>(0);

    // Processing states
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const stopSignalRef = useRef({ current: false });

    // Streaming processing states (wie Vocabulary Manager)
    const [streamingResult, setStreamingResult] = useState<import('../lib/combined-streaming-integration').CombinedProcessingResult | null>(null);
    const [streamingPhases, setStreamingPhases] = useState<import('@/shared/components/processing/ProcessingControls').StreamingProcessingPhase | null>(null);

    // Error tracking for display
    const [errorItems, setErrorItems] = useState<Map<number, string>>(new Map());

    // Reset processing state when level changes
    useEffect(() => {
        console.log('[CombinedManager] 🔄 Level changed, resetting processing state');
        setProgress(0);
        setApiError('');
        setIsProcessing(false);
        setStreamingResult(null);
        setStreamingPhases(null);
        setErrorItems(new Map());
    }, [selectedLevel]);

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

    // Processing callback functions (wie Vocabulary Manager)
    const handleItemProcessing = (item: CombinedItem, phase: 'translation' | 'upload') => {
        if (!mountedRef.current) return;

        console.log(`🔄 Processing ${item.type} ${item.id} (${item.characters}) - ${phase}`);

        // Entferne aus Error-Liste (falls vorhanden)
        setErrorItems(prev => {
            const newMap = new Map(prev);
            newMap.delete(item.id);
            return newMap;
        });
    };

    const handleItemUpdated = (item: CombinedItem, result: import('../lib/combined-streaming-integration').CombinedItemResult) => {
        if (!mountedRef.current) return;

        console.log(`✅ Updated ${item.type} ${item.id}:`, result);

        // Live-Update der Combined Items könnte hier implementiert werden
        // Aktuell verwenden wir setCombinedItems nicht live während Processing
    };

    const handleItemError = (item: CombinedItem, error: import('../lib/combined-streaming-integration').CombinedItemError) => {
        if (!mountedRef.current) return;

        console.error(`❌ Error processing ${item.type} ${item.id}:`, error);

        // Zur Error-Liste hinzufügen
        setErrorItems(prev => new Map(prev).set(item.id, error.error));
    };

    // Count items by type from loaded items
    // Hinweis: Keine weitere Filterung nach Level nötig,
    // da fetchCombinedPreview() bereits gefilterte Items zurückgibt
    const typeCounts = useMemo(() => {
        if (!combinedItems || combinedItems.length === 0) {
            return { radicals: 0, kanji: 0, vocabulary: 0, total: 0 };
        }

        const radicals = combinedItems.filter(isRadical).length;
        const kanji = combinedItems.filter(isKanji).length;
        const vocabulary = combinedItems.filter(isVocabulary).length;

        console.log(`[CombinedManager] 📊 Loaded items by type: R=${radicals}, K=${kanji}, V=${vocabulary}`);

        return {
            radicals,
            kanji,
            vocabulary,
            total: combinedItems.length
        };
    }, [combinedItems]);

    // Load items from API
    const loadItemsFromAPI = async () => {
        if (!apiToken) {
            console.error('[CombinedManager] ❌ No API token available');
            setApiError('Kein WaniKani API-Token verfügbar');
            return;
        }

        setIsLoadingItems(true);
        setApiError('');
        setDisplayedPreviewCount(PREVIEW_BATCH_SIZE);

        try {
            const level = selectedLevel === 'all' ? undefined : selectedLevel;

            console.log(`[CombinedManager] 🔄 Loading counts for level ${level || 'all'}...`);

            // ✅ Step 1: Load ONLY counts (3 API calls, minimal data)
            const counts = await getCombinedCount(apiToken, level);

            // Set ALL counts from API (nicht nur total!)
            setTotalItemCount(counts.total);
            setTotalRadicalCount(counts.radicals);
            setTotalKanjiCount(counts.kanji);
            setTotalVocabularyCount(counts.vocabulary);

            console.log(`[CombinedManager] ✅ Total: ${counts.total} items (R=${counts.radicals}, K=${counts.kanji}, V=${counts.vocabulary})`);

            // ✅ Step 2: Load ONLY preview items (default: 12 items)
            console.log(`[CombinedManager] 🔄 Loading preview (${PREVIEW_BATCH_SIZE} items)...`);

            const previewSubjects = await fetchCombinedPreview(
                apiToken,
                level,
                PREVIEW_BATCH_SIZE
            );

            // Load study materials for preview items only
            let studyMaterials: import('@wanikani/wk-types').StudyMaterial[] = [];
            if (previewSubjects.length > 0) {
                const subjectIds = previewSubjects.map((subject) => subject.id);
                studyMaterials = await fetchCombinedStudyMaterials(apiToken, subjectIds);
                console.log(`[CombinedManager] ✅ Loaded ${studyMaterials.length} study materials`);
            }

            // Convert to CombinedItems
            const previewItems = previewSubjects.map(subject =>
                convertToCombinedItem(subject, studyMaterials)
            );

            console.log(`[CombinedManager] ✅ Preview loaded: ${previewItems.length} of ${counts.total} items`);
            setCombinedItems(previewItems);

        } catch (error) {
            console.error('[CombinedManager] ❌ Error loading items:', error);
            setApiError('Fehler beim Laden der Items. Bitte überprüfen Sie Ihren API-Token.');
        } finally {
            setIsLoadingItems(false);
        }
    };

    // Load more preview items
    const loadMorePreviewItems = async () => {
        if (isLoadingItems || !apiToken) return;

        const newDisplayCount = displayedPreviewCount + PREVIEW_BATCH_SIZE;
        setDisplayedPreviewCount(newDisplayCount);

        if (combinedItems.length < newDisplayCount) {
            setIsLoadingItems(true);
            try {
                const level = selectedLevel === 'all' ? undefined : selectedLevel;

                console.log(`[CombinedManager] 🔄 Loading more items (up to ${newDisplayCount})`);

                const moreSubjects = await fetchCombinedPreview(
                    apiToken,
                    level,
                    newDisplayCount + PREVIEW_BATCH_SIZE
                );

                // Load study materials
                let studyMaterials: import('@wanikani/wk-types').StudyMaterial[] = [];
                if (moreSubjects.length > 0) {
                    const subjectIds = moreSubjects.map((subject) => subject.id);
                    studyMaterials = await fetchCombinedStudyMaterials(apiToken, subjectIds);
                    console.log(`[CombinedManager] ✅ Updated ${studyMaterials.length} study materials`);
                }

                // Convert to CombinedItems
                const moreItems = moreSubjects.map(subject =>
                    convertToCombinedItem(subject, studyMaterials)
                );

                console.log(`[CombinedManager] ✅ Loaded ${moreItems.length} items total`);
                setCombinedItems(moreItems);
            } catch (error) {
                console.error('[CombinedManager] ❌ Error loading more items:', error);
                setApiError('Fehler beim Laden weiterer Items.');
            } finally {
                setIsLoadingItems(false);
            }
        }
    };

    // Start processing
    const startProcessing = async () => {
        if (!apiToken || !deeplToken) {
            setApiError('API-Tokens nicht verfügbar');
            return;
        }

        try {
            setIsProcessing(true);
            setProgress(0);
            setApiError('');
            setStreamingResult(null);  // Reset result

            console.log('[CombinedManager] 🚀 Starting processing');

            // Reset stop signal
            stopSignalRef.current = { current: false };

            // ✅ Load ALL items of the selected level, not just preview items
            const level = selectedLevel === 'all' ? undefined : selectedLevel;
            console.log(`[CombinedManager] 🔄 Loading all items for level ${level ?? 'all'}...`);

            const allSubjects = await fetchCombinedSubjects(apiToken, {
                levels: level ? level.toString() : undefined
                // No limit = load ALL items
            });

            console.log(`[CombinedManager] ✅ Loaded ${allSubjects.length} items for processing`);

            // Load study materials for all items
            let studyMaterials: import('@wanikani/wk-types').StudyMaterial[] = [];
            if (allSubjects.length > 0) {
                const subjectIds = allSubjects.map((subject) => subject.id);
                studyMaterials = await fetchCombinedStudyMaterials(apiToken, subjectIds);
                console.log(`[CombinedManager] ✅ Loaded ${studyMaterials.length} study materials`);
            }

            // Convert to CombinedItems
            const allItems = allSubjects.map(subject =>
                convertToCombinedItem(subject, studyMaterials)
            );

            console.log(`[CombinedManager] 📊 Items to process: R=${allItems.filter(isRadical).length}, K=${allItems.filter(isKanji).length}, V=${allItems.filter(isVocabulary).length}`);

            // Process ALL items mit erweiterten Callbacks
            const result = await processCombinedStreaming(allItems, {
                apiToken,
                deeplToken,
                synonymMode,
                batchSize: 1, // ✅ Process one-by-one for frequent UI updates
                onProgress: (progress) => {
                    if (mountedRef.current) {
                        // ✅ Progress RUNDEN (keine Nachkommastellen)
                        setProgress(Math.round(progress.overallProgress));

                        // Create streaming phases from progress data
                        const phases: import('@/shared/components/processing/ProcessingControls').StreamingProcessingPhase = {
                            translationPhase: {
                                status: progress.phase === 'translating' ? 'Active' : 'Completed',
                                progress: progress.translationProgress,
                            },
                            uploadPhase: {
                                status: progress.phase === 'uploading' ? 'Active' : progress.phase === 'translating' ? 'Pending' : 'Completed',
                                progress: progress.uploadProgress,
                            },
                            overallPhase: {
                                status: `${progress.processedCount}/${progress.totalCount}`,
                                progress: progress.overallProgress,
                                currentItem: progress.currentItem,
                            },
                        };
                        setStreamingPhases(phases);

                        console.log('[CombinedManager] 📊 Progress:', {
                            overall: progress.overallProgress,
                            phase: progress.phase,
                            processed: progress.processedCount,
                            total: progress.totalCount,
                        });
                    }
                },
                // ✅ Item-Callbacks für Live-Updates
                onItemProcessing: handleItemProcessing,
                onItemUpdated: handleItemUpdated,
                onItemError: handleItemError,
            }, stopSignalRef.current);

            if (mountedRef.current) {
                // ✅ Result speichern
                setStreamingResult(result);
                setProgress(100);

                if (result.wasStopped) {
                    console.log('[CombinedManager] ⏹️ Processing stopped by user:', result);
                } else if (result.errorCount > 0) {
                    console.warn('[CombinedManager] ⚠️ Processing completed with errors:', result);
                    setApiError(`Processing completed with ${result.errorCount} errors`);
                } else {
                    console.log('[CombinedManager] ✅ Processing completed successfully:', result);

                    // Reload items to show updated synonyms
                    if (result.uploadCount > 0) {
                        setTimeout(() => loadItemsFromAPI(), 1000);
                    }
                }
            }

        } catch (error) {
            if (mountedRef.current) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
                setApiError(`Processing failed: ${errorMessage}`);
                console.error('[CombinedManager] ❌ Processing error:', error);
            }
        } finally {
            if (mountedRef.current) {
                setIsProcessing(false);
            }
        }
    };

    // Stop processing
    const stopProcessing = () => {
        if (stopSignalRef.current && !stopSignalRef.current.current) {
            stopSignalRef.current.current = true;
            console.log('[CombinedManager] 🛑 Stop processing requested');
        }
    };

    // Clear results
    const clearResults = () => {
        console.log('[CombinedManager] 🗑️ Clearing processing results');
        setStreamingResult(null);
        setStreamingPhases(null);
        setProgress(0);
        setErrorItems(new Map());
    };

    // Clear errors only
    const clearErrors = () => {
        console.log('[CombinedManager] 🗑️ Clearing error items');
        setErrorItems(new Map());
    };

    // Load items when component mounts or token/level changes
    useEffect(() => {
        if (apiToken) {
            loadItemsFromAPI();
        }
    }, [apiToken, selectedLevel]);

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
        combinedItems,
        totalCount: totalItemCount > 0 ? totalItemCount : typeCounts.total,
        radicalCount: totalRadicalCount > 0 ? totalRadicalCount : typeCounts.radicals,
        kanjiCount: totalKanjiCount > 0 ? totalKanjiCount : typeCounts.kanji,
        vocabularyCount: totalVocabularyCount > 0 ? totalVocabularyCount : typeCounts.vocabulary,
        displayedPreviewCount,

        // Loading states
        isLoadingItems,
        apiError,

        // Processing states
        isProcessing,
        progress,
        streamingResult,
        streamingPhases,

        // Upload stats für UI
        uploadStats: {
            created: 0,
            updated: 0,
            failed: streamingResult?.errorCount || 0,
            skipped: 0,
            successful: streamingResult?.uploadCount || 0
        },

        // Error tracking
        errorItems,

        // Actions
        loadItemsFromAPI,
        loadMorePreviewItems,
        startProcessing,
        stopProcessing,
        clearResults,
        clearErrors
    };
}
