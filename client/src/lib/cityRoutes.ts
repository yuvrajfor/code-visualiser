import type { RealWorldStory } from "./realWorldLearning";

export type CityRouteAlgorithm = "bfs" | "dfs" | "dijkstra";

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
  graph?: CityGraph;
  weightedGraph?: CityWeightedGraph;
  targetStop?: string;
  shortestPath?: string[] | null;
  travelTime?: number;
  shortestTravelTime?: number | null;
};

export type CityGraph = Record<string, string[]>;

export type CityRoad = { to: string; weight: number };

export type CityWeightedGraph = Record<string, CityRoad[]>;

export type CityNodePosition = { left: number; top: number };

export type ParsedCityGraph = {
  graph: CityGraph;
  weightedGraph: CityWeightedGraph;
  stops: string[];
};

const stopNamePattern = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,23}$/;

export function parseCityGraph(input: string): ParsedCityGraph {
  const graph: CityGraph = {};
  const weightedGraph: CityWeightedGraph = {};
  const lines = input.split("\n").map((line) => line.trim()).filter(Boolean);

  if (lines.length < 2) throw new Error("Add at least two stops, with one stop on each line.");

  for (const line of lines) {
    const separator = line.indexOf(":");
    if (separator < 1) throw new Error('Use the format "Stop: Nearby stop, Another stop" on each line.');

    const stop = line.slice(0, separator).trim();
    const neighborText = line.slice(separator + 1).trim();
    if (!stopNamePattern.test(stop)) throw new Error(`"${stop}" is not a valid stop name.`);
    if (graph[stop]) throw new Error(`"${stop}" appears more than once.`);

    const neighbors = neighborText ? neighborText.split(",").map((neighbor) => neighbor.trim()).filter(Boolean) : [];
    const weightedNeighbors = neighbors.map((neighbor) => {
      const match = neighbor.match(/^(.*?)(?:\s*\((\d{1,3})\))?$/);
      const name = match?.[1]?.trim() ?? "";
      const weight = match?.[2] ? Number(match[2]) : 1;
      if (!stopNamePattern.test(name)) throw new Error("Stop names can use letters, numbers, spaces, dashes, and underscores.");
      if (!Number.isInteger(weight) || weight < 1 || weight > 999) throw new Error("Travel times must be whole numbers from 1 to 999.");
      return { to: name, weight };
    });
    if (weightedNeighbors.some((neighbor) => neighbor.to === stop)) throw new Error(`"${stop}" cannot list itself as a nearby stop.`);
    if (new Set(weightedNeighbors.map((neighbor) => neighbor.to)).size !== weightedNeighbors.length) throw new Error(`"${stop}" lists the same nearby stop more than once.`);
    graph[stop] = weightedNeighbors.map((neighbor) => neighbor.to);
    weightedGraph[stop] = weightedNeighbors;
  }

  for (const [stop, neighbors] of Object.entries(graph)) {
    for (const neighbor of neighbors) {
      if (!graph[neighbor]) {
        graph[neighbor] = [];
        weightedGraph[neighbor] = [];
      }
    }
    weightedGraph[stop] ??= [];
  }

  const stops = Object.keys(graph);
  if (stops.length > 10) throw new Error("Use up to 10 stops so the learning map stays easy to read.");
  if (!Object.values(graph).some((neighbors) => neighbors.length)) throw new Error("Add at least one road between two stops.");

  return { graph, weightedGraph, stops };
}

export function findShortestCityPath(graph: CityGraph, startStop: string, targetStop: string): string[] | null {
  if (!graph[startStop] || !graph[targetStop]) return null;
  const queue = [startStop];
  const parent = new Map<string, string | null>([[startStop, null]]);

  while (queue.length) {
    const current = queue.shift()!;
    if (current === targetStop) {
      const path: string[] = [];
      let cursor: string | null = current;
      while (cursor) {
        path.unshift(cursor);
        cursor = parent.get(cursor) ?? null;
      }
      return path;
    }
    for (const neighbor of graph[current] ?? []) {
      if (!parent.has(neighbor)) {
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }

  return null;
}

export function getCityGraphEdges(graph: CityGraph): Array<[string, string]> {
  const seen = new Set<string>();
  const edges: Array<[string, string]> = [];
  for (const [stop, neighbors] of Object.entries(graph)) {
    for (const neighbor of neighbors) {
      const key = [stop, neighbor].sort().join("\u0000");
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([stop, neighbor]);
      }
    }
  }
  return edges;
}

export function getCityWeightedEdges(graph: CityWeightedGraph): Array<{ from: string; to: string; weight: number }> {
  const seen = new Set<string>();
  const edges: Array<{ from: string; to: string; weight: number }> = [];
  for (const [from, roads] of Object.entries(graph)) {
    for (const road of roads) {
      const key = [from, road.to].sort().join("\u0000");
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ from, to: road.to, weight: road.weight });
      }
    }
  }
  return edges;
}

