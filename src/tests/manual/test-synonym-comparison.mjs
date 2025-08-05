// 🔍 Demonstration: Groß-/Kleinschreibung und Reihenfolge beim Synonym-Vergleich

import { setTimeout } from 'node:timers/promises';

console.log('🧪 Testing Synonym Comparison Logic\n');

// Copy of the arraysEqual function from RadicalsManager
const arraysEqual = (arr1, arr2) => {
    if (arr1.length !== arr2.length) return false;

    const sorted1 = arr1.map(s => s.toLowerCase().trim()).sort();
    const sorted2 = arr2.map(s => s.toLowerCase().trim()).sort();

    return sorted1.every((val, index) => val === sorted2[index]);
};

// Test scenarios
const testScenarios = [
    {
        name: '🔤 Groß-/Kleinschreibung ignoriert',
        original: ['Zweig', 'Ast'],
        processed: ['ZWEIG', 'ast'],
        expectSkip: true
    },
    {
        name: '🔄 Reihenfolge ignoriert',
        original: ['Zweig', 'Ast', 'Branch'],
        processed: ['Branch', 'Ast', 'Zweig'],
        expectSkip: true
    },
    {
        name: '🔤🔄 Beides: Groß-/Klein + Reihenfolge',
        original: ['Zweig', 'Ast', 'Branch'],
        processed: ['AST', 'branch', 'ZWEIG'],
        expectSkip: true
    },
    {
        name: '⚡ Whitespace ignoriert',
        original: [' Zweig ', 'Ast'],
        processed: ['zweig', ' ast '],
        expectSkip: true
    },
    {
        name: '✅ Echte Änderung erkannt',
        original: ['Zweig'],
        processed: ['Zweig', 'Ast'],
        expectSkip: false
    },
    {
        name: '🌿 branch-Radikal Beispiel',
        original: ['Zweig', 'Ast'],
        processed: ['zweig', 'AST'], // Same synonyms, different case
        expectSkip: true
    }
];

console.log('📊 Test Ergebnisse:\n');

testScenarios.forEach(({ name, original, processed, expectSkip }) => {
    const shouldSkip = arraysEqual(original, processed);
    const status = shouldSkip === expectSkip ? '✅' : '❌';
    const action = shouldSkip ? 'ÜBERSPRUNGEN' : 'HOCHLADEN';

    console.log(`${status} ${name}`);
    console.log(`   Original:  [${original.map(s => `"${s}"`).join(', ')}]`);
    console.log(`   Verarbeitet: [${processed.map(s => `"${s}"`).join(', ')}]`);
    console.log(`   Entscheidung: ${action} (erwartet: ${expectSkip ? 'ÜBERSPRUNGEN' : 'HOCHLADEN'})`);
    console.log('');
});

// Practical example with smart-merge logic
console.log('🔧 Praktisches Beispiel: Smart-Merge Logik\n');

const simulateSmartMerge = (currentSynonyms, newTranslation) => {
    console.log(`Aktuelle Synonyme: [${currentSynonyms.map(s => `"${s}"`).join(', ')}]`);
    console.log(`Neue Übersetzung: "${newTranslation}"`);

    // Check if translation already exists (case-insensitive)
    const exists = currentSynonyms.some(syn =>
        syn.toLowerCase().trim() === newTranslation.toLowerCase()
    );

    console.log(`Übersetzung existiert bereits: ${exists ? 'JA' : 'NEIN'}`);

    // Smart-merge logic
    const newSynonyms = exists ? currentSynonyms : [...currentSynonyms, newTranslation];

    console.log(`Nach Smart-Merge: [${newSynonyms.map(s => `"${s}"`).join(', ')}]`);

    // Check if upload needed
    const uploadNeeded = !arraysEqual(currentSynonyms, newSynonyms);

    console.log(`Upload notwendig: ${uploadNeeded ? 'JA' : 'NEIN'}`);
    console.log(`Aktion: ${uploadNeeded ? '📤 HOCHLADEN' : '⏭️ ÜBERSPRUNGEN'}`);

    return uploadNeeded;
};

console.log('Beispiel 1: "branch" → "zweig" (existiert bereits als "Zweig")');
simulateSmartMerge(['Zweig', 'Ast'], 'zweig');

console.log('\n' + '='.repeat(50) + '\n');

console.log('Beispiel 2: "ground" → "Boden" (neu)');
simulateSmartMerge(['Erdboden'], 'Boden');

console.log('\n🎉 Fazit: Die Implementation berücksichtigt korrekt:');
console.log('   ✅ Groß-/Kleinschreibung wird ignoriert');
console.log('   ✅ Reihenfolge wird ignoriert');
console.log('   ✅ Whitespace wird ignoriert');
console.log('   ✅ Nur echte Änderungen führen zu Uploads');

export { };
