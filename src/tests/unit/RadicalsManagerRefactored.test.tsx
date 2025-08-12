import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RadicalsManagerRefactored } from '../../components/RadicalsManagerRefactored';

// Mock child components
vi.mock('../../components/TokenManagement', () => ({
    TokenManagement: ({ apiToken, onApiTokenChange, onDeeplTokenChange }: any) => (
        <div data-testid="token-management">
            <button
                data-testid="set-api-token"
                onClick={() => onApiTokenChange('test-api-token')}
            >
                Set API Token
            </button>
            <button
                data-testid="set-deepl-token"
                onClick={() => onDeeplTokenChange('test-deepl-token')}
            >
                Set DeepL Token
            </button>
            <div data-testid="api-token-display">{apiToken}</div>
        </div>
    )
}));

vi.mock('../../components/LevelSelector', () => ({
    LevelSelector: ({ selectedLevel, onLevelChange }: any) => (
        <div data-testid="level-selector">
            <button
                data-testid="select-level"
                onClick={() => onLevelChange(5)}
            >
                Select Level 5
            </button>
            <div data-testid="selected-level">{selectedLevel}</div>
        </div>
    )
}));

vi.mock('../../components/ProcessingControls', () => ({
    ProcessingControls: ({ onStartProcessing, onStopProcessing, isProcessing }: any) => (
        <div data-testid="processing-controls">
            <button
                data-testid="start-processing"
                onClick={onStartProcessing}
                disabled={isProcessing}
            >
                Start Processing
            </button>
            <button
                data-testid="stop-processing"
                onClick={onStopProcessing}
                disabled={!isProcessing}
            >
                Stop Processing
            </button>
        </div>
    )
}));

vi.mock('../../components/RadicalPreview', () => ({
    RadicalPreview: ({ previewRadicals, currentLevelCount }: any) => (
        <div data-testid="radical-preview">
            <div data-testid="radical-count">{previewRadicals ? previewRadicals.length : 0} radicals</div>
            <div data-testid="current-level-count">{currentLevelCount || 0} total</div>
        </div>
    )
}));

// Mock the useRadicalsManager hook
const mockUseRadicalsManager = vi.fn();
vi.mock('../../hooks/useRadicalsManager', () => ({
    useRadicalsManager: () => mockUseRadicalsManager()
}));

