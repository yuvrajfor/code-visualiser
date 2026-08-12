export type SceneKind =
  | "workbench"
  | "storage-shelf"
  | "sorting-tray"
  | "conveyor-loop"
  | "decision-gate"
  | "workshop"
  | "delivery-desk";

export type RealWorldStory = {
  kind: SceneKind;
  icon: string;
  title: string;
  plainEnglish: string;
  whatChanged: string;
  analogy: string;
  objectLabel: string;
};

export type ActionSound = {
  label: string;
  waveform: OscillatorType;
  startHz: number;
  endHz: number;
  duration: number;
  volume: number;
};

/** Returns a short, distinct audio profile matched to the visual action. */
export function getActionSound(kind: SceneKind): ActionSound {
  const profiles: Record<SceneKind, ActionSound> = {
    "storage-shelf": { label: "soft pop", waveform: "sine", startHz: 360, endHz: 620, duration: 0.18, volume: 0.055 },
    "sorting-tray": { label: "item click", waveform: "triangle", startHz: 520, endHz: 680, duration: 0.16, volume: 0.045 },
    "conveyor-loop": { label: "gentle tick", waveform: "sine", startHz: 250, endHz: 330, duration: 0.12, volume: 0.038 },
    "decision-gate": { label: "decision ping", waveform: "triangle", startHz: 480, endHz: 840, duration: 0.22, volume: 0.05 },
    workshop: { label: "tool chime", waveform: "sine", startHz: 340, endHz: 560, duration: 0.2, volume: 0.045 },
    "delivery-desk": { label: "delivery bell", waveform: "sine", startHz: 660, endHz: 990, duration: 0.25, volume: 0.055 },
    workbench: { label: "focus tap", waveform: "sine", startHz: 300, endHz: 420, duration: 0.14, volume: 0.035 },
  };

  return profiles[kind];
}

function friendlyName(line: string) {
  const match = line.match(/(?:let|const|var|int|float|double|String|boolean|char|[A-Za-z_][\w<>\[\]]*)\s+([A-Za-z_]\w*)\s*(?:=|;|\()/);
  return match?.[1] ?? "this item";
}

/**
 * Converts a source-code line into a visual metaphor and basic-English explanation.
 * The function intentionally uses language-agnostic patterns so it can support a
 * broad range of short C, Java, JavaScript, and Python snippets.
 */
export function createRealWorldStory(line: string, lineNumber: number): RealWorldStory {
  const trimmed = line.trim();
  const lower = trimmed.toLowerCase();
  const name = friendlyName(trimmed);

  if (/^(?:function|def\s+|class\s+|public\s+.*\(|private\s+.*\(|static\s+.*\()/.test(lower)) {
    return {
      kind: "workshop",
      icon: "🛠️",
      title: "A new work station is prepared",
      plainEnglish: "The computer is setting up a named job. Nothing is being solved yet; it is simply preparing a place where the job can happen later.",
      whatChanged: "A reusable work station was named and made ready.",
      analogy: "It is like putting a recipe card on the kitchen counter before you begin cooking.",
      objectLabel: "Recipe card",
    };
  }

  if (/\b(new\s+|class\s+|constructor|__init__|object\b)/.test(lower)) {
    return {
      kind: "workshop",
      icon: "🧩",
      title: "A new item is being built",
      plainEnglish: "The computer is making a fresh item from a blueprint and giving it its own place to live.",
      whatChanged: "A new made-to-order item was added to the work area.",
      analogy: "Imagine a workshop using a design to build one new bicycle.",
      objectLabel: "New object",
    };
  }

  if (/\b(for|while|foreach)\b/.test(lower)) {
    return {
      kind: "conveyor-loop",
      icon: "🔁",
      title: "The worker starts a repeating route",
      plainEnglish: "The computer will repeat the next job for each item, one at a time. It keeps going until there is nothing left to check.",
      whatChanged: "A repeating route was started, with a worker ready to visit each item.",
      analogy: "It is like a worker walking along a shelf and checking every box in order.",
      objectLabel: "Repeat route",
    };
  }

  if (/\b(if|else if|elif|else|switch|case)\b/.test(lower)) {
    return {
      kind: "decision-gate",
      icon: "🚦",
      title: "The computer reaches a yes-or-no gate",
      plainEnglish: "The computer checks a question. A yes answer sends it one way; a no answer sends it another way.",
      whatChanged: "A decision gate is open and waiting for the answer to a question.",
      analogy: "It works like a traffic light choosing whether a car may continue or must take another road.",
      objectLabel: "Decision gate",
    };
  }

  if (/\b(return|print|console\.log|cout|system\.out\.println)\b/.test(lower)) {
    return {
      kind: "delivery-desk",
      icon: "📦",
      title: "The answer is packed for delivery",
      plainEnglish: "The computer has a result to show or send back. It places the result in a package and finishes this part of the job.",
      whatChanged: "The result was placed on the delivery desk.",
      analogy: "It is like sealing a parcel and handing it to the person who asked for it.",
      objectLabel: "Result package",
    };
  }

  if (/\[.*\]|array|list|vector|map|set|push|append|sort|swap/.test(lower)) {
    return {
      kind: "sorting-tray",
      icon: "🧺",
      title: "Items are arranged on a sorting tray",
      plainEnglish: "The computer is looking after a group of items. It can pick one, compare it, move it, or place it in the right spot.",
      whatChanged: "A group of items is visible on the sorting tray for the next action.",
      analogy: "Think of sorting coloured blocks on a tray before putting them in order.",
      objectLabel: "Item tray",
    };
  }

  if (/=|\+\+|--|\+=|-=/.test(lower)) {
    return {
      kind: "storage-shelf",
      icon: "🗃️",
      title: `A labelled box called “${name}” is updated`,
      plainEnglish: `The computer is putting a value into a labelled box named “${name}”, so it can use that information later.`,
      whatChanged: `The box labelled “${name}” now holds the newest information.`,
      analogy: "It is like writing a number on a sticky note and placing it in a clearly labelled drawer.",
      objectLabel: name,
    };
  }

  return {
    kind: "workbench",
    icon: "🧠",
    title: `The computer works through line ${lineNumber}`,
    plainEnglish: "The computer reads this instruction and carries out the small job it describes, one careful step at a time.",
    whatChanged: "The current instruction was prepared on the workbench.",
    analogy: "It is like following the next short instruction on a set of building steps.",
    objectLabel: "Current task",
  };
}
