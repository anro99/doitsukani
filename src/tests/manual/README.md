# Manual Tests für DeepL API

Dieses Verzeichnis enthält manuelle Test-Skripte für die DeepL API Integration.

## 📁 Dateien

### `test-deepl.js`
- **Zweck**: Grundlegende DeepL API Tests
- **Tests**: Basis-Übersetzung, Japanisch→Deutsch, Batch-Übersetzung
- **Verwendung**: `node src/tests/manual/test-deepl.js`

### `test-bamboo-loiter.js` 
- **Zweck**: Test der Groß-/Kleinschreibung-Problematik
- **Tests**: Spezifische problematische Wörter (Bamboo, Loiter, etc.)
- **Verwendung**: `node src/tests/manual/test-bamboo-loiter.js`

### `test-internal-deepl.js`
- **Zweck**: Test der internen translateText-Funktion
- **Tests**: Direkte Verwendung der doitsukani DeepL-Wrapper-Funktion  
- **Besonderheit**: Setzt `NODE_ENV=test` für direkte API-Aufrufe
- **Verwendung**: `npx tsx src/tests/manual/test-internal-deepl.js`

## 🔧 Voraussetzungen

1. **DeepL API Key**: Muss in `.env` konfiguriert sein
   ```env
   DEEPL_API_KEY=dein_api_key_hier
   DEEPL_PRO=false  # oder true für Pro-Account
   ```

2. **Node.js Dependencies**: Alle Abhängigkeiten installiert via `npm install`

## 🎯 Verwendungszweck

Diese Tests sind für **manuelle Validierung** der DeepL API Integration gedacht:

- ✅ **Debugging**: Problem-Diagnose bei fehlgeschlagenen Übersetzungen
- ✅ **Entwicklung**: Testen neuer Features oder Änderungen  
- ✅ **Verifikation**: Bestätigung dass API-Keys funktionieren
- ✅ **Rate Limiting**: Prüfung der API-Limits und -Performance

## ⚠️ Wichtige Hinweise

- **API-Kosten**: Jeder Test verbraucht API-Quota
- **Rate Limits**: Tests warten zwischen Anfragen (1+ Sekunden)
- **Netzwerk**: Benötigen Internet-Verbindung zur DeepL API

## 🚀 Automatisierte Tests

Für automatisierte Tests ohne API-Verbrauch siehe:
- `../unit/deepl.test.ts` - Mock-basierte Unit Tests
- `../integration/deepl.integration.test.ts` - Echte API Integration Tests
