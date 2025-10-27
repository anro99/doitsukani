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
    fetchCombinedStudyMaterials,
    convertToCombinedItem
} from '../lib/combined-wanikani';
import { processCombinedStreaming } from '../lib/combined-streaming-integration';
import type { CombinedItem } from '../types/combined-types';
import { isRadical, isKanji, isVocabulary } from '../types/combined-types';export type SynonymMode = 'replace' | 'smart-merge' | 'delete';

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

    // Actions
    loadItemsFromAPI: () => Promise<void>;
    loadMorePreviewItems: () => Promise<void>;
    startProcessing: () => Promise<void>;
    stopProcessing: () => void;
    clearResults: () => void;
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

    // Processing states
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const stopSignalRef = useRef({ current: false });

    // Reset processing state when level changes
    useEffect(() => {
        console.log('[CombinedManager] 🔄 Level changed, resetting processing state');
        setProgress(0);
        setApiError('');
        setIsProcessing(false);
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

    // Filter items by selected level
    const filteredItems = useMemo(() => {
        if (!combinedItems || combinedItems.length === 0) return [];

        console.log(`[CombinedManager] 🔄 Filtering ${combinedItems.length} items for level ${selectedLevel}`);

        if (selectedLevel === 'all') {
            return combinedItems;
        }

        return combinedItems.filter(item => item.level === selectedLevel);
    }, [combinedItems, selectedLevel]);

    // Count items by type
    const typeCounts = useMemo(() => {
        const radicals = filteredItems.filter(isRadical).length;
        const kanji = filteredItems.filter(isKanji).length;
        const vocabulary = filteredItems.filter(isVocabulary).length;

        console.log(`[CombinedManager] 📊 Type counts: R=${radicals}, K=${kanji}, V=${vocabulary}`);

        return {
            radicals,
            kanji,
            vocabulary,
            total: filteredItems.length
        };
    }, [filteredItems]);

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

            console.log(`[CombinedManager] 🔄 Loading combined items for level ${level || 'all'}`);

            // Load preview items (first batch)
            const previewCount = Math.max(displayedPreviewCount * 2, 48);
            const previewSubjects = await fetchCombinedPreview(apiToken, level, previewCount);

            // Load study materials for preview items
            let studyMaterials: any[] = [];
            if (previewSubjects.length > 0) {
                const subjectIds = previewSubjects.map((subject) => subject.id);
                studyMaterials = await fetchCombinedStudyMaterials(apiToken, subjectIds);
                console.log(`[CombinedManager] ✅ Loaded ${studyMaterials.length} study materials`);
            }

            // Convert to CombinedItems
            const previewItems = previewSubjects.map(subject =>
                convertToCombinedItem(subject, studyMaterials)
            );

            console.log(`[CombinedManager] ✅ Loaded ${previewItems.length} preview items`);
            setCombinedItems(previewItems);

            // Get total count
            // Note: WaniKani API doesn't provide total count directly for combined types
            // We use the preview count as approximation for now
            setTotalItemCount(previewItems.length);

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
                let studyMaterials: any[] = [];
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

            console.log('[CombinedManager] 🚀 Starting processing');

            // Reset stop signal
            stopSignalRef.current = { current: false };

            // Process combined items
            const result = await processCombinedStreaming(filteredItems, {
                apiToken,
                deeplToken,
                synonymMode,
                batchSize: 10,
                onProgress: (progress) => {
                    if (mountedRef.current) {
                        setProgress(progress.overallProgress);
                        console.log('[CombinedManager] 📊 Progress:', {
                            overall: progress.overallProgress,
                            phase: progress.phase,
                            processed: progress.processedCount,
                            total: progress.totalCount,
                        });
                    }
                },
            }, stopSignalRef.current);

            if (mountedRef.current) {
                setProgress(100);
                
                if (result.wasStopped) {
                    console.log('[CombinedManager] ⏹️ Processing stopped by user');
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
        setProgress(0);
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
        combinedItems: filteredItems,
        totalCount: totalItemCount > 0 ? totalItemCount : typeCounts.total,
        radicalCount: typeCounts.radicals,
        kanjiCount: typeCounts.kanji,
        vocabularyCount: typeCounts.vocabulary,
        displayedPreviewCount,

        // Loading states
        isLoadingItems,
        apiError,

        // Processing states
        isProcessing,
        progress,

        // Actions
        loadItemsFromAPI,
        loadMorePreviewItems,
        startProcessing,
        stopProcessing,
        clearResults
    };
}
