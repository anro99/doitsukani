# Integration Tests

Diese Verzeichnisse enthalten die Integrationstests für das Doitsukani-Projekt.

## 📋 **Übersicht**

### 🧪 **Test-Dateien:**
- `deepl.integration.test.ts` - DeepL API Integrationstests
- `radicals.integration.test.ts` - Wanikani Radicals API Tests (SAFE Mode)
- `delete-mode.integration.test.ts` - DELETE-Mode Tests

### 📚 **Dokumentation:**
- `deepl.README.md` - DeepL Integration Setup und Anweisungen
- `radicals.README.md` - Radicals Test-Setup mit Sicherheitsrichtlinien  
- `delete-mode.README.md` - DELETE-Mode Test Dokumentation
- `SAFETY.md` - Allgemeine Sicherheitsrichtlinien für Integration Tests
- `IMPLEMENTATION_SUMMARY.md` - Zusammenfassung der Implementierung

## 🚀 **Ausführung:**

### **Alle Integration Tests:**
```bash
npm run test:integration
```

### **Einzelne Test-Suites:**
```bash
# DeepL Tests (benötigt DEEPL_API_KEY)
npm run test:integration -- deepl.integration.test.ts

# Radicals Tests (benötigt WANIKANI_API_TOKEN für vollständige Tests)
npm run test:integration -- radicals.integration.test.ts

# DELETE-Mode Tests
npm run test:integration -- delete-mode.integration.test.ts
```

## ⚠️ **Sicherheitshinweise:**

- **DeepL Tests**: Benötigen gültigen API-Key, verwenden echte API-Calls
- **Radicals Tests**: Verwenden nur sichere "Test-Radicals" (Rice, Spikes, Umbrella)
- **DELETE-Mode Tests**: Sichere Tests ohne echte Datenänderungen

Siehe `SAFETY.md` für detaillierte Sicherheitsrichtlinien.
