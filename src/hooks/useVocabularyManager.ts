import { useState, useEffect, useMemo, useRef } from 'react';
import { Subject, StudyMaterial } from '@bachman-dev/wanikani-api-types';
import {
    getVocabularyStudyMaterials,
    getVocabularyCount,
    getVocabularyPreview
} from '../lib/wanikani';
import { loadWanikaniToken, saveWanikaniToken, removeToken, STORAGE_KEYS, loadDeepLToken, saveDeepLToken } from '../lib/storage';
import {
    processVocabularyStreaming,
    StreamingProcessingPhase,
    StreamingCompleteProcessingResult
} from '../lib/vocabulary-streaming-integration';
import {
    CompleteProcessingOptions,
    VocabularyItemResult,
    VocabularyItemError
} from '../lib/vocabulary-integration';
import { VocabularyItem } from '../lib/vocabulary-translation';

// Type aliases for better readability
type VocabularySubject = Subject & { object: 'vocabulary' };

export interface Vocabulary {
    id: number;
    primaryMeaning: string; // Primary meaning from WaniKani
    alternativeMeanings: string[]; // Alternative meanings from WaniKani
    characters: string;
    level: number;
    readings: string[]; // Vocabulary has readings (hiragana/katakana)
    currentSynonyms: string[];
    selected: boolean;
    translatedSynonyms: string[];
    meaningMnemonic?: string;
}

export interface VocabularyUploadStats {
    created: number;
    updated: number;
    failed: number;
    skipped: number;
    successful: number;
}

export interface VocabularyProcessResult {
    vocabulary: Vocabulary;
    status: 'success' | 'error' | 'uploaded';
    message: string;
}

export type SynonymMode = 'replace' | 'smart-merge' | 'delete';

