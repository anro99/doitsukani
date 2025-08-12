import React from 'react';
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
    maxLevel?: number;
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

export const LevelSelector: React.FC<LevelSelectorProps> = ({
    selectedLevel,
    onLevelChange,
    synonymMode,
    onSynonymModeChange,
    maxLevel = 60
}) => {
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
                        className="w-full p-2 border border-gray-300 rounded-md bg-white"
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
            </CardContent>
        </Card>
    );
};
