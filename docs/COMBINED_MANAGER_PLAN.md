# 🎯 Combined Manager - Feature Plan

**Status**: Phase 1 Complete ✅ - Phase 2 In Progress 🔄
**Datum**: 27. Oktober 2025  
**Ziel**: Tab "Zusammen" für kombinierte Übersetzung von Radicals, Kanji und Vocabulary

---

## 📋 Überblick

Ein neuer Tab "Zusammen" ermöglicht die **gleichzeitige Übersetzung** von Radicals, Kanji und Vocabulary eines Levels (oder aller Levels) in einem einzigen Übersetzungslauf.

### Hauptfeatures

- ✅ Kombinierte Übersetzung aller drei Item-Typen
- ✅ Einheitliche UI wie bestehende Tabs
- ✅ Level-Auswahl (1-60 oder "Alle")
- ✅ Modus-Auswahl (smart-merge, replace, delete)
- ✅ Gemischte Preview (Radicals, Kanji, Vocabulary)
- ✅ Fortschrittsanzeige für alle Typen
- ✅ Ein API-Request statt drei

---

## 🔍 API-Verifikation (ABGESCHLOSSEN ✅)

### Test-Ergebnisse

**21/21 Tests bestehen:**
- ✅ 10/10 Integration Tests (echte API)
- ✅ 11/11 Mock Tests (Struktur-Validierung)

### Verifizierte API-Features

1. **Multi-Type Support** ✅
   - Ein Request für alle drei Typen
   - `GET /subjects?types=radical,kanji,vocabulary`

2. **Gemischte Reihenfolge** ✅
   - Items bereits gemischt (nicht gruppiert)
   - Keine zusätzliche Sortierung nötig

3. **Level-Filterung** ✅
   - Einzelnes Level: `&levels=1`
   - Mehrere Levels: `&levels=1,2,3`
   - Alle Levels: kein Level-Parameter

4. **Pagination** ✅
   - `next_url` für große Datenmengen
   - Keine ID-Duplikate zwischen Pages

5. **Response-Struktur** ✅
   ```typescript
   {
     object: "collection",
     total_count: 157,
     pages: { per_page: 1000, next_url: "..." },
     data: [
       { id: 1, object: "radical", data: {...} },
       { id: 440, object: "kanji", data: {...} },
       { id: 2467, object: "vocabulary", data: {...} }
     ]
   }
   ```

**Fazit**: WaniKani API bietet alle benötigten Features! 🚀

---

## 🎨 Design-Entscheidungen

### UI-Spezifikation

**Tab-Konfiguration:**
- Position: Rechts vom "Vocabulary" Tab
- Label: "Zusammen"
- Icon: 🎯 (Target - symbolisiert "alles auf einmal")
- Color Scheme: Purple/Violet 🟣 (Mischfarbe, noch nicht verwendet)

**Tailwind Colors:**
```typescript
{
  bg: 'bg-purple-50',
  border: 'border-purple-200',
  text: 'text-purple-700',
  button: 'bg-purple-600 hover:bg-purple-700',
  badge: 'bg-purple-100 text-purple-800'
}
```

### Preview Layout (Gemischt)

```
┌─────────────────────────────────────────┐
│ Zusammen (157 Items)                    │
├─────────────────────────────────────────┤
│ [R] 一 ground                           │  ← Radical Badge (grün)
│ [K] 日 sun, day                         │  ← Kanji Badge (orange)
│ [R] ハ fins                             │  ← Radical Badge (grün)
│ [V] 人 person                           │  ← Vocabulary Badge (blau)
│ [K] 月 moon, month                      │  ← Kanji Badge (orange)
│ [V] 一 one                              │  ← Vocabulary Badge (blau)
│ ... (6 weitere Items)                   │
├─────────────────────────────────────────┤
│ Weitere 12 Items anzeigen (145 verblei) │
│ Angezeigt: 12 von 157 geladenen Items   │
└─────────────────────────────────────────┘
```

**Type Badges:**
- `[R]` Radical: `bg-green-100 text-green-800`
- `[K]` Kanji: `bg-orange-100 text-orange-800`
- `[V]` Vocabulary: `bg-blue-100 text-blue-800`

