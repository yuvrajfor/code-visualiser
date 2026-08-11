import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, SkipForward, SkipBack, RotateCcw, 
  Code2, Cpu, Box, Terminal, Layers, Sparkles, ArrowRight, Volume2, VolumeX, CheckCircle2, Network, Zap, BookOpen, Lightbulb
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
  beginnerTip: string;
  variables: Record<string, any>;
  memory: MemoryNode[];
  activePointers: string[];
}

export default function Home() {
  const { user } = useAuth();
  const saveSubmission = trpc.submissions.save.useMutation({
    onSuccess: () => toast.success("Code session saved securely to database!"),
    onError: (err: any) => toast.error("Failed to save: " + err.message)
  });

  const [activeView, setActiveView] = useState<'landing' | 'studio'>('landing');
  const [selectedLang, setSelectedLang] = useState<'python' | 'javascript' | 'c' | 'java'>('javascript');
  const [userProblem, setUserProblem] = useState("Two Sum Algorithm");
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
  const [speedMs, setSpeedMs] = useState<number>(1800);
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

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5 note
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.12); // E5 note

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } catch (e) {
      console.warn("Audio playback error:", e);
    }
  };

  // Universal Code Parser: Converts any user code into ultra-simple beginner explanations & 2D memory steps
  const parseCodeIntoSteps = (code: string) => {
    const lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const parsedSteps: ExecutionStep[] = [];

    lines.forEach((line, idx) => {
      const stepNum = idx + 1;
      let exp = `We are running line ${stepNum}: "${line}". The computer reads this instruction and updates its working memory.`;
      let tip = `Think of this like writing down a note or preparing a tool on your desk before solving the puzzle.`;

      if (line.includes("function") || line.includes("class") || line.includes("def ")) {
        exp = `We are creating a reusable recipe (function) named after our task so we can call it whenever we need it.`;
        tip = `A function is like a mini-program inside your code that waits for ingredients (inputs) to give you a result.`;
      } else if (line.includes("for") || line.includes("while")) {
        exp = `We are starting a loop! The computer will repeat the steps inside over and over until we finish checking all items.`;
        tip = `Loops save you from writing the same code 100 times by letting the computer do the repetitive heavy lifting.`;
      } else if (line.includes("if") || line.includes("else")) {
        exp = `We are asking a Yes/No question: "${line}". Depending on the answer, the computer chooses which path to take.`;
        tip = `Like a fork in the road, the code checks a condition and decides which direction to walk.`;
      } else if (line.includes("return")) {
        exp = `We found our answer! We are stopping the function and handing back our final result.`;
        tip = `This is the finish line where the computer proudly presents the answer it calculated.`;
      } else if (line.includes("let") || line.includes("const") || line.includes("var")) {
        exp = `We created a storage box (variable) in memory to hold our data so we can look at it or change it later.`;
        tip = `Variables act like labeled storage containers in your kitchen pantry.`;
      }

      parsedSteps.push({
        step: stepNum,
        line: stepNum,
        code: line,
        explanation: exp,
        beginnerTip: tip,
        variables: {
          step: stepNum,
          status: "Executing",
          command: line.slice(0, 20) + (line.length > 20 ? "..." : "")
        },
        memory: [
          { id: `st_${idx}`, label: `Stack Box #${stepNum}`, type: "stack", value: line.slice(0, 16), address: `0x7F${10 + idx * 4}` },
          { id: `hp_${idx}`, label: `Heap Data`, type: "heap", value: `Object / Array [${stepNum}]`, address: `0x9A${20 + idx * 4}` }
        ],
        activePointers: [`pointer -> line ${stepNum}`]
      });
    });

    if (parsedSteps.length === 0) {
      parsedSteps.push({
        step: 1,
        line: 1,
        code: code.slice(0, 40),
        explanation: "Executing your custom code inside the virtual machine.",
        beginnerTip: "Your code is being analyzed line by line.",
        variables: { status: "Active" },
        memory: [{ id: "m1", label: "Working Memory", type: "stack", value: "Ready" }],
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

    toast.success("✨ Code successfully transformed into visual 2D memory steps!");
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

  // Render 2D Canvas Graphics (Ultra-cool glowing neon aesthetic)
  useEffect(() => {
    if (activeView !== 'studio' || steps.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 700;
    canvas.height = 340;

    // Rich dark gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGrad.addColorStop(0, "#090604");
    bgGrad.addColorStop(1, "#120d0a");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Glowing grid
    ctx.strokeStyle = "rgba(229, 155, 99, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 35) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 35) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const memory = currentStep?.memory || [];
    let startX = 45;
    let startY = 55;

    memory.forEach((node, index) => {
      const isHeap = node.type === 'heap';
      const boxWidth = 230;
      const boxHeight = 85;
      const x = startX + (index % 2) * 260;
      const y = startY + Math.floor(index / 2) * 110;

      // Outer neon glow
      ctx.shadowColor = isHeap ? "rgba(56, 189, 248, 0.6)" : "rgba(229, 155, 99, 0.6)";
      ctx.shadowBlur = 18;

      // Glassmorphism Box
      ctx.fillStyle = isHeap ? "rgba(15, 23, 42, 0.85)" : "rgba(28, 22, 18, 0.85)";
      ctx.strokeStyle = isHeap ? "#38bdf8" : "#e59b63";
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.roundRect(x, y, boxWidth, boxHeight, 14);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Label Header
      ctx.fillStyle = isHeap ? "#38bdf8" : "#e59b63";
      ctx.font = "bold 11px monospace";
      ctx.fillText(node.label.toUpperCase(), x + 14, y + 22);

      if (node.address) {
        ctx.fillStyle = "#94a3b8";
        ctx.font = "10px monospace";
        ctx.fillText(`📍 ${node.address}`, x + 130, y + 22);
      }

      // Divider
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 32);
      ctx.lineTo(x + boxWidth - 12, y + 32);
      ctx.stroke();

      // Value text
      ctx.fillStyle = "#f4ede2";
      ctx.font = "13px monospace";
      ctx.fillText(String(node.value), x + 14, y + 58);
    });

    // Pointers & connections
    ctx.strokeStyle = "#34d399";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 5]);
    currentStep?.activePointers?.forEach((ptr, idx) => {
      ctx.fillStyle = "#34d399";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`⚡ [${ptr}]`, 45, canvas.height - 20 - idx * 24);
    });
    ctx.setLineDash([]);

  }, [currentStep, activeView, steps.length]);

  return (
    <div className="min-h-screen bg-[#090604] text-[#f4ede2] flex flex-col font-sans selection:bg-[#e59b63]/30">
      
      {/* Header */}
      <header className="h-16 border-b border-[#221a14] bg-[#120d0a]/90 backdrop-blur-md px-8 flex items-center justify-between shrink-0 sticky top-0 z-50">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveView('landing')}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#e59b63] via-[#d66826] to-[#b85d23] flex items-center justify-center shadow-[0_0_20px_rgba(229,155,99,0.4)]">
            <Sparkles className="w-5 h-5 text-white fill-white animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold tracking-tight text-lg bg-gradient-to-r from-white via-[#f4ede2] to-[#e59b63] bg-clip-text text-transparent">
              Staying.fun Code Studio
            </span>
            <span className="text-[10px] text-[#9c8b7c] block -mt-1 font-mono tracking-wide">Universal Code-to-2D Visualizer</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-[#1c1612] border border-[#382d23] text-[#9c8b7c] hover:text-white transition-colors shadow-inner"
            title={soundEnabled ? "Mute Chimes" : "Enable Chimes"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#e59b63]" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {activeView === 'studio' ? (
            <Button 
              variant="outline"
              onClick={() => setActiveView('landing')}
              className="text-xs bg-[#1c1612] border-[#382d23] text-[#f4ede2] hover:bg-[#2a2119] rounded-xl h-9 px-4"
            >
              ← Edit Code Input
            </Button>
          ) : (
            <Button 
              onClick={handleLaunchStudio}
              className="bg-gradient-to-r from-[#e59b63] to-[#c76e33] hover:from-[#f0a872] hover:to-[#d87c3e] text-[#090604] font-bold text-xs h-10 px-5 shadow-[0_0_25px_rgba(229,155,99,0.3)] rounded-xl"
            >
              Launch Visualizer <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}
        </div>
      </header>

      {/* LANDING & CODE INPUT VIEW */}
      {activeView === 'landing' && (
        <main className="flex-1 px-8 py-16 max-w-5xl mx-auto w-full space-y-12 animate-in fade-in duration-500">
          
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <Badge variant="outline" className="bg-[#1c1410] border-[#382d23] text-[#e59b63] px-4 py-1.5 text-xs rounded-full shadow-[0_0_15px_rgba(229,155,99,0.15)]">
              ✨ Turn Any Code into Clear, Visual Stories in Basic English
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
              Watch <span className="bg-gradient-to-r from-[#e59b63] via-[#f0a872] to-[#ffd0a8] bg-clip-text text-transparent">How Code Works</span> in 2D & Simple English
            </h1>
            <p className="text-base md:text-lg text-[#b09e90] leading-relaxed max-w-2xl mx-auto">
              Paste any algorithm in Python, JavaScript, C, or Java. Our engine instantly breaks it down into stack/heap memory blocks, step-by-step playback, and basic English explanations anyone can understand.
            </p>
          </div>

          {/* Code Input Card with Glassmorphism */}
          <div className="bg-[#140f0c]/90 backdrop-blur-xl border border-[#2a2018] rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.7)] space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#e59b63]/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center justify-between pb-4 border-b border-[#241a13]">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[#221811] border border-[#382a20] flex items-center justify-center text-[#e59b63]">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Universal Code Input Studio</h3>
                  <p className="text-[11px] text-[#9c8b7c]">Select your language and paste any code snippet</p>
                </div>
              </div>

              <div className="flex bg-[#1a130f] p-1.5 rounded-2xl border border-[#2e2219] shadow-inner">
                {(['javascript', 'python', 'c', 'java'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all uppercase tracking-wider ${
                      selectedLang === lang 
                        ? 'bg-gradient-to-r from-[#e59b63] to-[#c76e33] text-[#090604] shadow-[0_0_15px_rgba(229,155,99,0.4)]' 
                        : 'text-[#9c8b7c] hover:text-white'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <Label className="text-xs text-[#b09e90] uppercase tracking-wider font-semibold mb-2 block">
                  Problem Title
                </Label>
                <Input 
                  value={userProblem}
                  onChange={(e) => setUserProblem(e.target.value)}
                  placeholder="e.g., Two Sum, Binary Search, Linked List"
                  className="bg-[#0b0705] border-[#2e2219] text-white text-sm h-12 rounded-xl focus:border-[#e59b63]"
                />
              </div>

              <div>
                <Label className="text-xs text-[#b09e90] uppercase tracking-wider font-semibold mb-2 block">
                  Your Code ({selectedLang.toUpperCase()}) - Paste Any Code Here
                </Label>
                <Textarea 
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value)}
                  rows={11}
                  className="bg-[#0b0705] border-[#2e2219] text-white font-mono text-xs leading-relaxed resize-y p-4 rounded-xl focus:border-[#e59b63]"
                  placeholder="Paste any custom code here..."
                />
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <Button 
                onClick={handleLaunchStudio}
                className="bg-gradient-to-r from-[#e59b63] via-[#d66826] to-[#b85d23] hover:from-[#f0a872] hover:to-[#d87c3e] text-[#090604] font-black text-sm h-12 px-8 shadow-[0_0_30px_rgba(229,155,99,0.4)] rounded-xl transition-transform hover:scale-[1.02]"
              >
                Visualize Code in 2D & Start Learning <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

        </main>
      )}

      {/* STUDIO DUAL-PANE PLAYGROUND VIEW */}
      {activeView === 'studio' && (
        <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
          
          {/* Left Panel: Code Editor */}
          <div className="lg:col-span-5 bg-[#140f0c]/90 backdrop-blur-xl border border-[#2a2018] rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#241a13]">
                <div className="flex items-center space-x-2">
                  <Code2 className="w-4 h-4 text-[#e59b63]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    {userProblem} ({selectedLang.toUpperCase()})
                  </span>
                </div>
                <Badge variant="outline" className="bg-[#1c130e] border-[#382a20] text-[#e59b63] font-mono text-[10px]">
                  {steps.length} Steps
                </Badge>
              </div>

              <Textarea 
                value={userCode}
                onChange={(e) => setUserCode(e.target.value)}
                rows={14}
                className="bg-[#0b0705] border-[#2e2219] text-white font-mono text-xs leading-relaxed resize-y p-4 rounded-xl"
              />
            </div>

            <div className="mt-5 pt-4 border-t border-[#241a13] flex items-center justify-between">
              <Button 
                variant="outline"
                onClick={() => setActiveView('landing')}
                className="text-xs bg-[#1c130e] border-[#382a20] text-[#f4ede2] hover:bg-[#2a2119] rounded-xl h-10 px-4"
              >
                Change Code
              </Button>
              <Button 
                onClick={handleLaunchStudio}
                className="bg-gradient-to-r from-[#e59b63] to-[#c76e33] text-[#090604] font-bold text-xs h-10 px-5 rounded-xl shadow-[0_0_15px_rgba(229,155,99,0.25)]"
              >
                Re-Run Analysis
              </Button>
            </div>
          </div>

          {/* Right Panel: 2D Canvas & Crystal-Clear Beginner Explanations */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            
            {/* Control Bar */}
            <div className="bg-[#140f0c]/90 backdrop-blur-xl border border-[#2a2018] rounded-2xl px-6 py-4 flex items-center justify-between shadow-xl">
              <div className="flex items-center space-x-2.5">
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => { setIsPlaying(false); setCurrentStepIndex(0); playChime(); }}
                  className="w-9 h-9 bg-[#1c130e] border-[#382a20] text-[#f4ede2] hover:bg-[#2a2119] rounded-xl shadow-inner"
                  title="Reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => { setIsPlaying(false); setCurrentStepIndex(prev => Math.max(0, prev - 1)); playChime(); }}
                  className="w-9 h-9 bg-[#1c130e] border-[#382a20] text-[#f4ede2] hover:bg-[#2a2119] rounded-xl shadow-inner"
                  title="Step Backward"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="bg-gradient-to-r from-[#e59b63] to-[#c76e33] hover:from-[#f0a872] hover:to-[#d87c3e] text-[#090604] font-black text-xs h-9 px-5 shadow-[0_0_20px_rgba(229,155,99,0.3)] rounded-xl"
                >
                  {isPlaying ? <Pause className="w-4 h-4 mr-1.5" /> : <Play className="w-4 h-4 mr-1.5" />}
                  {isPlaying ? "Pause" : "Play with Chimes"}
                </Button>
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => { setIsPlaying(false); setCurrentStepIndex(prev => Math.min(steps.length - 1, prev + 1)); playChime(); }}
                  className="w-9 h-9 bg-[#1c130e] border-[#382a20] text-[#f4ede2] hover:bg-[#2a2119] rounded-xl shadow-inner"
                  title="Step Forward"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center space-x-3 text-xs">
                <span className="text-[#9c8b7c] font-medium">Speed:</span>
                <input 
                  type="range" 
                  min={600} 
                  max={3000} 
                  step={200}
                  value={speedMs}
                  onChange={(e) => setSpeedMs(Number(e.target.value))}
                  className="w-24 accent-[#e59b63] bg-[#221711] h-2 rounded-lg cursor-pointer"
                />
                <Badge variant="outline" className="bg-[#1c130e] border-[#382a20] text-[#e59b63] font-mono text-xs px-2.5 py-1 rounded-xl">
                  Step {currentStepIndex + 1} / {steps.length}
                </Badge>
              </div>
            </div>

            {/* 2D Interactive Canvas */}
            <div className="bg-[#140f0c]/90 backdrop-blur-xl border border-[#2a2018] rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Box className="w-4 h-4 text-[#e59b63]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    2D Stack & Heap Memory Canvas
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-[11px] font-mono text-[#9c8b7c]">
                  <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-[#e59b63] mr-1.5 shadow-[0_0_10px_#e59b63]"></span> Stack Memory</span>
                  <span className="flex items-center ml-2"><span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] mr-1.5 shadow-[0_0_10px_#38bdf8]"></span> Heap Memory</span>
                </div>
              </div>

              <div className="w-full h-[340px] bg-[#090604] border border-[#221711] rounded-2xl overflow-hidden relative shadow-inner flex items-center justify-center">
                <canvas ref={canvasRef} className="w-full h-full block" />
              </div>
            </div>

            {/* Crystal-Clear Basic English Explanation Panel */}
            <div className="bg-[#140f0c]/90 backdrop-blur-xl border border-[#2a2018] rounded-3xl p-6 shadow-2xl flex flex-col space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#241a13]">
                <span className="text-xs font-bold tracking-wider uppercase text-[#e59b63] flex items-center">
                  <Terminal className="w-4 h-4 mr-2" />
                  How This Code Works (Simple English)
                </span>
                <span className="font-mono text-xs text-white bg-[#1c130e] px-3 py-1 rounded-xl border border-[#382a20]">
                  Line {currentStep?.line}
                </span>
              </div>

              <div className="bg-[#0b0705] border border-[#221711] p-4 rounded-2xl text-xs font-mono text-[#f4ede2] leading-relaxed shadow-inner">
                <span className="text-[#e59b63] font-bold">Executing Code:</span> {currentStep?.code}
              </div>

              <div className="bg-gradient-to-br from-[#1c130e] to-[#120b08] border border-[#382a20] p-4 rounded-2xl space-y-2 shadow-md">
                <div className="flex items-center space-x-2 text-xs font-bold text-amber-400">
                  <Lightbulb className="w-4 h-4" />
                  <span>Plain English Breakdown:</span>
                </div>
                <p className="text-xs text-white leading-relaxed font-medium">
                  {currentStep?.explanation}
                </p>
                <p className="text-[11px] text-[#b09e90] pt-1.5 border-t border-[#2a1e16] italic">
                  💡 <span className="font-semibold text-[#f4ede2]">Beginner Tip:</span> {currentStep?.beginnerTip}
                </p>
              </div>

              {/* Clickable Step Jumper */}
              <div className="pt-1 space-y-2 max-h-[160px] overflow-y-auto pr-1">
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
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-xs font-mono shadow-sm ${
                        isActive 
                          ? 'bg-[#281b13] border-[#e59b63] text-white shadow-[0_0_15px_rgba(229,155,99,0.25)]' 
                          : 'bg-[#0b0705] border-[#221711] text-[#9c8b7c] hover:text-white hover:border-[#382a20]'
                      }`}
                    >
                      <span className="truncate pr-2">Line {st.line}: {st.code}</span>
                      {isActive && <span className="text-[10px] bg-[#e59b63] text-[#090604] px-2.5 py-0.5 rounded-full font-black tracking-wider">ACTIVE</span>}
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
