import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, SkipForward, SkipBack, RotateCcw, 
  Code2, Cpu, Box, Terminal, Layers, Sparkles, BookOpen, ArrowRight, Zap, Network, GitBranch, Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

interface MemoryNode {
  id: string;
  label: string;
  type: 'stack' | 'heap' | 'pointer' | 'class';
  value: any;
  address?: string;
}

interface ExecutionStep {
  step: number;
  line: number;
  code: string;
  explanation: string;
  variables: Record<string, any>;
  memory: MemoryNode[];
  activePointers: string[];
}

interface TopicPreset {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  description: string;
  code: string;
  steps: ExecutionStep[];
}

const TOPIC_PRESETS: Record<string, TopicPreset> = {
  recursion: {
    id: "recursion",
    title: "Recursive Call Stack",
    subtitle: "Fractals & Function Frames",
    icon: GitBranch,
    color: "from-amber-500 to-orange-600",
    description: "Explore the elegant world of recursive functions, where complex problems break down into simpler, self-similar patterns.",
    code: `function factorial(n) {
    if (n === 1) return 1;
    return n * factorial(n - 1);
}
let result = factorial(3);`,
    steps: [
      {
        step: 1, line: 1, code: "function factorial(n) { ... }",
        explanation: "Declared recursive function 'factorial' in code segment.",
        variables: { function: "factorial" },
        memory: [{ id: "fn", label: "Code Segment", type: "class", value: "factorial(n)" }],
        activePointers: []
      },
      {
        step: 2, line: 6, code: "let result = factorial(3);",
        explanation: "Initial call: factorial(3) pushed to Stack. n = 3.",
        variables: { n: 3 },
        memory: [
          { id: "stack_1", label: "Stack Frame #1", type: "stack", value: "factorial(n=3)", address: "0x7FFF1" }
        ],
        activePointers: ["SP -> factorial(3)"]
      },
      {
        step: 3, line: 3, code: "return n * factorial(n - 1);",
        explanation: "Recursive call: factorial(2) pushed to Stack on top of factorial(3).",
        variables: { n: 2 },
        memory: [
          { id: "stack_1", label: "Stack Frame #1", type: "stack", value: "factorial(3)", address: "0x7FFF1" },
          { id: "stack_2", label: "Stack Frame #2", type: "stack", value: "factorial(2)", address: "0x7FFF2" }
        ],
        activePointers: ["SP -> factorial(2)"]
      },
      {
        step: 4, line: 2, code: "if (n === 1) return 1;",
        explanation: "Base case reached in factorial(1). Unwinding stack frames with return value 6.",
        variables: { result: 6 },
        memory: [
          { id: "heap_res", label: "Computed Result", type: "heap", value: "6", address: "0x7FF0" }
        ],
        activePointers: ["Unwound all stack frames -> return 6"]
      }
    ]
  },
  linkedList: {
    id: "linkedList",
    title: "Linked Lists",
    subtitle: "Dynamic Memory Chain",
    icon: Network,
    color: "from-blue-500 to-indigo-600",
    description: "Journey through linked lists where elements flow in an elegant chain of connections across non-contiguous heap memory.",
    code: `class Node {
    constructor(val) {
        this.val = val;
        this.next = null;
    }
}
let head = new Node(10);
let second = new Node(20);
head.next = second;`,
    steps: [
      {
        step: 1, line: 1, code: "class Node { constructor(val) { ... } }",
        explanation: "Declared class 'Node' blueprint in memory.",
        variables: { Class: "Node" },
        memory: [{ id: "cls", label: "Node Blueprint", type: "class", value: "{val, next}" }],
        activePointers: []
      },
      {
        step: 2, line: 7, code: "let head = new Node(10);",
        explanation: "Allocated new Node object in Heap memory at address 0x7F10. Stack variable 'head' points to it.",
        variables: { head: "0x7F10" },
        memory: [
          { id: "h_var", label: "head (Stack)", type: "stack", value: "0x7F10" },
          { id: "obj1", label: "Node 1 (Heap)", type: "heap", value: "val: 10, next: null", address: "0x7F10" }
        ],
        activePointers: ["head -> 0x7F10"]
      },
      {
        step: 3, line: 8, code: "let second = new Node(20);",
        explanation: "Allocated second Node object in Heap memory at address 0x7F24.",
        variables: { head: "0x7F10", second: "0x7F24" },
        memory: [
          { id: "h_var", label: "head (Stack)", type: "stack", value: "0x7F10" },
          { id: "s_var", label: "second (Stack)", type: "stack", value: "0x7F24" },
          { id: "obj1", label: "Node 1 (Heap)", type: "heap", value: "val: 10, next: null", address: "0x7F10" },
          { id: "obj2", label: "Node 2 (Heap)", type: "heap", value: "val: 20, next: null", address: "0x7F24" }
        ],
        activePointers: ["head -> 0x7F10", "second -> 0x7F24"]
      },
      {
        step: 4, line: 9, code: "head.next = second;",
        explanation: "Linked Node 1 to Node 2 by setting head.next = 0x7F24.",
        variables: { head: "0x7F10", second: "0x7F24" },
        memory: [
          { id: "h_var", label: "head (Stack)", type: "stack", value: "0x7F10" },
          { id: "obj1", label: "Node 1 (Heap)", type: "heap", value: "val: 10, next: 0x7F24", address: "0x7F10" },
          { id: "obj2", label: "Node 2 (Heap)", type: "heap", value: "val: 20, next: null", address: "0x7F24" }
        ],
        activePointers: ["0x7F10.next -> 0x7F24"]
      }
    ]
  },
  arrays2d: {
    id: "arrays2d",
    title: "2D Arrays & Matrices",
    subtitle: "Rows & Columns Grid",
    icon: Database,
    color: "from-emerald-500 to-teal-600",
    description: "Step into 2D arrays where data comes alive in matrices, powering image processing and tile-based games.",
    code: `let matrix = [
    [1, 2, 3],
    [4, 5, 6]
];
let val = matrix[1][2]; // 6`,
    steps: [
      {
        step: 1, line: 1, code: "let matrix = [ [1,2,3], [4,5,6] ];",
        explanation: "Allocated 2D matrix array in memory with 2 rows and 3 columns.",
        variables: { rows: 2, cols: 3 },
        memory: [
          { id: "row0", label: "Row 0 (Heap)", type: "heap", value: "[1, 2, 3]", address: "0xA100" },
          { id: "row1", label: "Row 1 (Heap)", type: "heap", value: "[4, 5, 6]", address: "0xA10C" }
        ],
        activePointers: ["matrix -> 0xA100"]
      },
      {
        step: 2, line: 5, code: "let val = matrix[1][2];",
        explanation: "Accessed row index 1 and column index 2. Retrieved value: 6.",
        variables: { row: 1, col: 2, val: 6 },
        memory: [
          { id: "row0", label: "Row 0", type: "heap", value: "[1, 2, 3]", address: "0xA100" },
          { id: "row1", label: "Row 1 (Active)", type: "heap", value: "[4, 5, [6]]", address: "0xA10C" }
        ],
        activePointers: ["matrix[1][2] -> 6"]
      }
    ]
  }
};

