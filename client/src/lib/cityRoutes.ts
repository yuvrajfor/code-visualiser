import type { RealWorldStory } from "./realWorldLearning";

export type CityRouteAlgorithm = "bfs" | "dfs";

export type CityRouteState = {
  algorithm: CityRouteAlgorithm;
  line: number;
  code: string;
  currentStop: string;
  pendingStops: string[];
  visitedStops: string[];
  pathStops: string[];
  activeRoad?: [string, string];
  phase: "prepare" | "visit" | "queue" | "explore" | "backtrack" | "complete";
  actionLabel: string;
};

const bfsRoute: CityRouteState[] = [
  {
    algorithm: "bfs",
    line: 7,
    code: 'queue = deque(["Cafe"])',
    currentStop: "Cafe",
    pendingStops: ["Cafe"],
    visitedStops: [],
    pathStops: [],
    phase: "prepare",
    actionLabel: "Put Cafe at the start of the waiting line.",
  },
  {
    algorithm: "bfs",
    line: 10,
    code: "stop = queue.popleft()",
    currentStop: "Cafe",
    pendingStops: [],
    visitedStops: ["Cafe"],
    pathStops: ["Cafe"],
    phase: "visit",
    actionLabel: "Visit Cafe first because it was waiting first.",
  },
  {
    algorithm: "bfs",
    line: 13,
    code: "queue.append(next_stop)",
    currentStop: "Cafe",
    pendingStops: ["Library", "Park"],
    visitedStops: ["Cafe"],
    pathStops: ["Cafe"],
    activeRoad: ["Cafe", "Library"],
    phase: "queue",
    actionLabel: "Put both nearby stops in line before going farther away.",
  },
  {
    algorithm: "bfs",
    line: 10,
    code: "stop = queue.popleft()",
    currentStop: "Library",
    pendingStops: ["Park"],
    visitedStops: ["Cafe", "Library"],
    pathStops: ["Cafe", "Library"],
    activeRoad: ["Cafe", "Library"],
    phase: "visit",
    actionLabel: "Visit Library next because it is at the front of the line.",
  },
  {
    algorithm: "bfs",
    line: 13,
    code: "queue.append(next_stop)",
    currentStop: "Library",
    pendingStops: ["Park", "Museum"],
    visitedStops: ["Cafe", "Library"],
    pathStops: ["Cafe", "Library"],
    activeRoad: ["Library", "Museum"],
    phase: "queue",
    actionLabel: "Museum joins the back of the line, behind the closer Park.",
  },
  {
    algorithm: "bfs",
    line: 10,
    code: "stop = queue.popleft()",
    currentStop: "Park",
    pendingStops: ["Museum"],
    visitedStops: ["Cafe", "Library", "Park"],
    pathStops: ["Cafe", "Park"],
    activeRoad: ["Cafe", "Park"],
    phase: "visit",
    actionLabel: "Visit Park before Museum because Park was already waiting.",
  },
  {
    algorithm: "bfs",
    line: 10,
    code: "stop = queue.popleft()",
    currentStop: "Museum",
    pendingStops: [],
    visitedStops: ["Cafe", "Library", "Park", "Museum"],
    pathStops: ["Cafe", "Library", "Museum"],
    activeRoad: ["Library", "Museum"],
    phase: "complete",
    actionLabel: "Museum is the last stop. Every nearby level was checked first.",
  },
];

const dfsRoute: CityRouteState[] = [
  {
    algorithm: "dfs",
    line: 7,
    code: 'path = ["Cafe"]',
    currentStop: "Cafe",
    pendingStops: ["Cafe"],
    visitedStops: [],
    pathStops: ["Cafe"],
    phase: "prepare",
    actionLabel: "Start at Cafe and place it on the road stack.",
  },
  {
    algorithm: "dfs",
    line: 10,
    code: "stop = path.pop()",
    currentStop: "Cafe",
    pendingStops: [],
    visitedStops: ["Cafe"],
    pathStops: ["Cafe"],
    phase: "visit",
    actionLabel: "Visit Cafe, then choose one road to follow deeply.",
  },
  {
    algorithm: "dfs",
    line: 13,
    code: "path.append(next_stop)",
    currentStop: "Library",
    pendingStops: ["Park", "Library"],
    visitedStops: ["Cafe", "Library"],
    pathStops: ["Cafe", "Library"],
    activeRoad: ["Cafe", "Library"],
    phase: "explore",
    actionLabel: "Choose Library and keep following this road instead of visiting Park yet.",
  },
  {
    algorithm: "dfs",
    line: 13,
    code: "path.append(next_stop)",
    currentStop: "Museum",
    pendingStops: ["Park", "Museum"],
    visitedStops: ["Cafe", "Library", "Museum"],
    pathStops: ["Cafe", "Library", "Museum"],
    activeRoad: ["Library", "Museum"],
    phase: "explore",
    actionLabel: "Keep going to Museum. This path is explored as far as it can go.",
  },
  {
    algorithm: "dfs",
    line: 10,
    code: "stop = path.pop()",
    currentStop: "Library",
    pendingStops: ["Park"],
    visitedStops: ["Cafe", "Library", "Museum"],
    pathStops: ["Cafe", "Library"],
    activeRoad: ["Library", "Museum"],
    phase: "backtrack",
    actionLabel: "Museum has no new road, so turn back to the last choice.",
  },
  {
    algorithm: "dfs",
    line: 10,
    code: "stop = path.pop()",
    currentStop: "Park",
    pendingStops: [],
    visitedStops: ["Cafe", "Library", "Museum", "Park"],
    pathStops: ["Cafe", "Park"],
    activeRoad: ["Cafe", "Park"],
    phase: "complete",
    actionLabel: "Back at Cafe, follow the remaining road to Park. The map is complete.",
  },
];

export function getCityRouteWalkthrough(algorithm: CityRouteAlgorithm): CityRouteState[] {
  const route = algorithm === "bfs" ? bfsRoute : dfsRoute;
  return route.map((step) => ({
    ...step,
    pendingStops: [...step.pendingStops],
    visitedStops: [...step.visitedStops],
    pathStops: [...step.pathStops],
    activeRoad: step.activeRoad ? [...step.activeRoad] as [string, string] : undefined,
  }));
}

export function createCityRouteStory(route: CityRouteState): RealWorldStory {
  const isBfs = route.algorithm === "bfs";
  const action = route.actionLabel;
  const title = isBfs ? "The city queue chooses the next stop" : "The city explorer follows one road";

  return {
    kind: "city-map",
    icon: isBfs ? "🚏" : "🧭",
    title,
    plainEnglish: isBfs
      ? `${action} Breadth-first search checks all nearby places before it moves to a farther street.`
      : `${action} Depth-first search keeps following one road until it cannot go farther, then it comes back to try the next road.`,
    whatChanged: isBfs
      ? `The waiting line now shows ${route.pendingStops.length ? route.pendingStops.join(" and ") : "no unvisited stops"}. ${route.currentStop} is the highlighted stop.`
      : `The road stack now shows ${route.pathStops.join(" → ") || "the starting point"}. ${route.currentStop} is the highlighted stop.`,
    analogy: isBfs
      ? "It is like checking every shop on your street before walking to shops on the next street."
      : "It is like exploring a maze: keep walking down one corridor, then return when you reach a dead end.",
    objectLabel: route.currentStop,
  };
}
