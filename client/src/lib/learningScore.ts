export type StoryLearningScore = {
  exploredSteps: number;
  totalSteps: number;
  score: number;
  isComplete: boolean;
  status: string;
};

/**
 * A progress signal, not an assessment. Learners earn score only for distinct
 * story steps they have opened during the current visual-story session.
 */
export function getStoryLearningScore(totalSteps: number, visitedStepIndexes: readonly number[]): StoryLearningScore {
  const safeTotal = Math.max(0, Math.floor(totalSteps));
  const explored = new Set(
    visitedStepIndexes.filter((index) => Number.isInteger(index) && index >= 0 && index < safeTotal),
  ).size;
  const score = safeTotal ? Math.round((explored / safeTotal) * 100) : 0;
  const isComplete = safeTotal > 0 && explored === safeTotal;
  const status = isComplete
    ? "Every story step explored"
    : safeTotal
      ? `${explored} of ${safeTotal} story steps explored`
      : "Create a story to begin";

  return { exploredSteps: explored, totalSteps: safeTotal, score, isComplete, status };
}
