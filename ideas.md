# Two Sum II Replica — Ground-Truth Design Spec

This is a **reference replication**, so the supplied Chaicode lesson page is the source of truth. The implementation should prioritize visual fidelity to the captured reference over introducing unrelated visual patterns.

## Design Direction

### Reference: Chai Visual Dark Workspace

The page is a compact, developer-tool-like learning workspace: a near-black canvas, a narrow problem navigator on the left, and a lesson viewport that mixes editorial content with an interactive algorithm visualizer. The overall feeling is focused, tactile, and quietly technical rather than decorative.

**Design Movement:** Dark-mode developer tooling with editorial education UI and restrained terminal-like affordances.

**Core Principles:**

1. Preserve the split-pane structure and make the left navigation feel like a persistent index, not a marketing sidebar.
2. Use warm off-white text, charcoal surfaces, and thin low-contrast borders so the interface remains legible without looking glossy.
3. Let the active problem and active animation state carry the strongest contrast; everything else should recede.
4. Keep controls small and functional, with compact labels, pill badges, and subtle hover feedback.

**Color Philosophy:** The near-black brown canvas (#110e0b range) keeps attention on code and moving states. Warm ivory typography avoids the harshness of pure white, while amber/orange accents echo the Chai brand and signal active states, practice controls, and highlighted lines.

**Layout Paradigm:** A fixed-height application shell with a 178px-class left rail and a fluid main workspace. The main workspace uses a header row, a top content band with an algorithm visualization on the left and a code/state stack on the right, then a bottom lesson scrubber spanning the main column.

**Signature Elements:**

- A narrow dark left rail with a tiny logo, search control, section disclosure rows, and a white active problem tile.
- Small warm-outline pills for metadata such as LeetCode number, difficulty, and language tags.
- A large bordered algorithm canvas with array cells, plus a lower bordered narration/player surface.

**Interaction Philosophy:** Interaction is direct and low-noise. Hovering should brighten borders and links, selecting a problem should update the active tile, and the play/step controls should visibly move the lesson state without opening extra chrome.

**Animation:** Use short 160–240ms opacity, color, and transform transitions. Array cells can lift slightly when active; the lesson timeline can advance smoothly. Respect reduced-motion preferences and avoid decorative animation that competes with the lesson.

**Typography System:** Use a condensed technical sans for headings and labels (Space Grotesk or IBM Plex Sans Condensed) paired with a readable system sans for body copy. Code uses a monospace stack such as IBM Plex Mono or ui-monospace. Headings are bold and tight; labels are small, uppercase, and letter-spaced.

**Brand Essence:** A visual, step-by-step DSA workspace for learners who want to see algorithms move instead of only reading explanations. Personality: **focused, warm, exacting**.

**Brand Voice:** Headlines are short and direct; CTAs sound like tool controls, not sales copy; descriptions explain the invariant without filler.

Example lines:

- “Two Sum II”
- “Watch the pointers converge.”

**Wordmark & Logo:** Use a compact “DSA Visual” lockup with a small warm orange abstract chai/flame mark, matching the reference’s small orange symbol and warm accent.

**Signature Brand Color:** **Chai Amber** — #e59b63, used sparingly for active controls and highlighted code.

## Reference Measurements

- Reference viewport: 893 × 768 px.
- Left rail: approximately 178 px wide, separated from the workspace by a 1px warm-gray divider.
- Main background: near-black brown, approximately #110e0b.
- Content begins around 200 px from the left edge; the lesson header sits near the top with generous horizontal breathing room.
- Top row: problem eyebrow, large “Two Sum II” title, metadata pills, a hide-solutions button, and a Brute force tab.
- Intro copy is a bordered dark card below the title.
- The visualization canvas occupies the left half of the main workspace; the code card and state card sit stacked on the right.
- The bottom narration card begins around 650 px down in the reference and is followed by a compact playback bar.

## Content Ground Truth

The page title is “Two Sum II”. The visible problem copy describes a 1-indexed sorted array and a target sum of 19. The visible example array is `[2, 5, 8, 11, 15, 19]`; the code panel is labeled “Brute force”; and the state panel shows `target 19`. The left rail lists Two Pointers and additional collapsed algorithm families including Arrays & Hashing, Sliding Window, Stack, Linked List, Heap, Binary Search, Depth-First Search, and Graphs.

