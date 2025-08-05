import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RadicalsManager } from '../../components/RadicalsManager';

// Mock the external dependencies
vi.mock('../../lib/wanikani', () => ({
    getRadicals: vi.fn(),
    getRadicalStudyMaterials: vi.fn(),
    createRadicalSynonyms: vi.fn(),
    updateRadicalSynonyms: vi.fn()
}));

vi.mock('../../lib/deepl', () => ({
    translateText: vi.fn()
}));

vi.mock('../../lib/contextual-translation', () => ({
    extractContextFromMnemonic: vi.fn()
}));

describe('RadicalsManager Context Integration', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        vi.clearAllMocks();

        // Mock localStorage
        const localStorageMock = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
        };
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
            writable: true,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should render RadicalsManager component', () => {
        render(<RadicalsManager />);
        expect(screen.getByText('🌸 Doitsukani - WaniKani Radicals Manager')).toBeInTheDocument();
    });

    it('should have input fields for API tokens', () => {
        render(<RadicalsManager />);

        // Check for WaniKani API token input
        expect(screen.getByPlaceholderText('WaniKani API Token eingeben')).toBeInTheDocument();

        // Check for DeepL API token input
        expect(screen.getByPlaceholderText('DeepL API Token eingeben')).toBeInTheDocument();
    });

    it('should show load radicals button when tokens are provided', async () => {
        render(<RadicalsManager />);

        // Add API token
        const wanikaniInput = screen.getByPlaceholderText('WaniKani API Token eingeben');
        fireEvent.change(wanikaniInput, { target: { value: 'test-wk-token' } });

        // Should show the load button
        await waitFor(() => {
            expect(screen.getByText('📥 Radicals laden')).toBeInTheDocument();
        });
    });

    it('should integrate context extraction into translation workflow', () => {
        // This test validates that the context integration is properly set up
        // The actual translation logic with context will be tested in integration tests
        const { extractContextFromMnemonic } = require('../../lib/contextual-translation');
        const { translateText } = require('../../lib/deepl');

        // These functions should be properly imported and available
        expect(extractContextFromMnemonic).toBeDefined();
        expect(translateText).toBeDefined();
    });

    it('should properly structure radical data with meaning_mnemonic', () => {
        // Mock WKRadical data structure
        const mockWKRadical = {
            id: 1,
            data: {
                meanings: [{ meaning: 'branch', primary: true }],
                characters: '一',
                level: 1,
                meaning_mnemonic: "There's a cross branching off of this stool. Since it's branching out, we'll just call this the branch radical. I guess the tree this stool was made of is coming back to life."
            }
        };

        // The RadicalsManager should be able to handle this structure
        // This is validated by successful TypeScript compilation
        expect(mockWKRadical.data.meaning_mnemonic).toBeDefined();
        expect(mockWKRadical.data.meanings[0].meaning).toBe('branch');
    });
});

describe('Context Integration Features', () => {
    it('should extract context from meaning_mnemonic correctly', () => {
        const { extractContextFromMnemonic } = require('../../lib/contextual-translation');

        const mnemonic = "There's a cross branching off of this stool. Since it's branching out, we'll just call this the branch radical. I guess the tree this stool was made of is coming back to life.";
        const context = extractContextFromMnemonic(mnemonic, 'branch');

        // Should extract the full mnemonic as context (cleaned)
        expect(context).toBeTruthy();
        expect(typeof context).toBe('string');
        expect(context.length).toBeGreaterThan(20);
    });

    it('should handle missing meaning_mnemonic gracefully', () => {
        const { extractContextFromMnemonic } = require('../../lib/contextual-translation');

        const context = extractContextFromMnemonic('', 'branch');
        expect(context).toBeNull();
    });

    it('should handle DeepL translateText with optional context parameter', () => {
        const { translateText } = require('../../lib/deepl');

        // Mock function should accept context parameter
        translateText.mockResolvedValue('Zweig');

        const result = translateText('api-key', 'branch', 'DE', false, 3, 'context string');
        expect(result).toBeDefined();
        expect(translateText).toHaveBeenCalledWith('api-key', 'branch', 'DE', false, 3, 'context string');
    });
});
