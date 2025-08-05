import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

// Mock data
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
            meaning_mnemonic: 'This radical represents a person.',
            spaced_repetition_system_id: 1,
            amalgamation_subject_ids: [],
            auxiliary_meanings: [],
        },
    },
];

const mockStudyMaterials = [
    {
        id: 100,
        object: 'study_material',
        url: 'https://api.wanikani.com/v2/study_materials/100',
        data_updated_at: '2024-01-01T00:00:00.000000Z',
        data: {
            subject_id: 1,
            subject_type: 'radical',
            meaning_synonyms: ['soil', 'earth'],
            reading_note: null,
            meaning_note: null,
            created_at: '2024-01-01T00:00:00.000000Z',
            hidden: false,
        },
    },
];

describe('RadicalsManager Component', () => {
    const user = userEvent.setup();

    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.getItem.mockReturnValue('');
    });

    describe('Initial Rendering', () => {
        it('should render the main title and description', () => {
            render(<RadicalsManager />);

            expect(screen.getByText('🌸 Radicals Manager')).toBeInTheDocument();
            expect(screen.getByText('Verwalte und übersetze Wanikani Radicals mit DeepL')).toBeInTheDocument();
        });

        it('should render API token input fields', () => {
            render(<RadicalsManager />);

            expect(screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Geben Sie Ihren DeepL API Token ein...')).toBeInTheDocument();
        });

        it('should show help text when no API token is provided', () => {
            render(<RadicalsManager />);

            expect(screen.getByText('🌟 Erste Schritte')).toBeInTheDocument();
            expect(screen.getByText('Geben Sie Ihren Wanikani API-Token ein, um zu beginnen.')).toBeInTheDocument();
        });
    });

    describe('Token Management', () => {
        it('should save Wanikani API token to localStorage', async () => {
            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(tokenInput, 'test-wanikani-token');

            expect(localStorageMock.setItem).toHaveBeenCalledWith('wanikani-api-token', 'test-wanikani-token');
        });

        it('should save DeepL API token to localStorage', async () => {
            render(<RadicalsManager />);

            const deeplTokenInput = screen.getByPlaceholderText('Geben Sie Ihren DeepL API Token ein...');
            await user.type(deeplTokenInput, 'test-deepl-token');

            expect(localStorageMock.setItem).toHaveBeenCalledWith('deepl-api-token', 'test-deepl-token');
        });

        it('should remove token from localStorage when cleared', async () => {
            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(tokenInput, 'test-token');
            await user.clear(tokenInput);

            expect(localStorageMock.removeItem).toHaveBeenCalledWith('wanikani-api-token');
        });

        it('should load tokens from localStorage on component mount', () => {
            localStorageMock.getItem.mockImplementation((key) => {
                if (key === 'wanikani-api-token') return 'saved-wanikani-token';
                if (key === 'deepl-api-token') return 'saved-deepl-token';
                return '';
            });

            render(<RadicalsManager />);

            expect(screen.getByDisplayValue('saved-wanikani-token')).toBeInTheDocument();
            expect(screen.getByDisplayValue('saved-deepl-token')).toBeInTheDocument();
        });
    });

    describe('Level Selection', () => {
        it('should show level selection when radicals are loaded', async () => {
            const { getRadicals } = await import('../../lib/wanikani');
            (getRadicals as any).mockResolvedValue(mockRadicals);

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(tokenInput, 'test-token');

            await waitFor(() => {
                expect(screen.getByText('📊 Level Auswahl')).toBeInTheDocument();
            });
        });

        it('should filter radicals by selected level', async () => {
            const { getRadicals } = await import('../../lib/wanikani');
            (getRadicals as any).mockResolvedValue(mockRadicals);

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(tokenInput, 'test-token');

            await waitFor(() => {
                expect(screen.getByText(/Level.*1.*\(.*2.*Radicals.*\)/)).toBeInTheDocument();
            });
        });

        it('should change level selection', async () => {
            const { getRadicals, getRadicalStudyMaterials } = await import('../../lib/wanikani');
            (getRadicals as any).mockResolvedValue(mockRadicals);
            (getRadicalStudyMaterials as any).mockResolvedValue([]);

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(tokenInput, 'test-token');

            // Wait for the data to load and level section to appear
            await waitFor(() => {
                expect(screen.getByText('📊 Level Auswahl')).toBeInTheDocument();
            });

            // Find the level select element and change it to 'all'
            const levelSelect = screen.getByRole('combobox', { name: /Level auswählen/ });
            fireEvent.change(levelSelect, { target: { value: 'all' } });

            // Wait for the change to be reflected
            await waitFor(() => {
                expect(screen.getByText(/Alle.*Level.*\(.*2.*Radicals.*\)/)).toBeInTheDocument();
            });
        });
    });

    describe('Synonym Mode Selection', () => {
        it('should show synonym mode options when radicals are loaded', async () => {
            const { getRadicals } = await import('../../lib/wanikani');
            (getRadicals as any).mockResolvedValue(mockRadicals);

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(tokenInput, 'test-token');

            await waitFor(() => {
                expect(screen.getByText('⚙️ Synonym Modus')).toBeInTheDocument();
                expect(screen.getByRole('radio', { name: /Smart Merge/ })).toBeInTheDocument();
                expect(screen.getByRole('radio', { name: /Ersetzen/ })).toBeInTheDocument();
                expect(screen.getByRole('radio', { name: /Löschen/ })).toBeInTheDocument();
            });
        });

        it('should default to smart-merge mode', async () => {
            const { getRadicals, getRadicalStudyMaterials } = await import('../../lib/wanikani');
            (getRadicals as any).mockResolvedValue(mockRadicals);
            (getRadicalStudyMaterials as any).mockResolvedValue([]);

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(tokenInput, 'test-token');

            await waitFor(() => {
                expect(screen.getByText('⚙️ Synonym Modus')).toBeInTheDocument();
            });

            // Check that smart-merge is selected by default
            const smartMergeRadio = screen.getByRole('radio', { name: /Smart Merge/ });
            expect(smartMergeRadio).toBeChecked();
        });

        it('should change synonym mode', async () => {
            const { getRadicals, getRadicalStudyMaterials } = await import('../../lib/wanikani');
            (getRadicals as any).mockResolvedValue(mockRadicals);
            (getRadicalStudyMaterials as any).mockResolvedValue([]);

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(tokenInput, 'test-token');

            await waitFor(() => {
                expect(screen.getByText('⚙️ Synonym Modus')).toBeInTheDocument();
            });

            // Change to delete mode
            const deleteRadio = screen.getByRole('radio', { name: /Löschen/ });
            await user.click(deleteRadio);
            expect(deleteRadio).toBeChecked();
        });
    });

    describe('Radicals Preview', () => {
        it('should show radicals preview when data is loaded', async () => {
            const { getRadicals, getRadicalStudyMaterials } = await import('../../lib/wanikani');
            (getRadicals as any).mockResolvedValue(mockRadicals);
            (getRadicalStudyMaterials as any).mockResolvedValue(mockStudyMaterials);

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(tokenInput, 'test-token');

            await waitFor(() => {
                expect(screen.getByText('👁️ Radicals Vorschau')).toBeInTheDocument();
                expect(screen.getByText('Ground')).toBeInTheDocument();
                expect(screen.getByText('Person')).toBeInTheDocument();
            });
        });

        it('should display current synonyms for radicals', async () => {
            const { getRadicals, getRadicalStudyMaterials } = await import('../../lib/wanikani');
            (getRadicals as any).mockResolvedValue(mockRadicals);
            (getRadicalStudyMaterials as any).mockResolvedValue(mockStudyMaterials);

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(tokenInput, 'test-token');

            await waitFor(() => {
                expect(screen.getByText('soil')).toBeInTheDocument();
                expect(screen.getByText('earth')).toBeInTheDocument();
            });
        });
    });

    describe('Processing Controls', () => {
        it('should show processing button when data is loaded', async () => {
            const { getRadicals } = await import('../../lib/wanikani');
            (getRadicals as any).mockResolvedValue(mockRadicals);

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            const deeplTokenInput = screen.getByPlaceholderText('Geben Sie Ihren DeepL API Token ein...');

            await user.type(tokenInput, 'test-wanikani-token');
            await user.type(deeplTokenInput, 'test-deepl-token');

            await waitFor(() => {
                expect(screen.getByText('Synonyme übersetzen und aktualisieren')).toBeInTheDocument();
            });
        });

        it('should disable processing button when no DeepL token for translation modes', async () => {
            const { getRadicals } = await import('../../lib/wanikani');
            (getRadicals as any).mockResolvedValue(mockRadicals);

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(tokenInput, 'test-wanikani-token');

            await waitFor(() => {
                const processButton = screen.getByText('Synonyme übersetzen und aktualisieren');
                expect(processButton).toBeDisabled();
            });
        });

        it('should enable processing button for delete mode without DeepL token', async () => {
            const { getRadicals } = await import('../../lib/wanikani');
            (getRadicals as any).mockResolvedValue(mockRadicals);

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(tokenInput, 'test-wanikani-token');

            await waitFor(() => {
                expect(screen.getByText('⚙️ Synonym Modus')).toBeInTheDocument();
            });

            // Switch to delete mode
            const deleteRadio = screen.getByRole('radio', { name: /Löschen/ });
            await user.click(deleteRadio);

            await waitFor(() => {
                const processButton = screen.getByText('Synonyme übersetzen und aktualisieren');
                expect(processButton).not.toBeDisabled();
            });
        });
    });

    describe('Error Handling', () => {
        it('should show error when API call fails', async () => {
            const { getRadicals } = await import('../../lib/wanikani');
            (getRadicals as any).mockRejectedValue(new Error('API Error'));

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(tokenInput, 'invalid-token');

            await waitFor(() => {
                expect(screen.getByText(/Fehler beim Laden der Radicals/)).toBeInTheDocument();
            });
        });

        it('should show loading state while fetching radicals', async () => {
            const { getRadicals } = await import('../../lib/wanikani');
            (getRadicals as any).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockRadicals), 100)));

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(tokenInput, 'test-token');

            expect(screen.getByText('🔄 Lade Radicals von Wanikani...')).toBeInTheDocument();

            await waitFor(() => {
                expect(screen.queryByText('🔄 Lade Radicals von Wanikani...')).not.toBeInTheDocument();
            });
        });
    });

    describe('Translation Processing', () => {
        it('should call translation API when processing starts', async () => {
            const { getRadicals, getRadicalStudyMaterials } = await import('../../lib/wanikani');
            const { translateText } = await import('../../lib/deepl');

            (getRadicals as any).mockResolvedValue(mockRadicals);
            (getRadicalStudyMaterials as any).mockResolvedValue([]);
            (translateText as any).mockResolvedValue('Boden');

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            const deeplTokenInput = screen.getByPlaceholderText('Geben Sie Ihren DeepL API Token ein...');

            await user.type(tokenInput, 'test-wanikani-token');
            await user.type(deeplTokenInput, 'test-deepl-token');

            await waitFor(async () => {
                const processButton = screen.getByText('Synonyme übersetzen und aktualisieren');
                await user.click(processButton);

                expect(translateText).toHaveBeenCalledWith('test-deepl-token', 'Ground', 'DE', false);
            });
        });
    });
});
