# Doitsukani Architecture Documentation

**Version**: 2.0  
**Last Updated**: October 26, 2025  
**Status**: Current Implementation (Streaming Architecture Complete)

> **Hinweis**: Für einen Schnelleinstieg siehe [CURRENT_STATE.md](./CURRENT_STATE.md)  
> Diese Datei enthält die detaillierte technische Architektur-Dokumentation.

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Feature-Based Structure](#feature-based-structure)
4. [Processing Models](#processing-models)
5. [Service Layer](#service-layer)
6. [State Management](#state-management)
7. [Data Flow](#data-flow)
8. [Testing Strategy](#testing-strategy)
9. [Performance Considerations](#performance-considerations)
10. [Completed Refactoring](#completed-refactoring-october-2025)
11. [Appendix](#appendix)

---

## Overview

### Purpose
Doitsukani is a React-based web application that automatically translates WaniKani study materials (Vocabulary, Kanji, Radicals) from English to German using DeepL API and optionally EDICT2/Wadoku dictionary.

### Key Principles
- **Feature-Based Architecture**: Code organized by domain (vocabulary, kanji, radicals)
- **Type Safety**: Full TypeScript with strict mode
- **Test-Driven**: 553 tests (469 unit + 84 integration)
- **API-First**: WaniKani API v2 + DeepL API v2
- **Progressive Enhancement**: Works with/without DeepL key

### Technology Stack
```
Frontend:     React 18.3 + TypeScript 5.6 + Vite 7.1
UI:           TailwindCSS 3.4 + shadcn/ui
Testing:      Vitest 3.2 + @testing-library/react
APIs:         WaniKani v2 + DeepL v2 + EDICT2 Dictionary
Build:        ESBuild + PostCSS
```

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (SPA)                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Vocabulary  │  │    Kanji     │  │   Radicals   │          │
│  │   Manager    │  │   Manager    │  │   Manager    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
│  ┌─────────────────────────▼──────────────────────────┐         │
│  │           Shared Services Layer                    │         │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │         │
│  │  │   WaniKani   │  │    DeepL     │  │ Storage  │ │         │
│  │  │   API Client │  │  API Client  │  │ Manager  │ │         │
│  │  └──────────────┘  └──────────────┘  └──────────┘ │         │
│  └───────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
    ┌─────▼─────┐    ┌─────▼─────┐    ┌─────▼─────┐
    │ WaniKani  │    │   DeepL   │    │  Browser  │
    │    API    │    │    API    │    │  Storage  │
    └───────────┘    └───────────┘    └───────────┘
```

### Component Hierarchy

```
App.tsx
├── TokenManagement.tsx (WaniKani + DeepL Tokens)
├── LevelSelector.tsx (Level Range Selection)
└── Feature Tabs
    ├── VocabularyManagerRefactored.tsx
    │   └── ProcessingControls.tsx (3-Phase Progress)
    ├── KanjiManagerRefactored.tsx
    │   └── ProcessingControls.tsx (Single Progress)
    └── RadicalsManagerRefactored.tsx
        └── ProcessingControls.tsx (Single Progress)
```

---

## Feature-Based Structure

### Directory Layout

```
src/
├── features/                    # Feature-specific code
│   ├── vocabulary/
│   │   ├── components/
│   │   │   ├── VocabularyManagerRefactored.tsx
│   │   │   └── ProcessingControls.tsx
│   │   ├── hooks/
│   │   │   └── useVocabularyManager.ts    (511 lines)
│   │   ├── lib/
│   │   │   ├── vocabulary-streaming-integration.ts
│   │   │   └── vocabulary-batch-processing.ts (legacy)
│   │   └── types/
│   │       └── vocabulary.types.ts
│   │
│   ├── kanji/
│   │   ├── components/
│   │   │   ├── KanjiManagerRefactored.tsx
│   │   │   └── ProcessingControls.tsx
│   │   ├── hooks/
│   │   │   └── useKanjiManager.ts         (975 lines)
│   │   └── lib/
│   │       └── (uses shared batch processing)
│   │
│   └── radicals/
│       ├── components/
│       │   ├── RadicalsManagerRefactored.tsx
│       │   └── ProcessingControls.tsx
│       ├── hooks/
│       │   └── useRadicalsManager.ts      (748 lines)
│       └── lib/
│           └── (uses shared batch processing)
│
├── shared/                      # Cross-feature utilities
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── LevelSelector.tsx
│   │   ├── TokenManagement.tsx
│   │   └── progress.tsx
│   ├── lib/
│   │   ├── wanikani.ts          (1021 lines - API client)
│   │   ├── deepl.ts             (Translation service)
│   │   ├── storage.ts           (LocalStorage wrapper)
│   │   ├── contextual-translation.ts (EDICT2 dictionary)
│   │   └── utils.ts
│   └── types/
│       └── wanikani.types.ts
│
└── tests/
    ├── unit/                    # 469 unit tests
    └── integration/             # 84 integration tests
```

### Feature Ownership

| Feature    | Lines of Code | Processing Model | Progress UI | Dictionary Support |
|------------|---------------|------------------|-------------|-------------------|
| Vocabulary | ~2,000        | Streaming        | 3-Phase     | ✅ EDICT2/Wadoku  |
| Kanji      | ~1,500        | Batch (Legacy)   | Single      | ❌                |
| Radicals   | ~1,200        | Batch (Legacy)   | Single      | ❌                |

---

## Processing Models

### Current Implementation

#### 1. **Streaming Processing** (Vocabulary Only)

**File**: `src/features/vocabulary/lib/vocabulary-streaming-integration.ts`

**Characteristics**:
- ✅ **Parallel Execution**: Translation and upload happen concurrently
- ✅ **Memory Efficient**: Processes items in batches of 5
- ✅ **Real-time Progress**: 3 separate progress bars (Translation, Upload, Overall)
- ✅ **Better UX**: Users see progress immediately
- ✅ **2x Faster**: ~50% time savings vs batch processing

**Flow Diagram**:
```
┌─────────────┐
│  Fetch All  │
│   Subjects  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│     Process in Batches (size: 5)        │
│                                         │
│  ┌────────────┐      ┌─────────────┐   │
│  │ Translate  │──┬──▶│   Upload    │   │
│  │  Batch 1   │  │   │   Batch 1   │   │
│  └────────────┘  │   └─────────────┘   │
│                  │                      │
│  ┌────────────┐  │   ┌─────────────┐   │
│  │ Translate  │──┼──▶│   Upload    │   │
│  │  Batch 2   │  │   │   Batch 2   │   │
│  └────────────┘  │   └─────────────┘   │
│                  │                      │
│  ┌────────────┐  │   ┌─────────────┐   │
│  │ Translate  │──┴──▶│   Upload    │   │
│  │  Batch 3   │      │   Batch 3   │   │
│  └────────────┘      └─────────────┘   │
│                                         │
│  Translation & Upload happen in parallel│
└─────────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│   Complete   │
└──────────────┘
```

**Key Functions**:
```typescript
export async function processVocabularyStreaming(
  items: Vocabulary[],
  apiToken: string,
  deeplKey: string | null,
  mode: SynonymMode,
  onProgress: ProgressCallback,
  shouldStop: () => boolean
): Promise<ProcessingResult>
```

**Progress Reporting**:
```typescript
interface StreamingProgress {
  translationProgress: number;  // 0-100
  uploadProgress: number;       // 0-100
  overallProgress: number;      // 0-100
  currentPhase: 'translation' | 'upload' | 'complete';
}
```

#### 2. **Batch Processing** (Kanji + Radicals)

**File**: `src/features/vocabulary/lib/vocabulary-batch-processing.ts` (shared)

**Characteristics**:
- ⚠️ **Sequential Execution**: Translate all, then upload all
- ⚠️ **Higher Memory Usage**: All translations kept in memory
- ⚠️ **Single Progress Bar**: Only overall progress shown
- ⚠️ **Slower**: 2x slower than streaming
- ⚠️ **Less Responsive**: No progress until first batch completes

**Flow Diagram**:
```
┌─────────────┐
│  Fetch All  │
│   Subjects  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│   PHASE 1: Translate All        │
│                                 │
│  ┌────────────┐                 │
│  │ Translate  │                 │
│  │  Item 1    │                 │
│  └────────────┘                 │
│  ┌────────────┐                 │
│  │ Translate  │                 │
│  │  Item 2    │                 │
│  └────────────┘                 │
│       ...                       │
│  ┌────────────┐                 │
│  │ Translate  │                 │
│  │  Item N    │                 │
│  └────────────┘                 │
└─────────────────────────────────┘
       │
       ▼ (Wait for all translations)
┌─────────────────────────────────┐
│   PHASE 2: Upload All           │
│                                 │
│  ┌─────────────┐                │
│  │   Upload    │                │
│  │   Item 1    │                │
│  └─────────────┘                │
│  ┌─────────────┐                │
│  │   Upload    │                │
│  │   Item 2    │                │
│  └─────────────┘                │
│       ...                       │
│  ┌─────────────┐                │
│  │   Upload    │                │
│  │   Item N    │                │
│  └─────────────┘                │
└─────────────────────────────────┘
       │
       ▼
┌──────────────┐
│   Complete   │
└──────────────┘
```

**Key Functions**:
```typescript
export async function processVocabularyBatch(
  items: Vocabulary[] | Kanji[] | Radical[],
  apiToken: string,
  deeplKey: string | null,
  mode: SynonymMode,
  onProgress: ProgressCallback,
  shouldStop: () => boolean
): Promise<ProcessingResult>
```

**Progress Reporting**:
```typescript
interface BatchProgress {
  overallProgress: number;  // 0-100
  currentPhase: 'processing';
}
```

### Performance Comparison

| Metric              | Streaming      | Batch          | Improvement |
|---------------------|----------------|----------------|-------------|
| **Time (100 items)** | ~60 seconds   | ~120 seconds   | **2x faster** |
| **Memory Usage**     | 5 items/batch | All items      | **~95% less** |
| **First Progress**   | < 1 second    | ~30 seconds    | **30x faster** |
| **Progress Updates** | 3 bars        | 1 bar          | **3x detail** |
| **Responsiveness**   | Immediate     | Delayed        | **Better UX** |

---

## Service Layer

### 1. WaniKani API Client

**File**: `src/shared/lib/wanikani.ts` (1021 lines)

**Responsibilities**:
- Fetch subjects (vocabulary, kanji, radicals) by level
- Fetch existing study materials
- Create new study materials
- Update existing study materials
- Rate limiting (1 request/second)
- Error handling and retry logic

**Key Functions**:

```typescript
// Fetch subjects by type and level range
export async function fetchSubjectsByType(
  type: 'vocabulary' | 'kanji' | 'radical',
  apiToken: string,
  minLevel: number,
  maxLevel: number
): Promise<Subject[]>

// Fetch existing study materials
export async function fetchStudyMaterials(
  apiToken: string,
  subjectIds: number[]
): Promise<StudyMaterial[]>

// Upload study material (rate-limited)
export async function uploadStudyMaterial(
  apiToken: string,
  subjectId: number,
  synonyms: string[]
): Promise<void>
```

**Rate Limiting Strategy**:
```typescript
class RateLimiter {
  private lastRequestTime = 0;
  private minInterval = 1000; // 1 second

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minInterval) {
      await sleep(this.minInterval - timeSinceLastRequest);
    }
    this.lastRequestTime = Date.now();
  }
}
```

**Error Handling**:
- **429 Too Many Requests**: Exponential backoff (1s → 2s → 4s → 8s)
- **401 Unauthorized**: Invalid API token
- **503 Service Unavailable**: Retry 3 times
- **Network Errors**: Retry 3 times with exponential backoff

### 2. DeepL Translation Service

**File**: `src/shared/lib/deepl.ts`

**Responsibilities**:
- Translate English text to German
- Pre-processing (add prefixes for context)
- Post-processing (clean up translations)
- Handle German-specific linguistic rules
- Batch translation support

**Key Functions**:

```typescript
// Translate single item
export async function translateWithDeepL(
  text: string,
  deeplKey: string
): Promise<string>

// Batch translate multiple items
export async function translateBatch(
  texts: string[],
  deeplKey: string
): Promise<string[]>

// Pre-processing: Add context for better translations
function preprocessForTranslation(text: string): string {
  // Add "This is: " prefix to get better German articles
  return `This is: ${text}`;
}

// Post-processing: Clean up translation artifacts
function postprocessTranslation(translation: string): string {
  // Remove "Das ist: " prefix
  // Fix punctuation issues
  // Normalize whitespace
  return cleaned;
}
```

**Translation Quality Improvements**:
```typescript
// German Article Handling
Input:  "water"
DeepL:  "Wasser" (neutral - no article)
Output: "Wasser" ✓

Input:  "This is: water"
DeepL:  "Das ist: Wasser"
Output: "Wasser" ✓ (with proper context)

// Punctuation Handling
Input:  "to drink"
DeepL:  "trinken."
Output: "trinken" ✓ (remove trailing period)
```

### 3. Contextual Translation Service (Vocabulary Only)

**File**: `src/shared/lib/contextual-translation.ts`

**Responsibilities**:
- Look up vocabulary in EDICT2/Wadoku dictionary
- Fallback when DeepL fails or no key provided
- Return multiple German translations
- Filter and rank translations by relevance

**Key Functions**:

```typescript
// Look up vocabulary in dictionary
export async function lookupInDictionary(
  characters: string,
  readings: string[]
): Promise<string[]>

// Load and parse EDICT2 dictionary
async function loadDictionary(): Promise<Map<string, Entry[]>>

// Rank translations by relevance
function rankTranslations(entries: Entry[]): string[]
```

**Dictionary Structure**:
```typescript
interface DictionaryEntry {
  kanji: string;         // 水
  reading: string;       // みず
  translations: string[]; // ["Wasser", "Gewässer", "Flüssigkeit"]
  pos: string[];         // ["noun"]
}
```

**Lookup Strategy**:
1. Try exact kanji match: `水` → "Wasser"
2. Try reading match: `みず` → "Wasser"
3. Try partial match: `飲み物` → "Getränk"
4. Return empty array if no match

### 4. Storage Manager

**File**: `src/shared/lib/storage.ts`

**Responsibilities**:
- Persist API tokens in localStorage
- Track processing progress
- Store already-processed item IDs
- Enable resume functionality

**Key Functions**:

```typescript
// API Token Management
export function saveApiToken(token: string): void
export function loadApiToken(): string | null

// Progress Tracking
export function saveProgress(
  type: 'vocabulary' | 'kanji' | 'radical',
  processedIds: Set<number>
): void

export function loadProgress(
  type: 'vocabulary' | 'kanji' | 'radical'
): Set<number>

// Resume Support
export function canResume(
  type: 'vocabulary' | 'kanji' | 'radical'
): boolean
```

**Storage Keys**:
```
wanikani_token         → WaniKani API Token
deepl_key              → DeepL API Key
vocabulary_progress    → Set<number> (processed IDs)
kanji_progress         → Set<number>
radicals_progress      → Set<number>
```

---

## State Management

### Hook-Based Architecture

Each feature uses a custom hook for state management:

```
useVocabularyManager.ts  (511 lines)
useKanjiManager.ts       (975 lines)
useRadicalsManager.ts    (748 lines)
```

### State Structure

```typescript
interface ManagerState {
  // Items
  items: Item[];              // All fetched items
  filteredItems: Item[];      // Items matching filters
  
  // Processing State
  isProcessing: boolean;      // Currently processing?
  isPaused: boolean;          // Paused by user?
  shouldStop: boolean;        // Stop signal
  
  // Progress
  progress: number;           // 0-100
  translationProgress: number; // 0-100 (streaming only)
  uploadProgress: number;     // 0-100 (streaming only)
  processedCount: number;     // Items completed
  totalCount: number;         // Total items to process
  
  // Statistics
  stats: {
    total: number;            // Total items
    needsTranslation: number; // Items without synonyms
    hasTranslation: number;   // Items with synonyms
    skipped: number;          // Items skipped
    failed: number;           // Items failed
  };
  
  // Filters
  selectedLevels: number[];   // [1, 2, 3, ...]
  synonymMode: SynonymMode;   // 'smart' | 'replace' | 'delete'
  
  // Error Handling
  lastError: string | null;   // Last error message
}
```

### State Transitions

```
┌─────────────┐
│    Idle     │
└──────┬──────┘
       │ startProcessing()
       ▼
┌─────────────┐
│ Processing  │──────┐ pause()
└──────┬──────┘      │
       │             ▼
       │      ┌─────────────┐
       │      │   Paused    │
       │      └──────┬──────┘
       │             │ resume()
       │             │
       │◀────────────┘
       │
       │ complete() / stop() / error()
       ▼
┌─────────────┐
│  Complete   │
└─────────────┘
```

### Hook API Example (Vocabulary)

```typescript
const {
  // State
  vocabulary,
  filteredVocabulary,
  isProcessing,
  isPaused,
  progress,
  translationProgress,
  uploadProgress,
  stats,
  
  // Actions
  startProcessing,
  pauseProcessing,
  resumeProcessing,
  stopProcessing,
  
  // Filters
  setSelectedLevels,
  setSynonymMode,
  
  // Utilities
  canResume,
  resetProgress,
} = useVocabularyManager(apiToken, deeplKey);
```

---

## Data Flow

### Complete Processing Flow (Streaming)

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Action                              │
│                   "Start Processing"                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Manager Hook                                 │
│  useVocabularyManager.startProcessing()                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               Fetch Phase (WaniKani API)                        │
│  1. Fetch subjects by level range                               │
│  2. Fetch existing study materials                              │
│  3. Merge data (subject + study material)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│            Filter Phase (Client-Side)                           │
│  1. Filter by burn status (exclude burned)                      │
│  2. Filter by existing synonyms (mode-dependent)                │
│  3. Sort by ID                                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│         Processing Phase (Streaming)                            │
│                                                                 │
│  FOR EACH BATCH (size: 5):                                      │
│                                                                 │
│    ┌─────────────────────────────────────────┐                 │
│    │  1. Translation Phase                   │                 │
│    │     - DeepL API (if key available)      │                 │
│    │     - Dictionary fallback (vocabulary)  │                 │
│    │     - Update translationProgress        │                 │
│    └─────────────────────────────────────────┘                 │
│                      │                                          │
│                      ▼                                          │
│    ┌─────────────────────────────────────────┐                 │
│    │  2. Upload Phase (Parallel)             │                 │
│    │     - Apply synonym mode logic          │                 │
│    │     - WaniKani API (rate-limited)       │                 │
│    │     - Update uploadProgress             │                 │
│    └─────────────────────────────────────────┘                 │
│                      │                                          │
│                      ▼                                          │
│    ┌─────────────────────────────────────────┐                 │
│    │  3. Progress Update                     │                 │
│    │     - Update overallProgress            │                 │
│    │     - Update stats                      │                 │
│    │     - Trigger UI re-render              │                 │
│    └─────────────────────────────────────────┘                 │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Completion Phase                               │
│  1. Update final statistics                                     │
│  2. Save progress to localStorage                               │
│  3. Display success message                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Synonym Mode Logic

#### Smart Merge Mode
```typescript
function smartMerge(
  existing: string[],
  translations: string[]
): string[] {
  // 1. Combine existing + new
  const combined = [...existing, ...translations];
  
  // 2. Remove duplicates (case-insensitive)
  const unique = Array.from(new Set(
    combined.map(s => s.toLowerCase())
  ));
  
  // 3. Limit to 8 synonyms
  return unique.slice(0, 8);
}
```

#### Replace Mode
```typescript
function replace(
  existing: string[],
  translations: string[]
): string[] {
  // Completely replace existing with new
  return translations.slice(0, 8);
}
```

#### Delete Mode
```typescript
function deleteAll(
  existing: string[],
  translations: string[]
): string[] {
  // Return empty array
  return [];
}
```

---

## Testing Strategy

### Test Pyramid

```
                  ┌─────────────┐
                  │    E2E      │  ← Manual Testing
                  │   (Manual)  │     (Browser UI)
                  └─────────────┘
                        △
                       ╱ ╲
                      ╱   ╲
                     ╱     ╲
                    ╱       ╲
              ┌────────────────┐
              │  Integration   │  ← 84 Tests
              │  (Real APIs)   │     (Vitest + Real WaniKani)
              └────────────────┘
                     △
                    ╱ ╲
                   ╱   ╲
                  ╱     ╲
                 ╱       ╲
                ╱         ╲
          ┌──────────────────┐
          │   Unit Tests     │  ← 469 Tests
          │   (Mocked APIs)  │     (Vitest + Testing Library)
          └──────────────────┘
```

### Test Coverage

| Category          | Count | Coverage | Notes                          |
|-------------------|-------|----------|--------------------------------|
| **Unit Tests**    | 469   | ~85%     | Components, hooks, utilities   |
| **Integration**   | 84    | ~60%     | Real API calls, safety limited |
| **Total**         | 553   | ~75%     | All passing ✅                 |

### Unit Test Structure

**Location**: `src/tests/unit/`

**Tools**:
- Vitest 3.2
- @testing-library/react
- @testing-library/user-event

**Approach**:
- Mock all external APIs (WaniKani, DeepL)
- Test components in isolation
- Test hooks with renderHook()
- Test utilities with pure function tests

**Example**:
```typescript
// src/tests/unit/vocabulary/useVocabularyManager.test.ts
describe('useVocabularyManager', () => {
  beforeEach(() => {
    vi.mock('../../shared/lib/wanikani');
    vi.mock('../../shared/lib/deepl');
  });

  test('fetches vocabulary on mount', async () => {
    const { result } = renderHook(() => 
      useVocabularyManager('token', 'key')
    );
    
    await waitFor(() => {
      expect(result.current.vocabulary).toHaveLength(10);
    });
  });

  test('processes vocabulary with streaming', async () => {
    const { result } = renderHook(() => 
      useVocabularyManager('token', 'key')
    );
    
    act(() => {
      result.current.startProcessing();
    });
    
    await waitFor(() => {
      expect(result.current.progress).toBe(100);
      expect(result.current.isProcessing).toBe(false);
    });
  });
});
```

### Integration Test Structure

**Location**: `src/tests/integration/`

**Tools**:
- Vitest 3.2
- Real WaniKani API
- Real DeepL API (optional)

**Safety Measures**:
- Only use 3 dedicated test radicals:
  - Ground (ID: 8761)
  - Fins (ID: 8763)
  - Drop (ID: 8764)
- Never touch user vocabulary/kanji
- Clean up after each test
- Rate limiting respected

**Example**:
```typescript
// src/tests/integration/radicals.integration.test.ts
describe('Radicals Integration', () => {
  const TEST_RADICALS = [8761, 8763, 8764];
  
  beforeEach(async () => {
    // Clean up test radicals
    await cleanupTestRadicals(TEST_RADICALS);
  });

  test('adds German synonyms to radicals', async () => {
    const result = await processRadicals({
      apiToken: process.env.WANIKANI_TOKEN!,
      deeplKey: process.env.DEEPL_KEY,
      mode: 'smart',
      radicalIds: TEST_RADICALS,
    });
    
    expect(result.successful).toHaveLength(3);
    expect(result.failed).toHaveLength(0);
    
    // Verify synonyms were added
    const studyMaterials = await fetchStudyMaterials(
      process.env.WANIKANI_TOKEN!,
      TEST_RADICALS
    );
    
    for (const sm of studyMaterials) {
      expect(sm.meaning_synonyms.length).toBeGreaterThan(0);
    }
  });
});
```

### Test Commands

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Run specific file
npm test -- vocabulary.test.ts
```

---

## Performance Considerations

### Current Performance Metrics

| Operation              | Time (100 items) | Notes                     |
|------------------------|------------------|---------------------------|
| **Vocabulary Streaming** | ~60 seconds     | Parallel translation+upload |
| **Kanji Batch**         | ~120 seconds    | Sequential processing     |
| **Radicals Batch**      | ~120 seconds    | Sequential processing     |
| **DeepL Translation**   | ~0.3s/item      | API call latency          |
| **WaniKani Upload**     | ~1.0s/item      | Rate-limited (1/sec)      |
| **Dictionary Lookup**   | ~0.01s/item     | In-memory lookup          |

### Bottlenecks

1. **WaniKani Rate Limiting** (1 request/second)
   - Currently: BLOCKING
   - Impact: Upload is slowest operation
   - Mitigation: Streaming keeps translation pipeline busy

2. **DeepL API Latency** (~300ms per request)
   - Currently: Somewhat blocking
   - Impact: Batch mode waits for all translations
   - Mitigation: Streaming processes in parallel

3. **Memory Usage** (Batch mode)
   - Currently: All items in memory
   - Impact: ~10MB for 1000 items
   - Mitigation: Streaming uses batches of 5

### Optimization Opportunities

#### Already Implemented ✅
- [x] Streaming processing for vocabulary
- [x] Batch size optimization (5 items)
- [x] Dictionary caching (in-memory)
- [x] Progress persistence (localStorage)

#### Planned 🚀
- [ ] Streaming for Kanji and Radicals
- [ ] Service Worker for background processing
- [ ] IndexedDB for large data storage
- [ ] Web Workers for translation processing
- [ ] Request batching for DeepL API

---

## Completed Refactoring (October 2025)

### Overview

**Status**: ✅ **ABGESCHLOSSEN**  
**Zeitraum**: Oktober 2025  
**Dauer**: ~23 Stunden  
**Details**: Siehe [archive/REFACTORING_PLAN_2025.md](archive/REFACTORING_PLAN_2025.md)

**Ziel erreicht**: Unified streaming architecture für alle Features (Vocabulary, Kanji, Radicals)

**Ergebnisse**:
- ✅ Code-Duplikation eliminiert (~90% Reduktion)
- ✅ 2x Performance-Verbesserung für Kanji/Radicals
- ✅ Konsistente UX (3-Phasen-Progress überall)
- ✅ Bessere Testbarkeit (Interface-basiertes Design)
- ✅ Einfachere Wartung (Single Processor)
- ✅ 647/647 Tests passing
- ✅ 0 TypeScript Errors

### Implementierte Architektur

```
                    ┌──────────────────────────┐
                    │ GenericStreamingProcessor │
                    │  (shared/processing/)    │
                    └─────────────┬────────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                │                 │                 │
       ┌────────▼─────┐  ┌───────▼────────┐  ┌────▼─────────┐
       │ Vocabulary   │  │     Kanji      │  │   Radicals   │
       │ Streaming    │  │   Streaming    │  │  Streaming   │
       │ (+ Dictionary)│  │  (Standard)    │  │  (Standard)  │
       └──────────────┘  └────────────────┘  └──────────────┘
                │                 │                 │
       ┌────────▼─────┐  ┌───────▼────────┐  ┌────▼─────────┐
       │   Manager    │  │    Manager     │  │   Manager    │
       │  Component   │  │   Component    │  │  Component   │
       └──────────────┘  └────────────────┘  └──────────────┘
```

### Kern-Komponenten

#### 1. GenericStreamingProcessor
**Datei**: `src/shared/processing/GenericStreamingProcessor.ts`

**Features**:
- Parallele Translation und Upload
- 3-Phasen-Progress (Translation, Upload, Gesamt)
- Smart-Merge mit case-insensitive Deduplication
- Fehlerbehandlung mit Retry-Logik
- Abbruch-Funktionalität
- Stream-Controller für Backpressure

#### 2. ProcessingControls (Shared UI)
**Datei**: `src/shared/components/processing/ProcessingControls.tsx`

**Features**:
- Synonym-Mode Selector
- Start/Stop Buttons
- Gesamt-Progress mit Percentage
- Streaming-Phasen-Anzeige
- Ergebnis-Zusammenfassung
- Fehler-Anzeige

#### 3. Feature-Spezifische Implementierungen

**Vocabulary**: `src/features/vocabulary/lib/vocabulary-streaming-integration.ts`
- + EDICT2/Wadoku Dictionary Integration
- Type: `VocabularyStreamingOptions`

**Kanji**: `src/features/kanji/lib/kanji-streaming-integration.ts`
- Standard DeepL Translation
- Type: `KanjiStreamingOptions`

**Radicals**: `src/features/radicals/lib/radicals-streaming-integration.ts`
- Standard DeepL Translation
- Type: `RadicalsStreamingOptions`

### Abgeschlossene Phasen

#### Phase 0: Interface Design ✅
- Core interfaces definiert
- Type-Hierarchie erstellt
- Contracts dokumentiert

#### Phase 1-2: Generic Processor ✅
- GenericStreamingProcessor implementiert
- DeepLTranslationService implementiert
- WaniKaniUploadService implementiert
- Test-First Approach

#### Phase 3: Feature Migration ✅
- Vocabulary → Streaming (bereits vorhanden)
- Kanji → Streaming Migration
- Radicals → Streaming Migration

#### Phase 4: Integration Tests ✅
- Vocabulary end-to-end Tests
- Kanji end-to-end Tests
- Radicals end-to-end Tests
- 82 Integration Tests passing

#### Phase 5: Hook Refactoring ✅
- useKanjiManager auf Streaming umgestellt
- useRadicalsManager auf Streaming umgestellt
- Legacy Batch-Processing Code entfernt
- Type-Migration abgeschlossen

#### Phase 6: UI-Vereinheitlichung ✅
- ProcessingControls für alle Features
- 3-Phasen-Progress überall
- Redundante UI-Elemente entfernt
- Load More Button für alle Preview-Komponenten

### Definition of Done - Erreicht ✅

- ✅ Alle 647 Tests passing (565 unit + 82 integration)
- ✅ 30+ neue Tests für GenericStreamingProcessor
- ✅ Kanji und Radicals verwenden Streaming
- ✅ Alle Features zeigen 3-Phasen-Progress
- ✅ Keine Code-Duplikation zwischen Features
- ✅ Performance: 2x schneller für Kanji/Radicals
- ✅ Dokumentation aktualisiert

### Wichtige Fixes

#### Case-Insensitive Deduplication
**Problem**: WaniKani API lehnte Duplikate wie "Sieben" + "sieben" ab (422 Fehler)

**Lösung**: Paralleles lowercase-Array in GenericStreamingProcessor für case-insensitive Vergleich

**Commit**: `7cc86a5`

#### UI-Konsistenz
**Problem**: Unterschiedliche UIs über Features

**Lösung**: Gemeinsame ProcessingControls Komponente

**Commits**: `d60c8e9`, `cdb3b5f`

#### Load More Button
**Problem**: RadicalPreview hatte keinen Load More Button

**Lösung**: Feature-Parity mit Kanji/Vocabulary

**Commits**: `5f4107d`, `972f636`

---

## Appendix

### API Rate Limits

| Service       | Limit          | Enforcement     | Notes                  |
|---------------|----------------|-----------------|------------------------|
| **WaniKani**  | 60 req/min     | Application     | ~1 request/second      |
| **DeepL**     | 500k chars/month | API Key       | Free tier limit        |
| **Dictionary**| No limit       | Local           | In-memory lookup       |

### Browser Compatibility

| Browser         | Version | Support | Notes                    |
|-----------------|---------|---------|--------------------------|
| **Chrome**      | 90+     | ✅ Full | Primary target           |
| **Firefox**     | 88+     | ✅ Full | Secondary target         |
| **Safari**      | 14+     | ✅ Full | Tertiary target          |
| **Edge**        | 90+     | ✅ Full | Chromium-based           |
| **Mobile Safari**| 14+    | ✅ Full | iOS support              |
| **Mobile Chrome**| 90+    | ✅ Full | Android support          |

### Environment Variables

```bash
# Development (.env.local)
VITE_WANIKANI_API_TOKEN=your_token_here
VITE_DEEPL_API_KEY=your_key_here

# Testing (.env.test)
WANIKANI_TOKEN=test_token_here
DEEPL_KEY=test_key_here
```

### Build Configuration

```typescript
// vite.config.ts
export default defineConfig({
  base: '/doitsukani/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-*'],
        }
      }
    }
  }
});
```

### Deployment

```bash
# GitHub Pages (Automated via GitHub Actions)
git push origin main
# → .github/workflows/web.yml triggers
# → npm run build
# → Deploy to gh-pages branch
# → Available at https://eickler.github.io/doitsukani
```

---

**Document Version**: 2.0  
**Last Updated**: October 26, 2025  
**Maintained By**: GitHub Copilot + Project Contributors  
**Next Review**: Bei größeren Architektur-Änderungen

