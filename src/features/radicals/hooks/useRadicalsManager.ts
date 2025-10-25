import { useState, useEffect, useMemo, useRef } from 'react';
import { Subject, StudyMaterial } from '@bachman-dev/wanikani-api-types';
import {
    getRadicals,
    getRadicalStudyMaterials,
    getRadicalCount,
    getRadicalsPreview
} from '../../../shared/lib/wanikani';
import { loadWanikaniToken, saveWanikaniToken, removeToken, STORAGE_KEYS, loadDeepLToken, saveDeepLToken } from '../../../shared/lib/storage';

// Streaming Processing (Phase 3.3 - Refactored)
import { processRadicalStreaming, type StreamingProcessingPhase } from '../lib/radical-streaming-integration';
import type { RadicalItem } from '../lib/RadicalTranslationService';

// Type aliases for better readability
type RadicalSubject = Subject & { object: 'radical' };

// Constants
const PREVIEW_BATCH_SIZE = 12;

export interface Radical {
    id: number;
    primaryMeaning: string;
    characters: string | null;
    level: number;
    currentSynonyms: string[];
    selected: boolean;
    translatedSynonyms: string[];
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
    status: 'success' | 'error';
    message: string;
}

export type SynonymMode = 'replace' | 'smart' | 'smart-merge' | 'delete';

