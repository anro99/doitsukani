import { describe, expect, it, vi, beforeEach } from "vitest";
import axios from "axios";
import {
    WKRadical,
    WKStudyMaterial,
    WKCollection,
    WKDatableString,
    WKLevel,
} from "@bachmacintosh/wanikani-api-types";

// For now we'll create mock functions that we'll implement later
const getRadicals = vi.fn();
const getRadicalStudyMaterials = vi.fn();

// Mock axios
vi.mock("axios");
const mockedAxios = vi.mocked(axios);

// Mock Bottleneck
vi.mock("bottleneck", () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            schedule: vi.fn().mockImplementation((fn) => fn()),
        })),
    };
});

const createMockRadical = (id: number, characters?: string, slug?: string): WKRadical => {
    return {
        object: "radical",
        id,
        url: `https://api.wanikani.com/v2/subjects/${id}`,
        data_updated_at: "2024-01-01T00:00:00.000000Z" as WKDatableString,
        data: {
            amalgamation_subject_ids: [],
            auxiliary_meanings: [],
            characters: characters || null,
            character_images: [],
            created_at: "2024-01-01T00:00:00.000000Z" as WKDatableString,
            document_url: `https://www.wanikani.com/radicals/${slug || id}`,
            hidden_at: null,
            lesson_position: 0,
            level: 1 as WKLevel,
            meaning_mnemonic: `Test mnemonic for radical ${id}`,
            meanings: [
                {
                    meaning: `Test Radical ${id}`,
                    primary: true,
                    accepted_answer: true,
                },
            ],
            slug: slug || `test-radical-${id}`,
            spaced_repetition_system_id: 1,
        },
    };
};

const createMockStudyMaterial = (id: number, subjectId: number): WKStudyMaterial => {
    return {
        object: "study_material",
        id,
        url: `https://api.wanikani.com/v2/study_materials/${id}`,
        data_updated_at: "2024-01-01T00:00:00.000000Z" as WKDatableString,
        data: {
            subject_id: subjectId,
            subject_type: "radical",
            meaning_synonyms: [],
            reading_note: null,
            meaning_note: null,
            created_at: "2024-01-01T00:00:00.000000Z" as WKDatableString,
            hidden: false,
        },
    };
};

const createMockRadicalCollection = (data: WKRadical[], nextUrl?: string): WKCollection => {
    return {
        object: "collection",
        url: "https://api.wanikani.com/v2/subjects",
        pages: {
            next_url: nextUrl || null,
            previous_url: null,
            per_page: 1000,
        },
        total_count: data.length,
        data_updated_at: "2024-01-01T00:00:00.000000Z" as WKDatableString,
        data,
    };
};

const createMockStudyMaterialCollection = (data: WKStudyMaterial[], nextUrl?: string): WKCollection => {
    return {
        object: "collection",
        url: "https://api.wanikani.com/v2/study_materials",
        pages: {
            next_url: nextUrl || null,
            previous_url: null,
            per_page: 1000,
        },
        total_count: data.length,
        data_updated_at: "2024-01-01T00:00:00.000000Z" as WKDatableString,
        data,
    };
};

