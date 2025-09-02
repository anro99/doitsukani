# useKanjiManager Hook

## Overview

The `useKanjiManager` hook provides comprehensive state management and API integration for Kanji-related operations in the Doitsukani application. It handles Kanji data loading, translation processing, and synonym management with full rate limiting and error handling support.

## Features

- **🔥 Complete Kanji Management**: Load, filter, and process Kanji from WaniKani API
- **🌐 Translation Integration**: Seamless DeepL API integration for German translations
- **📊 Real-time Progress Tracking**: Live progress updates during batch processing
- **🛡️ Rate Limiting**: Built-in Bottleneck integration for API rate limiting
- **💾 Persistent Storage**: LocalStorage integration for API tokens
- **🔄 Smart Synonym Modes**: Replace, Smart-Merge, and Delete modes
- **🚀 Preview Functionality**: Quick preview loading for UI performance
- **⚡ Error Handling**: Comprehensive error handling and recovery

## Basic Usage

```typescript
import { useKanjiManager } from '../hooks/useKanjiManager';

function KanjiComponent() {
  const {
    // State
    apiToken,
    deeplToken,
    selectedLevel,
    synonymMode,
    isProcessing,
    progress,
    filteredKanji,
    previewKanji,
    uploadStats,
    
    // Actions
    handleApiTokenChange,
    handleDeeplTokenChange,
    setSelectedLevel,
    setSynonymMode,
    processTranslations,
    stopProcessing,
    loadKanjiFromAPI,
  } = useKanjiManager();

  return (
    <div>
      <h2>Kanji Manager</h2>
      <p>Level: {selectedLevel}</p>
      <p>Kanji Count: {filteredKanji.length}</p>
      <p>Processing: {isProcessing ? 'Yes' : 'No'}</p>
      <p>Progress: {progress}%</p>
    </div>
  );
}
```

## API Reference

### State Properties

#### Basic Configuration
- `apiToken: string` - WaniKani API token
- `deeplToken: string` - DeepL API token
- `selectedLevel: number | 'all'` - Currently selected level filter
- `synonymMode: 'replace' | 'smart-merge' | 'delete'` - Synonym processing mode

#### Processing State
- `isProcessing: boolean` - Whether batch processing is active
- `progress: number` - Current processing progress (0-100)
- `translationStatus: string` - Current translation status message
- `uploadStatus: string` - Current upload status message
- `processedCount: number` - Number of items processed
- `totalCountForProcessing: number` - Total items to process

#### Data State
- `wkKanji: WKKanji[]` - Raw WaniKani kanji data
- `studyMaterials: WKStudyMaterial[]` - Study materials from WaniKani
- `filteredKanji: Kanji[]` - Filtered kanji based on selected level
- `previewKanji: Kanji[]` - Preview kanji for current level (max 12)
- `currentLevelCount: number | undefined` - Count of kanji for current level
- `uploadStats: UploadStats` - Statistics from last processing run

#### Loading State
- `isLoadingKanji: boolean` - Whether kanji are being loaded
- `currentLevelCountLoading: boolean` - Whether count is being loaded
- `apiError: string` - Any API error messages

### Action Functions

#### Configuration
- `handleApiTokenChange(token: string)` - Update and persist API token
- `handleDeeplTokenChange(token: string)` - Update and persist DeepL token
- `setSelectedLevel(level: number | 'all')` - Change level filter
- `setSynonymMode(mode: SynonymMode)` - Change synonym processing mode

#### Data Management
- `loadKanjiFromAPI()` - Load kanji and study materials from API
- `refreshStudyMaterials()` - Refresh study materials after processing

#### Processing
- `processTranslations(kanji: Kanji[])` - Start batch translation processing
- `stopProcessing()` - Stop current processing operation

#### State Updates (for advanced usage)
- `setIsProcessing(processing: boolean)` - Manually set processing state
- `setProgress(progress: number)` - Update progress percentage
- `setTranslationStatus(status: string)` - Update translation status
- `setUploadStatus(status: string)` - Update upload status
- `setUploadStats(stats: UploadStats)` - Update upload statistics

## Data Types

### Kanji Interface
```typescript
interface Kanji {
  id: number;
  meaning: string;
  characters: string;
  level: number;
  currentSynonyms: string[];
  selected: boolean;
  translatedSynonyms: string[];
  meaningMnemonic?: string;
}
```

### UploadStats Interface
```typescript
interface UploadStats {
  created: number;    // New study materials created
  updated: number;    // Existing study materials updated
  failed: number;     // Failed operations
  skipped: number;    // Skipped items (no changes needed)
  successful: number; // Total successful operations
}
```

### ProcessResult Interface
```typescript
interface ProcessResult {
  kanji: Kanji;
  status: 'success' | 'error' | 'uploaded';
  message: string;
}
```

## Synonym Processing Modes

### 1. Replace Mode (`'replace'`)
- Replaces all existing synonyms with new translation
- **Use case**: Complete synonym refresh

### 2. Smart-Merge Mode (`'smart-merge'`)
- Adds new translation only if it doesn't exist
- Preserves existing synonyms
- **Use case**: Adding translations without duplicates (default)

### 3. Delete Mode (`'delete'`)
- Removes all synonyms for selected kanji
- No DeepL token required
- **Use case**: Cleaning up unwanted synonyms

## Rate Limiting

The hook uses Bottleneck for rate limiting:
- **WaniKani API**: 75 requests/minute (800ms between requests)
- **DeepL API**: High limits with burst capability
- **Automatic retry**: Built-in retry logic for failed requests

## Error Handling

- **Network errors**: Graceful handling with user feedback
- **API errors**: Proper error messages displayed
- **Invalid tokens**: Clear error messaging
- **Processing interruption**: Clean stop functionality

## Storage Integration

- API tokens are automatically saved to localStorage
- Tokens persist between browser sessions
- Secure token removal when cleared

## Performance Features

- **Preview loading**: Only loads 12 kanji for quick preview
- **Batch processing**: Processes kanji in configurable batches
- **Real-time updates**: Live progress and statistics updates
- **Memory efficient**: Proper cleanup and state management

## Testing

The hook includes comprehensive unit tests covering:
- State management
- API integration
- Error handling
- Processing logic
- Storage integration
- Rate limiting
- Memory performance

Run tests with:
```bash
npm test -- useKanjiManager.test.ts
```

## Integration with Components

The hook is designed to work seamlessly with:
- `LevelSelector` component for level filtering
- `ProcessingControls` component for translation controls
- `Progress` components for real-time feedback
- Any kanji display components

## Dependencies

- `@bachmacintosh/wanikani-api-types` - WaniKani TypeScript types
- `bottleneck` - Rate limiting
- `../lib/wanikani` - WaniKani API functions
- `../lib/deepl` - DeepL translation
- `../lib/storage` - LocalStorage utilities
- `../lib/contextual-translation` - Context extraction

## Version History

- **v1.0.0** - Initial implementation with full feature set
- Based on proven `useRadicalsManager` architecture
- Complete API integration and testing

## Related

- `useRadicalsManager` - Radicals management hook
- WaniKani API functions in `../lib/wanikani`
- Kanji API unit tests in `wanikani.kanji.test.ts`
