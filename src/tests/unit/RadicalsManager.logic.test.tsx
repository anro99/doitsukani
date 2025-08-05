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

describe('RadicalsManager - Advanced Logic Tests', () => {
    const user = userEvent.setup();

    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.getItem.mockReturnValue('');
    });

    describe('Synonym Mode Logic', () => {
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
        ];

        const mockStudyMaterialsWithSynonyms = [
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

        it('should apply smart-merge logic correctly', async () => {
            const { getRadicals, getRadicalStudyMaterials, updateRadicalSynonyms } = await import('../../lib/wanikani');
            const { translateText } = await import('../../lib/deepl');

            (getRadicals as any).mockResolvedValue(mockRadicals);
            (getRadicalStudyMaterials as any).mockResolvedValue(mockStudyMaterialsWithSynonyms);
            (translateText as any).mockResolvedValue('Boden');
            (updateRadicalSynonyms as any).mockResolvedValue({});

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            const deeplTokenInput = screen.getByPlaceholderText('Geben Sie Ihren DeepL API Token ein...');

            await user.type(tokenInput, 'test-wanikani-token');
            await user.type(deeplTokenInput, 'test-deepl-token');

            await waitFor(() => {
                expect(screen.getByText('⚙️ Synonym Modus')).toBeInTheDocument();
            });

            // Should be in smart-merge mode by default
            const smartMergeRadio = screen.getByRole('radio', { name: /Smart Merge/ });
            expect(smartMergeRadio).toBeChecked();

            const processButton = screen.getByText('Synonyme übersetzen und aktualisieren');
            await user.click(processButton);

            // Should add new synonym while keeping existing ones
            await waitFor(() => {
                expect(updateRadicalSynonyms).toHaveBeenCalledWith(
                    'test-wanikani-token',
                    100,
                    ['soil', 'earth', 'Boden']
                );
            });
        });

        it('should apply replace mode correctly', async () => {
            const { getRadicals, getRadicalStudyMaterials, updateRadicalSynonyms } = await import('../../lib/wanikani');
            const { translateText } = await import('../../lib/deepl');

            (getRadicals as any).mockResolvedValue(mockRadicals);
            (getRadicalStudyMaterials as any).mockResolvedValue(mockStudyMaterialsWithSynonyms);
            (translateText as any).mockResolvedValue('Boden');
            (updateRadicalSynonyms as any).mockResolvedValue({});

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            const deeplTokenInput = screen.getByPlaceholderText('Geben Sie Ihren DeepL API Token ein...');

            await user.type(tokenInput, 'test-wanikani-token');
            await user.type(deeplTokenInput, 'test-deepl-token');

            await waitFor(() => {
                expect(screen.getByText('⚙️ Synonym Modus')).toBeInTheDocument();
            });

            const replaceRadio = screen.getByRole('radio', { name: /Ersetzen/ });
            await user.click(replaceRadio);

            const processButton = screen.getByText('Synonyme übersetzen und aktualisieren');
            await user.click(processButton);

            // Should replace all synonyms with new translation
            await waitFor(() => {
                expect(updateRadicalSynonyms).toHaveBeenCalledWith(
                    'test-wanikani-token',
                    100,
                    ['Boden']
                );
            });
        });

        it('should apply delete mode correctly', async () => {
            const { getRadicals, getRadicalStudyMaterials, updateRadicalSynonyms } = await import('../../lib/wanikani');

            (getRadicals as any).mockResolvedValue(mockRadicals);
            (getRadicalStudyMaterials as any).mockResolvedValue(mockStudyMaterialsWithSynonyms);
            (updateRadicalSynonyms as any).mockResolvedValue({});

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(tokenInput, 'test-wanikani-token');

            await waitFor(() => {
                expect(screen.getByText('⚙️ Synonym Modus')).toBeInTheDocument();
            });

            const deleteRadio = screen.getByRole('radio', { name: /Löschen/ });
            await user.click(deleteRadio);

            const processButton = screen.getByText('Synonyme übersetzen und aktualisieren');
            await user.click(processButton);

            // Should clear all synonyms (empty array)
            await waitFor(() => {
                expect(updateRadicalSynonyms).toHaveBeenCalledWith(
                    'test-wanikani-token',
                    100,
                    []
                );
            });
        });
    });

    describe('Level Filtering Logic', () => {
        const mockRadicalsMultipleLevels = [
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
                    level: 2,
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
            {
                id: 3,
                object: 'radical',
                url: 'https://api.wanikani.com/v2/subjects/3',
                data_updated_at: '2024-01-01T00:00:00.000000Z',
                data: {
                    level: 1,
                    characters: '口',
                    meanings: [{ meaning: 'Mouth', primary: true, accepted_answer: true }],
                    slug: 'mouth',
                    character_images: [],
                    created_at: '2024-01-01T00:00:00.000000Z',
                    document_url: 'https://www.wanikani.com/radicals/mouth',
                    hidden_at: null,
                    lesson_position: 2,
                    meaning_mnemonic: 'This radical represents mouth.',
                    spaced_repetition_system_id: 1,
                    amalgamation_subject_ids: [],
                    auxiliary_meanings: [],
                },
            },
        ];

        it('should filter radicals by specific level', async () => {
            const { getRadicals } = await import('../../lib/wanikani');
            (getRadicals as any).mockResolvedValue(mockRadicalsMultipleLevels);

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(tokenInput, 'test-token');

            await waitFor(() => {
                expect(screen.getByText(/Level.*1.*\(.*2.*Radicals.*\)/)).toBeInTheDocument();
            });
        });

        it('should show all radicals when "all" is selected', async () => {
            const { getRadicals } = await import('../../lib/wanikani');
            (getRadicals as any).mockResolvedValue(mockRadicalsMultipleLevels);

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(tokenInput, 'test-token');

            await waitFor(() => {
                expect(screen.getByText('📊 Level Auswahl')).toBeInTheDocument();
            });

            const levelSelect = screen.getByLabelText(/Level auswählen/);
            await user.selectOptions(levelSelect, 'all');

            await waitFor(() => {
                expect(screen.getByText(/Alle.*Level.*\(.*3.*Radicals.*\)/)).toBeInTheDocument();
            });
        });
    });

    describe('Data Conversion Logic', () => {
        it('should correctly convert Wanikani data to internal format', async () => {
            const { getRadicals, getRadicalStudyMaterials } = await import('../../lib/wanikani');

            const mockWKRadicals = [
                {
                    id: 1,
                    object: 'radical',
                    url: 'https://api.wanikani.com/v2/subjects/1',
                    data_updated_at: '2024-01-01T00:00:00.000000Z',
                    data: {
                        level: 1,
                        characters: '一',
                        meanings: [
                            { meaning: 'Ground', primary: true, accepted_answer: true },
                            { meaning: 'Floor', primary: false, accepted_answer: true }
                        ],
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

            (getRadicals as any).mockResolvedValue(mockWKRadicals);
            (getRadicalStudyMaterials as any).mockResolvedValue(mockStudyMaterials);

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(tokenInput, 'test-token');

            await waitFor(() => {
                // Should use primary meaning
                expect(screen.getByText('Ground')).toBeInTheDocument();
                // Should display synonyms from study materials
                expect(screen.getByText('soil')).toBeInTheDocument();
                expect(screen.getByText('earth')).toBeInTheDocument();
            });
        });
    });

    describe('Progress and Status Updates', () => {
        it('should show progress during processing', async () => {
            const { getRadicals, getRadicalStudyMaterials } = await import('../../lib/wanikani');
            const { translateText } = await import('../../lib/deepl');

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
            ];

            (getRadicals as any).mockResolvedValue(mockRadicals);
            (getRadicalStudyMaterials as any).mockResolvedValue([]);
            (translateText as any).mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve('Boden'), 100))
            );

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            const deeplTokenInput = screen.getByPlaceholderText('Geben Sie Ihren DeepL API Token ein...');

            await user.type(tokenInput, 'test-wanikani-token');
            await user.type(deeplTokenInput, 'test-deepl-token');

            const processButton = screen.getByText('Synonyme übersetzen und aktualisieren');
            await user.click(processButton);

            // Should show processing status
            await waitFor(() => {
                expect(screen.getByText('Verarbeitung läuft...')).toBeInTheDocument();
            });

            // Should show progress bar
            await waitFor(() => {
                expect(screen.getByRole('progressbar')).toBeInTheDocument();
            });
        });

        it('should show upload statistics', async () => {
            const { getRadicals, getRadicalStudyMaterials, createRadicalSynonyms } = await import('../../lib/wanikani');
            const { translateText } = await import('../../lib/deepl');

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
            ];

            (getRadicals as any).mockResolvedValue(mockRadicals);
            (getRadicalStudyMaterials as any).mockResolvedValue([]);
            (translateText as any).mockResolvedValue('Boden');
            (createRadicalSynonyms as any).mockResolvedValue({});

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            const deeplTokenInput = screen.getByPlaceholderText('Geben Sie Ihren DeepL API Token ein...');

            await user.type(tokenInput, 'test-wanikani-token');
            await user.type(deeplTokenInput, 'test-deepl-token');

            const processButton = screen.getByText('Synonyme übersetzen und aktualisieren');
            await user.click(processButton);

            // Should eventually show success statistics
            await waitFor(() => {
                expect(screen.getAllByText(/Erstellt: 1/)[0]).toBeInTheDocument();
            }, { timeout: 5000 });
        });
    });

    describe('Error Recovery', () => {
        it('should handle translation errors gracefully', async () => {
            const { getRadicals, getRadicalStudyMaterials } = await import('../../lib/wanikani');
            const { translateText } = await import('../../lib/deepl');

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
            ];

            (getRadicals as any).mockResolvedValue(mockRadicals);
            (getRadicalStudyMaterials as any).mockResolvedValue([]);
            (translateText as any).mockRejectedValue(new Error('Translation failed'));

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            const deeplTokenInput = screen.getByPlaceholderText('Geben Sie Ihren DeepL API Token ein...');

            await user.type(tokenInput, 'test-wanikani-token');
            await user.type(deeplTokenInput, 'test-deepl-token');

            const processButton = screen.getByText('Synonyme übersetzen und aktualisieren');
            await user.click(processButton);

            // Should show error in results
            await waitFor(() => {
                expect(screen.getByText(/Übersetzungsfehler/)).toBeInTheDocument();
            });
        });

        it('should continue processing other radicals after one fails', async () => {
            const { getRadicals, getRadicalStudyMaterials } = await import('../../lib/wanikani');
            const { translateText } = await import('../../lib/deepl');

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

            (getRadicals as any).mockResolvedValue(mockRadicals);
            (getRadicalStudyMaterials as any).mockResolvedValue([]);
            (translateText as any)
                .mockResolvedValueOnce('Boden')  // First succeeds
                .mockRejectedValueOnce(new Error('Translation failed'));  // Second fails

            render(<RadicalsManager />);

            const tokenInput = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            const deeplTokenInput = screen.getByPlaceholderText('Geben Sie Ihren DeepL API Token ein...');

            await user.type(tokenInput, 'test-wanikani-token');
            await user.type(deeplTokenInput, 'test-deepl-token');

            const processButton = screen.getByText('Synonyme übersetzen und aktualisieren');
            await user.click(processButton);

            // Should show both success and error results
            await waitFor(() => {
                expect(screen.getAllByText('Ground')[0]).toBeInTheDocument();
                expect(screen.getAllByText('Person')[0]).toBeInTheDocument();
                expect(screen.getByText(/Übersetzungsfehler/)).toBeInTheDocument();
            });
        });
    });
});
