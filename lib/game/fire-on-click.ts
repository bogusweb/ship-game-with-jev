export const FIRE_ON_CLICK_STORAGE_KEY = "ship-game-fire-on-click";

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function browserStorage(): StorageLike | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function loadFireOnClick(
  storage: StorageLike | null = browserStorage(),
): boolean {
  if (!storage) return true;
  try {
    const stored = storage.getItem(FIRE_ON_CLICK_STORAGE_KEY);
    if (stored === "false") return false;
    return true;
  } catch {
    return true;
  }
}

export function saveFireOnClick(
  value: boolean,
  storage: StorageLike | null = browserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(FIRE_ON_CLICK_STORAGE_KEY, String(value));
  } catch {
    // ignore quota / privacy mode
  }
}
