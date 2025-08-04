# Radical Information Tests

Diese Datei dokumentiert die Tests für das Lesen von Radical-Informationen aus der Wanikani API.

## ⚠️ WICHTIGER SICHERHEITSHINWEIS ⚠️

**Integration Tests sind standardmäßig DEAKTIVIERT (.skip) um Datenänderungen in Wanikani zu verhindern.**

Siehe [INTEGRATION_TEST_SAFETY.md](./INTEGRATION_TEST_SAFETY.md) für detaillierte Sicherheitsrichtlinien.

## Übersicht

Die Tests sind in zwei Kategorien unterteilt:

### 1. Unit Tests (`radicals.test.ts`)
- **Zweck**: Testen der Funktionslogik mit gemockten API-Antworten
- **Umfang**: 12 Tests für verschiedene Szenarien
- **Abhängigkeiten**: Keine echten API-Aufrufe
- **Ausführung**: `npm test -- --run src/lib/radicals.test.ts`

#### Getestete Funktionen:
- `getRadicals()` - Abrufen von Radical-Daten
- `getRadicalStudyMaterials()` - Abrufen von Lernmaterialien für Radicals

#### Test-Kategorien:
- **Grundfunktionalität**: Erfolgreiche API-Aufrufe mit verschiedenen Parametern
- **Fehlerbehandlung**: Netzwerkfehler, ungültige Tokens, Rate-Limiting
- **Datenvalidierung**: Strukturvalidierung von Radical- und StudyMaterial-Objekten
- **Progress Callbacks**: Fortschrittsberichterstattung während API-Aufrufen

### 2. Integration Tests (`radicals.integration.test.ts`)
- **Zweck**: Testen gegen die echte Wanikani API
- **Umfang**: 10 Tests mit maximal 10 Radicals pro Test
- **Abhängigkeiten**: Wanikani API Token erforderlich
- **Ausführung**: Automatisch übersprungen, wenn `WANIKANI_API_TOKEN` nicht gesetzt ist

#### Test-Kategorien:
- **API-Integration**: Echte API-Aufrufe mit Datenvalidierung
- **Rate-Limiting**: Überprüfung der API-Begrenzungen
- **Datenqualität**: Validierung der Struktur echter Wanikani-Daten
- **Korrelationsanalyse**: Verknüpfung von Radicals und Lernmaterialien

## Konfiguration

### Wanikani API Token (Optional)
Für die Ausführung der Integrationstests benötigen Sie einen Wanikani API Token:

1. Besuchen Sie: https://www.wanikani.com/settings/personal_access_tokens
2. Erstellen Sie einen neuen Token mit "subjects" und "study_materials" Berechtigung
3. Fügen Sie den Token zur `.env`-Datei hinzu:
   ```
   WANIKANI_API_TOKEN=ihr-api-token-hier
   ```

### Rate Limiting
Die Tests respektieren die Wanikani API-Limits:
- **Mindestzeit zwischen Aufrufen**: 1100ms
- **Maximale gleichzeitige Aufrufe**: 1
- **Testlimit**: Maximal 10 Radicals pro Integrationstest

## Ausführung

### Alle Radical-Tests ausführen:
```bash
npm test radicals
```

### Nur Unit Tests:
```bash
npm test -- --run src/lib/radicals.test.ts
```

### Nur Integration Tests:
```bash
npm test -- --run src/lib/radicals.integration.test.ts
```

### Mit API Token (Integration Tests aktiviert):
```bash
WANIKANI_API_TOKEN=your-token npm test -- --run src/lib/radicals.integration.test.ts
```

## Implementierungsstatus

### ✅ Abgeschlossen:
- Unit Test Framework mit vollständigen Mocks
- Integration Test Framework mit API-Validierung
- Fehlerbehandlungs-Tests
- Datenstruktur-Validierung
- Rate-Limiting Tests

### 🔄 Ausstehend:
- Implementierung der tatsächlichen `getRadicals()` Funktion
- Implementierung der tatsächlichen `getRadicalStudyMaterials()` Funktion
- Export der Funktionen aus `wanikani.ts`

## Test-Details

### Mock-Daten
Die Unit Tests verwenden realistische Mock-Daten, die der Wanikani API-Struktur entsprechen:

```typescript
// Beispiel eines Mock-Radicals
{
  object: "radical",
  id: 1,
  data: {
    characters: "一",
    slug: "ground",
    level: 1,
    meanings: [{ meaning: "Ground", primary: true }],
    // ... weitere Eigenschaften
  }
}
```

### API-Endpunkte
Die Tests simulieren Aufrufe an folgende Endpunkte:
- `GET /v2/subjects?types=radical` - Radical-Daten abrufen
- `GET /v2/study_materials?subject_types=radical` - Lernmaterialien abrufen

### Erwartete Funktionssignaturen
```typescript
getRadicals(
  token: string, 
  setProgress?: SetProgress, 
  options?: { levels?: string; limit?: number }
): Promise<WKRadical[]>

getRadicalStudyMaterials(
  token: string,
  setProgress?: SetProgress,
  options?: { subject_ids?: string; limit?: number }
): Promise<WKStudyMaterial[]>
```

## Nächste Schritte

1. **Funktionen implementieren**: Die tatsächlichen `getRadicals()` und `getRadicalStudyMaterials()` Funktionen in `wanikani.ts` implementieren
2. **Tests validieren**: Mit echtem API Token testen
3. **Performance optimieren**: Batch-Verarbeitung und Caching implementieren
4. **Integration**: In die bestehende DeepL-Pipeline integrieren

## Debugging

### Verbose Test Output:
```bash
npm test -- --run src/lib/radicals.integration.test.ts --reporter=verbose
```

### Test Coverage:
```bash
npm test -- --coverage src/lib/radicals.test.ts
```

### Skip Integration Tests:
Integration Tests werden automatisch übersprungen, wenn `WANIKANI_API_TOKEN` nicht gesetzt ist.
