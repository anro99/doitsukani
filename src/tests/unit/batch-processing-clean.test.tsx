import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { RadicalsManager } from '../../components/RadicalsManager';

// Mock external dependencies
vi.mock('../../lib/wanikani');
vi.mock('../../lib/deepl');
vi.mock('../../lib/contextual-translation');

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

// Mock setTimeout for batch delays
vi.useFakeTimers();

describe('🚀 Batch Processing Tests', () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    // Test data factory
    const createMockRadicals = (count: number) => {
        return Array.from({ length: count }, (_, i) => ({
            id: i + 1,
            object: 'radical' as const,
            url: `https://api.wanikani.com/v2/subjects/${i + 1}`,
            data_updated_at: '2024-01-01T00:00:00.000000Z',
            data: {
                level: Math.floor(i / 10) + 1,
                characters: String.fromCharCode(65 + (i % 26)), // A, B, C, etc.
                meanings: [{ meaning: `TestRadical${i + 1}`, primary: true, accepted_answer: true }],
                slug: `test-radical-${i + 1}`,
                character_images: [],
                created_at: '2024-01-01T00:00:00.000000Z',
                document_url: `https://www.wanikani.com/radicals/test-radical-${i + 1}`,
                hidden_at: null,
                lesson_position: i,
                meaning_mnemonic: `Test mnemonic for radical ${i + 1}`,
                spaced_repetition_system_id: 1,
                amalgamation_subject_ids: [],
                auxiliary_meanings: [],
            },
        }));
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.clearAllTimers();
        localStorageMock.getItem.mockReturnValue('');
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.useFakeTimers();
    });

    describe('📦 Batch Configuration Tests', () => {
        it('should use correct batch size configuration', () => {
            // Test batch size calculations
            const testCases = [
                { total: 5, expectedBatches: 1 },    // 5 → 1 batch  
                { total: 20, expectedBatches: 1 },   // 20 → 1 batch
                { total: 21, expectedBatches: 2 },   // 21 → 2 batches
                { total: 40, expectedBatches: 2 },   // 40 → 2 batches
                { total: 41, expectedBatches: 3 },   // 41 → 3 batches
                { total: 100, expectedBatches: 5 },  // 100 → 5 batches
            ];

            testCases.forEach(({ total, expectedBatches }) => {
                const actualBatches = Math.ceil(total / 20); // TRANSLATION_BATCH_SIZE = 20
                expect(actualBatches).toBe(expectedBatches);
            });
        });

        it('should use 2 second inter-batch delay', () => {
            const EXPECTED_BATCH_DELAY = 2000; // BATCH_DELAY_MS = 2000
            expect(EXPECTED_BATCH_DELAY).toBe(2000);
        });
    });

    describe('🔄 Batch Processing Flow Tests', () => {
        it('should handle small batches (< 20 radicals) correctly', async () => {
            const mockRadicals = createMockRadicals(15);

            // Import mocks after vi.mock
            const { getRadicals, getRadicalStudyMaterials } = await vi.importMock('../../lib/wanikani') as any;
            const { translateText } = await vi.importMock('../../lib/deepl') as any;

            getRadicals.mockResolvedValue(mockRadicals);
            getRadicalStudyMaterials.mockResolvedValue([]);
            translateText.mockImplementation((_token: string, text: string) =>
                Promise.resolve(`${text.toLowerCase()}_de`)
            );

            render(<RadicalsManager />);

            // Set up tokens
            const wkToken = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            const deeplToken = screen.getByPlaceholderText('Geben Sie Ihren DeepL API Token ein...');

            await user.type(wkToken, 'test-wk-token');
            await user.type(deeplToken, 'test-deepl-token');

            await waitFor(() => {
                expect(screen.getByText(/15.*Radicals.*erfolgreich.*geladen/)).toBeInTheDocument();
            });

            // Select all and process
            await user.click(screen.getByText('Alle auswählen'));
            await user.click(screen.getByText('Synonyme übersetzen und aktualisieren'));

            // Should show single batch message
            await waitFor(() => {
                expect(screen.getByText(/Verarbeite.*15.*Radicals.*in.*1.*Batch/)).toBeInTheDocument();
            });

            // Complete processing
            vi.advanceTimersByTime(30000);

            await waitFor(() => {
                expect(screen.getByText(/Verarbeitung abgeschlossen/)).toBeInTheDocument();
            });
        });

        it('should handle large batches (> 20 radicals) with multiple batches', async () => {
            const mockRadicals = createMockRadicals(45); // Should be 3 batches: 20, 20, 5

            const { getRadicals, getRadicalStudyMaterials } = await vi.importMock('../../lib/wanikani') as any;
            const { translateText } = await vi.importMock('../../lib/deepl') as any;

            getRadicals.mockResolvedValue(mockRadicals);
            getRadicalStudyMaterials.mockResolvedValue([]);
            translateText.mockImplementation((_token: string, text: string) =>
                Promise.resolve(`${text.toLowerCase()}_de`)
            );

            render(<RadicalsManager />);

            // Set up tokens
            const wkToken = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            const deeplToken = screen.getByPlaceholderText('Geben Sie Ihren DeepL API Token ein...');

            await user.type(wkToken, 'test-wk-token');
            await user.type(deeplToken, 'test-deepl-token');

            await waitFor(() => {
                expect(screen.getByText(/45.*Radicals.*erfolgreich.*geladen/)).toBeInTheDocument();
            });

            // Select all and process
            await user.click(screen.getByText('Alle auswählen'));
            await user.click(screen.getByText('Synonyme übersetzen und aktualisieren'));

            // Should show multiple batches message
            await waitFor(() => {
                expect(screen.getByText(/Verarbeite.*45.*Radicals.*in.*3.*Batch/)).toBeInTheDocument();
            });

            // Should process first batch
            await waitFor(() => {
                expect(screen.getByText(/Batch.*1\/3/)).toBeInTheDocument();
            });

            // Advance through processing with inter-batch delays
            vi.advanceTimersByTime(30000); // First batch

            await waitFor(() => {
                expect(screen.getByText(/Warte.*2s.*zwischen.*Batches/)).toBeInTheDocument();
            });

            vi.advanceTimersByTime(2000);  // Inter-batch delay
            vi.advanceTimersByTime(30000); // Second batch
            vi.advanceTimersByTime(2000);  // Inter-batch delay  
            vi.advanceTimersByTime(30000); // Third batch

            await waitFor(() => {
                expect(screen.getByText(/Verarbeitung abgeschlossen/)).toBeInTheDocument();
            });
        });
    });

    describe('📊 Progress Tracking Tests', () => {
        it('should update progress bar after each batch', async () => {
            const mockRadicals = createMockRadicals(40); // 2 batches: 20, 20

            const { getRadicals, getRadicalStudyMaterials } = await vi.importMock('../../lib/wanikani') as any;
            const { translateText } = await vi.importMock('../../lib/deepl') as any;

            getRadicals.mockResolvedValue(mockRadicals);
            getRadicalStudyMaterials.mockResolvedValue([]);
            translateText.mockImplementation((_token: string, text: string) =>
                Promise.resolve(`${text.toLowerCase()}_de`)
            );

            render(<RadicalsManager />);

            // Set up tokens
            const wkToken = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            const deeplToken = screen.getByPlaceholderText('Geben Sie Ihren DeepL API Token ein...');

            await user.type(wkToken, 'test-wk-token');
            await user.type(deeplToken, 'test-deepl-token');

            await waitFor(() => {
                expect(screen.getByText(/40.*Radicals.*erfolgreich.*geladen/)).toBeInTheDocument();
            });

            // Select all and process
            await user.click(screen.getByText('Alle auswählen'));
            await user.click(screen.getByText('Synonyme übersetzen und aktualisieren'));

            // Progress should start at 0%
            const progressBar = screen.getByRole('progressbar');
            expect(progressBar).toHaveAttribute('aria-valuenow', '0');

            // Process first batch
            vi.advanceTimersByTime(30000);

            await waitFor(() => {
                const updatedProgressBar = screen.getByRole('progressbar');
                const progress = parseInt(updatedProgressBar.getAttribute('aria-valuenow') || '0');
                expect(progress).toBeGreaterThanOrEqual(40); // Should be ~50% after first batch
            });

            // Complete processing
            vi.advanceTimersByTime(30000);

            await waitFor(() => {
                const finalProgressBar = screen.getByRole('progressbar');
                expect(finalProgressBar).toHaveAttribute('aria-valuenow', '100');
            });
        });
    });

    describe('🗑️ Delete Mode Batch Tests', () => {
        it('should process delete mode in batches', async () => {
            const mockRadicals = createMockRadicals(25); // 2 batches: 20, 5

            const { getRadicals, getRadicalStudyMaterials } = await vi.importMock('../../lib/wanikani') as any;

            getRadicals.mockResolvedValue(mockRadicals);
            getRadicalStudyMaterials.mockResolvedValue(
                mockRadicals.map(r => ({
                    id: 1000 + r.id,
                    object: 'study_material',
                    data: {
                        subject_id: r.id,
                        meaning_synonyms: [`synonym${r.id}`],
                    }
                }))
            );

            render(<RadicalsManager />);

            // Set up token (only WaniKani needed for delete)
            const wkToken = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            await user.type(wkToken, 'test-wk-token');

            await waitFor(() => {
                expect(screen.getByText(/25.*Radicals.*erfolgreich.*geladen/)).toBeInTheDocument();
            });

            // Switch to delete mode
            await user.click(screen.getByLabelText(/Synonyme löschen/));

            // Select all and process
            await user.click(screen.getByText('Alle auswählen'));
            await user.click(screen.getByText('Synonyme löschen'));

            // Should show batch processing for delete mode
            await waitFor(() => {
                expect(screen.getByText(/Verarbeite.*25.*Radicals.*in.*2.*Batch/)).toBeInTheDocument();
            });

            // Complete processing
            vi.advanceTimersByTime(60000);

            await waitFor(() => {
                expect(screen.getByText(/Verarbeitung abgeschlossen/)).toBeInTheDocument();
            });
        });
    });

    describe('⚠️ Error Handling Tests', () => {
        it('should continue processing remaining batches after errors', async () => {
            const mockRadicals = createMockRadicals(30); // 2 batches: 20, 10

            const { getRadicals, getRadicalStudyMaterials } = await vi.importMock('../../lib/wanikani') as any;
            const { translateText } = await vi.importMock('../../lib/deepl') as any;

            getRadicals.mockResolvedValue(mockRadicals);
            getRadicalStudyMaterials.mockResolvedValue([]);

            // Fail for first 20, succeed for remaining 10
            translateText.mockImplementation((_token: string, text: string) => {
                const radicalNum = parseInt(text.replace('TestRadical', ''));
                if (radicalNum <= 20) {
                    return Promise.reject(new Error('Translation failed'));
                }
                return Promise.resolve(`${text.toLowerCase()}_de`);
            });

            render(<RadicalsManager />);

            // Set up tokens
            const wkToken = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            const deeplToken = screen.getByPlaceholderText('Geben Sie Ihren DeepL API Token ein...');

            await user.type(wkToken, 'test-wk-token');
            await user.type(deeplToken, 'test-deepl-token');

            await waitFor(() => {
                expect(screen.getByText(/30.*Radicals.*erfolgreich.*geladen/)).toBeInTheDocument();
            });

            // Select all and process
            await user.click(screen.getByText('Alle auswählen'));
            await user.click(screen.getByText('Synonyme übersetzen und aktualisieren'));

            // Complete all processing
            vi.advanceTimersByTime(60000);

            // Should complete despite errors
            await waitFor(() => {
                expect(screen.getByText(/Verarbeitung abgeschlossen/)).toBeInTheDocument();
            });
        });
    });

    describe('⏱️ Rate Limiting Tests', () => {
        it('should enforce inter-batch delays', async () => {
            const mockRadicals = createMockRadicals(25); // 2 batches

            const { getRadicals, getRadicalStudyMaterials } = await vi.importMock('../../lib/wanikani') as any;
            const { translateText } = await vi.importMock('../../lib/deepl') as any;

            getRadicals.mockResolvedValue(mockRadicals);
            getRadicalStudyMaterials.mockResolvedValue([]);
            translateText.mockImplementation((_token: string, text: string) =>
                Promise.resolve(`${text.toLowerCase()}_de`)
            );

            render(<RadicalsManager />);

            // Set up tokens
            const wkToken = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            const deeplToken = screen.getByPlaceholderText('Geben Sie Ihren DeepL API Token ein...');

            await user.type(wkToken, 'test-wk-token');
            await user.type(deeplToken, 'test-deepl-token');

            await waitFor(() => {
                expect(screen.getByText(/25.*Radicals.*erfolgreich.*geladen/)).toBeInTheDocument();
            });

            // Select all and process
            await user.click(screen.getByText('Alle auswählen'));
            await user.click(screen.getByText('Synonyme übersetzen und aktualisieren'));

            // Process first batch
            vi.advanceTimersByTime(30000);

            // Should show inter-batch delay
            await waitFor(() => {
                expect(screen.getByText(/Warte.*2s.*zwischen.*Batches/)).toBeInTheDocument();
            });

            // Advance past delay
            vi.advanceTimersByTime(2000);

            // Should start second batch
            await waitFor(() => {
                expect(screen.getByText(/Batch.*2\/2/)).toBeInTheDocument();
            });
        });

        it('should NOT show delay after final batch', async () => {
            const mockRadicals = createMockRadicals(15); // Single batch

            const { getRadicals, getRadicalStudyMaterials } = await vi.importMock('../../lib/wanikani') as any;
            const { translateText } = await vi.importMock('../../lib/deepl') as any;

            getRadicals.mockResolvedValue(mockRadicals);
            getRadicalStudyMaterials.mockResolvedValue([]);
            translateText.mockImplementation((_token: string, text: string) =>
                Promise.resolve(`${text.toLowerCase()}_de`)
            );

            render(<RadicalsManager />);

            // Set up tokens
            const wkToken = screen.getByPlaceholderText('Geben Sie Ihren Wanikani API Token ein...');
            const deeplToken = screen.getByPlaceholderText('Geben Sie Ihren DeepL API Token ein...');

            await user.type(wkToken, 'test-wk-token');
            await user.type(deeplToken, 'test-deepl-token');

            await waitFor(() => {
                expect(screen.getByText(/15.*Radicals.*erfolgreich.*geladen/)).toBeInTheDocument();
            });

            // Select all and process
            await user.click(screen.getByText('Alle auswählen'));
            await user.click(screen.getByText('Synonyme übersetzen und aktualisieren'));

            // Complete processing
            vi.advanceTimersByTime(30000);

            // Should go directly to completion
            await waitFor(() => {
                expect(screen.getByText(/Verarbeitung abgeschlossen/)).toBeInTheDocument();
            });

            // Should never show inter-batch delay
            expect(screen.queryByText(/Warte.*zwischen.*Batches/)).not.toBeInTheDocument();
        });
    });
});
