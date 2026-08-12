export type StoryControlAction = "toggle-play" | "previous" | "next" | "restart" | "toggle-sound";

export const STORY_SHORTCUTS: Array<{ keys: string; label: string }> = [
  { keys: "Space", label: "Play or pause" },
  { keys: "← / A", label: "Previous step" },
  { keys: "→ / D", label: "Next step" },
  { keys: "R", label: "Restart story" },
  { keys: "M", label: "Turn sound on or off" },
];

/** Maps safe, focused-player keystrokes to a story action. */
export function getStoryShortcutAction(event: KeyboardEvent): StoryControlAction | null {
  const target = event.target as HTMLElement | null;
  const tagName = target?.tagName?.toLowerCase();
  const isTextEntry = tagName === "input" || tagName === "textarea" || target?.isContentEditable;

  if (isTextEntry || event.ctrlKey || event.metaKey || event.altKey) return null;

  switch (event.key.toLowerCase()) {
    case " ":
    case "k":
      return "toggle-play";
    case "arrowleft":
    case "a":
      return "previous";
    case "arrowright":
    case "d":
      return "next";
    case "r":
      return "restart";
    case "m":
      return "toggle-sound";
    default:
      return null;
  }
}
