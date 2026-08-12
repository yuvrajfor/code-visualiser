import { describe, expect, it } from "vitest";
import { createRealWorldStory, getActionSound } from "../client/src/lib/realWorldLearning";
import { getStoryShortcutAction } from "../client/src/lib/storyControls";
import { getSavedVisualTheme, getVisualTheme, saveVisualTheme, visualThemes } from "../client/src/lib/learningThemes";

describe("createRealWorldStory", () => {
  it("turns assignments into a labelled storage-box story", () => {
    const story = createRealWorldStory("let score = 4;", 1);

    expect(story.kind).toBe("storage-shelf");
    expect(story.plainEnglish).toContain("labelled box");
    expect(story.objectLabel).toBe("score");
  });

  it("turns loops into a familiar repeating route", () => {
    const story = createRealWorldStory("for (let i = 0; i < items.length; i++) {", 2);

    expect(story.kind).toBe("conveyor-loop");
    expect(story.analogy).toContain("worker");
  });

  it("turns conditions into a clear decision gate", () => {
    const story = createRealWorldStory("if (score > 5) {", 3);

    expect(story.kind).toBe("decision-gate");
    expect(story.plainEnglish).toContain("question");
  });

  it("uses a distinct, gentle audio cue for each key visual action", () => {
    const variableSound = getActionSound("storage-shelf");
    const decisionSound = getActionSound("decision-gate");
    const resultSound = getActionSound("delivery-desk");

    expect(variableSound.label).toBe("soft pop");
    expect(decisionSound.endHz).toBeGreaterThan(decisionSound.startHz);
    expect(resultSound.duration).toBeGreaterThan(variableSound.duration);
  });

  it("turns linked-list connections into a chain of real-world stops", () => {
    const story = createRealWorldStory("firstStop.next = nextStop;", 7);

    expect(story.kind).toBe("linked-chain");
    expect(story.analogy).toContain("name tags");
  });

  it("turns recursive work into a staircase story", () => {
    const story = createRealWorldStory("return 1 + count_steps(steps - 1)", 8);

    expect(story.kind).toBe("recursion-stairs");
    expect(story.plainEnglish).toContain("smaller version");
  });

  it("maps player keystrokes while keeping text entry safe", () => {
    const nextAction = getStoryShortcutAction({ key: "ArrowRight", target: null } as KeyboardEvent);
    const ignoredAction = getStoryShortcutAction({ key: " ", target: { tagName: "TEXTAREA" } } as unknown as KeyboardEvent);

    expect(nextAction).toBe("next");
    expect(ignoredAction).toBeNull();
  });

  it("offers Kitchen, Office, and Game World themes", () => {
    expect(visualThemes.map((theme) => theme.id)).toEqual(["kitchen", "office", "game"]);
    expect(getVisualTheme("game").name).toBe("Game World");
  });

  it("turns a binary-tree line into a familiar family-tree scene", () => {
    const story = createRealWorldStory("parent.left = new FamilyMember('Milo');", 9);

    expect(story.kind).toBe("family-tree");
    expect(story.analogy).toContain("family tree");
  });

  it("turns a graph line into a city-map scene", () => {
    const story = createRealWorldStory("for stop in city_map['Cafe']:", 10);

    expect(story.kind).toBe("city-map");
    expect(story.plainEnglish).toContain("roads");
  });

  it("saves and restores a learner's visual-world preference", () => {
    const entries = new Map<string, string>();
    const storage = {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => entries.set(key, value),
    };

    saveVisualTheme("office", storage);
    expect(getSavedVisualTheme(storage)).toBe("office");
  });
});
