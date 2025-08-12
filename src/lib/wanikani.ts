import {
  WKAssignment,
  WKCollection,
  WKRadical,
  WKStudyMaterial,
  WKSubject,
  WKVocabulary,
} from "@bachmacintosh/wanikani-api-types";
import axios from "axios";
import Bottleneck from "bottleneck";
import { SetProgress } from "./progressreporter";

import translationsJson from "../translations.json";

type Translations = {
  [key: string]: string[];
};
const translations: Translations = translationsJson;

/*
  Kindness settings for the Wanikani server. (Hard limit is 60 requests per minute.)
  Integration tests need very conservative limits to avoid 429 errors.
  Each request should be at least 5 seconds apart for stable testing.
*/
const API_LIMITS = {
  minTime: 5000, // Increased from 3000ms to 5000ms for better rate limit compliance
  maxConcurrent: 1,
};

export const getDataPages = async (
  token: string,
  api: string,
  task: string,
  setProgress?: SetProgress
) => {
  let nextUrl = `https://api.wanikani.com/v2/${api}`;
  let page = 0;
  const result = [];
  const limiter = new Bottleneck(API_LIMITS);

  while (nextUrl) {
    const response = await limiter.schedule(() =>
      axios.get(nextUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    );
    const collection = response.data as WKCollection;
    result.push(...collection.data);

    const progress = {
      text: task,
      currentStep: ++page,
      lastStep: collection.total_count / collection.pages.per_page,
    };
    setProgress?.(progress);

    nextUrl = response.data.pages.next_url;
  }
  return result;
};

export const getVocabulary = async (
  token: string,
  setProgress?: SetProgress
) => {
  const subjects = (await getDataPages(
    token,
    "subjects",
    "Getting vocabulary...",
    setProgress
  )) as WKSubject[];
  const onlyVocabulary = (subject: WKSubject) =>
    subject.object === "vocabulary";
  const result = subjects.filter(onlyVocabulary) as WKVocabulary[];
  return result;
};

export const getAssignments = async (
  token: string,
  burned: boolean = false,
  setProgress?: SetProgress
) => {
  return (await getDataPages(
    token,
    `assignments?burned=${burned}`,
    "Getting assignments...",
    setProgress
  )) as WKAssignment[];
};

export const getUnburnedVocabulary = async (
  token: string,
  setProgress?: SetProgress
) => {
  const vocabs = await getVocabulary(token, setProgress);
  const burned = await getAssignments(token, true, setProgress);
  const burnedSubjects = new Set(burned.map((b) => b.data.subject_id));
  return vocabs.filter((v) => !burnedSubjects.has(v.id));
};

export const getStudyMaterials = async (
  token: string,
  setProgress?: SetProgress
) => {
  return (await getDataPages(
    token,
    "study_materials?subject_types=vocabulary",
    "Getting study materials...",
    setProgress
  )) as WKStudyMaterial[];
};

export interface WKStudyMaterialCreate {
  subject: number;
  synonyms: string[];
}

export const createStudyMaterials = async (
  token: string,
  limiter: Bottleneck,
  material: WKStudyMaterialCreate
) => {
  return limiter.schedule(() =>
    axios.post(
      "https://api.wanikani.com/v2/study_materials",
      {
        study_material: {
          subject_id: material.subject,
          meaning_synonyms: material.synonyms,
        },
      },
      { headers: { Authorization: `Bearer ${token}` } }
    )
  );
};

export interface WKStudyMaterialUpdate {
  id: number;
  synonyms: string[];
}

export const updateSynonyms = (
  token: string,
  limiter: Bottleneck,
  material: WKStudyMaterialUpdate
) => {
  return limiter.schedule(() =>
    axios.put(
      `https://api.wanikani.com/v2/study_materials/${material.id}`,
      { study_material: { meaning_synonyms: material.synonyms } },
      { headers: { Authorization: `Bearer ${token}` } }
    )
  );
};

export const newMaterialNotIn = (
  old: WKStudyMaterial,
  newMaterial: Map<number, WKStudyMaterialCreate>
) => {
  const newMaterialData = newMaterial.get(old.data.subject_id);
  if (!newMaterialData) {
    return false;
  }

  const oldSynonymsLower = old.data.meaning_synonyms.map((s) =>
    s.toLowerCase()
  );
  return !newMaterialData.synonyms.every((s) =>
    oldSynonymsLower.includes(s.toLowerCase())
  );
};

export const mergeSynonyms = (master: string[], updated: string[]) => {
  const result = [...master].map((synonym) => synonym.toLowerCase());
  for (const synonym of updated) {
    if (!result.includes(synonym.toLowerCase())) {
      result.push(synonym);
    }
  }
  return result.slice(0, 8);
};

export const newMaterialWithoutOld = (
  oldM: WKStudyMaterial[],
  newM: WKStudyMaterialCreate[]
): WKStudyMaterialCreate[] => {
  const oldMap = new Map<number, WKStudyMaterial>();
  oldM.forEach((m) => oldMap.set(m.data.subject_id, m));
  return newM.filter((m) => !oldMap.has(m.subject));
};

export const oldMaterialRequiringUpdate = (
  oldM: WKStudyMaterial[],
  newM: WKStudyMaterialCreate[]
): WKStudyMaterialUpdate[] => {
  const newMaterialMap = new Map<number, WKStudyMaterialCreate>();
  newM.forEach((m) => newMaterialMap.set(m.subject, m));
  return oldM
    .filter((old) => newMaterialNotIn(old, newMaterialMap))
    .map((old) => {
      return {
        id: old.id,
        synonyms: mergeSynonyms(
          old.data.meaning_synonyms,
          newMaterialMap.get(old.data.subject_id)!.synonyms
        ),
      };
    });
};

export const delta = (
  oldM: WKStudyMaterial[],
  newM: WKStudyMaterialCreate[]
) => {
  const toCreate = newMaterialWithoutOld(oldM, newM);
  const toUpdate = oldMaterialRequiringUpdate(oldM, newM);
  return { toCreate, toUpdate };
};

export const writeStudyMaterials = async (
  token: string,
  newMaterial: WKStudyMaterialCreate[],
  setProgress?: SetProgress
) => {
  const oldMaterial = await getStudyMaterials(token);
  const { toCreate, toUpdate } = delta(oldMaterial, newMaterial);

  let step = 0;
  const totalSteps = toCreate.length + toUpdate.length;
  const eta = new Date(Date.now() + totalSteps * API_LIMITS.minTime);
  const etaString = eta.toLocaleTimeString([], { timeStyle: "short" });
  const etaText = `Updating study materials... (ETA ~${etaString})`;

  const limiter = new Bottleneck(API_LIMITS);
  for (const material of toCreate) {
    await createStudyMaterials(token, limiter, material);
    setProgress?.({
      text: etaText,
      currentStep: ++step,
      lastStep: totalSteps,
    });
  }

  for (const material of toUpdate) {
    await updateSynonyms(token, limiter, material);
    setProgress?.({
      text: etaText,
      currentStep: ++step,
      lastStep: totalSteps,
    });
  }
};

export const upload = async (apiToken: string, setProgress?: SetProgress) => {
  const vocab = await getUnburnedVocabulary(apiToken, setProgress);
  const studyMaterials = vocab
    .filter((v) => translations[v.id])
    .map((v) => {
      return { subject: v.id, synonyms: translations[v.id] };
    });
  await writeStudyMaterials(apiToken, studyMaterials, setProgress);
};

/**
 * Get radicals from Wanikani API
 * @param token - Wanikani API token
 * @param setProgress - Optional progress callback
 * @param options - Optional filters for levels, limit, and slugs
 * @returns Promise<WKRadical[]>
 */
/**
 * Get only the count of radicals without loading the data
 * @param token - WaniKani API token
 * @param level - Optional specific level, if not provided returns total count
 * @returns Promise<number> - Count of radicals
 */
export const getRadicalCount = async (
  token: string,
  level?: number
): Promise<number> => {
  const limiter = new Bottleneck(API_LIMITS);

  let url = "https://api.wanikani.com/v2/subjects?types=radical&limit=1";

  if (level) {
    url += `&levels=${level}`;
  }

  const response = await limiter.schedule(() =>
    axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  );

  const collection = response.data as WKCollection;
  return collection.total_count;
};

/**
 * Get a limited number of radicals for preview purposes
 * @param token - WaniKani API token
 * @param level - Optional specific level
 * @param limit - Number of radicals to fetch (default: 12)
 * @returns Promise<WKRadical[]>
 */
export const getRadicalsPreview = async (
  token: string,
  level?: number,
  limit: number = 12
): Promise<WKRadical[]> => {
  const limiter = new Bottleneck(API_LIMITS);

  let url = `https://api.wanikani.com/v2/subjects?types=radical&limit=${limit}`;

  if (level) {
    url += `&levels=${level}`;
  }

  const response = await limiter.schedule(() =>
    axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  );

  const collection = response.data as WKCollection;
  return collection.data as WKRadical[];
};

export const getRadicals = async (
  token: string,
  setProgress?: SetProgress,
  options?: { levels?: string; limit?: number; slugs?: string }
): Promise<WKRadical[]> => {
  const limiter = new Bottleneck(API_LIMITS);

  let url = "https://api.wanikani.com/v2/subjects?types=radical";

  // Add query parameters if provided
  const params = new URLSearchParams();
  if (options?.levels) params.append("levels", options.levels);
  if (options?.limit) params.append("limit", options.limit.toString());
  if (options?.slugs) params.append("slugs", options.slugs);

  if (params.toString()) {
    url += "&" + params.toString();
  }

  const progress = {
    text: "Fetching radicals from Wanikani...",
    currentStep: 1,
    lastStep: 1,
  };
  setProgress?.(progress);

  const response = await limiter.schedule(() =>
    axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  );

  const collection = response.data as WKCollection;
  const finalProgress = {
    text: `Found ${collection.data.length} radicals`,
    currentStep: 1,
    lastStep: 1,
  };
  setProgress?.(finalProgress);

  return collection.data as WKRadical[];
};

/**
 * Get study materials for radicals from Wanikani API
 * @param token - Wanikani API token
 * @param setProgress - Optional progress callback
 * @param options - Optional filters for subject_ids and limit
 * @returns Promise<WKStudyMaterial[]>
 */
export const getRadicalStudyMaterials = async (
  token: string,
  setProgress?: SetProgress,
  options?: { subject_ids?: string; limit?: number }
): Promise<WKStudyMaterial[]> => {
  const limiter = new Bottleneck(API_LIMITS);

  let url = "https://api.wanikani.com/v2/study_materials?subject_types=radical";

  // Add query parameters if provided
  const params = new URLSearchParams();
  if (options?.subject_ids) params.append("subject_ids", options.subject_ids);
  if (options?.limit) params.append("limit", options.limit.toString());

  if (params.toString()) {
    url += "&" + params.toString();
  }

  const progress = {
    text: "Fetching radical study materials...",
    currentStep: 1,
    lastStep: 1,
  };
  setProgress?.(progress);

  const response = await limiter.schedule(() =>
    axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  );

  const collection = response.data as WKCollection;
  const finalProgress = {
    text: `Found ${collection.data.length} study materials`,
    currentStep: 1,
    lastStep: 1,
  };
  setProgress?.(finalProgress);

  return collection.data as WKStudyMaterial[];
};

/**
 * Create synonyms for a radical (creates new study material)
 * ⚠️ SAFE ONLY for test radicals: Rice, Spikes, Umbrella
 * @param token - Wanikani API token
 * @param subjectId - ID of the radical subject
 * @param synonyms - Array of synonyms to add
 * @returns Promise<WKStudyMaterial>
 */
export const createRadicalSynonyms = async (
  token: string,
  subjectId: number,
  synonyms: string[]
): Promise<WKStudyMaterial> => {
  const limiter = new Bottleneck(API_LIMITS);

  const payload = {
    study_material: {
      subject_id: subjectId,
      meaning_synonyms: synonyms
    }
  };

  const response = await limiter.schedule(() =>
    axios.post("https://api.wanikani.com/v2/study_materials", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
  );

  return response.data;
};

/**
 * Update synonyms for an existing study material
 * ⚠️ SAFE ONLY for test radicals: Rice, Spikes, Umbrella
 * @param token - Wanikani API token
 * @param studyMaterialId - ID of the study material to update
 * @param synonyms - Array of synonyms to set
 * @returns Promise<WKStudyMaterial>
 */
export const updateRadicalSynonyms = async (
  token: string,
  studyMaterialId: number,
  synonyms: string[]
): Promise<WKStudyMaterial> => {
  const limiter = new Bottleneck(API_LIMITS);

  const payload = {
    study_material: {
      meaning_synonyms: synonyms
    }
  };

  const response = await limiter.schedule(() =>
    axios.put(`https://api.wanikani.com/v2/study_materials/${studyMaterialId}`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
  );

  return response.data;
};

/**
 * Delete all user synonyms for a radical (removes all meaning_synonyms)
 * ⚠️ SAFE ONLY for test radicals: Rice, Spikes, Umbrella
 * @param token - Wanikani API token
 * @param studyMaterialId - ID of the study material to clear synonyms from
 * @returns Promise<WKStudyMaterial>
 */
export const deleteRadicalSynonyms = async (
  token: string,
  studyMaterialId: number
): Promise<WKStudyMaterial> => {
  const limiter = new Bottleneck(API_LIMITS);

  const payload = {
    study_material: {
      meaning_synonyms: []
    }
  };

  const response = await limiter.schedule(() =>
    axios.put(`https://api.wanikani.com/v2/study_materials/${studyMaterialId}`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
  );

  return response.data;
};
