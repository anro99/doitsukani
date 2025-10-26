import { ReactNode } from 'react';
import { Card, CardContent } from './ui/card';
import { TokenManagement } from './TokenManagement';
import { LevelSelector } from './LevelSelector';
import { ProcessingControls } from './processing/ProcessingControls';
import type { StreamingProcessingPhase, StreamingCompleteProcessingResult } from './processing/ProcessingControls';

/**
 * Base Manager Props
 * 
 * Generische Props für alle Manager-Komponenten (Vocabulary, Kanji, Radicals).
 */
export interface BaseManagerProps<TItem> {
    // Page Info
    title: string;
    subtitle: string;
    itemType: 'vocabulary' | 'kanji' | 'radicals';
    itemTypeName: string; // "Vocabulary", "Kanji", "Radicals"
    spinnerColor: string; // "purple-600", "blue-600", etc.

    // Settings
    selectedLevel: number;
    synonymMode: 'replace' | 'smart-merge' | 'delete';
    onLevelChange: (level: number | 'all') => void;
    onSynonymModeChange: (mode: 'replace' | 'smart-merge' | 'delete') => void;

    // Tokens
    apiToken: string;
    deeplToken: string;
    onApiTokenChange: (token: string) => void;
    onDeeplTokenChange: (token: string) => void;
    apiError: string | null | undefined;

    // Data
    items: TItem[];
    // itemCount removed - not used in BaseManager

    // States
    isLoading: boolean;
    isProcessing: boolean;
    progress: number;

    // Streaming States
    streamingPhases?: StreamingProcessingPhase | null;
    streamingResult?: StreamingCompleteProcessingResult | null;
    errorItems?: Map<number, string>;

    // Actions
    onStartProcessing: () => void;
    onStopProcessing: () => void;
    onClearResults?: () => void;
    onClearErrors?: () => void;

    // Preview Component
    previewComponent: ReactNode;
}

/**
 * Base Manager Component
 * 
 * Generische Manager-Komponente für Vocabulary, Kanji und Radicals.
 * Eliminiert Duplikation durch gemeinsame Struktur.
 * 
 * Features:
 * - Token Management
 * - Level Selector
 * - Loading State
 * - Preview Component (injected)
 * - Processing Controls
 */
export const BaseManager = <TItem,>({
    title,
    subtitle,
    itemType,
    itemTypeName,
    spinnerColor,

    selectedLevel,
    synonymMode,
    onLevelChange,
    onSynonymModeChange,

    apiToken,
    deeplToken,
    onApiTokenChange,
    onDeeplTokenChange,
    apiError,

    items,

    isLoading,
    isProcessing,
    progress,

    streamingPhases,
    streamingResult,
    errorItems,

    onStartProcessing,
    onStopProcessing,
    onClearResults,
    onClearErrors,

    previewComponent
}: BaseManagerProps<TItem>) => {
    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Page Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {title}
                </h1>
                <p className="text-gray-600">
                    {subtitle}
                </p>
            </div>

            {/* Token Management */}
            <TokenManagement
                apiToken={apiToken}
                deeplToken={deeplToken}
                onApiTokenChange={onApiTokenChange}
                onDeeplTokenChange={onDeeplTokenChange}
                apiError={apiError || undefined}
                synonymMode={synonymMode}
            />

            {/* Level Selector */}
            {apiToken && (
                <LevelSelector
                    selectedLevel={selectedLevel}
                    onLevelChange={onLevelChange}
                    synonymMode={synonymMode}
                    onSynonymModeChange={onSynonymModeChange}
                />
            )}

            {/* Loading State */}
            {isLoading && (
                <Card>
                    <CardContent className="text-center py-8">
                        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 border-${spinnerColor} mx-auto mb-4`}></div>
                        <p className="text-gray-600">Lade {itemTypeName} von WaniKani...</p>
                    </CardContent>
                </Card>
            )}

            {/* Preview Component (injected by specific manager) */}
            {apiToken && items.length > 0 && (
                previewComponent
            )}

            {/* Processing Controls */}
            {apiToken && items.length > 0 && (
                <ProcessingControls
                    apiToken={apiToken}
                    deeplToken={deeplToken}
                    synonymMode={synonymMode}
                    filteredItemsCount={items.length}
                    isProcessing={isProcessing}
                    progress={progress}
                    onStartProcessing={onStartProcessing}
                    onStopProcessing={onStopProcessing}
                    onClearResults={onClearResults}
                    itemType={itemType}
                    streamingPhases={streamingPhases}
                    streamingResult={streamingResult}
                    errorItems={errorItems}
                    onClearErrors={onClearErrors}
                />
            )}
        </div>
    );
};