export function useRadicalsManager() {
    const stopRef = useRef(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
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
    const [wkRadicals, setWkRadicals] = useState<RadicalSubject[]>([]);
    const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
    const [isLoadingRadicals, setIsLoadingRadicals] = useState(false);
    const [apiError, setApiError] = useState<string>('');
    const [totalRadicalsCount, setTotalRadicalsCount] = useState<number>(0);

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

    const convertToInternalFormat = (wkRadicals: RadicalSubject[], studyMaterials: StudyMaterial[]): Radical[] => {
        const studyMaterialsMap = new Map<number, StudyMaterial>();
        studyMaterials?.forEach(sm => {
            if (sm?.data?.subject_id) {
                studyMaterialsMap.set(sm.data.subject_id, sm);
            }
        });

        return wkRadicals.map(radical => {
            const primaryMeaningObj = radical.data.meanings.find(m => m.primary) || radical.data.meanings[0];
            const primaryMeaning = primaryMeaningObj?.meaning || 'Unknown';

            return {
                id: radical.id,
                primaryMeaning,
                characters: radical.data.characters,
                level: radical.data.level,
                currentSynonyms: studyMaterialsMap.get(radical.id)?.data.meaning_synonyms || [],
                selected: true,
                translatedSynonyms: []
            };
        });
    };

    const filteredRadicals = useMemo(() => {
        if (wkRadicals.length === 0) return [];
        const internalRadicals = convertToInternalFormat(wkRadicals, studyMaterials);
        if (selectedLevel === 'all') {
            return internalRadicals;
        }
        return internalRadicals.filter(radical => radical.level === selectedLevel);
    }, [wkRadicals, studyMaterials, selectedLevel]);

    const loadRadicalsFromAPI = async () => {
        if (!apiToken) {
            setApiError('Bitte WaniKani API-Token eingeben');
            return;
        }
        setIsLoadingRadicals(true);
        setApiError('');
        try {
            const level = selectedLevel === 'all' ? undefined : selectedLevel;
            const count = await getRadicalCount(apiToken, level);
            setTotalRadicalsCount(count);
            const radicalsData = await getRadicalsPreview(apiToken, level, displayedPreviewCount);
            setWkRadicals(radicalsData as RadicalSubject[]);
            const radicalIds = radicalsData.map(r => r.id).join(',');
            const materials = await getRadicalStudyMaterials(apiToken, undefined, { subject_ids: radicalIds });
            setStudyMaterials(materials);
        } catch (error) {
            console.error('Failed to load radicals:', error);
            setApiError(error instanceof Error ? error.message : 'Fehler beim Laden der Radikale');
        } finally {
            setIsLoadingRadicals(false);
        }
    };

    const loadMorePreviewRadicals = async () => {
        const newCount = displayedPreviewCount + PREVIEW_BATCH_SIZE;
        setDisplayedPreviewCount(newCount);
        if (!apiToken) return;
        setIsLoadingRadicals(true);
        try {
            const level = selectedLevel === 'all' ? undefined : selectedLevel;
            const radicalsData = await getRadicalsPreview(apiToken, level, newCount);
            setWkRadicals(radicalsData as RadicalSubject[]);
            const radicalIds = radicalsData.map(r => r.id).join(',');
            const materials = await getRadicalStudyMaterials(apiToken, undefined, { subject_ids: radicalIds });
            setStudyMaterials(materials);
        } catch (error) {
            console.error('Failed to load more radicals:', error);
        } finally {
            setIsLoadingRadicals(false);
        }
    };

    const convertToRadicalItems = (radicals: Radical[]): RadicalItem[] => {
        return radicals.map(r => ({
            id: r.id,
            characters: r.characters,
            primaryMeaning: r.primaryMeaning,
            currentSynonyms: r.currentSynonyms,
            meanings: [r.primaryMeaning],
            existingSynonyms: r.currentSynonyms
        }));
    };

    const handleItemUpdated = (item: RadicalItem, result: { radicalId: number; success: boolean; uploadedSynonyms?: string[] }) => {
        if (!mountedRef.current) return;

        const displayName = item.characters || `Radical #${item.id}`;
        console.log(`✅ Updated item ${item.id} (${displayName}):`, result);

        if (result.success && result.uploadedSynonyms) {
            console.log(`🔄 LIVE-UPDATE: Processing update for ${displayName} (ID: ${item.id}):`, {
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
                    updated[existingIndex] = {
                        ...updated[existingIndex],
                        data: {
                            ...updated[existingIndex].data,
                            meaning_synonyms: result.uploadedSynonyms || []
                        }
                    };
                    console.log(`🔄 Live-updated study material for ${displayName}:`, {
                        old: oldSynonyms,
                        new: result.uploadedSynonyms,
                        studyMaterialId: updated[existingIndex].id
                    });
                } else {
                    console.log(`⚠️ No existing study material found for ${displayName} (ID: ${item.id}) - will be created on next reload`);
                    console.log(`📊 Available study materials:`, prev.map(sm => ({ id: sm.data.subject_id, synonyms: sm.data.meaning_synonyms })));
                }

                return updated;
            });
        }
    };

    const startProcessing = async () => {
        if (!apiToken || !deeplToken) {
            setApiError('Bitte API-Tokens eingeben');
            return;
        }
        if (filteredRadicals.length === 0) {
            setApiError('Keine Radikale zum Verarbeiten vorhanden');
            return;
        }
        setIsProcessing(true);
        setProgress(0);
        setTranslationStatus('🚀 Starte Streaming-Verarbeitung...');
        setUploadStatus('');
        setUploadStats({ created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 });
        stopRef.current = false;

        try {
            const radicalItems = convertToRadicalItems(filteredRadicals);
            console.log(`🚀 Starting STREAMING processing of ${radicalItems.length} radical items`);

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

            const result = await processRadicalStreaming(
                radicalItems,
                {
                    batchSize: 1,
                    synonymMode: synonymMode,
                    apiToken: apiToken,
                    deeplToken: deeplToken,
                    enableProgressReporting: true,
                    stopOnFirstError: false,
                    onItemUpdated: handleItemUpdated
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
                    setTranslationStatus(`✅ Verarbeitung abgeschlossen: ${result.uploadCount}/${result.totalItems} erfolgreich`);
                    setUploadStatus(`✅ Upload abgeschlossen`);
                    setProgress(100);

                    if (result.uploadCount > 0) {
                        setTimeout(() => loadRadicalsFromAPI(), 1000);
                    }
                } else if (stopRef.current) {
                    setTranslationStatus(`⏹️ Verarbeitung gestoppt bei ${result.uploadCount}/${result.totalItems}`);
                    setUploadStatus(`⏹️ Upload gestoppt`);
                    const finalProgress = result.totalItems > 0
                        ? Math.round((result.uploadCount / result.totalItems) * 100)
                        : 0;
                    setProgress(finalProgress);
                } else {
                    setTranslationStatus(`❌ Verarbeitung mit Fehlern: ${result.errorCount} Fehler`);
                    setUploadStatus(`❌ Upload mit Fehlern`);
                }
            }
            console.log('✅ Processing completed:', result);
        } catch (error) {
            console.error('❌ Processing failed:', error);
            if (mountedRef.current) {
                setTranslationStatus('❌ Fehler beim Verarbeiten der Radikale');
                setUploadStatus('❌ Upload fehlgeschlagen');
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
            loadRadicalsFromAPI();
        }
    }, [apiToken, selectedLevel]);

    const radicalsCount = totalRadicalsCount > 0 ? totalRadicalsCount : filteredRadicals.length;

    return {
        selectedLevel,
        setSelectedLevel,
        synonymMode,
        setSynonymMode,
        apiToken,
        handleApiTokenChange,
        deeplToken,
        handleDeepLTokenChange,
        filteredRadicals,
        radicalsCount,
        displayedPreviewCount,
        isLoadingRadicals,
        apiError,
        isProcessing,
        progress,
        translationStatus,
        uploadStatus,
        uploadStats,
        processTranslations: startProcessing,
        stopProcessing,
        loadRadicalsFromAPI,
        loadMorePreviewRadicals
    };
}
