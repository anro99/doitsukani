import { Button } from '../ui/button';

/**
 * Processing Result von Streaming Processor
 */
export interface ProcessingResult {
    success: boolean;
    wasStopped?: boolean;
    totalItems: number;
    translationCount: number;
    uploadCount: number;
    errorCount: number;
    processingTime: number;
}

/**
 * Props für ProcessingButton
 */
interface ProcessingButtonProps {
    isProcessing: boolean;
    canStart: boolean;
    result?: ProcessingResult | null;
    onStart: () => void;
    onStop: () => void;
    onClearResults?: () => void;
}

/**
 * Processing Button mit State-based Styling
 * 
 * States:
 * - Default: "▶️ Synonyme übersetzen und aktualisieren"
 * - Processing: "Streaming läuft..."
 * - Stopped: "▶️ Continue Processing" (blau)
 * - Success: "✅ Process Again" (grün)
 * - Error: "⚠️ Retry Processing" (orange)
 */
export const ProcessingButton = ({
    isProcessing,
    canStart,
    result,
    onStart,
    onStop,
    onClearResults
}: ProcessingButtonProps) => {
    // Bestimme Button-Style basierend auf Status
    const getButtonStyle = () => {
        if (result?.wasStopped) {
            return 'bg-blue-600 hover:bg-blue-700';
        }
        if (result?.success) {
            return 'bg-green-600 hover:bg-green-700';
        }
        if (result && !result.success) {
            return 'bg-orange-600 hover:bg-orange-700';
        }
        return '';
    };

    // Bestimme Button-Text
    const getButtonText = () => {
        if (isProcessing) {
            return 'Streaming läuft...';
        }
        if (result?.wasStopped) {
            return '▶️ Continue Processing';
        }
        if (result?.success) {
            return '✅ Process Again';
        }
        if (result && !result.success) {
            return '⚠️ Retry Processing';
        }
        return '▶️ Synonyme übersetzen und aktualisieren';
    };

    return (
        <div className="flex gap-4">
            {/* Start/Continue/Retry Button */}
            <Button
                onClick={onStart}
                disabled={!canStart}
                className={`flex-1 ${getButtonStyle()}`}
                variant="default"
            >
                {getButtonText()}
            </Button>

            {/* Stop Button */}
            <Button
                variant="outline"
                onClick={onStop}
                disabled={!isProcessing}
                className={isProcessing ? 'border-red-300 text-red-600 hover:bg-red-50' : ''}
            >
                {isProcessing ? '⏹️ Stoppen' : 'Stoppen'}
            </Button>

            {/* Clear Results Button (nur wenn Result vorhanden) */}
            {result && !isProcessing && onClearResults && (
                <Button
                    variant="ghost"
                    onClick={onClearResults}
                    className="px-3 text-gray-500 hover:text-gray-700"
                    title="Clear Results"
                >
                    🗑️
                </Button>
            )}
        </div>
    );
};
