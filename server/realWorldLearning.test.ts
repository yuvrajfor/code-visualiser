import { describe, expect, it } from "vitest";
import { createRealWorldStory, getActionSound } from "../client/src/lib/realWorldLearning";
import { getStoryShortcutAction } from "../client/src/lib/storyControls";
import { getSavedVisualTheme, getVisualTheme, saveVisualTheme, visualThemes } from "../client/src/lib/learningThemes";
import { createCityRouteStory, createCityRouteWalkthrough, createDijkstraRouteWalkthrough, findFastestCityPath, findShortestCityPath, getCityGraphPositions, getCityLiveNarration, getCityRouteWalkthrough, parseCityGraph } from "../client/src/lib/cityRoutes";

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

    saveVisualTheme("office", storage);
    expect(getSavedVisualTheme(storage)).toBe("office");
  });
});
