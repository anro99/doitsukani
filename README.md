# Doitsukani ドイツ蟹

![Deployment](https://github.com/eickler/doitsukani/actions/workflows/web.yml/badge.svg)

**Doitsukani** ist ein Tool zur automatischen Übersetzung von WaniKani Vokabeln, Kanji und Radikalen ins Deutsche.

[🚀 Live App](https://eickler.github.io/doitsukani) | [📋 Refactoring Plan](docs/REFACTORING_PLAN.md) | [🧪 Testing Guide](TESTING.md)

---

## 🎯 Features

### **Vocabulary (Vokabeln)**
- ✅ **DeepL Translation**: Hochwertige Übersetzungen via DeepL API
- ✅ **Contextual Dictionary**: Fallback auf EDICT2/Wadoku Dictionary
- ✅ **Streaming Processing**: Parallel Translation + Upload
- ✅ **3-Phase Progress**: Detaillierte Fortschrittsanzeige

### **Kanji (漢字)**
- ✅ **DeepL Translation**: Übersetzung von Kanji-Bedeutungen
- ⚠️ **Batch Processing**: Sequentielle Verarbeitung (Streaming geplant)
- ⚠️ **Single Progress Bar**: Einfache Fortschrittsanzeige

### **Radicals (部首)**
- ✅ **DeepL Translation**: Übersetzung von Radikal-Bedeutungen
- ⚠️ **Batch Processing**: Sequentielle Verarbeitung (Streaming geplant)
- ⚠️ **Single Progress Bar**: Einfache Fortschrittsanzeige

---

## 🚀 Quick Start

### 1. WaniKani API Token erstellen
1. Gehe zu [WaniKani Personal Access Tokens](https://www.wanikani.com/settings/personal_access_tokens)
2. Erstelle einen neuen Token mit folgenden Permissions:
   - `study_materials:create`
   - `study_materials:update`
3. Kopiere den Token

### 2. DeepL API Key erstellen (Optional, aber empfohlen)
1. Registriere dich bei [DeepL API](https://www.deepl.com/pro-api)
2. Erstelle einen API Key (Free Tier: 500.000 Zeichen/Monat)
3. Kopiere den Key

### 3. App nutzen
1. Öffne [Doitsukani](https://eickler.github.io/doitsukani)
2. Füge deine Tokens ein
3. Wähle Level und Synonym-Mode
4. Klicke "Start Processing"
5. ⏳ Warte (die ETA zeigt die geschätzte Restzeit)

---

## 🎨 Synonym Modes

### **Smart Merge** (Empfohlen)
- ✅ Behält existierende User-Synonyme
- ✅ Fügt neue Übersetzungen hinzu
- ✅ Entfernt Duplikate
- ✅ Limit: 8 Synonyme

### **Replace**
- ⚠️ Ersetzt ALLE existierenden Synonyme
- ✅ Saubere neue Übersetzungen
- ⚠️ User-Synonyme gehen verloren

### **Delete**
- 🗑️ Entfernt ALLE Synonyme
- Nützlich zum Zurücksetzen

---

## 📊 Projektstruktur

```
doitsukani/
├── src/
│   ├── features/              # Feature-basierte Architektur
│   │   ├── vocabulary/        # Vokabel-Management
│   │   │   ├── components/    # UI Components
│   │   │   ├── hooks/         # useVocabularyManager
│   │   │   └── lib/           # Translation + Upload Logic
│   │   ├── kanji/             # Kanji-Management
│   │   │   ├── components/
│   │   │   ├── hooks/         # useKanjiManager
│   │   │   └── lib/
│   │   └── radicals/          # Radikale-Management
│   │       ├── components/
│   │       ├── hooks/         # useRadicalsManager
│   │       └── lib/
│   │
│   ├── shared/                # Gemeinsame Komponenten
│   │   ├── components/        # UI (Button, Card, Progress, etc.)
│   │   ├── lib/               # WaniKani API, DeepL API, Storage
│   │   └── types/             # TypeScript Types
│   │
│   └── tests/
│       ├── unit/              # 469 Unit Tests
│       └── integration/       # 84 Integration Tests
│
├── docs/
│   ├── REFACTORING_PLAN.md    # 📋 Unified Streaming Architecture Plan
│   └── ARCHITECTURE.md         # 🏗️ Architektur-Übersicht
│
├── tools/                      # Build Tools
│   ├── buildmap.ts            # Dictionary Builder
│   └── wkvocab.ts             # Vocabulary Parser
│
└── README.md                   # This file
```

---

## 🏗️ Architektur

### **Aktueller Stand (Oktober 2025)**

#### **Vocabulary** ✅
- **Streaming Processing**: Translation und Upload parallel
- **Contextual Dictionary**: EDICT2/Wadoku Fallback
- **3-Phase Progress**: Translation → Upload → Overall

#### **Kanji & Radicals** ⚠️
- **Batch Processing**: Translation dann Upload (sequentiell)
- **DeepL Only**: Kein Dictionary
- **Single Progress**: Ein Progress-Balken

### **Geplantes Refactoring** 🚀
Siehe [Refactoring Plan](docs/REFACTORING_PLAN.md) für Details.

**Ziele:**
1. ✅ Unified Streaming für alle Features
2. ✅ Gemeinsame `GenericStreamingProcessor` Klasse
3. ✅ Interface-basiertes Design für Testbarkeit
4. ✅ 3-Phase Progress UI überall
5. ✅ ~2x Performance-Verbesserung für Kanji/Radicals

---

## 🧪 Testing

### **Test Coverage**
```bash
npm test                    # Alle Tests (Unit + Integration)
npm run test:unit          # Unit Tests (469 Tests)
npm run test:integration   # Integration Tests (84 Tests)
npm run test:coverage      # Coverage Report
```

### **Test-Struktur**
- **Unit Tests**: Isolierte Komponenten-Tests mit Mocks
- **Integration Tests**: Echte API-Calls mit TEST RADICALS
- **Safety**: Nur 3 dedizierte Test-Radicals werden verändert

Siehe [TESTING.md](TESTING.md) für Details.

---

## 🛠️ Development

### **Setup**
```bash
npm install                 # Dependencies installieren
npm run dev                 # Dev-Server starten (localhost:5173)
npm run build               # Production Build
npm run preview             # Build testen
```

### **Code-Qualität**
```bash
npm run lint                # ESLint
npm run type-check          # TypeScript Check
npm test                    # Tests
```

### **Projekt-Standards**
- **TypeScript**: Strict Mode
- **React 18+**: Functional Components + Hooks
- **Vite**: Build Tool
- **Vitest**: Test Framework
- **TailwindCSS**: Styling
- **shadcn/ui**: UI Components

---

## 📚 Technologie-Stack

### **Frontend**
- **React 18.3**: UI Framework
- **TypeScript 5.6**: Type Safety
- **Vite 7.1**: Build Tool & Dev Server
- **TailwindCSS 3.4**: Styling
- **shadcn/ui**: Component Library

### **APIs**
- **WaniKani API**: Subject & Study Material Management
- **DeepL API**: Translation Service
- **EDICT2/Wadoku**: Dictionary Fallback (nur Vocabulary)

### **Testing**
- **Vitest 3.2**: Test Framework
- **Testing Library**: React Component Tests
- **MSW (geplant)**: API Mocking

### **Build & Tools**
- **ESBuild**: Fast Bundling
- **PostCSS**: CSS Processing
- **TypeScript Compiler**: Type Checking

---

## 🚧 Known Limitations

### **Vocabulary**
- ~100 Items ohne Wadoku-Entsprechung
- Dictionary hat Rechtschreibfehler
- Kann User-Synonyme nicht von App-Synonymen unterscheiden

### **Kanji & Radicals**
- Batch Processing langsamer als Streaming
- Nur 1 Progress-Balken statt 3
- Keine Dictionary-Unterstützung

### **Allgemein**
- Rate Limiting: ~1 Upload/Sekunde (WaniKani API)
- Erste Übersetzung dauert lange (alle nicht-gebrannten Items)
- Browser-Schließen stoppt den Prozess (Resume möglich)

---

## 🗺️ Roadmap

### **Phase 1: Refactoring** (geplant)
- [ ] Unified Streaming Architecture für alle Features
- [ ] Interface-basiertes Design
- [ ] Gemeinsame `GenericStreamingProcessor` Klasse
- [ ] 3-Phase Progress UI für Kanji & Radicals

### **Phase 2: Performance** (geplant)
- [ ] MSW für API-Mocking in Tests
- [ ] Optimierte Batch-Sizes
- [ ] Progressive Web App (PWA)
- [ ] Offline-Unterstützung

### **Phase 3: Features** (Ideen)
- [ ] Bulk-Edit für Synonyme
- [ ] Export/Import von Übersetzungen
- [ ] Mehrsprachigkeit (nicht nur Deutsch)
- [ ] Custom Dictionary Support

---

## 🤝 Contributing

Contributions sind willkommen! Bitte beachte:

1. **Branching**: Feature-Branches von `main`
2. **Tests**: Neue Features brauchen Tests
3. **Code Style**: ESLint + Prettier
4. **Commits**: Conventional Commits Format
5. **PR**: Beschreibung + Tests + Screenshots

### **Development Workflow**
```bash
git checkout -b feature/my-feature
npm run dev                    # Entwickeln
npm test                       # Testen
npm run lint                   # Code-Qualität
git commit -m "feat: Add my feature"
git push origin feature/my-feature
```

---

## 📝 License

MIT License - siehe [LICENSE](LICENSE)

---

## 🙏 Credits

- **EDICT2/Wadoku**: [Wadoku Projekt](https://www.wadoku.de) für deutsches Dictionary
- **WaniKani**: [Tofugu](https://www.wanikani.com) für die großartige Lern-App
- **DeepL**: [DeepL](https://www.deepl.com) für hochwertige Übersetzungen
- **Original Autor**: [eickler](https://github.com/eickler) für die initiale Version

---

## 📧 Contact

- **Issues**: [GitHub Issues](https://github.com/anro99/doitsukani/issues)
- **Discussions**: [GitHub Discussions](https://github.com/anro99/doitsukani/discussions)

---

**Made with ❤️ for the WaniKani Community** 🦀🇩🇪🇯🇵
