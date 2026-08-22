import React, { useEffect, useRef, useState } from "react";
import {
  Archive,
  Award,
  ArrowDownUp,
  ArrowRight,
  BookOpen,
  Box,
  CircleDot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Code2,
  ChevronDown,
  CornerDownLeft,
  CornerDownRight,
  Download,
  Eye,
  FileJson,
  Footprints,
  GitBranch,
  ImageDown,
  Hand,
  Hammer,
  House,
  Keyboard,
  Landmark,
  Library,
  Lightbulb,
  Link2,
  MapPinned,
  Network,
  PackageCheck,
  Palette,
  Pause,
  Play,
  Repeat2,
  RotateCcw,
  Route,
  Share2,
  Sparkles,
  Sun,
  Tag,
  TreePine,
  Utensils,
  GripVertical,
  Volume2,
  VolumeX,
  Wrench,
  X,
  Moon,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { createRealWorldStory, getActionSound, type RealWorldStory } from "@/lib/realWorldLearning";
import { createCityRouteStory, createCityRouteWalkthrough, createDijkstraRouteWalkthrough, getCityGraphEdges, getCityGraphPositions, getCityLiveNarration, getCityRouteWalkthrough, getCityWeightedEdges, parseCityGraph, type CityGraph, type CityNodePosition, type CityRouteAlgorithm, type CityRouteState, type CityWeightedGraph } from "@/lib/cityRoutes";
import { getStoryShortcutAction, STORY_SHORTCUTS } from "@/lib/storyControls";
import { getStoryCodeLines } from "@/lib/storyFocus";
import { getSavedVisualTheme, getVisualTheme, saveVisualTheme, visualThemes, type VisualTheme } from "@/lib/learningThemes";
import { getInitialLearningWorkspace, getLearningWorkspace, getLearningWorkspaceLabel, type LearningWorkspace } from "@/lib/workspaceNavigation";
import { defaultOnboardingStatus, finishOnboardingTour, getNextOnboardingStep, getPendingOnboardingWorkspace, getPreviousOnboardingStep, onboardingSteps, parseGraphScenario, readOnboardingStatus, serializeGraphScenario, shouldDisplayOnboardingCoach, type OnboardingWorkspace, type OnboardingStatus, type SharedGraphScenario } from "@/lib/learningFlow";
import { createCityMapExportData, getCityMapExportFileBase } from "@/lib/cityMapExports";
import { getStoryLearningScore } from "@/lib/learningScore";
import { useTheme, type ThemePreference } from "@/contexts/ThemeContext";
import { LivingSvgBackground } from "@/components/LivingSvgBackground";

const CodeResultThreeScene = React.lazy(() => import("@/components/CodeResultThreeScene"));

type Language = "javascript" | "python" | "c" | "java";
type MandalaIntensity = "calm" | "bright" | "festival";

const mandalaIntensityOptions: { value: MandalaIntensity; label: string; detail: string }[] = [
  { value: "calm", label: "Calm", detail: "Slow, soft colour" },
  { value: "bright", label: "Bright", detail: "Balanced jewel tones" },
  { value: "festival", label: "Festival", detail: "Vivid and celebratory" },
];

type LearningStep = {
  step: number;
  line: number;
  code: string;
  story: RealWorldStory;
  executionState?: { subject: string; action: string; change: string };
  routeState?: CityRouteState;
};

type CodeStructureSummary = {
  language: string;
  parser: "babel" | "esprima" | "heuristic";
  parseStatus: "parsed" | "recovered" | "fallback";
  nodeCount: number;
  declarations: number;
  functions: number;
  branches: number;
  loops: number;
  calls: number;
};

type CinematicScene = {
  svg: string;
  caption: string;
  renderer: "python-svg";
};

type CinematicSceneStatus = "loading" | "ready" | "failed";

type AIVisual = {
  imageUrl: string | null;
  prompt: string;
  provider: "built-in-image";
  fallbackReason?: "quota_exhausted" | "temporarily_unavailable";
  message?: string;
};

type AIVisualStatus = "idle" | "loading" | "ready" | "fallback" | "failed";

function getCinematicSceneKey(step: LearningStep) {
  return `${step.step}:${step.line}:${step.story.kind}:${step.code}:${step.story.title}`;
}

function getAIVisualKey(step: LearningStep, theme: VisualTheme) {
  return `${getCinematicSceneKey(step)}:${theme}`;
}

type CityComparisonRun = {
  graph: CityGraph;
  weightedGraph: CityWeightedGraph;
  stops: string[];
  startStop: string;
  targetStop: string;
  bfs: CityRouteState[];
  dfs: CityRouteState[];
  dijkstra: CityRouteState[];
};

const customCityGraphExample = `Cafe: Library (4), Park (2)
Library: Museum (2), Restaurant (7)
Park: Restaurant (3)
Museum: Restaurant (1)
Restaurant:`;

function createCustomCityCode(graph: CityWeightedGraph, startStop: string, targetStop: string): string {
  const entries = Object.entries(graph).map(([stop, roads]) => `  "${stop}": [${roads.map((road) => `("${road.to}", ${road.weight})`).join(", ")}],`).join("\n");
  return `city_map = {\n${entries}\n}\nstart = "${startStop}"\ntarget = "${targetStop}"\n# Compare BFS, DFS, and Dijkstra on this map`;
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

const interpreterProgressMessages = [
  "Reading the shape of your code…",
  "Matching each line with familiar objects…",
  "Writing simple-English explanations…",
] as const;

type LearningPreset = {
  name: string;
  kind: RealWorldStory["kind"];
  description: string;
  problem: string;
  language: Language;
  code: string;
  walkthrough?: CityRouteAlgorithm;
};

const learningPresets: LearningPreset[] = [
  {
    name: "Shopping cart",
    kind: "sorting-tray",
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
    kind: "storage-shelf",
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
    kind: "decision-gate",
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
    kind: "delivery-desk",
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
    kind: "linked-chain",
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
    kind: "recursion-stairs",
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
    kind: "family-tree",
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
    kind: "city-map",
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
    kind: "city-map",
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
    kind: "city-map",
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

const cityStopIcons = [Coffee, Library, TreePine, Landmark, Utensils, MapPinned, House, Palette, Network, CircleDot] as const;

const themeIcons = {
  kitchen: Utensils,
  office: Archive,
  game: Palette,
  mandala: CircleDot,
  "high-contrast": Eye,
} satisfies Record<VisualTheme, typeof Box>;

function SceneKindIcon({ kind, className = "" }: { kind: RealWorldStory["kind"]; className?: string }) {
  const shared = { className: `story-glyph ${className}`, viewBox: "0 0 32 32", fill: "none", stroke: "currentColor", strokeWidth: 2.35, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, focusable: false, "data-story-glyph": kind };
  switch (kind) {
    case "storage-shelf": return <svg {...shared}><path d="M7 5.5h18v21H7z" /><path d="M7 12.5h18M7 19.5h18" /><path d="M12 9h.01M20 16h.01M14.5 23h.01" /><path d="M10 5.5v21M22 5.5v21" /></svg>;
    case "sorting-tray": return <svg {...shared}><path d="M6 8.5h20l-2.2 15H8.2z" /><path d="M10 8.5l2.2-3h7.6l2.2 3" /><path d="M11 14h10M13 18h6" /><circle cx="11" cy="23" r="1.2" fill="currentColor" stroke="none" /><circle cx="21" cy="23" r="1.2" fill="currentColor" stroke="none" /></svg>;
    case "linked-chain": return <svg {...shared}><path d="M12.3 19.7 9.7 22.3a4.2 4.2 0 0 1-6-6l4-4a4.2 4.2 0 0 1 6 0" /><path d="m19.7 12.3 2.6-2.6a4.2 4.2 0 1 1 6 6l-4 4a4.2 4.2 0 0 1-6 0" /><path d="m11 21 10-10" /></svg>;
    case "family-tree": return <svg {...shared}><circle cx="16" cy="7" r="3" /><circle cx="8" cy="24" r="3" /><circle cx="24" cy="24" r="3" /><path d="M16 10v5M8 18v-3h16v3M8 15v3M24 15v3" /></svg>;
    case "conveyor-loop": return <svg {...shared}><path d="M7 11h16l3 5-3 5H7l-3-5z" /><path d="M10 11v10M16 11v10M22 11v10" /><path d="m21 6 3 3-3 3M11 26l-3-3 3-3" /></svg>;
    case "recursion-stairs": return <svg {...shared}><path d="M5 25h6v-5h5v-5h5v-5h6" /><path d="m22 6 5 4-5 4" /><path d="M27 10h-8" /><path d="m10 26-4-4 4-4" /></svg>;
    case "city-map": return <svg {...shared}><path d="m5 7 8-3 6 3 8-3v21l-8 3-6-3-8 3z" /><path d="M13 4v21M19 7v21" /><circle cx="11" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="21" cy="20" r="1.5" fill="currentColor" stroke="none" /></svg>;
    case "decision-gate": return <svg {...shared}><path d="M16 5v7M16 20v7M16 12l-8 5M16 12l8 5" /><circle cx="16" cy="12" r="3.5" /><circle cx="8" cy="18" r="2.2" /><circle cx="24" cy="18" r="2.2" /></svg>;
    case "workshop": return <svg {...shared}><path d="M8 27V14l4-8 4 8v13M4 27h24M16 19h9v8" /><path d="M19 15h3M11 18h2" /><path d="m22 9 4 4" /></svg>;
    case "delivery-desk": return <svg {...shared}><path d="M5 11h22v16H5z" /><path d="M5 16h22M11 11V7h10v4" /><path d="M16 19v5M13.5 21.5h5" /></svg>;
    case "workbench":
    default: return <svg {...shared}><path d="M5 12h22v5H5zM8 17v10M24 17v10M12 8l3-3 5 5-3 3z" /><path d="m17.5 7.5 5 5M7 27h18" /></svg>;
  }
}

function StageRoleGlyph({ role, kind, className = "" }: { role: "object" | "action" | "result"; kind: RealWorldStory["kind"]; className?: string }) {
  if (role === "object") return <SceneKindIcon kind={kind} className={`stage-role-glyph ${className}`} />;
  if (role === "action") {
    return <svg className={`stage-role-glyph ${className}`} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" data-stage-role-glyph="action"><path d="M6 16h16" /><path d="m17 9 7 7-7 7" /><path d="M7 9h5M7 23h5" /><circle cx="7" cy="16" r="2.5" fill="currentColor" stroke="none" /></svg>;
  }
  return <svg className={`stage-role-glyph ${className}`} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" data-stage-role-glyph="result"><path d="m8 16 5 5 11-12" /><path d="M16 4v4M5.5 8.5l3 3M26.5 8.5l-3 3" /><circle cx="16" cy="16" r="12" opacity=".38" /></svg>;
}

function ThemeKindIcon({ theme, className = "" }: { theme: VisualTheme; className?: string }) {
  const Icon = themeIcons[theme];
  return <Icon className={className} aria-hidden="true" />;
}

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
          <SceneKindIcon kind={story.kind} className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a89787]">Real-life scene</p>
          <h2 className="text-base font-extrabold text-white">{story.title}</h2>
          {story.visualFocus && <p className="mt-1 max-w-xl text-xs leading-5 text-[#d9c5b4]">Visual focus: {story.visualFocus}</p>}
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

function CityComparisonPanel({ routeState, stepNumber, visualTheme, nodePositions, onNodePositionChange }: { routeState: CityRouteState; stepNumber: number; visualTheme: VisualTheme; nodePositions?: Record<string, CityNodePosition>; onNodePositionChange?: (stop: string, position: CityNodePosition) => void }) {
  const story = createCityRouteStory(routeState);
  const step: LearningStep = { step: stepNumber, line: routeState.line, code: routeState.code, story, routeState };
  const isBfs = routeState.algorithm === "bfs";
  const isDijkstra = routeState.algorithm === "dijkstra";
  const algorithmLabel = isBfs ? "BFS · nearby-first" : isDijkstra ? "Dijkstra · fastest time" : "DFS · one road deep";
  const title = isBfs ? "City waiting line" : isDijkstra ? "Travel-time list" : "City road stack";
  const panelStyle = isBfs ? "border-sky-300/25 bg-[#0d1828]" : isDijkstra ? "border-amber-300/25 bg-[#21170a]" : "border-violet-300/25 bg-[#160d28]";
  const accentStyle = isBfs ? "text-sky-200" : isDijkstra ? "text-amber-200" : "text-violet-200";
  const badgeStyle = isBfs ? "border-sky-200/35 bg-sky-300/10 text-sky-100" : isDijkstra ? "border-amber-200/35 bg-amber-300/10 text-amber-100" : "border-violet-200/35 bg-violet-300/10 text-violet-100";

  return (
    <section className={`rounded-[28px] border p-5 shadow-[0_26px_60px_rgba(0,0,0,0.35)] ${panelStyle}`} data-comparison-panel={routeState.algorithm}>
      <div className="mb-4 flex items-center justify-between gap-3"><div><p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${accentStyle}`}>{algorithmLabel}</p><h2 className="mt-1 text-base font-black text-white">{title}</h2></div><Badge className={`rounded-full border px-3 py-1 text-[10px] font-black ${badgeStyle}`}>Step {stepNumber}</Badge></div>
      <RealWorldScene story={story} visualTheme={visualTheme} routeState={routeState} nodePositions={nodePositions} onNodePositionChange={onNodePositionChange} />
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d9c9b8]">In everyday words</p><p className="mt-2 text-sm font-medium leading-6 text-white">{story.plainEnglish}</p><p className="mt-3 text-xs leading-5 text-[#c9bcd8]"><strong className="text-white">What changed:</strong> {story.whatChanged}</p></div>
      {isBfs && routeState.phase === "complete" && <div className="mt-4 rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4" data-shortest-path-result><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">Shortest route</p>{routeState.shortestPath?.length ? <><p className="mt-2 text-sm font-black text-amber-100">{routeState.shortestPath.join(" → ")}</p><p className="mt-1 text-xs leading-5 text-[#ffe6a7]">This glowing path uses the fewest roads from {routeState.shortestPath[0]} to {routeState.shortestPath.at(-1)}.</p></> : <p className="mt-2 text-xs leading-5 text-[#ffe6a7]">There is no road route from the chosen start stop to the target stop.</p>}</div>}
      {isDijkstra && routeState.phase === "complete" && <div className="mt-4 rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4" data-fastest-path-result><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">Fastest route by travel time</p>{routeState.shortestPath?.length ? <><p className="mt-2 text-sm font-black text-amber-100">{routeState.shortestPath.join(" → ")}</p><p className="mt-1 text-xs leading-5 text-[#ffe6a7]">This route takes {routeState.shortestTravelTime} minutes in total, even if it uses more roads.</p></> : <p className="mt-2 text-xs leading-5 text-[#ffe6a7]">There is no travel-time route to the chosen target.</p>}</div>}
    </section>
  );
}

function OnboardingCoach({ workspace, stepIndex, onBack, onNext, onSkip }: { workspace: OnboardingWorkspace; stepIndex: number; onBack: () => void; onNext: () => void; onSkip: () => void }) {
  const steps = onboardingSteps[workspace];
  const step = steps[stepIndex] ?? steps[0];
  const isLast = stepIndex === steps.length - 1;
  const accent = workspace === "code" ? "border-indigo-300/35 bg-[#10152a]/95" : "border-cyan-300/35 bg-[#071c2c]/95";
  const icon = workspace === "code" ? <Code2 className="h-5 w-5 text-indigo-100" /> : <Lightbulb className="h-5 w-5 text-cyan-100" />;

  return (
    <aside className={`fixed right-4 top-[5.25rem] z-[70] w-[min(23rem,calc(100vw-2rem))] rounded-[22px] border p-4 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl ${accent}`} aria-live="polite" data-onboarding-coach={workspace}>
      <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5">{icon}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/70">{workspace === "code" ? "Code Studio guide" : "Algorithm Lab guide"} · {stepIndex + 1}/{steps.length}</p><button type="button" onClick={onSkip} className="text-[11px] font-bold text-white/60 transition hover:text-white">Skip tour</button></div><h2 className="mt-1 text-sm font-black text-white">{step.title}</h2><p className="mt-1 text-xs leading-5 text-[#c9d3e5]">{step.description}</p></div></div>
      <div className="mt-4 flex items-center justify-between gap-3"><div className="flex gap-1.5" aria-label={`${stepIndex + 1} of ${steps.length} onboarding steps`}>{steps.map((_, index) => <span key={index} className={`h-1.5 rounded-full transition-all ${index === stepIndex ? "w-5 bg-white" : "w-1.5 bg-white/25"}`} />)}</div><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={onBack} disabled={stepIndex === 0} className="h-8 rounded-lg border-white/15 bg-white/5 px-3 text-[11px] text-white hover:bg-white/10">Back</Button><Button size="sm" onClick={onNext} className="h-8 rounded-lg bg-white px-3 text-[11px] font-black text-[#0b1424] hover:bg-sky-100">{isLast ? "Got it" : "Next"} <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></div></div>
    </aside>
  );
}

function RealWorldScene({ story, visualTheme, routeState, nodePositions, onNodePositionChange }: { story: RealWorldStory; visualTheme: VisualTheme; routeState?: CityRouteState; nodePositions?: Record<string, CityNodePosition>; onNodePositionChange?: (stop: string, position: CityNodePosition) => void }) {
  const style = sceneStyles[story.kind];
  const common = "border border-white/10 bg-[#17100c]/90 shadow-[0_16px_35px_rgba(0,0,0,0.3)]";
  const label = "text-[10px] font-bold uppercase tracking-[0.16em] text-[#a89787]";
  const citySceneRef = useRef<HTMLDivElement>(null);
  const draggedStopRef = useRef<string | null>(null);

  const moveCityStop = (event: { clientX: number; clientY: number }, stop: string) => {
    if (!onNodePositionChange || !citySceneRef.current) return;
    const bounds = citySceneRef.current.getBoundingClientRect();
    const left = Math.max(9, Math.min(91, ((event.clientX - bounds.left) / bounds.width) * 100));
    const top = Math.max(16, Math.min(76, ((event.clientY - bounds.top) / bounds.height) * 100));
    onNodePositionChange(stop, { left, top });
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (draggedStopRef.current) moveCityStop(event, draggedStopRef.current);
    };
    const handleMouseUp = () => { draggedStopRef.current = null; };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onNodePositionChange]);

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
          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-sky-100"><Hand className="h-4 w-4" aria-hidden="true" />The computer can pick, compare, or move one item.</div>
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
              <div className={`scene-object-pop grid h-20 w-20 place-items-center rounded-2xl border text-center text-xs font-black ${index === 1 ? "border-pink-200 bg-pink-300 text-[#34091f] shadow-[0_0_26px_rgba(244,114,182,0.48)]" : "border-pink-400/40 bg-[#3a102e] text-pink-100"}`} style={{ animationDelay: `${index * 75}ms` }}><Tag className="h-5 w-5" aria-hidden="true" /><span>{stop}</span></div>
              {index < 2 && <ArrowRight className="scene-object-pop h-5 w-5 text-pink-200" style={{ animationDelay: `${index * 75 + 30}ms` }} aria-hidden="true" />}
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
        <p className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap text-xs font-semibold text-violet-100"><Footprints className="h-4 w-4" aria-hidden="true" />Walk down to the easy stop, then bring the answer back up.</p>
      </div>
    );
  }

  if (story.kind === "family-tree") {
    return (
      <div className="relative flex h-[270px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#07140d] p-6 story-scene-enter" data-scene-world={visualTheme}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(74,222,128,0.16),transparent_62%)]" />
        <div className="absolute left-6 top-5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-100">Family branches</div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="scene-object-pop grid h-16 w-28 place-items-center rounded-2xl border border-emerald-200 bg-emerald-300 text-center text-xs font-black text-emerald-950 shadow-[0_0_26px_rgba(74,222,128,0.42)]"><TreePine className="h-5 w-5" aria-hidden="true" /><span>Parent</span></div>
          <div className="flex w-48 items-center justify-between px-7 text-emerald-200"><CornerDownLeft className="h-5 w-5" aria-hidden="true" /><CornerDownRight className="h-5 w-5" aria-hidden="true" /></div>
          <div className="flex gap-8"><div className="scene-object-pop grid h-14 w-24 place-items-center rounded-2xl border border-emerald-400/40 bg-[#123c28] text-xs font-black text-emerald-100" style={{ animationDelay: "80ms" }}><CircleDot className="h-4 w-4" aria-hidden="true" /><span>Left child</span></div><div className="scene-object-pop grid h-14 w-24 place-items-center rounded-2xl border border-emerald-400/40 bg-[#123c28] text-xs font-black text-emerald-100" style={{ animationDelay: "150ms" }}><CircleDot className="h-4 w-4" aria-hidden="true" /><span>Right child</span></div></div>
        </div>
        <p className="absolute bottom-5 text-center text-xs font-semibold text-emerald-100">A parent can lead to one branch on the left and one on the right.</p>
      </div>
    );
  }

  if (story.kind === "city-map") {
    const defaultCityStops = [
      { name: "Cafe", Icon: Coffee, position: "left-[8%] top-[41%]" },
      { name: "Library", Icon: Library, position: "left-[52%] top-[18%]" },
      { name: "Park", Icon: TreePine, position: "left-[54%] top-[58%]" },
      { name: "Museum", Icon: Landmark, position: "right-[4%] top-[39%]" },
    ];
    const defaultRoads: Array<{ from: string; to: string; x1: number; y1: number; x2: number; y2: number }> = [
      { from: "Cafe", to: "Library", x1: 23, y1: 51, x2: 59, y2: 29 },
      { from: "Cafe", to: "Park", x1: 23, y1: 51, x2: 60, y2: 66 },
      { from: "Library", to: "Museum", x1: 65, y1: 30, x2: 88, y2: 48 },
    ];
    const graphStops = routeState?.graph ? Object.keys(routeState.graph) : [];
    const graphPositions = nodePositions ?? getCityGraphPositions(graphStops);
    const cityStops = routeState?.graph ? graphStops.map((name, index) => ({ name, Icon: cityStopIcons[index % cityStopIcons.length] ?? CircleDot, position: graphPositions[name] })) : defaultCityStops;
    const roads = routeState?.weightedGraph ? getCityWeightedEdges(routeState.weightedGraph).map(({ from, to, weight }) => ({ from, to, weight, x1: graphPositions[from]?.left ?? 50, y1: graphPositions[from]?.top ?? 50, x2: graphPositions[to]?.left ?? 50, y2: graphPositions[to]?.top ?? 50 })) : routeState?.graph ? getCityGraphEdges(routeState.graph).map(([from, to]) => ({ from, to, weight: 1, x1: graphPositions[from]?.left ?? 50, y1: graphPositions[from]?.top ?? 50, x2: graphPositions[to]?.left ?? 50, y2: graphPositions[to]?.top ?? 50 })) : defaultRoads.map((road) => ({ ...road, weight: 1 }));
    const isBfs = routeState?.algorithm === "bfs";
    const isDfs = routeState?.algorithm === "dfs";
    const isDijkstra = routeState?.algorithm === "dijkstra";
    const shortestPath = routeState?.phase === "complete" ? routeState.shortestPath ?? [] : [];
    return (
      <div ref={citySceneRef} className="relative h-[270px] overflow-hidden rounded-2xl border border-white/10 bg-[#081324] p-6 story-scene-enter" data-scene-world={visualTheme}>
        <div className="absolute inset-0 opacity-35" style={{ backgroundImage: "linear-gradient(rgba(96,165,250,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,.22) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute left-6 top-5 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-100">{isBfs ? "Breadth-first city route" : isDijkstra ? "Dijkstra travel-time route" : isDfs ? "Depth-first city route" : "City map"}</div>
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {roads.map((road) => {
            const isActiveRoad = routeState?.activeRoad?.includes(road.from) && routeState?.activeRoad?.includes(road.to);
            const isShortestRoad = shortestPath.some((stop, index) => index > 0 && ((shortestPath[index - 1] === road.from && stop === road.to) || (shortestPath[index - 1] === road.to && stop === road.from)));
            const stroke = isShortestRoad ? "#fbbf24" : isActiveRoad ? (isDfs ? "#c084fc" : isDijkstra ? "#fbbf24" : "#7dd3fc") : "#4b83b8";
            return <g key={`${road.from}-${road.to}`}><line x1={road.x1} y1={road.y1} x2={road.x2} y2={road.y2} stroke={stroke} strokeWidth={isShortestRoad ? "2.3" : isActiveRoad ? "1.7" : "0.65"} strokeLinecap="round" opacity={isShortestRoad || isActiveRoad ? "1" : "0.48"} /><text x={(road.x1 + road.x2) / 2} y={(road.y1 + road.y2) / 2 - 2} textAnchor="middle" fill="#dbeafe" fontSize="4.3" fontWeight="700">{road.weight}m</text></g>;
          })}
        </svg>
        <div className="relative z-10 h-full">
          {cityStops.map((stop, index) => {
            const isCurrent = routeState?.currentStop === stop.name;
            const isVisited = routeState?.visitedStops.includes(stop.name);
            const isPathStop = (isDfs || isDijkstra) && routeState?.pathStops.includes(stop.name);
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
            const positionStyle = typeof stop.position === "string" ? { animationDelay: `${index * 60}ms` } : { left: `${stop.position.left}%`, top: `${stop.position.top}%`, transform: "translate(-50%, -50%)", animationDelay: `${index * 60}ms` };
            const canDrag = Boolean(onNodePositionChange && routeState?.graph);
            const StopIcon = stop.Icon;
            return <button key={stop.name} type="button" aria-label={canDrag ? `Drag ${stop.name} to rearrange the city map` : stop.name} data-draggable-city-node={canDrag ? stop.name : undefined} onPointerDown={(event) => { if (!canDrag) return; draggedStopRef.current = stop.name; moveCityStop(event, stop.name); }} onPointerMove={(event) => { if (draggedStopRef.current === stop.name) moveCityStop(event, stop.name); }} onPointerUp={() => { draggedStopRef.current = null; }} onPointerCancel={() => { draggedStopRef.current = null; }} onMouseDown={(event) => { if (!canDrag) return; event.preventDefault(); draggedStopRef.current = stop.name; moveCityStop(event, stop.name); }} className={`scene-object-pop absolute grid h-14 w-14 place-items-center rounded-full border text-center text-[9px] font-black ${typeof stop.position === "string" ? stop.position : ""} ${stateClasses} ${canDrag ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-default"}`} style={positionStyle}><StopIcon className="h-4 w-4" aria-hidden="true" /><span>{stop.name}</span>{canDrag && <GripVertical className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full bg-sky-100 p-0.5 text-sky-950" aria-hidden="true" />}{isTarget && <span className="absolute -left-1 -top-1 rounded-full bg-amber-300 px-1 text-[7px] font-black text-amber-950">TARGET</span>}{isVisited && !isCurrent && <CheckCircle2 className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-emerald-300 p-0.5 text-emerald-950" aria-label="Visited" />}</button>;
          })}
        </div>
        {routeState ? (
          <div className="absolute inset-x-4 bottom-3 z-20 rounded-xl border border-sky-300/20 bg-[#07101d]/95 px-3 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.32)]" data-route-state={routeState.algorithm} aria-label={`${isBfs ? "Breadth-first waiting line" : isDijkstra ? "Dijkstra travel-time list" : "Depth-first road stack"}: ${routeState.pendingStops.length ? routeState.pendingStops.join(", ") : "no stops waiting"}`} aria-live="polite">
            <div className="flex items-center justify-between gap-3"><p className="text-[9px] font-bold uppercase tracking-[0.13em] text-sky-200">{isBfs ? "Waiting line — next stop first" : isDijkstra ? "Travel-time list — lowest minutes first" : "Road stack — top road first"}</p><span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${routeState.phase === "backtrack" ? "bg-violet-300/20 text-violet-100" : isDijkstra ? "bg-amber-300/15 text-amber-100" : "bg-sky-300/15 text-sky-100"}`}>{routeState.phase}</span></div>
            <div className="mt-1.5 flex min-h-5 items-center gap-1.5 overflow-x-auto pb-0.5">{routeState.pendingStops.length ? routeState.pendingStops.map((stop, index) => <span key={`${stop}-${index}`} className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold ${isBfs && index === 0 ? "border-amber-200 bg-amber-300 text-amber-950" : isDijkstra && index === 0 ? "border-amber-200 bg-amber-300 text-amber-950" : isDfs && index === routeState.pendingStops.length - 1 ? "border-violet-200 bg-violet-300 text-violet-950" : "border-sky-300/25 bg-sky-300/10 text-sky-100"}`}>{stop}</span>) : <span className="text-[10px] text-[#a9c5e6]">No stops waiting</span>}</div>
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
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-emerald-100"><Footprints className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />Worker visits the highlighted box, then moves to the next one.</div>
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
        <div className="absolute bottom-10 left-[18%] flex flex-col items-center gap-2 text-emerald-100"><CornerDownLeft className="h-6 w-6" aria-hidden="true" /><span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-bold">YES: continue</span></div>
        <div className="absolute bottom-10 right-[18%] flex flex-col items-center gap-2 text-amber-100"><CornerDownRight className="h-6 w-6" aria-hidden="true" /><span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-bold">NO: try another way</span></div>
      </div>
    );
  }

  if (story.kind === "workshop") {
    return (
      <div className="relative flex h-[270px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#1b0d05] p-6 story-scene-enter" data-scene-world={visualTheme}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.18),transparent_60%)]" />
        <div className="relative z-10 w-full max-w-[450px] rounded-2xl border-2 border-orange-300/60 bg-[#29130a] p-5 shadow-[0_0_35px_rgba(249,115,22,0.35)]">
          <div className="flex items-center justify-between border-b border-orange-200/15 pb-3"><span className={label}>Recipe card</span><Wrench className="h-5 w-5 text-orange-200" aria-hidden="true" /></div>
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
          <div className="scene-delivery-pop relative grid h-36 w-44 place-items-center rounded-2xl border-4 border-amber-300 bg-amber-500/45 shadow-[0_0_42px_rgba(234,179,8,0.42)]"><PackageCheck className="h-14 w-14 text-amber-950" strokeWidth={1.75} aria-hidden="true" /><span className="absolute -right-4 -top-4 rounded-full bg-emerald-300 px-3 py-1 text-xs font-black text-emerald-950">READY</span></div>
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
        <div className="mt-4 rounded-xl border border-violet-300/35 bg-violet-300/10 p-4 text-center"><Lightbulb className="mx-auto h-10 w-10 text-violet-200" aria-hidden="true" /><p className="mt-2 text-sm font-bold text-violet-100">The computer focuses on one small instruction.</p></div>
        <div className="mt-4 flex items-center justify-between text-xs text-[#c5b9dc]"><span>Read</span><span>→</span><span>Understand</span><span>→</span><span>Do it</span></div>
      </div>
    </div>
  );
}

