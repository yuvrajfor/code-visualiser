import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createRealWorldStory, getActionSound } from "../client/src/lib/realWorldLearning";
import { getStoryShortcutAction } from "../client/src/lib/storyControls";
import { getStoryCodeLines } from "../client/src/lib/storyFocus";
import { getSavedVisualTheme, getVisualTheme, saveVisualTheme, visualThemes } from "../client/src/lib/learningThemes";
import { createCityRouteStory, createCityRouteWalkthrough, createDijkstraRouteWalkthrough, findFastestCityPath, findShortestCityPath, getCityGraphPositions, getCityLiveNarration, getCityRouteWalkthrough, parseCityGraph } from "../client/src/lib/cityRoutes";
import { getInitialLearningWorkspace, getLearningWorkspace, getLearningWorkspaceLabel } from "../client/src/lib/workspaceNavigation";
import { completeOnboarding, defaultOnboardingStatus, finishOnboardingTour, getNextOnboardingStep, getPendingOnboardingWorkspace, getPreviousOnboardingStep, parseGraphScenario, readOnboardingStatus, serializeGraphScenario, shouldDisplayOnboardingCoach } from "../client/src/lib/learningFlow";
import { createCityMapExportData, getCityMapExportFileBase } from "../client/src/lib/cityMapExports";
import { getStoryLearningScore } from "../client/src/lib/learningScore";
import { CodeStoryInterpreterError, createFallbackApiCodeStory, createInterpreterRequestStore, createSourceExecutionState, getInterpreterTextContent, getMeaningfulSourceLines, normalizeApiCodeStory, resolveInterpreterStory } from "./codeStoryInterpreter";
import { cinematicSceneInputSchema, renderCinematicScene } from "./cinematicSceneRenderer";
import { generateAIVisual } from "./aiVisualGenerator";

describe("premium learning workspace navigation", () => {
  it("opens directly into Code Studio for a new learner", () => {
    expect(getInitialLearningWorkspace()).toBe("code");
  });

  it("keeps the landing home focused until a learner chooses code or algorithms", () => {
    expect(getLearningWorkspace("home")).toBe("overview");
    expect(getLearningWorkspace("open-code")).toBe("code");
    expect(getLearningWorkspace("open-algorithms")).toBe("algorithms");
  });

  it("uses clear labels for the focused entry states", () => {
    expect(getLearningWorkspaceLabel("overview")).toBe("Learning home");
    expect(getLearningWorkspaceLabel("code")).toBe("Code Studio");
    expect(getLearningWorkspaceLabel("algorithms")).toBe("Algorithm Lab");
  });
});

describe("transparent story learning score", () => {
  it("scores only distinct valid story steps that a learner has opened", () => {
    expect(getStoryLearningScore(4, [0, 1, 1, -1, 7])).toEqual({
      exploredSteps: 2,
      totalSteps: 4,
      score: 50,
      isComplete: false,
      status: "2 of 4 story steps explored",
    });
  });

  it("marks a story complete only when every step has been explored", () => {
    expect(getStoryLearningScore(3, [2, 0, 1])).toMatchObject({
      exploredSteps: 3,
      totalSteps: 3,
      score: 100,
      isComplete: true,
      status: "Every story step explored",
    });
    expect(getStoryLearningScore(0, [0])).toMatchObject({ score: 0, isComplete: false, status: "Create a story to begin" });
  });
});

