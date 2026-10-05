import type { CourseType, EducationLevel, VolunteerInterest, WorkPreference } from "@/lib/domain";

export type EducationData = {
  educationLevel: EducationLevel | "";
  courseTypes: CourseType[];
  courseName: string;
  specialization: string;
  curriculumFileName: string;
  curriculumDataUrl: string;
  /** Kept only so older demo records can be read; publishing no longer depends on it. */
  curriculumConfirmed?: boolean;
};

export type ResidenceData = { state: string; municipality: string };

export type TalentDirectoryRecord = EducationData & {
  profileId: string;
  name: string;
  summary: string;
  capabilities: string;
  location: { state: string; municipality: string; district: string };
  workPreferences: WorkPreference[];
  activities: string[];
  volunteerInterests: VolunteerInterest[];
  visible: boolean;
  updatedAt: string;
};

export const TALENT_DIRECTORY_KEY = "oflix-talent-bank-profiles";
export const RESIDENCE_KEY = "oflix-residence";
export const SERVICE_ALERT_KEY = "oflix-service-opportunity-alerts";

export const emptyEducation: EducationData = {
  educationLevel: "",
  courseTypes: [],
  courseName: "",
  specialization: "",
  curriculumFileName: "",
  curriculumDataUrl: "",
  curriculumConfirmed: false,
};

export function readTalentDirectory() {
  if (typeof window === "undefined") return [] as TalentDirectoryRecord[];
  try {
    const value = JSON.parse(window.localStorage.getItem(TALENT_DIRECTORY_KEY) ?? "[]");
    return Array.isArray(value) ? value as TalentDirectoryRecord[] : [];
  } catch {
    return [] as TalentDirectoryRecord[];
  }
}

export function readTalentRecord(profileId: string) {
  return readTalentDirectory().find((record) => record.profileId === profileId);
}

export function readProfileArray<T>(key: string, profileId: string) {
  if (typeof window === "undefined") return [] as T[];
  try {
    const value = JSON.parse(window.localStorage.getItem(`${key}-${profileId}`) ?? "[]");
    return Array.isArray(value) ? value as T[] : [];
  } catch {
    return [] as T[];
  }
}

export function readResidence(profileId: string, fallback: ResidenceData) {
  if (typeof window === "undefined") return fallback;
  try {
    const value = JSON.parse(window.localStorage.getItem(`${RESIDENCE_KEY}-${profileId}`) ?? "null") as Partial<ResidenceData> | null;
    return {
      municipality: value?.municipality ?? fallback.municipality,
      state: value?.state ?? fallback.state,
    };
  } catch {
    return fallback;
  }
}

export function saveTalentRecord(record: TalentDirectoryRecord) {
  if (typeof window === "undefined") return;
  try {
    const current = readTalentDirectory().filter((item) => item.profileId !== record.profileId);
    window.localStorage.setItem(TALENT_DIRECTORY_KEY, JSON.stringify([...current, record]));
    window.dispatchEvent(new Event("oflix-talent-bank-changed"));
  } catch {
    // A client-only demo keeps the previous record when browser storage is unavailable.
  }
}