function ExecutionStatePanel({ step }: { step: LearningStep }) {
  const { story } = step;
  const executionState = step.executionState ?? { subject: story.objectLabel, action: story.title, change: story.whatChanged };
  return (
    <section className="execution-state-panel execution-state-enter mt-4" data-execution-state data-execution-state-origin={step.executionState ? "source" : "visual"} aria-label={`Execution state for line ${step.line}`}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-3">
        <div><p className="lab-kicker">Execution state</p><h2 className="mt-1 text-sm font-extrabold text-white">What this source line sets up</h2></div>
        <span className="rounded-full border border-indigo-300/25 bg-indigo-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-indigo-100">Line {step.line}</span>
      </header>
      <p className="execution-state-source mt-3" data-execution-state-source>From your code <code>{step.code.trim() || "Current source line"}</code></p>
      <div className="execution-state-grid mt-3">
        <div className="execution-state-card execution-state-object" data-execution-state-object>
          <p>In focus</p><strong><SceneKindIcon kind={story.kind} className="h-4 w-4 text-indigo-200" />{executionState.subject}</strong>
        </div>
        <div className="execution-state-card" data-execution-state-action>
          <p>Action</p><strong>{executionState.action}</strong>
        </div>
        <div className="execution-state-card execution-state-change sm:col-span-2" data-execution-state-change>
          <p>What this means</p><span>{executionState.change}</span>
        </div>
      </div>
    </section>
  );
}

