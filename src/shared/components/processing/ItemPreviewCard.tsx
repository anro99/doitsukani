import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

/**
 * Props für ItemStatusIndicator
 * 
 * Status-Anzeige für Processing Items (Vocabulary, Kanji, Radicals).
 */
interface ItemStatusIndicatorProps {
    itemId: number;
    translatedSynonyms: string[];
    errorItems?: Map<number, string>;
}

/**
 * Status-Indicator für Processing Items
 * 
 * Zeigt Error, Completed oder nichts an.
 * Wird in VocabularyPreview, KanjiPreview, RadicalPreview verwendet.
 */
export const ItemStatusIndicator = ({
    itemId,
    translatedSynonyms,
    errorItems = new Map()
}: ItemStatusIndicatorProps) => {
    const hasError = errorItems.has(itemId);
    const isCompleted = translatedSynonyms && translatedSynonyms.length > 0;

    if (hasError) {
        const errorMessage = errorItems.get(itemId) || 'Unknown error';
        return (
            <div
                className="flex items-center gap-1 text-red-500 text-xs mt-2"
                data-testid={`error-indicator-${itemId}`}
                role="alert"
                aria-label={`Processing failed: ${errorMessage}`}
            >
                <span className="text-red-500">❌</span>
                <span className="break-words">{errorMessage}</span>
            </div>
        );
    }

    if (isCompleted) {
        return (
            <div
                className="flex items-center gap-1 text-green-500 text-xs mt-2"
                data-testid={`completed-indicator-${itemId}`}
            >
                <span className="text-green-500">✅</span>
                <span>Completed</span>
            </div>
        );
    }

    return null;
};

/**
 * Props für SynonymBadges
 */
interface SynonymBadgesProps {
    label: string;
    synonyms: string[];
    variant?: 'current' | 'translated';
    emptyMessage?: string;
}

/**
 * Synonym Badge List
 * 
 * Zeigt Synonyme als Badges an.
 * - Current Synonyms: grau/secondary
 * - Translated Synonyms: grün
 */
export const SynonymBadges = ({
    label,
    synonyms,
    variant = 'current',
    emptyMessage = 'Keine Synonyme'
}: SynonymBadgesProps) => {
    const badgeClass = variant === 'translated'
        ? 'text-xs bg-green-100 text-green-800 border-green-200'
        : 'text-xs';

    const badgeVariant = variant === 'translated' ? 'default' : 'secondary';

    return (
        <div className="text-sm text-gray-600 mt-3">
            <div className="mb-1">
                <span className={`font-medium ${variant === 'translated' ? 'text-green-700' : ''}`}>
                    {label}
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                    {synonyms.length > 0 ? (
                        synonyms.map((synonym: string, idx: number) => (
                            <Badge key={idx} variant={badgeVariant} className={badgeClass}>
                                {synonym}
                            </Badge>
                        ))
                    ) : (
                        <span className="text-xs text-gray-400 italic">{emptyMessage}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Props für PreviewLoadMore
 */
interface PreviewLoadMoreProps {
    displayedCount: number;
    loadedCount: number;
    totalCount?: number;
    isLoading: boolean;
    onLoadMore: () => void;
    itemType: 'Vocabulary' | 'Kanji' | 'Radicals';
}

/**
 * Load More Button + Statistics für Preview Komponenten
 * 
 * Zeigt "Load More" Button und Statistiken für Preview-Ansicht.
 */
export const PreviewLoadMore = ({
    displayedCount,
    loadedCount,
    totalCount,
    isLoading,
    onLoadMore,
    itemType
}: PreviewLoadMoreProps) => {
    // z = angezeigte Items
    const showingCount = Math.min(displayedCount, loadedCount);
    // w = total count (alle Items im Level)
    const total = totalCount || loadedCount;
    // y = verbleibende Items (w - z)
    const remaining = total - showingCount;
    // x = Nachlademenge (immer 12)
    const loadMoreIncrement = 12;

    return (
        <div className="mt-4 space-y-2">
            {/* Load More Button */}
            <div className="text-center">
                {showingCount < total ? (
                    <Button
                        onClick={onLoadMore}
                        disabled={isLoading}
                        variant="outline"
                        className="w-full md:w-auto"
                    >
                        {isLoading
                            ? 'Lädt...'
                            : `Weitere ${loadMoreIncrement} ${itemType} anzeigen (${remaining} verbleiben)`}
                    </Button>
                ) : null}
            </div>

            {/* Statistics - nur eine Zeile! */}
            <div className="text-center text-sm text-gray-600">
                Angezeigt: {showingCount} von {total} geladenen {itemType}
            </div>
        </div>
    );
};
