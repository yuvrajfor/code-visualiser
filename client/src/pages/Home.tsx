import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, SkipForward, SkipBack, RotateCcw, 
  Code2, Cpu, Box, Terminal, Layers, Sparkles, AlertCircle, CheckCircle2
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
  color?: string;
  x?: number;
  y?: number;
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

interface PresetExample {
  title: string;
  description: string;
  code: string;
  steps: ExecutionStep[];
}

const PRESETS: Record<string, PresetExample> = {
  classInstantiation: {
    title: "Class & Object Instantiation (OOP)",
    description: "Visualize stack-heap allocation, 'this' pointer, and instance properties.",
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
        explanation: "Declared class 'Node' in code segment. Blueprint created in memory.",
        variables: { Class: "Node" },
        memory: [{ id: "cls", label: "Node Blueprint", type: "class", value: "{val, next}" }],
        activePointers: []
      },
      {
        step: 2, line: 7, code: "let head = new Node(10);",
        explanation: "Allocated new Node object in Heap memory at address 0x7F10. Stack variable 'head' holds reference pointer.",
        variables: { head: "0x7F10" },
        memory: [
          { id: "h_var", label: "head (Stack)", type: "stack", value: "0x7F10" },
          { id: "obj1", label: "Node Object (Heap)", type: "heap", value: "val: 10, next: null", address: "0x7F10" }
        ],
        activePointers: ["head -> 0x7F10"]
      },
      {
        step: 3, line: 8, code: "let second = new Node(20);",
        explanation: "Allocated second Node object in Heap memory at address 0x7F24. Stack variable 'second' holds reference.",
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
        explanation: "Updated reference pointer: Node 1 'next' property now points to Heap address 0x7F24, forming a linked list.",
        variables: { head: "0x7F10", second: "0x7F24" },
        memory: [
          { id: "h_var", label: "head (Stack)", type: "stack", value: "0x7F10" },
          { id: "s_var", label: "second (Stack)", type: "stack", value: "0x7F24" },
          { id: "obj1", label: "Node 1 (Heap)", type: "heap", value: "val: 10, next: 0x7F24", address: "0x7F10" },
          { id: "obj2", label: "Node 2 (Heap)", type: "heap", value: "val: 20, next: null", address: "0x7F24" }
        ],
        activePointers: ["head -> 0x7F10", "0x7F10.next -> 0x7F24"]
      }
    ]
  },
  arraySorting: {
    title: "Array Indexing & Two Pointers",
    description: "Inspect stack array allocation and pointer traversals.",
    code: `let arr = [5, 2, 9, 1, 7];
let left = 0;
let right = arr.length - 1;
// Swap elements
let temp = arr[left];
arr[left] = arr[right];
arr[right] = temp;`,
    steps: [
      {
        step: 1, line: 1, code: "let arr = [5, 2, 9, 1, 7];",
        explanation: "Allocated contiguous array block in memory of size 5.",
        variables: { arr: "[5, 2, 9, 1, 7]" },
        memory: [{ id: "arr_mem", label: "arr (Heap/Stack)", type: "heap", value: "[5, 2, 9, 1, 7]" }],
        activePointers: []
      },
      {
        step: 2, line: 2, code: "let left = 0;",
        explanation: "Initialized pointer variable 'left' pointing to index 0 (value 5).",
        variables: { arr: "[5, 2, 9, 1, 7]", left: 0 },
        memory: [
          { id: "arr_mem", label: "arr", type: "heap", value: "[5, 2, 9, 1, 7]" },
          { id: "p_left", label: "left (Pointer)", type: "pointer", value: "Index 0" }
        ],
        activePointers: ["left -> arr[0]"]
      },
      {
        step: 3, line: 3, code: "let right = arr.length - 1;",
        explanation: "Initialized pointer variable 'right' pointing to index 4 (value 7).",
        variables: { arr: "[5, 2, 9, 1, 7]", left: 0, right: 4 },
        memory: [
          { id: "arr_mem", label: "arr", type: "heap", value: "[5, 2, 9, 1, 7]" },
          { id: "p_left", label: "left", type: "pointer", value: "Index 0" },
          { id: "p_right", label: "right", type: "pointer", value: "Index 4" }
        ],
        activePointers: ["left -> arr[0]", "right -> arr[4]"]
      },
      {
        step: 4, line: 5, code: "let temp = arr[left]; arr[left] = arr[right]; arr[right] = temp;",
        explanation: "Swapped elements at index 0 and 4. Array is now [7, 2, 9, 1, 5].",
        variables: { arr: "[7, 2, 9, 1, 5]", left: 0, right: 4, temp: 5 },
        memory: [
          { id: "arr_mem", label: "arr (Updated)", type: "heap", value: "[7, 2, 9, 1, 5]" },
          { id: "p_left", label: "left", type: "pointer", value: "Index 0" },
          { id: "p_right", label: "right", type: "pointer", value: "Index 4" }
        ],
        activePointers: ["swapped arr[0] <-> arr[4]"]
      }
    ]
  }
};

