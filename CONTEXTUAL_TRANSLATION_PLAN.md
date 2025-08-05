# Plan: Kontextuelle DeepL-Übersetzungen mit WaniKani Meaning Mnemonics

## 🎯 Problemstellung
- "branch" → "Zweigstelle" (falsch, sollte "Ast" sein)
- WaniKani Radikale haben `meaning_mnemonic` mit Kontext
- DeepL braucht Kontext für korrekte Übersetzungen

## 📋 Implementierungsplan

### Phase 1: Analyse & Prototyping
1. **WaniKani Datenstruktur analysieren**
   - Untersuchen aller verfügbaren Kontextfelder
   - Mapping von meaning_mnemonic zu Kontext
   - Testen verschiedener Kontextstrategien

2. **DeepL Kontext-Tests**
   - Testen verschiedener Kontext-Formate
   - Optimal: "branch (tree limb)" vs "branch" vs "tree branch"
   - Messung der Übersetzungsqualität

### Phase 2: Core Implementation  
3. **Erweiterte DeepL-Funktionen**
   - `translateTextWithContext()` Funktion
   - `translateBatchWithContext()` Funktion
   - Intelligente Kontext-Extraktion aus meaning_mnemonic

4. **WaniKani Integration**
   - Erweiterte `getRadicals()` mit meaning_mnemonic
   - Kontext-Mapping für häufige Problemfälle
   - Fallback-Strategien ohne Kontext

### Phase 3: RadicalsManager Integration
5. **UI/UX Verbesserungen**
   - Kontext-Anzeige in der Radical-Liste
   - Toggle für Kontext-basierte Übersetzung
   - Vergleich original vs. kontextuell

6. **Testing & Validation**
   - Unit Tests für Kontext-Extraktion
   - Integration Tests mit echten WaniKani Daten
   - Manuelle Tests für Problemfälle

### Phase 4: Optimierung
7. **Performance & Caching**
   - Caching von Kontext-Mappings
   - Batch-optimierte Übersetzungen
   - Rate-Limiting Optimierungen

8. **Dokumentation & Monitoring**
   - Logging von Übersetzungsverbesserungen
   - Dokumentation für neue Features
   - Fehlerbehandlung und Fallbacks

## 🔧 Technische Details

### Neue Funktionen:
```typescript
// Neue DeepL Funktionen
translateTextWithContext(
  apiKey: string, 
  text: string, 
  context: string, 
  targetLang: string, 
  isProTier: boolean
): Promise<string>

translateBatchWithContext(
  apiKey: string, 
  items: Array<{text: string, context?: string}>, 
  targetLang: string, 
  isProTier: boolean
): Promise<string[]>

// Kontext-Extraktion
extractContextFromMnemonic(
  meaningMnemonic: string, 
  primaryMeaning: string
): string | null
```

### Datenstrukturen:
```typescript
interface RadicalWithContext {
  id: number;
  meaning: string;
  meaningMnemonic: string;
  extractedContext?: string;
  translationWithContext?: string;
  translationWithoutContext?: string;
}
```

## 📊 Erwartete Verbesserungen

### Vorher:
- "branch" → "Zweigstelle" ❌
- "ground" → "Grund" (kann je nach Kontext falsch sein)
- "fire" → "Feuer" ✅ (meist korrekt)

### Nachher:
- "branch (tree limb)" → "Ast" ✅
- "ground (earth, soil)" → "Boden" ✅  
- "fire (flame)" → "Feuer" ✅

## 🎯 Success Metrics
1. **Übersetzungsqualität**: >90% korrekte kontextuelle Übersetzungen
2. **Performance**: <50ms zusätzliche Latenz pro Übersetzung
3. **User Experience**: Sichtbare Verbesserung in RadicalsManager
4. **Backward Compatibility**: Alle bestehenden Tests bestehen weiterhin
