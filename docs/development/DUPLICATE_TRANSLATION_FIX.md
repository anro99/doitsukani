# 🔧 Fix: Doppelte Übersetzungen in DeepL-Ergebnissen

## Problem
Bei dem Vocabulary "大文字" (Uppercase Letters) wurden dreifache "Großbuchstaben" Einträge angezeigt:

```
Aktuelle Synonyme:
Großbuchstaben
Großbuchstaben  ← Duplikat
Großbuchstaben  ← Duplikat
Versal
Majuskel
Großbuchstabe
hervorragender Text
großes Schriftzeichen
```

## Root Cause Analysis
Das Problem lag in der `mergeTranslations` Funktion in `src/lib/vocabulary-translation-merger.ts`:

- ✅ Duplikate zwischen DeepL und prebuilt Übersetzungen wurden korrekt entfernt
- ❌ **Interne Duplikate innerhalb der DeepL-Übersetzungen selbst wurden NICHT entfernt**

Wenn DeepL bereits `["Großbuchstaben", "Großbuchstaben", "Großbuchstaben"]` zurückgab, wurden diese Duplikate unverändert übernommen.

## Lösung
### 1. Test-Driven Development
Zunächst wurden Tests hinzugefügt, die das Problem reproduzieren:

```typescript
test('should remove internal duplicates within DeepL translations', () => {
    const deeplTranslations = ['Großbuchstaben', 'Großbuchstaben', 'Großbuchstaben', 'Versal'];
    const prebuiltTranslations = ['Majuskel', 'Großbuchstabe'];

    const result = mergeTranslations(deeplTranslations, prebuiltTranslations);

    // Interne DeepL-Duplikate sollten entfernt werden
    expect(result).toEqual(['Großbuchstaben', 'Versal', 'Majuskel', 'Großbuchstabe']);
});
```

### 2. Code-Fix
Die `mergeTranslations` Funktion wurde erweitert um interne Duplikat-Entfernung:

```typescript
// STEP 1: Remove internal duplicates from primary translations (DeepL)
// while preserving order and keeping first occurrence
const deduplicatedPrimary: string[] = [];
const seenPrimaryNormalized = new Set<string>();

for (const translation of primaryTranslations) {
    const normalizedTranslation = normalize(translation);
    if (!seenPrimaryNormalized.has(normalizedTranslation)) {
        seenPrimaryNormalized.add(normalizedTranslation);
        deduplicatedPrimary.push(translation);
    }
}
```

### 3. Test-Coverage
Neue Tests wurden hinzugefügt:

- ✅ Entfernung interner DeepL-Duplikate
- ✅ Case-insensitive Duplikat-Erkennung
- ✅ Beibehaltung der Reihenfolge (erste Vorkommen)
- ✅ Spezifischer Test für das "Großbuchstaben"-Problem

## Ergebnis
Nach dem Fix würde das "大文字" Vocabulary nun so aussehen:

```
Aktuelle Synonyme:
Großbuchstaben      ← Nur einmal (erste Vorkommen)
Versal
Majuskel
Großbuchstabe
hervorragender Text
großes Schriftzeichen
```

## Verification
```bash
npm test src/tests/unit/vocabulary-translation-merger.test.ts
# ✅ 22 tests passed (alle inkl. neue)

npm run build
# ✅ Build erfolgreich
```

## Wichtige Features beibehalten
- 🔒 **DeepL Priorität**: DeepL-Übersetzungen haben weiterhin absolute Priorität
- 📊 **WaniKani Limits**: 8-Synonym-Limit wird respektiert
- 🔄 **Case-insensitive**: Duplikate werden case-insensitive erkannt
- 🎯 **Reihenfolge**: Erste Vorkommen werden beibehalten

## Test-Results
- **Vorher**: 3x "Großbuchstaben" + 5 weitere = 8 Synonyme (mit Duplikaten)
- **Nachher**: 1x "Großbuchstaben" + 5 weitere = 6 Synonyme (optimiert)

Das System ist nun robust gegen Duplikate sowohl von DeepL als auch zwischen DeepL und prebuilt Übersetzungen.