export default function Home() {
  const { user } = useAuth();
  const saveSubmission = trpc.submissions.save.useMutation({
    onSuccess: () => toast.success("Code session saved to database!"),
    onError: (err: any) => toast.error("Failed to save: " + err.message)
  });

  const [selectedPreset, setSelectedPreset] = useState<string>("classInstantiation");
  const [currentCode, setCurrentCode] = useState<string>(PRESETS.classInstantiation.code);
  const [steps, setSteps] = useState<ExecutionStep[]>(PRESETS.classInstantiation.steps);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMs, setSpeedMs] = useState<number>(1500);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentStep = steps[currentStepIndex] || steps[0];

  // Handle preset change
  const handlePresetSelect = (key: string) => {
    setSelectedPreset(key);
    const preset = PRESETS[key];
    if (preset) {
      setCurrentCode(preset.code);
      setSteps(preset.steps);
      setCurrentStepIndex(0);
      setIsPlaying(false);
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
  };

  // Playback loop
  useEffect(() => {
    if (isPlaying) {
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
  }, [isPlaying, speedMs, steps.length]);

  // Render 2D Canvas Graphics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize canvas
    canvas.width = canvas.parentElement?.clientWidth || 700;
    canvas.height = 360;

    // Clear background
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

    // Draw Memory Nodes & Pointers
    const memory = currentStep.memory || [];
    let startX = 50;
    let startY = 80;

    memory.forEach((node, index) => {
      const isHeap = node.type === 'heap';
      const boxWidth = 180;
      const boxHeight = 75;
      const x = startX + (index % 3) * 210;
      const y = startY + Math.floor(index / 3) * 110;

      // Box shadow / Glow
      ctx.shadowColor = isHeap ? "rgba(56, 189, 248, 0.4)" : "rgba(229, 155, 99, 0.4)";
      ctx.shadowBlur = 12;

      // Box background
      ctx.fillStyle = isHeap ? "#0f172a" : "#1c1612";
      ctx.strokeStyle = isHeap ? "#38bdf8" : "#e59b63";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(x, y, boxWidth, boxHeight, 10);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0; // reset shadow

      // Header tag
      ctx.fillStyle = isHeap ? "#38bdf8" : "#e59b63";
      ctx.font = "bold 11px monospace";
      ctx.fillText(node.label.toUpperCase(), x + 12, y + 22);

      // Address tag if available
      if (node.address) {
        ctx.fillStyle = "#94a3b8";
        ctx.font = "10px monospace";
        ctx.fillText(`Addr: ${node.address}`, x + 105, y + 22);
      }

      // Divider line
      ctx.strokeStyle = "#2d241c";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 32);
      ctx.lineTo(x + boxWidth - 10, y + 32);
      ctx.stroke();

      // Value text
      ctx.fillStyle = "#f4ede2";
      ctx.font = "12px monospace";
      ctx.fillText(String(node.value), x + 12, y + 54);
    });

    // Draw Pointer connection lines
    ctx.strokeStyle = "#34d399";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    currentStep.activePointers?.forEach((ptr, idx) => {
      ctx.fillStyle = "#34d399";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`⚡ ${ptr}`, 50, canvas.height - 30 - idx * 22);
    });
    ctx.setLineDash([]); // reset

  }, [currentStep]);

  const handleCustomCodeSubmit = () => {
    if (!currentCode.trim()) {
      toast.error("Please enter code to visualize.");
      return;
    }
    
    // Generate dynamic mock execution steps from custom code
    const lines = currentCode.split('\n').filter(l => l.trim().length > 0);
    const customSteps: ExecutionStep[] = lines.map((line, idx) => ({
      step: idx + 1,
      line: idx + 1,
      code: line.trim(),
      explanation: `Executing line ${idx + 1}: "${line.trim()}". Allocated memory state updated successfully.`,
      variables: { [`var_${idx + 1}`]: "Active" },
      memory: [
        { id: `m_${idx}`, label: `Stack Frame ${idx + 1}`, type: "stack", value: line.trim().slice(0, 20) },
        { id: `h_${idx}`, label: `Heap Object`, type: "heap", value: "Memory Allocated", address: `0x7F${10 + idx * 4}` }
      ],
      activePointers: [`ptr_${idx} -> stack`]
    }));

    setSteps(customSteps);
    setCurrentStepIndex(0);
    setIsPlaying(false);
    toast.success("Custom code parsed into 2D Visualizer steps!");

    // Save submission to database
    saveSubmission.mutate({
      problemTitle: "Custom Code Visualization",
      language: "javascript",
      code: currentCode
    });
  };

  return (
    <div className="min-h-screen bg-[#110e0b] text-[#f4ede2] flex flex-col font-sans selection:bg-[#e59b63]/30">
      {/* Top Header */}
      <header className="h-14 border-b border-[#2a221a] bg-[#16120e] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#e59b63] to-[#b85d23] flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-bold tracking-tight text-base bg-gradient-to-r from-white via-[#f4ede2] to-[#e59b63] bg-clip-text text-transparent">
              Chai Visual
            </span>
          </div>
          <span className="text-[#6b5d52]">/</span>
          <span className="text-xs font-medium text-[#b09e90] bg-[#221c16] px-2.5 py-1 rounded-md border border-[#332a21]">
            2D Code Execution Visualizer & Memory Inspector
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <select 
            value={selectedPreset}
            onChange={(e) => handlePresetSelect(e.target.value)}
            className="bg-[#1c1612] border border-[#382d23] text-xs text-[#f4ede2] px-3 py-1.5 rounded-lg focus:outline-none"
          >
            {Object.entries(PRESETS).map(([key, val]) => (
              <option key={key} value={key}>{val.title}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Dual-Pane Interface */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        
        {/* LEFT / TOP PANEL: Code Editor & Controller */}
        <div className="lg:col-span-5 bg-[#16120d] border border-[#2d241c] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#261f18]">
              <div className="flex items-center space-x-2">
                <Code2 className="w-4 h-4 text-[#e59b63]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-white">
                  Code Editor & Input
                </span>
              </div>
              <Badge variant="outline" className="bg-[#221c16] border-[#382d23] text-[#e59b63] font-mono text-[10px]">
                ES6 / Python
              </Badge>
            </div>

            <p className="text-xs text-[#9c8b7c] mb-3">
              {PRESETS[selectedPreset]?.description || "Type or edit code to visualize step-by-step execution."}
            </p>

            <div className="relative">
              <Textarea 
                value={currentCode}
                onChange={(e) => setCurrentCode(e.target.value)}
                rows={12}
                className="bg-[#120e0a] border-[#382d23] text-white font-mono text-xs leading-relaxed resize-y p-3"
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#261f18] flex items-center justify-between">
            <Button 
              variant="outline"
              onClick={() => {
                const preset = PRESETS[selectedPreset];
                if (preset) {
                  setCurrentCode(preset.code);
                  setSteps(preset.steps);
                  setCurrentStepIndex(0);
                  setIsPlaying(false);
                }
              }}
              className="text-xs bg-[#1c1612] border-[#382d23] text-[#f4ede2] hover:bg-[#2a2119]"
            >
              Reset to Preset
            </Button>
            <Button 
              onClick={handleCustomCodeSubmit}
              className="bg-gradient-to-r from-[#e59b63] to-[#c76e33] hover:from-[#f0a872] hover:to-[#d87c3e] text-[#110e0b] font-bold text-xs shadow"
            >
              Visualize Code
            </Button>
          </div>
        </div>

        {/* RIGHT / BOTTOM PANEL: 2D Interactive Canvas & Explanation */}
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

          {/* Step-by-Step Explanation Panel */}
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

            {/* Variable Tracker */}
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
    </div>
  );
}
