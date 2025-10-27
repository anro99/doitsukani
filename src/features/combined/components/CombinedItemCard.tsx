/**
 * Combined Item Card Component
 * 
 * Zeigt ein einzelnes Combined Item (Radical/Kanji/Vocabulary) an
 * mit Type Badge und type-spezifischem Display.
 * 
 * Features:
 * - Type Badge (R/K/V) mit farblicher Kennzeichnung
 * - Type-spezifisches Display
 * - Conditional Rendering basierend auf Type Guards
 * - Synonym Display
 */

import { Badge } from '../../../shared/components/ui/badge';
import { SynonymBadges } from '../../../shared/components/processing/ItemPreviewCard';
import type { CombinedItem } from '../types/combined-types';
import { isRadical, isKanji, isVocabulary } from '../types/combined-types';

/**
 * Props für CombinedItemCard
 */
interface CombinedItemCardProps {
    /** Combined Item (Radical | Kanji | Vocabulary) */
    item: CombinedItem;
}

/**
 * Type Badge Configuration
 * 
 * Definiert Farben und Labels für jeden Type
 */
const TYPE_BADGE_CONFIG = {
    radical: {
        label: 'R',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-200',
        gradientFrom: 'from-blue-50',
        gradientTo: 'to-cyan-50',
        characterColor: 'text-blue-600',
    },
    kanji: {
        label: 'K',
        bgColor: 'bg-pink-100',
        textColor: 'text-pink-800',
        borderColor: 'border-pink-200',
        gradientFrom: 'from-pink-50',
        gradientTo: 'to-rose-50',
        characterColor: 'text-pink-600',
    },
    vocabulary: {
        label: 'V',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-800',
        borderColor: 'border-purple-200',
        gradientFrom: 'from-purple-50',
        gradientTo: 'to-indigo-50',
        characterColor: 'text-purple-600',
    },
} as const;

/**
 * Combined Item Card Component
 * 
 * Rendert ein Combined Item mit type-spezifischem Styling und Display.
 * Verwendet Type Guards für sichere Type Narrowing.
 */
export const CombinedItemCard = ({ item }: CombinedItemCardProps) => {
    const config = TYPE_BADGE_CONFIG[item.type];

    return (
        <div
            className={`p-4 border rounded-lg bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} ${config.borderColor}`}
            data-testid={`combined-card-${item.type}-${item.id}`}
        >
            {/* Type Badge */}
            <div className="flex items-center justify-between mb-3">
                <Badge
                    className={`${config.bgColor} ${config.textColor} font-bold`}
                    data-testid={`type-badge-${item.type}`}
                >
                    {config.label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                    Level {item.level}
                </Badge>
            </div>

            {/* Radical-specific Display */}
            {isRadical(item) && (
                <div className="mb-3">
                    <div className="flex items-start gap-3">
                        <span className={`text-2xl font-bold ${config.characterColor} min-w-fit`}>
                            {item.characters || '📝'}
                        </span>
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 break-words">
                                {item.primaryMeaning}
                            </div>
                            {item.meaningMnemonic && (
                                <div className="text-xs text-gray-500 mt-1 break-words">
                                    💡 {item.meaningMnemonic}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Kanji-specific Display */}
            {isKanji(item) && (
                <div className="mb-3">
                    <div className="flex items-start gap-3">
                        <span className={`text-2xl font-bold ${config.characterColor} min-w-fit`}>
                            {item.characters}
                        </span>
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 break-words">
                                {item.primaryMeaning}
                            </div>
                            {item.alternativeMeanings && item.alternativeMeanings.length > 0 && (
                                <div className="text-xs text-gray-500 mt-1 break-words">
                                    Alt: {item.alternativeMeanings.join(', ')}
                                </div>
                            )}
                            {item.meaningMnemonic && (
                                <div className="text-xs text-gray-500 mt-1 break-words">
                                    💡 {item.meaningMnemonic}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Vocabulary-specific Display */}
            {isVocabulary(item) && (
                <div className="mb-3">
                    <div className="flex items-start gap-3">
                        <span className={`text-2xl font-bold ${config.characterColor} min-w-fit`}>
                            {item.characters}
                        </span>
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 break-words">
                                {item.primaryMeaning}
                            </div>
                            {item.alternativeMeanings && item.alternativeMeanings.length > 0 && (
                                <div className="text-xs text-gray-500 mt-1 break-words">
                                    Alt: {item.alternativeMeanings.join(', ')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Current Synonyms - gemeinsam für alle Typen */}
            <SynonymBadges
                label="Aktuelle Synonyme:"
                synonyms={item.existingSynonyms || []}
                variant="current"
                emptyMessage="Keine Synonyme"
            />

            {/* Translated Synonyms (if available) */}
            {item.translatedSynonyms && item.translatedSynonyms.length > 0 && (
                <div className="mt-2">
                    <SynonymBadges
                        label="Übersetzte Synonyme:"
                        synonyms={item.translatedSynonyms}
                        variant="translated"
                    />
                </div>
            )}
        </div>
    );
};
