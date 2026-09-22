export interface ObservationRecord {
  id: string;
  showerId: string;
  date: string;
  location: string;
  count: number | null;
  notes: string;
  photoData?: string;
  photoName?: string;
  createdAt: number;
}

const KEY = "mss.observationRecords";

export function loadObservationRecords(): ObservationRecord[] {
  try {
    const records = JSON.parse(localStorage.getItem(KEY) ?? "[]") as ObservationRecord[];
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

export function saveObservationRecord(record: ObservationRecord): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([record, ...loadObservationRecords()].slice(0, 50)));
  } catch {
    throw new Error("observation-storage-full");
  }
}

export function removeObservationRecord(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(loadObservationRecords().filter((record) => record.id !== id)));
  } catch {
    // Ignore storage failures.
  }
}

