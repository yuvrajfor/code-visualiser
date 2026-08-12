import type { CityNodePosition } from "./cityRoutes";

export type OnboardingWorkspace = "code" | "algorithms";

export type OnboardingStatus = Record<OnboardingWorkspace, boolean>;

export type SharedGraphScenario = {
  version: 1;
  graphText: string;
  startStop: string;
  targetStop: string;
  nodePositions: Record<string, CityNodePosition>;
};

export const ONBOARDING_STORAGE_KEY = "code-story-studio:onboarding-v1";
const MAX_GRAPH_TEXT_LENGTH = 12_000;
const MAX_STOP_NAME_LENGTH = 120;

export const defaultOnboardingStatus: OnboardingStatus = { code: false, algorithms: false };

export const onboardingSteps: Record<OnboardingWorkspace, Array<{ title: string; description: string }>> = {
  code: [
    { title: "Choose a starting point", description: "Pick an everyday example or paste a small piece of your own code." },
    { title: "Choose a visual world", description: "Select the setting that makes the explanation easiest for you to remember." },
    { title: "Generate the story", description: "Turn the code into a line-by-line scene and explanation you can play at your own pace." },
  ],
  algorithms: [
    { title: "Write the roads", description: "Use one line per city stop. Add a number in brackets when a road has a travel time." },
    { title: "Pick the journey", description: "Choose where the three explorers start and which stop they are trying to reach." },
    { title: "Compare the choices", description: "Run the map to watch nearby-first, deep-first, and lowest-time routes make different choices." },
  ],
};

export type OnboardingStepTransition = {
  stepIndex: number;
  isComplete: boolean;
};

export type OnboardingCompletion = {
  status: OnboardingStatus;
  workspace: null;
  stepIndex: 0;
};

export function getPreviousOnboardingStep(stepIndex: number): number {
  return Math.max(0, stepIndex - 1);
}

export function getNextOnboardingStep(workspace: OnboardingWorkspace, stepIndex: number): OnboardingStepTransition {
  const lastStepIndex = onboardingSteps[workspace].length - 1;
  const currentStepIndex = Math.max(0, Math.min(stepIndex, lastStepIndex));
  if (currentStepIndex === lastStepIndex) return { stepIndex: lastStepIndex, isComplete: true };
  return { stepIndex: currentStepIndex + 1, isComplete: false };
}

export function finishOnboardingTour(status: OnboardingStatus, workspace: OnboardingWorkspace): OnboardingCompletion {
  return { status: completeOnboarding(status, workspace), workspace: null, stepIndex: 0 };
}

export function readOnboardingStatus(storage?: Pick<Storage, "getItem">): OnboardingStatus {
  if (!storage) return { ...defaultOnboardingStatus };
  try {
    const value = JSON.parse(storage.getItem(ONBOARDING_STORAGE_KEY) ?? "{}") as Partial<OnboardingStatus>;
    return { code: value.code === true, algorithms: value.algorithms === true };
  } catch {
    return { ...defaultOnboardingStatus };
  }
}

export function completeOnboarding(status: OnboardingStatus, workspace: OnboardingWorkspace): OnboardingStatus {
  return { ...status, [workspace]: true };
}

function isPosition(value: unknown): value is CityNodePosition {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { left?: unknown; top?: unknown };
  return typeof candidate.left === "number" && Number.isFinite(candidate.left) && typeof candidate.top === "number" && Number.isFinite(candidate.top);
}

function isScenario(value: unknown): value is SharedGraphScenario {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SharedGraphScenario>;
  if (candidate.version !== 1 || typeof candidate.graphText !== "string" || typeof candidate.startStop !== "string" || typeof candidate.targetStop !== "string") return false;
  if (candidate.graphText.length === 0 || candidate.graphText.length > MAX_GRAPH_TEXT_LENGTH || candidate.startStop.length === 0 || candidate.startStop.length > MAX_STOP_NAME_LENGTH || candidate.targetStop.length === 0 || candidate.targetStop.length > MAX_STOP_NAME_LENGTH) return false;
  return Boolean(candidate.nodePositions && Object.values(candidate.nodePositions).every(isPosition));
}

export function serializeGraphScenario(scenario: SharedGraphScenario): string {
  return new URLSearchParams({ scenario: JSON.stringify(scenario) }).toString();
}

export function parseGraphScenario(search: string): SharedGraphScenario | null {
  try {
    const raw = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("scenario");
    if (!raw || raw.length > MAX_GRAPH_TEXT_LENGTH * 3) return null;
    const candidate: unknown = JSON.parse(raw);
    return isScenario(candidate) ? candidate : null;
  } catch {
    return null;
  }
}
