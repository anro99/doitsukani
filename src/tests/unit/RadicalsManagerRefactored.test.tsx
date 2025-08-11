import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RadicalsManagerRefactored } from '../../components/RadicalsManagerRefactored';
import * as useRadicalsManagerHook from '../../hooks/useRadicalsManager';

// Mock the useRadicalsManager hook
vi.mock('../../hooks/useRadicalsManager');

// Mock child components
vi.mock('../../components/TokenManagement', () => ({
    TokenManagement: ({ onApiTokenChange, onDeeplTokenChange }: any) => (
        <div data-testid="token-management">
            <input
                data-testid="api-token-input"
                onChange={(e) => onApiTokenChange(e.target.value)}
            />
            <input
                data-testid="deepl-token-input"
                onChange={(e) => onDeeplTokenChange(e.target.value)}
            />
        </div>
    ),
}));

vi.mock('../../components/LevelSelector', () => ({
    LevelSelector: ({ selectedLevel, onLevelChange }: any) => (
        <div data-testid="level-selector">
            <select
                data-testid="level-select"
                value={selectedLevel}
                onChange={(e) => onLevelChange(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            >
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="all">All</option>
            </select>
        </div>
    ),
}));

vi.mock('../../components/ProcessingControls', () => ({
    ProcessingControls: ({ synonymMode, onSynonymModeChange, onProcess }: any) => (
        <div data-testid="processing-controls">
            <select
                data-testid="synonym-mode-select"
                value={synonymMode}
                onChange={(e) => onSynonymModeChange(e.target.value)}
            >
                <option value="smart-merge">Smart Merge</option>
                <option value="replace">Replace</option>
                <option value="delete">Delete</option>
            </select>
            <button data-testid="process-button" onClick={onProcess}>
                Process
            </button>
        </div>
    ),
}));

vi.mock('../../components/RadicalPreview', () => ({
    RadicalPreview: ({ radicals, uploadStats }: any) => (
        <div data-testid="radical-preview">
            <div data-testid="radicals-count">{radicals?.length || 0}</div>
            <div data-testid="upload-stats">
                Created: {uploadStats?.created || 0}, Updated: {uploadStats?.updated || 0}
            </div>
        </div>
    ),
}));

describe('RadicalsManagerRefactored Component', () => {
    const mockHookReturn = {
        // State
        apiToken: '',
        deeplToken: '',
        selectedLevel: 1 as const,
        synonymMode: 'smart-merge' as const,
        isProcessing: false,
        progress: 0,
        translationStatus: '',
        uploadStatus: '',
        uploadStats: {
            created: 0,
            updated: 0,
            failed: 0,
            skipped: 0,
            successful: 0
        },
        wkRadicals: [],
        studyMaterials: [],
        isLoadingRadicals: false,
        apiError: '',
        filteredRadicals: [],

        // Actions
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
        loadRadicalsFromAPI: vi.fn(),
        refreshStudyMaterials: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useRadicalsManagerHook.useRadicalsManager).mockReturnValue(mockHookReturn);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('should render all child components', () => {
            render(<RadicalsManagerRefactored />);

            expect(screen.getByTestId('token-management')).toBeInTheDocument();
            expect(screen.getByTestId('level-selector')).toBeInTheDocument();
            expect(screen.getByTestId('processing-controls')).toBeInTheDocument();
            expect(screen.getByTestId('radical-preview')).toBeInTheDocument();
        });

        it('should display loading state', () => {
            const hookWithLoading = {
                ...mockHookReturn,
                isLoadingRadicals: true
            };
            vi.mocked(useRadicalsManagerHook.useRadicalsManager).mockReturnValue(hookWithLoading);

            render(<RadicalsManagerRefactored />);

            expect(screen.getByText(/lädt radicals/i)).toBeInTheDocument();
        });

        it('should display API error', () => {
            const hookWithError = {
                ...mockHookReturn,
                apiError: 'API connection failed'
            };
            vi.mocked(useRadicalsManagerHook.useRadicalsManager).mockReturnValue(hookWithError);

            render(<RadicalsManagerRefactored />);

            expect(screen.getByText('API connection failed')).toBeInTheDocument();
        });

        it('should display processing progress', () => {
            const hookWithProcessing = {
                ...mockHookReturn,
                isProcessing: true,
                progress: 50,
                translationStatus: 'Processing translations...',
                uploadStatus: 'Uploading data...'
            };
            vi.mocked(useRadicalsManagerHook.useRadicalsManager).mockReturnValue(hookWithProcessing);

            render(<RadicalsManagerRefactored />);

            expect(screen.getByText('Processing translations...')).toBeInTheDocument();
            expect(screen.getByText('Uploading data...')).toBeInTheDocument();
            expect(screen.getByText('50%')).toBeInTheDocument();
        });
    });

    describe('Component Integration', () => {
        it('should pass correct props to TokenManagement', () => {
            const hookWithTokens = {
                ...mockHookReturn,
                apiToken: 'test-api-token',
                deeplToken: 'test-deepl-token'
            };
            vi.mocked(useRadicalsManagerHook.useRadicalsManager).mockReturnValue(hookWithTokens);

            render(<RadicalsManagerRefactored />);

            const apiTokenInput = screen.getByTestId('api-token-input');
            const deeplTokenInput = screen.getByTestId('deepl-token-input');

            // Test token changes
            fireEvent.change(apiTokenInput, { target: { value: 'new-api-token' } });
            expect(mockHookReturn.handleApiTokenChange).toHaveBeenCalledWith('new-api-token');

            fireEvent.change(deeplTokenInput, { target: { value: 'new-deepl-token' } });
            expect(mockHookReturn.handleDeeplTokenChange).toHaveBeenCalledWith('new-deepl-token');
        });

        it('should pass correct props to LevelSelector', () => {
            const hookWithLevel = {
                ...mockHookReturn,
                selectedLevel: 2 as const
            };
            vi.mocked(useRadicalsManagerHook.useRadicalsManager).mockReturnValue(hookWithLevel);

            render(<RadicalsManagerRefactored />);

            const levelSelect = screen.getByTestId('level-select');
            expect(levelSelect).toHaveValue('2');

            // Test level change
            fireEvent.change(levelSelect, { target: { value: 'all' } });
            expect(mockHookReturn.setSelectedLevel).toHaveBeenCalledWith('all');
        });

        it('should pass correct props to ProcessingControls', () => {
            const hookWithMode = {
                ...mockHookReturn,
                synonymMode: 'replace' as const
            };
            vi.mocked(useRadicalsManagerHook.useRadicalsManager).mockReturnValue(hookWithMode);

            render(<RadicalsManagerRefactored />);

            const synonymModeSelect = screen.getByTestId('synonym-mode-select');
            expect(synonymModeSelect).toHaveValue('replace');

            // Test synonym mode change
            fireEvent.change(synonymModeSelect, { target: { value: 'delete' } });
            expect(mockHookReturn.setSynonymMode).toHaveBeenCalledWith('delete');

            // Test process button
            const processButton = screen.getByTestId('process-button');
            fireEvent.click(processButton);
            expect(mockHookReturn.processTranslations).toHaveBeenCalled();
        });

        it('should pass correct props to RadicalPreview', () => {
            const mockRadicals = [
                { id: 1, meaning: 'Ground', level: 1, selected: true, currentSynonyms: [], translatedSynonyms: [], characters: '一' }
            ];
            const mockStats = {
                created: 5,
                updated: 3,
                failed: 1,
                skipped: 2,
                successful: 8
            };

            const hookWithData = {
                ...mockHookReturn,
                filteredRadicals: mockRadicals,
                uploadStats: mockStats
            };
            vi.mocked(useRadicalsManagerHook.useRadicalsManager).mockReturnValue(hookWithData);

            render(<RadicalsManagerRefactored />);

            expect(screen.getByTestId('radicals-count')).toHaveTextContent('1');
            expect(screen.getByTestId('upload-stats')).toHaveTextContent('Created: 5, Updated: 3');
        });
    });

    describe('State Management', () => {
        it('should handle processing state correctly', () => {
            const hookWithProcessing = {
                ...mockHookReturn,
                isProcessing: true,
                progress: 75
            };
            vi.mocked(useRadicalsManagerHook.useRadicalsManager).mockReturnValue(hookWithProcessing);

            render(<RadicalsManagerRefactored />);

            // Process button should be disabled during processing
            const processButton = screen.getByTestId('process-button');
            expect(processButton).toBeDisabled();
        });

        it('should handle empty radicals state', () => {
            const hookWithEmptyRadicals = {
                ...mockHookReturn,
                filteredRadicals: []
            };
            vi.mocked(useRadicalsManagerHook.useRadicalsManager).mockReturnValue(hookWithEmptyRadicals);

            render(<RadicalsManagerRefactored />);

            expect(screen.getByTestId('radicals-count')).toHaveTextContent('0');
        });

        it('should display upload statistics correctly', () => {
            const mockStats = {
                created: 10,
                updated: 5,
                failed: 2,
                skipped: 1,
                successful: 15
            };

            const hookWithStats = {
                ...mockHookReturn,
                uploadStats: mockStats
            };
            vi.mocked(useRadicalsManagerHook.useRadicalsManager).mockReturnValue(hookWithStats);

            render(<RadicalsManagerRefactored />);

            expect(screen.getByTestId('upload-stats')).toHaveTextContent('Created: 10, Updated: 5');
        });
    });

    describe('Error Handling', () => {
        it('should display API errors prominently', () => {
            const hookWithError = {
                ...mockHookReturn,
                apiError: 'Invalid API token'
            };
            vi.mocked(useRadicalsManagerHook.useRadicalsManager).mockReturnValue(hookWithError);

            render(<RadicalsManagerRefactored />);

            const errorElement = screen.getByText('Invalid API token');
            expect(errorElement).toBeInTheDocument();
            expect(errorElement).toHaveClass('text-red-600'); // Assuming Tailwind CSS classes
        });

        it('should handle missing tokens gracefully', () => {
            const hookWithoutTokens = {
                ...mockHookReturn,
                apiToken: '',
                deeplToken: ''
            };
            vi.mocked(useRadicalsManagerHook.useRadicalsManager).mockReturnValue(hookWithoutTokens);

            render(<RadicalsManagerRefactored />);

            // Component should still render without errors
            expect(screen.getByTestId('token-management')).toBeInTheDocument();
        });
    });

    describe('User Interactions', () => {
        it('should trigger processTranslations when process button is clicked', () => {
            const mockRadicals = [
                { id: 1, meaning: 'Ground', level: 1, selected: true, currentSynonyms: [], translatedSynonyms: [], characters: '一' }
            ];

            const hookWithRadicals = {
                ...mockHookReturn,
                filteredRadicals: mockRadicals
            };
            vi.mocked(useRadicalsManagerHook.useRadicalsManager).mockReturnValue(hookWithRadicals);

            render(<RadicalsManagerRefactored />);

            const processButton = screen.getByTestId('process-button');
            fireEvent.click(processButton);

            expect(mockHookReturn.processTranslations).toHaveBeenCalledWith(mockRadicals);
        });

        it('should prevent processing when already processing', () => {
            const hookWithProcessing = {
                ...mockHookReturn,
                isProcessing: true
            };
            vi.mocked(useRadicalsManagerHook.useRadicalsManager).mockReturnValue(hookWithProcessing);

            render(<RadicalsManagerRefactored />);

            const processButton = screen.getByTestId('process-button');
            expect(processButton).toBeDisabled();
        });

        it('should update all settings correctly', () => {
            render(<RadicalsManagerRefactored />);

            // Test all user interactions
            fireEvent.change(screen.getByTestId('api-token-input'), { target: { value: 'new-token' } });
            fireEvent.change(screen.getByTestId('deepl-token-input'), { target: { value: 'new-deepl' } });
            fireEvent.change(screen.getByTestId('level-select'), { target: { value: '2' } });
            fireEvent.change(screen.getByTestId('synonym-mode-select'), { target: { value: 'replace' } });

            expect(mockHookReturn.handleApiTokenChange).toHaveBeenCalledWith('new-token');
            expect(mockHookReturn.handleDeeplTokenChange).toHaveBeenCalledWith('new-deepl');
            expect(mockHookReturn.setSelectedLevel).toHaveBeenCalledWith(2);
            expect(mockHookReturn.setSynonymMode).toHaveBeenCalledWith('replace');
        });
    });
});