describe("contextual onboarding and shared graph scenarios", () => {
  it("keeps first-time guidance separate for Code Studio and Algorithm Lab", () => {
    const afterCode = completeOnboarding(defaultOnboardingStatus, "code");
    const storage = { getItem: () => JSON.stringify(afterCode) };

    expect(afterCode).toEqual({ code: true, algorithms: false });
    expect(readOnboardingStatus(storage)).toEqual({ code: true, algorithms: false });
  });

  it("moves a coaching card forward and back, completing only after its final step or a skip", () => {
    expect(getPreviousOnboardingStep(0)).toBe(0);
    expect(getPreviousOnboardingStep(2)).toBe(1);
    expect(getNextOnboardingStep("code", 0)).toEqual({ stepIndex: 1, isComplete: false });
    expect(getNextOnboardingStep("code", 1)).toEqual({ stepIndex: 2, isComplete: false });
    expect(getNextOnboardingStep("code", 2)).toEqual({ stepIndex: 2, isComplete: true });
    expect(completeOnboarding(defaultOnboardingStatus, "algorithms")).toEqual({ code: false, algorithms: true });
  });

  it("lets a learner skip one guide without marking the other guide complete", () => {
    const skippedTour = finishOnboardingTour(defaultOnboardingStatus, "code");

    expect(skippedTour).toEqual({ status: { code: true, algorithms: false }, workspace: null, stepIndex: 0 });
  });

  it("opens the Code Studio guide for a direct first-time entry without reopening an active or completed guide", () => {
    expect(getPendingOnboardingWorkspace("code", defaultOnboardingStatus, null)).toBe("code");
    expect(getPendingOnboardingWorkspace("code", { code: true, algorithms: false }, null)).toBeNull();
    expect(getPendingOnboardingWorkspace("code", defaultOnboardingStatus, "algorithms")).toBeNull();
  });

  it("keeps first-time coaching on the setup screen instead of covering generated story playback", () => {
    expect(shouldDisplayOnboardingCoach("landing", "code")).toBe(true);
    expect(shouldDisplayOnboardingCoach("studio", "code")).toBe(false);
    expect(shouldDisplayOnboardingCoach("comparison", "algorithms")).toBe(false);
  });

  it("round-trips a versioned city-map scenario with its learner-arranged layout", () => {
    const scenario = { version: 1 as const, graphText: "Cafe: Park (2)\nPark: Restaurant (3)\nRestaurant:", startStop: "Cafe", targetStop: "Restaurant", nodePositions: { Cafe: { left: 18, top: 72 }, Park: { left: 48, top: 28 }, Restaurant: { left: 82, top: 54 } } };

    expect(parseGraphScenario(serializeGraphScenario(scenario))).toEqual(scenario);
    expect(parseGraphScenario("?scenario=not-json")).toBeNull();
  });

  it("creates an export-ready City Map file with weighted roads and the learner-arranged layout", () => {
    const exportData = createCityMapExportData({
      graphText: "Cafe: Park (2)\nPark: Restaurant (3)\nRestaurant:",
      startStop: "Cafe",
      targetStop: "Restaurant",
      stops: ["Cafe", "Park", "Restaurant"],
      weightedGraph: { Cafe: [{ to: "Park", weight: 2 }], Park: [{ to: "Restaurant", weight: 3 }], Restaurant: [] },
      nodePositions: { Cafe: { left: 18, top: 72 }, Park: { left: 48, top: 28 }, Restaurant: { left: 82, top: 54 } },
      algorithmOutcomes: { bfsPath: ["Cafe", "Park", "Restaurant"], dfsPath: ["Cafe", "Park", "Restaurant"], dijkstraPath: ["Cafe", "Park", "Restaurant"], dijkstraTravelMinutes: 5 },
    });

    expect(exportData).toEqual(expect.objectContaining({ format: "code-story-studio-city-map", version: 1, map: expect.objectContaining({ directed: true, travelTimeUnit: "minutes", roads: [{ from: "Cafe", to: "Park", travelMinutes: 2 }, { from: "Park", to: "Restaurant", travelMinutes: 3 }] }), scenario: expect.objectContaining({ startStop: "Cafe", targetStop: "Restaurant", nodePositions: expect.objectContaining({ Park: { left: 48, top: 28 } }) }), comparison: expect.objectContaining({ dijkstra: { objective: "lowest travel time", route: ["Cafe", "Park", "Restaurant"], travelMinutes: 5 } }) }));
    expect(getCityMapExportFileBase("Cafe & Corner", "The Restaurant")).toBe("city-map-cafe-corner-to-the-restaurant");
  });
});