function getDiagramArray(sourceLines: string[]) {
  const literalDeclaration = [...sourceLines].reverse().map((line) => line.match(/\b([A-Za-z_$][\w$]*)\s*=\s*(?:new\s+[A-Za-z_$][\w$]*(?:\[\])?\s*)?[\[{]([^\]}]*)[\]}]/)).find(Boolean);
  if (literalDeclaration) {
    const name = literalDeclaration[1];
    const cells = literalDeclaration[2].split(",").map((value) => value.trim()).filter(Boolean).slice(0, 8);
    if (cells.length) return { name, cells };
  }

  const sizedDeclaration = [...sourceLines].reverse().map((line) => line.match(/\b([A-Za-z_$][\w$]*)\s*=\s*new\s+Array\((\d+)\)/)).find(Boolean);
  if (sizedDeclaration) {
    const count = Math.min(Number(sizedDeclaration[2]), 8);
    if (Number.isFinite(count) && count > 0) return { name: sizedDeclaration[1], cells: Array.from({ length: count }, () => "empty") };
  }

  return null;
}

function getDiagramPointers(sourceLines: string[], cellCount: number) {
  const pointers = new Map<string, number>();
  for (const line of sourceLines) {
    for (const match of Array.from(line.matchAll(/\b(i|j|k|left|right|start|end|mid|index|pointer|current|next)\s*=\s*(-?\d+)/gi))) {
      const position = Number(match[2]);
      if (Number.isFinite(position) && position >= 0 && position < cellCount) pointers.set(match[1], position);
    }
  }
  return Array.from(pointers.entries()).map(([name, position]) => ({ name, position }));
}

function getTrackedVariables(sourceLines: string[], state: NonNullable<LearningStep["executionState"]>) {
  const variables = new Map<string, string>();
  for (const line of sourceLines) {
    for (const match of Array.from(line.matchAll(/\b(?:let|const|var|int|long|float|double|boolean|String)?\s*([A-Za-z_$][\w$]*)\s*=\s*([^;\n]+)/g))) {
      const name = match[1];
      const value = match[2].trim().replace(/[;,]$/, "");
      if (name && value && name !== "if" && name !== "for") variables.set(name, value.slice(0, 28));
    }
  }
  const rows = Array.from(variables.entries()).slice(-5).map(([name, value]) => ({ name, value }));
  return rows.length ? rows : [{ name: "Focus", value: state.subject }, { name: "Change", value: state.change }];
}

type ResultSceneVariant = "stack" | "network" | "route" | "branch" | "loop" | "build";

function getResultSceneSeed(value: string) {
  return Array.from(value).reduce((total, character, index) => (total + character.charCodeAt(0) * (index + 11)) % 997, 0);
}

function getResultScene(step: LearningStep, state: NonNullable<LearningStep["executionState"]>) {
  const seed = getResultSceneSeed(`${step.code}|${state.subject}|${state.change}`);
  const sourceSpecificVariants: ResultSceneVariant[] = ["stack", "network", "route", "branch", "loop", "build"];
  const variantByKind: Partial<Record<RealWorldStory["kind"], ResultSceneVariant>> = {
    "storage-shelf": "stack",
    "sorting-tray": "stack",
    "linked-chain": "network",
    "family-tree": "network",
    "city-map": "route",
    "delivery-desk": "route",
    "decision-gate": "branch",
    "conveyor-loop": "loop",
    "recursion-stairs": "loop",
    "workshop": "build",
  };
  const variant = variantByKind[step.story.kind] ?? sourceSpecificVariants[seed % sourceSpecificVariants.length]!;
  const labelByVariant: Record<ResultSceneVariant, string> = {
    stack: "stacked state",
    network: "connected result",
    route: "completed route",
    branch: "chosen path",
    loop: "repeat cycle",
    build: "built result",
  };
  return { variant, seed: seed % 3, label: labelByVariant[variant] };
}

function ResultStageSculpture({ variant, tone }: { variant: ResultSceneVariant; tone: number }) {
  const shared = { className: `simple-2d-stage-result-sculpture result-scene-${variant} result-scene-tone-${tone}`, "data-result-scene-object": variant };
  if (variant === "stack") return <g {...shared}><path className="result-sculpture-top" d="M748 158 782 137 816 158 782 179Z" /><path className="result-sculpture-left" d="M748 158v28l34 21v-27Z" /><path className="result-sculpture-right" d="M816 158v28l-34 21v-27Z" /><path className="result-sculpture-top result-sculpture-top-secondary" d="M800 137 830 118 860 137 830 156Z" /><path className="result-sculpture-left result-sculpture-left-secondary" d="M800 137v24l30 18v-23Z" /><path className="result-sculpture-right result-sculpture-right-secondary" d="M860 137v24l-30 18v-23Z" /></g>;
  if (variant === "network") return <g {...shared}><path className="result-sculpture-link" d="M757 171 794 134 840 163M794 134l41-29" /><circle className="result-sculpture-orb" cx="757" cy="171" r="13" /><circle className="result-sculpture-orb" cx="794" cy="134" r="16" /><circle className="result-sculpture-orb" cx="840" cy="163" r="14" /><circle className="result-sculpture-orb result-sculpture-orb-top" cx="835" cy="105" r="12" /></g>;
  if (variant === "route") return <g {...shared}><path className="result-sculpture-route" d="M748 176c31-58 64 35 96-44 12-30 30-31 43-10" /><path className="result-sculpture-marker" d="M766 132c0-12 20-12 20 0 0 10-10 19-10 19s-10-9-10-19Z" /><circle cx="776" cy="132" r="3" className="result-sculpture-marker-dot" /><path className="result-sculpture-marker result-sculpture-marker-end" d="M856 115c0-12 20-12 20 0 0 10-10 19-10 19s-10-9-10-19Z" /><circle cx="866" cy="115" r="3" className="result-sculpture-marker-dot" /></g>;
  if (variant === "branch") return <g {...shared}><path className="result-sculpture-gate-top" d="M782 113 822 137 782 161 742 137Z" /><path className="result-sculpture-gate-left" d="M742 137v30l40 24v-30Z" /><path className="result-sculpture-gate-right" d="M822 137v30l-40 24v-30Z" /><path className="result-sculpture-branch" d="m782 174-41 24M782 174l47 20" /><circle className="result-sculpture-orb" cx="737" cy="200" r="8" /><circle className="result-sculpture-orb" cx="833" cy="196" r="8" /></g>;
  if (variant === "loop") return <g {...shared}><ellipse className="result-sculpture-loop" cx="803" cy="151" rx="58" ry="24" /><ellipse className="result-sculpture-loop result-sculpture-loop-back" cx="803" cy="151" rx="37" ry="14" /><path className="result-sculpture-loop-arrow" d="m849 139 12 12-16 5" /><path className="result-sculpture-pillar" d="M791 131v-31l12-8 12 8v31" /></g>;
  return <g {...shared}><path className="result-sculpture-top" d="M756 164 790 143 824 164 790 185Z" /><path className="result-sculpture-left" d="M756 164v30l34 20v-29Z" /><path className="result-sculpture-right" d="M824 164v30l-34 20v-29Z" /><path className="result-sculpture-beam" d="M790 143v-45M772 109l18-11 18 11M772 109v22M808 109v22" /><path className="result-sculpture-spark" d="m847 108 5 9 10 4-10 5-5 10-5-10-10-5 10-4Z" /></g>;
}

