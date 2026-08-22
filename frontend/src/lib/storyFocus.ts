export type StoryCodeLine = {
  lineNumber: number;
  text: string;
  isActive: boolean;
};

/** Preserves a learner's original code while identifying the one line driving the current story moment. */
export function getStoryCodeLines(code: string, activeLine: number): StoryCodeLine[] {
  return code.split("\n").map((text, index) => ({
    lineNumber: index + 1,
    text,
    isActive: index + 1 === activeLine,
  }));
}
