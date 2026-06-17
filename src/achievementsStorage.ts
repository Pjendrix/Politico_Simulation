export interface UnlockedAchievementRecord {
  id: string;
  unlockedAt: string;
  gameSummary?: { partyZkratka: string; date: string };
}

export function loadUnlockedAchievements(): UnlockedAchievementRecord[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }
  try {
    const raw = localStorage.getItem("achievementsUnlocked");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to parse unlocked achievements:", e);
    return [];
  }
}

export function saveUnlockedAchievements(records: UnlockedAchievementRecord[]): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    localStorage.setItem("achievementsUnlocked", JSON.stringify(records));
  } catch (e) {
    console.error("Failed to save unlocked achievements:", e);
  }
}

export function unlockAchievements(
  ids: string[],
  context: { partyZkratka: string; date: string }
): UnlockedAchievementRecord[] {
  const existing = loadUnlockedAchievements();
  const existingIds = new Set(existing.map(r => r.id));
  
  const newlyUnlocked: UnlockedAchievementRecord[] = [];
  
  for (const id of ids) {
    if (!existingIds.has(id)) {
      newlyUnlocked.push({
        id,
        unlockedAt: new Date().toISOString(),
        gameSummary: context
      });
    }
  }
  
  if (newlyUnlocked.length > 0) {
    const updated = [...existing, ...newlyUnlocked];
    saveUnlockedAchievements(updated);
  }
  
  return newlyUnlocked;
}
