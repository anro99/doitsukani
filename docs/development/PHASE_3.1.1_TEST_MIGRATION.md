# Phase 3.1.1: Vocabulary Test-Migration (TDD-Debt Resolution)

**Status:** 🚧 In Arbeit  
**Dauer:** 2-3 Stunden  
**Priorität:** 🔴 HÖCHSTE  
**Datum:** 19. Oktober 2025

---

## 🎯 Ziel

30 Tests mit `.skip` auf neue Service-Mocks umstellen, um TDD-Konformität wiederherzustellen.

---

## ❌ Problem

Nach Phase 3.1 (Vocabulary Migration) wurden 30 Tests mit `.skip` markiert, weil sie die **alte API** mocken:

```typescript
// ❌ ALTE MOCKS (funktionieren nicht mehr)
vi.mock('../../features/vocabulary/lib/vocabulary-translation', () => ({
    translateVocabularyMeanings: vi.fn()  // Alte Funktion
}));

vi.mock('../../features/vocabulary/lib/vocabulary-wanikani-upload', () => ({
    uploadVocabularyBatch: vi.fn()  // Alte Funktion
}));
```

Der neue Code verwendet aber **Services**:
```typescript
// ✅ NEUE ARCHITEKTUR
const translationService = new VocabularyTranslationService(deeplToken, options);
const uploadService = new WaniKaniUploadService(apiToken);
```

**Konsequenz:**
- ❌ 30 Tests deaktiviert (.skip)
- ❌ Keine Validierung der Vocabulary-Migration
- ❌ Verstoß gegen TDD-Prinzipien
- ❌ Keine Regression-Sicherheit

---

## ✅ Lösung

Tests auf **Service-Mocks** umstellen:

```typescript
// ✅ NEUE MOCKS (Service-basiert)
import { VocabularyTranslationService } from '../../features/vocabulary/lib/VocabularyTranslationService';
import { WaniKaniUploadService } from '../../../shared/processing/services/WaniKaniUploadService';

vi.mock('../../features/vocabulary/lib/VocabularyTranslationService');
vi.mock('../../../shared/processing/services/WaniKaniUploadService');

// In beforeEach:
vi.mocked(VocabularyTranslationService).mockImplementation(() => ({
    name: 'Vocabulary',
    translate: vi.fn().mockResolvedValue(['Hund', 'Tier']),
    translateBatch: vi.fn()
}));

vi.mocked(WaniKaniUploadService).mockImplementation(() => ({
    name: 'WaniKani',
    upload: vi.fn().mockResolvedValue(true),
    uploadBatch: vi.fn().mockResolvedValue([true, true, true])
}));
```

---

## 📋 Betroffene Test-Dateien

### 1. vocabulary-streaming-integration.test.ts (10 Tests)

**Pfad:** `src/tests/unit/vocabulary-streaming-integration.test.ts`  
**Tests:** 10 mit `.skip`

**Was getestet wird:**
- ✅ Erfolgreiche Übersetzung + Upload
- ✅ Error Handling bei Translation-Fehlern
- ✅ Error Handling bei Upload-Fehlern
- ✅ Progress-Tracking (3 Phasen)
- ✅ Stop-Funktionalität
- ✅ Streaming vs Batch Kompatibilität

**Zu ändern:**
- Mock `translateVocabularyMeanings` → Mock `VocabularyTranslationService.translate()`
- Mock `uploadVocabularyBatch` → Mock `WaniKaniUploadService.upload()`

---

### 2. vocabulary-streaming-integration.callbacks.test.ts (8 Tests)

**Pfad:** `src/tests/unit/vocabulary-streaming-integration.callbacks.test.ts`  
**Tests:** 8 mit `.skip`

**Was getestet wird:**
- ✅ onItemProcessing Callback
- ✅ onItemUpdated Callback (Live-Preview-Updates!)
- ✅ onItemError Callback
- ✅ onProgress Callback
- ✅ Callback-Fehlerbehandlung

**Zu ändern:**
- Mock `translateVocabularyMeanings` → Mock `VocabularyTranslationService.translate()`
- Mock `uploadVocabularyBatch` → Mock `WaniKaniUploadService.upload()`
- Wrapper-Service berücksichtigen (wrappedUploadService ruft onItemUpdated auf)

---

### 3. delete-mode-no-translation.test.ts (6 Tests)

**Pfad:** `src/tests/unit/delete-mode-no-translation.test.ts`  
**Tests:** 6 mit `.skip`

**Was getestet wird:**
- ✅ DELETE Mode überspringt Translation
- ✅ Direct Upload mit leeren Synonymen
- ✅ Keine DeepL-Calls im DELETE Mode
- ✅ WaniKani Upload wird trotzdem aufgerufen

**Zu ändern:**
- Mock `VocabularyTranslationService` mit `synonymMode: 'delete'`
- Verify: `translate()` wird NICHT aufgerufen
- Verify: `upload()` wird mit `[]` aufgerufen

---

### 4. migration-test.test.ts (2 Tests)

**Pfad:** `src/tests/integration/migration-test.test.ts`  
**Tests:** 2 mit `.skip`

**Was getestet wird:**
- ✅ Legacy `uploadVocabularyBatch` API wird aufgerufen
- ✅ Batch vs Streaming Kompatibilität

**Entscheidung:**
- **Option A:** Auf neue Services umstellen
- **Option B:** Als LEGACY-Tests markieren und später löschen

**Empfehlung:** Option B - Diese Tests validieren alte API, die wir nicht mehr brauchen.

---

## 🔨 Implementierung

### Task 1: vocabulary-streaming-integration.test.ts

