import { translateText } from './deepl';
import axios from 'axios';
import Bottleneck from 'bottleneck';

// API rate limiting
const API_LIMITS = {
  minTime: 1100, // 1.1 seconds between requests
  maxConcurrent: 1
};

/**
 * Extract context from WaniKani meaning mnemonic
 * @param meaningMnemonic - The WaniKani meaning mnemonic text
 * @param primaryMeaning - The primary meaning to provide context for
 * @returns Cleaned mnemonic text for context or null if not suitable
 */
export const extractContextFromMnemonic = (
  meaningMnemonic: string,
  primaryMeaning: string
): string | null => {
  if (!meaningMnemonic || !primaryMeaning) return null;

  // Clean the mnemonic for use as context
  const cleaned = meaningMnemonic
    // Remove HTML tags like <radical>branch</radical>
    .replace(/<[^>]*>/g, '')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Only use if it's substantial enough (at least 20 characters)
  if (cleaned.length < 20) return null;

  // Limit context length to avoid hitting request size limits
  // DeepL recommends "a few complete sentences"
  const maxLength = 200;
  if (cleaned.length > maxLength) {
    // Try to cut at sentence boundary
    const sentenceEnd = cleaned.lastIndexOf('.', maxLength);
    if (sentenceEnd > 100) {
      return cleaned.substring(0, sentenceEnd + 1);
    }
    // Otherwise cut at word boundary
    const wordEnd = cleaned.lastIndexOf(' ', maxLength);
    return cleaned.substring(0, wordEnd > 50 ? wordEnd : maxLength);
  }

  return cleaned;
};

/**
 * Translate text with DeepL's native context parameter
 * @param apiKey - DeepL API key
 * @param text - Text to translate
 * @param context - Optional context string
 * @param targetLang - Target language
 * @param isProTier - Whether using DeepL Pro
 * @returns Promise<string>
 */
export const translateTextWithContext = async (
  apiKey: string,
  text: string,
  context: string | null,
  targetLang: string,
  isProTier: boolean
): Promise<string> => {
  const limiter = new Bottleneck(API_LIMITS);

  const baseUrl = isProTier
    ? "https://api.deepl.com/v2/translate"
    : "https://api-free.deepl.com/v2/translate";

  return limiter.schedule(async () => {
    const requestBody: any = {
      text: [text.toLowerCase()], // Use lowercase for consistency with our fix
      target_lang: targetLang,
      source_lang: "EN"
    };

    // Add context if available
    if (context) {
      requestBody.context = context;
    }

    const response = await axios.post(baseUrl, requestBody, {
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    return response.data.translations[0].text;
  });
};

/**
 * Translate batch with context support using DeepL's native context parameter
 * @param apiKey - DeepL API key
 * @param items - Array of items with text and optional context
 * @param targetLang - Target language
 * @param isProTier - Whether using DeepL Pro
 * @returns Promise<string[]>
 */
export const translateBatchWithContext = async (
  apiKey: string,
  items: Array<{ text: string; context?: string | null }>,
  targetLang: string,
  isProTier: boolean
): Promise<string[]> => {
  // Group items by context to optimize API calls
  const contextGroups = new Map<string, string[]>();
  const itemIndexMap = new Map<string, number[]>();

  items.forEach((item, index) => {
    const contextKey = item.context || 'NO_CONTEXT';
    if (!contextGroups.has(contextKey)) {
      contextGroups.set(contextKey, []);
      itemIndexMap.set(contextKey, []);
    }
    contextGroups.get(contextKey)!.push(item.text.toLowerCase());
    itemIndexMap.get(contextKey)!.push(index);
  });

  const results: string[] = new Array(items.length);
  const limiter = new Bottleneck(API_LIMITS);

  const baseUrl = isProTier
    ? "https://api.deepl.com/v2/translate"
    : "https://api-free.deepl.com/v2/translate";

  // Process each context group
  for (const [contextKey, texts] of contextGroups) {
    const context = contextKey === 'NO_CONTEXT' ? null : contextKey;
    const indices = itemIndexMap.get(contextKey)!;

    const translations = await limiter.schedule(async () => {
      const requestBody: any = {
        text: texts,
        target_lang: targetLang,
        source_lang: "EN"
      };

      if (context) {
        requestBody.context = context;
      }

      const response = await axios.post(baseUrl, requestBody, {
        headers: {
          Authorization: `DeepL-Auth-Key ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      return response.data.translations.map((t: any) => t.text);
    });

    // Map results back to original positions
    translations.forEach((translation: string, i: number) => {
      results[indices[i]] = translation;
    });
  }

  return results;
};

/**
 * Enhanced radical translation with DeepL's native context
 * @param apiKey - DeepL API key
 * @param radical - WaniKani radical object
 * @param targetLang - Target language
 * @param isProTier - Whether using DeepL Pro
 * @returns Promise with both contextual and regular translation
 */
export const translateRadicalWithContext = async (
  apiKey: string,
  radical: { 
    meanings: Array<{ meaning: string; primary: boolean }>;
    meaning_mnemonic: string;
  },
  targetLang: string,
  isProTier: boolean
): Promise<{
  original: string;
  contextual: string;
  context: string | null;
  improved: boolean;
}> => {
  const primaryMeaning = radical.meanings.find(m => m.primary)?.meaning || 
                        radical.meanings[0]?.meaning;
  
  if (!primaryMeaning) {
    throw new Error('No meaning found for radical');
  }

  // Extract context from mnemonic
  const context = extractContextFromMnemonic(
    radical.meaning_mnemonic,
    primaryMeaning
  );

  // Get both translations
  const [original, contextual] = await Promise.all([
    translateText(apiKey, primaryMeaning, targetLang, isProTier),
    translateTextWithContext(apiKey, primaryMeaning, context, targetLang, isProTier)
  ]);

  // Determine if contextual translation is an improvement
  const improved = context !== null && original !== contextual;

  return {
    original,
    contextual,
    context,
    improved
  };
};
