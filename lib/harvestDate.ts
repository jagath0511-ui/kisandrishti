export interface SprayRecord {
  id: string;
  crop: string;
  chemical: string;
  sprayDate: string; // YYYY-MM-DD
  intervalDays: number;
  safeHarvestDate: string; // YYYY-MM-DD
  timestamp: number;
  irac_frac_group?: string;
}

const STORAGE_KEY = 'kisandrishti_spray_diary';

/**
 * Pure function: Calculates the earliest safe harvest date given a spray date and pre-harvest interval.
 * Uses exact date arithmetic safe from timezone offsets.
 * 
 * @param sprayDateStr ISO date string "YYYY-MM-DD" or Date
 * @param intervalDays Number of days to add (pre-harvest interval)
 * @returns Date string in "YYYY-MM-DD" format
 */
export function calculateHarvestDate(
  sprayDateStr: string | Date,
  intervalDays: number
): string {
  if (intervalDays < 0) {
    throw new Error('intervalDays cannot be negative');
  }

  let year: number;
  let month: number;
  let day: number;

  if (typeof sprayDateStr === 'string') {
    // Parse YYYY-MM-DD directly to prevent UTC midnight timezone shifts
    const parts = sprayDateStr.split('T')[0].split('-');
    if (parts.length !== 3) {
      throw new Error(`Invalid date format: ${sprayDateStr}. Expected YYYY-MM-DD.`);
    }
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1; // 0-indexed month
    day = parseInt(parts[2], 10);
  } else {
    year = sprayDateStr.getFullYear();
    month = sprayDateStr.getMonth();
    day = sprayDateStr.getDate();
  }

  // Create UTC date for reliable calendar arithmetic
  const date = new Date(Date.UTC(year, month, day));
  date.setUTCDate(date.getUTCDate() + intervalDays);

  const resYear = date.getUTCFullYear();
  const resMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const resDay = String(date.getUTCDate()).padStart(2, '0');

  return `${resYear}-${resMonth}-${resDay}`;
}

/**
 * Formats YYYY-MM-DD into a localized friendly date (e.g. "15 Oct 2026")
 */
export function formatFriendlyDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(year, month, day));
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });
    }
  } catch {
    // Fallback
  }
  return dateStr;
}

/**
 * Calculates days remaining until the safe harvest date
 */
export function getDaysUntilHarvest(safeDateStr: string, todayStr?: string): number {
  const safeDate = new Date(safeDateStr + 'T00:00:00Z');
  const today = todayStr
    ? new Date(todayStr + 'T00:00:00Z')
    : new Date(new Date().toISOString().split('T')[0] + 'T00:00:00Z');

  const diffMs = safeDate.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Saves a spray record to localStorage
 */
export function saveSprayRecord(
  data: Omit<SprayRecord, 'id' | 'safeHarvestDate' | 'timestamp'>
): SprayRecord {
  const safeHarvestDate = calculateHarvestDate(data.sprayDate, data.intervalDays);
  const newRecord: SprayRecord = {
    ...data,
    id: `spray_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    safeHarvestDate,
    timestamp: Date.now(),
  };

  try {
    const records = getSprayRecords();
    records.unshift(newRecord);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Local storage error handling
  }

  return newRecord;
}

/**
 * Loads all spray records from localStorage
 */
export function getSprayRecords(): SprayRecord[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Ignore
  }
  return [];
}

/**
 * Deletes a spray record by ID
 */
export function deleteSprayRecord(id: string): void {
  try {
    const records = getSprayRecords().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore
  }
}

/**
 * Syncs a spray record to Cloud Firestore via backend REST API
 */
export async function syncSprayRecordToCloud(
  spray: SprayRecord,
  uid: string
): Promise<boolean> {
  try {
    const res = await fetch('/api/user/sprays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, spray }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetches spray records from Cloud Firestore and merges into localStorage
 */
export async function fetchAndMergeCloudSprays(uid: string): Promise<SprayRecord[]> {
  try {
    const res = await fetch(`/api/user/sprays?uid=${encodeURIComponent(uid)}`);
    if (!res.ok) return getSprayRecords();

    const data = await res.json();
    const cloudSprays: SprayRecord[] = data.sprays || [];
    const localSprays = getSprayRecords();

    // Merge by ID avoiding duplicates
    const idMap = new Map<string, SprayRecord>();
    for (const s of cloudSprays) idMap.set(s.id, s);
    for (const s of localSprays) idMap.set(s.id, s);

    const merged = Array.from(idMap.values()).sort((a, b) => b.timestamp - a.timestamp);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return getSprayRecords();
  }
}