describe('RadicalsManagerRefactored', () => {
    const defaultHookReturn = {
        apiToken: '',
        deeplToken: '',
        selectedLevel: null,
        synonymMode: 'smart-merge',
        isProcessing: false,
        progress: 0,
        translationStatus: 'idle',
        uploadStatus: 'idle',
        uploadStats: { created: 0, updated: 0, failed: 0, skipped: 0, successful: 0 },
        wkRadicals: [],
        studyMaterials: [],
        isLoadingRadicals: false,
        apiError: '',
        filteredRadicals: [],
        // New optimized loading properties
        currentLevelCount: undefined,
        currentLevelCountLoading: false,
        previewRadicals: [],
        handleApiTokenChange: vi.fn(),
        handleDeeplTokenChange: vi.fn(),
        setSelectedLevel: vi.fn(),
        setSynonymMode: vi.fn(),
        setIsProcessing: vi.fn(),
        setProgress: vi.fn(),
        setTranslationStatus: vi.fn(),
        setUploadStatus: vi.fn(),
        setUploadStats: vi.fn(),
        processTranslations: vi.fn(),
        stopProcessing: vi.fn(),
        loadRadicalsFromAPI: vi.fn(),
        refreshStudyMaterials: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseRadicalsManager.mockReturnValue(defaultHookReturn);
    });

    it('renders the main heading and description', () => {
        render(<RadicalsManagerRefactored />);

        expect(screen.getByText('Doitsukani - WaniKani Radicals Synonyme Manager')).toBeInTheDocument();
        expect(screen.getByText(/Automatische Übersetzung von WaniKani Radicals-Bedeutungen/)).toBeInTheDocument();
    });

    it('always renders TokenManagement component', () => {
        render(<RadicalsManagerRefactored />);
        expect(screen.getByTestId('token-management')).toBeInTheDocument();
    });

    it('shows help text when no API token is provided', () => {
        render(<RadicalsManagerRefactored />);

        expect(screen.getByText('🚀 Erste Schritte')).toBeInTheDocument();
        expect(screen.getByText('Geben Sie Ihren Wanikani API-Token ein, um zu beginnen.')).toBeInTheDocument();
    });

    it('does not render LevelSelector when no API token', () => {
        render(<RadicalsManagerRefactored />);
        expect(screen.queryByTestId('level-selector')).not.toBeInTheDocument();
    });

    it('does not render RadicalPreview when no API token', () => {
        render(<RadicalsManagerRefactored />);
        expect(screen.queryByTestId('radical-preview')).not.toBeInTheDocument();
    });

    it('does not render ProcessingControls when no API token', () => {
        render(<RadicalsManagerRefactored />);
        expect(screen.queryByTestId('processing-controls')).not.toBeInTheDocument();
    });

    it('renders LevelSelector when API token is provided', () => {
        mockUseRadicalsManager.mockReturnValue({
            ...defaultHookReturn,
            apiToken: 'test-token'
        });

        render(<RadicalsManagerRefactored />);
        expect(screen.getByTestId('level-selector')).toBeInTheDocument();
    });

    it('renders RadicalPreview when API token and radicals are available', () => {
        const mockRadicals = [
            { id: 1, characters: '一', meanings: [{ meaning: 'ground' }] },
            { id: 2, characters: '二', meanings: [{ meaning: 'two' }] }
        ];

        mockUseRadicalsManager.mockReturnValue({
            ...defaultHookReturn,
            apiToken: 'test-token',
            wkRadicals: mockRadicals,
            filteredRadicals: mockRadicals
        });

        render(<RadicalsManagerRefactored />);
        expect(screen.getByTestId('radical-preview')).toBeInTheDocument();
    });

    it('renders ProcessingControls when API token and radicals are available', () => {
        const mockRadicals = [
            { id: 1, characters: '一', meanings: [{ meaning: 'ground' }] }
        ];

        mockUseRadicalsManager.mockReturnValue({
            ...defaultHookReturn,
            apiToken: 'test-token',
            wkRadicals: mockRadicals,
            filteredRadicals: mockRadicals
        });

        render(<RadicalsManagerRefactored />);
        expect(screen.getByTestId('processing-controls')).toBeInTheDocument();
    });

    it('shows loading state when radicals are being loaded', () => {
        mockUseRadicalsManager.mockReturnValue({
            ...defaultHookReturn,
            apiToken: 'test-token',
            isLoadingRadicals: true
        });

        render(<RadicalsManagerRefactored />);
        expect(screen.getByText('Lade Radicals von Wanikani...')).toBeInTheDocument();
    });

    it('handles API token change', () => {
        const handleApiTokenChange = vi.fn();
        mockUseRadicalsManager.mockReturnValue({
            ...defaultHookReturn,
            handleApiTokenChange
        });

        render(<RadicalsManagerRefactored />);
        fireEvent.click(screen.getByTestId('set-api-token'));

        expect(handleApiTokenChange).toHaveBeenCalledWith('test-api-token');
    });

    it('handles DeepL token change', () => {
        const handleDeeplTokenChange = vi.fn();
        mockUseRadicalsManager.mockReturnValue({
            ...defaultHookReturn,
            handleDeeplTokenChange
        });

        render(<RadicalsManagerRefactored />);
        fireEvent.click(screen.getByTestId('set-deepl-token'));

        expect(handleDeeplTokenChange).toHaveBeenCalledWith('test-deepl-token');
    });

    it('handles level selection', () => {
        const setSelectedLevel = vi.fn();
        mockUseRadicalsManager.mockReturnValue({
            ...defaultHookReturn,
            apiToken: 'test-token',
            setSelectedLevel
        });

        render(<RadicalsManagerRefactored />);
        fireEvent.click(screen.getByTestId('select-level'));

        expect(setSelectedLevel).toHaveBeenCalledWith(5);
    });

    it('handles start processing', () => {
        const processTranslations = vi.fn();
        const mockRadicals = [
            { id: 1, characters: '一', meanings: [{ meaning: 'ground' }] }
        ];

        mockUseRadicalsManager.mockReturnValue({
            ...defaultHookReturn,
            apiToken: 'test-token',
            wkRadicals: mockRadicals,
            filteredRadicals: mockRadicals,
            processTranslations
        });

        render(<RadicalsManagerRefactored />);
        fireEvent.click(screen.getByTestId('start-processing'));

        expect(processTranslations).toHaveBeenCalledWith(mockRadicals);
    });

    it('handles stop processing', () => {
        const stopProcessing = vi.fn();
        const mockRadicals = [
            { id: 1, characters: '一', meanings: [{ meaning: 'ground' }] }
        ];

        mockUseRadicalsManager.mockReturnValue({
            ...defaultHookReturn,
            apiToken: 'test-token',
            wkRadicals: mockRadicals,
            filteredRadicals: mockRadicals,
            isProcessing: true,
            stopProcessing
        });

        render(<RadicalsManagerRefactored />);
        fireEvent.click(screen.getByTestId('stop-processing'));

        expect(stopProcessing).toHaveBeenCalled();
    });

    it('passes correct props to TokenManagement', () => {
        const mockHandlers = {
            handleApiTokenChange: vi.fn(),
            handleDeeplTokenChange: vi.fn()
        };

        mockUseRadicalsManager.mockReturnValue({
            ...defaultHookReturn,
            apiToken: 'test-api-token',
            deeplToken: 'test-deepl-token',
            synonymMode: 'replace',
            apiError: 'Test error',
            ...mockHandlers
        });

        render(<RadicalsManagerRefactored />);

        // Check that values are displayed
        expect(screen.getByTestId('api-token-display')).toHaveTextContent('test-api-token');
    });

    it('passes correct props to LevelSelector when rendered', () => {
        const setSelectedLevel = vi.fn();
        const setSynonymMode = vi.fn();

        mockUseRadicalsManager.mockReturnValue({
            ...defaultHookReturn,
            apiToken: 'test-token',
            selectedLevel: 10,
            synonymMode: 'replace',
            setSelectedLevel,
            setSynonymMode
        });

        render(<RadicalsManagerRefactored />);

        expect(screen.getByTestId('selected-level')).toHaveTextContent('10');
    });

    it('passes correct props to RadicalPreview when rendered', () => {
        const mockRadicals = [
            { id: 1, characters: '一', meanings: [{ meaning: 'ground' }] },
            { id: 2, characters: '二', meanings: [{ meaning: 'two' }] }
        ];

        const mockPreviewRadicals = [
            { id: 1, meaning: 'ground', characters: '一', level: 1, currentSynonyms: [], selected: false, translatedSynonyms: [] },
            { id: 2, meaning: 'two', characters: '二', level: 1, currentSynonyms: [], selected: false, translatedSynonyms: [] }
        ];

        mockUseRadicalsManager.mockReturnValue({
            ...defaultHookReturn,
            apiToken: 'test-token',
            wkRadicals: mockRadicals,
            previewRadicals: mockPreviewRadicals,
            currentLevelCount: 2
        });

        render(<RadicalsManagerRefactored />);

        expect(screen.getByTestId('radical-count')).toHaveTextContent('2 radicals');
    });

    it('does not render optional components when wkRadicals is empty', () => {
        mockUseRadicalsManager.mockReturnValue({
            ...defaultHookReturn,
            apiToken: 'test-token',
            wkRadicals: [],
            previewRadicals: [],
            currentLevelCount: 0
        });

        render(<RadicalsManagerRefactored />);

        expect(screen.queryByTestId('radical-preview')).not.toBeInTheDocument();
        expect(screen.queryByTestId('processing-controls')).not.toBeInTheDocument();
    });

    it('hides help text when API token is provided', () => {
        mockUseRadicalsManager.mockReturnValue({
            ...defaultHookReturn,
            apiToken: 'test-token'
        });

        render(<RadicalsManagerRefactored />);

        expect(screen.queryByText('🚀 Erste Schritte')).not.toBeInTheDocument();
        expect(screen.queryByText('Geben Sie Ihren Wanikani API-Token ein, um zu beginnen.')).not.toBeInTheDocument();
    });
});
