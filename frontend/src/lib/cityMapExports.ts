import type { CityNodePosition, CityWeightedGraph } from "./cityRoutes";

export type CityMapExportInput = {
  graphText: string;
  startStop: string;
  targetStop: string;
  stops: string[];
  weightedGraph: CityWeightedGraph;
  nodePositions: Record<string, CityNodePosition>;
  algorithmOutcomes: {
    bfsPath: string[] | null;
    dfsPath: string[] | null;
    dijkstraPath: string[] | null;
    dijkstraTravelMinutes: number | null;
  };
};

export type CityMapExportData = {
  format: "code-story-studio-city-map";
  version: 1;
  map: {
    stops: string[];
    roads: Array<{ from: string; to: string; travelMinutes: number }>;
    directed: true;
    travelTimeUnit: "minutes";
  };
  scenario: {
    graphText: string;
    startStop: string;
    targetStop: string;
    nodePositions: Record<string, CityNodePosition>;
  };
  comparison: {
    bfs: { objective: "fewest roads"; route: string[] | null };
    dfs: { objective: "one road deep"; route: string[] | null };
    dijkstra: { objective: "lowest travel time"; route: string[] | null; travelMinutes: number | null };
  };
};

export function createCityMapExportData(input: CityMapExportInput): CityMapExportData {
  return {
    format: "code-story-studio-city-map",
    version: 1,
    map: {
      stops: [...input.stops],
      roads: Object.entries(input.weightedGraph).flatMap(([from, roads]) => roads.map(({ to, weight }) => ({ from, to, travelMinutes: weight }))),
      directed: true,
      travelTimeUnit: "minutes",
    },
    scenario: {
      graphText: input.graphText,
      startStop: input.startStop,
      targetStop: input.targetStop,
      nodePositions: { ...input.nodePositions },
    },
    comparison: {
      bfs: { objective: "fewest roads", route: input.algorithmOutcomes.bfsPath ? [...input.algorithmOutcomes.bfsPath] : null },
      dfs: { objective: "one road deep", route: input.algorithmOutcomes.dfsPath ? [...input.algorithmOutcomes.dfsPath] : null },
      dijkstra: { objective: "lowest travel time", route: input.algorithmOutcomes.dijkstraPath ? [...input.algorithmOutcomes.dijkstraPath] : null, travelMinutes: input.algorithmOutcomes.dijkstraTravelMinutes },
    },
  };
}

export function getCityMapExportFileBase(startStop: string, targetStop: string): string {
  const clean = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "stop";
  return `city-map-${clean(startStop)}-to-${clean(targetStop)}`;
}
