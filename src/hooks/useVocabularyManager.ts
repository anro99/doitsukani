import { useState, useEffect, useMemo, useRef } from 'react';
import { Subject, StudyMaterial } from '@bachman-dev/wanikani-api-types';
import {
    getVocabularyStudyMaterials,
    getVocabularyCount,
    getVocabularyPreview
} from '../lib/wanikani';
import { loadWanikaniToken, saveWanikaniToken, removeToken, STORAGE_KEYS, loadDeepLToken, saveDeepLToken } from '../lib/storage';

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
    const mountedRef = useRef(true);

    // Reset when component mounts or re-mounts
    useEffect(() => {
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

        const internalVocabulary = convertToInternalFormat(wkVocabulary, studyMaterials);

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

    // Placeholder for processing functions - will be implemented in Phase 2
    const startProcessing = async () => {
        console.log('Vocabulary processing will be implemented in Phase 2');
    };

    const stopProcessing = () => {
        console.log('Stop processing will be implemented in Phase 2');
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

        // Placeholder processing states (Phase 2)
        isProcessing: false,
        progress: 0,
        translationStatus: '',
        uploadStatus: '',
        uploadStats: { created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 },

        // Actions
        processTranslations: startProcessing,
        stopProcessing,
        loadVocabularyFromAPI,
        loadMorePreviewVocabulary
    };
}
