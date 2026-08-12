export type SceneKind =
  | "workbench"
  | "storage-shelf"
  | "sorting-tray"
  | "linked-chain"
  | "family-tree"
  | "conveyor-loop"
  | "recursion-stairs"
  | "city-map"
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
    "linked-chain": { label: "link click", waveform: "triangle", startHz: 420, endHz: 510, duration: 0.16, volume: 0.042 },
    "family-tree": { label: "branch chime", waveform: "sine", startHz: 460, endHz: 720, duration: 0.2, volume: 0.046 },
    "conveyor-loop": { label: "gentle tick", waveform: "sine", startHz: 250, endHz: 330, duration: 0.12, volume: 0.038 },
    "recursion-stairs": { label: "stair chime", waveform: "sine", startHz: 390, endHz: 780, duration: 0.2, volume: 0.045 },
    "city-map": { label: "route ping", waveform: "triangle", startHz: 330, endHz: 660, duration: 0.19, volume: 0.043 },
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

  if (/\b(tree|root|left|right|binary|parent|child)\b/.test(lower)) {
    return {
      kind: "family-tree",
      icon: "🌳",
      title: "A family-tree branch is being placed",
      plainEnglish: "The computer is organizing people or items into a family shape. One main person sits at the top, and each branch can lead to smaller family members below.",
      whatChanged: "A new place in the family tree is ready to connect to its parent or child branch.",
      analogy: "It is like drawing a family tree, where a parent at the top can point to children on the left and right.",
      objectLabel: "Family branch",
    };
  }

  if (/\b(bfs|breadth[_\s-]?first|queue|popleft|deque)\b/.test(lower)) {
    return {
      kind: "city-map",
      icon: "🚏",
      title: "The city waiting line checks nearby stops first",
      plainEnglish: "The computer visits all nearby places first before going farther away, like checking every shop on your street before moving to the next street.",
      whatChanged: "A city stop was placed into, or taken from, the waiting line for nearby stops.",
      analogy: "It is like a queue at a bus stop: the place that has waited longest is visited next.",
      objectLabel: "Nearby stop",
    };
  }

  if (/\b(dfs|depth[_\s-]?first|stack|path\.pop|path\.append)\b/.test(lower)) {
    return {
      kind: "city-map",
      icon: "🧭",
      title: "The city explorer follows one road deeply",
      plainEnglish: "The computer follows one road as far as it can go, then comes back and tries another road, like exploring a maze.",
      whatChanged: "One road was placed on, or removed from, the explorer's route stack.",
      analogy: "It is like walking through a maze until a dead end, then retracing your steps to the last turn.",
      objectLabel: "Explorer road",
    };
  }

  if (/(?:\bcity_map\b|\bcitymap\b|\bgraph\b|\bvertex\b|\bedge\b|\bneighbor\b|\bneighbour\b|\badjacency\b|\bvisited\b|\bbfs\b|\bdfs\b|\broute\b)/.test(lower)) {
    return {
      kind: "city-map",
      icon: "🗺️",
      title: "A route is being marked on a city map",
      plainEnglish: "The computer is looking at places and the roads between them. It can choose a nearby place, remember where it has been, and keep exploring until it reaches the goal.",
      whatChanged: "A city stop or road was added to the route the computer can explore.",
      analogy: "It is like using a city map to choose which nearby street to follow next without getting lost.",
      objectLabel: "Map stop",
    };
  }

  if (/\b(node|head|tail|next)\b/.test(lower) && /\b(next|node|head|tail|new)\b/.test(lower)) {
    return {
      kind: "linked-chain",
      icon: "🔗",
      title: "A chain of labelled stops is being connected",
      plainEnglish: "The computer is joining one stop to the next. Each stop remembers who comes after it, so the chain can be followed in order.",
      whatChanged: "One paper-tag stop now points to the next stop in the chain.",
      analogy: "It is like tying name tags together with string so you can follow the trail from the first tag to the last.",
      objectLabel: "Linked stop",
    };
  }

  if (/\b(return)\b.*\b([a-z_]\w*)\s*\(/.test(lower) || /\b(recurs|factorial|fibonacci|countdown|stack_plates)\b/.test(lower)) {
    return {
      kind: "recursion-stairs",
      icon: "🪜",
      title: "The computer climbs one small step at a time",
      plainEnglish: "The computer gives the same job a smaller version of itself. It keeps taking one step down until it reaches the easy stopping point, then carries the answers back up.",
      whatChanged: "A new smaller job was placed on the step above the earlier job.",
      analogy: "It is like walking down a staircase to pick up one item at a time, then carrying the items back up in order.",
      objectLabel: "Stair step",
    };
  }

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