```typescript
// src/tests/unit/vocabulary-streaming-integration.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processVocabularyStreaming } from '../../features/vocabulary/lib/vocabulary-streaming-integration';
import { VocabularyTranslationService } from '../../features/vocabulary/lib/VocabularyTranslationService';
import { WaniKaniUploadService } from '../../../shared/processing/services/WaniKaniUploadService';

// Mock Services
vi.mock('../../features/vocabulary/lib/VocabularyTranslationService');
vi.mock('../../../shared/processing/services/WaniKaniUploadService');

describe('processVocabularyStreaming (Service-based)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mock VocabularyTranslationService
        vi.mocked(VocabularyTranslationService).mockImplementation(() => ({
            name: 'Vocabulary',
            translate: vi.fn().mockResolvedValue(['Katze', 'Tier']),
            translateBatch: vi.fn()
        }));
        
        // Mock WaniKaniUploadService
        vi.mocked(WaniKaniUploadService).mockImplementation(() => ({
            name: 'WaniKani',
            upload: vi.fn().mockResolvedValue(true),
            uploadBatch: vi.fn().mockResolvedValue([true])
        }));
    });
    
    it('sollte items erfolgreich übersetzen und hochladen', async () => {
        // Test implementation...
    });
    
    // Weitere Tests...
});
```

---

### Task 2: callbacks.test.ts

**Spezial-Fall:** Wrapper-Service berücksichtigen!

```typescript
// Der Wrapper-Service in vocabulary-streaming-integration.ts ruft onItemUpdated auf:
const wrappedUploadService: UploadService = {
    upload: async (itemId: number, synonyms: string[]) => {
        const success = await uploadService.upload(itemId, synonyms);
        
        // ⚠️ WICHTIG: Dieser Callback muss im Test validiert werden!
        if (success && options.onItemUpdated) {
            options.onItemUpdated(originalItem, { ... });
        }
        
        return success;
    }
};
```

**Test-Strategie:**
- Mock `WaniKaniUploadService.upload()` → return `true`
- Verify: `onItemUpdated` wird aufgerufen
- Verify: Parameter sind korrekt

---

### Task 3: delete-mode-no-translation.test.ts

```typescript
describe('DELETE Mode', () => {
    beforeEach(() => {
        // Mock mit DELETE Mode
        vi.mocked(VocabularyTranslationService).mockImplementation(() => ({
            name: 'Vocabulary',
            translate: vi.fn().mockResolvedValue([]), // DELETE returns []
            translateBatch: vi.fn()
        }));
    });
    
    it('sollte keine Translation aufrufen', async () => {
        const result = await processVocabularyStreaming(items, {
            ...options,
            synonymMode: 'delete'
        });
        
        // Verify: translate() wurde NICHT aufgerufen (DELETE Mode)
        const mockTranslate = vi.mocked(VocabularyTranslationService).mock.results[0].value.translate;
        expect(mockTranslate).not.toHaveBeenCalled();
        
        // Verify: upload() wurde mit [] aufgerufen
        const mockUpload = vi.mocked(WaniKaniUploadService).mock.results[0].value.upload;
        expect(mockUpload).toHaveBeenCalledWith(expect.any(Number), []);
    });
});
```

---

### Task 4: migration-test.test.ts

**Entscheidung:** Als LEGACY markieren

```typescript
// src/tests/integration/migration-test.test.ts

describe('Legacy API Compatibility', () => {
    // TODO: Diese Tests validieren alte API (uploadVocabularyBatch)
    // Nach Phase 3.4 (Cleanup) können sie gelöscht werden
    
    test.skip('streaming integration should use uploadVocabularyBatch', async () => {
        // LEGACY: Dieser Test ist nicht mehr relevant
        // Die neue Architektur verwendet WaniKaniUploadService.upload()
    });
});
```

---

## ✅ Erfolgskriterien

### Before (Aktuell)
```bash
npm run test:unit
# 520 passing ✅
# 30 skipped ⚠️  ← TDD-Debt!
# 8 skipped (pause/resume) ✅
```

### After (Ziel)
```bash
npm run test:unit
# 550 passing ✅
# 8 skipped (nur pause/resume) ✅
# 0 vocabulary tests skipped ✅
```

### Commits
```bash
git commit -m "test: Migrate vocabulary-streaming-integration.test.ts to Service mocks"
git commit -m "test: Migrate callbacks.test.ts to Service mocks"
git commit -m "test: Migrate delete-mode-no-translation.test.ts to Service mocks"
git commit -m "test: Mark migration-test.test.ts as LEGACY"
git commit -m "docs: Phase 3.1.1 complete - TDD-debt resolved (0 vocabulary .skip)"
```

---

## 🚀 Next Steps

Nach erfolgreichem Abschluss von Phase 3.1.1:

1. ✅ **Validierung:** Alle Tests grün
2. ✅ **TDD-Konformität:** Wiederhergestellt
3. 🚀 **Phase 3.2:** Kanji Migration (mit funktionierenden Tests!)
4. 🚀 **Phase 3.3:** Radicals Migration (mit funktionierenden Tests!)

**Keine weiteren .skip Tests erlaubt!** 🎯

---

## 📊 Tracking

- [ ] Task 1: vocabulary-streaming-integration.test.ts (10 Tests)
- [ ] Task 2: callbacks.test.ts (8 Tests)
- [ ] Task 3: delete-mode-no-translation.test.ts (6 Tests)
- [ ] Task 4: migration-test.test.ts (2 Tests - LEGACY)
- [ ] Alle Tests grün (550+ passing)
- [ ] Commit & Documentation

**Start:** 19. Oktober 2025  
**Ende:** TBD  
**Status:** 🚧 IN ARBEIT
