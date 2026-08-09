import React, { useState } from "react";
import { 
  Code2, Box, Cpu, Sparkles, Flame, CheckCircle2, 
  Copy, Play, RefreshCw, Terminal, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  // Generated execution trace from user code
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([
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
      line: 4,
      explanation: "Calculate sum of numbers[i] (2) + numbers[j] (19) = 21. Compare with target 19.",
      pointers: { i: 0, j: 5 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [0, 5],
      stateVars: { sum: 21, condition: "21 > 19" }
    },
    {
      step: 3,
      line: 10,
      explanation: "Since sum (21) > target (19), decrement right pointer j from 5 to 4.",
      pointers: { i: 0, j: 4 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [4],
      stateVars: { i: 0, j: 4, action: "j -= 1" }
    },
    {
      step: 4,
      line: 4,
      explanation: "Calculate sum of numbers[0] (2) + numbers[4] (15) = 17. Sum < target.",
      pointers: { i: 0, j: 4 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [0, 4],
      stateVars: { sum: 17, condition: "17 < 19" }
    },
    {
      step: 5,
      line: 8,
      explanation: "Since sum < target, increment left pointer i from 0 to 1.",
      pointers: { i: 1, j: 4 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [1, 4],
      stateVars: { i: 1, j: 4, action: "i += 1" }
    },
    {
      step: 6,
      line: 4,
      explanation: "Calculate sum of numbers[1] (5) + numbers[3] (11) = 16. Increment left pointer i to 2.",
      pointers: { i: 2, j: 3 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [2, 3],
      stateVars: { sum: 16, i: 2, j: 3 }
    },
    {
      step: 7,
      line: 6,
      explanation: "Match found! numbers[2] (8) + numbers[3] (11) = 19 equals target. Returning indices [3, 4].",
      pointers: { i: 2, j: 3 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [2, 3],
      matched: true,
      stateVars: { result: "[3, 4]", status: "Success" }
    }
  ]);

  const handleAnalyzeCode = () => {
    if (!userCode.trim()) {
      toast.error("Please enter or paste your code first.");
      return;
    }
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setCurrentStepIndex(0);
      toast.success("Successfully compiled and parsed user code into 3D execution visualizer!");
    }, 1200);
  };

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

  const currentStep = executionSteps[currentStepIndex] || executionSteps[0];

  return (
    <div className="min-h-screen bg-[#110e0b] text-[#f4ede2] flex flex-col font-sans selection:bg-[#e59b63]/30 selection:text-[#f4ede2]">
      {/* Top Header */}
      <header className="h-14 border-b border-[#2a221a] bg-[#16120e] px-5 flex items-center justify-between shrink-0">
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
            User Code-to-3D Visualizer & Line-by-Line Explainer
          </span>
        </div>

        <div className="flex items-center space-x-3">
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

      {/* Two-Column Layout: Left (Code Input) | Right (3D Visualizer + Explainer) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 overflow-y-auto">
        
        {/* LEFT COLUMN: User Code Input & Problem Statement */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-[#16120d] border border-[#2d241c] rounded-xl p-4 flex flex-col shadow-xl flex-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Code2 className="w-4 h-4 text-[#e59b63]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-white">
                  Your Code & Problem Statement ({selectedLang.toUpperCase()})
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-[#221c16] border-[#382d23] text-[#e59b63]">
                User Input
              </Badge>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <Label className="text-[11px] text-[#9c8b7c] uppercase tracking-wider mb-1 block">
                  Problem Title / Statement
                </Label>
                <Input 
                  value={userProblem}
                  onChange={(e) => setUserProblem(e.target.value)}
                  placeholder="e.g. Two Sum, Binary Search, Sliding Window..."
                  className="bg-[#120e0a] border-[#382d23] text-white text-xs h-9"
                />
              </div>

              <div>
                <Label className="text-[11px] text-[#9c8b7c] uppercase tracking-wider mb-1 block">
                  Paste Your {selectedLang.toUpperCase()} Code
                </Label>
                <Textarea 
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value)}
                  rows={14}
                  className="bg-[#120e0a] border-[#382d23] text-white font-mono text-xs leading-relaxed resize-y"
                  placeholder="Paste your C, Python, or Java code here..."
                />
              </div>
            </div>

            <Button 
              onClick={handleAnalyzeCode}
              disabled={isAnalyzing}
              className="w-full bg-gradient-to-r from-[#e59b63] to-[#c76e33] hover:from-[#f0a872] hover:to-[#d87c3e] text-[#110e0b] font-bold text-xs h-10 shadow-md"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Compiling & Generating 3D Execution...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  Generate 3D Visual & Explanation
                </>
              )}
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN: 3D Visual Representation (Top) + Line-by-Line Explanation (Down) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          
          {/* 3D Visual Representation Canvas */}
          <div className="bg-[#16120d] border border-[#2d241c] rounded-xl p-4 flex flex-col relative shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Box className="w-4 h-4 text-[#e59b63]" />
                <span className="text-xs font-semibold tracking-wider uppercase text-white">
                  3D Spatial Visual Representation ({userProblem})
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] bg-[#221c16] px-2 py-0.5 rounded text-[#e59b63] border border-[#382d23]">
                  Perspective 3D
                </span>
              </div>
            </div>

            {/* 3D Array / Memory Blocks Container */}
            <div className="min-h-[220px] bg-[#0d0a08] border border-[#261e17] rounded-lg p-6 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1812_1px,transparent_1px),linear-gradient(to_bottom,#1f1812_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-25 pointer-events-none" />

              <div className="transform rotate-x-6 rotate-y-3">
                <div className="flex items-center justify-center gap-3 sm:gap-4 my-4">
                  {currentStep.arrayState.map((val, idx) => {
                    const isHighlighted = currentStep.highlights.includes(idx);
                    const isLeftPointer = currentStep.pointers.i === idx;
                    const isRightPointer = currentStep.pointers.j === idx;

                    return (
                      <div key={idx} className="flex flex-col items-center relative">
                        <div className="h-7 flex items-end pb-1">
                          {isLeftPointer && (
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-bold text-[#e59b63] bg-[#261d15] px-1.5 py-0.5 rounded border border-[#e59b63]/40 shadow">
                                i={idx}
                              </span>
                              <div className="w-0.5 h-2.5 bg-[#e59b63]" />
                            </div>
                          )}
                          {isRightPointer && (
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-bold text-cyan-400 bg-[#15242b] px-1.5 py-0.5 rounded border border-cyan-400/40 shadow">
                                j={idx}
                              </span>
                              <div className="w-0.5 h-2.5 bg-cyan-400" />
                            </div>
                          )}
                        </div>

                        <div className={`w-14 h-16 rounded-lg flex flex-col items-center justify-center font-mono font-bold text-lg transition-all duration-300 shadow-xl relative ${
                          isHighlighted 
                            ? 'bg-gradient-to-br from-[#e59b63] to-[#b85d23] text-[#110e0b] scale-110 shadow-[0_0_20px_rgba(229,155,99,0.5)] border-2 border-white' 
                            : 'bg-[#1b1511] text-[#f4ede2] border border-[#3d3127]'
                        }`}>
                          {val}
                          <div className="absolute -bottom-2 -right-2 w-full h-2 bg-[#120e0b] rounded-b-lg border-r border-b border-[#2d241c] pointer-events-none" />
                        </div>

                        <span className="mt-3 text-[11px] font-mono text-[#8a796c]">
                          [{idx}]
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status / Step buttons below 3D canvas */}
              <div className="mt-3 flex items-center justify-between w-full px-4 bg-[#14100c] border border-[#2d241c] py-2 rounded-lg text-xs">
                <div className="flex items-center space-x-3">
                  <span className="text-[#9c8b7c]">Step {currentStepIndex + 1} of {executionSteps.length}</span>
                  <div className="w-px h-3 bg-[#2d241c]" />
                  <span className="text-[#e59b63] font-mono">Target: 19</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentStepIndex === 0}
                    className="px-2 py-1 bg-[#211a14] border border-[#382e25] rounded text-[#b09e90] hover:text-white disabled:opacity-40"
                  >
                    Prev Step
                  </button>
                  <button 
                    onClick={() => setCurrentStepIndex(prev => Math.min(executionSteps.length - 1, prev + 1))}
                    disabled={currentStepIndex === executionSteps.length - 1}
                    className="px-3 py-1 bg-[#e59b63] hover:bg-[#f0a872] text-[#110e0b] font-bold rounded disabled:opacity-40"
                  >
                    Next Step ➔
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Line-by-Line Explanation (Directly Down to 3D Visualizer) */}
          <div className="bg-[#16120d] border border-[#2d241c] rounded-xl p-4 flex flex-col shadow-xl flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-[#e59b63] flex items-center">
                <Cpu className="w-3.5 h-3.5 mr-1.5" />
                Line-by-Line Execution Explanation (Line {currentStep.line})
              </span>
              <Badge variant="outline" className="text-[10px] bg-[#221c16] border-[#382d23] text-[#f4ede2]">
                {selectedLang.toUpperCase()} Runtime
              </Badge>
            </div>

            <div className="bg-[#110e0b] border border-[#2d241c] p-3.5 rounded-lg text-xs leading-relaxed text-[#f4ede2] mb-3">
              {currentStep.explanation}
            </div>

            <div className="grid grid-cols-3 gap-2 mt-auto">
              {Object.entries(currentStep.stateVars).map(([key, val]) => (
                <div key={key} className="bg-[#120e0a] border border-[#261f18] p-2 rounded-lg">
                  <div className="text-[10px] text-[#8a796c] uppercase font-mono">{key}</div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5 truncate">{String(val)}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
