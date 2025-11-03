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
export interface CombinedPreviewProps {
    /** Combined Items zur Anzeige */
    previewItems: CombinedItem[];

    /** Per-Type Counts für detaillierte Anzeige */
    radicalCount: number;
    kanjiCount: number;
    vocabularyCount: number;

    /** Load More Funktionalität */
    displayedPreviewCount: number;
    isLoading: boolean;
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
 * Combined Preview Component
 * 
 * Hauptkomponente für die Preview von Mixed Items
 */
export const CombinedPreview = ({
    previewItems,
    radicalCount,
    kanjiCount,
    vocabularyCount,
    displayedPreviewCount,
    isLoading,
    onLoadMore
}: CombinedPreviewProps) => {
    const totalCount = radicalCount + kanjiCount + vocabularyCount;

    // Helper function to get count info for preview display
    const getCountInfo = () => {
        if (isLoading) return 'Lade Count...';
        return `${totalCount} Items insgesamt (${radicalCount} Radicals, ${kanjiCount} Kanji, ${vocabularyCount} Vocabulary)`;
    };

    // Calculate type counts für alle geladenen Items
    const loadedCounts = calculateTypeCounts(previewItems);

    // Slice displayed items für Grid Display
    const displayedItems = previewItems.slice(0, displayedPreviewCount);

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
                    Zeigt {loadedCounts.radicals} von {radicalCount} Radicals, {loadedCounts.kanji} von {kanjiCount} Kanji und {loadedCounts.vocabulary} von {vocabularyCount} Vocabulary
                </p>
            </CardHeader>
            <CardContent>
                {/* Mixed Item Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedItems.map((item) => (
                        <CombinedItemCard key={`${item.type}-${item.id}`} item={item} />
                    ))}
                </div>

                {/* Load More Button */}
                {onLoadMore && previewItems.length < totalCount && (
                    <PreviewLoadMore
                        displayedCount={displayedPreviewCount}
                        loadedCount={previewItems.length}
                        totalCount={totalCount}
                        isLoading={isLoading}
                        onLoadMore={onLoadMore}
                        itemType="Vocabulary"
                    />
                )}
            </CardContent>
        </Card>
    );
};
