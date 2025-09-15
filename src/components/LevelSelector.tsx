import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

type SynonymMode = 'replace' | 'smart-merge' | 'delete';

interface SynonymModeData {
    value: SynonymMode;
    label: string;
    description: string;
    icon: string;
}

interface LevelSelectorProps {
    selectedLevel: number | 'all';
    onLevelChange: (level: number | 'all') => void;
    synonymMode: SynonymMode;
    onSynonymModeChange: (mode: SynonymMode) => void;
    isStreamingMode: boolean;
    onStreamingModeChange: (streaming: boolean) => void;
    maxLevel?: number;
    isProcessing?: boolean;
    // Count props removed - no longer needed
}

const synonymModeOptions: SynonymModeData[] = [
    {
        value: 'smart-merge',
        label: 'Smart Merge',
        description: 'Fügt neue Übersetzungen zu bestehenden Synonymen hinzu (empfohlen)',
        icon: '🤖'
    },
    {
        value: 'replace',
        label: 'Replace',
        description: 'Ersetzt alle bestehenden Synonyme vollständig',
        icon: '🔄'
    },
    {
        value: 'delete',
        label: 'Delete All',
        description: 'Löscht alle Synonyme (keine DeepL-API erforderlich)',
        icon: '🗑️'
    }
];

export const LevelSelector = ({
    selectedLevel,
    onLevelChange,
    synonymMode,
    onSynonymModeChange,
    isStreamingMode,
    onStreamingModeChange,
    maxLevel = 60,
    isProcessing = false
}: LevelSelectorProps) => {
    // Simplified - no count logic needed
    const levelOptions = [
        { value: 'all' as const, label: 'Alle Level' },
        ...Array.from({ length: maxLevel }, (_, i) => ({
            value: i + 1,
            label: `Level ${i + 1}`
        }))
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>📊 Verarbeitungseinstellungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-3">
                    <Label htmlFor="level-select">Level auswählen</Label>
                    <select
                        id="level-select"
                        value={selectedLevel}
                        onChange={(e) => onLevelChange(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        style={{
                            backgroundColor: 'white',
                            color: '#111827',
                            borderColor: '#d1d5db'
                        }}
                    >
                        {levelOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-3">
                    <Label>Synonym-Modus</Label>
                    <RadioGroup
                        value={synonymMode}
                        onValueChange={(value) => onSynonymModeChange(value as SynonymMode)}
                        className="space-y-3"
                    >
                        {synonymModeOptions.map(option => (
                            <div key={option.value} className="flex items-start space-x-3">
                                <RadioGroupItem
                                    value={option.value}
                                    id={`mode-${option.value}`}
                                    className="mt-1"
                                />
                                <div className="flex-1 space-y-1">
                                    <Label
                                        htmlFor={`mode-${option.value}`}
                                        className="flex items-center gap-2 cursor-pointer"
                                    >
                                        <span>{option.icon}</span>
                                        <span className="font-medium">{option.label}</span>
                                    </Label>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        {option.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </RadioGroup>
                </div>

                <div className="space-y-3">
                    <Label>Verarbeitungsmodus</Label>
                    <RadioGroup
                        value={isStreamingMode ? 'streaming' : 'sequential'}
                        onValueChange={(value) => onStreamingModeChange(value === 'streaming')}
                        className="space-y-3"
                        disabled={isProcessing}
                    >
                        <div className="flex items-start space-x-3">
                            <RadioGroupItem
                                value="sequential"
                                id="mode-sequential"
                                className="mt-1"
                                disabled={isProcessing}
                            />
                            <div className="flex-1 space-y-1">
                                <Label
                                    htmlFor="mode-sequential"
                                    className={`flex items-center gap-2 cursor-pointer ${isProcessing ? 'opacity-50' : ''}`}
                                >
                                    <span>🔄</span>
                                    <span className="font-medium">Sequenziell</span>
                                </Label>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Erst alle Übersetzungen durchführen, dann alle zu WaniKani hochladen
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <RadioGroupItem
                                value="streaming"
                                id="mode-streaming"
                                className="mt-1"
                                disabled={isProcessing}
                            />
                            <div className="flex-1 space-y-1">
                                <Label
                                    htmlFor="mode-streaming"
                                    className={`flex items-center gap-2 cursor-pointer ${isProcessing ? 'opacity-50' : ''}`}
                                >
                                    <span>⚡</span>
                                    <span className="font-medium">Streaming</span>
                                </Label>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Sobald ein Vocabulary übersetzt ist, wird es sofort zu WaniKani hochgeladen (parallel)
                                </p>
                            </div>
                        </div>
                    </RadioGroup>
                </div>
            </CardContent>
        </Card>
    );
};
