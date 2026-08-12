export type LearningWorkspace = "overview" | "code" | "algorithms";

export type LearningWorkspaceAction = "home" | "open-code" | "open-algorithms";

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
