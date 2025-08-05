# Integration Test Safety Guide

## ⚠️ CRITICAL SAFETY WARNING ⚠️

**Integration Tests dürfen NIEMALS Daten in Wanikani ändern!**

### VERBOTENE Operationen

Diese Funktionen dürfen **NIEMALS** in Integration Tests aufgerufen werden:

```typescript
// ❌ VERBOTEN - Erstellt neue Study Materials
createSynonyms(token, limiter, material)

// ❌ VERBOTEN - Ändert bestehende Study Materials  
updateSynonyms(token, limiter, material)

// ❌ VERBOTEN - Alle HTTP Write Operations
axios.post(...)
axios.put(...)
axios.delete(...)
axios.patch(...)
```

### ERLAUBTE Operationen

Integration Tests dürfen nur diese READ-ONLY Operationen verwenden:

```typescript
// ✅ ERLAUBT - Liest Radical Daten
GET /v2/subjects?types=radical

// ✅ ERLAUBT - Liest Study Material Daten
GET /v2/study_materials?subject_types=radical

// ✅ ERLAUBT - Alle HTTP Read Operations
axios.get(...)
```

## Sicherheitsmaßnahmen

### 1. Test Limits
- **Maximum 10 Items** pro Integration Test
- Respektiert API Rate Limits (1100ms zwischen Aufrufen)
- Verhindert übermäßige API-Nutzung

### 2. Explicit Skipping
Alle Integration Tests sind standardmäßig übersprungen und laufen nur bei explizitem API Token:

```typescript
// Tests werden nur ausgeführt wenn WANIKANI_API_TOKEN gesetzt ist
it.skip("test name", async () => {
  if (!apiToken) return; // Zusätzliche Sicherheit
  // ... test code
});
```

### 3. Code Review Checkpoints

**Vor jedem Commit prüfen:**

1. Keine `createSynonyms` oder `updateSynonyms` Aufrufe
2. Keine `axios.post/put/delete/patch` Operationen
3. Alle Tests haben `.skip` oder entsprechende Sicherheitschecks
4. Maximum 10 Items pro Test eingehalten

### 4. Lokale Test-Ausführung

**Sicher testen ohne API Token:**
```bash
# Tests laufen durch, werden aber übersprungen
npm test -- --run src/lib/radicals.integration.test.ts
```

**Mit API Token (nur für Entwicklung):**
```bash
# Nur für erfahrene Entwickler mit eigenem Test-Account
WANIKANI_API_TOKEN=your-token npm test -- --run src/lib/radicals.integration.test.ts
```

## Was passiert bei Verletzung?

**Wenn Write-Operationen in Integration Tests verwendet werden:**

1. ⚠️ **Daten werden in Wanikani erstellt/geändert**
2. ⚠️ **Benutzer-Account wird kontaminiert**
3. ⚠️ **Study Materials werden dauerhaft geändert**
4. ⚠️ **Lernfortschritt kann gestört werden**

## Implementierungs-Richtlinien

### Für neue Tests:

```typescript
describe("My Integration Test", () => {
  it.skip("should only read data", async () => {
    if (!apiToken) return; // Failsafe
    
    // ✅ NUR GET Operationen
    const data = await getRadicals(apiToken, undefined, { limit: 10 });
    
    // ✅ NUR Assertions über gelesene Daten
    expect(data).toBeDefined();
    
    // ❌ NIEMALS Daten ändern
    // await createSynonyms(...) // VERBOTEN!
  });
});
```

### Für Funktionsimplementierung:

```typescript
// Sichere Implementierung
export const getRadicals = async (token: string, options?: any): Promise<WKRadical[]> => {
  // ✅ NUR GET Request
  const response = await axios.get(`/v2/subjects?types=radical`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  // ✅ NUR Daten zurückgeben, niemals ändern
  return response.data.data;
};
```

## Checkliste vor Commit

- [ ] Keine `createSynonyms` Aufrufe in Tests
- [ ] Keine `updateSynonyms` Aufrufe in Tests  
- [ ] Keine `axios.post/put/delete/patch` in Tests
- [ ] Alle Integration Tests haben `.skip`
- [ ] Maximum 10 Items pro Test
- [ ] API Token Check: `if (!apiToken) return;`
- [ ] READ-ONLY Kommentare in kritischen Bereichen

## Notfall-Kontakt

Falls versehentlich Daten in Wanikani geändert wurden:
1. Sofort den betroffenen Test deaktivieren
2. Issue im Repository erstellen
3. Wanikani Support kontaktieren falls nötig

**Remember: Integration Tests sind für Datenverifikation, nicht für Datenmanipulation!**
