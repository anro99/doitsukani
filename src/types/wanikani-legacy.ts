// Legacy type aliases for WaniKani API types migration
import { Subject, StudyMaterial, SubjectCollection, Assignment, DatableString, Level } from '@bachman-dev/wanikani-api-types';

// Create type aliases for backward compatibility
export type WKKanji = Subject & { object: 'kanji' };
export type WKRadical = Subject & { object: 'radical' };
export type WKVocabulary = Subject & { object: 'vocabulary' };
export type WKSubject = Subject;

// Legacy StudyMaterial with nullable fields for backward compatibility
export type WKStudyMaterial = Omit<StudyMaterial, 'data'> & {
    data: Omit<StudyMaterial['data'], 'meaning_note' | 'reading_note'> & {
        meaning_note: string | null;
        reading_note: string | null;
    };
};

export type WKCollection = SubjectCollection;
export type WKAssignment = Assignment;
export type WKDatableString = DatableString;
export type WKLevel = Level;