describe("createRealWorldStory", () => {
  it("keeps API-generated visual steps tied to every meaningful line of the learner's source", () => {
    const source = "function greet(name) {\n  const message = `Hello ${name}`;\n  return message;\n}";
    const story = normalizeApiCodeStory(source, {
      summary: "This code prepares a greeting and sends it back. It uses the supplied name inside the greeting.",
      steps: [
        { lineNumber: 1, kind: "workshop", icon: "🛠️", title: "Prepare the greeting job", plainEnglish: "This line gives a name to the job that will make a greeting.", whatChanged: "The greeting job is ready to use later.", analogy: "It is like placing a labelled recipe card on the counter.", objectLabel: "Greeting recipe", visualFocus: "A recipe card named greet is placed on a workbench." },
        { lineNumber: 2, kind: "storage-shelf", icon: "🗃️", title: "Write a greeting message", plainEnglish: "This line puts Hello and the supplied name into a box called message.", whatChanged: "The message box now holds the greeting.", analogy: "It is like writing a greeting on a card and placing it in a labelled drawer.", objectLabel: "message", visualFocus: "A drawer labelled message receives a Hello card." },
        { lineNumber: 3, kind: "delivery-desk", icon: "📦", title: "Send the greeting back", plainEnglish: "This line sends the finished greeting back to the place that asked for it.", whatChanged: "The greeting is ready for delivery.", analogy: "It is like placing a finished card on a delivery desk.", objectLabel: "Greeting card", visualFocus: "A greeting card is placed on a delivery desk." },
        { lineNumber: 4, kind: "workbench", icon: "✅", title: "Finish the greeting job", plainEnglish: "This line closes the group of instructions that made the greeting.", whatChanged: "The greeting instructions are complete.", analogy: "It is like closing the recipe after the cooking steps are done.", objectLabel: "Finished recipe", visualFocus: "A completed recipe card is placed in a finished tray." },
      ],
    });

    expect(getMeaningfulSourceLines(source).map((line) => line.lineNumber)).toEqual([1, 2, 3, 4]);
    expect(story.steps.map((step) => step.lineNumber)).toEqual([1, 2, 3, 4]);
    expect(story.steps[1]?.visualFocus).toContain("message");
    expect(story.steps[1]?.objectLabel).toBe("message");
    expect(story.steps[1]?.analogy).toContain("labelled");
    expect(story.steps[1]?.executionState).toEqual({ subject: "message", action: "Creates a named value", change: "The name message is connected to the expression shown on this line." });
  });

  it("keeps source-specific explanation details supplied by the stronger interpreter contract", () => {
    const story = normalizeApiCodeStory("let score = total + bonus;", {
      summary: "The code adds two numbers. It keeps the result under a clear name.",
      steps: [{ lineNumber: 1, kind: "storage-shelf", title: "Add the points", plainEnglish: "This line adds total and bonus. It keeps the combined number ready to use as score.", whatChanged: "The score box now holds the combined points.", analogy: "It is like adding two receipts and writing the total on one card.", objectLabel: "score total", visualFocus: "Two number cards combine and slide into the score box." }],
    });

    expect(story.steps[0]).toMatchObject({
      whatChanged: "The score box now holds the combined points.",
      analogy: "It is like adding two receipts and writing the total on one card.",
      objectLabel: "score total",
      visualFocus: "Two number cards combine and slide into the score box.",
    });
    expect(createRealWorldStory("const score = 7;", 1).icon).toBe("archive");
  });

  it("derives bounded execution-state language from source text without running learner code", () => {
    expect(createSourceExecutionState("items.push(apple);")).toEqual({ subject: "items", action: "Changes a collection", change: "This call asks items to add, remove, or rearrange an item." });
    expect(createSourceExecutionState("if (basket.length === 0) {")).toEqual({ subject: "Choice", action: "Checks a condition", change: "The next path depends on whether this check is true or false." });
    expect(createSourceExecutionState("return answer;")).toEqual({ subject: "Result", action: "Returns an answer", change: "The value on this line is prepared to leave the current instruction." });
  });

  it("rejects an API story that skips a meaningful source line", () => {
    const source = "let apples = 2;\nreturn apples;";
    const incomplete = {
      summary: "The code stores apples and sends them back.",
      steps: [
        { lineNumber: 1, kind: "storage-shelf", icon: "🗃️", title: "Store apples", plainEnglish: "This line puts 2 into an apples box.", whatChanged: "The apples box is filled.", analogy: "It is like placing two apples in a labelled basket.", objectLabel: "apples", visualFocus: "Two apples enter a labelled basket." },
      ],
    };

    expect(() => normalizeApiCodeStory(source, incomplete)).toThrow(CodeStoryInterpreterError);
  });

  it("returns a complete local visual guide when model output is empty or partial", () => {
    const source = "let apples = 2;\nreturn apples;";
    const emptyStory = resolveInterpreterStory(source, "");
    const partialStory = resolveInterpreterStory(source, JSON.stringify({ summary: "Only one line is ready.", steps: [] }));

    expect(emptyStory.source).toBe("fallback");
    expect(emptyStory.steps.map((step) => step.lineNumber)).toEqual([1, 2]);
    expect(emptyStory.steps[0]?.executionState.subject).toBe("apples");
    expect(emptyStory.steps[1]?.executionState.action).toBe("Returns an answer");
    expect(partialStory.source).toBe("fallback");
    expect(partialStory.steps).toHaveLength(2);
    expect(getInterpreterTextContent([{ type: "text", text: '{"summary":"ready"}' }])).toBe('{"summary":"ready"}');
  });

  it("shares matching interpreter requests and caches only successful API stories", async () => {
    let time = 1_000;
    let calls = 0;
    const store = createInterpreterRequestStore({ ttlMs: 500, now: () => time });
    const input = { code: "let apple = 1;", language: "JavaScript" };
    const apiStory = normalizeApiCodeStory(input.code, {
      summary: "A box is prepared. It stores one apple.",
      steps: [{ lineNumber: 1, kind: "storage-shelf", title: "Store one apple", plainEnglish: "A labeled box is given the number one.", visualFocus: "A box labelled apple holds one." }],
    });
    const apiLoader = async () => {
      calls += 1;
      return apiStory;
    };

    const [first, second] = await Promise.all([store.resolve(input, apiLoader), store.resolve(input, apiLoader)]);
    expect(first.source).toBe("api");
    expect(second.source).toBe("api");
    expect(calls).toBe(1);

    await store.resolve(input, apiLoader);
    expect(calls).toBe(1);

    time += 501;
    await store.resolve(input, apiLoader);
    expect(calls).toBe(2);

    let fallbackCalls = 0;
    const fallbackInput = { ...input, problemTitle: "Fallback check" };
    const fallbackLoader = async () => {
      fallbackCalls += 1;
      return createFallbackApiCodeStory(input.code);
    };
    await store.resolve(fallbackInput, fallbackLoader);
    await store.resolve(fallbackInput, fallbackLoader);
    expect(fallbackCalls).toBe(2);
  });

  it("marks exactly the story-driving source line as active", () => {
    expect(getStoryCodeLines("let apples = 2;\nreturn apples;", 2)).toEqual([
      { lineNumber: 1, text: "let apples = 2;", isActive: false },
      { lineNumber: 2, text: "return apples;", isActive: true },
    ]);
  });

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

  it("gives a closing brace a simple completion meaning", () => {
    const story = createRealWorldStory("}", 4);

    expect(story.title).toBe("This part of the job is complete");
    expect(story.plainEnglish).toContain("closes");
    expect(story.analogy).toContain("recipe");
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

  it("offers Kitchen, Office, Game World, Mandala Study, and High Contrast themes", () => {
    expect(visualThemes.map((theme) => theme.id)).toEqual(["kitchen", "office", "game", "mandala", "high-contrast"]);
    expect(getVisualTheme("game").name).toBe("Game World");
    expect(getVisualTheme("mandala").name).toBe("Mandala Study");
    expect(getVisualTheme("high-contrast").name).toBe("High Contrast");
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

  it("explains BFS as a nearby-first city waiting line", () => {
    const story = createRealWorldStory('queue = deque(["Cafe"])', 7);

    expect(story.kind).toBe("city-map");
    expect(story.plainEnglish).toContain("nearby places first");
    expect(story.analogy).toContain("queue");
  });

  it("explains DFS as a route that goes deep and then backtracks", () => {
    const story = createRealWorldStory("path.append(next_stop)", 13);

    expect(story.kind).toBe("city-map");
    expect(story.plainEnglish).toContain("comes back");
    expect(story.analogy).toContain("maze");
  });

  it("creates a BFS route that keeps closer stops ahead of farther stops", () => {
    const steps = getCityRouteWalkthrough("bfs");

    expect(steps.map((step) => step.currentStop)).toEqual(["Cafe", "Cafe", "Cafe", "Library", "Library", "Park", "Museum"]);
    expect(steps[4]?.pendingStops).toEqual(["Park", "Museum"]);
    expect(steps.at(-1)?.visitedStops).toEqual(["Cafe", "Library", "Park", "Museum"]);
  });

  it("creates a DFS route that follows one road and then returns", () => {
    const steps = getCityRouteWalkthrough("dfs");
    const backtrack = steps.find((step) => step.phase === "backtrack");
    const story = createCityRouteStory(backtrack!);

    expect(steps.map((step) => step.currentStop)).toEqual(["Cafe", "Cafe", "Library", "Museum", "Library", "Park"]);
    expect(backtrack?.pathStops).toEqual(["Cafe", "Library"]);
    expect(story.plainEnglish).toContain("Depth-first search");
  });

  it("parses a learner-defined city map and adds stops that only appear at the end of a road", () => {
    const parsed = parseCityGraph("Cafe: Library, Park\nLibrary: Museum\nPark:");

    expect(parsed.stops).toEqual(["Cafe", "Library", "Park", "Museum"]);
    expect(parsed.graph.Library).toEqual(["Museum"]);
    expect(parsed.graph.Museum).toEqual([]);
  });

  it("explains invalid custom city-map entries with a clear validation error", () => {
    expect(() => parseCityGraph("Cafe: Library\nCafe: Park")).toThrow("appears more than once");
    expect(() => parseCityGraph("Cafe - Library\nLibrary:")).toThrow("format");
  });

  it("builds a custom BFS route that reaches the target through the fewest roads", () => {
    const graph = parseCityGraph("Cafe: Library, Park\nLibrary: Museum\nPark: Restaurant\nMuseum: Restaurant\nRestaurant:").graph;
    const steps = createCityRouteWalkthrough(graph, "bfs", "Cafe", "Restaurant");
    const result = steps.find((step) => step.phase === "complete");

    expect(result?.currentStop).toBe("Restaurant");
    expect(result?.shortestPath).toEqual(["Cafe", "Park", "Restaurant"]);
    expect(result?.actionLabel).toContain("fewest roads");
  });

  it("builds a contrasting custom DFS route with an explicit return from a deeper road", () => {
    const graph = parseCityGraph("Cafe: Library, Park\nLibrary: Museum\nPark:\nMuseum:").graph;
    const steps = createCityRouteWalkthrough(graph, "dfs", "Cafe", "Park");

    expect(steps.map((step) => step.currentStop)).toContain("Museum");
    expect(steps.find((step) => step.phase === "backtrack")?.pathStops).toEqual(["Cafe", "Park"]);
  });

  it("returns no shortest route when the target cannot be reached on directed roads", () => {
    const graph = parseCityGraph("Cafe: Library\nLibrary:\nPark:").graph;

    expect(findShortestCityPath(graph, "Cafe", "Park")).toBeNull();
  });

  it("parses optional road times while preserving the normal city-map neighbors", () => {
    const parsed = parseCityGraph("Cafe: Library (4), Park (2)\nLibrary: Restaurant (7)\nPark: Restaurant (3)\nRestaurant:");

    expect(parsed.graph.Cafe).toEqual(["Library", "Park"]);
    expect(parsed.weightedGraph.Cafe).toEqual([{ to: "Library", weight: 4 }, { to: "Park", weight: 2 }]);
    expect(parsed.weightedGraph.Restaurant).toEqual([]);
  });

  it("uses Dijkstra to prefer the quickest travel-time route over an earlier longer road", () => {
    const parsed = parseCityGraph("Cafe: Library (4), Park (2)\nLibrary: Restaurant (7)\nPark: Restaurant (3)\nRestaurant:");
    const steps = createDijkstraRouteWalkthrough(parsed.weightedGraph, "Cafe", "Restaurant");
    const result = steps.at(-1);
    const story = createCityRouteStory(result!);

    expect(result?.shortestPath).toEqual(["Cafe", "Park", "Restaurant"]);
    expect(result?.shortestTravelTime).toBe(5);
    expect(result?.travelTime).toBe(5);
    expect(story.plainEnglish).toContain("Dijkstra");
    expect(story.whatChanged).toContain("5 minutes");
  });

  it("creates synchronized live commentary for BFS, DFS, and Dijkstra states", () => {
    const parsed = parseCityGraph("Home: Market (9), Park (2)\nMarket: Clinic (2)\nPark: Clinic (2)\nClinic:");
    const narration = getCityLiveNarration({
      bfs: createCityRouteWalkthrough(parsed.graph, "bfs", "Home", "Clinic")[0]!,
      dfs: createCityRouteWalkthrough(parsed.graph, "dfs", "Home", "Clinic")[0]!,
      dijkstra: createDijkstraRouteWalkthrough(parsed.weightedGraph, "Home", "Clinic")[0]!,
    });

    expect(narration.bfs).toEqual(expect.objectContaining({ heading: "BFS · nearby first", context: "At Home. It cares about the fewest roads." }));
    expect(narration.dfs.heading).toBe("DFS · one road deep");
    expect(narration.dijkstra).toEqual(expect.objectContaining({ heading: "Dijkstra · lowest time", context: "At Home. Best known time: 0 minutes." }));
  });

  it("creates stable bounded positions for every custom node so a shared drag layout can be reused", () => {
    const stops = ["Home", "Market", "Park", "Clinic"];
    const firstLayout = getCityGraphPositions(stops);
    const secondLayout = getCityGraphPositions(stops);

    expect(secondLayout).toEqual(firstLayout);
    expect(Object.keys(firstLayout)).toEqual(stops);
    expect(Object.values(firstLayout).every(({ left, top }) => left >= 0 && left <= 100 && top >= 0 && top <= 100)).toBe(true);
    expect(new Set(Object.values(firstLayout).map(({ left, top }) => `${left}-${top}`)).size).toBe(stops.length);
  });

  it("returns no fastest route when a weighted target is unreachable and supplies numeric default positions", () => {
    const parsed = parseCityGraph("Cafe: Library (2)\nLibrary:\nPark:");

    expect(findFastestCityPath(parsed.weightedGraph, "Cafe", "Park")).toBeNull();
    expect(getCityGraphPositions(["Cafe", "Library"]).Cafe).toEqual(expect.objectContaining({ left: expect.any(Number), top: expect.any(Number) }));
  });

  it("saves and restores a learner's visual-world preference", () => {
    const entries = new Map<string, string>();
    const storage = {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => entries.set(key, value),
    };

    saveVisualTheme("high-contrast", storage);
    expect(getSavedVisualTheme(storage)).toBe("high-contrast");
  });
});

describe("Python cinematic scene renderer", () => {
  const sceneInput = {
    kind: "storage-shelf" as const,
    title: "Store the answer",
    plainEnglish: "Put the first answer in a labelled box so it is easy to find again.",
    visualFocus: "A labelled answer box waits on a tidy shelf.",
    codeLine: 'let answer = "not found";',
    lineNumber: 2,
  };

  it("enforces the compact safe request contract before a renderer process is started", () => {
    expect(cinematicSceneInputSchema.parse(sceneInput)).toEqual(sceneInput);
    expect(cinematicSceneInputSchema.parse({ ...sceneInput, lineNumber: 81 })).toEqual({ ...sceneInput, lineNumber: 81 });
    expect(() => cinematicSceneInputSchema.parse({ ...sceneInput, kind: "unknown-scene" })).toThrow();
    expect(() => cinematicSceneInputSchema.parse({ ...sceneInput, lineNumber: 0 })).toThrow();
    expect(() => cinematicSceneInputSchema.parse({ ...sceneInput, lineNumber: 12_001 })).toThrow();
  });

  it("renders a cinematic scene for a long-code source line beyond the former 80-line limit", async () => {
    const scene = await renderCinematicScene({ ...sceneInput, lineNumber: 321 });

    expect(scene).toEqual(expect.objectContaining({ renderer: "python-svg", caption: expect.any(String) }));
    expect(scene.svg).toContain("CODE SCENE");
  });

  it("returns valid rich SVG artwork for representative real-world scenes", async () => {
    const scenes = await Promise.all(
      (["storage-shelf", "decision-gate", "recursion-stairs", "city-map"] as const).map((kind) => renderCinematicScene({ ...sceneInput, kind })),
    );

    expect(scenes).toHaveLength(4);
    for (const scene of scenes) {
      expect(scene).toEqual(expect.objectContaining({ renderer: "python-svg", caption: expect.any(String) }));
      expect(scene.svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(scene.svg).toContain("CODE SCENE");
      expect(scene.svg).toContain('preserveAspectRatio="xMidYMid meet"');
      expect(scene.svg).toContain('filter id="depthShadow"');
      expect(scene.svg).toContain('M190 454L640 346 1090 454');
    }
  });

  it("shares duplicate concurrent work and retains the successful scene for the next request", async () => {
    const input = { ...sceneInput, kind: "delivery-desk" as const, title: "Deliver the answer" };
    const [first, second] = await Promise.all([renderCinematicScene(input), renderCinematicScene(input)]);
    const cached = await renderCinematicScene(input);

    expect(second).toBe(first);
    expect(cached).toBe(first);
  });
});

describe("AI visual capacity fallback", () => {
  const visualInput = {
    kind: "storage-shelf",
    title: "Store one value for a quota fallback test",
    plainEnglish: "This line places one value in a labelled box.",
    visualFocus: "One labelled box waits on a tidy shelf.",
    codeLine: "const total = 0;",
    lineNumber: 1,
    theme: "kitchen" as const,
  };

  it("turns an exhausted image-generation quota into a learner-safe fallback response", async () => {
    const result = await generateAIVisual(visualInput, async () => {
      throw new Error('Image generation request failed (400 Bad Request): {"code":"failed_precondition","message":"your account has hit a usage exhausted"}');
    });

    expect(result).toEqual(expect.objectContaining({
      imageUrl: null,
      provider: "built-in-image",
      fallbackReason: "quota_exhausted",
      message: expect.stringContaining("interactive 3D scene"),
    }));
  });
});

describe("state-first Code Studio workspace contract", () => {
  const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
  const styleSource = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

  it("keeps the simplified visual page focused on current code, one visual, and one explanation", () => {
    const primaryVisualIndex = homeSource.indexOf("data-primary-visual-stage");
    const diagramIndex = homeSource.indexOf("<Simple2DVisualPanel step={currentStep} previousStep={steps[currentStepIndex - 1]}", primaryVisualIndex);
    const directExplanationIndex = homeSource.indexOf("data-direct-explanation-panel");

    expect(primaryVisualIndex).toBeGreaterThan(-1);
    expect(diagramIndex).toBeGreaterThan(primaryVisualIndex);
    expect(directExplanationIndex).toBeGreaterThan(diagramIndex);
    expect(homeSource).toContain("simple-story-page");
    expect(homeSource).toContain("Current line");
    expect(homeSource).toContain('simple-panel-label">Visual');
    expect(homeSource).toContain('simple-panel-label">Explanation');
    expect(homeSource).toContain("data-execution-rail");
    expect(homeSource).toContain("data-active-code-line={currentStep.line}");
    expect(homeSource).toContain("execution-rail-steps");
    expect(homeSource).toContain("data-explanation-scroll");
    expect(homeSource).toContain("explanation-history-");
    expect(homeSource).toContain("data-state-comparison-toggle");
    expect(homeSource).toContain("data-array-cells");
    expect(homeSource).toContain("data-variable-table");
    expect(homeSource).toContain('?? "mandala"');
    expect(homeSource).toContain("Object");
    expect(homeSource).toContain("Action");
    expect(homeSource).toContain("Result");
    expect(homeSource).toContain("data-array-cells");
    expect(homeSource).toContain("data-pointer-arrows");
    expect(homeSource).toContain("data-variable-table");
    expect(homeSource).toContain("data-state-comparison-toggle");
    expect(homeSource).not.toContain("data-primary-cinematic-scene");
    expect(styleSource).toContain(".simple-explanation-scroll");
    expect(styleSource).toContain(".simple-explanation-copy.is-current");
    expect(styleSource).toContain(".simple-2d-diagram");
    expect(styleSource).toContain("Mandala study theme");
    expect(homeSource).not.toContain("Interactive state map");
    expect(homeSource).not.toContain("data-ai-visual-control");
  });

  it("uses semantic line icons and a restrained depth frame instead of browser emoji cues", () => {
    expect(homeSource).toContain("<SceneKindIcon kind={preset.kind}");
    expect(homeSource).toContain("<ThemeKindIcon theme={theme.id}");
    expect(homeSource).not.toContain("{preset.icon}");
    expect(homeSource).not.toContain("{theme.icon}");
    expect(homeSource).not.toMatch(/[🛠📦🧠]/u);
    expect(styleSource).toContain(".cinematic-art-frame");
    expect(styleSource).toContain("transform-style: preserve-3d");
    expect(styleSource).not.toMatch(/[💼🎮]/u);
  });

  it("supports a persisted high-contrast visual setting and motion-safe execution transitions", () => {
    expect(homeSource).toContain('data-visual-theme={visualTheme}');
    expect(homeSource).toContain('"high-contrast": Eye');
    expect(homeSource).toContain("execution-state-enter");
    expect(styleSource).toContain(".visual-theme-high-contrast");
    expect(styleSource).toContain(".execution-state-enter");
    expect(styleSource).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("keeps the mandala theme colourful, living, and safe to pause for reduced motion", () => {
    expect(styleSource).toContain("Living mandala backdrop");
    expect(styleSource).toContain(".lab-shell.visual-theme-mandala:not(.visual-theme-high-contrast)");
    expect(styleSource).toContain("background-color: #f8f5ed");
    expect(styleSource).toContain("@keyframes mandala-drift");
    expect(styleSource).toContain("animation: mandala-drift 28s linear infinite alternate");
    expect(styleSource).toContain(".lab-shell.visual-theme-mandala:not(.visual-theme-high-contrast) {\n    animation: none;");
  });

  it("uses a cohesive blue-slate interface palette without the former competing warm and neon tokens", () => {
    expect(styleSource).toContain("Modern blue-slate product palette");
    expect(styleSource).toContain("background-color: #f4f7fb");
    expect(styleSource).toContain("background: #eff6ff");
    expect(styleSource).toContain(".visual-theme-high-contrast");
    expect(styleSource).not.toContain("#beff4d");
    expect(styleSource).not.toContain("#ff9cc8");
    expect(styleSource).not.toContain("#fff5ca");
  });
});