### Processing (Gemischt/Parallel)

**Batch-basierte Verarbeitung:**
```
Batch 1: [R1, K1, V1, R2, K2, V2, ...] ← 10 Items gemischt
Batch 2: [V5, R4, V6, K4, V7, V8, ...] ← 10 Items gemischt
```

- Items werden **in der Reihenfolge wie sie von der API kommen** verarbeitet
- Batch Size: 10 (wie bisher)
- GenericStreamingProcessor verarbeitet gemischt

### Preview Settings

- **Initial Count**: 12 Items gemischt (Option B)
- **Load More**: +12 Items pro Klick
- **Level Selection**: Unabhängig von anderen Tabs

---

## 🏗️ Architektur

### Komponenten-Hierarchie

```
App.tsx
└─ Tabs
   ├─ Vocabulary Tab
   ├─ Kanji Tab
   ├─ Radicals Tab
   └─ Zusammen Tab (NEU)
      └─ CombinedManager
         ├─ BaseManager (wiederverwendet)
         │  ├─ TokenManagement
         │  ├─ LevelSelector
         │  ├─ CombinedPreview (NEU)
         │  └─ ProcessingControls
         └─ useCombinedManager Hook (NEU)
```

### Wiederverwendete Komponenten

Folgende Komponenten sind **bereits vorhanden** und werden wiederverwendet:

1. ✅ **BaseManager** (`src/shared/components/BaseManager.tsx`)
   - Generic Manager Component
   - Funktioniert mit Combined Items

2. ✅ **ProcessingControls** (`src/shared/components/processing/ProcessingControls.tsx`)
   - Bereits generisch
   - Kann "Items" als Typ verwenden

3. ✅ **GenericStreamingProcessor** (`src/shared/processing/GenericStreamingProcessor.ts`)
   - Kann alle drei Item-Typen verarbeiten
   - Bereits generisch implementiert

4. ✅ **LevelSelector** (`src/shared/components/LevelSelector.tsx`)
   - Direkt wiederverwendbar

5. ✅ **TokenManagement** (`src/shared/components/TokenManagement.tsx`)
   - Direkt wiederverwendbar

6. ✅ **Translation Services**
   - `RadicalTranslationService`
   - `KanjiTranslationService`
   - `VocabularyTranslationService`

---

## 📂 Dateistruktur

```
src/
├── features/
│   └── combined/                          # NEUES Feature
│       ├── components/
│       │   ├── CombinedManager.tsx       # Main Component
│       │   ├── CombinedPreview.tsx       # Preview Component
│       │   └── CombinedItemCard.tsx      # Item Card mit Type Badge
│       ├── hooks/
│       │   └── useCombinedManager.ts     # Hook (kombiniert andere Hooks)
│       ├── lib/
│       │   ├── combined-wanikani.ts      # API Service
│       │   ├── CombinedTranslationService.ts
│       │   ├── CombinedUploadService.ts
│       │   └── combined-streaming-integration.ts
│       └── types/
│           └── combined-types.ts          # CombinedItem, Type Guards
│
├── tests/
│   ├── unit/
│   │   ├── CombinedManager.test.tsx
│   │   ├── combined-streaming-integration.test.ts
│   │   └── CombinedTranslationService.test.ts
│   └── integration/
│       ├── wanikani-subjects-api.integration.test.ts  # ✅ ERSTELLT
│       ├── wanikani-subjects-api.mock.test.ts         # ✅ ERSTELLT
│       └── combined-flow.integration.test.ts          # TODO
│
├── App.tsx                                # Tab-Integration
└── docs/
    └── COMBINED_MANAGER_PLAN.md          # Diese Datei
```

---

## 💻 Implementierung

### Phase 1: Types & API Service (2-3h)

#### 1.1 Combined Types