function Simple2DVisualPanel({ step, previousStep, sourceLines, showBefore, showThreeResult }: { step: LearningStep; previousStep?: LearningStep; sourceLines: string[]; showBefore: boolean; showThreeResult: boolean }) {
  const [selectedStageNode, setSelectedStageNode] = useState<"object" | "action" | "result">("result");
  const shownStep = showBefore && previousStep ? previousStep : step;
  const state = shownStep.executionState ?? {
    subject: shownStep.story.objectLabel,
    action: shownStep.story.title,
    change: shownStep.story.whatChanged,
  };
  const shownLines = showBefore && previousStep ? sourceLines.slice(0, -1) : sourceLines;
  const array = getDiagramArray(shownLines);
  const pointers = array ? getDiagramPointers(shownLines, array.cells.length) : [];
  const variables = getTrackedVariables(shownLines, state);
  const resultScene = getResultScene(shownStep, state);

  return (
    <section className="simple-2d-diagram" data-primary-2d-scene data-state-view={showBefore ? "before" : "after"} aria-label={`2D visual for line ${shownStep.line}`}>
      <div className="simple-2d-context"><span>{showBefore ? "Before" : "After"} · Line {shownStep.line}</span><code>{shownStep.code.trim() || "Current source line"}</code></div>
      <div className="simple-2d-visual-stage" data-react-svg-stage data-dimensional-svg-stage="isometric" data-svg-icon-system="story-glyphs" data-selected-stage-node={selectedStageNode} data-result-scene={resultScene.variant}>
        <svg className="simple-2d-stage-svg" viewBox="0 0 960 248" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="story-stage-flow" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#38bdf8" /><stop offset="50%" stopColor="#a78bfa" /><stop offset="100%" stopColor="#fbbf24" /></linearGradient>
            <radialGradient id="story-stage-glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#67e8f9" stopOpacity="0.34" /><stop offset="100%" stopColor="#0f172a" stopOpacity="0" /></radialGradient>
            <linearGradient id="story-stage-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" /><stop offset="100%" stopColor="#dbeafe" stopOpacity="0.16" /></linearGradient>
            <linearGradient id="story-stage-prism" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" /><stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.05" /></linearGradient>
            <filter id="story-stage-shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#312e81" floodOpacity="0.22" /></filter>
            <filter id="story-stage-blur"><feGaussianBlur stdDeviation="10" /></filter>
          </defs>
          <rect width="960" height="248" rx="28" fill="url(#story-stage-glow)" />
          <path className="simple-2d-stage-floor" d="M66 184 480 75 894 184 480 239Z" fill="url(#story-stage-floor)" />
          <path className="simple-2d-stage-floor-grid" d="M134 184 480 91 826 184M207 203 480 129 753 203M480 76v160M322 117v101M638 117v101" />
          <g className="simple-2d-stage-data-cubes" aria-hidden="true">
            <path d="M230 112 242 105 254 112 242 119Z" /><path d="M230 112v11l12 7v-11ZM254 112v11l-12 7v-11Z" />
            <path d="M674 160 686 153 698 160 686 167Z" /><path d="M674 160v11l12 7v-11ZM698 160v11l-12 7v-11Z" />
            <path d="M707 96 717 90 727 96 717 102Z" /><path d="M707 96v9l10 6v-9ZM727 96v9l-10 6v-9Z" />
          </g>
          <g className="simple-2d-stage-prisms" filter="url(#story-stage-shadow)">
            <g className="simple-2d-stage-prism simple-2d-stage-prism-object"><path d="M117 158 146 139 175 158 146 177Z" /><path d="M117 158v20l29 19v-20ZM175 158v20l-29 19v-20Z" /></g>
            <g className="simple-2d-stage-prism simple-2d-stage-prism-action"><path d="M451 139 480 120 509 139 480 158Z" /><path d="M451 139v20l29 19v-20ZM509 139v20l-29 19v-20Z" /></g>
            <g className="simple-2d-stage-result-platform" data-result-depth-platform={resultScene.variant}><path d="M730 188 806 143 882 188 806 232Z" /><path d="M730 188v17l76 45v-18ZM882 188v17l-76 45v-18Z" /></g>
            <ResultStageSculpture variant={resultScene.variant} tone={resultScene.seed} />
          </g>
          <g className="simple-2d-stage-orbits"><ellipse cx="480" cy="124" rx="402" ry="86" /><ellipse cx="480" cy="124" rx="290" ry="52" /></g>
          <path className="simple-2d-stage-flow-path" d="M 146 124 C 270 36, 376 36, 480 124 S 690 212, 814 124" />
          <path className="simple-2d-stage-flow-trail" d="M 146 124 C 270 36, 376 36, 480 124 S 690 212, 814 124" />
          <g className="simple-2d-stage-sparks" filter="url(#story-stage-blur)"><circle cx="154" cy="122" r="18" /><circle cx="480" cy="124" r="24" /><circle cx="806" cy="126" r="19" /></g>
          <g className="simple-2d-stage-particles"><circle cx="224" cy="66" r="4" /><circle cx="336" cy="190" r="3" /><circle cx="615" cy="56" r="4" /><circle cx="720" cy="188" r="3" /></g>
        </svg>
        <div className="simple-2d-flow">
        <button type="button" onClick={() => setSelectedStageNode("object")} className={`simple-2d-node simple-2d-subject ${selectedStageNode === "object" ? "is-selected" : ""}`} data-stage-node="object" aria-pressed={selectedStageNode === "object"}>
          <span className="simple-2d-node-label">Object</span>
          <div><StageRoleGlyph role="object" kind={shownStep.story.kind} /><strong>{state.subject}</strong></div>
          <span className="simple-2d-node-hint">Click to focus</span>
        </button>
        <span className="simple-2d-arrow" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16h20" /><path d="m17 8 8 8-8 8" /></svg></span>
        <button type="button" onClick={() => setSelectedStageNode("action")} className={`simple-2d-node simple-2d-action ${selectedStageNode === "action" ? "is-selected" : ""}`} data-stage-node="action" aria-pressed={selectedStageNode === "action"}>
          <span className="simple-2d-node-label">Action</span>
          <div><StageRoleGlyph role="action" kind={shownStep.story.kind} /><strong>{state.action}</strong></div>
          <span className="simple-2d-node-hint">Click to focus</span>
        </button>
        <span className="simple-2d-arrow" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16h20" /><path d="m17 8 8 8-8 8" /></svg></span>
        <button type="button" onClick={() => setSelectedStageNode("result")} className={`simple-2d-node simple-2d-result ${selectedStageNode === "result" ? "is-selected" : ""}`} data-stage-node="result" aria-pressed={selectedStageNode === "result"}>
          <span className="simple-2d-node-label">Result · {resultScene.label}</span>
          <div><StageRoleGlyph role="result" kind={shownStep.story.kind} /><strong>{state.change}</strong></div>
          <span className="simple-2d-node-hint">Click to focus</span>
        </button>
        </div>
        <p className="simple-2d-stage-status" aria-live="polite"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />{selectedStageNode === "object" ? `Focus: ${state.subject}` : selectedStageNode === "action" ? `Action: ${state.action}` : `Result: ${state.change}`}</p>
      </div>
      {showThreeResult ? <React.Suspense fallback={<div className="three-result-loading" data-three-result-loading>Loading the interactive 3D result…</div>}><CodeResultThreeScene subject={state.subject} action={state.action} result={state.change} variant={resultScene.variant} /></React.Suspense> : null}
      <div className="simple-state-details">
        <section className="simple-array-panel" data-array-cells aria-label="Array cells">
          <div className="simple-state-section-heading"><span>Array cells</span><small>{array ? array.name : "No array on this step"}</small></div>
          {array ? <><div className="simple-array-cells">{array.cells.map((value, index) => <div key={`${array.name}-${index}-${value}`} className="simple-array-cell"><small>{index}</small><strong>{value}</strong></div>)}</div>{pointers.length ? <div className="simple-pointer-track" data-pointer-arrows aria-label="Pointer positions">{pointers.map((pointer) => <span key={`${pointer.name}-${pointer.position}`} className="simple-pointer" style={{ left: `${((pointer.position + 0.5) / array.cells.length) * 100}%` }}><b>↓</b>{pointer.name}</span>)}</div> : <p className="simple-state-empty">No index pointer moves on this line.</p>}</> : <p className="simple-state-empty">Array cells appear when this code creates or changes a list.</p>}
        </section>
        <section className="simple-variable-panel" data-variable-table aria-label="Tracked variable values">
          <div className="simple-state-section-heading"><span>Tracked values</span><small>Current state</small></div>
          <table><thead><tr><th scope="col">Name</th><th scope="col">Value</th></tr></thead><tbody>{variables.map((variable) => <tr key={`${variable.name}-${variable.value}`}><th scope="row">{variable.name}</th><td>{variable.value}</td></tr>)}</tbody></table>
        </section>
      </div>
      <p className="simple-2d-caption">Follow the arrows: the code picks an object, performs one action, then changes its state.</p>
    </section>
  );
}

function CinematicScenePanel({ scene, status, depthEnabled, motionEnabled, isFocused, onToggleDepth, onToggleMotion, onToggleFocus }: { scene?: CinematicScene; status?: CinematicSceneStatus; depthEnabled: boolean; motionEnabled: boolean; isFocused: boolean; onToggleDepth: () => void; onToggleMotion: () => void; onToggleFocus: () => void }) {
  const touchCameraRef = useRef<{ pointerId: number; startX: number; startY: number; startRotateX: number; startRotateY: number } | null>(null);
  const setCameraRotation = (element: HTMLElement, rotateX: number, rotateY: number) => {
    element.style.setProperty("--cinematic-rotate-x", `${Math.max(-12, Math.min(12, rotateX)).toFixed(2)}deg`);
    element.style.setProperty("--cinematic-rotate-y", `${Math.max(-15, Math.min(15, rotateY)).toFixed(2)}deg`);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!depthEnabled || !motionEnabled || !scene || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (event.pointerType === "touch") {
      const touchCamera = touchCameraRef.current;
      if (!isFocused || !touchCamera || touchCamera.pointerId !== event.pointerId) return;
      const dragX = event.clientX - touchCamera.startX;
      const dragY = event.clientY - touchCamera.startY;
      setCameraRotation(event.currentTarget, touchCamera.startRotateX - dragY * 0.12, touchCamera.startRotateY + dragX * 0.14);
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const rotateX = ((event.clientY - bounds.top) / bounds.height - 0.5) * -4;
    const rotateY = ((event.clientX - bounds.left) / bounds.width - 0.5) * 5;
    setCameraRotation(event.currentTarget, rotateX, rotateY);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "touch" || !isFocused || !depthEnabled || !motionEnabled || !scene || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!(event.target instanceof Element) || !event.target.closest("[data-cinematic-art]")) return;
    const styles = window.getComputedStyle(event.currentTarget);
    touchCameraRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRotateX: Number.parseFloat(styles.getPropertyValue("--cinematic-rotate-x")) || 0,
      startRotateY: Number.parseFloat(styles.getPropertyValue("--cinematic-rotate-y")) || 0,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some assistive and synthetic pointer events do not have a capturable pointer.
    }
  };

  const completeTouchCamera = (event: React.PointerEvent<HTMLElement>) => {
    if (touchCameraRef.current?.pointerId !== event.pointerId) return;
    touchCameraRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const resetPointerDepth = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "touch") setCameraRotation(event.currentTarget, 0, 0);
  };

  const resetTouchCamera = (event: React.MouseEvent<HTMLButtonElement>) => {
    const panel = event.currentTarget.closest<HTMLElement>("[data-cinematic-scene]");
    if (panel) setCameraRotation(panel, 0, 0);
  };

  return (
    <section className={`cinematic-panel relative overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#071523] p-3 shadow-[0_16px_35px_rgba(0,0,0,0.23)] ${depthEnabled ? "cinematic-panel-depth" : "cinematic-panel-flat"} ${motionEnabled ? "cinematic-panel-motion" : "cinematic-panel-still"} ${isFocused ? "cinematic-panel-focus" : ""}`} data-cinematic-scene data-cinematic-depth={depthEnabled ? "on" : "off"} data-cinematic-motion={motionEnabled ? "on" : "off"} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={completeTouchCamera} onPointerCancel={completeTouchCamera} onPointerLeave={resetPointerDepth} role={isFocused ? "dialog" : undefined} aria-modal={isFocused || undefined} aria-label={isFocused ? "Focused cinematic scene" : undefined}>
      <div className="cinematic-panel-header mb-2 flex items-center justify-between gap-3 px-1">
        <div className="cinematic-panel-title flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-100"><Sparkles className="h-3.5 w-3.5" /></span><div><p className="text-[9px] font-black uppercase tracking-[0.15em] text-cyan-100">Cinematic layer</p><p className="text-[10px] text-[#9bb4ca]">Python-rendered scene</p></div></div>
        <div className="cinematic-panel-actions flex items-center gap-1.5"><button type="button" className="cinematic-panel-control" onClick={onToggleDepth} aria-pressed={depthEnabled} data-cinematic-depth-toggle><span className="cinematic-control-long">{depthEnabled ? "Depth on" : "Depth off"}</span><span className="cinematic-control-short" aria-hidden="true">{depthEnabled ? "3D on" : "3D off"}</span></button><button type="button" className="cinematic-panel-control" onClick={onToggleMotion} aria-pressed={motionEnabled} data-cinematic-motion-toggle><span className="cinematic-control-long">{motionEnabled ? "Motion on" : "Motion off"}</span><span className="cinematic-control-short" aria-hidden="true">{motionEnabled ? "Move on" : "Still"}</span></button><button type="button" className="cinematic-panel-control" onClick={onToggleFocus} aria-pressed={isFocused} data-cinematic-focus-toggle><span className="cinematic-control-long">{isFocused ? "Close focus" : "Focus view"}</span><span className="cinematic-control-short" aria-hidden="true">{isFocused ? "Close" : "Focus"}</span></button>{isFocused ? <button type="button" className="cinematic-panel-control" onClick={resetTouchCamera} disabled={!depthEnabled || !motionEnabled} data-cinematic-camera-reset>Reset camera</button> : null}<span className={`cinematic-panel-status rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${scene ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" : status === "failed" ? "border-white/10 bg-white/5 text-[#b9c4d4]" : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"}`}>{scene ? "Ready" : status === "failed" ? "Optional" : "Rendering"}</span></div>
      </div>
      {scene ? (
        <figure className="cinematic-art-frame overflow-hidden rounded-xl border border-white/10 bg-[#06111e]" aria-label={scene.caption}>
          <div data-cinematic-art className="aspect-video w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: scene.svg }} />
          <figcaption className="border-t border-white/10 bg-[#091a2c] px-3 py-2 text-[10px] leading-4 text-[#b9cedf]">{scene.caption}</figcaption>
        </figure>
      ) : status === "failed" ? (
        <div className="grid aspect-video place-items-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 text-center"><div><p className="text-xs font-bold text-[#d7e5f3]">Your interactive scene is still ready.</p><p className="mt-1 text-[10px] leading-4 text-[#93a9bd]">The optional cinematic illustration could not load for this step, so playback continues normally.</p></div></div>
      ) : (
        <div className="grid aspect-video place-items-center rounded-xl border border-cyan-300/10 bg-[radial-gradient(circle_at_center,rgba(103,232,249,0.12),transparent_55%)] px-6 text-center" aria-live="polite"><div><Sparkles className="mx-auto h-5 w-5 animate-pulse text-cyan-200" /><p className="mt-3 text-xs font-bold text-[#ddf6ff]">Drawing a richer real-world scene…</p><p className="mt-1 text-[10px] leading-4 text-[#9bb4ca]">You can keep reading and moving through the story.</p></div></div>
      )}
    </section>
  );
}

