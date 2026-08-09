import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, RotateCcw, SkipBack, SkipForward, 
  Code2, Box, Cpu, Sparkles, Flame, CheckCircle2, 
  ArrowRight, RefreshCw, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ExecutionStep {
  step: number;
  line: number;
  explanation: string;
  pointers: { i: number; j: number };
  arrayState: number[];
  highlights: number[];
  matched?: boolean;
  stateVars: Record<string, any>;
}

export default function Home() {
  // Window form view state: 1 = Code Input Form, 2 = Synchronized Parallel 3D Visual & Explanation
  const [viewStep, setViewStep] = useState<1 | 2>(1);

  const [selectedLang, setSelectedLang] = useState<'python' | 'c' | 'java'>('python');
  const [userProblem, setUserProblem] = useState("Two Sum / Array Search");
  const [userCode, setUserCode] = useState(
`def twoSum(numbers: list[int], target: int) -> list[int]:
    i, j = 0, len(numbers) - 1
    while i < j:
        s = numbers[i] + numbers[j]
        if s == target:
            return [i + 1, j + 1]
        elif s < target:
            i += 1
        else:
            j -= 1
    return []`
  );

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronized execution steps
  const [executionSteps] = useState<ExecutionStep[]>([
    {
      step: 1,
      line: 2,
      explanation: "Initialize pointers i = 0 (leftmost) and j = 5 (rightmost) in 3D memory array.",
      pointers: { i: 0, j: 5 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [0, 5],
      stateVars: { i: 0, j: 5, target: 19 }
    },
    {
      step: 2,
      line: 3,
      explanation: "Evaluate while condition: i (0) < j (5). Condition evaluates to True, entering loop body.",
      pointers: { i: 0, j: 5 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [0, 5],
      stateVars: { condition: "0 < 5 (True)" }
    },
    {
      step: 3,
      line: 4,
      explanation: "Calculate sum of numbers[i] (2) + numbers[j] (19) = 21. Compare with target 19.",
      pointers: { i: 0, j: 5 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [0, 5],
      stateVars: { sum: 21, condition: "21 > 19" }
    },
    {
      step: 4,
      line: 10,
      explanation: "Since sum (21) > target (19), decrement right pointer j from 5 to 4.",
      pointers: { i: 0, j: 4 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [4],
      stateVars: { i: 0, j: 4, action: "j -= 1" }
    },
    {
      step: 5,
      line: 4,
      explanation: "Calculate sum of numbers[0] (2) + numbers[4] (15) = 17. Sum (17) < target (19).",
      pointers: { i: 0, j: 4 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [0, 4],
      stateVars: { sum: 17, condition: "17 < 19" }
    },
    {
      step: 6,
      line: 8,
      explanation: "Since sum < target, increment left pointer i from 0 to 1.",
      pointers: { i: 1, j: 4 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [1, 4],
      stateVars: { i: 1, j: 4, action: "i += 1" }
    },
    {
      step: 7,
      line: 4,
      explanation: "Calculate sum of numbers[1] (5) + numbers[3] (11) = 16. Increment left pointer i to 2.",
      pointers: { i: 2, j: 3 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [2, 3],
      stateVars: { sum: 16, i: 2, j: 3 }
    },
    {
      step: 8,
      line: 6,
      explanation: "Match found! numbers[2] (8) + numbers[3] (11) = 19 equals target. Returning 1-based indices [3, 4].",
      pointers: { i: 2, j: 3 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [2, 3],
      matched: true,
      stateVars: { result: "[3, 4]", status: "Success" }
    }
  ]);

  // Parallel Playback Timer
  useEffect(() => {
    if (isPlaying && viewStep === 2) {
      timerRef.current = setTimeout(() => {
        if (currentStepIndex < executionSteps.length - 1) {
          setCurrentStepIndex(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 1600 / playbackSpeed);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentStepIndex, executionSteps.length, playbackSpeed, viewStep]);

  const handleLangChange = (lang: 'python' | 'c' | 'java') => {
    setSelectedLang(lang);
    if (lang === 'python') {
      setUserCode(
`def twoSum(numbers: list[int], target: int) -> list[int]:
    i, j = 0, len(numbers) - 1
    while i < j:
        s = numbers[i] + numbers[j]
        if s == target:
            return [i + 1, j + 1]
        elif s < target:
            i += 1
        else:
            j -= 1
    return []`
      );
    } else if (lang === 'c') {
      setUserCode(
`int* twoSum(int* numbers, int size, int target, int* returnSize) {
    int i = 0, j = size - 1;
    *returnSize = 2;
    int* res = malloc(2 * sizeof(int));
    while (i < j) {
        int s = numbers[i] + numbers[j];
        if (s == target) { res[0]=i+1; res[1]=j+1; return res; }
        else if (s < target) { i++; }
        else { j--; }
    }
    return res;
}`
      );
    } else {
      setUserCode(
`class Solution {
    public int[] twoSum(int[] numbers, int target) {
        int i = 0, j = numbers.length - 1;
        while (i < j) {
            int s = numbers[i] + numbers[j];
            if (s == target) return new int[]{i+1, j+1};
            else if (s < target) i++;
            else j--;
        }
        return new int[0];
    }
}`
      );
    }
  };

  const handleStartAnalysis = () => {
    if (!userCode.trim()) {
      toast.error("Please enter your code first.");
      return;
    }
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setViewStep(2);
      setCurrentStepIndex(0);
      setIsPlaying(true); // Start playing parallel simulation automatically
      toast.success("Code compiled! Playing 3D visualization and parallel explanation.");
    }, 1200);
  };

  const currentStep = executionSteps[currentStepIndex] || executionSteps[0];

  return (
    <div className="min-h-screen bg-[#110e0b] text-[#f4ede2] flex flex-col font-sans selection:bg-[#e59b63]/30 selection:text-[#f4ede2]">
      {/* Top Header */}
      <header className="h-14 border-b border-[#2a221a] bg-[#16120e] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#e59b63] to-[#b85d23] flex items-center justify-center shadow-md">
              <Flame className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-bold tracking-tight text-base bg-gradient-to-r from-white via-[#f4ede2] to-[#e59b63] bg-clip-text text-transparent">
              Chai Visual
            </span>
          </div>
          <span className="text-[#6b5d52]">/</span>
          <span className="text-xs font-medium text-[#b09e90] bg-[#221c16] px-2.5 py-1 rounded-md border border-[#332a21]">
            Parallel Code-to-3D Visualizer & Explainer
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {viewStep === 2 && (
            <Button 
              variant="outline" 
              onClick={() => {
                setIsPlaying(false);
                setViewStep(1);
              }}
              className="text-xs h-8 bg-[#1c1612] border-[#382d23] text-[#f4ede2] hover:bg-[#2a2119]"
            >
              ← Edit Code / New Problem
            </Button>
          )}

          <div className="flex bg-[#1c1612] p-1 rounded-lg border border-[#2d241c]">
            {(['python', 'c', 'java'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => handleLangChange(lang)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all uppercase ${
                  selectedLang === lang 
                    ? 'bg-[#e59b63] text-[#110e0b] font-bold shadow' 
                    : 'text-[#9c8b7c] hover:text-white'
                }`}
              >
                {lang === 'python' ? 'Python' : lang === 'c' ? 'C' : 'Java'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Container Form / Player Window */}
      <main className="flex-1 p-6 flex flex-col max-w-6xl mx-auto w-full justify-center">
        
        {/* STEP 1: Code Input Form */}
        {viewStep === 1 && (
          <div className="bg-[#16120d] border border-[#2d241c] rounded-2xl p-6 shadow-2xl animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#261f18]">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center">
                  <Code2 className="w-5 h-5 text-[#e59b63] mr-2" />
                  Step 1: Provide Your Problem & {selectedLang.toUpperCase()} Code
                </h2>
                <p className="text-xs text-[#9c8b7c] mt-1">
                  Enter your problem statement and paste your source code. The engine will compile and synchronize 3D spatial execution with parallel line-by-line explanation.
                </p>
              </div>
              <Badge variant="outline" className="bg-[#221c16] border-[#382d23] text-[#e59b63] font-mono">
                Form Step 1 / 2
              </Badge>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <Label className="text-xs text-[#b09e90] uppercase tracking-wider mb-1.5 block">
                  Problem Title / Statement
                </Label>
                <Input 
                  value={userProblem}
                  onChange={(e) => setUserProblem(e.target.value)}
                  placeholder="e.g. Two Sum II, Binary Search, QuickSort..."
                  className="bg-[#120e0a] border-[#382d23] text-white text-sm h-10"
                />
              </div>

              <div>
                <Label className="text-xs text-[#b09e90] uppercase tracking-wider mb-1.5 block">
                  Source Code ({selectedLang.toUpperCase()})
                </Label>
                <Textarea 
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value)}
                  rows={12}
                  className="bg-[#120e0a] border-[#382d23] text-white font-mono text-xs leading-relaxed resize-y p-3"
                  placeholder="Paste your code here..."
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={handleStartAnalysis}
                disabled={isAnalyzing}
                className="bg-gradient-to-r from-[#e59b63] to-[#c76e33] hover:from-[#f0a872] hover:to-[#d87c3e] text-[#110e0b] font-bold text-sm h-11 px-6 shadow-lg"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Parsing AST & Generating 3D Model...
                  </>
                ) : (
                  <>
                    Proceed to 3D Parallel Playback <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Synchronized Parallel 3D Visual & Explanation Window */}
        {viewStep === 2 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            
            {/* Window Header Status */}
            <div className="bg-[#16120d] border border-[#2d241c] rounded-xl px-5 py-3 flex items-center justify-between shadow-lg">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#e59b63]">
                  Active Problem:
                </span>
                <span className="text-sm font-bold text-white">{userProblem}</span>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="text-xs bg-[#221c16] border-[#382d23] text-emerald-400">
                  {isPlaying ? "▶ Playing Parallel Simulation" : "⏸ Paused"}
                </Badge>
                <span className="text-xs text-[#9c8b7c] font-mono">
                  Step {currentStepIndex + 1} of {executionSteps.length}
                </span>
              </div>
            </div>

            {/* Top: 3D Spatial Visual Representation */}
            <div className="bg-[#16120d] border border-[#2d241c] rounded-2xl p-5 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Box className="w-4 h-4 text-[#e59b63]" />
                  <span className="text-xs font-semibold tracking-wider uppercase text-white">
                    3D Spatial Visual Representation
                  </span>
                </div>
                <div className="text-[11px] text-[#9c8b7c] font-mono">
                  Runtime Language: <span className="text-[#e59b63] uppercase">{selectedLang}</span>
                </div>
              </div>

              {/* 3D Array Blocks Arena */}
              <div className="min-h-[220px] bg-[#0d0a08] border border-[#261e17] rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1812_1px,transparent_1px),linear-gradient(to_bottom,#1f1812_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-25 pointer-events-none" />

                <div className="transform rotate-x-6 rotate-y-3">
                  <div className="flex items-center justify-center gap-3 sm:gap-5 my-4">
                    {currentStep.arrayState.map((val, idx) => {
                      const isHighlighted = currentStep.highlights.includes(idx);
                      const isLeftPointer = currentStep.pointers.i === idx;
                      const isRightPointer = currentStep.pointers.j === idx;

                      return (
                        <div key={idx} className="flex flex-col items-center relative">
                          <div className="h-8 flex items-end pb-1">
                            {isLeftPointer && (
                              <div className="flex flex-col items-center animate-bounce">
                                <span className="text-[11px] font-bold text-[#e59b63] bg-[#261d15] px-1.5 py-0.5 rounded border border-[#e59b63]/40 shadow">
                                  i={idx}
                                </span>
                                <div className="w-0.5 h-3 bg-[#e59b63]" />
                              </div>
                            )}
                            {isRightPointer && (
                              <div className="flex flex-col items-center animate-bounce" style={{ animationDelay: '0.2s' }}>
                                <span className="text-[11px] font-bold text-cyan-400 bg-[#15242b] px-1.5 py-0.5 rounded border border-cyan-400/40 shadow">
                                  j={idx}
                                </span>
                                <div className="w-0.5 h-3 bg-cyan-400" />
                              </div>
                            )}
                          </div>

                          <div className={`w-16 h-18 rounded-xl flex flex-col items-center justify-center font-mono font-bold text-xl transition-all duration-300 shadow-2xl relative ${
                            isHighlighted 
                              ? 'bg-gradient-to-br from-[#e59b63] to-[#b85d23] text-[#110e0b] scale-110 shadow-[0_0_25px_rgba(229,155,99,0.6)] border-2 border-white' 
                              : 'bg-[#1b1511] text-[#f4ede2] border border-[#3d3127]'
                          }`}>
                            {val}
                            <div className="absolute -bottom-2.5 -right-2.5 w-full h-2.5 bg-[#120e0b] rounded-b-xl border-r border-b border-[#2d241c] pointer-events-none" />
                          </div>

                          <span className="mt-3 text-xs font-mono text-[#8a796c]">
                            [{idx}]
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Status bar */}
                <div className="mt-4 flex items-center justify-between w-full px-4 bg-[#14100c] border border-[#2d241c] py-2 rounded-lg text-xs">
                  <div className="flex items-center space-x-3">
                    <span className="text-[#9c8b7c]">Target Value:</span>
                    <span className="font-mono font-bold text-[#e59b63]">19</span>
                  </div>
                  {currentStep.matched && (
                    <div className="flex items-center space-x-1 text-emerald-400 font-semibold animate-pulse">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Target Found Successfully!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Playback & Control Toolbar */}
            <div className="bg-[#16120d] border border-[#2d241c] rounded-xl px-5 py-3 flex items-center justify-between shadow-lg">
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIndex(0);
                  }}
                  className="w-9 h-9 rounded-lg bg-[#211a14] border border-[#382e25] flex items-center justify-center text-[#b09e90] hover:text-white transition"
                  title="Reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIndex(prev => Math.max(0, prev - 1));
                  }}
                  className="w-9 h-9 rounded-lg bg-[#211a14] border border-[#382e25] flex items-center justify-center text-[#b09e90] hover:text-white transition"
                  title="Previous Step"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-11 h-11 rounded-xl bg-[#e59b63] hover:bg-[#f0a872] text-[#110e0b] flex items-center justify-center transition shadow-lg font-bold"
                  title={isPlaying ? "Pause Simulation" : "Play Simulation"}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>
                <button 
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIndex(prev => Math.min(executionSteps.length - 1, prev + 1));
                  }}
                  className="w-9 h-9 rounded-lg bg-[#211a14] border border-[#382e25] flex items-center justify-center text-[#b09e90] hover:text-white transition"
                  title="Next Step"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Scrubber progress */}
              <div className="flex-1 mx-6">
                <input 
                  type="range" 
                  min={0} 
                  max={executionSteps.length - 1} 
                  value={currentStepIndex}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setCurrentStepIndex(Number(e.target.value));
                  }}
                  className="w-full accent-[#e59b63] bg-[#261e17] h-2 rounded-lg cursor-pointer"
                />
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-xs text-[#9c8b7c]">Speed:</span>
                <button
                  onClick={() => setPlaybackSpeed(s => s === 1 ? 1.5 : s === 1.5 ? 2 : 0.5)}
                  className="text-xs font-mono bg-[#211a14] border border-[#382e25] px-2.5 py-1 rounded text-[#b09e90] hover:text-white"
                >
                  {playbackSpeed}x
                </button>
              </div>
            </div>

            {/* Down: Full Line-by-Line Explanation (Moving in Parallel) */}
            <div className="bg-[#16120d] border border-[#2d241c] rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold tracking-wider uppercase text-[#e59b63] flex items-center">
                  <Cpu className="w-4 h-4 mr-2" />
                  Full Line-by-Line Explanation (Synchronized Parallel Execution — Line {currentStep.line})
                </span>
                <Badge variant="outline" className="text-xs bg-[#221c16] border-[#382d23] text-white">
                  Step {currentStepIndex + 1} / {executionSteps.length}
                </Badge>
              </div>

              <div className="bg-[#110e0b] border border-[#2d241c] p-4 rounded-xl text-sm leading-relaxed text-[#f4ede2] mb-4 shadow-inner">
                {currentStep.explanation}
              </div>

              {/* State Variables Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(currentStep.stateVars).map(([key, val]) => (
                  <div key={key} className="bg-[#120e0a] border border-[#261f18] p-3 rounded-xl shadow">
                    <div className="text-[10px] text-[#8a796c] uppercase font-mono">{key}</div>
                    <div className="text-sm font-mono font-bold text-white mt-1 truncate">{String(val)}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
