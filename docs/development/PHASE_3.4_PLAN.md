# Phase 3.4 Cleanup Plan: Conservative Approach

**Datum**: 25. Oktober 2025  
**Geschätzter Aufwand**: 1-2 Stunden  
**Prinzip**: Nur eindeutig tote Dateien löschen, Rest in Phase 5

## Analyse-Ergebnisse

### Vocabulary Legacy-Dateien

| Datei | Status | Verwendung | Aktion |
|-------|--------|------------|--------|
| `vocabulary-batch-processing.ts` | ❓ Unklar | Nur von eigenem Test | DELETE + Test |
| `vocabulary-integration.ts` | ✅ Aktiv | Types von useVocabularyManager | KEEP |
| `vocabulary-translation.ts` | ✅ Aktiv | VocabularyItem Type | KEEP |
| `vocabulary-wanikani-upload.ts` | ✅ Aktiv | Tests + alte Functions | KEEP |
| `debug-vocabulary-processing.ts` | ❓ Unklar | TBD | PRÜFEN |
| `vocabulary-translation-merger.ts` | ✅ Aktiv | Streaming verwendet | KEEP |

### Kanji/Radicals
- ✅ **Kanji**: Bereits clean (nur streaming files)
- ✅ **Radicals**: Bereits clean (nur streaming files)

## Phase 3.4 Scope

### Option A: Conservative (1h)
✅ **Empfohlen** - Nur garantiert tote Dateien löschen:
1. Prüfe `vocabulary-batch-processing.ts` Verwendung
2. Falls nur Test: Lösche beide
3. Prüfe `debug-vocabulary-processing.ts`
4. Dokumentiere Rest als "Mixed Legacy/Streaming"

### Option B: Aggressive (3-4h)
⚠️ **Zu umfangreich für Phase 3.4**:
1. Migriere Types aus `vocabulary-integration.ts` → `vocabulary-streaming-integration.ts`
2. Update useVocabularyManager imports
3. Migriere Test-Dependencies von `vocabulary-wanikani-upload.ts`
4. Lösche alle Legacy-Dateien

**Entscheidung**: Option A (Conservative)  
**Begründung**: Phase 5 ist für Hook-Refactoring vorgesehen - dort können wir sauberer aufräumen

## Aktionsplan (Option A)

### Task 1: Analyse vocabulary-batch-processing.ts (10min)
```bash
grep -r "vocabulary-batch-processing" src/ --exclude-dir=node_modules
```
- [ ] Check: Wird es außer von Test verwendet?
- [ ] Entscheidung: DELETE oder KEEP

### Task 2: Analyse debug-vocabulary-processing.ts (5min)
```bash
grep -r "debug-vocabulary-processing" src/ --exclude-dir=node_modules
```
- [ ] Check: Wird es irgendwo importiert?
- [ ] Entscheidung: DELETE oder KEEP

### Task 3: Deletion (5min)
Falls beide tot:
```bash
rm src/features/vocabulary/lib/vocabulary-batch-processing.ts
rm src/features/vocabulary/lib/debug-vocabulary-processing.ts
rm src/tests/unit/vocabulary-batch-processing.test.ts
```

### Task 4: Test Suite (10min)
```bash
npm run test:unit
npm run test:integration
```
Verify: Keine Regressionen

### Task 5: Documentation (20min)
- Update ARCHITECTURE.md (remove legacy markers)
- Create PHASE_3.4_COMPLETION.md
- Update REFACTORING_PLAN.md

### Task 6: Commit (5min)
```bash
git add -A
git commit -m "chore(cleanup): Remove dead code (Phase 3.4)

- Deleted vocabulary-batch-processing.ts + test
- Deleted debug-vocabulary-processing.ts  
- Total: -XXX lines of dead code

Note: Mixed Legacy/Streaming code preserved for Phase 5
Remaining: vocabulary-integration.ts still used for Types"
```

## Deferred to Phase 5

**Type Migrations**:
- Move types from `vocabulary-integration.ts` to streaming
- Clean separation of Legacy vs Streaming

**Test Migrations**:
- Update tests to use WaniKaniUploadService
- Remove dependencies on `vocabulary-wanikani-upload.ts`

**Hook Refactoring**:
- Cleaner imports in useVocabularyManager
- Remove all Legacy dependencies

## Entscheidung

✅ **Starte mit Option A (Conservative)**  
Zeitaufwand: ~1 Stunde  
Risiko: Niedrig  
Nutzen: Dokumentierter Stand, keine Breaking Changes