export function getCityGraphPositions(stops: string[]): Record<string, CityNodePosition> {
  return Object.fromEntries(stops.map((stop, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(stops.length, 1);
    const left = 50 + Math.cos(angle) * 37;
    const top = 50 + Math.sin(angle) * 33;
    return [stop, { left, top }];
  }));
}

export type CityLiveNarration = Record<CityRouteAlgorithm, { heading: string; detail: string; context: string }>;

export function getCityLiveNarration(states: Record<CityRouteAlgorithm, CityRouteState>): CityLiveNarration {
  const { bfs, dfs, dijkstra } = states;
  return {
    bfs: {
      heading: "BFS · nearby first",
      detail: bfs.actionLabel,
      context: `At ${bfs.currentStop}. It cares about the fewest roads.`,
    },
    dfs: {
      heading: "DFS · one road deep",
      detail: dfs.actionLabel,
      context: `At ${dfs.currentStop}. It follows a road fully, then returns.`,
    },
    dijkstra: {
      heading: "Dijkstra · lowest time",
      detail: dijkstra.actionLabel,
      context: `At ${dijkstra.currentStop}. Best known time: ${dijkstra.travelTime ?? 0} minutes.`,
    },
  };
}

export function findFastestCityPath(graph: CityWeightedGraph, startStop: string, targetStop: string): { path: string[]; travelTime: number } | null {
  if (!graph[startStop] || !graph[targetStop]) return null;
  const distances = new Map<string, number>(Object.keys(graph).map((stop) => [stop, Number.POSITIVE_INFINITY]));
  const parents = new Map<string, string | null>([[startStop, null]]);
  const frontier: Array<{ stop: string; travelTime: number }> = [{ stop: startStop, travelTime: 0 }];
  distances.set(startStop, 0);

  while (frontier.length) {
    frontier.sort((left, right) => left.travelTime - right.travelTime || left.stop.localeCompare(right.stop));
    const current = frontier.shift()!;
    if (current.travelTime !== distances.get(current.stop)) continue;
    if (current.stop === targetStop) {
      const path: string[] = [];
      let cursor: string | null = targetStop;
      while (cursor) {
        path.unshift(cursor);
        cursor = parents.get(cursor) ?? null;
      }
      return { path, travelTime: current.travelTime };
    }
    for (const road of graph[current.stop] ?? []) {
      const nextTime = current.travelTime + road.weight;
      if (nextTime < (distances.get(road.to) ?? Number.POSITIVE_INFINITY)) {
        distances.set(road.to, nextTime);
        parents.set(road.to, current.stop);
        frontier.push({ stop: road.to, travelTime: nextTime });
      }
    }
  }
  return null;
}

function makeDynamicRouteState(
  algorithm: CityRouteAlgorithm,
  graph: CityGraph,
  targetStop: string,
  currentStop: string,
  pendingStops: string[],
  visitedStops: string[],
  pathStops: string[],
  phase: CityRouteState["phase"],
  actionLabel: string,
  line: number,
  code: string,
  activeRoad?: [string, string],
  shortestPath?: string[] | null,
  weightedGraph?: CityWeightedGraph,
  travelTime?: number,
  shortestTravelTime?: number | null,
): CityRouteState {
  return { algorithm, graph, weightedGraph, targetStop, currentStop, pendingStops: [...pendingStops], visitedStops: [...visitedStops], pathStops: [...pathStops], phase, actionLabel, line, code, activeRoad, shortestPath, travelTime, shortestTravelTime };
}

