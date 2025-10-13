# Progress Bar Improvement: Individual Kanji Tracking

## Problem Fixed

Previously, the progress bar showed batch-level progress, which meant:
- Progress stayed at 0% while translating all kanji in a batch
- Progress jumped to 100% only when the entire batch completed
- For Level 5 with 45 kanji, users saw no progress feedback until all translations finished

## Solution Implemented

Modified `useKanjiManager.ts` to track progress at the individual kanji level:

### Key Changes

1. **Added progress callback to `processBatch` function**:
   ```typescript
   updateProgress?: (processedCount: number, totalCount: number) => void
   ```

2. **Progress updates after each kanji translation**:
   - Delete mode: Progress updates after each kanji deletion
   - Translation mode: Progress updates after each kanji translation

3. **Fixed double-counting bug**:
   ```typescript
   // OLD (incorrect): totalSelectedFoundSoFar + selectedKanji.length calculated twice
   // NEW (correct): Calculate totalSelectedIncludingCurrentBatch once and pass it through
   const totalSelectedIncludingCurrentBatch = totalSelectedFoundSoFar + selectedKanji.length;
   ```

4. **Dynamic progress calculation**:
   ```typescript
   const progressPct = Math.round((processedCount / totalCount) * 100);
   setProgress(Math.min(progressPct, 99)); // Cap at 99% until complete
   ```

### Bug Fix: Progress Calculation

**Issue**: Progress bar stopped at 50% and showed incorrect totals like "38/90" when there were only 45 kanji.

**Root Cause**: The total count was calculated as `totalSelectedFoundSoFar + selectedKanji.length` both when calling `processBatch` AND again in the progress callback, effectively doubling the count (45 kanji became 90).

**Fix**: Calculate `totalSelectedIncludingCurrentBatch` once and pass it through to avoid double-counting.

### User Experience Improvement

**Before**: 
- Level 5 (45 kanji): `0% → 0% → 0% → ... → 50% (stuck)` + wrong totals (45/90)

**After**:
- Level 5 (45 kanji): `2% → 4% → 7% → 9% → 11% → ... → 98% → 100%` + correct totals (45/45)

### Technical Details

- Progress is capped at 99% during processing to avoid reaching 100% before all batches complete
- Final progress is set to 100% when all processing is finished
- Works with dynamic batch processing from WaniKani API
- Compatible with both translation and deletion modes
- Maintains all existing functionality while improving user feedback

### Testing

- ✅ All existing tests pass (15/15 dynamic batch tests, 12/12 simple batch tests)
- ✅ Functional state tests pass (3/3)
- ✅ No breaking changes to existing functionality
- ✅ Fixed double-counting bug confirmed

This improvement provides accurate user feedback during translation processes, showing real progress percentages and correct kanji counts.
