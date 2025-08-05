# DeepL Context Integration Plan

## ✅ DISCOVERY COMPLETE

Native DeepL Context Parameter validated:
- **"branch"** ohne Kontext → "Zweigstelle" ❌ (office branch)  
- **"branch"** mit Kontext → "Zweig" ✅ (tree branch)
- **No additional cost** - included in standard API
- **Simple implementation** - just add `context` parameter

## 🎯 INTEGRATION STRATEGY

### Phase 1: Core DeepL Functions (HIGH PRIORITY)
**Files to modify:**
- `src/lib/deepl.ts` - Add context parameter to existing functions

**Changes needed:**
```typescript
// Modify existing functions to accept optional context
export const translateText = async (
  apiKey: string,
  text: string,
  targetLang: string,
  isProTier: boolean,
  context?: string  // NEW PARAMETER
): Promise<string>

export const translateBatch = async (
  apiKey: string,
  texts: string[],
  targetLang: string,
  isProTier: boolean,
  context?: string  // NEW PARAMETER
): Promise<string[]>
```

### Phase 2: RadicalsManager Integration (MEDIUM PRIORITY)
**Files to modify:**
- `src/components/RadicalsManager.tsx` - Use context in translation calls

**Changes needed:**
1. Import `extractContextFromMnemonic` from contextual-translation.ts
2. Extract context from `meaning_mnemonic` before translation
3. Pass context to DeepL functions
4. Show context status in UI (optional)

**Example integration:**
```typescript
// In translateRadicals function
const context = extractContextFromMnemonic(
  radical.meaning_mnemonic,
  primaryMeaning
);

const translation = await translateText(
  apiKey,
  primaryMeaning,
  targetLang,
  isProTier,
  context  // Pass context to DeepL
);
```

### Phase 3: User Feedback (LOW PRIORITY)
**Optional enhancements:**
- Show when context was used in translation
- Allow manual context override
- Display context in tooltips

## 🔧 IMPLEMENTATION STEPS

### Step 1: Update DeepL Core Functions
1. **Backup current `deepl.ts`** (working version)
2. **Add context parameter** to `translateText()` and `translateBatch()`
3. **Update request body** to include context when provided
4. **Test with existing functionality** (ensure no breaking changes)

### Step 2: Integrate Context Extraction
1. **Import context functions** in RadicalsManager
2. **Extract context** from meaning_mnemonic before translation
3. **Pass context** to updated DeepL functions
4. **Test with problematic radicals** (branch, ground, drop, etc.)

### Step 3: Validation & Testing
1. **Test "branch" radical** - should now translate to "Zweig/Ast"
2. **Test other ambiguous radicals** from our analysis
3. **Verify no regression** in non-contextual translations
4. **Performance check** - ensure no significant slowdown

## 📋 TESTING CHECKLIST

### Must Test:
- [ ] "branch" → "Zweig" (not "Zweigstelle")
- [ ] "ground" → "Boden" 
- [ ] "drop" → "Tropfen"
- [ ] Normal radicals still work correctly
- [ ] Batch translation with mixed context/no-context
- [ ] Error handling when context extraction fails

### Optional:
- [ ] UI indication when context is used
- [ ] Performance comparison with/without context
- [ ] User preference for context usage

## 🚀 EXPECTED OUTCOMES

**Immediate Benefits:**
- Accurate translation of ambiguous radicals
- No additional DeepL API costs
- Minimal code changes required

**Long-term Benefits:**
- Improved user experience
- Better learning through accurate translations
- Foundation for more contextual features

## ⚠️ RISKS & MITIGATION

**Risk 1:** Context extraction fails
- **Mitigation:** Fallback to normal translation (current behavior)

**Risk 2:** Context makes translations worse
- **Mitigation:** A/B comparison during testing phase

**Risk 3:** Breaking existing functionality
- **Mitigation:** Gradual rollout, extensive testing

## 📈 SUCCESS METRICS

1. **Translation Accuracy:** "branch" correctly translates to tree-related German word
2. **No Regressions:** Existing translations remain unchanged
3. **Performance:** No significant increase in translation time
4. **User Satisfaction:** Better learning experience with accurate meanings

## 🏁 READY FOR IMPLEMENTATION

All discovery and validation complete. Native DeepL context parameter provides optimal solution with minimal implementation complexity.

**Recommendation:** Proceed with Phase 1 (Core DeepL Functions) immediately.
