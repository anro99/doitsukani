# DeepL Integration Tests

Diese Datei enthält Tests für die DeepL API Integration, die **tatsächliche API-Aufrufe** an DeepL senden.

## 🧪 Test-Kategorien

### Unit Tests (in `../unit/deepl.test.ts`)
- Mock-basierte Tests
- Laufen automatisch bei `npm test`
- 30 Tests die alle Funktionen mocken
- Validieren Logik ohne externe API-Calls

### Integration Tests (in `deepl.integration.test.ts`)
- **Echte API-Calls** an DeepL
- Benötigen gültigen API-Key
- Testen tatsächliche Übersetzungsqualität
- Nur in Node.js Umgebung (nicht jsdom)

## 🔧 Setup für Integration Tests

### 1. DeepL API Key erhalten
- Registriere dich bei [DeepL API](https://www.deepl.com/pro-api)
- Kostenlose Tier: 500.000 Zeichen/Monat
- Pro Tier: Erweiterte Limits

### 2. API-Key konfigurieren

**Option A: .env Datei (empfohlen)**
1. Öffne die `.env` Datei im Projektroot
2. Trage deinen API-Key ein:
```env
DEEPL_API_KEY=dein_api_key_hier
DEEPL_PRO=false  # oder true für Pro-Account
```

**Option B: Environment Variables**

**PowerShell:**
```powershell
$env:DEEPL_API_KEY="dein_api_key_hier"
$env:DEEPL_PRO="false"  # oder "true" für Pro-Account
```

**CMD:**
```cmd
set DEEPL_API_KEY=dein_api_key_hier
set DEEPL_PRO=false
```

**Bash/Linux:**
```bash
export DEEPL_API_KEY="dein_api_key_hier"
export DEEPL_PRO="false"
```

### 3. Tests ausführen

**Mit Node.js Umgebung (empfohlen):**
```bash
npm run test:integration -- deepl.integration.test.ts
```

**Standard (Tests werden übersprungen in jsdom):**
```bash
npm test -- src/tests/integration/deepl.integration.test.ts
```

## 🧪 Was wird getestet?

### Grundfunktionen
- ✅ Englisch → Deutsch Übersetzung
- ✅ Japanische Kanji → Deutsch
- ✅ Batch-Übersetzungen
- ✅ API Usage/Quota Abfrage

### Wanikani-spezifische Tests
- ✅ Radikal-Konzepte (ground, water, fire, etc.)
- ✅ Kanji-Zeichen (人, 大, 小)
- ✅ Komplexe Beschreibungen ("ground, earth, soil")
- ✅ Wanikani Radikal-Namen ("stick", "drop", "lid")

### Rate Limiting & Error Handling
- ✅ Rate Limiting wird respektiert (1s zwischen Anfragen)
- ✅ Ungültige API Keys werden erkannt
- ✅ Ungültige Zielsprachen werden abgefangen

## 📊 Erwartete Übersetzungen

Die Tests validieren, dass DeepL korrekte deutsche Übersetzungen liefert:

| Eingabe | Erwartetes Deutsch | Regex Check |
|---------|-------------------|-------------|
| "Hello, world!" | "Hallo, Welt!" | `/hallo\|welt/` |
| "水" (Wasser) | "Wasser" | `/wasser/` |
| "人" (Mensch) | "Mensch/Person" | `/mensch\|person/` |
| "ground" | "Grund/Boden/Erde" | `/grund\|boden\|erde/` |

## ⚠️ Wichtige Hinweise

### API Kosten
- **Jeder Test verbraucht API-Quota**
- Free Tier: 500.000 Zeichen/Monat
- Ein Test-Durchlauf verbraucht ca. 100-200 Zeichen

### Rate Limiting
- Tests warten 1+ Sekunden zwischen Anfragen
- Batch-Tests dauern länger
- Vollständiger Test-Durchlauf: ~30-60 Sekunden

### Netzwerk-Abhängigkeit
- Tests benötigen Internet-Verbindung
- DeepL API muss erreichbar sein
- Firewall/Proxy können Tests blockieren

## 🚀 Für die Radikals-Übersetzung

Diese Tests validieren, dass DeepL für die geplante Radikals-Übersetzungsfunktion geeignet ist:

1. **Einfache Begriffe**: "ground" → "Grund"
2. **Kanji-Zeichen**: "水" → "Wasser"  
3. **Mehrere Bedeutungen**: "ground, earth, soil" → "Grund, Erde, Boden"
4. **Batch-Verarbeitung**: Effiziente Übersetzung vieler Radikals

Die Tests zeigen, dass DeepL qualitativ hochwertige deutsche Übersetzungen für Wanikani-Radikals liefert.
