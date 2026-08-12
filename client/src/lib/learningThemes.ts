export type VisualTheme = "kitchen" | "office" | "game";

export const VISUAL_THEME_STORAGE_KEY = "code-story-studio:visual-theme";

export const visualThemes: Array<{
  id: VisualTheme;
  icon: string;
  name: string;
  shortLabel: string;
  description: string;
  sceneHint: string;
}> = [
  {
    id: "kitchen",
    icon: "🍳",
    name: "Kitchen World",
    shortLabel: "Kitchen",
    description: "Code is shown as recipes, pantry labels, trays, and parcel-sized results.",
    sceneHint: "Think of each instruction as a small kitchen task.",
  },
  {
    id: "office",
    icon: "💼",
    name: "Office World",
    shortLabel: "Office",
    description: "Code becomes labelled folders, document routes, checklists, and desk deliveries.",
    sceneHint: "Think of each instruction as a well-organized desk task.",
  },
  {
    id: "game",
    icon: "🎮",
    name: "Game World",
    shortLabel: "Game",
    description: "Code becomes quest items, checkpoints, paths, and a final reward screen.",
    sceneHint: "Think of each instruction as a move in a game level.",
  },
];

export function getVisualTheme(id: VisualTheme) {
  return visualThemes.find((theme) => theme.id === id) ?? visualThemes[0];
}

export function getSavedVisualTheme(storage?: Pick<Storage, "getItem">): VisualTheme | null {
  try {
    const saved = storage?.getItem(VISUAL_THEME_STORAGE_KEY);
    return visualThemes.some((theme) => theme.id === saved) ? (saved as VisualTheme) : null;
  } catch {
    return null;
  }
}

export function saveVisualTheme(theme: VisualTheme, storage?: Pick<Storage, "setItem">) {
  try {
    storage?.setItem(VISUAL_THEME_STORAGE_KEY, theme);
  } catch {
    // Preference storage is optional and should never stop the learning experience.
  }
}
