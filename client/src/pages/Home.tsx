import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Box,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  Download,
  FileJson,
  ImageDown,
  Keyboard,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  GripVertical,
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
import { createCityRouteStory, createCityRouteWalkthrough, createDijkstraRouteWalkthrough, getCityGraphEdges, getCityGraphPositions, getCityLiveNarration, getCityRouteWalkthrough, getCityWeightedEdges, parseCityGraph, type CityGraph, type CityNodePosition, type CityRouteAlgorithm, type CityRouteState, type CityWeightedGraph } from "@/lib/cityRoutes";
import { getStoryShortcutAction, STORY_SHORTCUTS } from "@/lib/storyControls";
import { getStoryCodeLines } from "@/lib/storyFocus";
import { getSavedVisualTheme, getVisualTheme, saveVisualTheme, visualThemes, type VisualTheme } from "@/lib/learningThemes";
import { getInitialLearningWorkspace, getLearningWorkspace, getLearningWorkspaceLabel, type LearningWorkspace } from "@/lib/workspaceNavigation";
import { defaultOnboardingStatus, finishOnboardingTour, getNextOnboardingStep, getPendingOnboardingWorkspace, getPreviousOnboardingStep, onboardingSteps, parseGraphScenario, readOnboardingStatus, serializeGraphScenario, shouldDisplayOnboardingCoach, type OnboardingWorkspace, type OnboardingStatus, type SharedGraphScenario } from "@/lib/learningFlow";
import { createCityMapExportData, getCityMapExportFileBase } from "@/lib/cityMapExports";

type Language = "javascript" | "python" | "c" | "java";

type LearningStep = {
  step: number;
  line: number;
  code: string;
  story: RealWorldStory;
  routeState?: CityRouteState;
};

type CinematicScene = {
  svg: string;
  caption: string;
  renderer: "python-svg";
};

type CinematicSceneStatus = "loading" | "ready" | "failed";