export default function Home() {
  const { user } = useAuth();
  const saveSubmission = trpc.submissions.save.useMutation({
    onSuccess: () => toast.success("Visualization session saved to database!"),
    onError: (err: any) => toast.error("Failed to save: " + err.message)
  });

  const [activeView, setActiveView] = useState<'landing' | 'visualizer'>('landing');
  const [selectedTopicKey, setSelectedTopicKey] = useState<string>('recursion');
  const topic = TOPIC_PRESETS[selectedTopicKey] || TOPIC_PRESETS.recursion;

  const [currentCode, setCurrentCode] = useState<string>(topic.code);
  const [steps, setSteps] = useState<ExecutionStep[]>(topic.steps);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMs, setSpeedMs] = useState<number>(1500);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentStep = steps[currentStepIndex] || steps[0];

  const handleSelectTopic = (key: string) => {
    setSelectedTopicKey(key);
    const t = TOPIC_PRESETS[key];
    if (t) {
      setCurrentCode(t.code);
      setSteps(t.steps);
      setCurrentStepIndex(0);
      setIsPlaying(false);
      setActiveView('visualizer');
      saveSubmission.mutate({
        problemTitle: t.title,
        language: "javascript",
        code: t.code
      });
    }
  };

  // Playback loop
  useEffect(() => {
    if (isPlaying && activeView === 'visualizer') {
      playIntervalRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev < steps.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            if (playIntervalRef.current) clearInterval(playIntervalRef.current);
            return prev;
          }
        });
      }, speedMs);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, speedMs, steps.length, activeView]);

  // Render 2D Canvas Graphics
  useEffect(() => {
    if (activeView !== 'visualizer') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 700;
    canvas.height = 360;

    // Background
    ctx.fillStyle = "#0d0a08";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid pattern
    ctx.strokeStyle = "#1a1410";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const memory = currentStep.memory || [];
    let startX = 50;
    let startY = 70;

    memory.forEach((node, index) => {
      const isHeap = node.type === 'heap';
      const boxWidth = 200;
      const boxHeight = 80;
      const x = startX + (index % 3) * 230;
      const y = startY + Math.floor(index / 3) * 110;

      ctx.shadowColor = isHeap ? "rgba(56, 189, 248, 0.4)" : "rgba(229, 155, 99, 0.4)";
      ctx.shadowBlur = 12;

      ctx.fillStyle = isHeap ? "#0f172a" : "#1c1612";
      ctx.strokeStyle = isHeap ? "#38bdf8" : "#e59b63";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(x, y, boxWidth, boxHeight, 10);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = isHeap ? "#38bdf8" : "#e59b63";
      ctx.font = "bold 11px monospace";
      ctx.fillText(node.label.toUpperCase(), x + 12, y + 22);

      if (node.address) {
        ctx.fillStyle = "#94a3b8";
        ctx.font = "10px monospace";
        ctx.fillText(`Addr: ${node.address}`, x + 115, y + 22);
      }

      ctx.strokeStyle = "#2d241c";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 32);
      ctx.lineTo(x + boxWidth - 10, y + 32);
      ctx.stroke();

      ctx.fillStyle = "#f4ede2";
      ctx.font = "12px monospace";
      ctx.fillText(String(node.value), x + 12, y + 56);
    });

    // Pointers
    ctx.strokeStyle = "#34d399";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    currentStep.activePointers?.forEach((ptr, idx) => {
      ctx.fillStyle = "#34d399";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`⚡ ${ptr}`, 50, canvas.height - 25 - idx * 22);
    });
    ctx.setLineDash([]);

  }, [currentStep, activeView]);

  return (
    <div className="min-h-screen bg-[#110e0b] text-[#f4ede2] flex flex-col font-sans selection:bg-[#e59b63]/30">
      
      {/* Header */}
      <header className="h-16 border-b border-[#2a221a] bg-[#16120e] px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveView('landing')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#e59b63] to-[#b85d23] flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-lg bg-gradient-to-r from-white via-[#f4ede2] to-[#e59b63] bg-clip-text text-transparent">
              Staying.fun Code Studio
            </span>
            <span className="text-[10px] text-[#9c8b7c] block -mt-1 font-mono">Interactive DSA & 2D Visualizer</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {activeView === 'visualizer' ? (
            <Button 
              variant="outline"
              onClick={() => setActiveView('landing')}
              className="text-xs bg-[#1c1612] border-[#382d23] text-[#f4ede2] hover:bg-[#2a2119]"
            >
              ← Back to Topics
            </Button>
          ) : (
            <Button 
              onClick={() => handleSelectTopic('recursion')}
              className="bg-gradient-to-r from-[#e59b63] to-[#c76e33] text-[#110e0b] font-bold text-xs h-9 px-4 shadow"
            >
              Launch Playground <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          )}
        </div>
      </header>

      {/* LANDING PAGE (staying.fun style) */}
      {activeView === 'landing' && (
        <main className="flex-1 px-8 py-12 max-w-7xl mx-auto w-full space-y-16 animate-in fade-in duration-300">
          
          {/* Hero Section */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <Badge variant="outline" className="bg-[#221c16] border-[#382d23] text-[#e59b63] px-3 py-1 text-xs">
              ✨ Learn Faster, Code Smarter with 2D Visuals
            </Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Interactive Algorithms & <span className="bg-gradient-to-r from-[#e59b63] to-[#f0a872] bg-clip-text text-transparent">Memory Visualizations</span>
            </h1>
            <p className="text-sm md:text-base text-[#b09e90] leading-relaxed">
              Explore recursive functions, linked lists, and matrices through real-time stack & heap memory allocations. Watch step-by-step executions come alive in 2D.
            </p>
          </div>

          {/* Topics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(TOPIC_PRESETS).map(([key, item]) => {
              const Icon = item.icon;
              return (
                <div 
                  key={key}
                  onClick={() => handleSelectTopic(key)}
                  className="bg-[#16120d] border border-[#2d241c] hover:border-[#e59b63]/50 rounded-2xl p-6 shadow-xl transition-all cursor-pointer flex flex-col justify-between group hover:-translate-y-1"
                >
                  <div className="space-y-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-[#e59b63] transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#9c8b7c] mt-0.5">{item.subtitle}</p>
                    </div>
                    <p className="text-xs text-[#b09e90] leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-b-0 border-t border-[#261f18] flex items-center justify-between text-xs text-[#e59b63] font-semibold">
                    <span>Visualize in 2D</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>

        </main>
      )}

      {/* VISUALIZER DUAL-PANE PLAYGROUND */}
      {activeView === 'visualizer' && (
        <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
          
          {/* Left Panel: Code Editor */}
          <div className="lg:col-span-5 bg-[#16120d] border border-[#2d241c] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#261f18]">
                <div className="flex items-center space-x-2">
                  <Code2 className="w-4 h-4 text-[#e59b63]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-white">
                    {topic.title} - Code Editor
                  </span>
                </div>
                <Badge variant="outline" className="bg-[#221c16] border-[#382d23] text-[#e59b63] font-mono text-[10px]">
                  ES6 / JS
                </Badge>
              </div>

              <p className="text-xs text-[#9c8b7c] mb-3">
                {topic.description}
              </p>

              <Textarea 
                value={currentCode}
                onChange={(e) => setCurrentCode(e.target.value)}
                rows={12}
                className="bg-[#120e0a] border-[#382d23] text-white font-mono text-xs leading-relaxed resize-y p-3"
              />
            </div>

            <div className="mt-4 pt-3 border-t border-[#261f18] flex items-center justify-between">
              <Button 
                variant="outline"
                onClick={() => {
                  setCurrentCode(topic.code);
                  setSteps(topic.steps);
                  setCurrentStepIndex(0);
                  setIsPlaying(false);
                }}
                className="text-xs bg-[#1c1612] border-[#382d23] text-[#f4ede2] hover:bg-[#2a2119]"
              >
                Reset Code
              </Button>
              <Button 
                onClick={() => {
                  toast.success("Code parsed & memory states re-rendered!");
                }}
                className="bg-gradient-to-r from-[#e59b63] to-[#c76e33] hover:from-[#f0a872] hover:to-[#d87c3e] text-[#110e0b] font-bold text-xs shadow"
              >
                Re-Run Analysis
              </Button>
            </div>
          </div>

          {/* Right Panel: 2D Canvas & Explanation */}
          <div className="lg:col-span-7 flex flex-col space-y-5">
            
            {/* Control Bar */}
            <div className="bg-[#16120d] border border-[#2d241c] rounded-xl px-5 py-3 flex items-center justify-between shadow-lg">
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => { setIsPlaying(false); setCurrentStepIndex(0); }}
                  className="w-8 h-8 bg-[#1c1612] border-[#382d23] text-[#f4ede2] hover:bg-[#2a2119]"
                  title="Reset"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => { setIsPlaying(false); setCurrentStepIndex(prev => Math.max(0, prev - 1)); }}
                  className="w-8 h-8 bg-[#1c1612] border-[#382d23] text-[#f4ede2] hover:bg-[#2a2119]"
                  title="Step Backward"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </Button>
                <Button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="bg-[#e59b63] hover:bg-[#f0a872] text-[#110e0b] font-bold text-xs h-8 px-4 shadow"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                  {isPlaying ? "Pause" : "Play"}
                </Button>
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => { setIsPlaying(false); setCurrentStepIndex(prev => Math.min(steps.length - 1, prev + 1)); }}
                  className="w-8 h-8 bg-[#1c1612] border-[#382d23] text-[#f4ede2] hover:bg-[#2a2119]"
                  title="Step Forward"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="flex items-center space-x-3 text-xs">
                <span className="text-[#9c8b7c]">Speed:</span>
                <input 
                  type="range" 
                  min={500} 
                  max={3000} 
                  step={250}
                  value={speedMs}
                  onChange={(e) => setSpeedMs(Number(e.target.value))}
                  className="w-24 accent-[#e59b63] bg-[#261e17] h-2 rounded-lg cursor-pointer"
                />
                <Badge variant="outline" className="bg-[#221c16] border-[#382d23] text-[#e59b63] font-mono text-[10px]">
                  Step {currentStepIndex + 1} / {steps.length}
                </Badge>
              </div>
            </div>

            {/* 2D Interactive Canvas */}
            <div className="bg-[#16120d] border border-[#2d241c] rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Box className="w-4 h-4 text-[#e59b63]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-white">
                    2D Stack & Heap Memory Canvas
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] font-mono text-[#9c8b7c]">
                  <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-[#e59b63] mr-1"></span> Stack</span>
                  <span className="flex items-center ml-2"><span className="w-2 h-2 rounded-full bg-[#38bdf8] mr-1"></span> Heap</span>
                </div>
              </div>

              <div className="w-full h-[360px] bg-[#0d0a08] border border-[#261e17] rounded-xl overflow-hidden relative shadow-inner">
                <canvas ref={canvasRef} className="w-full h-full block" />
              </div>
            </div>

            {/* Explanation Panel */}
            <div className="bg-[#16120d] border border-[#2d241c] rounded-2xl p-5 shadow-xl flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#261f18]">
                <span className="text-xs font-semibold tracking-wider uppercase text-[#e59b63] flex items-center">
                  <Terminal className="w-4 h-4 mr-2" />
                  Synchronized Narrative & Memory Breakdown
                </span>
                <span className="font-mono text-xs text-white bg-[#221c16] px-2.5 py-1 rounded border border-[#382d23]">
                  Line {currentStep.line}
                </span>
              </div>

              <div className="bg-[#120e0a] border border-[#261f18] p-3.5 rounded-xl text-xs font-mono text-[#f4ede2] leading-relaxed">
                <span className="text-[#e59b63] font-bold">Code:</span> {currentStep.code}
              </div>

              <p className="text-xs text-[#b09e90] leading-relaxed">
                💡 <span className="font-medium text-[#f4ede2]">{currentStep.explanation}</span>
              </p>

              <div className="grid grid-cols-3 gap-2 pt-2">
                {Object.entries(currentStep.variables || {}).map(([key, val]) => (
                  <div key={key} className="bg-[#120e0a] border border-[#261f18] p-2.5 rounded-xl">
                    <div className="text-[10px] text-[#8a796c] uppercase font-mono">{key}</div>
                    <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5 truncate">{String(val)}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </main>
      )}

    </div>
  );
}
