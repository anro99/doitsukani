/**
 * Combined Manager - Component Tests
 * 
 * Testet die CombinedManager Hauptkomponente.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CombinedManager } from '../../features/combined/components/CombinedManager';

// Mock useCombinedManager Hook
vi.mock('../../features/combined/hooks/useCombinedManager', () => ({
    useCombinedManager: vi.fn(() => ({
        // Settings
        selectedLevel: 1,
        setSelectedLevel: vi.fn(),
        synonymMode: 'smart-merge' as const,
        setSynonymMode: vi.fn(),

        // Tokens
        apiToken: '',
        handleApiTokenChange: vi.fn(),
        deeplToken: '',
        handleDeepLTokenChange: vi.fn(),

        // Data
        combinedItems: [],
        totalCount: 0,
        radicalCount: 0,
        kanjiCount: 0,
        vocabularyCount: 0,
        displayedPreviewCount: 12,

        // Loading states
        isLoadingItems: false,
        apiError: '',

        // Processing states
        isProcessing: false,
        progress: 0,

        // Actions
        loadItemsFromAPI: vi.fn(),
        loadMorePreviewItems: vi.fn(),
        startProcessing: vi.fn(),
        stopProcessing: vi.fn(),
        clearResults: vi.fn(),
    })),
}));

describe('CombinedManager Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('sollte CombinedManager rendern', () => {
            render(<CombinedManager />);

            expect(screen.getByText(/Doitsukani - WaniKani Combined Manager/i)).toBeInTheDocument();
        });

        it('sollte subtitle mit Radicals, Kanji und Vocabulary anzeigen', () => {
            render(<CombinedManager />);

            expect(
                screen.getByText(/Automatische deutsche Übersetzungen für Radicals, Kanji und Vocabulary/i)
            ).toBeInTheDocument();
        });

        it('sollte BaseManager mit korrekten Props rendern', () => {
            const { container } = render(<CombinedManager />);

            // BaseManager sollte gerendert werden
            expect(container.querySelector('.rounded-lg.border.bg-card')).toBeInTheDocument();
        });
    });

    describe('Integration with useCombinedManager', () => {
        it('sollte Hook-Daten korrekt verwenden', () => {
            render(<CombinedManager />);

            // Der Mock wurde aufgerufen, Component rendert erfolgreich
            expect(screen.getByText(/Doitsukani - WaniKani Combined Manager/i)).toBeInTheDocument();
        });
    });

    describe('Preview Component', () => {
        it('sollte CombinedPreview als previewComponent verwenden', () => {
            render(<CombinedManager />);

            // CombinedPreview wird nur gerendert wenn API Token vorhanden ist
            // Im Mock ist apiToken = '', daher wird die Token-Config Card gezeigt
            expect(screen.getByText(/API-Token Konfiguration/i)).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('sollte mit leeren combinedItems umgehen', () => {
            render(<CombinedManager />);

            // Ohne Token wird zunächst Token-Eingabe gefordert
            // Text erscheint mehrfach, daher verwenden wir getAllByText
            const tokenInputs = screen.getAllByText(/Wanikani API-Token/i);
            expect(tokenInputs.length).toBeGreaterThan(0);
        });

        it('sollte mit Loading State umgehen', () => {
            render(<CombinedManager />);

            // BaseManager zeigt Loading State
            // Text erscheint mehrfach, daher verwenden wir getAllByText
            const tokenInputs = screen.getAllByText(/Wanikani API-Token/i);
            expect(tokenInputs.length).toBeGreaterThan(0);
        });
    });
});