function getCinematicSceneKey(step: LearningStep) {
  return `${step.step}:${step.line}:${step.story.kind}:${step.code}:${step.story.title}`;
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
    const graphPositions = nodePositions ?? getCityGraphPositions(graphStops);
    const cityStops = routeState?.graph ? graphStops.map((name, index) => ({ name, icon: ["☕", "📚", "🌳", "🏛️", "🍽️", "🚏", "🏠", "🎪", "🎨", "🎬"][index] ?? "📍", position: graphPositions[name] })) : defaultCityStops;
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
            return <button key={stop.name} type="button" aria-label={canDrag ? `Drag ${stop.name} to rearrange the city map` : stop.name} data-draggable-city-node={canDrag ? stop.name : undefined} onPointerDown={(event) => { if (!canDrag) return; draggedStopRef.current = stop.name; moveCityStop(event, stop.name); }} onPointerMove={(event) => { if (draggedStopRef.current === stop.name) moveCityStop(event, stop.name); }} onPointerUp={() => { draggedStopRef.current = null; }} onPointerCancel={() => { draggedStopRef.current = null; }} onMouseDown={(event) => { if (!canDrag) return; event.preventDefault(); draggedStopRef.current = stop.name; moveCityStop(event, stop.name); }} className={`scene-object-pop absolute grid h-14 w-14 place-items-center rounded-full border text-center text-[9px] font-black ${typeof stop.position === "string" ? stop.position : ""} ${stateClasses} ${canDrag ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-default"}`} style={positionStyle}><span className="text-base">{stop.icon}</span><span>{stop.name}</span>{canDrag && <GripVertical className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full bg-sky-100 p-0.5 text-sky-950" aria-hidden="true" />}{isTarget && <span className="absolute -left-1 -top-1 rounded-full bg-amber-300 px-1 text-[7px] font-black text-amber-950">TARGET</span>}{isVisited && !isCurrent && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-300 text-[9px] text-emerald-950">✓</span>}</button>;
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

function CinematicScenePanel({ scene, status }: { scene?: CinematicScene; status?: CinematicSceneStatus }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#071523] p-3 shadow-[0_16px_35px_rgba(0,0,0,0.23)]" data-cinematic-scene>
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-100"><Sparkles className="h-3.5 w-3.5" /></span><div><p className="text-[9px] font-black uppercase tracking-[0.15em] text-cyan-100">Cinematic layer</p><p className="text-[10px] text-[#9bb4ca]">Python-rendered scene</p></div></div>
        <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${scene ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" : status === "failed" ? "border-white/10 bg-white/5 text-[#b9c4d4]" : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"}`}>{scene ? "Ready" : status === "failed" ? "Optional" : "Rendering"}</span>
      </div>
      {scene ? (
        <figure className="overflow-hidden rounded-xl border border-white/10 bg-[#06111e]" aria-label={scene.caption}>
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
  const saveSubmission = trpc.submissions.save.useMutation({
    onSuccess: () => toast.success("Your code session has been saved."),
    onError: () => toast.error("Your visual still works, but this session could not be saved."),
  });
  const interpretStory = trpc.stories.interpret.useMutation();
  const cinematicScene = trpc.stories.cinematicScene.useMutation();
  const [activeView, setActiveView] = useState<"landing" | "studio" | "comparison">("landing");
  const [landingWorkspace, setLandingWorkspace] = useState<LearningWorkspace>(getInitialLearningWorkspace);
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
  const [comparisonNodePositions, setComparisonNodePositions] = useState<Record<string, CityNodePosition>>({});
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>(() => typeof window === "undefined" ? { ...defaultOnboardingStatus } : readOnboardingStatus(window.localStorage));
  const [onboardingWorkspace, setOnboardingWorkspace] = useState<OnboardingWorkspace | null>(null);
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);
  const [interpreterProgressIndex, setInterpreterProgressIndex] = useState(0);
  const [cinematicScenes, setCinematicScenes] = useState<Record<string, CinematicScene>>({});
  const [cinematicSceneStatus, setCinematicSceneStatus] = useState<Record<string, CinematicSceneStatus>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const cinematicRequestKeysRef = useRef(new Set<string>());
  const currentStep = steps[currentStepIndex];
  const currentCinematicKey = currentStep ? getCinematicSceneKey(currentStep) : "";
  const activeTheme = getVisualTheme(visualTheme);
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

  useEffect(() => {
    if (activeView !== "studio" || !currentStep) return;
    const candidateIndexes = [currentStepIndex - 1, currentStepIndex, currentStepIndex + 1];
    for (const index of candidateIndexes) {
      const candidate = steps[index];
      if (!candidate) continue;
      const key = getCinematicSceneKey(candidate);
      if (cinematicRequestKeysRef.current.has(key)) continue;
      cinematicRequestKeysRef.current.add(key);
      setCinematicSceneStatus((existing) => ({ ...existing, [key]: "loading" }));
      void cinematicScene.mutateAsync({
        kind: candidate.story.kind,
        title: candidate.story.title,
        plainEnglish: candidate.story.plainEnglish,
        visualFocus: candidate.story.visualFocus ?? candidate.story.analogy,
        codeLine: candidate.code || "Code step",
        lineNumber: candidate.line,
      }).then((scene) => {
        setCinematicScenes((existing) => ({ ...existing, [key]: scene }));
        setCinematicSceneStatus((existing) => ({ ...existing, [key]: "ready" }));
      }).catch(() => {
        setCinematicSceneStatus((existing) => ({ ...existing, [key]: "failed" }));
      });
    }
  }, [activeView, cinematicScene, currentStep, currentStepIndex, steps]);

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
        }));
        if (apiStory.source === "fallback") {
          toast.info("We opened a clear visual guide while the code-specific interpreter is unavailable. You can try again anytime.");
        }
      } catch {
        generatedSteps = buildSteps(userCode);
        toast.warning("The code interpreter is busy, so we opened a simple visual guide. Try creating the story again for code-specific scenes.");
      }
    }

    cinematicRequestKeysRef.current.clear();
    setCinematicScenes({});
    setCinematicSceneStatus({});
    setSteps(generatedSteps);
    setCurrentStepIndex(0);
    setIsPlaying(false);
    setActiveView("studio");
    playActionSound(generatedSteps[0]?.story);
    saveSubmission.mutate({ problemTitle: userProblem || "Untitled code story", language: selectedLang, code: userCode });
    toast.success(selectedWalkthrough ? "Your route walkthrough is ready." : "Your code now has a visual story made from its own instructions.");
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
    const scenario = parseGraphScenario(window.location.search);
    if (!scenario) return;
    setLandingWorkspace(getLearningWorkspace("open-algorithms"));
    startCityComparison(scenario);
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

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
    <div className={`lab-shell visual-theme-${visualTheme} min-h-screen overflow-x-hidden text-[#f7f0e8]`}>
      <header className="product-header sticky top-0 z-50 border-b px-5 py-3 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <button onClick={() => { setActiveView("landing"); setLandingWorkspace(getLearningWorkspace("home")); }} className="flex items-center gap-3 text-left" aria-label="Go to learning home">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-400 to-cyan-300 text-[#07101d] shadow-[0_0_26px_rgba(99,102,241,0.32)]"><Sparkles className="h-5 w-5 fill-current" /></div>
            <div><p className="text-base font-extrabold tracking-tight text-white">Code Story Studio</p><p className="text-[10px] font-semibold tracking-[0.12em] text-indigo-200">VISUAL LEARNING LAB</p></div>
          </button>
          <nav className="hidden items-center gap-1 rounded-xl border border-white/8 bg-white/[0.025] p-1 md:flex" aria-label="Workspace navigation">
            <button type="button" data-active={landingWorkspace === "code" || activeView === "studio"} onClick={() => openLearningWorkspace("code")} className="lab-tab rounded-lg px-3 py-2 text-xs font-bold">Code studio</button>
            <button type="button" data-active={landingWorkspace === "algorithms" || activeView === "comparison"} onClick={() => openLearningWorkspace("algorithms")} className="lab-tab rounded-lg px-3 py-2 text-xs font-bold">Algorithm lab</button>
          </nav>
          <div className="flex items-center gap-2">
            {activeView === "studio" && <><Button variant="outline" size="icon" onClick={() => setShowShortcutHelp((value) => !value)} aria-expanded={showShortcutHelp} aria-controls="shortcut-help" className="h-10 w-10 rounded-xl border-[#3c2b20] bg-[#1a120e] text-[#efc194] hover:bg-[#271a13]" title="Show keyboard shortcuts"><Keyboard className="h-4 w-4" /></Button><Button variant="outline" size="icon" onClick={() => setSoundEnabled((value) => !value)} className="h-10 w-10 rounded-xl border-[#3c2b20] bg-[#1a120e] text-[#efc194] hover:bg-[#271a13]" title={soundEnabled ? "Turn sound off" : "Turn sound on"}>{soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</Button></>}
            {activeView !== "landing" ? <Button variant="outline" onClick={() => { setActiveView("landing"); setLandingWorkspace("code"); }} className="rounded-xl border-white/10 bg-white/5 text-xs text-white hover:bg-white/10">Back to workspace</Button> : landingWorkspace === "overview" ? <Button onClick={() => openLearningWorkspace("code")} className="rounded-xl bg-gradient-to-r from-indigo-400 to-cyan-300 px-5 text-xs font-black text-[#08101e] shadow-[0_0_28px_rgba(99,102,241,0.30)] hover:from-indigo-300 hover:to-cyan-200">Create a visual story <ArrowRight className="ml-1 h-4 w-4" /></Button> : null}
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

      {showShortcutHelp && <aside id="shortcut-help" role="dialog" aria-label="Keyboard shortcuts" className="fixed right-4 top-[4.8rem] z-[60] w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-amber-300/25 bg-[#17100d]/95 p-4 shadow-[0_24px_64px_rgba(0,0,0,0.55)] backdrop-blur-xl"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">Story controls</p><h2 className="mt-1 text-sm font-black text-white">Keyboard shortcuts</h2></div><Button variant="ghost" size="icon" onClick={() => setShowShortcutHelp(false)} className="h-8 w-8 rounded-xl text-[#c5ad98] hover:bg-white/10 hover:text-white" aria-label="Close shortcut help"><X className="h-4 w-4" /></Button></div><p className="mt-2 text-xs leading-relaxed text-[#aa9684]">Shortcuts work while viewing a story. They never interrupt typing in the editor.</p><div className="mt-4 space-y-2">{STORY_SHORTCUTS.map((shortcut) => <div key={shortcut.label} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0c0806] px-3 py-2"><span className="text-xs text-[#d8c4b2]">{shortcut.label}</span><kbd className="rounded-md border border-[#5e4432] bg-[#241711] px-2 py-1 font-mono text-[10px] font-bold text-amber-100">{shortcut.keys}</kbd></div>)}</div></aside>}

      {activeView === "landing" && (
        <main className={`lab-grid landing-mode-${landingWorkspace} mx-auto w-full max-w-7xl px-5 py-10 md:px-8 md:py-14`} data-learning-workspace={landingWorkspace}>
          <section data-learning-hero className="mx-auto grid max-w-6xl items-end gap-8 lg:grid-cols-[1.18fr_.82fr]">
            <div>
              <Badge className="rounded-full border border-indigo-300/25 bg-indigo-300/10 px-4 py-1.5 text-[11px] font-bold text-indigo-100">VISUAL PROGRAMMING FOR BEGINNERS</Badge>
              <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.06] tracking-[-0.045em] text-white md:text-6xl">Learn code by watching the <span className="bg-gradient-to-r from-indigo-200 via-sky-200 to-cyan-200 bg-clip-text text-transparent">idea move.</span></h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#aebad0] md:text-lg">One focused workspace for two kinds of learning: turn everyday code into a visual story, or build a map and watch algorithms make different decisions.</p>
              <div className="mt-7 flex flex-wrap gap-3"><Button onClick={() => openLearningWorkspace("code")} className="h-11 rounded-xl bg-gradient-to-r from-indigo-400 to-cyan-300 px-5 text-xs font-black text-[#08101e]">Start with my code <ArrowRight className="ml-2 h-4 w-4" /></Button><Button variant="outline" onClick={() => openLearningWorkspace("algorithms")} className="h-11 rounded-xl border-white/12 bg-white/[0.035] px-5 text-xs font-bold text-white hover:bg-white/10">Explore algorithms</Button></div>
            </div>
            <aside className="lab-surface rounded-[28px] p-5 md:p-6">
              <p className="lab-kicker">Your learning path</p><h2 className="mt-2 text-xl font-extrabold tracking-tight text-white">Pick a lens, not a complicated setup.</h2>
              <div className="mt-5 space-y-3"><div className="rounded-2xl border border-indigo-300/20 bg-indigo-300/7 p-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-300/15 text-lg">⌘</span><div><p className="text-xs font-extrabold text-white">Code story</p><p className="mt-0.5 text-[11px] text-[#aebad0]">Trace one line at a time with everyday analogies.</p></div></div></div><div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/6 p-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-300/15 text-lg">◈</span><div><p className="text-xs font-extrabold text-white">Algorithm lab</p><p className="mt-0.5 text-[11px] text-[#aebad0]">Compare routes, travel time, and choices on your own city map.</p></div></div></div></div>
              <div className="mt-5 flex items-center gap-3 border-t border-white/8 pt-4 text-[11px] text-[#91a0ba]"><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.9)]" /> Interactive, step-by-step, and built for exploration.</div>
            </aside>
          </section>

          {landingWorkspace === "overview" && <section className="mt-10 grid gap-4 md:grid-cols-2" aria-label="Choose your learning workspace">
            <button type="button" data-testid="open-code-studio" onClick={() => openLearningWorkspace("code")} className="lab-surface group rounded-[28px] p-6 text-left transition hover:-translate-y-1 hover:border-indigo-300/35"><div className="flex items-start justify-between gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-300/12 text-indigo-100"><Code2 className="h-6 w-6" /></div><span className="rounded-full border border-indigo-300/20 bg-indigo-300/10 px-3 py-1 text-[10px] font-bold text-indigo-100">ONE CODE IDEA</span></div><p className="mt-7 lab-kicker">01 · Code studio</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white">Turn code into a story you can follow.</h2><p className="mt-3 text-sm leading-relaxed text-[#aebad0]">Paste a small program, pick a visual world, and walk through every idea in plain English.</p><span className="mt-6 inline-flex items-center text-xs font-black text-indigo-100">Open Code Studio <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" /></span></button>
            <button type="button" data-testid="open-algorithm-lab" onClick={() => openLearningWorkspace("algorithms")} className="lab-surface group rounded-[28px] p-6 text-left transition hover:-translate-y-1 hover:border-cyan-300/35"><div className="flex items-start justify-between gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-300/12 text-cyan-100"><Lightbulb className="h-6 w-6" /></div><span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-bold text-cyan-100">CITY MAPS</span></div><p className="mt-7 lab-kicker">02 · Algorithm lab</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white">Build a route. Watch three strategies think.</h2><p className="mt-3 text-sm leading-relaxed text-[#aebad0]">Create a weighted city map, then compare BFS, DFS, and Dijkstra in one live workspace.</p><span className="mt-6 inline-flex items-center text-xs font-black text-cyan-100">Open Algorithm Lab <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" /></span></button>
          </section>}

          <section data-detailed-workspaces className="professional-workspace mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="lab-surface code-input-card relative overflow-hidden rounded-[28px] p-5 md:p-8" data-code-story-input>
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
              <div data-code-only className="relative flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl border border-indigo-300/20 bg-indigo-300/10 text-indigo-100"><Code2 className="h-5 w-5" /></div><div><p className="lab-kicker">Step 1 · Your code</p><h2 className="mt-1 text-lg font-extrabold tracking-tight text-white">Paste code. We make the story clear.</h2><p className="mt-1 text-xs text-[#a89787]">Use JavaScript, Python, C, or Java. A problem title is optional.</p></div></div>
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
                <details data-code-only className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><summary className="cursor-pointer text-xs font-bold text-[#dfc6ae] marker:text-amber-200">Need a quick example instead?</summary><div className="mt-3 grid gap-2 sm:grid-cols-2">{learningPresets.map((preset) => <button key={preset.name} onClick={() => { setUserProblem(preset.problem); setSelectedLang(preset.language); setUserCode(preset.code); setSelectedWalkthrough(preset.walkthrough ?? null); toast.success(`${preset.name} example loaded.`); }} className="group rounded-xl border border-white/10 bg-[#0c0806] p-3 text-left transition hover:border-amber-300/45 hover:bg-[#1b110b]"><span className="text-base">{preset.icon}</span><span className="ml-2 text-xs font-bold text-white">{preset.name}</span><span className="mt-1 block text-[10px] leading-relaxed text-[#a89787]">{preset.description}</span></button>)}</div></details>
              </div>
                <div data-code-only className="story-launch-pad relative mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/[0.055] p-4 sm:flex sm:items-center sm:justify-between"><div><p className="text-xs leading-5 text-[#dec7b0]"><strong className="text-amber-100">Ready when you are.</strong> We read your code, build a real-world scene, and explain one idea at a time.</p>{interpretStory.isPending && <p className="mt-2 flex items-center gap-2 text-[11px] font-bold text-amber-100" aria-live="polite" data-interpreter-progress><Sparkles className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />Preparing your story · {interpreterProgressMessages[interpreterProgressIndex]}</p>}</div><Button data-create-visual-story onClick={startVisualStory} disabled={interpretStory.isPending} className="create-story-button mt-3 h-12 w-full rounded-xl bg-gradient-to-r from-[#ffbd7d] via-[#e07834] to-[#c34d20] px-6 text-sm font-black text-[#170b06] shadow-[0_0_32px_rgba(229,155,99,0.33)] hover:scale-[1.01] disabled:cursor-wait disabled:opacity-70 sm:mt-0 sm:w-auto">{interpretStory.isPending ? "Building your story…" : "Create my visual story"} <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
            </div>

            <aside className="lab-surface code-path-card h-fit rounded-[28px] p-5" data-code-story-guide>
              <p className="lab-kicker">Your simple path</p><h2 className="mt-1 text-base font-extrabold tracking-tight text-white">One idea at a time.</h2>
              <div className="mt-5 space-y-3"><div className="rounded-2xl border border-indigo-300/20 bg-indigo-300/[0.07] p-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-indigo-200">1 · Paste code</p><p className="mt-1 text-xs leading-5 text-[#d9def0]">Start with the code you already have. No special format is needed.</p></div><div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-100">2 · See the idea</p><p className="mt-1 text-xs leading-5 text-[#ecd9c6]">We turn each important line into familiar objects and actions.</p></div><div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">3 · Understand it</p><p className="mt-1 text-xs leading-5 text-[#d8eee1]">Read the explanation in plain English and move at your own speed.</p></div></div>
              <details className="mt-5 border-t border-white/10 pt-4"><summary className="cursor-pointer text-xs font-bold text-[#d6c2ad]">Choose a visual setting</summary><div className="mt-3 grid grid-cols-3 gap-2">{visualThemes.map((theme) => <button key={theme.id} onClick={() => setVisualTheme(theme.id)} aria-pressed={visualTheme === theme.id} className={`rounded-xl border p-2 text-center text-[10px] font-bold transition ${visualTheme === theme.id ? "border-amber-300/65 bg-amber-300/10 text-amber-100" : "border-white/10 bg-[#0c0806] text-[#a89787] hover:text-white"}`}><span className="block text-base">{theme.icon}</span>{theme.shortLabel}</button>)}</div><p className="mt-2 text-[11px] leading-relaxed text-[#a89787]">{activeTheme.description}</p></details>
            </aside>
          </section>
        </main>
      )}

      {activeView === "studio" && currentStep && (
        <main className="lab-grid mx-auto w-full max-w-7xl px-5 py-7 md:px-8">
          <div className="lab-surface story-command-bar mb-5 flex flex-col justify-between gap-4 rounded-3xl p-5 md:flex-row md:items-center" data-code-story-workspace>
            <div><button type="button" onClick={() => { setIsPlaying(false); setActiveView("landing"); setLandingWorkspace("code"); }} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#cbb59f] transition hover:text-white"><ChevronLeft className="h-3.5 w-3.5" /> Edit code</button><p className="mt-3 lab-kicker">Your visual story · Step {currentStepIndex + 1} of {steps.length}</p><h1 className="mt-1 text-xl font-extrabold tracking-tight text-white">{userProblem || "Your code story"}</h1><p className="mt-1 text-xs text-[#a89787]">Watch the picture change, then read the same idea in simple English.</p></div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="story-progress mr-1 hidden min-w-32 sm:block" aria-label={`Story progress: step ${currentStepIndex + 1} of ${steps.length}`}>
                <div className="mb-1 flex justify-between text-[9px] font-bold uppercase tracking-[0.14em] text-[#aebad0]"><span>Progress</span><span>{Math.round(((currentStepIndex + 1) / steps.length) * 100)}%</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-indigo-300 to-cyan-300 transition-[width] duration-300" style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }} /></div>
              </div>
              <Button variant="outline" size="icon" onClick={() => goToStep(0)} aria-label="Restart story" className="h-10 w-10 rounded-xl border-[#3c2b20] bg-[#0c0806] text-[#f2c69b] hover:bg-[#251911]" title="Start again"><RotateCcw className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => goToStep(currentStepIndex - 1)} aria-label="Previous step" disabled={currentStepIndex === 0} className="h-10 w-10 rounded-xl border-[#3c2b20] bg-[#0c0806] text-[#f2c69b] hover:bg-[#251911]"><ChevronLeft className="h-4 w-4" /></Button>
              <Button onClick={() => setIsPlaying((value) => !value)} className="h-10 rounded-xl bg-gradient-to-r from-[#ffbd7d] to-[#d86527] px-5 text-xs font-black text-[#160b06]">{isPlaying ? <Pause className="mr-1.5 h-4 w-4" /> : <Play className="mr-1.5 h-4 w-4" />}{isPlaying ? "Pause story" : "Play story"}</Button>
              <Button variant="outline" size="icon" onClick={() => goToStep(currentStepIndex + 1)} aria-label="Next step" disabled={currentStepIndex === steps.length - 1} className="h-10 w-10 rounded-xl border-[#3c2b20] bg-[#0c0806] text-[#f2c69b] hover:bg-[#251911]"><ChevronRight className="h-4 w-4" /></Button>
              <label className="ml-1 flex items-center gap-2 text-[11px] text-[#a89787]">Speed <input aria-label="Story playback speed" type="range" min="1000" max="4200" step="400" value={speedMs} onChange={(event) => setSpeedMs(Number(event.target.value))} className="w-20 accent-[#f59e0b]" /></label>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-white/10 bg-[#0c0806]/75 px-4 py-3 text-xs text-[#c3b2a1]"><div className="flex flex-wrap items-center justify-between gap-3"><span><strong className="text-white">Today’s visual setting:</strong> {activeTheme.name} — {activeTheme.sceneHint}</span><details className="text-[11px]"><summary className="cursor-pointer font-bold text-[#dfc6ae]">More controls</summary><div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-wider text-[#8f7c6d]">Setting</span>{visualThemes.map((theme) => <button key={theme.id} onClick={() => setVisualTheme(theme.id)} aria-pressed={visualTheme === theme.id} className={`rounded-lg border px-2 py-1 text-[10px] font-bold transition ${visualTheme === theme.id ? "border-amber-300/60 bg-amber-300/10 text-amber-100" : "border-white/10 bg-[#0c0806] text-[#a89787] hover:text-white"}`}>{theme.icon} {theme.shortLabel}</button>)}<span className="ml-2 text-[10px] text-[#9e8a79]">Keys: {STORY_SHORTCUTS.map((shortcut) => shortcut.keys).join(" · ")}</span></div></details></div></div>

          <section className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
            <div className="lab-surface story-stage rounded-[28px] p-5 md:p-6">
              <SceneHeader story={currentStep.story} step={currentStep} />
              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,.86fr)_minmax(0,1.14fr)]">
                <div><div key={`scene-${currentStep.step}-${currentStep.story.kind}-${visualTheme}`} data-story-scene data-story-step={currentStep.step}><RealWorldScene story={currentStep.story} visualTheme={visualTheme} routeState={currentStep.routeState} /></div>
                  <div className="story-scene-brief mt-4" data-story-visual-focus>
                    <div className="flex min-w-0 items-start gap-3"><div className="story-scene-brief-icon"><Box className="h-4 w-4" /></div><div className="min-w-0"><p className="story-scene-brief-label">Scene focus</p><p className="mt-1 text-xs leading-5 text-[#d5def2]">{currentStep.story.visualFocus ?? `Follow the ${currentStep.story.objectLabel} as this ${sceneStyles[currentStep.story.kind].label} changes.`}</p></div></div>
                    <div className="story-scene-object"><span>Highlighted object</span><strong>{currentStep.story.objectLabel}</strong></div>
                  </div>
                </div>
                <CinematicScenePanel scene={cinematicScenes[currentCinematicKey]} status={cinematicSceneStatus[currentCinematicKey]} />
              </div>
            </div>

            <div className="lab-surface story-explanation-panel rounded-[28px] p-5 md:p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4"><div className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-indigo-200" /><div><p className="lab-kicker">Live explanation</p><h2 className="mt-1 text-sm font-bold text-white">What the computer is doing</h2></div></div><Badge className="rounded-full border border-indigo-300/25 bg-indigo-300/10 px-3 py-1 text-[10px] font-bold text-indigo-100">Line {currentStep.line}</Badge></div>
              <div data-active-code-line={currentStep.line} className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4"><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">The code says</p><span className="rounded-full border border-amber-200/20 bg-amber-100/10 px-2 py-1 text-[10px] font-bold text-amber-100">Active line</span></div><code className="mt-2 block whitespace-pre-wrap break-words font-mono text-xs leading-6 text-[#f9e9d5]">{currentStep.code}</code></div>
              <details className="mt-3 rounded-2xl border border-white/10 bg-[#0c0806]/65 p-3"><summary className="cursor-pointer select-none text-xs font-bold text-[#d8c4b2] marker:text-indigo-200">View your full code <span className="ml-1 font-normal text-[#9a8777]">· Line {currentStep.line} is highlighted</span></summary><ol className="mt-3 overflow-hidden rounded-xl border border-white/8 bg-[#080605] py-1 font-mono text-[11px] leading-6">{getStoryCodeLines(userCode, currentStep.line).map((line) => <li key={line.lineNumber} data-code-line={line.lineNumber} data-active={line.isActive} className={`grid grid-cols-[2.4rem_minmax(0,1fr)] gap-3 px-3 transition-colors ${line.isActive ? "bg-amber-300/12 text-amber-50" : "text-[#a89584]"}`}><span className={`text-right text-[10px] ${line.isActive ? "font-black text-amber-200" : "text-[#6f6055]"}`}>{line.lineNumber}</span><code className="whitespace-pre-wrap break-words">{line.text || " "}</code></li>)}</ol></details>
              <div key={`explanation-${currentStep.step}`} data-story-explanation aria-live="polite" className="explanation-enter mt-4 rounded-2xl border border-[#3d2c21] bg-gradient-to-br from-[#1c120c] to-[#0c0806] p-5 shadow-[0_18px_36px_rgba(0,0,0,0.18)]"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#f2bc89]">In everyday words</p><p className="mt-2 text-base font-semibold leading-8 text-white">{currentStep.story.plainEnglish}</p></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/5 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">What changed</p><p className="mt-2 text-xs leading-5 text-[#d7efe2]">{currentStep.story.whatChanged}</p></div><div className="rounded-2xl border border-sky-300/15 bg-sky-300/5 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-200">Everyday example</p><p className="mt-2 text-xs leading-5 text-[#d9eff8]">{currentStep.story.analogy}</p></div></div>
              <div className="mt-5"><p className="lab-kicker">Learning timeline</p><div className="mt-3 max-h-[265px] space-y-2 overflow-y-auto pr-1">{steps.map((step, index) => { const isActive = index === currentStepIndex; return <button key={`${step.line}-${step.code}`} onClick={() => goToStep(index)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${isActive ? "border-indigo-300/60 bg-indigo-300/10 shadow-[0_0_20px_rgba(129,140,248,0.13)]" : "border-white/10 bg-[#0c0806] hover:border-indigo-300/30 hover:bg-indigo-300/5"}`}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/5 text-lg">{step.story.icon}</span><span className="min-w-0 flex-1"><span className={`block text-xs font-bold ${isActive ? "text-white" : "text-[#d4c1b0]"}`}>Step {step.step}: {step.story.title}</span><span className="mt-0.5 block truncate font-mono text-[10px] text-[#8f7c6d]">Line {step.line}: {step.code}</span></span>{isActive && <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-200" />}</button>; })}</div></div>
            </div>
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
