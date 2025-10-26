import { Progress } from '../ui/progress';

/**
 * Streaming Phase für Translation/Upload
 */
export interface ProcessingPhase {
    status: string;
    progress: number;
}

/**
 * Props für DualProgressBars
 */
interface DualProgressBarsProps {
    translationPhase: ProcessingPhase;
    uploadPhase: ProcessingPhase;
    currentItem?: string;
}

/**
 * Dual Progress Bars für Translation + Upload
 * 
 * Zeigt zwei separate Fortschrittsbalken:
 * - Translation Progress (blau)
 * - Upload Progress (grün)
 * - Aktuelles Item (optional)
 */
export const DualProgressBars = ({
    translationPhase,
    uploadPhase,
    currentItem
}: DualProgressBarsProps) => {
    return (
        <div className="space-y-4">
            {/* Translation Progress */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🔄</span>
                    <span className="text-sm font-medium text-blue-700">Translation</span>
                    <span className="text-xs text-gray-500 ml-auto">
                        {translationPhase.status}
                    </span>
                </div>
                <Progress
                    value={translationPhase.progress}
                    className="w-full bg-blue-100"
                />
                <p className="text-xs text-blue-600 text-center">
                    {translationPhase.progress}% translated
                </p>
            </div>

            {/* Upload Progress */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <span className="text-lg">📤</span>
                    <span className="text-sm font-medium text-green-700">Upload</span>
                    <span className="text-xs text-gray-500 ml-auto">
                        {uploadPhase.status}
                    </span>
                </div>
                <Progress
                    value={uploadPhase.progress}
                    className="w-full bg-green-100"
                />
                <p className="text-xs text-green-600 text-center">
                    {uploadPhase.progress}% uploaded
                </p>
            </div>

            {/* Current Item */}
            {currentItem && (
                <p className="text-xs text-gray-600 text-center">
                    Verarbeite: <span className="font-mono font-bold">{currentItem}</span>
                </p>
            )}
        </div>
    );
};