export default function Home() {
  const { theme, preference, setPreference } = useTheme();
  const saveSubmission = trpc.submissions.save.useMutation({
    onSuccess: () => toast.success("Your code session has been saved."),
    onError: () => toast.error("Your visual still works, but this session could not be saved."),
  });
  const interpretStory = trpc.stories.interpret.useMutation();
  const cinematicScene = trpc.stories.cinematicScene.useMutation();
  const aiVisual = trpc.stories.aiVisual.useMutation();
  const [activeView, setActiveView] = useState<"landing" | "studio" | "comparison">("landing");
  const [landingWorkspace, setLandingWorkspace] = useState<LearningWorkspace>(getInitialLearningWorkspace);
  const [selectedLang, setSelectedLang] = useState<Language>("javascript");
  const [userProblem, setUserProblem] = useState("Find an apple in a basket");
  const [userCode, setUserCode] = useState(defaultCode);
  const [selectedWalkthrough, setSelectedWalkthrough] = useState<CityRouteAlgorithm | null>(null);
  const [steps, setSteps] = useState<LearningStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showBeforeState, setShowBeforeState] = useState(false);
  const [showThreeResult, setShowThreeResult] = useState(false);
  const [currentStructure, setCurrentStructure] = useState<CodeStructureSummary | null>(null);
  const [exploredStepIndexes, setExploredStepIndexes] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(2200);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mandalaAccent, setMandalaAccent] = useState(() => {
    if (typeof window === "undefined") return "#7c3aed";
    const saved = window.localStorage.getItem("code-story-studio:mandala-accent");
    return saved && /^#[0-9a-f]{6}$/i.test(saved) ? saved : "#7c3aed";
  });
  const [mandalaIntensity, setMandalaIntensity] = useState<MandalaIntensity>(() => {
    if (typeof window === "undefined") return "bright";
    const saved = window.localStorage.getItem("code-story-studio:mandala-intensity");
    return saved === "calm" || saved === "festival" || saved === "bright" ? saved : "bright";
  });
  const [mandalaSoundsEnabled, setMandalaSoundsEnabled] = useState(() => typeof window === "undefined" ? false : window.localStorage.getItem("code-story-studio:mandala-sounds") === "on");
  const [visualTheme, setVisualTheme] = useState<VisualTheme>(() => {
    if (typeof window === "undefined") return "mandala";
    try {
      const mandalaRolloutKey = "code-story-studio:mandala-rollout";
      const savedTheme = getSavedVisualTheme(window.localStorage);
      if (savedTheme === "high-contrast") return savedTheme;
      if (!window.localStorage.getItem(mandalaRolloutKey)) {
        window.localStorage.setItem(mandalaRolloutKey, "1");
        return "mandala";
      }
      return savedTheme ?? "mandala";
    } catch {
      return "mandala";
    }
  });
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [customGraphText, setCustomGraphText] = useState(customCityGraphExample);
  const [customStartStop, setCustomStartStop] = useState("Cafe");
  const [customTargetStop, setCustomTargetStop] = useState("Restaurant");
  const [comparisonRun, setComparisonRun] = useState<CityComparisonRun | null>(null);
  const [comparisonStepIndex, setComparisonStepIndex] = useState(0);
  const [comparisonPlaying, setComparisonPlaying] = useState(false);
  const [comparisonNodePositions, setComparisonNodePositions] = useState<Record<string, CityNodePosition>>({});
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>(() => typeof window === "undefined" ? { ...defaultOnboardingStatus } : readOnboardingStatus(window.localStorage));
  const [onboardingWorkspace, setOnboardingWorkspace] = useState<OnboardingWorkspace | null>(null);
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);
  const [interpreterProgressIndex, setInterpreterProgressIndex] = useState(0);
  const [cinematicScenes, setCinematicScenes] = useState<Record<string, CinematicScene>>({});
  const [cinematicSceneStatus, setCinematicSceneStatus] = useState<Record<string, CinematicSceneStatus>>({});
  const [aiVisuals, setAIVisuals] = useState<Record<string, AIVisual>>({});
  const [aiVisualStatus, setAIVisualStatus] = useState<Record<string, AIVisualStatus>>({});
  const [cinematicDepthEnabled, setCinematicDepthEnabled] = useState(true);
  const [cinematicMotionEnabled, setCinematicMotionEnabled] = useState(() => typeof window === "undefined" ? true : window.localStorage.getItem("code-story-studio:cinematic-motion") !== "off");
  const [cinematicFocused, setCinematicFocused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const mandalaSoundTimeRef = useRef(0);
  const cinematicRequestKeysRef = useRef(new Set<string>());
  const currentStep = steps[currentStepIndex];
  const currentCinematicKey = currentStep ? getCinematicSceneKey(currentStep) : "";
  const currentAIVisualKey = currentStep ? getAIVisualKey(currentStep, visualTheme) : "";
  const activeTheme = getVisualTheme(visualTheme);
  const learningScore = getStoryLearningScore(steps.length, exploredStepIndexes);
  const customGraphStops = (() => {
    try { return parseCityGraph(customGraphText).stops; } catch { return []; }
  })();
  const comparisonLength = comparisonRun ? Math.max(comparisonRun.bfs.length, comparisonRun.dfs.length, comparisonRun.dijkstra.length) : 0;
  const comparisonBfsState = comparisonRun?.bfs[Math.min(comparisonStepIndex, Math.max(comparisonRun.bfs.length - 1, 0))];
  const comparisonDfsState = comparisonRun?.dfs[Math.min(comparisonStepIndex, Math.max(comparisonRun.dfs.length - 1, 0))];
  const comparisonDijkstraState = comparisonRun?.dijkstra[Math.min(comparisonStepIndex, Math.max(comparisonRun.dijkstra.length - 1, 0))];
  const comparisonNarration = comparisonBfsState && comparisonDfsState && comparisonDijkstraState ? getCityLiveNarration({ bfs: comparisonBfsState, dfs: comparisonDfsState, dijkstra: comparisonDijkstraState }) : null;

  useEffect(() => {
    if (typeof window !== "undefined") saveVisualTheme(visualTheme, window.localStorage);
  }, [visualTheme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("code-story-studio:mandala-accent", mandalaAccent);
    window.localStorage.setItem("code-story-studio:mandala-intensity", mandalaIntensity);
    window.localStorage.setItem("code-story-studio:mandala-sounds", mandalaSoundsEnabled ? "on" : "off");
  }, [mandalaAccent, mandalaIntensity, mandalaSoundsEnabled]);

  useEffect(() => {
    if (activeView !== "studio" || !steps.length) return;
    setExploredStepIndexes((existing) => existing.includes(currentStepIndex) ? existing : [...existing, currentStepIndex]);
  }, [activeView, currentStepIndex, steps.length]);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("code-story-studio:cinematic-motion", cinematicMotionEnabled ? "on" : "off");
  }, [cinematicMotionEnabled]);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("code-story-studio:onboarding-v1", JSON.stringify(onboardingStatus));
  }, [onboardingStatus]);

  useEffect(() => {
    if (activeView !== "landing") return;
    const pendingWorkspace = getPendingOnboardingWorkspace(landingWorkspace, onboardingStatus, onboardingWorkspace);
    if (!pendingWorkspace) return;
    setOnboardingWorkspace(pendingWorkspace);
    setOnboardingStepIndex(0);
  }, [activeView, landingWorkspace, onboardingStatus, onboardingWorkspace]);

  useEffect(() => {
    if (!interpretStory.isPending) {
      setInterpreterProgressIndex(0);
      return;
    }

    const progressTimer = window.setInterval(() => {
      setInterpreterProgressIndex((current) => Math.min(current + 1, interpreterProgressMessages.length - 1));
    }, 2800);
    return () => window.clearInterval(progressTimer);
  }, [interpretStory.isPending]);

  const openLearningWorkspace = (workspace: OnboardingWorkspace) => {
    setActiveView("landing");
    setLandingWorkspace(getLearningWorkspace(workspace === "code" ? "open-code" : "open-algorithms"));
    if (!onboardingStatus[workspace]) {
      setOnboardingWorkspace(workspace);
      setOnboardingStepIndex(0);
    }
  };

  const finishOnboarding = (workspace: OnboardingWorkspace) => {
    const completedTour = finishOnboardingTour(onboardingStatus, workspace);
    setOnboardingStatus(completedTour.status);
    setOnboardingWorkspace(completedTour.workspace);
    setOnboardingStepIndex(completedTour.stepIndex);
  };

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

  const playMandalaInteractionSound = (kind: "accent" | "intensity" | "step") => {
    if (!soundEnabled || !mandalaSoundsEnabled || visualTheme !== "mandala" || typeof window === "undefined") return;
    const now = window.performance.now();
    if (now - mandalaSoundTimeRef.current < 110) return;
    mandalaSoundTimeRef.current = now;
    try {
      audioRef.current ??= new AudioContext();
      const audio = audioRef.current;
      const tones = kind === "accent" ? [523.25, 659.25] : kind === "intensity" ? [392, 587.33] : [440, 523.25];
      const duration = kind === "step" ? 0.09 : 0.14;
      void audio.resume();
      tones.forEach((tone, index) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = index === 0 ? "sine" : "triangle";
        oscillator.frequency.setValueAtTime(tone, audio.currentTime + index * 0.025);
        gain.gain.setValueAtTime(0.0001, audio.currentTime + index * 0.025);
        gain.gain.exponentialRampToValueAtTime(0.028, audio.currentTime + index * 0.025 + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration + index * 0.025);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(audio.currentTime + index * 0.025);
        oscillator.stop(audio.currentTime + duration + index * 0.025 + 0.015);
      });
    } catch {
      // Optional chimes must never block learning when browser audio is unavailable.
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

  const startVisualStory = async () => {
    if (!userCode.trim()) {
      toast.error("Please paste or write some code first.");
      return;
    }
    let generatedSteps: LearningStep[];

    if (selectedWalkthrough) {
      generatedSteps = buildSteps(userCode, selectedWalkthrough);
      setCurrentStructure(null);
    } else {
      try {
        const apiStory = await interpretStory.mutateAsync({
          code: userCode,
          language: selectedLang,
          problemTitle: userProblem.trim() || undefined,
        });
        const sourceLines = userCode.split("\n");
        generatedSteps = apiStory.steps.map((story, index) => ({
          step: index + 1,
          line: story.lineNumber,
          code: sourceLines[story.lineNumber - 1] ?? "",
          story,
          executionState: story.executionState,
        }));
        setCurrentStructure(apiStory.structure);
        if (apiStory.source === "fallback") {
          toast.info("We opened a clear visual guide while the code-specific interpreter is unavailable. You can try again anytime.");
        }
      } catch {
        generatedSteps = buildSteps(userCode);
        setCurrentStructure(null);
        toast.warning("The code interpreter is busy, so we opened a simple visual guide. Try creating the story again for code-specific scenes.");
      }
    }

    cinematicRequestKeysRef.current.clear();
    setCinematicScenes({});
    setCinematicSceneStatus({});
    setSteps(generatedSteps);
    setCurrentStepIndex(0);
    setShowThreeResult(false);
    setExploredStepIndexes([]);
    setIsPlaying(false);
    setCinematicFocused(false);
    setActiveView("studio");
    playActionSound(generatedSteps[0]?.story);
    saveSubmission.mutate({ problemTitle: userProblem || "Untitled code story", language: selectedLang, code: userCode });
    toast.success(selectedWalkthrough ? "Your route walkthrough is ready." : "Your code now has a visual story made from its own instructions.");
  };

  const createAIVisualForCurrentStep = async () => {
    if (!currentStep || !currentAIVisualKey) return;
    if (aiVisuals[currentAIVisualKey]?.imageUrl) return;
    setAIVisualStatus((existing) => ({ ...existing, [currentAIVisualKey]: "loading" }));
    try {
      const result = await aiVisual.mutateAsync({
        kind: currentStep.story.kind,
        title: currentStep.story.title,
        plainEnglish: currentStep.story.plainEnglish,
        visualFocus: currentStep.story.visualFocus ?? currentStep.story.plainEnglish,
        codeLine: currentStep.code,
        lineNumber: currentStep.line,
        theme: visualTheme,
      });
      setAIVisuals((existing) => ({ ...existing, [currentAIVisualKey]: result }));
      if (result.imageUrl) {
        setAIVisualStatus((existing) => ({ ...existing, [currentAIVisualKey]: "ready" }));
        toast.success("Your AI visual is ready for this story step.");
      } else {
        setAIVisualStatus((existing) => ({ ...existing, [currentAIVisualKey]: "fallback" }));
        toast.info(result.message ?? "AI visuals are temporarily unavailable — using the interactive 3D scene instead.");
      }
    } catch {
      setAIVisuals((existing) => ({
        ...existing,
        [currentAIVisualKey]: {
          imageUrl: null,
          prompt: "",
          provider: "built-in-image",
          fallbackReason: "temporarily_unavailable",
          message: "AI visuals are temporarily unavailable — using the interactive 3D scene instead.",
        },
      }));
      setAIVisualStatus((existing) => ({ ...existing, [currentAIVisualKey]: "fallback" }));
      toast.info("AI visuals are temporarily unavailable — using the interactive 3D scene instead.");
    }
  };

  const startCityComparison = (sharedScenario?: SharedGraphScenario) => {
    try {
      const graphText = sharedScenario?.graphText ?? customGraphText;
      const startStop = sharedScenario?.startStop ?? customStartStop;
      const targetStop = sharedScenario?.targetStop ?? customTargetStop;
      const parsed = parseCityGraph(graphText);
      if (!parsed.stops.includes(startStop) || !parsed.stops.includes(targetStop)) throw new Error("Choose a start and target stop from your map.");
      if (startStop === targetStop) throw new Error("Choose two different stops so the route has somewhere to go.");
      const bfs = createCityRouteWalkthrough(parsed.graph, "bfs", startStop, targetStop).map((state) => ({ ...state, weightedGraph: parsed.weightedGraph }));
      const dfs = createCityRouteWalkthrough(parsed.graph, "dfs", startStop, targetStop).map((state) => ({ ...state, weightedGraph: parsed.weightedGraph }));
      const dijkstra = createDijkstraRouteWalkthrough(parsed.weightedGraph, startStop, targetStop);
      const generatedCode = createCustomCityCode(parsed.weightedGraph, startStop, targetStop);
      setCustomGraphText(graphText);
      setCustomStartStop(startStop);
      setCustomTargetStop(targetStop);
      setUserCode(generatedCode);
      setUserProblem(`Compare three ways to travel from ${startStop} to ${targetStop}`);
      setSelectedLang("python");
      setSelectedWalkthrough(null);
      setComparisonRun({ graph: parsed.graph, weightedGraph: parsed.weightedGraph, stops: parsed.stops, startStop, targetStop, bfs, dfs, dijkstra });
      setComparisonNodePositions(sharedScenario?.nodePositions ?? getCityGraphPositions(parsed.stops));
      setComparisonStepIndex(0);
      setComparisonPlaying(false);
      setActiveView("comparison");
      saveSubmission.mutate({ problemTitle: `City Map: ${startStop} to ${targetStop}`, language: "python", code: generatedCode });
      toast.success("Your custom City Map is ready for a BFS, DFS, and Dijkstra race.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Please check the City Map details.");
    }
  };

  const shareCurrentComparison = async () => {
    if (!comparisonRun) return;
    const query = serializeGraphScenario({ version: 1, graphText: customGraphText, startStop: comparisonRun.startStop, targetStop: comparisonRun.targetStop, nodePositions: comparisonNodePositions });
    const shareUrl = `${window.location.origin}${window.location.pathname}?${query}`;
    if (shareUrl.length > 8_000) {
      toast.error("This map is too large for a share link. Try fewer city stops or roads.");
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied. It will reopen this City Map exactly as arranged.");
    } catch {
      window.prompt("Copy your share link", shareUrl);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  };

  const getCurrentCityMapExport = () => {
    if (!comparisonRun) return null;
    return createCityMapExportData({
      graphText: customGraphText,
      startStop: comparisonRun.startStop,
      targetStop: comparisonRun.targetStop,
      stops: comparisonRun.stops,
      weightedGraph: comparisonRun.weightedGraph,
      nodePositions: comparisonNodePositions,
      algorithmOutcomes: {
        bfsPath: comparisonRun.bfs.at(-1)?.shortestPath ?? null,
        dfsPath: comparisonRun.dfs.at(-1)?.shortestPath ?? null,
        dijkstraPath: comparisonRun.dijkstra.at(-1)?.shortestPath ?? null,
        dijkstraTravelMinutes: comparisonRun.dijkstra.at(-1)?.shortestTravelTime ?? null,
      },
    });
  };

  const downloadCityMapJson = () => {
    const exportData = getCurrentCityMapExport();
    if (!exportData || !comparisonRun) return;
    const fileBase = getCityMapExportFileBase(comparisonRun.startStop, comparisonRun.targetStop);
    downloadBlob(new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" }), `${fileBase}.json`);
    toast.success("JSON download started. It includes roads, travel times, stops, and your layout.");
  };

  const downloadCityMapPng = () => {
    if (!comparisonRun) return;
    const width = 1600;
    const height = 1060;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      toast.error("Your browser could not prepare this PNG. Please try JSON export instead.");
      return;
    }

    const positions = { ...getCityGraphPositions(comparisonRun.stops), ...comparisonNodePositions };
    const map = { x: 76, y: 182, width: 1448, height: 590 };
    const pointFor = (stop: string) => {
      const position = positions[stop] ?? { left: 50, top: 50 };
      return { x: map.x + (position.left / 100) * map.width, y: map.y + (position.top / 100) * map.height };
    };
    const roundRect = (x: number, y: number, w: number, h: number, radius: number) => {
      context.beginPath();
      context.roundRect(x, y, w, h, radius);
    };
    const routeSegments = (path?: string[] | null) => new Set((path ?? []).slice(1).map((stop, index) => [path?.[index], stop].sort().join("\u0000")));
    const bfsRoute = routeSegments(comparisonRun.bfs.at(-1)?.shortestPath);
    const dijkstraRoute = routeSegments(comparisonRun.dijkstra.at(-1)?.shortestPath);

    context.fillStyle = "#070b14";
    context.fillRect(0, 0, width, height);
    const gradient = context.createRadialGradient(1170, 160, 0, 1170, 160, 820);
    gradient.addColorStop(0, "rgba(59,130,246,0.24)");
    gradient.addColorStop(1, "rgba(7,11,20,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.fillStyle = "#7dd3fc";
    context.font = "700 20px Inter, system-ui, sans-serif";
    context.fillText("CODE STORY STUDIO  /  CUSTOM CITY MAP", 76, 74);
    context.fillStyle = "#ffffff";
    context.font = "800 42px Inter, system-ui, sans-serif";
    context.fillText(`${comparisonRun.startStop}  →  ${comparisonRun.targetStop}`, 76, 126);
    context.fillStyle = "#b6c7dc";
    context.font = "500 22px Inter, system-ui, sans-serif";
    context.fillText("A learner-arranged map with weighted roads and three route strategies.", 76, 160);

    roundRect(map.x, map.y, map.width, map.height, 34);
    context.fillStyle = "rgba(10, 19, 35, 0.94)";
    context.fill();
    context.strokeStyle = "rgba(125, 211, 252, 0.30)";
    context.lineWidth = 2;
    context.stroke();
    context.strokeStyle = "rgba(148, 163, 184, 0.13)";
    context.lineWidth = 1;
    for (let x = map.x + 40; x < map.x + map.width; x += 80) {
      context.beginPath(); context.moveTo(x, map.y); context.lineTo(x, map.y + map.height); context.stroke();
    }
    for (let y = map.y + 40; y < map.y + map.height; y += 80) {
      context.beginPath(); context.moveTo(map.x, y); context.lineTo(map.x + map.width, y); context.stroke();
    }

    const weightedRoads = Object.entries(comparisonRun.weightedGraph).flatMap(([from, roads]) => roads.map((road) => ({ from, ...road })));
    for (const road of weightedRoads) {
      const from = pointFor(road.from);
      const to = pointFor(road.to);
      const key = [road.from, road.to].sort().join("\u0000");
      const isDijkstraRoad = dijkstraRoute.has(key);
      const isBfsRoad = bfsRoute.has(key);
      context.strokeStyle = isDijkstraRoad ? "#fbbf24" : isBfsRoad ? "#38bdf8" : "rgba(148, 163, 184, 0.56)";
      context.lineWidth = isDijkstraRoad || isBfsRoad ? 8 : 4;
      context.beginPath(); context.moveTo(from.x, from.y); context.lineTo(to.x, to.y); context.stroke();
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      roundRect(midX - 28, midY - 18, 56, 36, 18);
      context.fillStyle = "#111827";
      context.fill();
      context.strokeStyle = "rgba(255,255,255,0.18)";
      context.lineWidth = 1;
      context.stroke();
      context.fillStyle = "#f8fafc";
      context.font = "800 17px Inter, system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText(`${road.weight}m`, midX, midY + 6);
      context.textAlign = "left";
    }

    for (const stop of comparisonRun.stops) {
      const point = pointFor(stop);
      const isStart = stop === comparisonRun.startStop;
      const isTarget = stop === comparisonRun.targetStop;
      context.beginPath(); context.arc(point.x, point.y, 35, 0, Math.PI * 2);
      context.fillStyle = isStart ? "#38bdf8" : isTarget ? "#fda4af" : "#a78bfa";
      context.fill();
      context.lineWidth = 5;
      context.strokeStyle = "#ffffff";
      context.stroke();
      context.fillStyle = "#ffffff";
      context.font = "800 19px Inter, system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText(stop, point.x, point.y + 62);
      context.textAlign = "left";
    }

    const fastestTime = comparisonRun.dijkstra.at(-1)?.shortestTravelTime;
    const summaryCards = [
      { title: "BFS", detail: "Fewest roads", value: comparisonRun.bfs.at(-1)?.shortestPath?.join(" → ") || "No route", color: "#38bdf8" },
      { title: "DFS", detail: "One road deep", value: comparisonRun.dfs.at(-1)?.shortestPath?.join(" → ") || "No route", color: "#a78bfa" },
      { title: "DIJKSTRA", detail: "Lowest travel time", value: fastestTime == null ? "No route" : `${fastestTime} minutes`, color: "#fbbf24" },
    ];
    summaryCards.forEach((card, index) => {
      const x = 76 + index * 490;
      roundRect(x, 820, 460, 162, 26);
      context.fillStyle = "rgba(17, 24, 39, 0.95)";
      context.fill();
      context.strokeStyle = `${card.color}70`;
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = card.color;
      context.font = "800 18px Inter, system-ui, sans-serif";
      context.fillText(card.title, x + 28, 858);
      context.fillStyle = "#b6c7dc";
      context.font = "600 16px Inter, system-ui, sans-serif";
      context.fillText(card.detail, x + 28, 888);
      context.fillStyle = "#ffffff";
      context.font = "700 18px Inter, system-ui, sans-serif";
      const clipped = card.value.length > 40 ? `${card.value.slice(0, 38)}…` : card.value;
      context.fillText(clipped, x + 28, 932);
    });

    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error("The City Map PNG could not be created. Please try again.");
        return;
      }
      const fileBase = getCityMapExportFileBase(comparisonRun.startStop, comparisonRun.targetStop);
      downloadBlob(blob, `${fileBase}.png`);
      toast.success("PNG download started. It is ready to add to your presentation.");
    }, "image/png");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!parseGraphScenario(window.location.search)) return;
    window.history.replaceState({}, "", window.location.pathname);
    toast.info("The City Map Lab has been retired so Code Story Studio can stay focused on code-to-visual learning.");
  }, []);

  const goToStep = (index: number) => {
    setIsPlaying(false);
    const nextIndex = Math.max(0, Math.min(index, steps.length - 1));
    setShowBeforeState(false);
    setCurrentStepIndex(nextIndex);
    playActionSound(steps[nextIndex]?.story);
    playMandalaInteractionSound("step");
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
        playMandalaInteractionSound("step");
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
            playMandalaInteractionSound("step");
            return nextIndex;
          });
        }
      }
      if (action === "toggle-sound") setSoundEnabled((value) => !value);
    };

    window.addEventListener("keydown", handleShortcut, { capture: true });
    return () => window.removeEventListener("keydown", handleShortcut, { capture: true });
  }, [activeView, steps, soundEnabled, comparisonLength]);

  return (
    <div className={`lab-shell visual-theme-${visualTheme} min-h-screen overflow-x-hidden`} data-visual-theme={visualTheme} data-appearance={theme} data-mandala-intensity={mandalaIntensity} data-mandala-sound={mandalaSoundsEnabled ? "on" : "off"} style={{ "--mandala-user-accent": mandalaAccent } as React.CSSProperties}>
      <LivingSvgBackground active={visualTheme !== "high-contrast"} appearance={theme} />
      <header className="product-header reference-product-header sticky top-0 z-50 border-b px-5 py-3 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <button onClick={() => { setActiveView("landing"); setLandingWorkspace(getLearningWorkspace("home")); }} className="flex items-center gap-3 text-left" aria-label="Go to learning home">
            <div className="reference-brand-mark grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-400 to-cyan-300 text-[#07101d] shadow-[0_0_26px_rgba(99,102,241,0.32)]"><Sparkles className="h-5 w-5 fill-current" /></div>
            <div className="reference-brand-lockup"><p className="text-base font-extrabold tracking-tight text-white">Code Story Studio</p><p className="text-[10px] font-semibold tracking-[0.12em] text-indigo-200">VISUAL LEARNING LAB</p></div>
          </button>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-appearance-toggle className="appearance-toggle h-10 shrink-0 rounded-xl px-3 text-xs font-extrabold" aria-label={`Appearance: ${preference === "system" ? `System, currently ${theme}` : preference}. Choose System, Light, or Dark.`} title="Choose System, Light, or Dark appearance">
                  {preference === "system" ? <Monitor className="h-4 w-4" /> : theme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span className="hidden sm:inline">{preference === "system" ? "System" : theme === "light" ? "Light" : "Dark"}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent data-appearance-menu align="end" className="appearance-menu min-w-48 rounded-xl p-1.5">
                <DropdownMenuLabel className="appearance-menu-label text-xs font-extrabold">Appearance</DropdownMenuLabel>
                <p className="appearance-menu-copy px-2 pb-2 text-[11px] leading-4">System follows your device. Light and Dark stay as your personal choice.</p>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={preference} onValueChange={(value) => setPreference(value as ThemePreference)}>
                  <DropdownMenuRadioItem value="system" className="appearance-menu-item rounded-lg"><Monitor className="h-4 w-4" />System <span className="ml-auto text-[10px] font-bold opacity-65">Now {theme}</span></DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="light" className="appearance-menu-item rounded-lg"><Sun className="h-4 w-4" />Light</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark" className="appearance-menu-item rounded-lg"><Moon className="h-4 w-4" />Dark</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            {activeView === "studio" && <><div className="relative"><Button variant="outline" size="icon" onClick={() => setShowShortcutHelp((value) => !value)} aria-expanded={showShortcutHelp} aria-controls="shortcut-help" className="h-10 w-10 rounded-xl border-[#3c2b20] bg-[#1a120e] text-[#efc194] hover:bg-[#271a13]" title="Show keyboard shortcuts"><Keyboard className="h-4 w-4" /></Button>{showShortcutHelp && <aside id="shortcut-help" role="dialog" aria-label="Keyboard shortcuts" className="shortcut-help-popover absolute right-0 top-[calc(100%+0.75rem)] z-[60] w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-amber-300/25 bg-[#17100d]/95 p-4 shadow-[0_24px_64px_rgba(0,0,0,0.55)] backdrop-blur-xl"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">Story controls</p><h2 className="mt-1 text-sm font-black text-white">Keyboard shortcuts</h2></div><Button variant="ghost" size="icon" onClick={() => setShowShortcutHelp(false)} className="h-8 w-8 rounded-xl text-[#c5ad98] hover:bg-white/10 hover:text-white" aria-label="Close shortcut help"><X className="h-4 w-4" /></Button></div><p className="mt-2 text-xs leading-relaxed text-[#aa9684]">Shortcuts work while viewing a story. They never interrupt typing in the editor.</p><div className="mt-4 space-y-2">{STORY_SHORTCUTS.map((shortcut) => <div key={shortcut.label} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0c0806] px-3 py-2"><span className="text-xs text-[#d8c4b2]">{shortcut.label}</span><kbd className="rounded-md border border-[#5e4432] bg-[#241711] px-2 py-1 font-mono text-[10px] font-bold text-amber-100">{shortcut.keys}</kbd></div>)}</div></aside>}</div><Button variant="outline" size="icon" onClick={() => setSoundEnabled((value) => !value)} className="h-10 w-10 rounded-xl border-[#3c2b20] bg-[#1a120e] text-[#efc194] hover:bg-[#271a13]" title={soundEnabled ? "Turn sound off" : "Turn sound on"}>{soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</Button></>}
            {activeView !== "landing" ? <Button variant="outline" onClick={() => { setActiveView("landing"); setLandingWorkspace("code"); }} aria-label="Back to workspace" title="Back to workspace" className="shrink-0 rounded-xl border-white/10 bg-white/5 px-3 text-xs text-white hover:bg-white/10 sm:px-4"><span className="sm:hidden">Back</span><span className="hidden sm:inline">Back to workspace</span></Button> : landingWorkspace === "overview" ? <Button onClick={() => openLearningWorkspace("code")} className="rounded-xl bg-gradient-to-r from-indigo-400 to-cyan-300 px-5 text-xs font-black text-[#08101e] shadow-[0_0_28px_rgba(99,102,241,0.30)] hover:from-indigo-300 hover:to-cyan-200">Create a visual story <ArrowRight className="ml-1 h-4 w-4" /></Button> : null}
          </div>
        </div>
      </header>

      {shouldDisplayOnboardingCoach(activeView, onboardingWorkspace) && onboardingWorkspace && <OnboardingCoach
        workspace={onboardingWorkspace}
        stepIndex={onboardingStepIndex}
        onBack={() => setOnboardingStepIndex((step) => getPreviousOnboardingStep(step))}
        onNext={() => {
          const nextStep = getNextOnboardingStep(onboardingWorkspace, onboardingStepIndex);
          if (nextStep.isComplete) finishOnboarding(onboardingWorkspace);
          else setOnboardingStepIndex(nextStep.stepIndex);
        }}
        onSkip={() => finishOnboarding(onboardingWorkspace)}
      />}


      {activeView === "landing" && (
        <main className={`lab-grid landing-mode-${landingWorkspace} mx-auto w-full max-w-7xl px-5 py-10 md:px-8 md:py-14`} data-learning-workspace={landingWorkspace}>
          <section data-learning-hero className="reference-hero mx-auto grid max-w-6xl items-end gap-8 lg:grid-cols-[1.18fr_.82fr]">
            <div>
              <Badge className="rounded-full border border-indigo-300/25 bg-indigo-300/10 px-4 py-1.5 text-[11px] font-bold text-indigo-100">VISUAL PROGRAMMING FOR BEGINNERS</Badge>
              <h1 className="reference-hero-heading mt-5 max-w-3xl text-4xl font-extrabold leading-[1.06] tracking-[-0.045em] text-white md:text-6xl">Learn code by watching the <span className="bg-gradient-to-r from-indigo-200 via-sky-200 to-cyan-200 bg-clip-text text-transparent">idea move.</span></h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#aebad0] md:text-lg">One focused workspace turns everyday code into a visual story you can follow line by line.</p>
              <div className="mt-7 flex flex-wrap gap-3"><Button onClick={() => openLearningWorkspace("code")} className="h-11 rounded-xl bg-gradient-to-r from-indigo-400 to-cyan-300 px-5 text-xs font-black text-[#08101e]">Start with my code <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
            </div>
            <aside className="reference-path-note lab-surface rounded-[28px] p-5 md:p-6">
              <p className="lab-kicker">Your learning path</p><h2 className="mt-2 text-xl font-extrabold tracking-tight text-white">One clear path from code to understanding.</h2>
              <div className="mt-5"><div className="rounded-2xl border border-indigo-300/20 bg-indigo-300/7 p-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-300/15 text-lg">⌘</span><div><p className="text-xs font-extrabold text-white">Code story</p><p className="mt-0.5 text-[11px] text-[#aebad0]">Trace one line at a time with everyday analogies and a clear visual state.</p></div></div></div></div>
              <div className="mt-5 flex items-center gap-3 border-t border-white/8 pt-4 text-[11px] text-[#91a0ba]"><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.9)]" /> Interactive, step-by-step, and built for exploration.</div>
            </aside>
          </section>

          {landingWorkspace === "overview" && <section className="mt-10" aria-label="Open your learning workspace">
            <button type="button" data-testid="open-code-studio" onClick={() => openLearningWorkspace("code")} className="lab-surface group rounded-[28px] p-6 text-left transition hover:-translate-y-1 hover:border-indigo-300/35"><div className="flex items-start justify-between gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-300/12 text-indigo-100"><Code2 className="h-6 w-6" /></div><span className="rounded-full border border-indigo-300/20 bg-indigo-300/10 px-3 py-1 text-[10px] font-bold text-indigo-100">ONE CODE IDEA</span></div><p className="mt-7 lab-kicker">01 · Code studio</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white">Turn code into a story you can follow.</h2><p className="mt-3 text-sm leading-relaxed text-[#aebad0]">Paste a small program, pick a visual world, and walk through every idea in plain English.</p><span className="mt-6 inline-flex items-center text-xs font-black text-indigo-100">Open Code Studio <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" /></span></button>
          </section>}

          <section data-detailed-workspaces className="professional-workspace mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="reference-learning-deck lab-surface code-input-card relative overflow-hidden rounded-[28px] p-5 md:p-8" data-code-story-input>
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
              <div data-code-only className="relative flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#5d2323]" style={{ backgroundColor: "#2b0808", color: "#f7eded" }}>
                    <Code2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="lab-kicker">Step 1 · Your code</p>
                    <h2 className="mt-1 text-lg font-extrabold tracking-tight" style={{ color: "#091320" }}>Paste code. We make the story clear.</h2>
                    <p className="mt-1 text-xs" style={{ color: "#091320" }}>Use JavaScript, Python, C, or Java. A problem title is optional.</p>
                  </div>
                </div>
                <div className="flex rounded-2xl border border-[#3c2b20] bg-[#0c0806] p-1">
                  {(["javascript", "python", "c", "java"] as Language[]).map((language) => <button key={language} onClick={() => setSelectedLang(language)} className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wide transition ${selectedLang === language ? "bg-gradient-to-r from-[#ffbd7d] to-[#d86527] text-[#1a0c05] shadow-[0_0_18px_rgba(229,155,99,0.25)]" : "text-[#a89787] hover:text-white"}`}>{language}</button>)}
                </div>
              </div>
              <div className="relative mt-6 space-y-5">
                <div>
                  <div data-code-only className="mb-2 flex items-center justify-between gap-3"><Label className="block text-[11px] font-bold uppercase tracking-wider text-[#bba797]">What does your code do? <span className="font-normal normal-case tracking-normal text-[#8f7c6d]">Optional</span></Label><span className="text-[10px] text-[#8f7c6d]">A short sentence helps your story title.</span></div>
                  <Input data-code-problem-input value={userProblem} onChange={(event) => setUserProblem(event.target.value)} className="h-12 rounded-xl border-[#39291f] bg-[#0b0705] text-white focus-visible:ring-[#f59e0b]" placeholder="For example: Find an apple in a basket" />
                </div>
                <section id="algorithm-lab" data-algorithm-only className="lab-grid rounded-3xl border border-cyan-300/20 bg-[#081426]/80 p-4 shadow-[inset_0_0_30px_rgba(59,130,246,0.05)]" data-custom-city-editor>
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-200">Custom City Map Lab</p><h3 className="mt-1 text-sm font-black text-white">Build your own roads, then compare three explorers.</h3></div><button type="button" onClick={() => { setCustomGraphText(customCityGraphExample); setCustomStartStop("Cafe"); setCustomTargetStop("Restaurant"); }} className="rounded-xl border border-sky-300/25 bg-sky-300/10 px-3 py-2 text-[10px] font-bold text-sky-100 transition hover:bg-sky-300/20">Load example</button></div>
                  <p className="mt-2 text-[11px] leading-relaxed text-[#a8c7eb]">Use one line per stop. Add a travel time in brackets when you need it: <code className="rounded bg-sky-300/10 px-1 text-sky-100">Cafe: Library (4), Park (2)</code>. Roads work in the direction you list them; a missing time is 1 minute.</p>
                  <Textarea aria-label="Custom city graph" value={customGraphText} onChange={(event) => { const next = event.target.value; setCustomGraphText(next); try { const parsed = parseCityGraph(next); setCustomStartStop((current) => parsed.stops.includes(current) ? current : parsed.stops[0] ?? ""); setCustomTargetStop((current) => parsed.stops.includes(current) ? current : parsed.stops.at(-1) ?? ""); } catch { /* Keep the last valid selections while the learner edits. */ } }} rows={6} className="mt-3 resize-y rounded-2xl border-sky-300/20 bg-[#06101e] font-mono text-xs leading-6 text-sky-50 focus-visible:ring-sky-300" placeholder="Cafe: Library, Park\nLibrary: Museum\nPark:" />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="block text-[10px] font-bold uppercase tracking-wider text-sky-100">Start stop<select aria-label="Custom city start stop" value={customStartStop} onChange={(event) => setCustomStartStop(event.target.value)} disabled={!customGraphStops.length} className="mt-1.5 h-10 w-full rounded-xl border border-sky-300/20 bg-[#06101e] px-3 text-xs font-semibold text-white disabled:opacity-50">{customGraphStops.map((stop) => <option key={stop} value={stop}>{stop}</option>)}</select></label><label className="block text-[10px] font-bold uppercase tracking-wider text-sky-100">Target stop<select aria-label="Custom city target stop" value={customTargetStop} onChange={(event) => setCustomTargetStop(event.target.value)} disabled={!customGraphStops.length} className="mt-1.5 h-10 w-full rounded-xl border border-sky-300/20 bg-[#06101e] px-3 text-xs font-semibold text-white disabled:opacity-50">{customGraphStops.map((stop) => <option key={stop} value={stop}>{stop}</option>)}</select></label></div>
                  <Button type="button" onClick={() => startCityComparison()} disabled={customGraphStops.length < 2} className="mt-4 h-11 w-full rounded-xl bg-gradient-to-r from-sky-200 via-sky-300 to-cyan-300 text-xs font-black text-[#06101e] shadow-[0_0_28px_rgba(56,189,248,0.24)] hover:from-white hover:to-cyan-200 disabled:opacity-40">Compare BFS, DFS, and Dijkstra <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </section>
                <div data-code-only><div className="mb-2 flex items-center justify-between gap-3"><Label className="block text-[11px] font-bold uppercase tracking-wider text-[#bba797]">Your code</Label><span className="text-[10px] text-[#8f7c6d]">Every non-empty line becomes one clear visual step.</span></div><Textarea data-code-input value={userCode} onChange={(event) => { setUserCode(event.target.value); setSelectedWalkthrough(null); }} rows={16} className="resize-y rounded-xl border-[#503525] bg-[#0b0705] p-4 font-mono text-xs leading-6 text-[#f7f0e8] shadow-[inset_0_0_24px_rgba(0,0,0,0.24)] focus-visible:ring-[#f59e0b]" placeholder="Paste your code here" /></div>
                <details data-code-only className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><summary className="cursor-pointer text-xs font-bold text-[#dfc6ae] marker:text-amber-200">Need a quick example instead?</summary><div className="mt-3 grid gap-2 sm:grid-cols-2">{learningPresets.map((preset) => <button key={preset.name} onClick={() => { setUserProblem(preset.problem); setSelectedLang(preset.language); setUserCode(preset.code); setSelectedWalkthrough(preset.walkthrough ?? null); toast.success(`${preset.name} example loaded.`); }} className="group rounded-xl border border-white/10 bg-[#0c0806] p-3 text-left transition hover:border-amber-300/45 hover:bg-[#1b110b]"><SceneKindIcon kind={preset.kind} className="inline-block h-4 w-4 text-amber-200" /><span className="ml-2 text-xs font-bold text-white">{preset.name}</span><span className="mt-1 block text-[10px] leading-relaxed text-[#a89787]">{preset.description}</span></button>)}</div></details>
              </div>
                <div data-code-only className="story-launch-pad relative mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/[0.055] p-4 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs leading-5" style={{ color: "#27211b" }}><strong style={{ color: "#250e0e" }}>Ready when you are.</strong> We read your code, build a real-world scene, and explain one idea at a time.</p>
                    {interpretStory.isPending && <p className="mt-2 flex items-center gap-2 text-[11px] font-bold" aria-live="polite" data-interpreter-progress style={{ color: "#250e0e" }}><Sparkles className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />Preparing your story · {interpreterProgressMessages[interpreterProgressIndex]}</p>}
                  </div>
                  <Button data-create-visual-story onClick={startVisualStory} disabled={interpretStory.isPending} className="create-story-button mt-3 h-12 w-full rounded-xl bg-gradient-to-r from-[#ffbd7d] via-[#e07834] to-[#c34d20] px-6 text-sm font-black text-[#170b06] shadow-[0_0_32px_rgba(229,155,99,0.33)] hover:scale-[1.01] disabled:cursor-wait disabled:opacity-70 sm:mt-0 sm:w-auto">{interpretStory.isPending ? "Building your story…" : "Create my visual story"} <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
            </div>

            <aside className="lab-surface code-path-card h-fit rounded-[28px] p-5" data-code-story-guide>
              <p className="lab-kicker">Your simple path</p><h2 className="mt-1 text-base font-extrabold tracking-tight" style={{ color: "#091320" }}>One idea at a time.</h2>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-indigo-300/20 bg-indigo-300/[0.07] p-3"><p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: "#170303" }}>1 · Paste code</p><p className="mt-1 text-xs leading-5" style={{ color: "#252627" }}>Start with the code you already have. No special format is needed.</p></div>
                <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-3"><p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: "#302727" }}>2 · See the idea</p><p className="mt-1 text-xs leading-5" style={{ color: "#170f07" }}>We turn each important line into familiar objects and actions.</p></div>
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-3"><p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: "#365044" }}>3 · Understand it</p><p className="mt-1 text-xs leading-5" style={{ color: "#4f695a" }}>Read the explanation in plain English and move at your own speed.</p></div>
              </div>
            </aside>
          </section>
        </main>
      )}

      {activeView === "studio" && currentStep && (
        <main className="lab-grid studio-learning-frame mx-auto w-full max-w-7xl px-5 py-5 md:px-8" data-dense-learning-workspace>
          <div className="simple-story-toolbar mb-3 flex flex-wrap items-center justify-between gap-3" data-code-story-workspace>
            <div><button type="button" onClick={() => { setIsPlaying(false); setActiveView("landing"); setLandingWorkspace("code"); }} className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 transition hover:text-slate-950"><ChevronLeft className="h-3.5 w-3.5" /> Edit code</button><h1 className="mt-1 text-xl font-black tracking-tight text-slate-950">{userProblem || "Your code story"}</h1></div>
            <div className="flex items-center gap-2" data-simple-step-controls><Button variant="outline" size="icon" onClick={() => goToStep(currentStepIndex - 1)} aria-label="Previous step" disabled={currentStepIndex === 0} className="h-9 w-9"><ChevronLeft className="h-4 w-4" /></Button><span className="min-w-20 text-center text-xs font-bold text-slate-700" data-simple-step-status>Step {currentStepIndex + 1} / {steps.length}</span><Button variant="outline" size="icon" onClick={() => goToStep(currentStepIndex + 1)} aria-label="Next step" disabled={currentStepIndex === steps.length - 1} className="h-9 w-9"><ChevronRight className="h-4 w-4" /></Button></div>
          </div>

          <section className="execution-workspace-grid simple-story-page grid gap-3 xl:grid-cols-[14.5rem_minmax(0,1fr)_19rem]" data-simple-story-page>
            <aside className="execution-rail simple-code-panel lab-surface h-fit rounded-[20px] p-3.5 md:p-4" data-execution-rail aria-label="Current code execution">
              <p className="simple-panel-label">Code</p>
              <div className="execution-source-card mt-3" data-reference-active-source data-active-code-line={currentStep.line}>
                <div className="flex items-center justify-between gap-3"><span>Current line</span><strong>{currentStep.line}</strong></div>
                <code>{currentStep.code.trim() || "Current source line"}</code>
              </div>
              <div className="execution-rail-steps mt-4"><div className="flex items-center justify-between gap-3"><p>Steps</p><span>{currentStepIndex + 1} / {steps.length}</span></div><div className="mt-2 space-y-1.5">{steps.map((step, index) => { const isActive = index === currentStepIndex; return <button key={`rail-${step.line}-${step.code}`} onClick={() => goToStep(index)} aria-current={isActive ? "step" : undefined} className={isActive ? "is-active" : ""}><span>{index + 1}</span><strong>Line {step.line}</strong><small>{step.story.title}</small></button>; })}</div></div>
            </aside>
            <div className="lab-surface story-stage primary-visual-stage simple-visual-panel rounded-[20px] p-3.5 md:p-4" data-primary-visual-stage>
              <div className="simple-panel-heading"><p className="simple-panel-label">Visual</p><div className="simple-state-tools"><span>{showBeforeState && currentStepIndex > 0 ? "Before" : "After"} · Line {currentStep.line}</span><button type="button" data-three-result-toggle onClick={() => setShowThreeResult((visible) => !visible)} aria-pressed={showThreeResult}>{showThreeResult ? "Hide 3D" : "Open 3D"}</button><button type="button" data-state-comparison-toggle onClick={() => setShowBeforeState((visible) => !visible)} disabled={currentStepIndex === 0} aria-pressed={showBeforeState}>{showBeforeState ? "View after" : "View before"}<ArrowDownUp className="h-3.5 w-3.5" aria-hidden="true" /></button></div></div>
              <div className="primary-2d-scene mt-3"><Simple2DVisualPanel step={currentStep} previousStep={steps[currentStepIndex - 1]} sourceLines={steps.slice(0, currentStepIndex + 1).map((entry) => entry.code)} showBefore={showBeforeState} showThreeResult={showThreeResult} /></div>
              <section className="persistent-step-explanation mt-3" data-persistent-explanation aria-label="Current plain-English explanation">
                <div><span>What happens now</span><strong>Line {currentStep.line}</strong></div>
                <p>{currentStep.story.plainEnglish}</p>
                <small>{currentStructure ? `${currentStructure.parser} structure: ${currentStructure.functions} functions, ${currentStructure.branches} choices, ${currentStructure.loops} loops.` : "This explanation stays visible while you explore the 3D visual."}</small>
              </section>
            </div>
            <aside className="lab-surface story-explanation-panel direct-explanation-panel simple-explanation-panel rounded-[20px] p-3.5 md:p-4" data-direct-explanation-panel>
              <div className="simple-explanation-heading"><p className="simple-panel-label">Explanation</p><span>Step {currentStepIndex + 1} of {steps.length}</span></div>
              <p className="simple-explanation-lede">Plain English · what this line changes</p>
              <div className="simple-explanation-scroll mt-2.5" data-explanation-scroll aria-label="Explanation history">
                {steps.slice(0, currentStepIndex + 1).map((step, index) => { const isActive = index === currentStepIndex; return <article key={`explanation-history-${step.step}-${step.line}-${index}`} data-explanation-entry={index + 1} {...(isActive ? { "data-story-explanation": true, "data-explanation-quality": true, "aria-live": "polite" } : {})} className={`simple-explanation-copy ${isActive ? "is-current explanation-enter" : ""}`}><div className="simple-explanation-entry-meta"><span>Step {index + 1}</span><span>Line {step.line}</span></div><p>{step.story.plainEnglish}</p></article>; })}
              </div>
            </aside>
          </section>
        </main>
      )}

      {activeView === "comparison" && comparisonRun && comparisonBfsState && comparisonDfsState && comparisonDijkstraState && (
        <main className="lab-grid mx-auto w-full max-w-7xl px-5 py-10 md:px-8 md:py-12" data-city-comparison>
          <div className="lab-surface flex flex-wrap items-start justify-between gap-5 rounded-[28px] p-5 md:p-7"><div><button type="button" onClick={() => setActiveView("landing")} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-200 transition hover:text-white"><ChevronLeft className="h-4 w-4" /> Edit city map</button><Badge className="ml-3 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[10px] font-bold text-cyan-100">CUSTOM ALGORITHM LAB</Badge><h1 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-white md:text-5xl">Three explorers, <span className="bg-gradient-to-r from-sky-200 via-violet-200 to-amber-200 bg-clip-text text-transparent">one live map.</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#c8b7a7]">BFS, DFS, and Dijkstra all start at <strong className="text-white">{comparisonRun.startStop}</strong> and look for <strong className="text-amber-100">{comparisonRun.targetStop}</strong>. Watch their decisions change in real time, then drag a stop to reshape the map.</p><div className="mt-4 flex flex-wrap gap-2" data-presentation-demo-path><span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-sky-100">1 · Explain the map</span><span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-violet-100">2 · Compare decisions</span><span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">3 · Export the proof</span></div></div><div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-right"><p className="lab-kicker">Map size</p><p className="mt-1 text-sm font-black text-white">{comparisonRun.stops.length} stops · {getCityWeightedEdges(comparisonRun.weightedGraph).length} roads</p><p className="mt-1 text-[10px] text-cyan-100">Drag any city stop to rearrange the map.</p></div></div>

          <section className="lab-surface mt-6 rounded-[28px] p-4 md:p-5" aria-label="Shared comparison controls">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center"><div className="flex items-center gap-2"><Button variant="outline" size="icon" onClick={() => goToComparisonStep(comparisonStepIndex - 1)} disabled={comparisonStepIndex === 0} className="h-11 w-11 rounded-xl border-white/10 bg-[#0c0806] text-white hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></Button><Button onClick={() => setComparisonPlaying((playing) => !playing)} className="h-11 min-w-28 rounded-xl bg-gradient-to-r from-sky-200 to-violet-200 text-xs font-black text-[#0a0712] hover:from-white hover:to-violet-100">{comparisonPlaying ? <><Pause className="mr-1 h-4 w-4" /> Pause</> : <><Play className="mr-1 h-4 w-4 fill-current" /> Play both</>}</Button><Button variant="outline" size="icon" onClick={() => goToComparisonStep(comparisonStepIndex + 1)} disabled={comparisonStepIndex >= comparisonLength - 1} className="h-11 w-11 rounded-xl border-white/10 bg-[#0c0806] text-white hover:bg-white/10"><ChevronRight className="h-4 w-4" /></Button><Button variant="outline" size="icon" onClick={() => goToComparisonStep(0)} className="h-11 w-11 rounded-xl border-white/10 bg-[#0c0806] text-white hover:bg-white/10" title="Restart both explorers"><RotateCcw className="h-4 w-4" /></Button></div><div className="min-w-0 flex-1"><div className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-[#a89787]"><span>Shared moment</span><span>Step {comparisonStepIndex + 1} of {comparisonLength}</span></div><input aria-label="Comparison progress" type="range" min="0" max={Math.max(comparisonLength - 1, 0)} value={comparisonStepIndex} onChange={(event) => goToComparisonStep(Number(event.target.value))} className="w-full accent-sky-300" /></div><label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#a89787]">Speed<select aria-label="Comparison speed" value={speedMs} onChange={(event) => setSpeedMs(Number(event.target.value))} className="h-9 rounded-xl border border-white/10 bg-[#0c0806] px-2 text-xs text-white"><option value={3000}>Slow</option><option value={2200}>Normal</option><option value={1400}>Fast</option></select></label></div>
          </section>

          <section className="mt-5 rounded-[24px] border border-cyan-300/20 bg-gradient-to-r from-cyan-300/10 via-[#11182a] to-violet-300/10 p-4" data-city-map-exports>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">Presentation kit</p><h2 className="mt-1 text-sm font-black text-white">Share the exact City Map you built</h2><p className="mt-1 text-xs leading-5 text-[#b6c7dc]">PNG is a slide-ready visual. JSON preserves every road, travel time, route choice, and dragged stop position.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void shareCurrentComparison()} className="h-10 rounded-xl border-cyan-300/25 bg-cyan-300/10 px-3 text-xs font-black text-cyan-100 hover:bg-cyan-300/20"><Share2 className="mr-1.5 h-4 w-4" /> Share link</Button><Button variant="outline" onClick={downloadCityMapPng} className="h-10 rounded-xl border-sky-300/25 bg-sky-300/10 px-3 text-xs font-black text-sky-100 hover:bg-sky-300/20" data-export-city-map-png><ImageDown className="mr-1.5 h-4 w-4" /> Download PNG</Button><Button variant="outline" onClick={downloadCityMapJson} className="h-10 rounded-xl border-violet-300/25 bg-violet-300/10 px-3 text-xs font-black text-violet-100 hover:bg-violet-300/20" data-export-city-map-json><FileJson className="mr-1.5 h-4 w-4" /> Download JSON</Button></div></div>
            <p className="mt-3 flex items-center gap-2 text-[11px] font-medium text-[#90a8c4]"><Download className="h-3.5 w-3.5 text-cyan-200" /> For your demo: build a map, show the three strategies, then download the PNG as your evidence.</p>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-3"><CityComparisonPanel routeState={comparisonBfsState} stepNumber={Math.min(comparisonStepIndex + 1, comparisonRun.bfs.length)} visualTheme={visualTheme} nodePositions={comparisonNodePositions} onNodePositionChange={(stop, position) => setComparisonNodePositions((current) => ({ ...current, [stop]: position }))} /><CityComparisonPanel routeState={comparisonDfsState} stepNumber={Math.min(comparisonStepIndex + 1, comparisonRun.dfs.length)} visualTheme={visualTheme} nodePositions={comparisonNodePositions} onNodePositionChange={(stop, position) => setComparisonNodePositions((current) => ({ ...current, [stop]: position }))} /><CityComparisonPanel routeState={comparisonDijkstraState} stepNumber={Math.min(comparisonStepIndex + 1, comparisonRun.dijkstra.length)} visualTheme={visualTheme} nodePositions={comparisonNodePositions} onNodePositionChange={(stop, position) => setComparisonNodePositions((current) => ({ ...current, [stop]: position }))} /></section>

          {comparisonNarration && <section className="mt-6 rounded-[28px] border border-sky-300/20 bg-[#0b1728] p-5 shadow-[0_26px_60px_rgba(0,0,0,0.26)]" data-live-algorithm-narration aria-live="polite"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-200">Live route commentary</p><h2 className="mt-1 text-lg font-black text-white">What each explorer is doing right now</h2></div><p className="max-w-sm text-xs leading-5 text-[#a9c5e6]">Move a city stop by dragging it; every explorer sees the same rearranged map.</p></div><div className="mt-4 grid gap-3 lg:grid-cols-3"><div className="rounded-2xl border border-sky-300/20 bg-sky-300/5 p-4"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-sky-200">{comparisonNarration.bfs.heading}</p><p className="mt-2 text-sm font-semibold leading-6 text-white">{comparisonNarration.bfs.detail}</p><p className="mt-2 text-xs text-[#afd7fb]">{comparisonNarration.bfs.context}</p></div><div className="rounded-2xl border border-violet-300/20 bg-violet-300/5 p-4"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-200">{comparisonNarration.dfs.heading}</p><p className="mt-2 text-sm font-semibold leading-6 text-white">{comparisonNarration.dfs.detail}</p><p className="mt-2 text-xs text-[#d8c2fb]">{comparisonNarration.dfs.context}</p></div><div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-200">{comparisonNarration.dijkstra.heading}</p><p className="mt-2 text-sm font-semibold leading-6 text-white">{comparisonNarration.dijkstra.detail}</p><p className="mt-2 text-xs text-[#ffe4a8]">{comparisonNarration.dijkstra.context}</p></div></div></section>}

          <section className="mt-6 rounded-[28px] border border-[#37271d] bg-[#15100d] p-5 shadow-[0_26px_60px_rgba(0,0,0,0.3)]"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a89787]">Jump all explorers together</p><h2 className="mt-1 text-sm font-black text-white">Choose any comparison moment</h2></div><p className="text-xs text-[#b9a898]">BFS highlights the fewest roads; Dijkstra highlights the lowest travel time.</p></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: comparisonLength }, (_, index) => { const bfs = comparisonRun.bfs[Math.min(index, comparisonRun.bfs.length - 1)]!; const dfs = comparisonRun.dfs[Math.min(index, comparisonRun.dfs.length - 1)]!; const dijkstra = comparisonRun.dijkstra[Math.min(index, comparisonRun.dijkstra.length - 1)]!; const active = index === comparisonStepIndex; return <button key={index} type="button" onClick={() => goToComparisonStep(index)} className={`rounded-2xl border p-3 text-left transition ${active ? "border-sky-300/55 bg-sky-300/10 shadow-[0_0_20px_rgba(125,211,252,0.12)]" : "border-white/10 bg-[#0c0806] hover:border-[#6e5b4c]"}`}><span className="block text-[10px] font-black uppercase tracking-wider text-sky-200">Moment {index + 1}</span><span className="mt-1 block truncate text-xs font-bold text-white">BFS: {bfs.currentStop}</span><span className="mt-0.5 block truncate text-xs font-bold text-violet-200">DFS: {dfs.currentStop}</span><span className="mt-0.5 block truncate text-xs font-bold text-amber-200">Dijkstra: {dijkstra.currentStop}</span></button>; })}</div></section>
        </main>
      )}
    </div>
  );
}
