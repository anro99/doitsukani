/**
 * Combined Preview Component
 * 
 * Zeigt eine Preview von Combined Items (Radicals, Kanji, Vocabulary)
 * mit Type Counters und Mixed Item Display.
 * 
 * Features:
 * - Type Counters (Radicals: X, Kanji: Y, Vocabulary: Z)
 * - Mixed Item Grid mit CombinedItemCard
 * - Load More Funktionalität
 * - Status Indicators
 * - Empty State
 */

import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Alert, AlertDescription } from '../../../shared/components/ui/alert';
import { PreviewLoadMore } from '../../../shared/components/processing/ItemPreviewCard';
import { CombinedItemCard } from './CombinedItemCard';
import type { CombinedItem } from '../types/combined-types';
import { isRadical, isKanji, isVocabulary } from '../types/combined-types';

/**
 * Type Counts für Preview Display
 */
interface TypeCounts {
    radicals: number;
    kanji: number;
    vocabulary: number;
    total: number;
}

/**
 * Props für CombinedPreview
 */
interface CombinedPreviewProps {
    /** Combined Items zur Anzeige */
    previewItems: CombinedItem[];

    /** Count information für Preview Display */
    currentLevelCount?: number;
    currentLevelCountLoading?: boolean;

    /** Load More Funktionalität */
    displayedPreviewCount?: number;
    isLoadingItems?: boolean;
    onLoadMore?: () => void;

    /** Error tracking */
    errorItems?: Map<number, string>;
}

/**
 * Helper: Berechnet Type Counts aus Items
 */
function calculateTypeCounts(items: CombinedItem[]): TypeCounts {
    const counts = {
        radicals: 0,
        kanji: 0,
        vocabulary: 0,
        total: items.length,
    };

    items.forEach((item) => {
        if (isRadical(item)) {
            counts.radicals++;
        } else if (isKanji(item)) {
            counts.kanji++;
        } else if (isVocabulary(item)) {
            counts.vocabulary++;
        }
    });

    return counts;
}

/**
 * Type Counters Component
 * 
 * Zeigt die Anzahl der Items pro Type an
 */
const TypeCounters = ({ counts }: { counts: TypeCounts }) => {
    return (
        <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-700">
                    Radicals: <span className="font-semibold">{counts.radicals}</span>
                </span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-pink-500" />
                <span className="text-gray-700">
                    Kanji: <span className="font-semibold">{counts.kanji}</span>
                </span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-gray-700">
                    Vocabulary: <span className="font-semibold">{counts.vocabulary}</span>
                </span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
                <span className="text-gray-600">
                    Total: <span className="font-bold text-gray-900">{counts.total}</span>
                </span>
            </div>
        </div>
    );
};

/**
 * Combined Preview Component
 * 
 * Hauptkomponente für die Preview von Mixed Items
 */
export const CombinedPreview = ({
    previewItems,
    currentLevelCount,
    currentLevelCountLoading = false,
    displayedPreviewCount = 12,
    isLoadingItems = false,
    onLoadMore,
}: CombinedPreviewProps) => {
    // Helper function to get count info for preview display
    const getCountInfo = () => {
        if (currentLevelCountLoading) return 'Lade Count...';
        if (currentLevelCount !== undefined) return `${currentLevelCount} Items insgesamt`;
        return 'Count nicht verfügbar';
    };

    // Calculate type counts für alle geladenen Items
    const loadedCounts = calculateTypeCounts(previewItems);

    // Calculate type counts für angezeigte Items
    const displayedItems = previewItems.slice(0, displayedPreviewCount);
    const displayedCounts = calculateTypeCounts(displayedItems);

    // Empty State
    if (previewItems.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>🎯 Combined Vorschau</CardTitle>
                    <p className="text-sm text-gray-600">
                        Zeigt die ersten {displayedPreviewCount} Items (Radicals, Kanji, Vocabulary) basierend auf Ihrer Level-Auswahl
                    </p>
                    <p className="text-xs text-gray-500">
                        {getCountInfo()}
                    </p>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <AlertDescription>
                            Keine Items für das ausgewählte Level gefunden. Wählen Sie ein anderes Level aus.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>🎯 Combined Vorschau</CardTitle>
                <p className="text-sm text-gray-600">
                    Zeigt {Math.min(displayedPreviewCount, previewItems.length)} von {previewItems.length} geladenen Items
                </p>
                <p className="text-xs text-gray-500 mb-3">
                    {getCountInfo()}
                </p>

                {/* Type Counters für angezeigte Items */}
                <div className="mt-3 pt-3 border-t">
                    <div className="text-xs text-gray-500 mb-2">Angezeigte Items:</div>
                    <TypeCounters counts={displayedCounts} />
                </div>

                {/* Type Counters für alle geladenen Items (wenn unterschiedlich) */}
                {displayedItems.length < previewItems.length && (
                    <div className="mt-3 pt-3 border-t">
                        <div className="text-xs text-gray-500 mb-2">Geladene Items (gesamt):</div>
                        <TypeCounters counts={loadedCounts} />
                    </div>
                )}
            </CardHeader>
            <CardContent>
                {/* Mixed Item Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedItems.map((item) => (
                        <CombinedItemCard key={`${item.type}-${item.id}`} item={item} />
                    ))}
                </div>

                {/* Load More Button */}
                {onLoadMore && (
                    <PreviewLoadMore
                        displayedCount={displayedPreviewCount}
                        loadedCount={previewItems.length}
                        totalCount={currentLevelCount}
                        isLoading={isLoadingItems}
                        onLoadMore={onLoadMore}
                        itemType="Radicals" // Generic label, wird von PreviewLoadMore als "Items" interpretiert
                    />
                )}
            </CardContent>
        </Card>
    );
};
