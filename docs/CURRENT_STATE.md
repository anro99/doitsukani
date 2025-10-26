# Doitsukani - Aktueller Stand

**Version**: 2.0  
**Letztes Update**: 26. Oktober 2025  
**Status**: Produktiv - Streaming-Architecture vollständig implementiert

---

## 🎯 Übersicht

Doitsukani ist eine React-Webanwendung zur automatischen Übersetzung von WaniKani-Lernmaterialien (Vocabulary, Kanji, Radicals) von Englisch nach Deutsch mittels DeepL API und optionalem EDICT2/Wadoku-Wörterbuch.

### Aktuelle Features
- ✅ **Vocabulary-Übersetzungen** mit Streaming-Processing
- ✅ **Kanji-Übersetzungen** mit Streaming-Processing  
- ✅ **Radicals-Übersetzungen** mit Streaming-Processing
- ✅ **Einheitliche UI** über alle drei Tabs
- ✅ **Gemeinsame ProcessingControls-Komponente**
- ✅ **Case-insensitive Deduplication** (Smart-Merge Mode)
- ✅ **Load More Button** in allen Vorschau-Komponenten

---

## 🏗️ Architektur

### Feature-basierte Struktur

```
src/
├── features/
│   ├── vocabulary/
│   │   ├── components/
│   │   │   ├── VocabularyManagerRefactored.tsx
│   │   │   └── VocabularyPreview.tsx
│   │   ├── hooks/
│   │   │   └── useVocabularyManager.ts
│   │   └── lib/
│   │       ├── vocabulary-streaming-integration.ts
│   │       └── vocabulary-types.ts
│   ├── kanji/
│   │   ├── components/
│   │   │   ├── KanjiManagerRefactored.tsx
│   │   │   └── KanjiPreview.tsx
│   │   ├── hooks/
│   │   │   └── useKanjiManager.ts
│   │   └── lib/
│   │       └── kanji-streaming-integration.ts
│   └── radicals/
│       ├── components/
│       │   ├── RadicalsManagerRefactored.tsx
│       │   └── RadicalPreview.tsx
│       ├── hooks/
│       │   └── useRadicalsManager.ts
│       └── lib/
│           └── radicals-streaming-integration.ts
└── shared/
    ├── components/
    │   ├── processing/
    │   │   └── ProcessingControls.tsx    # Gemeinsame Verarbeitungs-UI
    │   ├── ui/                           # shadcn/ui Komponenten
    │   ├── LevelSelector.tsx
    │   ├── progress.tsx
    │   └── TokenManagement.tsx
    ├── processing/
    │   ├── GenericStreamingProcessor.ts  # Kern-Streaming-Logik
    │   └── services/
    │       ├── DeepLService.ts
    │       └── WaniKaniService.ts
    ├── lib/
    │   ├── deepl.ts
    │   ├── wanikani.ts
    │   ├── storage.ts
    │   └── utils.ts
    └── types/
        └── wanikani.ts
```

### Kern-Komponenten

#### 1. GenericStreamingProcessor
**Zweck**: Zentrale Streaming-Logik für alle Features

**Features**:
- Parallele Translation und Upload
- 3-Phasen-Progress (Translation, Upload, Gesamt)
- Smart-Merge mit case-insensitive Deduplication
- Fehlerbehandlung mit Retry-Logik
- Abbruch-Funktionalität
- Stream-Controller für Backpressure

**Verwendet von**: Alle drei Features (Vocabulary, Kanji, Radicals)

#### 2. ProcessingControls
**Zweck**: Gemeinsame UI-Komponente für Verarbeitung

**Features**:
- Synonym-Mode Selector (Smart-Merge, Replace, Delete)
- Start/Stop Buttons
- Gesamt-Progress mit Percentage
- Streaming-Phasen-Anzeige (Translation/Upload)
- Ergebnis-Zusammenfassung
- Fehler-Anzeige

**Verwendet von**: VocabularyManager, KanjiManager, RadicalsManager

#### 3. Preview-Komponenten
**Zweck**: Vorschau der Items mit Load-More-Funktionalität

**Features**:
- Grid-Layout der Items
- Load More Button (12 Items pro Klick)
- Statistik-Anzeige: "Angezeigt: z von w geladenen {Type}"
- Konsistente Optik über alle Features

**Dateien**:
- `VocabularyPreview.tsx`
- `KanjiPreview.tsx`
- `RadicalPreview.tsx`

---

## 🧪 Testing

### Test-Strategie
- **Test-Driven Development (TDD)**: Tests vor/während Implementation
- **Unit Tests**: Isolierte Komponenten- und Logik-Tests
- **Integration Tests**: API-Interaktionen mit Mocks

### Test-Status
```
✅ Unit Tests:       565/565 passing
✅ Integration Tests: 82/82 passing
✅ Total:            647/647 passing
✅ Coverage:         Alle kritischen Pfade abgedeckt
```

### Test-Dateien
```
src/tests/
├── unit/
│   ├── GenericStreamingProcessor.test.ts
│   ├── vocabulary-preview.test.ts
│   ├── kanji-preview.test.ts
│   ├── radicals-preview.test.ts
│   └── ... (weitere Unit Tests)
└── integration/
    ├── batch-processing.integration.test.ts
    ├── deepl.integration.test.ts
    ├── delete-mode.integration.test.ts
    ├── vocabulary-streaming-integration.test.ts
    └── ... (weitere Integration Tests)
```

---

