import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Box,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  Keyboard,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { createRealWorldStory, getActionSound, type RealWorldStory } from "@/lib/realWorldLearning";
import { createCityRouteStory, createCityRouteWalkthrough, getCityGraphEdges, getCityGraphPositions, getCityRouteWalkthrough, parseCityGraph, type CityGraph, type CityRouteAlgorithm, type CityRouteState } from "@/lib/cityRoutes";
import { getStoryShortcutAction, STORY_SHORTCUTS } from "@/lib/storyControls";
import { getSavedVisualTheme, getVisualTheme, saveVisualTheme, visualThemes, type VisualTheme } from "@/lib/learningThemes";

type Language = "javascript" | "python" | "c" | "java";

type LearningStep = {
  step: number;
  line: number;
  code: string;
  story: RealWorldStory;
  routeState?: CityRouteState;
};

type CityComparisonRun = {
  graph: CityGraph;
  stops: string[];
  startStop: string;
  targetStop: string;
  bfs: CityRouteState[];
  dfs: CityRouteState[];
};

const customCityGraphExample = `Cafe: Library, Park
Library: Museum, Restaurant
Park: Restaurant
Museum: Restaurant
Restaurant:`;

function createCustomCityCode(graph: CityGraph, startStop: string, targetStop: string): string {
  const entries = Object.entries(graph).map(([stop, neighbors]) => `  "${stop}": [${neighbors.map((neighbor) => `"${neighbor}"`).join(", ")}],`).join("\n");
  return `city_map = {\n${entries}\n}\nstart = "${startStop}"\ntarget = "${targetStop}"\n# Compare BFS and DFS on this map`;
}

const defaultCode = `function findApple(basket, wantedApple) {
  let answer = "not found";
  for (let place = 0; place < basket.length; place++) {
    if (basket[place] === wantedApple) {
      answer = "found it";
      return answer;
    }
  }
  return answer;
}`;

type LearningPreset = {
  name: string;
  icon: string;
  description: string;
  problem: string;
  language: Language;
  code: string;
  walkthrough?: CityRouteAlgorithm;
};

const learningPresets: LearningPreset[] = [
  {
    name: "Shopping cart",
    icon: "🛒",
    description: "Arrays become a cart full of items.",
    problem: "Add an item to a shopping cart and check what is inside",
    language: "javascript",
    code: `function checkCart() {
  const cart = ["milk", "bread", "apples"];
  cart.push("tea");
  for (let item of cart) {
    if (item === "apples") {
      return "apples are in the cart";
    }
  }
  return "apples are not in the cart";
}`,
  },
  {
    name: "Labelled money box",
    icon: "🗃️",
    description: "Variables become clearly labelled boxes.",
    problem: "Keep track of pocket money in a labelled box",
    language: "python",
    code: `def save_money():
    pocket_money = 20
    pocket_money = pocket_money + 5
    return pocket_money`,
  },
  {
    name: "Traffic-light choice",
    icon: "🚦",
    description: "An if statement becomes a simple yes-or-no gate.",
    problem: "Decide if a person can enter the ride",
    language: "java",
    code: `public String rideChoice(int height) {
  if (height >= 120) {
    return "You can ride";
  }
  return "You need to grow a little taller";
}`,
  },
  {
    name: "Parcel delivery",
    icon: "📦",
    description: "A function result is packed and handed back.",
    problem: "Pack a greeting in a parcel and deliver it",
    language: "c",
    code: `char* makeGreeting() {
  char* greeting = "Hello from the parcel";
  return greeting;
}`,
  },
  {
    name: "Paper-tag chain",
    icon: "🔗",
    description: "Linked lists become name tags tied together in a chain.",
    problem: "Add a new paper tag to the end of a chain of stops",
    language: "javascript",
    code: `class Stop {
  constructor(name) {
    this.name = name;
    this.next = null;
  }
}

const firstStop = new Stop("Bakery");
const nextStop = new Stop("Library");
firstStop.next = nextStop;`,
  },
  {
    name: "Staircase helper",
    icon: "🪜",
    description: "Recursion becomes walking down and up a staircase.",
    problem: "Count the steps down a staircase, then carry the answer back up",
    language: "python",
    code: `def count_steps(steps):
    if steps == 0:
        return 0
    return 1 + count_steps(steps - 1)

total = count_steps(3)`,
  },
  {
    name: "Family tree branches",
    icon: "🌳",
    description: "Binary trees become a family chart with left and right children.",
    problem: "Place two children below a parent in a small family tree",
    language: "javascript",
    code: `class FamilyMember {
  constructor(name) {
    this.name = name;
    this.left = null;
    this.right = null;
  }
}

const parent = new FamilyMember("Asha");
parent.left = new FamilyMember("Milo");
parent.right = new FamilyMember("Nia");`,
  },
  {
    name: "City map route",
    icon: "🗺️",
    description: "Graphs become city stops joined by roads.",
    problem: "Connect city stops and visit nearby places one by one",
    language: "python",
    code: `city_map = {
    "Cafe": ["Library", "Park"],
    "Library": ["Cafe", "Museum"],
    "Park": ["Cafe"]
}

visited = []
for stop in city_map["Cafe"]:
    visited.append(stop)
return visited`,
  },
  {
    name: "BFS City Explorer",
    icon: "🚏",
    description: "Visit every nearby stop first by using a city waiting line.",
    problem: "Visit nearby city stops first, then move farther away",
    language: "python",
    walkthrough: "bfs",
    code: `from collections import deque

city_map = {
    "Cafe": ["Library", "Park"],
    "Library": ["Museum"],
    "Park": []
}
queue = deque(["Cafe"])
visited = set()

while queue:
    stop = queue.popleft()
    visited.add(stop)
    for next_stop in city_map[stop]:
        queue.append(next_stop)`,
  },
  {
    name: "DFS City Adventure",
    icon: "🧭",
    description: "Follow one road all the way, then turn back for the next road.",
    problem: "Explore one city road fully before backtracking",
    language: "python",
    walkthrough: "dfs",
    code: `city_map = {
    "Cafe": ["Library", "Park"],
    "Library": ["Museum"],
    "Park": []
}
path = ["Cafe"]
visited = set()

while path:
    stop = path.pop()
    visited.add(stop)
    for next_stop in city_map[stop]:
        path.append(next_stop)`,
  },
];

const sceneStyles: Record<RealWorldStory["kind"], { accent: string; wash: string; label: string }> = {
  "workbench": { accent: "#a78bfa", wash: "rgba(167,139,250,0.16)", label: "workbench" },
  "storage-shelf": { accent: "#f59e0b", wash: "rgba(245,158,11,0.16)", label: "storage shelf" },
  "sorting-tray": { accent: "#38bdf8", wash: "rgba(56,189,248,0.16)", label: "sorting tray" },
  "linked-chain": { accent: "#f472b6", wash: "rgba(244,114,182,0.16)", label: "paper-tag chain" },
  "family-tree": { accent: "#4ade80", wash: "rgba(74,222,128,0.16)", label: "family tree" },
  "conveyor-loop": { accent: "#34d399", wash: "rgba(52,211,153,0.16)", label: "repeat route" },
  "recursion-stairs": { accent: "#c084fc", wash: "rgba(192,132,252,0.16)", label: "staircase" },
  "city-map": { accent: "#60a5fa", wash: "rgba(96,165,250,0.16)", label: "city map" },
  "decision-gate": { accent: "#fb7185", wash: "rgba(251,113,133,0.16)", label: "decision gate" },
  "workshop": { accent: "#f97316", wash: "rgba(249,115,22,0.16)", label: "workshop" },
  "delivery-desk": { accent: "#eab308", wash: "rgba(234,179,8,0.16)", label: "delivery desk" },
};

