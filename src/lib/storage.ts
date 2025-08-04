/**
 * Token storage utilities using localStorage
 * Provides secure and convenient token management for the application
 */

// Storage keys for different tokens and settings
export const STORAGE_KEYS = {
    WANIKANI_TOKEN: 'doitsukani_wanikani_token',
    DEEPL_TOKEN: 'doitsukani_deepl_token',
    DEEPL_IS_PRO: 'doitsukani_deepl_is_pro',
    SELECTED_LEVEL: 'doitsukani_selected_level',
    SYNONYM_MODE: 'doitsukani_synonym_mode'
} as const;

/**
 * Save a token to localStorage
 */
export const saveToken = (key: string, value: string): void => {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.warn('Failed to save token to localStorage:', error);
    }
};

/**
 * Load a token from localStorage
 */
export const loadToken = (key: string): string => {
    try {
        return localStorage.getItem(key) || '';
    } catch (error) {
        console.warn('Failed to load token from localStorage:', error);
        return '';
    }
};

/**
 * Save a boolean value to localStorage
 */
export const saveBoolean = (key: string, value: boolean): void => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn('Failed to save boolean to localStorage:', error);
    }
};

/**
 * Load a boolean value from localStorage
 */
export const loadBoolean = (key: string): boolean => {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : false;
    } catch (error) {
        console.warn('Failed to load boolean from localStorage:', error);
        return false;
    }
};

/**
 * Save a generic value to localStorage as JSON
 */
export const saveValue = <T>(key: string, value: T): void => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn('Failed to save value to localStorage:', error);
    }
};

/**
 * Load a generic value from localStorage as JSON
 */
export const loadValue = <T>(key: string, defaultValue: T): T => {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
        console.warn('Failed to load value from localStorage:', error);
        return defaultValue;
    }
};

/**
 * Remove a token from localStorage
 */
export const removeToken = (key: string): void => {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.warn('Failed to remove token from localStorage:', error);
    }
};

/**
 * Clear all application tokens and settings
 */
export const clearAllTokens = (): void => {
    try {
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    } catch (error) {
        console.warn('Failed to clear tokens from localStorage:', error);
    }
};

/**
 * Check if localStorage is available
 */
export const isLocalStorageAvailable = (): boolean => {
    try {
        const test = '__localStorage_test__';
        localStorage.setItem(test, 'test');
        localStorage.removeItem(test);
        return true;
    } catch {
        return false;
    }
};

/**
 * Specific token management functions
 */

export const saveWanikaniToken = (token: string): void => {
    saveToken(STORAGE_KEYS.WANIKANI_TOKEN, token);
};

export const loadWanikaniToken = (): string => {
    return loadToken(STORAGE_KEYS.WANIKANI_TOKEN);
};

export const saveDeepLToken = (token: string): void => {
    saveToken(STORAGE_KEYS.DEEPL_TOKEN, token);
};

export const loadDeepLToken = (): string => {
    return loadToken(STORAGE_KEYS.DEEPL_TOKEN);
};

export const saveDeepLIsPro = (isPro: boolean): void => {
    saveBoolean(STORAGE_KEYS.DEEPL_IS_PRO, isPro);
};

export const loadDeepLIsPro = (): boolean => {
    return loadBoolean(STORAGE_KEYS.DEEPL_IS_PRO);
};

export const saveSelectedLevel = (level: number | 'all'): void => {
    saveValue(STORAGE_KEYS.SELECTED_LEVEL, level);
};

export const loadSelectedLevel = (): number | 'all' => {
    return loadValue(STORAGE_KEYS.SELECTED_LEVEL, 1);
};

export const saveSynonymMode = (mode: string): void => {
    saveValue(STORAGE_KEYS.SYNONYM_MODE, mode);
};

export const loadSynonymMode = (): string => {
    return loadValue(STORAGE_KEYS.SYNONYM_MODE, 'smart-merge');
};