export function createCityRouteWalkthrough(graph: CityGraph, algorithm: CityRouteAlgorithm, startStop: string, targetStop: string): CityRouteState[] {
  if (algorithm === "dijkstra") throw new Error("Use createDijkstraRouteWalkthrough for weighted City Maps.");
  if (!graph[startStop] || !graph[targetStop]) throw new Error("Choose a start and target stop that exist on the map.");
  const shortestPath = findShortestCityPath(graph, startStop, targetStop);
  const states: CityRouteState[] = [];

  if (algorithm === "bfs") {
    const queue = [startStop];
    const queued = new Set(queue);
    const visited: string[] = [];
    const parent = new Map<string, string | null>([[startStop, null]]);
    states.push(makeDynamicRouteState("bfs", graph, targetStop, startStop, queue, visited, [startStop], "prepare", `Put ${startStop} at the front of the waiting line.`, 1, `queue = ["${startStop}"]`));

    while (queue.length) {
      const current = queue.shift()!;
      visited.push(current);
      const currentPath = (() => {
        const path: string[] = [];
        let cursor: string | null = current;
        while (cursor) {
          path.unshift(cursor);
          cursor = parent.get(cursor) ?? null;
        }
        return path;
      })();

      if (current === targetStop) {
        states.push(makeDynamicRouteState("bfs", graph, targetStop, current, queue, visited, currentPath, "complete", `${targetStop} is reached. The glowing route shows the fewest roads from ${startStop}.`, 4, `target reached: "${targetStop}"`, currentPath.length > 1 ? [currentPath.at(-2)!, current] : undefined, shortestPath));
        break;
      }

      states.push(makeDynamicRouteState("bfs", graph, targetStop, current, queue, visited, currentPath, "visit", `Visit ${current}, then check its nearby roads.`, 2, `stop = queue.shift()`));
      const newStops: string[] = [];
      for (const neighbor of graph[current] ?? []) {
        if (!queued.has(neighbor)) {
          queued.add(neighbor);
          parent.set(neighbor, current);
          queue.push(neighbor);
          newStops.push(neighbor);
        }
      }
      if (newStops.length) states.push(makeDynamicRouteState("bfs", graph, targetStop, current, queue, visited, currentPath, "queue", `Add ${newStops.join(" and ")} to the back of the waiting line.`, 3, `queue.push(nearbyStop)`, [current, newStops[0]]));
    }

    if (!states.some((state) => state.phase === "complete")) {
      const lastStop = visited.at(-1) ?? startStop;
      states.push(makeDynamicRouteState("bfs", graph, targetStop, lastStop, [], visited, [lastStop], "complete", `${targetStop} cannot be reached from ${startStop} on these roads.`, 4, `target not reached: "${targetStop}"`, undefined, null));
    }
    return states;
  }

  const stack: Array<{ stop: string; path: string[] }> = [{ stop: startStop, path: [startStop] }];
  const queued = new Set([startStop]);
  const visited: string[] = [];
  let previousPath = [startStop];
  states.push(makeDynamicRouteState("dfs", graph, targetStop, startStop, [startStop], [], [startStop], "prepare", `Put ${startStop} on the road stack.`, 1, `stack = ["${startStop}"]`));

  while (stack.length) {
    const entry = stack.pop()!;
    const { stop, path } = entry;
    visited.push(stop);
    const isBacktracking = path.length < previousPath.length;
    const phase = isBacktracking ? "backtrack" : "visit";
    const action = isBacktracking ? `The last road ended, so return to ${path.at(-1)} and try another road.` : `Visit ${stop}, then follow one road as far as it can go.`;
    states.push(makeDynamicRouteState("dfs", graph, targetStop, stop, stack.map((item) => item.stop), visited, path, phase, action, 2, `stop = stack.pop()`, path.length > 1 ? [path.at(-2)!, stop] : undefined));
    previousPath = path;

    const newStops = (graph[stop] ?? []).filter((neighbor) => !queued.has(neighbor));
    for (const neighbor of [...newStops].reverse()) {
      queued.add(neighbor);
      stack.push({ stop: neighbor, path: [...path, neighbor] });
    }
    if (newStops.length) {
      const nextPath = [...path, newStops[0]];
      states.push(makeDynamicRouteState("dfs", graph, targetStop, newStops[0], stack.map((item) => item.stop), visited, nextPath, "explore", `Choose ${newStops[0]} first and keep following that road.`, 3, `stack.push(nearbyStop)`, [stop, newStops[0]]));
    }
  }

  const lastStop = visited.at(-1) ?? startStop;
  states.push(makeDynamicRouteState("dfs", graph, targetStop, lastStop, [], visited, previousPath, "complete", `Depth-first search has checked every reachable road from ${startStop}.`, 4, `roads checked`, undefined, shortestPath));
  return states;
}

