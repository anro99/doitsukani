# Tests für Doitsukani

## Übersicht

Das Projekt verfügt über umfassende Tests für die Kernfunktionalität:

### Test-Kategorien

- **Unit Tests** (`src/tests/unit/`): Mock-basierte Tests für einzelne Module
  - `deepl.test.ts`: DeepL API Wrapper Tests
  - `deepl.capitalization.test.ts`: Groß-/Kleinschreibung-Fix Tests
  - `RadicalsManager.*.test.tsx`: React Component Tests
  - `wanikani.test.ts`: WaniKani API Tests
  - `progressreporter.test.ts`: Progress Management Tests
- **Integration Tests** (`src/tests/integration/`): Echte API-Tests
  - `deepl.integration.test.ts`: Echte DeepL API Integration
- **Manual Tests** (`src/tests/manual/`): Manuelle Test-Skripte
  - `test-deepl.js`: Grundlegende DeepL API Tests
  - `test-bamboo-loiter.js`: Groß-/Kleinschreibung Problem-Tests
  - `test-internal-deepl.js`: Interne translateText-Funktion Tests
- **Build Tools Tests** (`tools/`): Tests für Build-Tools
  - `buildmap.test.ts`: Tests für Übersetzungsgenerierung

### Test-Befehle

```bash
# Alle Tests ausführen
npm test

# Tests einmalig ausführen
npm run test:run

# Tests im Watch-Modus
npm run test:watch

# Test UI öffnen
npm run test:ui

# Tests mit Coverage-Report
npm run test:coverage
```

### Debugging von Tests

#### VS Code Debugging
1. Öffnen Sie eine Test-Datei
2. Setzen Sie Breakpoints
3. **F5** → "Debug Single Test" oder "Debug All Tests"

#### Einzelne Tests debuggen
```bash
# Specific test file
npx vitest run src/lib/wanikani.test.ts

# Specific test pattern
npx vitest run -t "should merge synonyms"
```

### Test-Struktur

```
src/
├── tests/
│   ├── unit/                     # Automatisierte Unit Tests (mocked)
│   │   ├── deepl.test.ts
│   │   ├── deepl.capitalization.test.ts
│   │   ├── RadicalsManager.*.test.tsx
│   │   ├── wanikani.test.ts
│   │   └── progressreporter.test.ts
│   ├── integration/              # Echte API Integration Tests
│   │   └── deepl.integration.test.ts
│   └── manual/                   # Manuelle Test-Skripte
│       ├── test-deepl.js
│       ├── test-bamboo-loiter.js
│       ├── test-internal-deepl.js
│       └── README.md
├── test/
│   └── setup.ts                  # Test setup & mocks
tools/
└── buildmap.test.ts              # Build tools tests
```

### Manuelle Tests ausführen

```bash
# DeepL API Grundtest
node src/tests/manual/test-deepl.js

# Groß-/Kleinschreibung-Problem testen
node src/tests/manual/test-bamboo-loiter.js

# Interne translateText-Funktion testen  
npx tsx src/tests/manual/test-internal-deepl.js
```

### Test-Features

- **Umfassende Edge-Case-Behandlung**: Null/undefined, leere Arrays, große Datasets
- **Performance-Tests**: Überprüfung der Effizienz bei großen Datenmengen
- **Error-Handling**: Tests für Fehlerbehandlung und Robustheit
- **Realistische Szenarien**: Tests mit echten Wanikani-Datenmustern

### Erweiterte Test-Konfiguration

Die Tests verwenden:
- **Vitest** als Test-Framework
- **jsdom** für Browser-APIs
- **Mocking** für externe Dependencies
- **Coverage Reports** für Code-Abdeckung

### Neue Tests hinzufügen

1. Erstellen Sie eine neue `.test.ts` Datei
2. Importieren Sie `describe`, `expect`, `it` von vitest
3. Nutzen Sie das etablierte Muster der bestehenden Tests

Beispiel:
```typescript
import { describe, expect, it } from "vitest";
import { myFunction } from "./myModule";

describe("My Module", () => {
  it("should work correctly", () => {
    expect(myFunction("input")).toBe("expected output");
  });
});
```

Die Test-Suite ist darauf ausgelegt, die Zuverlässigkeit und Qualität des Codes sicherzustellen, besonders vor der geplanten DeepL-Integration für Radicals-Übersetzungen.