```typescript
// src/features/combined/types/combined-types.ts

export type CombinedItemType = 'radical' | 'kanji' | 'vocabulary';

export interface CombinedItem {
  id: number;
  type: CombinedItemType;
  level: number;
  data: Radical | Kanji | Vocabulary;
}

// Type Guards
export function isRadical(item: CombinedItem): item is CombinedItem & { data: Radical } {
  return item.type === 'radical';
}

export function isKanji(item: CombinedItem): item is CombinedItem & { data: Kanji } {
  return item.type === 'kanji';
}

export function isVocabulary(item: CombinedItem): item is CombinedItem & { data: Vocabulary } {
  return item.type === 'vocabulary';
}
```

**Tests:**
- [ ] Type Guards funktionieren korrekt
- [ ] CombinedItem kann alle drei Typen halten

#### 1.2 WaniKani API Service

```typescript
// src/features/combined/lib/combined-wanikani.ts

export interface WaniKaniSubject {
  id: number;
  object: 'radical' | 'kanji' | 'vocabulary';
  url: string;
  data_updated_at: string;
  data: {
    level: number;
    characters: string | null;
    meanings: Array<{ meaning: string; primary: boolean }>;
    // ... weitere Type-spezifische Felder
  };
}

export async function fetchCombinedSubjects(
  apiToken: string,
  levels?: number[]
): Promise<WaniKaniSubject[]> {
  const params = new URLSearchParams({
    types: 'radical,kanji,vocabulary',
  });
  
  if (levels && levels.length > 0) {
    params.append('levels', levels.join(','));
  }
  
  const response = await fetch(
    `https://api.wanikani.com/v2/subjects?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Wanikani-Revision': '20170710'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`WaniKani API Error: ${response.status}`);
  }
  
  // Pagination handling
  let allSubjects: WaniKaniSubject[] = [];
  let data = await response.json();
  
  allSubjects.push(...data.data);
  
  while (data.pages.next_url) {
    const nextResponse = await fetch(data.pages.next_url, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Wanikani-Revision': '20170710'
      }
    });
    data = await nextResponse.json();
    allSubjects.push(...data.data);
  }
  
  return allSubjects;
}

// Converter: WaniKaniSubject → CombinedItem
export function convertToCombinedItems(
  subjects: WaniKaniSubject[]
): CombinedItem[] {
  return subjects.map(subject => ({
    id: subject.id,
    type: subject.object,
    level: subject.data.level,
    data: convertSubjectData(subject)
  }));
}
```

**Tests:**
- [ ] fetchCombinedSubjects lädt alle drei Typen
- [ ] Level-Filterung funktioniert
- [ ] Pagination wird korrekt verarbeitet
- [ ] Converter erstellt valide CombinedItems

#### 1.3 Combined Translation Service

```typescript
// src/features/combined/lib/CombinedTranslationService.ts

export class CombinedTranslationService {
  constructor(
    private radicalService: RadicalTranslationService,
    private kanjiService: KanjiTranslationService,
    private vocabularyService: VocabularyTranslationService
  ) {}

  async translate(
    item: CombinedItem,
    deeplToken: string,
    existingSynonyms: string[]
  ): Promise<string[]> {
    if (isRadical(item)) {
      return this.radicalService.translate(item.data, deeplToken, existingSynonyms);
    }
    if (isKanji(item)) {
      return this.kanjiService.translate(item.data, deeplToken, existingSynonyms);
    }
    if (isVocabulary(item)) {
      return this.vocabularyService.translate(item.data, deeplToken, existingSynonyms);
    }
    throw new Error(`Unknown item type: ${item.type}`);
  }
}
```

**Tests:**
- [ ] Delegiert korrekt an spezifische Services
- [ ] Type Guards funktionieren
- [ ] Error Handling für unbekannte Typen

#### 1.4 Combined Upload Service

```typescript
// src/features/combined/lib/CombinedUploadService.ts

export class CombinedUploadService {
  constructor(
    private waniKaniUploadService: WaniKaniUploadService
  ) {}

