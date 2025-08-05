import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { RadicalsManager } from '../../components/RadicalsManager';

// Mock the external dependencies
vi.mock('../../lib/wanikani', () => ({
    getRadicals: vi.fn(),
    getRadicalStudyMaterials: vi.fn(),
    createRadicalSynonyms: vi.fn(),
    updateRadicalSynonyms: vi.fn(),
}));

vi.mock('../../lib/deepl', () => ({
    translateText: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

describe('RadicalsManager Component - Core Functionality', () => {
    const user = userEvent.setup();

    const mockRadicals = [
        {
            id: 1,
            object: 'radical',
            url: 'https://api.wanikani.com/v2/subjects/1',
            data_updated_at: '2024-01-01T00:00:00.000000Z',
            data: {
                level: 1,
                characters: '一',
                meanings: [{ meaning: 'Ground', primary: true, accepted_answer: true }],
                slug: 'ground',
                character_images: [],
                created_at: '2024-01-01T00:00:00.000000Z',
                document_url: 'https://www.wanikani.com/radicals/ground',
                hidden_at: null,
                lesson_position: 0,
                meaning_mnemonic: 'This radical represents ground.',
                spaced_repetition_system_id: 1,
                amalgamation_subject_ids: [],
                auxiliary_meanings: [],
            },
        },
        {
            id: 2,
            object: 'radical',
            url: 'https://api.wanikani.com/v2/subjects/2',
            data_updated_at: '2024-01-01T00:00:00.000000Z',
            data: {
                level: 1,
                characters: '人',
                meanings: [{ meaning: 'Person', primary: true, accepted_answer: true }],
                slug: 'person',
                character_images: [],
                created_at: '2024-01-01T00:00:00.000000Z',
                document_url: 'https://www.wanikani.com/radicals/person',
                hidden_at: null,
                lesson_position: 1,
                meaning_mnemonic: 'This radical represents person.',
                spaced_repetition_system_id: 1,
                amalgamation_subject_ids: [],
                auxiliary_meanings: [],
            },
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.getItem.mockReturnValue('');
    });

    describe('Initial Rendering', () => {
        it('should render the main title', () => {
            render(<RadicalsManager />);
            expect(screen.getByText('🌸 Radicals Manager')).toBeInTheDocument();
        });

        it('should render API token inputs', () => {
            render(<RadicalsManager />);
            expect(screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Geben Sie Ihren DeepL API Token ein...')).toBeInTheDocument();
        });
    });

    describe('Token Management', () => {
        it('should load radicals when valid Wanikani token is entered', async () => {
            const { getRadicals, getRadicalStudyMaterials } = await import('../../lib/wanikani');
            (getRadicals as any).mockResolvedValue(mockRadicals);
            (getRadicalStudyMaterials as any).mockResolvedValue([]);

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(tokenInput, 'test-token');

            await waitFor(() => {
                expect(screen.getByText(/2.*Radicals.*erfolgreich.*geladen/)).toBeInTheDocument();
            });
        });

        it('should save tokens to localStorage', async () => {
            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(tokenInput, 'test-token');

            await waitFor(() => {
                expect(localStorageMock.setItem).toHaveBeenCalledWith('wanikani-api-token', 'test-token');
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle API errors gracefully', async () => {
            const { getRadicals } = await import('../../lib/wanikani');
            (getRadicals as any).mockRejectedValue(new Error('API Error'));

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(tokenInput, 'invalid-token');

            await waitFor(() => {
                expect(screen.getByText(/Fehler beim Laden der Radicals/)).toBeInTheDocument();
            });
        });
    });

    describe('Level Selection', () => {
        it('should show level selection when radicals are loaded', async () => {
            const { getRadicals, getRadicalStudyMaterials } = await import('../../lib/wanikani');
            (getRadicals as any).mockResolvedValue(mockRadicals);
            (getRadicalStudyMaterials as any).mockResolvedValue([]);

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(tokenInput, 'test-token');

            await waitFor(() => {
                expect(screen.getByText('📊 Level Auswahl')).toBeInTheDocument();
                expect(screen.getByText(/Level.*1.*\(.*2.*Radicals.*\)/)).toBeInTheDocument();
            });
        });
    });

    describe('Processing Controls', () => {
        it('should enable processing when both tokens are provided', async () => {
            const { getRadicals, getRadicalStudyMaterials } = await import('../../lib/wanikani');
            (getRadicals as any).mockResolvedValue(mockRadicals);
            (getRadicalStudyMaterials as any).mockResolvedValue([]);

            render(<RadicalsManager />);

            const wkTokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            const deeplTokenInput = screen.getByPlaceholderText('Geben Sie Ihren DeepL API Token ein...');

            await user.type(wkTokenInput, 'test-wk-token');
            await user.type(deeplTokenInput, 'test-deepl-token');

            await waitFor(() => {
                const processButton = screen.getByText('Synonyme übersetzen und aktualisieren');
                expect(processButton).not.toBeDisabled();
            });
        });
    });
});