export function useVocabularyManager() {
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

    // Simplified API state
    const [wkVocabulary, setWkVocabulary] = useState<VocabularySubject[]>([]);
    const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
    const [isLoadingVocabulary, setIsLoadingVocabulary] = useState(false);
    const [apiError, setApiError] = useState<string>('');
    const [totalVocabularyCount, setTotalVocabularyCount] = useState<number>(0);

    // Streaming processing states
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [streamingPhases, setStreamingPhases] = useState<StreamingProcessingPhase | null>(null);
    const [streamingResult, setStreamingResult] = useState<StreamingCompleteProcessingResult | null>(null);
    const stopSignalRef = useRef({ current: false });

    // Live update states for individual items
    const [processingItems, setProcessingItems] = useState<Set<number>>(new Set());
    const [errorItems, setErrorItems] = useState<Map<number, string>>(new Map());
    const [currentProcessingItem, setCurrentProcessingItem] = useState<{ id: number; characters: string; primaryMeaning: string } | null>(null);

    // Live update callback functions
    const handleItemProcessing = (item: VocabularyItem, phase: 'translation' | 'upload') => {
        if (!mountedRef.current) return;

        console.log(`🔄 Processing item ${item.id} (${item.characters}) - ${phase}`);
        setProcessingItems(prev => new Set(prev).add(item.id));

        // Set as current processing item
        setCurrentProcessingItem({
            id: item.id,
            characters: item.characters,
            primaryMeaning: item.meanings.find(m => m.primary)?.meaning || item.meanings[0]?.meaning || ''
        });

        // Remove from error items if it was there before
        setErrorItems(prev => {
            const newMap = new Map(prev);
            newMap.delete(item.id);
            return newMap;
        });
    };

    const handleItemUpdated = (item: VocabularyItem, result: VocabularyItemResult) => {
        if (!mountedRef.current) return;

        console.log(`✅ Updated item ${item.id} (${item.characters}):`, result);

        // Remove from processing items
        setProcessingItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(item.id);
            return newSet;
        });

        // Clear current processing item if this was it
        setCurrentProcessingItem(prev => (prev?.id === item.id ? null : prev));

        // Remove from error items (in case it was there)
        setErrorItems(prev => {
            const newMap = new Map(prev);
            newMap.delete(item.id);
            return newMap;
        });

        // 🚀 LIVE UPDATE: Update study materials in real-time
        if (result.success) {
            console.log(`🔄 LIVE-UPDATE: Processing update for ${item.characters} (ID: ${item.id}):`, {
                success: result.success,
                uploadedSynonyms: result.uploadedSynonyms,
                currentStudyMaterialsCount: studyMaterials.length
            });

            setStudyMaterials(prev => {
                const updated = [...prev];
                const existingIndex = updated.findIndex(sm => sm.data.subject_id === item.id);

                console.log(`🔍 Looking for study material with subject_id ${item.id}, found at index: ${existingIndex}`);

                if (existingIndex >= 0) {
                    const oldSynonyms = updated[existingIndex].data.meaning_synonyms;
                    // Update existing study material
                    updated[existingIndex] = {
                        ...updated[existingIndex],
                        data: {
                            ...updated[existingIndex].data,
                            meaning_synonyms: result.uploadedSynonyms || []
                        }
                    };
                    console.log(`🔄 Live-updated study material for ${item.characters}:`, {
                        old: oldSynonyms,
                        new: result.uploadedSynonyms,
                        studyMaterialId: updated[existingIndex].id
                    });
                } else {
                    console.log(`⚠️ No existing study material found for ${item.characters} (ID: ${item.id}) - will be created on next reload`);
                    console.log(`📊 Available study materials:`, prev.map(sm => ({ id: sm.data.subject_id, synonyms: sm.data.meaning_synonyms })));
                }

                return updated;
            });
        }
    };

    const handleItemError = (item: VocabularyItem, error: VocabularyItemError) => {
        if (!mountedRef.current) return;

        console.error(`❌ Error processing item ${item.id} (${item.characters}):`, error);

        // Remove from processing items
        setProcessingItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(item.id);
            return newSet;
        });

        // Clear current processing item if this was it
        setCurrentProcessingItem(prev => (prev?.id === item.id ? null : prev));

        // Add to error items
        setErrorItems(prev => new Map(prev).set(item.id, error.error));
    };

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

    // Convert Wanikani vocabulary to internal format
    const convertToInternalFormat = (wkVocabulary: VocabularySubject[], studyMaterials: StudyMaterial[]): Vocabulary[] => {
        const studyMaterialsMap = new Map<number, StudyMaterial>();
        studyMaterials?.forEach(sm => {
            if (sm?.data?.subject_id) {
                studyMaterialsMap.set(sm.data.subject_id, sm);
            }
        });

        return wkVocabulary.map(vocabulary => {
            // Get primary meaning
            const primaryMeaningObj = vocabulary.data.meanings.find(m => m.primary) || vocabulary.data.meanings[0];
            const primaryMeaning = primaryMeaningObj?.meaning || 'Unknown';

            // Get alternative meanings (accepted answers excluding the primary meaning)
            const alternativeMeanings = vocabulary.data.meanings
                .filter(m => m.accepted_answer && m.meaning !== primaryMeaning)
                .map(m => m.meaning);

            // Get readings
            const readings = vocabulary.data.readings.map(r => r.reading);

            return {
                id: vocabulary.id,
                primaryMeaning,
                alternativeMeanings,
                characters: vocabulary.data.characters,
                level: vocabulary.data.level,
                readings,
                currentSynonyms: studyMaterialsMap.get(vocabulary.id)?.data.meaning_synonyms || [],
                selected: true,
                translatedSynonyms: [],
                meaningMnemonic: vocabulary.data.meaning_mnemonic || undefined
            };
        });
    };

    // Simplified filter vocabulary by selected level
    const filteredVocabulary = useMemo(() => {
        if (!wkVocabulary || wkVocabulary.length === 0) return [];

        console.log(`🔄 RECALCULATING filteredVocabulary with ${wkVocabulary.length} vocabulary items and ${studyMaterials.length} study materials`);

        const internalVocabulary = convertToInternalFormat(wkVocabulary, studyMaterials);

        console.log(`📊 Internal vocabulary sample:`, internalVocabulary.slice(0, 3).map(v => ({
            id: v.id,
            characters: v.characters,
            currentSynonyms: v.currentSynonyms
        })));

        if (selectedLevel === 'all') {
            return internalVocabulary;
        }

        return internalVocabulary.filter(vocabulary => vocabulary.level === selectedLevel);
    }, [wkVocabulary, studyMaterials, selectedLevel]);

    // Placeholder functions - will be implemented in Phase 1b
    const loadVocabularyCount = async () => {
        try {
            const level = selectedLevel === 'all' ? undefined : selectedLevel;
            const count = await getVocabularyCount(apiToken, level);
            setTotalVocabularyCount(count);
        } catch (error) {
            console.error('Error loading vocabulary count:', error);
            setTotalVocabularyCount(0);
        }
    };

    const loadVocabularyFromAPI = async () => {
        setIsLoadingVocabulary(true);
        setApiError('');
        setDisplayedPreviewCount(PREVIEW_BATCH_SIZE);

        try {
            const level = selectedLevel === 'all' ? undefined : selectedLevel;

            // Load initial preview vocabulary
            const previewVocabulary = await getVocabularyPreview(apiToken, level, Math.max(displayedPreviewCount * 2, 48));
            setWkVocabulary(previewVocabulary);

            // Load study materials for preview vocabulary
            if (previewVocabulary.length > 0) {
                const subjectIds = previewVocabulary.map(v => v.id.toString()).join(',');
                const studyMaterialsData = await getVocabularyStudyMaterials(apiToken, undefined, {
                    subject_ids: subjectIds
                });
                setStudyMaterials(studyMaterialsData);
            }

            // Load total count separately
            await loadVocabularyCount();

        } catch (error) {
            console.error('Error loading vocabulary:', error);
            setApiError('Fehler beim Laden der Vocabulary. Bitte überprüfen Sie Ihren API-Token.');
        } finally {
            setIsLoadingVocabulary(false);
        }
    };

    const loadMorePreviewVocabulary = async () => {
        if (isLoadingVocabulary) return;

        const newDisplayCount = displayedPreviewCount + PREVIEW_BATCH_SIZE;
        setDisplayedPreviewCount(newDisplayCount);

        if (wkVocabulary.length < newDisplayCount) {
            setIsLoadingVocabulary(true);
            try {
                const level = selectedLevel === 'all' ? undefined : selectedLevel;

                const moreVocabulary = await getVocabularyPreview(apiToken, level, newDisplayCount + PREVIEW_BATCH_SIZE);
                setWkVocabulary(moreVocabulary);

                if (moreVocabulary.length > 0) {
                    const subjectIds = moreVocabulary.map(v => v.id.toString()).join(',');
                    const studyMaterialsData = await getVocabularyStudyMaterials(apiToken, undefined, {
                        subject_ids: subjectIds
                    });
                    setStudyMaterials(studyMaterialsData);
                }
            } catch (error) {
                console.error('Error loading more vocabulary:', error);
                setApiError('Fehler beim Laden weiterer Vocabulary.');
            } finally {
                setIsLoadingVocabulary(false);
            }
        }
    };

    // Convert internal vocabulary format to VocabularyItem for processing
    const convertToVocabularyItems = (vocabulary: Vocabulary[]): VocabularyItem[] => {
        return vocabulary.map(v => ({
            id: v.id,
            characters: v.characters,
            meanings: [
                { meaning: v.primaryMeaning, primary: true },
                ...v.alternativeMeanings.map(meaning => ({ meaning, primary: false }))
            ]
        }));
    };

    // Streaming processing function
    const startProcessing = async () => {
        if (!apiToken || !deeplToken) {
            setApiError('Tokens not available');
            return;
        }

        try {
            setIsProcessing(true);
            setProgress(0);
            setApiError('');
            setStreamingResult(null);

            // Reset stop signal for new processing
            stopSignalRef.current = { current: false };
            console.log('🚀 Starting STREAMING processing');

            // Convert filtered vocabulary to VocabularyItem format
            const vocabularyItems = convertToVocabularyItems(filteredVocabulary);

            // Process with streaming mode
            const options: CompleteProcessingOptions = {
                batchSize: 10,
                synonymMode,
                apiToken,
                deeplToken,
                enableProgressReporting: true,
                stopOnFirstError: false,

                // Live update callbacks
                onItemProcessing: handleItemProcessing,
                onItemUpdated: handleItemUpdated,
                onItemError: handleItemError
            };

            // 🚀 STREAMING MODE: Parallel translation/upload
            const result = await processVocabularyStreaming(vocabularyItems, options, (phases: StreamingProcessingPhase) => {
                console.log('🚀 Streaming progress:', {
                    translation: phases.translationPhase.progress,
                    upload: phases.uploadPhase.progress,
                    overall: phases.overallPhase.progress,
                    mounted: mountedRef.current
                });

                if (mountedRef.current) {
                    setStreamingPhases(phases);
                    setProgress(phases.overallPhase.progress);
                }
            }, stopSignalRef.current);
            if (mountedRef.current) {
                setStreamingResult(result);
                setProgress(100);

                if (result.success) {
                    console.log('✅ Streaming processing completed successfully:', result);

                    // Reload vocabulary data to show updated synonyms
                    if (result.uploadCount > 0) {
                        setTimeout(() => loadVocabularyFromAPI(), 1000);
                    }
                } else {
                    console.warn('⚠️ Streaming processing completed with errors:', result);
                }
            }
        } catch (error) {
            if (mountedRef.current) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
                setApiError(`Processing failed: ${errorMessage}`);
                console.error('❌ Processing error:', error);
            }
        } finally {
            if (mountedRef.current) {
                setIsProcessing(false);
            }
        }
    };

    const stopProcessing = () => {
        if (stopSignalRef.current && !stopSignalRef.current.current) {
            stopSignalRef.current.current = true;
            console.log('🛑 Stop processing requested');

            // Don't reset UI states immediately - let the processing complete gracefully
            // The UI will be updated when the processing actually stops
        } else {
            console.log('⚠️ Stop already requested - ignoring duplicate stop signal');
        }
    };

    const clearResults = () => {
        console.log('🗑️ Clearing processing results');
        setStreamingPhases(null);
        setStreamingResult(null);
        setProgress(0);

        // Clear live update states
        setProcessingItems(new Set());
        setErrorItems(new Map());
        setCurrentProcessingItem(null);
    };

    const clearErrors = () => {
        console.log('🗑️ Clearing error items');
        setErrorItems(new Map());
    };

    // Load vocabulary when component mounts or token/level changes
    useEffect(() => {
        if (apiToken) {
            loadVocabularyFromAPI();
        }
    }, [apiToken, selectedLevel]);

    // Vocabulary count for display
    const vocabularyCount = totalVocabularyCount > 0 ? totalVocabularyCount : filteredVocabulary.length;

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
        filteredVocabulary,
        vocabularyCount,
        displayedPreviewCount,

        // Loading states
        isLoadingVocabulary,
        apiError,

        // Streaming processing states
        isProcessing,
        progress,
        translationStatus: '', // Not used in streaming mode
        uploadStatus: '', // Not used in streaming mode
        uploadStats: {
            created: streamingResult?.uploadCount || 0,
            updated: 0, // Not tracked separately in streaming mode
            failed: streamingResult?.errorCount || 0,
            skipped: 0, // Not used in streaming mode
            successful: streamingResult?.uploadCount || 0
        },

        // Streaming processing data
        streamingPhases,
        streamingResult,

        // Live update states
        processingItems,
        errorItems,
        currentProcessingItem,

        // Actions
        processTranslations: startProcessing,
        stopProcessing,
        clearResults,
        clearErrors,
        loadVocabularyFromAPI,
        loadMorePreviewVocabulary
    };
}
