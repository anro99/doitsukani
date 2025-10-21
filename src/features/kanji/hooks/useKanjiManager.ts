import { useState, useEffect, useMemo, useRef } from 'react';
import { Subject, StudyMaterial } from '@bachman-dev/wanikani-api-types';
import {
    getKanjiStudyMaterials,
    getKanjiCount,
    getKanjiPreview
} from '../../../shared/lib/wanikani';
import { loadWanikaniToken, saveWanikaniToken, removeToken, STORAGE_KEYS, loadDeepLToken, saveDeepLToken } from '../../../shared/lib/storage';

// Streaming Processing (Phase 3.2 - Refactored)
import { processKanjiStreaming, type StreamingProcessingPhase } from '../lib/kanji-streaming-integration';
import type { KanjiItem } from '../lib/KanjiTranslationService';

// Type aliases for better readability
type KanjiSubject = Subject & { object: 'kanji' };

// Constants
const PREVIEW_BATCH_SIZE = 12;

export interface Kanji {
    id: number;
    primaryMeaning: string;
    alternativeMeanings: string[];
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
    status: 'success' | 'error';
    message: string;
}

export type SynonymMode = 'replace' | 'smart' | 'smart-merge' | 'delete';

export function useKanjiManager() {
    const stopRef = useRef(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;  // ✅ Explizit auf true setzen beim Mount
        stopRef.current = false;
        return () => {
            mountedRef.current = false;
        };
    }, []);

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

    const [selectedLevel, setSelectedLevel] = useState<number | 'all'>(1);
    const [synonymMode, setSynonymMode] = useState<SynonymMode>('smart-merge');
    const [displayedPreviewCount, setDisplayedPreviewCount] = useState(12);
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
    const [wkKanji, setWkKanji] = useState<KanjiSubject[]>([]);
    const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
    const [isLoadingKanji, setIsLoadingKanji] = useState(false);
    const [apiError, setApiError] = useState<string>('');
    const [totalKanjiCount, setTotalKanjiCount] = useState<number>(0);

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

    const convertToInternalFormat = (wkKanji: KanjiSubject[], studyMaterials: StudyMaterial[]): Kanji[] => {
        const studyMaterialsMap = new Map<number, StudyMaterial>();
        studyMaterials?.forEach(sm => {
            if (sm?.data?.subject_id) {
                studyMaterialsMap.set(sm.data.subject_id, sm);
            }
        });

        return wkKanji.map(kanji => {
            const primaryMeaningObj = kanji.data.meanings.find(m => m.primary) || kanji.data.meanings[0];
            const primaryMeaning = primaryMeaningObj?.meaning || 'Unknown';
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

    const filteredKanji = useMemo(() => {
        if (wkKanji.length === 0) return [];
        const internalKanji = convertToInternalFormat(wkKanji, studyMaterials);
        if (selectedLevel === 'all') {
            return internalKanji;
        }
        return internalKanji.filter(kanji => kanji.level === selectedLevel);
    }, [wkKanji, studyMaterials, selectedLevel]);

    const loadKanjiFromAPI = async () => {
        if (!apiToken) {
            setApiError('Bitte WaniKani API-Token eingeben');
            return;
        }
        setIsLoadingKanji(true);
        setApiError('');
        try {
            const level = selectedLevel === 'all' ? undefined : selectedLevel;
            const count = await getKanjiCount(apiToken, level);
            setTotalKanjiCount(count);
            const kanjiData = await getKanjiPreview(apiToken, level, displayedPreviewCount);
            setWkKanji(kanjiData as KanjiSubject[]);
            const kanjiIds = kanjiData.map(k => k.id).join(',');
            const materials = await getKanjiStudyMaterials(apiToken, undefined, { subject_ids: kanjiIds });
            setStudyMaterials(materials);
        } catch (error) {
            console.error('Failed to load kanji:', error);
            setApiError(error instanceof Error ? error.message : 'Fehler beim Laden der Kanji');
        } finally {
            setIsLoadingKanji(false);
        }
    };

    const loadMorePreviewKanji = async () => {
        const newCount = displayedPreviewCount + PREVIEW_BATCH_SIZE;
        setDisplayedPreviewCount(newCount);
        if (!apiToken) return;
        setIsLoadingKanji(true);
        try {
            const level = selectedLevel === 'all' ? undefined : selectedLevel;
            const kanjiData = await getKanjiPreview(apiToken, level, newCount);
            setWkKanji(kanjiData as KanjiSubject[]);
            const kanjiIds = kanjiData.map(k => k.id).join(',');
            const materials = await getKanjiStudyMaterials(apiToken, undefined, { subject_ids: kanjiIds });
            setStudyMaterials(materials);
        } catch (error) {
            console.error('Failed to load more kanji:', error);
        } finally {
            setIsLoadingKanji(false);
        }
    };

    const convertToKanjiItems = (kanji: Kanji[]): KanjiItem[] => {
        return kanji.map(k => ({
            id: k.id,
            characters: k.characters,
            primaryMeaning: k.primaryMeaning,
            alternativeMeanings: k.alternativeMeanings,
            meaningMnemonic: k.meaningMnemonic,
            currentSynonyms: k.currentSynonyms,
            meanings: [k.primaryMeaning, ...k.alternativeMeanings],
            existingSynonyms: k.currentSynonyms
        }));
    };

    const startProcessing = async () => {
        if (!apiToken || !deeplToken) {
            setApiError('Bitte API-Tokens eingeben');
            return;
        }
        if (filteredKanji.length === 0) {
            setApiError('Keine Kanji zum Verarbeiten vorhanden');
            return;
        }
        setIsProcessing(true);
        setProgress(0);
        setTranslationStatus(' Starte Streaming-Verarbeitung...');
        setUploadStatus('');
        setUploadStats({ created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 });
        stopRef.current = false;

        try {
            const kanjiItems = convertToKanjiItems(filteredKanji);
            console.log(` Starting STREAMING processing of ${kanjiItems.length} kanji items`);

            const handleProgress = (phases: StreamingProcessingPhase) => {
                if (!mountedRef.current) return;
                const translationItem = phases.translationPhase.currentItem ? ` (${phases.translationPhase.currentItem})` : '';
                const uploadItem = phases.uploadPhase.currentItem ? ` (${phases.uploadPhase.currentItem})` : '';
                setTranslationStatus(`🌐 Übersetzung: ${phases.translationPhase.progress}%${translationItem}`);
                setUploadStatus(`📤 Upload: ${phases.uploadPhase.progress}%${uploadItem}`);
                setProgress(phases.overallPhase.progress);
                if (phases.overallPhase.completedItems !== undefined) {
                    setUploadStats(prev => ({
                        ...prev,
                        successful: phases.overallPhase.completedItems || 0,
                        failed: phases.overallPhase.errorItems || 0
                    }));
                }
            };

            const result = await processKanjiStreaming(
                kanjiItems,
                {
                    batchSize: 1,
                    synonymMode: synonymMode,
                    apiToken: apiToken,
                    deeplToken: deeplToken,
                    enableProgressReporting: true,
                    stopOnFirstError: false
                },
                handleProgress,
                stopRef
            );

            if (mountedRef.current) {
                setUploadStats({
                    created: 0,
                    updated: 0,
                    failed: result.errorCount,
                    skipped: result.totalItems - result.translationCount,
                    successful: result.uploadCount
                });
                if (result.success) {
                    setTranslationStatus(` Verarbeitung abgeschlossen: ${result.uploadCount}/${result.totalItems} erfolgreich`);
                    setUploadStatus(` Upload abgeschlossen`);
                    setProgress(100);
                    
                    // Reload kanji data to show updated synonyms
                    if (result.uploadCount > 0) {
                        setTimeout(() => loadKanjiFromAPI(), 1000);
                    }
                } else if (stopRef.current) {
                    setTranslationStatus(` Verarbeitung gestoppt bei ${result.uploadCount}/${result.totalItems}`);
                    setUploadStatus(` Upload gestoppt`);
                    // Set progress to the actual completion percentage
                    const finalProgress = result.totalItems > 0
                        ? Math.round((result.uploadCount / result.totalItems) * 100)
                        : 0;
                    setProgress(finalProgress);
                } else {
                    setTranslationStatus(` Verarbeitung mit Fehlern: ${result.errorCount} Fehler`);
                    setUploadStatus(` Upload mit Fehlern`);
                }
            }
            console.log(' Processing completed:', result);
        } catch (error) {
            console.error(' Processing failed:', error);
            if (mountedRef.current) {
                setTranslationStatus(' Fehler beim Verarbeiten der Kanji');
                setUploadStatus(' Upload fehlgeschlagen');
                setApiError(error instanceof Error ? error.message : 'Unbekannter Fehler');
            }
        } finally {
            if (mountedRef.current) {
                setIsProcessing(false);
            }
        }
    };

    const stopProcessing = () => {
        stopRef.current = true;
        setTranslationStatus('⏹️ Stoppe Verarbeitung...');
        setUploadStatus('⏹️ Warte auf Abschluss des aktuellen Items...');
    };

    useEffect(() => {
        if (apiToken) {
            loadKanjiFromAPI();
        }
    }, [apiToken, selectedLevel]);

    const kanjiCount = totalKanjiCount > 0 ? totalKanjiCount : filteredKanji.length;

    return {
        selectedLevel,
        setSelectedLevel,
        synonymMode,
        setSynonymMode,
        apiToken,
        handleApiTokenChange,
        deeplToken,
        handleDeepLTokenChange,
        filteredKanji,
        kanjiCount,
        displayedPreviewCount,
        isLoadingKanji,
        apiError,
        isProcessing,
        progress,
        translationStatus,
        uploadStatus,
        uploadStats,
        processTranslations: startProcessing,
        stopProcessing,
        loadKanjiFromAPI,
        loadMorePreviewKanji
    };
}
