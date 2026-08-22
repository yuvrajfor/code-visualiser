export type LearningWorkspace = "overview" | "code" | "algorithms";

export type LearningWorkspaceAction = "home" | "open-code" | "open-algorithms";

/** New learners begin with the product's primary promise: code to visual story. */
export function getInitialLearningWorkspace(): LearningWorkspace {
  return "code";
}

export function getLearningWorkspace(action: LearningWorkspaceAction): LearningWorkspace {
  if (action === "open-code") return "code";
  if (action === "open-algorithms") return "algorithms";
  return "overview";
}

export function getLearningWorkspaceLabel(workspace: LearningWorkspace): string {
  if (workspace === "code") return "Code Studio";
  if (workspace === "algorithms") return "Algorithm Lab";
  return "Learning home";
}