  async upload(
    item: CombinedItem,
    synonyms: string[],
    mode: SynonymMode
  ): Promise<void> {
    // Bestimme subject_type basierend auf item.type
    const subjectType = item.type;
    const subjectId = item.id;
    
    await this.waniKaniUploadService.updateStudyMaterial(
      subjectId,
      subjectType,
      synonyms,
      mode
    );
  }
}
```

**Tests:**
- [ ] Upload funktioniert für alle drei Typen
- [ ] subject_type wird korrekt gesetzt
- [ ] Synonym-Modi werden unterstützt

---

### Phase 2: Hook & Processing (3-4h)

#### 2.1 useCombinedManager Hook

```typescript
// src/features/combined/hooks/useCombinedManager.ts

export function useCombinedManager() {
  // State
  const [combinedItems, setCombinedItems] = useState<CombinedItem[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all');
  const [synonymMode, setSynonymMode] = useState<SynonymMode>('smart-merge');
  
  // Tokens
  const [apiToken, setApiToken] = useLocalStorage('waniKaniToken', '');
  const [deeplToken, setDeeplToken] = useLocalStorage('deeplToken', '');
  
  // Processing States
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Load combined items
  useEffect(() => {
    if (!apiToken) return;
    
    const loadItems = async () => {
      setIsLoading(true);
      try {
        const subjects = await fetchCombinedSubjects(
          apiToken,
          selectedLevel === 'all' ? undefined : [selectedLevel]
        );
        const items = convertToCombinedItems(subjects);
        setCombinedItems(items);
      } catch (error) {
        logger.error('Failed to load combined items', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadItems();
  }, [apiToken, selectedLevel]);
  
  // Processing
  const startProcessing = async () => {
    const processor = new GenericStreamingProcessor({
      items: combinedItems,
      translationService: new CombinedTranslationService(/*...*/),
      uploadService: new CombinedUploadService(/*...*/),
      // ...
    });
    await processor.process();
  };
  
  return {
    // Data
    combinedItems,
    totalCount: combinedItems.length,
    radicalCount: combinedItems.filter(isRadical).length,
    kanjiCount: combinedItems.filter(isKanji).length,
    vocabularyCount: combinedItems.filter(isVocabulary).length,
    
    // State
    selectedLevel,
    synonymMode,
    isLoading,
    isProcessing,
    progress,
    
    // Actions
    setSelectedLevel,
    setSynonymMode,
    startProcessing,
    // ...
  };
}
```

**Tests:**
- [ ] Lädt Items korrekt von API
- [ ] Level-Filterung funktioniert
- [ ] Zählt Items nach Typ korrekt
- [ ] Processing startet korrekt

#### 2.2 Combined Streaming Integration

```typescript
// src/features/combined/lib/combined-streaming-integration.ts

export async function processCombinedItems(
  items: CombinedItem[],
  options: ProcessingOptions
): Promise<ProcessingResult> {
  const processor = new GenericStreamingProcessor({
    items,
    translationService: new CombinedTranslationService(/*...*/),
    uploadService: new CombinedUploadService(/*...*/),
    batchSize: 10,
    onProgress: options.onProgress,
    onItemUpdated: options.onItemUpdated,
    onComplete: options.onComplete
  });
  
  return processor.process();
}
```

**Tests:**
- [ ] Verarbeitet alle drei Typen korrekt
- [ ] Progress Tracking funktioniert
- [ ] Callbacks werden aufgerufen
- [ ] Error Handling für alle Typen

---

### Phase 3: UI Components (3-4h)

#### 3.1 CombinedItemCard

```typescript
// src/features/combined/components/CombinedItemCard.tsx

interface CombinedItemCardProps {
  item: CombinedItem;
}

export function CombinedItemCard({ item }: CombinedItemCardProps) {
  // Type Badge
  const typeBadge = {
    radical: { label: 'R', color: 'bg-green-100 text-green-800' },
    kanji: { label: 'K', color: 'bg-orange-100 text-orange-800' },
    vocabulary: { label: 'V', color: 'bg-blue-100 text-blue-800' }
  }[item.type];
  
  return (
    <div className="p-4 border rounded-lg">
      <Badge className={typeBadge.color}>
        {typeBadge.label}
      </Badge>
      
      {/* Item-spezifische Anzeige */}
      {isRadical(item) && <RadicalDisplay data={item.data} />}
      {isKanji(item) && <KanjiDisplay data={item.data} />}
      {isVocabulary(item) && <VocabularyDisplay data={item.data} />}
    </div>
  );
}
```

**Tests:**
- [ ] Rendert alle drei Typen korrekt
- [ ] Type Badge hat korrekte Farbe
- [ ] Item-Daten werden angezeigt

#### 3.2 CombinedPreview

```typescript
// src/features/combined/components/CombinedPreview.tsx

export function CombinedPreview({
  items,
  displayedCount = 12,
  onLoadMore
}: CombinedPreviewProps) {
  const visibleItems = items.slice(0, displayedCount);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>🎯 Kombinierte Vorschau</CardTitle>
        <p className="text-sm text-gray-600">
          Zeigt {Math.min(displayedCount, items.length)} von {items.length} geladenen Items
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleItems.map(item => (
            <CombinedItemCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
        
        {onLoadMore && (
          <PreviewLoadMore
            displayedCount={displayedCount}
            loadedCount={items.length}
            totalCount={items.length}
            isLoading={false}
            onLoadMore={onLoadMore}
            itemType="Items"
          />
        )}
      </CardContent>
    </Card>
  );
}
```

**Tests:**
- [ ] Rendert gemischte Items
- [ ] Load More funktioniert
- [ ] Count-Anzeige korrekt

#### 3.3 CombinedManager

```typescript
// src/features/combined/components/CombinedManager.tsx

export function CombinedManager() {
  const manager = useCombinedManager();

  return (
    <BaseManager
      title="Kombinierte Übersetzung"
      subtitle="Übersetze Radicals, Kanji und Vocabulary gemeinsam"
      itemType="combined"
      itemTypeName="Items"
      spinnerColor="purple-600"
      
      // State
      selectedLevel={manager.selectedLevel}
      synonymMode={manager.synonymMode}
      onLevelChange={manager.setSelectedLevel}
      onSynonymModeChange={manager.setSynonymMode}
      
      // Tokens
      apiToken={manager.apiToken}
      deeplToken={manager.deeplToken}
      onApiTokenChange={manager.setApiToken}
      onDeeplTokenChange={manager.setDeeplToken}
      apiError={manager.apiError}
      
      // Data
      items={manager.combinedItems}
      
      // States
      isLoading={manager.isLoading}
      isProcessing={manager.isProcessing}
      progress={manager.progress}
      
      // Streaming
      streamingPhases={manager.streamingPhases}
      streamingResult={manager.streamingResult}
      errorItems={manager.errorItems}
      
      // Actions
      onStartProcessing={manager.startProcessing}
      onStopProcessing={manager.stopProcessing}
      onClearResults={manager.clearResults}
      onClearErrors={manager.clearErrors}
      
      // Preview
      previewComponent={
        <CombinedPreview
          items={manager.combinedItems}
          displayedCount={manager.displayedPreviewCount}
          onLoadMore={manager.loadMorePreview}
        />
      }
    />
  );
}
```

**Tests:**
- [ ] Rendert korrekt
- [ ] BaseManager Integration funktioniert
- [ ] Alle Props werden korrekt übergeben

---

### Phase 4: Tab Integration (1h)

#### 4.1 App.tsx Update

```typescript
// src/App.tsx

const tabs = [
  {
    value: "vocabulary",
    label: "Vocabulary",
    icon: "📚",
    component: VocabularyManagerRefactored
  },
  {
    value: "kanji",
    label: "Kanji",
    icon: "🈯",
    component: KanjiManagerRefactored
  },
  {
    value: "radicals",
    label: "Radicals",
    icon: "⚛️",
    component: RadicalsManagerRefactored
  },
  {
    value: "combined",  // NEU
    label: "Zusammen",
    icon: "🎯",
    component: CombinedManager,
    colorScheme: "purple"
  }
];
```

**Tests:**
- [ ] Tab wird angezeigt
- [ ] Navigation funktioniert
- [ ] Component wird geladen

---

### Phase 5: End-to-End Tests (1h)

#### 5.1 Combined Flow Integration Test

```typescript
// src/tests/integration/combined-flow.integration.test.ts

describe('Combined Flow Integration', () => {
  it('sollte alle drei Item-Typen erfolgreich verarbeiten', async () => {
    // Setup
    const items = createMixedItems();
    
    // Process
    const result = await processCombinedItems(items, options);
    
    // Verify
    expect(result.stats.successful).toBe(items.length);
    expect(result.stats.failed).toBe(0);
    
    // Verify alle drei Typen wurden verarbeitet
    const processedRadicals = items.filter(isRadical);
    const processedKanji = items.filter(isKanji);
    const processedVocabulary = items.filter(isVocabulary);
    
    expect(processedRadicals.length).toBeGreaterThan(0);
    expect(processedKanji.length).toBeGreaterThan(0);
    expect(processedVocabulary.length).toBeGreaterThan(0);
  });
});
```

---

## 📊 Geschätzter Aufwand

| Phase | Aufwand | Status |
|-------|---------|--------|
| **API-Verifikation** | 2h | ✅ COMPLETE |
| **Phase 1: Types & API** | 2-3h | 🔜 NEXT |
| **Phase 2: Hook & Processing** | 3-4h | ⏳ Pending |
| **Phase 3: UI Components** | 3-4h | ⏳ Pending |
| **Phase 4: Tab Integration** | 1h | ⏳ Pending |
| **Phase 5: E2E Tests** | 1h | ⏳ Pending |
| **GESAMT** | **12-15h** | **2h / 15h** |

---

## ✅ Definition of Done

- [ ] Alle Unit Tests passing (>80% Coverage)
- [ ] Alle Integration Tests passing
- [ ] 0 TypeScript Errors
- [ ] 0 ESLint Warnings
- [ ] Dokumentation aktualisiert
- [ ] Tab "Zusammen" funktional im Browser
- [ ] Kann alle drei Item-Typen erfolgreich übersetzen
- [ ] Error Handling für alle drei Typen
- [ ] UI konsistent mit bestehenden Tabs
- [ ] Performance: Keine spürbaren Lags
- [ ] Code Review abgeschlossen

---

## 🚀 Nächste Schritte

### Morgen starten mit:

1. **Phase 1.1**: Combined Types erstellen
   - Datei: `src/features/combined/types/combined-types.ts`
   - Tests: Type Guards validieren
   - Dauer: ~30 min

2. **Phase 1.2**: WaniKani API Service
   - Datei: `src/features/combined/lib/combined-wanikani.ts`
   - Implementiere `fetchCombinedSubjects()`
   - Tests: API-Calls und Pagination
   - Dauer: ~2h

3. **Phase 1.3**: Combined Translation Service
   - Datei: `src/features/combined/lib/CombinedTranslationService.ts`
   - Delegiert an bestehende Services
   - Tests: Delegation funktioniert
   - Dauer: ~1h

### Checkliste für Start:

- [x] API-Verifikation abgeschlossen
- [x] Dokumentation erstellt
- [x] Design-Entscheidungen getroffen
- [x] Test-Files vorhanden
- [ ] Feature-Branch erstellen: `feature/combined-manager`
- [ ] Erste Commit mit Types

---

## 📚 Referenzen

### Test-Files (Erstellt)

- ✅ `src/tests/integration/wanikani-subjects-api.integration.test.ts`
- ✅ `src/tests/integration/wanikani-subjects-api.mock.test.ts`

### Existierende Code-Referenzen

- `src/shared/components/BaseManager.tsx` - Manager Template
- `src/shared/processing/GenericStreamingProcessor.ts` - Processing Engine
- `src/features/vocabulary/hooks/useVocabularyManager.ts` - Hook Beispiel
- `src/features/vocabulary/components/VocabularyManagerRefactored.tsx` - Component Beispiel

### WaniKani API Dokumentation

- Endpoint: `https://api.wanikani.com/v2/subjects`
- Docs: https://docs.api.wanikani.com/20170710/#subjects
- Revision: `20170710`

---

**Erstellt am**: 26. Oktober 2025  
**Letzte Aktualisierung**: 26. Oktober 2025  
**Status**: ✅ Ready for Implementation