## 🔄 Aktuelle Implementierungen

### Smart-Merge Mode
**Funktion**: Intelligent Synonyme zusammenführen ohne Duplikate

**Features**:
- Case-insensitive Deduplication ("Wasser" ≠ "wasser" werden nicht beide hinzugefügt)
- Bestehende Synonyme behalten
- Nur neue, eindeutige Synonyme hinzufügen
- Paralleles Lowercase-Array für Performance

**Implementierung**: `GenericStreamingProcessor.ts` Lines 237-249

### Replace Mode
**Funktion**: Alle bestehenden Synonyme durch neue ersetzen

### Delete Mode
**Funktion**: Alle Synonyme löschen (kein DeepL-Call)

---

## 🐛 Gelöste Probleme

### 1. Case-Sensitive Duplicate Detection (422 Fehler)
**Problem**: WaniKani API lehnte Uploads mit Duplikaten wie "Sieben" + "sieben" ab

**Lösung**: 
- Paralleles lowercase-Array in GenericStreamingProcessor
- Case-insensitive Vergleich vor dem Hinzufügen
- Commit: `7cc86a5`

**Test**: `GenericStreamingProcessor.test.ts` - "sollte Smart-Merge mit case-insensitive Deduplizierung machen"

### 2. UI-Inkonsistenz über Features
**Problem**: Vocabulary, Kanji, Radicals hatten unterschiedliche UIs

**Lösung**:
- Gemeinsame `ProcessingControls` Komponente erstellt
- Redundante UI-Elemente entfernt (translationStatus/uploadStatus boxes)
- Nur noch Gesamt-Progress angezeigt
- Commits: `d60c8e9`, `cdb3b5f`

### 3. Fehlender Load More Button in Radicals
**Problem**: RadicalPreview hatte keinen Load More Button wie Kanji/Vocabulary

**Lösung**:
- `displayedPreviewCount`, `isLoadingRadicals`, `onLoadMore` Props hinzugefügt
- Zwei-stufige Button-Logik implementiert
- Statistik-Zeile hinzugefügt
- Commits: `5f4107d`, `972f636`

### 4. Inkorrekte Button-Texte und Statistik
**Problem**: Texte in RadicalPreview entsprachen nicht den Anforderungen

**Lösung**:
- Button: "Weitere 12 Radicals anzeigen (y verbleiben)"
- Statistik: "Angezeigt: z von w geladenen Radicals"
- Commit: `972f636`

---

## 📊 Metriken

### Code-Qualität
- **TypeScript Errors**: 0
- **ESLint Warnings**: 0
- **Test Coverage**: Alle kritischen Pfade
- **Code-Duplikation**: Minimiert durch Shared Components

### Performance
- **Streaming**: ~2x schneller als Legacy-Batch
- **Parallele API-Calls**: Translation + Upload gleichzeitig
- **Backpressure**: Stream-Controller verhindert Memory-Issues

### Wartbarkeit
- **Gemeinsame Komponenten**: ProcessingControls, GenericStreamingProcessor
- **Type-Safety**: Strict TypeScript Mode
- **Dokumentation**: Inline-Kommentare auf Deutsch
- **Clean Code**: Aussagekräftige Namen, Single Responsibility

---

## 🚀 Technologie-Stack

```
Frontend:     React 18.3 + TypeScript 5.6
Build:        Vite 7.1 + ESBuild
UI:           TailwindCSS 3.4 + shadcn/ui
Testing:      Vitest 3.2 + @testing-library/react
APIs:         WaniKani v2 + DeepL v2
Tools:        ESLint + Prettier
```

---

## 📝 Entwicklungs-Richtlinien

### Code-Style
- TypeScript strict mode
- Aussagekräftige Variablennamen (Deutsch)
- Code-Kommentare auf Deutsch
- Clean Code Prinzipien
- ESLint + Prettier

### Testing
- Test-Driven Development (TDD)
- Tests vor/während Implementation schreiben
- Alle Tests müssen grün sein vor Commit
- Keine `.skip` Tests committen

### Dokumentation
- Inline-Kommentare für komplexe Logik
- JSDoc für öffentliche APIs
- README und ARCHITECTURE aktuell halten
- Git-Commits aussagekräftig (Conventional Commits)

---

## 🔮 Zukünftige Verbesserungen

### Geplante Features
- [ ] Batch-Export aller Übersetzungen
- [ ] Undo-Funktion für Uploads
- [ ] Fortschritt speichern bei Abbruch
- [ ] Dark Mode
- [ ] Offline-Support mit Service Worker

### Tech Debt
- [ ] E2E Tests mit Playwright hinzufügen
- [ ] Performance Monitoring
- [ ] Accessibility Audit (WCAG 2.1)
- [ ] Bundle Size Optimierung

---

## 📚 Referenzen

### Dokumentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detaillierte Architektur-Beschreibung
- [TESTING.md](../TESTING.md) - Testing-Strategie und Guidelines
- [README.md](../README.md) - Projekt-Übersicht und Setup

### APIs
- [WaniKani API v2](https://docs.api.wanikani.com/20170710/)
- [DeepL API v2](https://www.deepl.com/docs-api)

### Tools
- [Vite Documentation](https://vitejs.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [shadcn/ui](https://ui.shadcn.com/)

---

**Letzter Stand**: 26. Oktober 2025  
**Maintainer**: GitHub Copilot + Entwickler-Team  
**License**: Siehe [LICENSE](../LICENSE)