function SceneHeader({ story, step }: { story: RealWorldStory; step: LearningStep }) {
  const style = sceneStyles[story.kind];
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
      <div className="flex items-center gap-3">
        <div
          className="grid h-11 w-11 place-items-center rounded-2xl border text-xl shadow-[0_0_28px_rgba(255,255,255,0.08)]"
          style={{ background: style.wash, borderColor: `${style.accent}66` }}
          aria-hidden="true"
        >
          {story.icon}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a89787]">Real-life scene</p>
          <h2 className="text-base font-extrabold text-white">{story.title}</h2>
        </div>
      </div>
      <Badge
        className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
        style={{ background: style.wash, borderColor: `${style.accent}88`, color: style.accent }}
      >
        Step {step.step}
      </Badge>
    </div>
  );
}

function CityComparisonPanel({ routeState, stepNumber, visualTheme }: { routeState: CityRouteState; stepNumber: number; visualTheme: VisualTheme }) {
  const story = createCityRouteStory(routeState);
  const step: LearningStep = { step: stepNumber, line: routeState.line, code: routeState.code, story, routeState };
  const isBfs = routeState.algorithm === "bfs";

  return (
    <section className={`rounded-[28px] border p-5 shadow-[0_26px_60px_rgba(0,0,0,0.35)] ${isBfs ? "border-sky-300/25 bg-[#0d1828]" : "border-violet-300/25 bg-[#160d28]"}`} data-comparison-panel={routeState.algorithm}>
      <div className="mb-4 flex items-center justify-between gap-3"><div><p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${isBfs ? "text-sky-200" : "text-violet-200"}`}>{isBfs ? "BFS · nearby-first" : "DFS · one road deep"}</p><h2 className="mt-1 text-base font-black text-white">{isBfs ? "City waiting line" : "City road stack"}</h2></div><Badge className={`rounded-full border px-3 py-1 text-[10px] font-black ${isBfs ? "border-sky-200/35 bg-sky-300/10 text-sky-100" : "border-violet-200/35 bg-violet-300/10 text-violet-100"}`}>Step {stepNumber}</Badge></div>
      <RealWorldScene story={story} visualTheme={visualTheme} routeState={routeState} />
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d9c9b8]">In everyday words</p><p className="mt-2 text-sm font-medium leading-6 text-white">{story.plainEnglish}</p><p className="mt-3 text-xs leading-5 text-[#c9bcd8]"><strong className="text-white">What changed:</strong> {story.whatChanged}</p></div>
      {isBfs && routeState.phase === "complete" && <div className="mt-4 rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4" data-shortest-path-result><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">Shortest route</p>{routeState.shortestPath?.length ? <><p className="mt-2 text-sm font-black text-amber-100">{routeState.shortestPath.join(" → ")}</p><p className="mt-1 text-xs leading-5 text-[#ffe6a7]">This glowing path uses the fewest roads from {routeState.shortestPath[0]} to {routeState.shortestPath.at(-1)}.</p></> : <p className="mt-2 text-xs leading-5 text-[#ffe6a7]">There is no road route from the chosen start stop to the target stop.</p>}</div>}
    </section>
  );
}

function RealWorldScene({ story, visualTheme, routeState }: { story: RealWorldStory; visualTheme: VisualTheme; routeState?: CityRouteState }) {
  const style = sceneStyles[story.kind];
  const common = "border border-white/10 bg-[#17100c]/90 shadow-[0_16px_35px_rgba(0,0,0,0.3)]";
  const label = "text-[10px] font-bold uppercase tracking-[0.16em] text-[#a89787]";

  if (story.kind === "storage-shelf") {
    return (
      <div className="relative flex h-[270px] items-end justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#100b08] p-7 story-scene-enter" data-scene-world={visualTheme}>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#22130c] to-transparent" />
        <div className="absolute left-7 top-5 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">Kitchen storage shelf</div>
        <div className="relative z-10 w-full max-w-[520px] rounded-2xl border-4 border-[#7c4a2d] bg-[#3e2417] p-4 shadow-[0_0_35px_rgba(245,158,11,0.2)]">
          <div className="mb-4 h-2 rounded-full bg-[#bb7246]" />
          <div className="grid grid-cols-3 gap-3">
            {["Old note", story.objectLabel, "Next task"].map((labelText, index) => (
              <div key={labelText} className={`scene-object-pop rounded-xl border p-3 ${index === 1 ? "border-amber-300 bg-amber-300/15 shadow-[0_0_22px_rgba(245,158,11,0.3)]" : "border-[#6b442d] bg-[#24160f]"}`} style={{ animationDelay: `${index * 55}ms` }}>
                <div className="mb-3 h-7 rounded-md bg-[#bb7246] opacity-80" />
                <p className="truncate text-center text-xs font-bold text-[#f8ead7]">{labelText}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 h-2 rounded-full bg-[#bb7246]" />
        </div>
      </div>
    );
  }

  if (story.kind === "sorting-tray") {
    return (
      <div className="relative flex h-[270px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#0a1217] p-6 story-scene-enter" data-scene-world={visualTheme}>
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(56,189,248,.17) 1px, transparent 0)", backgroundSize: "20px 20px" }} />
        <div className="relative w-full max-w-[540px] rounded-[28px] border-8 border-[#0e7490] bg-[#155e75]/50 p-6 shadow-[0_0_34px_rgba(56,189,248,0.2)]">
          <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200">Sorting tray</p>
          <div className="flex items-end justify-center gap-3">
            {["A", "B", "C", "D"].map((item, index) => (
              <div key={item} className={`scene-object-pop grid w-16 place-items-center rounded-xl border text-sm font-black ${index === 1 ? "h-24 border-sky-200 bg-sky-300 text-slate-950 shadow-[0_0_24px_rgba(56,189,248,0.5)]" : "h-16 border-sky-700 bg-sky-950 text-sky-100"}`} style={{ animationDelay: `${index * 65}ms` }}>
                {item}
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-center text-xs text-sky-100"><span className="mr-2">👋</span> The computer can pick, compare, or move one item.</div>
        </div>
      </div>
    );
  }

  if (story.kind === "linked-chain") {
    return (
      <div className="relative flex h-[270px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#180915] p-6 story-scene-enter" data-scene-world={visualTheme}>
        <div className="absolute left-6 top-5 rounded-full border border-pink-300/20 bg-pink-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-pink-100">Follow the string</div>
        <div className="relative flex w-full max-w-[560px] items-center justify-center gap-1 sm:gap-3">
          {["Bakery", "Library", "Park"].map((stop, index) => (
            <React.Fragment key={stop}>
              <div className={`scene-object-pop grid h-20 w-20 place-items-center rounded-2xl border text-center text-xs font-black ${index === 1 ? "border-pink-200 bg-pink-300 text-[#34091f] shadow-[0_0_26px_rgba(244,114,182,0.48)]" : "border-pink-400/40 bg-[#3a102e] text-pink-100"}`} style={{ animationDelay: `${index * 75}ms` }}><span className="text-lg">🏷️</span><span>{stop}</span></div>
              {index < 2 && <div className="scene-object-pop text-2xl text-pink-200" style={{ animationDelay: `${index * 75 + 30}ms` }}>⟶</div>}
            </React.Fragment>
          ))}
        </div>
        <p className="absolute bottom-5 text-center text-xs font-semibold text-pink-100">Each tag knows where to find the tag that comes after it.</p>
      </div>
    );
  }

  if (story.kind === "recursion-stairs") {
    return (
      <div className="relative flex h-[270px] items-end justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#130c1f] p-6 story-scene-enter" data-scene-world={visualTheme}>
        <div className="absolute left-6 top-5 rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-100">One smaller job each time</div>
        <div className="relative flex items-end gap-1.5">
          {["3", "2", "1", "0"].map((stepNumber, index) => (
            <div key={stepNumber} className={`scene-object-pop grid w-20 place-items-center rounded-t-xl border border-violet-300/40 text-sm font-black ${index === 3 ? "h-24 bg-violet-300 text-[#1d102d] shadow-[0_0_28px_rgba(192,132,252,0.45)]" : "bg-[#32174d] text-violet-100"}`} style={{ height: `${84 + index * 28}px`, animationDelay: `${index * 75}ms` }}><span>Step</span><span className="text-xl">{stepNumber}</span></div>
          ))}
        </div>
        <p className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-violet-100">🧍 Walk down to the easy stop, then bring the answer back up.</p>
      </div>
    );
  }

  if (story.kind === "family-tree") {
    return (
      <div className="relative flex h-[270px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#07140d] p-6 story-scene-enter" data-scene-world={visualTheme}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(74,222,128,0.16),transparent_62%)]" />
        <div className="absolute left-6 top-5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-100">Family branches</div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="scene-object-pop grid h-16 w-28 place-items-center rounded-2xl border border-emerald-200 bg-emerald-300 text-center text-xs font-black text-emerald-950 shadow-[0_0_26px_rgba(74,222,128,0.42)]">🌳<span>Parent</span></div>
          <div className="flex w-48 items-center justify-between px-7 text-emerald-200"><span className="-rotate-[25deg] text-2xl">↙</span><span className="rotate-[25deg] text-2xl">↘</span></div>
          <div className="flex gap-8"><div className="scene-object-pop grid h-14 w-24 place-items-center rounded-2xl border border-emerald-400/40 bg-[#123c28] text-xs font-black text-emerald-100" style={{ animationDelay: "80ms" }}>🌱<span>Left child</span></div><div className="scene-object-pop grid h-14 w-24 place-items-center rounded-2xl border border-emerald-400/40 bg-[#123c28] text-xs font-black text-emerald-100" style={{ animationDelay: "150ms" }}>🌱<span>Right child</span></div></div>
        </div>
        <p className="absolute bottom-5 text-center text-xs font-semibold text-emerald-100">A parent can lead to one branch on the left and one on the right.</p>
      </div>
    );
  }

  if (story.kind === "city-map") {
    const defaultCityStops = [
      { name: "Cafe", icon: "☕", position: "left-[8%] top-[41%]" },
      { name: "Library", icon: "📚", position: "left-[52%] top-[18%]" },
      { name: "Park", icon: "🌳", position: "left-[54%] top-[58%]" },
      { name: "Museum", icon: "🏛️", position: "right-[4%] top-[39%]" },
    ];
    const defaultRoads: Array<{ from: string; to: string; x1: number; y1: number; x2: number; y2: number }> = [
      { from: "Cafe", to: "Library", x1: 23, y1: 51, x2: 59, y2: 29 },
      { from: "Cafe", to: "Park", x1: 23, y1: 51, x2: 60, y2: 66 },
      { from: "Library", to: "Museum", x1: 65, y1: 30, x2: 88, y2: 48 },
    ];
    const graphStops = routeState?.graph ? Object.keys(routeState.graph) : [];
    const graphPositions = getCityGraphPositions(graphStops);
    const cityStops = routeState?.graph ? graphStops.map((name, index) => ({ name, icon: ["☕", "📚", "🌳", "🏛️", "🍽️", "🚏", "🏠", "🎪", "🎨", "🎬"][index] ?? "📍", position: graphPositions[name] })) : defaultCityStops;
    const roads = routeState?.graph ? getCityGraphEdges(routeState.graph).map(([from, to]) => ({ from, to, x1: parseFloat(graphPositions[from]?.left ?? "50"), y1: parseFloat(graphPositions[from]?.top ?? "50"), x2: parseFloat(graphPositions[to]?.left ?? "50"), y2: parseFloat(graphPositions[to]?.top ?? "50") })) : defaultRoads;
    const isBfs = routeState?.algorithm === "bfs";
    const isDfs = routeState?.algorithm === "dfs";
    const shortestPath = routeState?.phase === "complete" ? routeState.shortestPath ?? [] : [];
    return (
      <div className="relative h-[270px] overflow-hidden rounded-2xl border border-white/10 bg-[#081324] p-6 story-scene-enter" data-scene-world={visualTheme}>
        <div className="absolute inset-0 opacity-35" style={{ backgroundImage: "linear-gradient(rgba(96,165,250,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,.22) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute left-6 top-5 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-100">{isBfs ? "Breadth-first city route" : isDfs ? "Depth-first city route" : "City map"}</div>
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {roads.map((road) => {
            const isActiveRoad = routeState?.activeRoad?.includes(road.from) && routeState?.activeRoad?.includes(road.to);
            const isShortestRoad = shortestPath.some((stop, index) => index > 0 && ((shortestPath[index - 1] === road.from && stop === road.to) || (shortestPath[index - 1] === road.to && stop === road.from)));
            return <line key={`${road.from}-${road.to}`} x1={road.x1} y1={road.y1} x2={road.x2} y2={road.y2} stroke={isShortestRoad ? "#fbbf24" : isActiveRoad ? (isDfs ? "#c084fc" : "#7dd3fc") : "#4b83b8"} strokeWidth={isShortestRoad ? "2.3" : isActiveRoad ? "1.7" : "0.65"} strokeLinecap="round" opacity={isShortestRoad || isActiveRoad ? "1" : "0.48"} />;
          })}
        </svg>
        <div className="relative z-10 h-full">
          {cityStops.map((stop, index) => {
            const isCurrent = routeState?.currentStop === stop.name;
            const isVisited = routeState?.visitedStops.includes(stop.name);
            const isPathStop = isDfs && routeState?.pathStops.includes(stop.name);
            const isShortestStop = shortestPath.includes(stop.name);
            const isTarget = routeState?.targetStop === stop.name;
            const stateClasses = isCurrent
              ? "border-sky-100 bg-sky-200 text-sky-950 shadow-[0_0_28px_rgba(125,211,252,0.78)]"
              : isShortestStop
                ? "border-amber-100 bg-amber-300 text-amber-950 shadow-[0_0_26px_rgba(251,191,36,0.62)]"
              : isVisited
                ? "border-emerald-300/80 bg-emerald-300/15 text-emerald-100"
                : isPathStop
                  ? "border-violet-300/70 bg-violet-300/15 text-violet-100"
                  : isTarget
                    ? "border-amber-200/80 bg-amber-300/15 text-amber-100"
                    : "border-sky-400/50 bg-[#11345d] text-sky-100";
            const positionStyle = typeof stop.position === "string" ? { animationDelay: `${index * 60}ms` } : { left: stop.position.left, top: stop.position.top, transform: "translate(-50%, -50%)", animationDelay: `${index * 60}ms` };
            return <div key={stop.name} className={`scene-object-pop absolute grid h-14 w-14 place-items-center rounded-full border text-center text-[9px] font-black ${typeof stop.position === "string" ? stop.position : ""} ${stateClasses}`} style={positionStyle}><span className="text-base">{stop.icon}</span><span>{stop.name}</span>{isTarget && <span className="absolute -left-1 -top-1 rounded-full bg-amber-300 px-1 text-[7px] font-black text-amber-950">TARGET</span>}{isVisited && !isCurrent && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-300 text-[9px] text-emerald-950">✓</span>}</div>;
          })}
        </div>
        {routeState ? (
          <div className="absolute inset-x-4 bottom-3 z-20 rounded-xl border border-sky-300/20 bg-[#07101d]/95 px-3 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.32)]" data-route-state={routeState.algorithm} aria-label={`${isBfs ? "Breadth-first waiting line" : "Depth-first road stack"}: ${routeState.pendingStops.length ? routeState.pendingStops.join(", ") : "no stops waiting"}`} aria-live="polite">
            <div className="flex items-center justify-between gap-3"><p className="text-[9px] font-bold uppercase tracking-[0.13em] text-sky-200">{isBfs ? "Waiting line — next stop first" : "Road stack — top road first"}</p><span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${routeState.phase === "backtrack" ? "bg-violet-300/20 text-violet-100" : "bg-sky-300/15 text-sky-100"}`}>{routeState.phase}</span></div>
            <div className="mt-1.5 flex min-h-5 items-center gap-1.5 overflow-x-auto pb-0.5">{routeState.pendingStops.length ? routeState.pendingStops.map((stop, index) => <span key={`${stop}-${index}`} className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold ${isBfs && index === 0 ? "border-amber-200 bg-amber-300 text-amber-950" : isDfs && index === routeState.pendingStops.length - 1 ? "border-violet-200 bg-violet-300 text-violet-950" : "border-sky-300/25 bg-sky-300/10 text-sky-100"}`}>{stop}</span>) : <span className="text-[10px] text-[#a9c5e6]">No stops waiting</span>}</div>
            <p className="mt-1 text-[10px] font-medium leading-4 text-[#d7e8fb]">{routeState.actionLabel}</p>
            {shortestPath.length > 1 && <p className="mt-1 rounded-md bg-amber-300/15 px-2 py-1 text-[9px] font-bold text-amber-100">Shortest route: {shortestPath.join(" → ")}</p>}
          </div>
        ) : <p className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-sky-100">The computer follows roads between nearby places without visiting the same stop twice.</p>}
      </div>
    );
  }

  if (story.kind === "conveyor-loop") {
    return (
      <div className="relative h-[270px] overflow-hidden rounded-2xl border border-white/10 bg-[#08130f] p-6 story-scene-enter" data-scene-world={visualTheme}>
        <div className="absolute left-6 top-5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200">One item at a time</div>
        <div className="absolute inset-x-8 bottom-12 h-14 rounded-full border-4 border-[#166534] bg-[#14532d] shadow-[inset_0_0_18px_rgba(0,0,0,0.5)]" />
        <div className="absolute inset-x-12 bottom-[4.8rem] flex justify-between">
          {["1", "2", "3", "4"].map((item, index) => (
            <div key={item} className={`scene-object-pop grid h-14 w-14 place-items-center rounded-xl border text-sm font-black ${index === 1 ? "-translate-y-4 border-emerald-200 bg-emerald-300 text-emerald-950 shadow-[0_0_24px_rgba(52,211,153,0.55)]" : "border-emerald-700 bg-[#0f2f22] text-emerald-100"}`} style={{ animationDelay: `${index * 55}ms` }}>
              {item}
            </div>
          ))}
        </div>
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs font-semibold text-emerald-100">🚶 Worker visits the highlighted box, then moves to the next one.</div>
      </div>
    );
  }

  if (story.kind === "decision-gate") {
    return (
      <div className="relative flex h-[270px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#18080e] p-6 story-scene-enter" data-scene-world={visualTheme}>
        <div className="absolute left-8 top-6 rounded-full border border-rose-300/20 bg-rose-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-200">Question checkpoint</div>
        <div className="relative z-10 grid place-items-center">
          <div className="scene-decision-pulse grid h-24 w-24 place-items-center rounded-full border-4 border-rose-300 bg-rose-400/20 text-4xl shadow-[0_0_35px_rgba(251,113,133,0.45)]">?</div>
          <div className="mt-3 text-sm font-bold text-rose-100">Is the answer yes?</div>
        </div>
        <div className="absolute bottom-10 left-[18%] flex flex-col items-center gap-2 text-emerald-100"><span className="text-3xl">↙</span><span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-bold">YES: continue</span></div>
        <div className="absolute bottom-10 right-[18%] flex flex-col items-center gap-2 text-amber-100"><span className="text-3xl">↘</span><span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-bold">NO: try another way</span></div>
      </div>
    );
  }

  if (story.kind === "workshop") {
    return (
      <div className="relative flex h-[270px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#1b0d05] p-6 story-scene-enter" data-scene-world={visualTheme}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.18),transparent_60%)]" />
        <div className="relative z-10 w-full max-w-[450px] rounded-2xl border-2 border-orange-300/60 bg-[#29130a] p-5 shadow-[0_0_35px_rgba(249,115,22,0.35)]">
          <div className="flex items-center justify-between border-b border-orange-200/15 pb-3"><span className={label}>Recipe card</span><span className="text-lg">🛠️</span></div>
          <div className="mt-4 space-y-2"><div className="h-3 w-4/5 rounded-full bg-orange-200/75" /><div className="h-3 w-3/5 rounded-full bg-orange-200/35" /><div className="h-3 w-2/3 rounded-full bg-orange-200/35" /></div>
          <p className="mt-5 text-center text-sm font-bold text-orange-100">A new work station is ready for the task.</p>
        </div>
      </div>
    );
  }

  if (story.kind === "delivery-desk") {
    return (
      <div className="relative flex h-[270px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#171407] p-6 story-scene-enter" data-scene-world={visualTheme}>
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-amber-700/15 to-transparent" />
        <div className="relative z-10 grid place-items-center">
          <div className="scene-delivery-pop relative grid h-36 w-44 place-items-center rounded-2xl border-4 border-amber-300 bg-amber-500/45 text-5xl shadow-[0_0_42px_rgba(234,179,8,0.42)]">📦<span className="absolute -right-4 -top-4 rounded-full bg-emerald-300 px-3 py-1 text-xs font-black text-emerald-950">READY</span></div>
          <p className="mt-5 text-sm font-bold text-amber-100">The answer is safely packed and ready to share.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-[270px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#110d1b] p-6 story-scene-enter" data-scene-world={visualTheme}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(167,139,250,0.2),transparent_60%)]" />
      <div className={`relative z-10 w-full max-w-[440px] rounded-2xl p-5 ${common}`}>
        <p className={label}>Today’s task</p>
        <div className="mt-4 rounded-xl border border-violet-300/35 bg-violet-300/10 p-4 text-center"><span className="text-4xl">🧠</span><p className="mt-2 text-sm font-bold text-violet-100">The computer focuses on one small instruction.</p></div>
        <div className="mt-4 flex items-center justify-between text-xs text-[#c5b9dc]"><span>Read</span><span>→</span><span>Understand</span><span>→</span><span>Do it</span></div>
      </div>
    </div>
  );
}

export default function Home() {
  const saveSubmission = trpc.submissions.save.useMutation({
    onSuccess: () => toast.success("Your code session has been saved."),
    onError: () => toast.error("Your visual still works, but this session could not be saved."),
  });
  const [activeView, setActiveView] = useState<"landing" | "studio" | "comparison">("landing");
  const [selectedLang, setSelectedLang] = useState<Language>("javascript");
  const [userProblem, setUserProblem] = useState("Find an apple in a basket");
  const [userCode, setUserCode] = useState(defaultCode);
  const [selectedWalkthrough, setSelectedWalkthrough] = useState<CityRouteAlgorithm | null>(null);
  const [steps, setSteps] = useState<LearningStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(2200);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [visualTheme, setVisualTheme] = useState<VisualTheme>(() => typeof window === "undefined" ? "kitchen" : getSavedVisualTheme(window.localStorage) ?? "kitchen");
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [customGraphText, setCustomGraphText] = useState(customCityGraphExample);
  const [customStartStop, setCustomStartStop] = useState("Cafe");
  const [customTargetStop, setCustomTargetStop] = useState("Restaurant");
  const [comparisonRun, setComparisonRun] = useState<CityComparisonRun | null>(null);
  const [comparisonStepIndex, setComparisonStepIndex] = useState(0);
  const [comparisonPlaying, setComparisonPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const currentStep = steps[currentStepIndex];
  const activeTheme = getVisualTheme(visualTheme);
  const customGraphStops = (() => {
    try { return parseCityGraph(customGraphText).stops; } catch { return []; }
  })();
  const comparisonLength = comparisonRun ? Math.max(comparisonRun.bfs.length, comparisonRun.dfs.length) : 0;
  const comparisonBfsState = comparisonRun?.bfs[Math.min(comparisonStepIndex, Math.max(comparisonRun.bfs.length - 1, 0))];
  const comparisonDfsState = comparisonRun?.dfs[Math.min(comparisonStepIndex, Math.max(comparisonRun.dfs.length - 1, 0))];

  useEffect(() => {
    if (typeof window !== "undefined") saveVisualTheme(visualTheme, window.localStorage);
  }, [visualTheme]);

  const playActionSound = (story?: RealWorldStory) => {
    if (!soundEnabled || typeof window === "undefined" || !story) return;
    try {
      audioRef.current ??= new AudioContext();
      const audio = audioRef.current;
      const profile = getActionSound(story.kind);
      void audio.resume();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = profile.waveform;
      oscillator.frequency.setValueAtTime(profile.startHz, audio.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(profile.endHz, audio.currentTime + profile.duration);
      gain.gain.setValueAtTime(profile.volume, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + profile.duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + profile.duration + 0.02);
    } catch {
      // Sound is an optional learning aid. Browsers can restrict it until interaction.
    }
  };

  const buildSteps = (code: string, routeAlgorithm: CityRouteAlgorithm | null = selectedWalkthrough): LearningStep[] => {
    if (routeAlgorithm) {
      return getCityRouteWalkthrough(routeAlgorithm).map((routeState, index) => ({
        step: index + 1,
        line: routeState.line,
        code: routeState.code,
        story: createCityRouteStory(routeState),
        routeState,
      }));
    }
    const sourceLines = code.split("\n");
    const executableLines = sourceLines
      .map((line, index) => ({ code: line.trim(), line: index + 1 }))
      .filter(({ code }) => code && !code.startsWith("//") && !code.startsWith("#"));

    if (!executableLines.length) {
      return [{ step: 1, line: 1, code: "No code entered yet", story: createRealWorldStory("", 1) }];
    }

    return executableLines.map(({ code, line }, index) => ({
      step: index + 1,
      line,
      code,
      story: createRealWorldStory(code, line),
    }));
  };

  const startVisualStory = () => {
    if (!userCode.trim()) {
      toast.error("Please paste or write some code first.");
      return;
    }
    const generatedSteps = buildSteps(userCode, selectedWalkthrough);
    setSteps(generatedSteps);
    setCurrentStepIndex(0);
    setIsPlaying(false);
    setActiveView("studio");
    playActionSound(generatedSteps[0]?.story);
    saveSubmission.mutate({ problemTitle: userProblem || "Untitled code story", language: selectedLang, code: userCode });
    toast.success("Your code is now ready as an everyday visual story.");
  };

  const startCityComparison = () => {
    try {
      const parsed = parseCityGraph(customGraphText);
      if (!parsed.stops.includes(customStartStop) || !parsed.stops.includes(customTargetStop)) throw new Error("Choose a start and target stop from your map.");
      if (customStartStop === customTargetStop) throw new Error("Choose two different stops so the route has somewhere to go.");
      const bfs = createCityRouteWalkthrough(parsed.graph, "bfs", customStartStop, customTargetStop);
      const dfs = createCityRouteWalkthrough(parsed.graph, "dfs", customStartStop, customTargetStop);
      const generatedCode = createCustomCityCode(parsed.graph, customStartStop, customTargetStop);
      setUserCode(generatedCode);
      setUserProblem(`Compare two ways to travel from ${customStartStop} to ${customTargetStop}`);
      setSelectedLang("python");
      setSelectedWalkthrough(null);
      setComparisonRun({ graph: parsed.graph, stops: parsed.stops, startStop: customStartStop, targetStop: customTargetStop, bfs, dfs });
      setComparisonStepIndex(0);
      setComparisonPlaying(false);
      setActiveView("comparison");
      saveSubmission.mutate({ problemTitle: `City Map: ${customStartStop} to ${customTargetStop}`, language: "python", code: generatedCode });
      toast.success("Your custom City Map is ready for a BFS and DFS race.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Please check the City Map details.");
    }
  };

  const goToStep = (index: number) => {
    setIsPlaying(false);
    const nextIndex = Math.max(0, Math.min(index, steps.length - 1));
    setCurrentStepIndex(nextIndex);
    playActionSound(steps[nextIndex]?.story);
  };

  const goToComparisonStep = (index: number) => {
    setComparisonPlaying(false);
    setComparisonStepIndex(Math.max(0, Math.min(index, comparisonLength - 1)));
  };

  useEffect(() => {
    if (!isPlaying || steps.length < 2) return;
    timerRef.current = setInterval(() => {
      setCurrentStepIndex((index) => {
        if (index >= steps.length - 1) {
          setIsPlaying(false);
          return index;
        }
        playActionSound(steps[index + 1]?.story);
        return index + 1;
      });
    }, speedMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speedMs, steps, soundEnabled]);

  useEffect(() => {
    if (!comparisonPlaying || comparisonLength < 2) return;
    timerRef.current = setInterval(() => {
      setComparisonStepIndex((index) => {
        if (index >= comparisonLength - 1) {
          setComparisonPlaying(false);
          return index;
        }
        return index + 1;
      });
    }, speedMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [comparisonPlaying, comparisonLength, speedMs]);

  useEffect(() => {
    if (activeView !== "studio" && activeView !== "comparison") return;

    const handleShortcut = (event: KeyboardEvent) => {
      const action = getStoryShortcutAction(event);
      if (!action) return;
      event.preventDefault();

      if (action === "toggle-play") {
        if (activeView === "comparison") setComparisonPlaying((value) => !value);
        else setIsPlaying((value) => !value);
      }
      if (action === "previous" || action === "next" || action === "restart") {
        if (activeView === "comparison") {
          setComparisonPlaying(false);
          setComparisonStepIndex((index) => action === "previous" ? Math.max(0, index - 1) : action === "next" ? Math.min(comparisonLength - 1, index + 1) : 0);
        } else {
          setIsPlaying(false);
          setCurrentStepIndex((index) => {
            const nextIndex = action === "previous" ? Math.max(0, index - 1) : action === "next" ? Math.min(steps.length - 1, index + 1) : 0;
            playActionSound(steps[nextIndex]?.story);
            return nextIndex;
          });
        }
      }
      if (action === "toggle-sound") setSoundEnabled((value) => !value);
    };

    window.addEventListener("keydown", handleShortcut, { capture: true });
    return () => window.removeEventListener("keydown", handleShortcut, { capture: true });
  }, [activeView, steps, soundEnabled, comparisonLength]);

  const visualDictionary = [
    ["🗃️", "Labelled boxes", "A variable: a named place that remembers something."],
    ["🧺", "Sorting tray", "A list or array: a group of items kept together."],
    ["🔁", "Walking route", "A loop: the same task repeated for each item."],
    ["🚦", "Decision gate", "An if statement: a question with different next steps."],
    ["📦", "Delivery desk", "A return: the answer being handed back."],
  ];

  return (
    <div className={`visual-theme-${visualTheme} min-h-screen bg-[#090604] text-[#f7f0e8] selection:bg-amber-300/30`}>
      <header className="sticky top-0 z-50 border-b border-[#2c2018] bg-[#120d0a]/90 px-5 py-3 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <button onClick={() => setActiveView("landing")} className="flex items-center gap-3 text-left" aria-label="Go to code input">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#ffbc80] via-[#e07834] to-[#8d3519] text-white shadow-[0_0_26px_rgba(229,155,99,0.38)]"><Sparkles className="h-5 w-5 fill-current" /></div>
            <div><p className="text-base font-black tracking-tight text-white">Code Story Studio</p><p className="text-[10px] font-medium tracking-wide text-[#a89787]">SEE CODE AS EVERYDAY LIFE</p></div>
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setShowShortcutHelp((value) => !value)} aria-expanded={showShortcutHelp} aria-controls="shortcut-help" className="h-10 w-10 rounded-xl border-[#3c2b20] bg-[#1a120e] text-[#efc194] hover:bg-[#271a13]" title="Show keyboard shortcuts"><Keyboard className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => setSoundEnabled((value) => !value)} className="h-10 w-10 rounded-xl border-[#3c2b20] bg-[#1a120e] text-[#efc194] hover:bg-[#271a13]" title={soundEnabled ? "Turn sound off" : "Turn sound on"}>{soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</Button>
            {activeView !== "landing" ? <Button variant="outline" onClick={() => setActiveView("landing")} className="rounded-xl border-[#3c2b20] bg-[#1a120e] text-xs text-white hover:bg-[#271a13]">Change code</Button> : <Button onClick={startVisualStory} className="rounded-xl bg-gradient-to-r from-[#ffbd7d] to-[#d86527] px-5 text-xs font-black text-[#160b06] shadow-[0_0_28px_rgba(229,155,99,0.35)] hover:from-[#ffd0a2] hover:to-[#ed7b3b]">Make my code visual <ArrowRight className="ml-1 h-4 w-4" /></Button>}
          </div>
        </div>
      </header>

      {showShortcutHelp && <aside id="shortcut-help" role="dialog" aria-label="Keyboard shortcuts" className="fixed right-4 top-[4.8rem] z-[60] w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-amber-300/25 bg-[#17100d]/95 p-4 shadow-[0_24px_64px_rgba(0,0,0,0.55)] backdrop-blur-xl"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">Story controls</p><h2 className="mt-1 text-sm font-black text-white">Keyboard shortcuts</h2></div><Button variant="ghost" size="icon" onClick={() => setShowShortcutHelp(false)} className="h-8 w-8 rounded-xl text-[#c5ad98] hover:bg-white/10 hover:text-white" aria-label="Close shortcut help"><X className="h-4 w-4" /></Button></div><p className="mt-2 text-xs leading-relaxed text-[#aa9684]">Shortcuts work while viewing a story. They never interrupt typing in the editor.</p><div className="mt-4 space-y-2">{STORY_SHORTCUTS.map((shortcut) => <div key={shortcut.label} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0c0806] px-3 py-2"><span className="text-xs text-[#d8c4b2]">{shortcut.label}</span><kbd className="rounded-md border border-[#5e4432] bg-[#241711] px-2 py-1 font-mono text-[10px] font-bold text-amber-100">{shortcut.keys}</kbd></div>)}</div></aside>}

      {activeView === "landing" && (
        <main className="mx-auto w-full max-w-6xl px-5 py-12 md:px-8 md:py-16">
          <section className="mx-auto max-w-4xl text-center">
            <Badge className="rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-1.5 text-[11px] font-bold text-amber-200 shadow-[0_0_24px_rgba(245,158,11,0.12)]">✨ Made for people who are learning code from the beginning</Badge>
            <h1 className="mt-5 text-4xl font-black leading-[1.04] tracking-tight text-white md:text-6xl">Your code, told as a <span className="bg-gradient-to-r from-[#ffb472] to-[#ffe0ba] bg-clip-text text-transparent">simple visual story.</span></h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#c0aea0] md:text-lg">Paste code in JavaScript, Python, C, or Java. We turn each line into a familiar scene, then explain what is happening using everyday words instead of technical jargon.</p>
          </section>

          <section className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
            <div className="relative overflow-hidden rounded-[28px] border border-[#37271d] bg-[#15100d]/95 p-6 shadow-[0_26px_60px_rgba(0,0,0,0.45)] md:p-8">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
              <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-amber-200"><Code2 className="h-5 w-5" /></div><div><h2 className="text-sm font-bold text-white">Start with your own code</h2><p className="text-xs text-[#a89787]">No special format needed—paste a small program or algorithm.</p></div></div>
                <div className="flex rounded-2xl border border-[#3c2b20] bg-[#0c0806] p-1">
                  {(["javascript", "python", "c", "java"] as Language[]).map((language) => <button key={language} onClick={() => setSelectedLang(language)} className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wide transition ${selectedLang === language ? "bg-gradient-to-r from-[#ffbd7d] to-[#d86527] text-[#1a0c05] shadow-[0_0_18px_rgba(229,155,99,0.25)]" : "text-[#a89787] hover:text-white"}`}>{language}</button>)}
                </div>
              </div>
              <div className="relative mt-6 space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3"><Label className="block text-[11px] font-bold uppercase tracking-wider text-[#bba797]">Choose your visual world</Label><span className="text-[10px] text-[#8f7c6d]">You can change this later</span></div>
                  <div className="grid grid-cols-3 gap-2">{visualThemes.map((theme) => <button key={theme.id} onClick={() => setVisualTheme(theme.id)} aria-pressed={visualTheme === theme.id} className={`rounded-2xl border p-3 text-left transition ${visualTheme === theme.id ? "border-amber-300/65 bg-amber-300/10 shadow-[0_0_18px_rgba(245,158,11,0.14)]" : "border-white/10 bg-[#0c0806] hover:border-[#694b35]"}`}><span className="text-lg">{theme.icon}</span><span className="ml-1.5 text-xs font-bold text-white">{theme.shortLabel}</span></button>)}</div>
                  <p className="mt-2 text-[11px] leading-relaxed text-[#a89787]">{activeTheme.description}</p>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3"><Label className="block text-[11px] font-bold uppercase tracking-wider text-[#bba797]">Try a ready-made everyday example</Label><span className="text-[10px] text-[#8f7c6d]">or write your own below</span></div>
                  <div className="grid gap-2 sm:grid-cols-2">{learningPresets.map((preset) => <button key={preset.name} onClick={() => { setUserProblem(preset.problem); setSelectedLang(preset.language); setUserCode(preset.code); setSelectedWalkthrough(preset.walkthrough ?? null); toast.success(`${preset.name} example loaded.`); }} className="group rounded-2xl border border-white/10 bg-[#0c0806] p-3 text-left transition hover:-translate-y-0.5 hover:border-amber-300/45 hover:bg-[#1b110b]"><span className="text-lg">{preset.icon}</span><span className="ml-2 text-xs font-bold text-white">{preset.name}</span><span className="mt-1 block text-[10px] leading-relaxed text-[#a89787]">{preset.description}</span></button>)}</div>
                </div>
                <section className="rounded-3xl border border-sky-300/20 bg-[#081426]/80 p-4 shadow-[inset_0_0_30px_rgba(59,130,246,0.05)]" data-custom-city-editor>
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-200">Custom City Map Lab</p><h3 className="mt-1 text-sm font-black text-white">Build your own roads, then compare both explorers.</h3></div><button type="button" onClick={() => { setCustomGraphText(customCityGraphExample); setCustomStartStop("Cafe"); setCustomTargetStop("Restaurant"); }} className="rounded-xl border border-sky-300/25 bg-sky-300/10 px-3 py-2 text-[10px] font-bold text-sky-100 transition hover:bg-sky-300/20">Load example</button></div>
                  <p className="mt-2 text-[11px] leading-relaxed text-[#a8c7eb]">Use one line per stop: <code className="rounded bg-sky-300/10 px-1 text-sky-100">Cafe: Library, Park</code>. Roads work in the direction you list them.</p>
                  <Textarea aria-label="Custom city graph" value={customGraphText} onChange={(event) => { const next = event.target.value; setCustomGraphText(next); try { const parsed = parseCityGraph(next); setCustomStartStop((current) => parsed.stops.includes(current) ? current : parsed.stops[0] ?? ""); setCustomTargetStop((current) => parsed.stops.includes(current) ? current : parsed.stops.at(-1) ?? ""); } catch { /* Keep the last valid selections while the learner edits. */ } }} rows={6} className="mt-3 resize-y rounded-2xl border-sky-300/20 bg-[#06101e] font-mono text-xs leading-6 text-sky-50 focus-visible:ring-sky-300" placeholder="Cafe: Library, Park\nLibrary: Museum\nPark:" />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="block text-[10px] font-bold uppercase tracking-wider text-sky-100">Start stop<select aria-label="Custom city start stop" value={customStartStop} onChange={(event) => setCustomStartStop(event.target.value)} disabled={!customGraphStops.length} className="mt-1.5 h-10 w-full rounded-xl border border-sky-300/20 bg-[#06101e] px-3 text-xs font-semibold text-white disabled:opacity-50">{customGraphStops.map((stop) => <option key={stop} value={stop}>{stop}</option>)}</select></label><label className="block text-[10px] font-bold uppercase tracking-wider text-sky-100">Target stop<select aria-label="Custom city target stop" value={customTargetStop} onChange={(event) => setCustomTargetStop(event.target.value)} disabled={!customGraphStops.length} className="mt-1.5 h-10 w-full rounded-xl border border-sky-300/20 bg-[#06101e] px-3 text-xs font-semibold text-white disabled:opacity-50">{customGraphStops.map((stop) => <option key={stop} value={stop}>{stop}</option>)}</select></label></div>
                  <Button type="button" onClick={startCityComparison} disabled={customGraphStops.length < 2} className="mt-4 h-11 w-full rounded-xl bg-gradient-to-r from-sky-200 via-sky-300 to-cyan-300 text-xs font-black text-[#06101e] shadow-[0_0_28px_rgba(56,189,248,0.24)] hover:from-white hover:to-cyan-200 disabled:opacity-40">Compare BFS and DFS on my map <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </section>
                <div><Label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[#bba797]">What does this code try to do?</Label><Input value={userProblem} onChange={(event) => setUserProblem(event.target.value)} className="h-12 rounded-xl border-[#39291f] bg-[#0b0705] text-white focus-visible:ring-[#f59e0b]" placeholder="For example: Find an apple in a basket" /></div>
                <div><Label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[#bba797]">Your code</Label><Textarea value={userCode} onChange={(event) => { setUserCode(event.target.value); setSelectedWalkthrough(null); }} rows={14} className="resize-y rounded-xl border-[#39291f] bg-[#0b0705] p-4 font-mono text-xs leading-6 text-[#f7f0e8] focus-visible:ring-[#f59e0b]" placeholder="Paste your code here" /></div>
              </div>
              <div className="relative mt-6 flex justify-end"><Button onClick={startVisualStory} className="h-12 rounded-xl bg-gradient-to-r from-[#ffbd7d] via-[#e07834] to-[#c34d20] px-6 text-sm font-black text-[#170b06] shadow-[0_0_32px_rgba(229,155,99,0.33)] hover:scale-[1.01]">Turn it into a visual story <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
            </div>

            <aside className="rounded-[28px] border border-[#37271d] bg-[#120e0b] p-6 shadow-[0_26px_60px_rgba(0,0,0,0.35)]">
              <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-amber-300" /><h2 className="text-sm font-bold text-white">Your visual dictionary</h2></div>
              <p className="mt-2 text-xs leading-relaxed text-[#a89787]">Every technical idea is shown using an object you may already know.</p>
              <div className="mt-5 space-y-3">{visualDictionary.map(([icon, label, detail]) => <div key={label} className="rounded-2xl border border-white/10 bg-[#0c0806] p-3"><div className="flex items-center gap-2"><span className="text-xl">{icon}</span><span className="text-xs font-bold text-white">{label}</span></div><p className="mt-1 pl-8 text-[11px] leading-relaxed text-[#a89787]">{detail}</p></div>)}</div>
            </aside>
          </section>
        </main>
      )}

      {activeView === "studio" && currentStep && (
        <main className="mx-auto w-full max-w-7xl px-5 py-7 md:px-8">
          <div className="mb-6 flex flex-col justify-between gap-4 rounded-3xl border border-[#37271d] bg-[#15100d] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.32)] md:flex-row md:items-center">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">Learning story</p><h1 className="mt-1 text-xl font-black text-white">{userProblem || "Your code story"}</h1><p className="mt-1 text-xs text-[#a89787]">Watch the highlighted scene, then read the simple explanation beside it.</p></div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => goToStep(0)} aria-label="Restart story" className="h-10 w-10 rounded-xl border-[#3c2b20] bg-[#0c0806] text-[#f2c69b] hover:bg-[#251911]" title="Start again"><RotateCcw className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => goToStep(currentStepIndex - 1)} aria-label="Previous step" disabled={currentStepIndex === 0} className="h-10 w-10 rounded-xl border-[#3c2b20] bg-[#0c0806] text-[#f2c69b] hover:bg-[#251911]"><ChevronLeft className="h-4 w-4" /></Button>
              <Button onClick={() => setIsPlaying((value) => !value)} className="h-10 rounded-xl bg-gradient-to-r from-[#ffbd7d] to-[#d86527] px-5 text-xs font-black text-[#160b06]">{isPlaying ? <Pause className="mr-1.5 h-4 w-4" /> : <Play className="mr-1.5 h-4 w-4" />}{isPlaying ? "Pause story" : "Play story"}</Button>
              <Button variant="outline" size="icon" onClick={() => goToStep(currentStepIndex + 1)} aria-label="Next step" disabled={currentStepIndex === steps.length - 1} className="h-10 w-10 rounded-xl border-[#3c2b20] bg-[#0c0806] text-[#f2c69b] hover:bg-[#251911]"><ChevronRight className="h-4 w-4" /></Button>
              <label className="ml-1 flex items-center gap-2 text-[11px] text-[#a89787]">Speed <input aria-label="Story playback speed" type="range" min="1000" max="4200" step="400" value={speedMs} onChange={(event) => setSpeedMs(Number(event.target.value))} className="w-20 accent-[#f59e0b]" /></label>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end"><span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-[#8f7c6d]">World</span>{visualThemes.map((theme) => <button key={theme.id} onClick={() => setVisualTheme(theme.id)} aria-pressed={visualTheme === theme.id} className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition ${visualTheme === theme.id ? "border-amber-300/60 bg-amber-300/10 text-amber-100" : "border-white/10 bg-[#0c0806] text-[#a89787] hover:text-white"}`}>{theme.icon} {theme.shortLabel}</button>)}</div>
          </div>

          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0c0806]/75 px-4 py-3 text-xs text-[#c3b2a1] md:flex-row md:items-center md:justify-between"><span><strong className="text-white">{activeTheme.name}:</strong> {activeTheme.sceneHint}</span><div className="flex flex-wrap gap-x-3 gap-y-1">{STORY_SHORTCUTS.map((shortcut) => <span key={shortcut.keys}><kbd className="rounded border border-[#624733] bg-[#21150e] px-1.5 py-0.5 font-mono text-[10px] text-amber-100">{shortcut.keys}</kbd> <span className="text-[10px] text-[#9e8a79]">{shortcut.label}</span></span>)}</div></div>

          <section className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
            <div className="rounded-[28px] border border-[#37271d] bg-[#15100d] p-5 shadow-[0_26px_60px_rgba(0,0,0,0.35)] md:p-6">
              <SceneHeader story={currentStep.story} step={currentStep} />
              <div key={`scene-${currentStep.step}-${currentStep.story.kind}-${visualTheme}`} data-story-scene data-story-step={currentStep.step} className="mt-5"><RealWorldScene story={currentStep.story} visualTheme={visualTheme} routeState={currentStep.routeState} /></div>
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0c0806] px-4 py-3 text-xs text-[#bdac9b]"><Box className="h-4 w-4 shrink-0 text-amber-200" /><span><strong className="text-white">What you are seeing:</strong> This picture represents a {sceneStyles[currentStep.story.kind].label}, not a hard-to-read memory diagram.</span></div>
            </div>

            <div className="rounded-[28px] border border-[#37271d] bg-[#15100d] p-5 shadow-[0_26px_60px_rgba(0,0,0,0.35)] md:p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4"><div className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-200" /><h2 className="text-sm font-bold text-white">What the computer is doing</h2></div><Badge className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-[10px] font-bold text-amber-200">Line {currentStep.line}</Badge></div>
              <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">The code says</p><code className="mt-2 block whitespace-pre-wrap break-words font-mono text-xs leading-6 text-[#f9e9d5]">{currentStep.code}</code></div>
              <div key={`explanation-${currentStep.step}`} data-story-explanation aria-live="polite" className="explanation-enter mt-4 rounded-2xl border border-[#3d2c21] bg-[#0c0806] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#f2bc89]">In everyday words</p><p className="mt-2 text-sm font-medium leading-7 text-white">{currentStep.story.plainEnglish}</p></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/5 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">What changed</p><p className="mt-2 text-xs leading-5 text-[#d7efe2]">{currentStep.story.whatChanged}</p></div><div className="rounded-2xl border border-sky-300/15 bg-sky-300/5 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-200">Everyday example</p><p className="mt-2 text-xs leading-5 text-[#d9eff8]">{currentStep.story.analogy}</p></div></div>
              <div className="mt-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a89787]">Jump to any part of the story</p><div className="mt-3 max-h-[265px] space-y-2 overflow-y-auto pr-1">{steps.map((step, index) => { const isActive = index === currentStepIndex; return <button key={`${step.line}-${step.code}`} onClick={() => goToStep(index)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${isActive ? "border-amber-300/60 bg-amber-300/10 shadow-[0_0_20px_rgba(245,158,11,0.12)]" : "border-white/10 bg-[#0c0806] hover:border-[#694b35] hover:bg-[#17100d]"}`}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/5 text-lg">{step.story.icon}</span><span className="min-w-0 flex-1"><span className={`block text-xs font-bold ${isActive ? "text-white" : "text-[#d4c1b0]"}`}>Step {step.step}: {step.story.title}</span><span className="mt-0.5 block truncate font-mono text-[10px] text-[#8f7c6d]">Line {step.line}: {step.code}</span></span>{isActive && <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-200" />}</button>; })}</div></div>
            </div>
          </section>
        </main>
      )}

      {activeView === "comparison" && comparisonRun && comparisonBfsState && comparisonDfsState && (
        <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8 md:py-12" data-city-comparison>
          <div className="flex flex-wrap items-start justify-between gap-5"><div><button type="button" onClick={() => setActiveView("landing")} className="inline-flex items-center gap-1 text-xs font-bold text-[#d6a87e] transition hover:text-white"><ChevronLeft className="h-4 w-4" /> Edit city map</button><Badge className="ml-3 rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1 text-[10px] font-bold text-sky-100">CUSTOM CITY MAP</Badge><h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-5xl">BFS and DFS, <span className="bg-gradient-to-r from-sky-200 to-violet-200 bg-clip-text text-transparent">side by side.</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#c8b7a7]">Both explorers start at <strong className="text-white">{comparisonRun.startStop}</strong> and look for <strong className="text-amber-100">{comparisonRun.targetStop}</strong>. Use one control bar to watch their different choices at the same time.</p></div><div className="rounded-2xl border border-white/10 bg-[#120d0a] px-4 py-3 text-right"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#a89787]">Map size</p><p className="mt-1 text-sm font-black text-white">{comparisonRun.stops.length} stops · {getCityGraphEdges(comparisonRun.graph).length} roads</p></div></div>

          <section className="mt-8 rounded-[28px] border border-[#37271d] bg-[#15100d] p-4 shadow-[0_26px_60px_rgba(0,0,0,0.35)] md:p-5" aria-label="Shared comparison controls">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center"><div className="flex items-center gap-2"><Button variant="outline" size="icon" onClick={() => goToComparisonStep(comparisonStepIndex - 1)} disabled={comparisonStepIndex === 0} className="h-11 w-11 rounded-xl border-white/10 bg-[#0c0806] text-white hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></Button><Button onClick={() => setComparisonPlaying((playing) => !playing)} className="h-11 min-w-28 rounded-xl bg-gradient-to-r from-sky-200 to-violet-200 text-xs font-black text-[#0a0712] hover:from-white hover:to-violet-100">{comparisonPlaying ? <><Pause className="mr-1 h-4 w-4" /> Pause</> : <><Play className="mr-1 h-4 w-4 fill-current" /> Play both</>}</Button><Button variant="outline" size="icon" onClick={() => goToComparisonStep(comparisonStepIndex + 1)} disabled={comparisonStepIndex >= comparisonLength - 1} className="h-11 w-11 rounded-xl border-white/10 bg-[#0c0806] text-white hover:bg-white/10"><ChevronRight className="h-4 w-4" /></Button><Button variant="outline" size="icon" onClick={() => goToComparisonStep(0)} className="h-11 w-11 rounded-xl border-white/10 bg-[#0c0806] text-white hover:bg-white/10" title="Restart both explorers"><RotateCcw className="h-4 w-4" /></Button></div><div className="min-w-0 flex-1"><div className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-[#a89787]"><span>Shared moment</span><span>Step {comparisonStepIndex + 1} of {comparisonLength}</span></div><input aria-label="Comparison progress" type="range" min="0" max={Math.max(comparisonLength - 1, 0)} value={comparisonStepIndex} onChange={(event) => goToComparisonStep(Number(event.target.value))} className="w-full accent-sky-300" /></div><label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#a89787]">Speed<select aria-label="Comparison speed" value={speedMs} onChange={(event) => setSpeedMs(Number(event.target.value))} className="h-9 rounded-xl border border-white/10 bg-[#0c0806] px-2 text-xs text-white"><option value={3000}>Slow</option><option value={2200}>Normal</option><option value={1400}>Fast</option></select></label></div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2"><CityComparisonPanel routeState={comparisonBfsState} stepNumber={Math.min(comparisonStepIndex + 1, comparisonRun.bfs.length)} visualTheme={visualTheme} /><CityComparisonPanel routeState={comparisonDfsState} stepNumber={Math.min(comparisonStepIndex + 1, comparisonRun.dfs.length)} visualTheme={visualTheme} /></section>

          <section className="mt-6 rounded-[28px] border border-[#37271d] bg-[#15100d] p-5 shadow-[0_26px_60px_rgba(0,0,0,0.3)]"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a89787]">Jump both explorers together</p><h2 className="mt-1 text-sm font-black text-white">Choose any comparison moment</h2></div><p className="text-xs text-[#b9a898]">BFS may finish first; its final shortest route stays visible.</p></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: comparisonLength }, (_, index) => { const bfs = comparisonRun.bfs[Math.min(index, comparisonRun.bfs.length - 1)]!; const dfs = comparisonRun.dfs[Math.min(index, comparisonRun.dfs.length - 1)]!; const active = index === comparisonStepIndex; return <button key={index} type="button" onClick={() => goToComparisonStep(index)} className={`rounded-2xl border p-3 text-left transition ${active ? "border-sky-300/55 bg-sky-300/10 shadow-[0_0_20px_rgba(125,211,252,0.12)]" : "border-white/10 bg-[#0c0806] hover:border-[#6e5b4c]"}`}><span className="block text-[10px] font-black uppercase tracking-wider text-sky-200">Moment {index + 1}</span><span className="mt-1 block truncate text-xs font-bold text-white">BFS: {bfs.currentStop}</span><span className="mt-0.5 block truncate text-xs font-bold text-violet-200">DFS: {dfs.currentStop}</span></button>; })}</div></section>
        </main>
      )}
    </div>
  );
}