export function createDijkstraRouteWalkthrough(graph: CityWeightedGraph, startStop: string, targetStop: string): CityRouteState[] {
  if (!graph[startStop] || !graph[targetStop]) throw new Error("Choose a start and target stop that exist on the map.");
  const unweightedGraph = Object.fromEntries(Object.entries(graph).map(([stop, roads]) => [stop, roads.map((road) => road.to)]));
  const fastest = findFastestCityPath(graph, startStop, targetStop);
  const distances = new Map<string, number>(Object.keys(graph).map((stop) => [stop, Number.POSITIVE_INFINITY]));
  const parents = new Map<string, string | null>([[startStop, null]]);
  const frontier: Array<{ stop: string; travelTime: number }> = [{ stop: startStop, travelTime: 0 }];
  const visited: string[] = [];
  const states: CityRouteState[] = [];
  distances.set(startStop, 0);
  states.push(makeDynamicRouteState("dijkstra", unweightedGraph, targetStop, startStop, [startStop], [], [startStop], "prepare", `Put ${startStop} in the travel-time list at 0 minutes.`, 1, `times["${startStop}"] = 0`, undefined, fastest?.path, graph, 0, fastest?.travelTime ?? null));

  while (frontier.length) {
    frontier.sort((left, right) => left.travelTime - right.travelTime || left.stop.localeCompare(right.stop));
    const current = frontier.shift()!;
    if (current.travelTime !== distances.get(current.stop)) continue;
    visited.push(current.stop);
    const path: string[] = [];
    let cursor: string | null = current.stop;
    while (cursor) {
      path.unshift(cursor);
      cursor = parents.get(cursor) ?? null;
    }

    if (current.stop === targetStop) {
      states.push(makeDynamicRouteState("dijkstra", unweightedGraph, targetStop, current.stop, frontier.map((entry) => entry.stop), visited, path, "complete", `${targetStop} has the lowest total travel time: ${current.travelTime} minutes.`, 4, `target reached: "${targetStop}"`, path.length > 1 ? [path.at(-2)!, current.stop] : undefined, fastest?.path, graph, current.travelTime, fastest?.travelTime ?? null));
      return states;
    }

    states.push(makeDynamicRouteState("dijkstra", unweightedGraph, targetStop, current.stop, frontier.map((entry) => entry.stop), visited, path, "visit", `Choose ${current.stop} because it is the quickest unvisited place to reach so far: ${current.travelTime} minutes.`, 2, `closest = lowestTimeStop()`, path.length > 1 ? [path.at(-2)!, current.stop] : undefined, fastest?.path, graph, current.travelTime, fastest?.travelTime ?? null));
    let firstImprovedRoad: [string, string] | undefined;
    const improvedStops: string[] = [];
    for (const road of graph[current.stop] ?? []) {
      const nextTime = current.travelTime + road.weight;
      if (nextTime < (distances.get(road.to) ?? Number.POSITIVE_INFINITY)) {
        distances.set(road.to, nextTime);
        parents.set(road.to, current.stop);
        frontier.push({ stop: road.to, travelTime: nextTime });
        improvedStops.push(`${road.to} (${nextTime}m)`);
        firstImprovedRoad ??= [current.stop, road.to];
      }
    }
    if (improvedStops.length) states.push(makeDynamicRouteState("dijkstra", unweightedGraph, targetStop, current.stop, frontier.slice().sort((left, right) => left.travelTime - right.travelTime).map((entry) => entry.stop), visited, path, "queue", `Update the travel-time list: ${improvedStops.join(" and ")}.`, 3, `try shorter travel times`, firstImprovedRoad, fastest?.path, graph, current.travelTime, fastest?.travelTime ?? null));
  }

  const lastStop = visited.at(-1) ?? startStop;
  states.push(makeDynamicRouteState("dijkstra", unweightedGraph, targetStop, lastStop, [], visited, [lastStop], "complete", `${targetStop} cannot be reached from ${startStop} on these roads.`, 4, `target not reached: "${targetStop}"`, undefined, null, graph, distances.get(lastStop), null));
  return states;
}

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
  const isDijkstra = route.algorithm === "dijkstra";
  const action = route.actionLabel;
  const title = isBfs ? "The city queue chooses the next stop" : isDijkstra ? "The travel-time guide chooses the quickest stop" : "The city explorer follows one road";

  return {
    kind: "city-map",
    icon: isBfs ? "🚏" : isDijkstra ? "⏱️" : "🧭",
    title,
    plainEnglish: isBfs
      ? `${action} Breadth-first search checks all nearby places before it moves to a farther street.`
      : isDijkstra
        ? `${action} Dijkstra compares total travel time and always checks the stop that can be reached most quickly so far.`
        : `${action} Depth-first search keeps following one road until it cannot go farther, then it comes back to try the next road.`,
    whatChanged: isBfs
      ? `The waiting line now shows ${route.pendingStops.length ? route.pendingStops.join(" and ") : "no unvisited stops"}. ${route.currentStop} is the highlighted stop.`
      : isDijkstra
        ? `The best known travel time to ${route.currentStop} is ${route.travelTime ?? 0} minutes. The travel-time list now shows ${route.pendingStops.length ? route.pendingStops.join(" and ") : "no unvisited stops"}.`
        : `The road stack now shows ${route.pathStops.join(" → ") || "the starting point"}. ${route.currentStop} is the highlighted stop.`,
    analogy: isBfs
      ? "It is like checking every shop on your street before walking to shops on the next street."
      : isDijkstra
        ? "It is like choosing the quickest taxi route by adding up the minutes on every road."
        : "It is like exploring a maze: keep walking down one corridor, then return when you reach a dead end.",
    objectLabel: route.currentStop,
  };
}
