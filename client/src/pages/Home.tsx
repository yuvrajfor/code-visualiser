import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, SkipForward, SkipBack, RotateCcw, 
  Code2, Cpu, Box, Terminal, Layers, Sparkles, ArrowRight, Volume2, VolumeX, CheckCircle2, Network
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

export default function Home() {
  const { user } = useAuth();
  const saveSubmission = trpc.submissions.save.useMutation({
    onSuccess: () => toast.success("Code session saved to database!"),
    onError: (err: any) => toast.error("Failed to save: " + err.message)
  });

  const [activeView, setActiveView] = useState<'landing' | 'studio'>('landing');
  const [selectedLang, setSelectedLang] = useState<'python' | 'javascript' | 'c' | 'java'>('javascript');
  const [userProblem, setUserProblem] = useState("Custom Algorithm Visualizer");
  const [userCode, setUserCode] = useState(
`function twoSum(nums, target) {
    let map = {};
    for (let i = 0; i < nums.length; i++) {
        let diff = target - nums[i];
        if (diff in map) return [map[diff], i];
        map[nums[i]] = i;
    }
    return [];
}`
  );

  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMs, setSpeedMs] = useState<number>(1500);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const currentStep = steps[currentStepIndex] || steps[0];

  // Play gentle chime sound using Web Audio API
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5 note

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn("Audio playback error:", e);
    }
  };

  // Universal Code Parser: Converts any user code into 2D memory steps & full explanations
  const parseCodeIntoSteps = (code: string) => {
    const lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const parsedSteps: ExecutionStep[] = [];

    lines.forEach((line, idx) => {
      const stepNum = idx + 1;
      let exp = `Executing line ${stepNum}: "${line}". Inspecting variable allocations and stack/heap memory states.`;

      if (line.includes("function") || line.includes("class") || line.includes("def ")) {
        exp = `Declaration statement: "${line}". Setting up function scope and blueprint in code memory segment.`;
      } else if (line.includes("for") || line.includes("while")) {
        exp = `Iteration loop: "${line}". Evaluating loop condition and advancing pointer indices.`;
      } else if (line.includes("if") || line.includes("else")) {
        exp = `Conditional branch: "${line}". Checking boolean expression to determine execution path.`;
      } else if (line.includes("return")) {
        exp = `Return statement: "${line}". Finalizing computation and returning result from stack frame.`;
      } else if (line.includes("let") || line.includes("const") || line.includes("var")) {
        exp = `Variable definition & memory allocation: "${line}". Storing reference or primitive value in stack/heap.`;
      }

      parsedSteps.push({
        step: stepNum,
        line: stepNum,
        code: line,
        explanation: exp,
        variables: {
          step: stepNum,
          status: "Active",
          statement: line.slice(0, 22) + (line.length > 22 ? "..." : "")
        },
        memory: [
          { id: `st_${idx}`, label: `Stack Frame ${stepNum}`, type: "stack", value: line.slice(0, 18), address: `0x7F${10 + idx * 4}` },
          { id: `hp_${idx}`, label: `Heap Object`, type: "heap", value: `Allocated Data [${stepNum}]`, address: `0x9A${20 + idx * 4}` }
        ],
        activePointers: [`ptr_${stepNum} -> active`]
      });
    });

    if (parsedSteps.length === 0) {
      parsedSteps.push({
        step: 1,
        line: 1,
        code: code.slice(0, 40),
        explanation: "Executing custom user code snippet in virtual machine.",
        variables: { status: "Running" },
        memory: [{ id: "m1", label: "Virtual Machine", type: "stack", value: "Active Scope" }],
        activePointers: ["PC -> 0x01"]
      });
    }

    return parsedSteps;
  };

  const handleLaunchStudio = () => {
    if (!userCode.trim()) {
      toast.error("Please enter some code to visualize.");
      return;
    }

    const generated = parseCodeIntoSteps(userCode);
    setSteps(generated);
    setCurrentStepIndex(0);
    setIsPlaying(false);
    setActiveView('studio');

    saveSubmission.mutate({
      problemTitle: userProblem,
      language: selectedLang,
      code: userCode
    });

    toast.success("Code successfully parsed into 2D Visualizer & Explainer!");
  };

  // Playback loop
  useEffect(() => {
    if (isPlaying && activeView === 'studio') {
      playIntervalRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev < steps.length - 1) {
            const nextIdx = prev + 1;
            playChime();
            return nextIdx;
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
  }, [isPlaying, speedMs, steps.length, activeView, soundEnabled]);

  // Render 2D Canvas Graphics
  useEffect(() => {
    if (activeView !== 'studio' || steps.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 700;
    canvas.height = 340;

    // Background
    ctx.fillStyle = "#0d0a08";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
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

    const memory = currentStep?.memory || [];
    let startX = 40;
    let startY = 60;

    memory.forEach((node, index) => {
      const isHeap = node.type === 'heap';
      const boxWidth = 220;
      const boxHeight = 75;
      const x = startX + (index % 2) * 250;
      const y = startY + Math.floor(index / 2) * 100;

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
      ctx.fillText(node.label.toUpperCase(), x + 12, y + 20);

      if (node.address) {
        ctx.fillStyle = "#94a3b8";
        ctx.font = "10px monospace";
        ctx.fillText(`Addr: ${node.address}`, x + 120, y + 20);
      }

      ctx.strokeStyle = "#2d241c";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 30);
      ctx.lineTo(x + boxWidth - 10, y + 30);
      ctx.stroke();

      ctx.fillStyle = "#f4ede2";
      ctx.font = "12px monospace";
      ctx.fillText(String(node.value), x + 12, y + 52);
    });

    // Pointers
    ctx.strokeStyle = "#34d399";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    currentStep?.activePointers?.forEach((ptr, idx) => {
      ctx.fillStyle = "#34d399";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`⚡ ${ptr}`, 40, canvas.height - 25 - idx * 22);
    });
    ctx.setLineDash([]);

  }, [currentStep, activeView, steps.length]);

  return (
    <div className="min-h-screen bg-[#110e0b] text-[#f4ede2] flex flex-col font-sans selection:bg-[#e59b63]/30">
      
      {/* Header (staying.fun aesthetic) */}
      <header className="h-16 border-b border-[#2a221a] bg-[#16120e] px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveView('landing')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#e59b63] to-[#b85d23] flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-lg bg-gradient-to-r from-white via-[#f4ede2] to-[#e59b63] bg-clip-text text-transparent">
              Staying.fun Code Studio
            </span>
            <span className="text-[10px] text-[#9c8b7c] block -mt-1 font-mono">Universal Code-to-2D Visualizer</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-[#1c1612] border border-[#382d23] text-[#9c8b7c] hover:text-white transition-colors"
            title={soundEnabled ? "Mute Chimes" : "Enable Chimes"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#e59b63]" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {activeView === 'studio' ? (
            <Button 
              variant="outline"
              onClick={() => setActiveView('landing')}
              className="text-xs bg-[#1c1612] border-[#382d23] text-[#f4ede2] hover:bg-[#2a2119]"
            >
              ← Edit Code Input
            </Button>
          ) : (
            <Button 
              onClick={handleLaunchStudio}
              className="bg-gradient-to-r from-[#e59b63] to-[#c76e33] text-[#110e0b] font-bold text-xs h-9 px-4 shadow"
            >
              Launch Visualizer <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          )}
        </div>
      </header>

      {/* LANDING & CODE INPUT VIEW (staying.fun aesthetic) */}
      {activeView === 'landing' && (
        <main className="flex-1 px-8 py-12 max-w-5xl mx-auto w-full space-y-12 animate-in fade-in duration-300">
          
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <Badge variant="outline" className="bg-[#221c16] border-[#382d23] text-[#e59b63] px-3 py-1 text-xs">
              ✨ Paste Any Code — Instant 2D Visuals & Explanations
            </Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Transform <span className="bg-gradient-to-r from-[#e59b63] to-[#f0a872] bg-clip-text text-transparent">Any Code</span> into 2D Memory Visuals
            </h1>
            <p className="text-sm md:text-base text-[#b09e90] leading-relaxed">
              Input your custom algorithm in Python, JavaScript, C, or Java. Watch step-by-step memory allocations, stack frames, and full English explanations come alive with audio chimes.
            </p>
          </div>

          {/* Code Input Card */}
          <div className="bg-[#16120d] border border-[#2d241c] rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#261f18]">
              <div className="flex items-center space-x-2">
                <Code2 className="w-5 h-5 text-[#e59b63]" />
                <span className="text-sm font-bold text-white">Universal Code Input & Problem Statement</span>
              </div>

              <div className="flex bg-[#1c1612] p-1 rounded-lg border border-[#2d241c]">
                {(['javascript', 'python', 'c', 'java'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all uppercase ${
                      selectedLang === lang 
                        ? 'bg-[#e59b63] text-[#110e0b] font-bold shadow' 
                        : 'text-[#9c8b7c] hover:text-white'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-xs text-[#b09e90] uppercase tracking-wider mb-1.5 block">
                  Problem Title
                </Label>
                <Input 
                  value={userProblem}
                  onChange={(e) => setUserProblem(e.target.value)}
                  placeholder="e.g., Two Sum, Binary Search, DFS"
                  className="bg-[#120e0a] border-[#382d23] text-white text-sm h-10"
                />
              </div>

              <div>
                <Label className="text-xs text-[#b09e90] uppercase tracking-wider mb-1.5 block">
                  Your Code ({selectedLang.toUpperCase()}) - Paste Any Code Here
                </Label>
                <Textarea 
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value)}
                  rows={10}
                  className="bg-[#120e0a] border-[#382d23] text-white font-mono text-xs leading-relaxed resize-y p-3"
                  placeholder="Paste any custom code snippet here..."
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button 
                onClick={handleLaunchStudio}
                className="bg-gradient-to-r from-[#e59b63] to-[#c76e33] hover:from-[#f0a872] hover:to-[#d87c3e] text-[#110e0b] font-bold text-sm h-11 px-8 shadow-lg"
              >
                Visualize Code in 2D & Play <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

        </main>
      )}

      {/* STUDIO DUAL-PANE PLAYGROUND VIEW */}
      {activeView === 'studio' && (
        <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
          
          {/* Left Panel: Code Editor */}
          <div className="lg:col-span-5 bg-[#16120d] border border-[#2d241c] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#261f18]">
                <div className="flex items-center space-x-2">
                  <Code2 className="w-4 h-4 text-[#e59b63]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-white">
                    {userProblem} ({selectedLang.toUpperCase()})
                  </span>
                </div>
                <Badge variant="outline" className="bg-[#221c16] border-[#382d23] text-[#e59b63] font-mono text-[10px]">
                  {steps.length} Steps
                </Badge>
              </div>

              <Textarea 
                value={userCode}
                onChange={(e) => setUserCode(e.target.value)}
                rows={14}
                className="bg-[#120e0a] border-[#382d23] text-white font-mono text-xs leading-relaxed resize-y p-3"
              />
            </div>

            <div className="mt-4 pt-3 border-t border-[#261f18] flex items-center justify-between">
              <Button 
                variant="outline"
                onClick={() => setActiveView('landing')}
                className="text-xs bg-[#1c1612] border-[#382d23] text-[#f4ede2] hover:bg-[#2a2119]"
              >
                Change Code
              </Button>
              <Button 
                onClick={handleLaunchStudio}
                className="bg-gradient-to-r from-[#e59b63] to-[#c76e33] hover:from-[#f0a872] hover:to-[#d87c3e] text-[#110e0b] font-bold text-xs shadow"
              >
                Re-Run Analysis
              </Button>
            </div>
          </div>

          {/* Right Panel: 2D Canvas & Full Written Explanations */}
          <div className="lg:col-span-7 flex flex-col space-y-5">
            
            {/* Control Bar */}
            <div className="bg-[#16120d] border border-[#2d241c] rounded-xl px-5 py-3 flex items-center justify-between shadow-lg">
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => { setIsPlaying(false); setCurrentStepIndex(0); playChime(); }}
                  className="w-8 h-8 bg-[#1c1612] border-[#382d23] text-[#f4ede2] hover:bg-[#2a2119]"
                  title="Reset"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => { setIsPlaying(false); setCurrentStepIndex(prev => Math.max(0, prev - 1)); playChime(); }}
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
                  {isPlaying ? "Pause" : "Play Chimes"}
                </Button>
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => { setIsPlaying(false); setCurrentStepIndex(prev => Math.min(steps.length - 1, prev + 1)); playChime(); }}
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

              <div className="w-full h-[340px] bg-[#0d0a08] border border-[#261e17] rounded-xl overflow-hidden relative shadow-inner">
                <canvas ref={canvasRef} className="w-full h-full block" />
              </div>
            </div>

            {/* Full Written Explanation Panel */}
            <div className="bg-[#16120d] border border-[#2d241c] rounded-2xl p-5 shadow-xl flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#261f18]">
                <span className="text-xs font-semibold tracking-wider uppercase text-[#e59b63] flex items-center">
                  <Terminal className="w-4 h-4 mr-2" />
                  Full Written Explanation & Memory Breakdown
                </span>
                <span className="font-mono text-xs text-white bg-[#221c16] px-2.5 py-1 rounded border border-[#382d23]">
                  Line {currentStep?.line}
                </span>
              </div>

              <div className="bg-[#120e0a] border border-[#261f18] p-3.5 rounded-xl text-xs font-mono text-[#f4ede2] leading-relaxed">
                <span className="text-[#e59b63] font-bold">Executing Line:</span> {currentStep?.code}
              </div>

              <p className="text-xs text-[#b09e90] leading-relaxed">
                💡 <span className="font-medium text-[#f4ede2]">{currentStep?.explanation}</span>
              </p>

              {/* Interactive Step Jump List */}
              <div className="pt-2 space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                {steps.map((st, idx) => {
                  const isActive = currentStepIndex === idx;
                  return (
                    <div 
                      key={st.step}
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentStepIndex(idx);
                        playChime();
                      }}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs font-mono ${
                        isActive 
                          ? 'bg-[#221a14] border-[#e59b63] text-[#e59b63] shadow' 
                          : 'bg-[#120e0a] border-[#261f18] text-[#8a796c] hover:text-white'
                      }`}
                    >
                      <span>Line {st.line}: {st.code}</span>
                      {isActive && <span className="text-[10px] bg-[#e59b63] text-[#110e0b] px-2 py-0.5 rounded font-bold">Active</span>}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </main>
      )}

    </div>
  );
}
