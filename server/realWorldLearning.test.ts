import { describe, expect, it } from "vitest";
import { createRealWorldStory, getActionSound } from "../client/src/lib/realWorldLearning";

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
});