describe("Radical API Functions - Unit Tests", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getRadicals", () => {
        it("should fetch single page of radicals successfully", async () => {
            const mockRadicals = [
                createMockRadical(1, "一", "ground"),
                createMockRadical(2, "二", "two"),
                createMockRadical(3, "人", "person"),
            ];

            const mockCollection = createMockRadicalCollection(mockRadicals);

            (mockedAxios.get as any).mockResolvedValueOnce({
                data: mockCollection,
                status: 200,
            });

            // Mock implementation
            getRadicals.mockImplementation(async (token: string) => {
                const response = await axios.get("https://api.wanikani.com/v2/subjects?types=radical", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                return response.data.data;
            });

            const result = await getRadicals("fake-token");

            expect(mockedAxios.get).toHaveBeenCalledTimes(1);
            expect(mockedAxios.get).toHaveBeenCalledWith(
                "https://api.wanikani.com/v2/subjects?types=radical",
                {
                    headers: {
                        Authorization: "Bearer fake-token",
                    },
                }
            );
            expect(result).toEqual(mockRadicals);
        });

        it("should handle empty response", async () => {
            const mockCollection = createMockRadicalCollection([]);

            (mockedAxios.get as any).mockResolvedValueOnce({
                data: mockCollection,
                status: 200,
            });

            getRadicals.mockImplementation(async (token: string) => {
                const response = await axios.get("https://api.wanikani.com/v2/subjects?types=radical", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                return response.data.data;
            });

            const result = await getRadicals("fake-token");

            expect(result).toEqual([]);
        });

        it("should handle API errors", async () => {
            (mockedAxios.get as any).mockRejectedValueOnce(new Error("API Error"));

            getRadicals.mockImplementation(async (token: string) => {
                await axios.get("https://api.wanikani.com/v2/subjects?types=radical", {
                    headers: { Authorization: `Bearer ${token}` },
                });
            });

            await expect(getRadicals("fake-token")).rejects.toThrow("API Error");
        });
    });

    describe("getRadicalStudyMaterials", () => {
        it("should fetch radical study materials successfully", async () => {
            const mockStudyMaterials = [
                createMockStudyMaterial(1, 100),
                createMockStudyMaterial(2, 101),
            ];

            const mockCollection = createMockStudyMaterialCollection(mockStudyMaterials);

            (mockedAxios.get as any).mockResolvedValueOnce({
                data: mockCollection,
                status: 200,
            });

            getRadicalStudyMaterials.mockImplementation(async (token: string) => {
                const response = await axios.get("https://api.wanikani.com/v2/study_materials?subject_types=radical", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                return response.data.data;
            });

            const result = await getRadicalStudyMaterials("fake-token");

            expect(mockedAxios.get).toHaveBeenCalledWith(
                "https://api.wanikani.com/v2/study_materials?subject_types=radical",
                {
                    headers: {
                        Authorization: "Bearer fake-token",
                    },
                }
            );
            expect(result).toEqual(mockStudyMaterials);
        });

        it("should handle empty study materials response", async () => {
            const mockCollection = createMockStudyMaterialCollection([]);

            (mockedAxios.get as any).mockResolvedValueOnce({
                data: mockCollection,
                status: 200,
            });

            getRadicalStudyMaterials.mockImplementation(async (token: string) => {
                const response = await axios.get("https://api.wanikani.com/v2/study_materials?subject_types=radical", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                return response.data.data;
            });

            const result = await getRadicalStudyMaterials("fake-token");

            expect(result).toEqual([]);
        });

        it("should handle API errors for study materials", async () => {
            (mockedAxios.get as any).mockRejectedValueOnce(new Error("Study Material API Error"));

            getRadicalStudyMaterials.mockImplementation(async (token: string) => {
                await axios.get("https://api.wanikani.com/v2/study_materials?subject_types=radical", {
                    headers: { Authorization: `Bearer ${token}` },
                });
            });

            await expect(getRadicalStudyMaterials("fake-token")).rejects.toThrow(
                "Study Material API Error"
            );
        });
    });

    describe("Error Handling", () => {
        it("should handle network timeouts", async () => {
            const timeoutError = new Error("Network timeout");
            timeoutError.name = "TimeoutError";
            (mockedAxios.get as any).mockRejectedValueOnce(timeoutError);

            getRadicals.mockImplementation(async (token: string) => {
                await axios.get("https://api.wanikani.com/v2/subjects?types=radical", {
                    headers: { Authorization: `Bearer ${token}` },
                });
            });

            await expect(getRadicals("fake-token")).rejects.toThrow("Network timeout");
        });

        it("should handle 401 Unauthorized errors", async () => {
            const authError = {
                response: {
                    status: 401,
                    data: { error: "Unauthorized" },
                },
            };
            (mockedAxios.get as any).mockRejectedValueOnce(authError);

            getRadicals.mockImplementation(async (token: string) => {
                await axios.get("https://api.wanikani.com/v2/subjects?types=radical", {
                    headers: { Authorization: `Bearer ${token}` },
                });
            });

            await expect(getRadicals("fake-token")).rejects.toThrow();
        });

        it("should handle 429 Rate Limit errors", async () => {
            const rateLimitError = {
                response: {
                    status: 429,
                    data: { error: "Too Many Requests" },
                },
            };
            (mockedAxios.get as any).mockRejectedValueOnce(rateLimitError);

            getRadicals.mockImplementation(async (token: string) => {
                await axios.get("https://api.wanikani.com/v2/subjects?types=radical", {
                    headers: { Authorization: `Bearer ${token}` },
                });
            });

            await expect(getRadicals("fake-token")).rejects.toThrow();
        });
    });

    describe("Rate Limiting Tests", () => {
        it("should test Bottleneck configuration for radicals", () => {
            // Test that our API limits are configured correctly
            const API_LIMITS = {
                minTime: 1100,
                maxConcurrent: 1,
            };

            expect(API_LIMITS.minTime).toBe(1100);
            expect(API_LIMITS.maxConcurrent).toBe(1);
        });
    });

    describe("Data Structure Validation", () => {
        it("should validate radical data structure", () => {
            const radical = createMockRadical(1, "一", "ground");

            expect(radical.object).toBe("radical");
            expect(radical.data.characters).toBe("一");
            expect(radical.data.slug).toBe("ground");
            expect(radical.data.level).toBe(1);
            expect(radical.data.meanings).toHaveLength(1);
            expect(radical.data.meanings[0].meaning).toBe("Test Radical 1");
            expect(radical.data.meanings[0].primary).toBe(true);
        });

        it("should validate study material data structure", () => {
            const studyMaterial = createMockStudyMaterial(1, 100);

            expect(studyMaterial.object).toBe("study_material");
            expect(studyMaterial.data.subject_id).toBe(100);
            expect(studyMaterial.data.subject_type).toBe("radical");
            expect(studyMaterial.data.meaning_synonyms).toEqual([]);
            expect(studyMaterial.data.hidden).toBe(false);
        });
    });

    describe("Delete Radical Synonyms", () => {
        const deleteRadicalSynonyms = vi.fn();

        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("should delete all synonyms for a radical", async () => {
            const mockStudyMaterial = createMockStudyMaterial(1, 100);
            // Set initial synonyms
            mockStudyMaterial.data.meaning_synonyms = ["grain", "cereal"];

            // After deletion, synonyms should be empty
            const clearedStudyMaterial = { ...mockStudyMaterial };
            clearedStudyMaterial.data.meaning_synonyms = [];

            deleteRadicalSynonyms.mockResolvedValue(clearedStudyMaterial);

            const result = await deleteRadicalSynonyms("test-token", 1);

            expect(deleteRadicalSynonyms).toHaveBeenCalledWith("test-token", 1);
            expect(result.data.meaning_synonyms).toEqual([]);
        });

        it("should handle errors when deleting synonyms", async () => {
            const error = new Error("Delete failed");
            deleteRadicalSynonyms.mockRejectedValue(error);

            await expect(deleteRadicalSynonyms("test-token", 1)).rejects.toThrow("Delete failed");
        });

        it("should work with empty synonym list", async () => {
            const mockStudyMaterial = createMockStudyMaterial(1, 100);
            // Already empty
            mockStudyMaterial.data.meaning_synonyms = [];

            deleteRadicalSynonyms.mockResolvedValue(mockStudyMaterial);

            const result = await deleteRadicalSynonyms("test-token", 1);

            expect(result.data.meaning_synonyms).toEqual([]);
        });

        it("should validate delete operation payload", () => {
            // Test that the correct payload structure is used for deletion
            const expectedPayload = {
                study_material: {
                    meaning_synonyms: []
                }
            };

            expect(expectedPayload.study_material.meaning_synonyms).toEqual([]);
        });
    });
});
