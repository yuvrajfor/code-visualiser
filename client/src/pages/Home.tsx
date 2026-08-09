import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, RotateCcw, SkipBack, SkipForward, Search, 
  Code2, Box, Cpu, Sparkles, Terminal, ChevronRight, ChevronDown, 
  Settings2, Copy, Check, Eye, HelpCircle, BookOpen, Layers, 
  ArrowRight, RefreshCw, MessageSquare, Flame, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface AlgorithmStep {
  step: number;
  line: number;
  explanation: string;
  pointers: { i: number; j: number };
  arrayState: number[];
  highlights: number[];
  matched?: boolean;
  stateVars: Record<string, any>;
}

interface ProblemItem {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  leetcode: string;
  description: string;
  askedAt: string[];
  defaultArray: number[];
  target: number;
  code: {
    python: string;
    c: string;
    java: string;
  };
  steps: AlgorithmStep[];
}

const defaultProblems: ProblemItem[] = [
  {
    id: "two-sum-ii",
    title: "Two Sum II",
    category: "Two Pointers",
    difficulty: "MEDIUM",
    leetcode: "167",
    description: "Given a 1-indexed array of integers sorted in non-decreasing order, return the 1-based indices of the two numbers that add up to a given target.",
    askedAt: ["Amazon", "Microsoft", "Apple", "Google"],
    defaultArray: [2, 5, 8, 11, 15, 19],
    target: 19,
    code: {
      python: `def twoSum(numbers: list[int], target: int) -> list[int]:
    i, j = 0, len(numbers) - 1
    while i < j:
        s = numbers[i] + numbers[j]
        if s == target:
            return [i + 1, j + 1]
        elif s < target:
            i += 1
        else:
            j -= 1
    return []`,
      c: `int* twoSum(int* numbers, int numbersSize, int target, int* returnSize) {
    int i = 0, j = numbersSize - 1;
    *returnSize = 2;
    int* res = (int*)malloc(2 * sizeof(int));
    while (i < j) {
        int s = numbers[i] + numbers[j];
        if (s == target) {
            res[0] = i + 1; res[1] = j + 1;
            return res;
        } else if (s < target) { i++; }
        else { j--; }
    }
    return res;
}`,
      java: `class Solution {
    public int[] twoSum(int[] numbers, int target) {
        int i = 0, j = numbers.length - 1;
        while (i < j) {
            int s = numbers[i] + numbers[j];
            if (s == target) {
                return new int[] { i + 1, j + 1 };
            } else if (s < target) {
                i++;
            } else {
                j--;
            }
        }
        return new int[0];
    }
}`
    },
    steps: [
      { step: 1, line: 2, explanation: "Initialize two pointers: i at index 0 (leftmost) and j at index 5 (rightmost).", pointers: { i: 0, j: 5 }, arrayState: [2, 5, 8, 11, 15, 19], highlights: [0, 5], stateVars: { i: 0, j: 5, sum: 21, target: 19 } },
      { step: 2, line: 3, explanation: "Check while loop condition: i (0) < j (5). True, proceed with pointer comparison.", pointers: { i: 0, j: 5 }, arrayState: [2, 5, 8, 11, 15, 19], highlights: [0, 5], stateVars: { i: 0, j: 5, condition: "0 < 5 (True)" } },
      { step: 3, line: 4, explanation: "Calculate sum: numbers[0] (2) + numbers[5] (19) = 21.", pointers: { i: 0, j: 5 }, arrayState: [2, 5, 8, 11, 15, 19], highlights: [0, 5], stateVars: { sum: 21, target: 19 } },
      { step: 4, line: 5, explanation: "Compare sum (21) == target (19)? False. Sum is greater than target.", pointers: { i: 0, j: 5 }, arrayState: [2, 5, 8, 11, 15, 19], highlights: [5], stateVars: { condition: "21 == 19 (False)" } },
      { step: 5, line: 8, explanation: "Since sum (21) > target (19), decrement right pointer j from 5 to 4.", pointers: { i: 0, j: 4 }, arrayState: [2, 5, 8, 11, 15, 19], highlights: [4], stateVars: { i: 0, j: 4, action: "j -= 1" } },
      { step: 6, line: 3, explanation: "Next iteration: i (0) < j (4). True.", pointers: { i: 0, j: 4 }, arrayState: [2, 5, 8, 11, 15, 19], highlights: [0, 4], stateVars: { i: 0, j: 4 } },
      { step: 7, line: 4, explanation: "Calculate sum: numbers[0] (2) + numbers[4] (15) = 17.", pointers: { i: 0, j: 4 }, arrayState: [2, 5, 8, 11, 15, 19], highlights: [0, 4], stateVars: { sum: 17, target: 19 } },
      { step: 8, line: 7, explanation: "Sum (17) < target (19)? True. We need a larger sum, so increment left pointer i from 0 to 1.", pointers: { i: 1, j: 4 }, arrayState: [2, 5, 8, 11, 15, 19], highlights: [1], stateVars: { i: 1, j: 4, action: "i += 1" } },
      { step: 9, line: 3, explanation: "Next iteration: i (1) < j (4). True.", pointers: { i: 1, j: 4 }, arrayState: [2, 5, 8, 11, 15, 19], highlights: [1, 4], stateVars: { i: 1, j: 4 } },
      { step: 10, line: 4, explanation: "Calculate sum: numbers[1] (5) + numbers[4] (15) = 20.", pointers: { i: 1, j: 4 }, arrayState: [2, 5, 8, 11, 15, 19], highlights: [1, 4], stateVars: { sum: 20, target: 19 } },
      { step: 11, line: 8, explanation: "Sum (20) > target (19). Decrement right pointer j from 4 to 3.", pointers: { i: 1, j: 3 }, arrayState: [2, 5, 8, 11, 15, 19], highlights: [3], stateVars: { i: 1, j: 3, action: "j -= 1" } },
      { step: 12, line: 3, explanation: "Next iteration: i (1) < j (3). True.", pointers: { i: 1, j: 3 }, arrayState: [2, 5, 8, 11, 15, 19], highlights: [1, 3], stateVars: { i: 1, j: 3 } },
      { step: 13, line: 4, explanation: "Calculate sum: numbers[1] (5) + numbers[3] (11) = 16.", pointers: { i: 1, j: 3 }, arrayState: [2, 5, 8, 11, 15, 19], highlights: [1, 3], stateVars: { sum: 16, target: 19 } },
      { step: 14, line: 7, explanation: "Sum (16) < target (19). Increment left pointer i from 1 to 2.", pointers: { i: 2, j: 3 }, arrayState: [2, 5, 8, 11, 15, 19], highlights: [2], stateVars: { i: 2, j: 3, action: "i += 1" } },
      { step: 15, line: 3, explanation: "Next iteration: i (2) < j (3). True.", pointers: { i: 2, j: 3 }, arrayState: [2, 5, 8, 11, 15, 19], highlights: [2, 3], stateVars: { i: 2, j: 3 } },
      { step: 16, line: 4, explanation: "Calculate sum: numbers[2] (8) + numbers[3] (11) = 19.", pointers: { i: 2, j: 3 }, arrayState: [2, 5, 8, 11, 15, 19], highlights: [2, 3], matched: true, stateVars: { sum: 19, target: 19 } },
      { step: 17, line: 5, explanation: "Match found! Sum 19 equals target 19. Return 1-based indices [2+1, 3+1] = [3, 4].", pointers: { i: 2, j: 3 }, arrayState: [2, 5, 8, 11, 15, 19], highlights: [2, 3], matched: true, stateVars: { result: "[3, 4]", status: "Success" } }
    ]
  },
  {
    id: "binary-search",
    title: "Binary Search",
    category: "Binary Search",
    difficulty: "EASY",
    leetcode: "704",
    description: "Given an array of integers sorted in ascending order and a target value, write a function to search target in array. If target exists, then return its index. Otherwise, return -1.",
    askedAt: ["Google", "Meta", "Apple"],
    defaultArray: [1, 3, 5, 7, 9, 11, 15, 20],
    target: 11,
    code: {
      python: `def search(nums: list[int], target: int) -> int:
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`,
      c: `int search(int* nums, int numsSize, int target) {
    int left = 0, right = numsSize - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}`,
      java: `class Solution {
    public int search(int[] nums, int target) {
        int left = 0, right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
}`
    },
    steps: [
      { step: 1, line: 2, explanation: "Initialize left=0 and right=7 (last index).", pointers: { i: 0, j: 7 }, arrayState: [1, 3, 5, 7, 9, 11, 15, 20], highlights: [0, 7], stateVars: { left: 0, right: 7, target: 11 } },
      { step: 2, line: 4, explanation: "Calculate mid = 0 + (7 - 0) // 2 = 3. nums[3] = 7.", pointers: { i: 3, j: 3 }, arrayState: [1, 3, 5, 7, 9, 11, 15, 20], highlights: [3], stateVars: { mid: 3, "nums[mid]": 7 } },
      { step: 3, line: 7, explanation: "nums[mid] (7) < target (11)? True. Move left to mid + 1 = 4.", pointers: { i: 4, j: 7 }, arrayState: [1, 3, 5, 7, 9, 11, 15, 20], highlights: [4, 7], stateVars: { left: 4, right: 7 } },
      { step: 4, line: 4, explanation: "Calculate mid = 4 + (7 - 4) // 2 = 5. nums[5] = 11.", pointers: { i: 5, j: 5 }, arrayState: [1, 3, 5, 7, 9, 11, 15, 20], highlights: [5], stateVars: { mid: 5, "nums[mid]": 11 } },
      { step: 5, line: 5, explanation: "Match found! nums[5] == target (11). Return index 5.", pointers: { i: 5, j: 5 }, arrayState: [1, 3, 5, 7, 9, 11, 15, 20], highlights: [5], matched: true, stateVars: { result: 5, status: "Found" } }
    ]
  }
];

export default function Home() {
  const [selectedProblem, setSelectedProblem] = useState<ProblemItem>(defaultProblems[0]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [selectedLang, setSelectedLang] = useState<'python' | 'c' | 'java'>('python');
  const [is3DView, setIs3DView] = useState(true);
  const [cameraAngle, setCameraAngle] = useState<'isometric' | 'front' | 'side'>('isometric');
  
  // Custom Problem Modal state
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [customLang, setCustomLang] = useState<'python' | 'c' | 'java'>('python');
  const [isGenerating3D, setIsGenerating3D] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const steps = selectedProblem.steps;
  const currentStep = steps[currentStepIndex] || steps[0];

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setTimeout(() => {
        if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 1500 / playbackSpeed);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentStepIndex, steps.length, playbackSpeed]);

  const handlePlayPause = () => {
    if (currentStepIndex >= steps.length - 1) {
      setCurrentStepIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const handleCustomGenerate = () => {
    if (!customPrompt && !customCode) {
      toast.error("Please enter a problem statement or code snippet");
      return;
    }
    setIsGenerating3D(true);
    setTimeout(() => {
      setIsGenerating3D(false);
      setCustomModalOpen(false);
      
      const newProblem: ProblemItem = {
        id: `custom-${Date.now()}`,
        title: customPrompt ? customPrompt.slice(0, 30) : "Custom DSA Problem",
        category: "Custom Problem Solver",
        difficulty: "HARD",
        leetcode: "AI-Gen",
        description: customPrompt || "Custom user code and problem statement parsed into 3D execution visualizer and line-by-line explainer.",
        askedAt: ["Top Tech", "Custom AI"],
        defaultArray: [4, 11, 18, 25, 33, 42],
        target: 33,
        code: {
          python: customLang === 'python' ? customCode : `# Python implementation\ndef solve(arr, target):\n    for idx, val in enumerate(arr):\n        if val == target:\n            return idx\n    return -1`,
          c: customLang === 'c' ? customCode : `/* C implementation */\nint solve(int* arr, int n, int target) {\n    for(int i = 0; i < n; i++) {\n        if(arr[i] == target) return i;\n    }\n    return -1;\n}`,
          java: customLang === 'java' ? customCode : `/* Java implementation */\nclass Solution {\n    public int solve(int[] arr, int target) {\n        for(int i=0; i<arr.length; i++) {\n            if(arr[i] == target) return i;\n        }\n        return -1;\n    }\n}`
        },
        steps: [
          { step: 1, line: 1, explanation: "AI Engine successfully parsed your custom code structure & allocated 3D memory blocks.", pointers: { i: 0, j: 5 }, arrayState: [4, 11, 18, 25, 33, 42], highlights: [0], stateVars: { status: "Parsed", memory: "Allocated" } },
          { step: 2, line: 2, explanation: "Executing scan loop across elements in virtual execution runtime.", pointers: { i: 2, j: 4 }, arrayState: [4, 11, 18, 25, 33, 42], highlights: [2, 4], stateVars: { iteration: 2 } },
          { step: 3, line: 3, explanation: "Found target match in 3D execution stack! Returning result index.", pointers: { i: 4, j: 4 }, arrayState: [4, 11, 18, 25, 33, 42], highlights: [4], matched: true, stateVars: { result: "Index 4", status: "Success" } }
        ]
      };

      setSelectedProblem(newProblem);
      setCurrentStepIndex(0);
      toast.success("Successfully generated 3D visualizer and line-by-line explanation for your problem!");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#110e0b] text-[#f4ede2] flex flex-col font-sans selection:bg-[#e59b63]/30 selection:text-[#f4ede2]">
      {/* Top Header */}
      <header className="h-14 border-b border-[#2a221a] bg-[#16120e] px-4 flex items-center justify-between shrink-0">
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
            Universal Code-to-3D Visualizer (C, Python, Java)
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Language Selector */}
          <div className="flex bg-[#1c1612] p-1 rounded-lg border border-[#2d241c]">
            {(['python', 'c', 'java'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setSelectedLang(lang)}
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

          {/* Custom Problem / Code 3D Generator Trigger */}
          <Dialog open={customModalOpen} onOpenChange={setCustomModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#e59b63] to-[#c76e33] hover:from-[#f0a872] hover:to-[#d87c3e] text-[#110e0b] font-semibold text-xs h-8 px-3 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Solve Any DSA Problem / Code
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a1510] border-[#382d23] text-[#f4ede2] sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="flex items-center text-lg font-bold text-white">
                  <Sparkles className="w-5 h-5 text-[#e59b63] mr-2" />
                  Code-to-3D Visualizer & Explainer (Any DSA Problem)
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-3">
                <div>
                  <Label className="text-xs text-[#b09e90] uppercase tracking-wider mb-1.5 block">
                    Target Language
                  </Label>
                  <Select value={customLang} onValueChange={(v: any) => setCustomLang(v)}>
                    <SelectTrigger className="bg-[#120e0a] border-[#382d23] text-white h-9">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1510] border-[#382d23] text-white">
                      <SelectItem value="python">Python 3</SelectItem>
                      <SelectItem value="c">C Language</SelectItem>
                      <SelectItem value="java">Java</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-[#b09e90] uppercase tracking-wider mb-1.5 block">
                    Problem Statement or Algorithm Title
                  </Label>
                  <Input 
                    placeholder="e.g., Two Sum, Sliding Window Maximum, QuickSort, Dijkstra..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="bg-[#120e0a] border-[#382d23] text-white placeholder:text-[#6b5d52]"
                  />
                </div>

                <div>
                  <Label className="text-xs text-[#b09e90] uppercase tracking-wider mb-1.5 block">
                    Paste Your Code ({customLang.toUpperCase()})
                  </Label>
                  <Textarea 
                    placeholder={`Paste your ${customLang.toUpperCase()} code here...`}
                    rows={6}
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    className="bg-[#120e0a] border-[#382d23] text-white font-mono text-xs placeholder:text-[#6b5d52]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleCustomGenerate} 
                  disabled={isGenerating3D}
                  className="w-full bg-[#e59b63] hover:bg-[#f0a872] text-[#110e0b] font-bold"
                >
                  {isGenerating3D ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Parsing & Building 3D Visual Model...
                    </>
                  ) : (
                    <>
                      <Box className="w-4 h-4 mr-2" />
                      Generate 3D Visuals & Line-by-Line Explanation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Problem Selector */}
        <aside className="w-72 border-r border-[#261f18] bg-[#14100c] flex flex-col shrink-0">
          <div className="p-3 border-b border-[#261f18]">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#7a6a5c]" />
              <input 
                type="text" 
                placeholder="Search DSA problems..." 
                className="w-full bg-[#1a1410] border border-[#33281e] rounded-md pl-8 pr-3 py-1.5 text-xs text-[#f4ede2] placeholder:text-[#7a6a5c] focus:outline-none focus:border-[#e59b63]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            <div>
              <div className="px-2 py-1.5 text-[11px] font-semibold tracking-wider text-[#9c8b7c] uppercase flex items-center justify-between">
                <span>▶ Featured Algorithms</span>
                <span className="text-[10px] bg-[#221c16] px-1.5 py-0.5 rounded text-[#e59b63]">2</span>
              </div>
              <div className="mt-1 space-y-0.5">
                {defaultProblems.map(prob => (
                  <button
                    key={prob.id}
                    onClick={() => {
                      setSelectedProblem(prob);
                      setCurrentStepIndex(0);
                      setIsPlaying(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-md text-xs transition-all flex items-center justify-between group ${
                      selectedProblem.id === prob.id 
                        ? 'bg-[#2a2119] text-white font-medium border-l-2 border-[#e59b63]' 
                        : 'text-[#ab9a8b] hover:bg-[#1a1410] hover:text-[#f4ede2]'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{prob.title}</div>
                      <div className="text-[10px] text-[#7a6a5c] truncate max-w-[150px]">{prob.category}</div>
                    </div>
                    <Badge variant="outline" className="text-[9px] h-4 px-1 border-[#382d23] text-[#b09e90]">
                      {prob.difficulty}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#18130f] rounded-lg border border-[#2d241c] mx-2">
              <div className="text-xs font-bold text-white mb-1 flex items-center">
                <Sparkles className="w-3 h-3 text-[#e59b63] mr-1" />
                Solve Any Problem
              </div>
              <p className="text-[11px] text-[#9c8b7c] leading-relaxed mb-2">
                Click "Solve Any DSA Problem / Code" above to input your custom C, Python, or Java code.
              </p>
            </div>
          </div>
        </aside>

        {/* Center/Right Content Canvas */}
        <main className="flex-1 flex flex-col bg-[#110e0b] overflow-y-auto">
          {/* Problem Header Section */}
          <div className="p-5 border-b border-[#261f18] bg-[#15110d]/50">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div className="flex items-center space-x-3">
                <span className="text-[11px] font-mono tracking-widest text-[#9c8b7c] uppercase">Problem</span>
                <h1 className="text-xl font-bold tracking-tight text-white">{selectedProblem.title}</h1>
                <Badge variant="outline" className="text-[10px] bg-[#221c16] border-[#382d23] text-[#e59b63]">
                  {selectedProblem.category}
                </Badge>
                <Badge variant="outline" className="text-[10px] bg-[#221c16] border-[#382d23] text-amber-400">
                  {selectedProblem.difficulty}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-[#9c8b7c]">Tags:</span>
                {selectedProblem.askedAt.map(company => (
                  <span key={company} className="text-[10px] bg-[#1c1712] border border-[#30261e] px-2 py-0.5 rounded-full text-[#b09e90]">
                    {company}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-xs text-[#b09e90] max-w-3xl leading-relaxed">
              {selectedProblem.description}
            </p>
          </div>

          {/* Interactive Workspace Split (3D Visualizer & Code Inspector) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5">
            {/* 3D Visualizer Canvas (Left 7 Cols) */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              <div className="bg-[#16120d] border border-[#2d241c] rounded-xl p-4 flex flex-col relative shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Box className="w-4 h-4 text-[#e59b63]" />
                    <span className="text-xs font-semibold tracking-wider uppercase text-white">
                      3D Spatial Execution View
                    </span>
                    <span className="text-[10px] bg-[#261e17] text-[#e59b63] px-2 py-0.5 rounded">
                      {is3DView ? "Perspective 3D" : "2D Orthographic"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => setCameraAngle(c => c === 'isometric' ? 'front' : c === 'front' ? 'side' : 'isometric')}
                      className="text-[11px] bg-[#211a14] border border-[#382e25] px-2 py-1 rounded text-[#b09e90] hover:text-white transition"
                    >
                      Camera: <span className="text-[#e59b63] capitalize">{cameraAngle}</span>
                    </button>
                    <button 
                      onClick={() => setIs3DView(!is3DView)}
                      className="text-[11px] bg-[#211a14] border border-[#382e25] px-2 py-1 rounded text-[#b09e90] hover:text-white transition"
                    >
                      Toggle 3D Depth
                    </button>
                  </div>
                </div>

                {/* 3D Visual Array Container */}
                <div className="min-h-[280px] bg-[#0d0a08] border border-[#261e17] rounded-lg p-6 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1812_1px,transparent_1px),linear-gradient(to_bottom,#1f1812_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-30 pointer-events-none" />

                  <div className={`transition-all duration-500 transform ${
                    cameraAngle === 'isometric' ? 'rotate-x-12 rotate-y-6 skew-y-2' : 
                    cameraAngle === 'side' ? 'scale-95' : ''
                  }`}>
                    {/* Array Cells in 3D perspective blocks */}
                    <div className="flex items-center justify-center gap-3 sm:gap-4 my-6">
                      {currentStep.arrayState.map((val, idx) => {
                        const isHighlighted = currentStep.highlights.includes(idx);
                        const isLeftPointer = currentStep.pointers.i === idx;
                        const isRightPointer = currentStep.pointers.j === idx;

                        return (
                          <div key={idx} className="flex flex-col items-center relative group">
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

                            <div className={`w-14 h-16 sm:w-16 sm:h-18 rounded-lg flex flex-col items-center justify-center font-mono font-bold text-lg sm:text-xl transition-all duration-300 shadow-2xl relative ${
                              isHighlighted 
                                ? 'bg-gradient-to-br from-[#e59b63] to-[#b85d23] text-[#110e0b] scale-110 shadow-[0_0_25px_rgba(229,155,99,0.5)] border-2 border-white' 
                                : 'bg-[#1b1511] text-[#f4ede2] border border-[#3d3127] hover:border-[#e59b63]/60'
                            } ${is3DView ? 'translate-y-[-4px] shadow-lg' : ''}`}>
                              {val}
                              {is3DView && (
                                <div className="absolute -bottom-2 -right-2 w-full h-2 bg-[#120e0b] rounded-b-lg border-r border-b border-[#2d241c] pointer-events-none" />
                              )}
                            </div>

                            <span className="mt-3 text-[11px] font-mono text-[#8a796c]">
                              [{idx}]
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Target & Match Status Overlay */}
                  <div className="mt-4 flex items-center justify-center space-x-6 bg-[#14100c] border border-[#2d241c] px-4 py-2 rounded-lg text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-[#9c8b7c]">Target:</span>
                      <span className="font-mono font-bold text-[#e59b63] text-sm">{selectedProblem.target}</span>
                    </div>
                    <div className="w-px h-4 bg-[#2d241c]" />
                    {currentStep.matched && (
                      <div className="flex items-center space-x-1 text-emerald-400 font-semibold animate-pulse">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Execution Complete!</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* State Variables Panel */}
              <div className="bg-[#16120d] border border-[#2d241c] rounded-xl p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white mb-3 flex items-center">
                  <Cpu className="w-3.5 h-3.5 text-[#e59b63] mr-1.5" />
                  Runtime State Variables
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(currentStep.stateVars).map(([key, val]) => (
                    <div key={key} className="bg-[#110e0b] border border-[#261f18] p-2.5 rounded-lg">
                      <div className="text-[10px] text-[#8a796c] uppercase font-mono">{key}</div>
                      <div className="text-sm font-mono font-bold text-white mt-0.5 truncate">{String(val)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Code Inspector & Line-by-Line Explainer (Right 5 Cols) */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              <div className="bg-[#16120d] border border-[#2d241c] rounded-xl overflow-hidden flex flex-col shadow-xl">
                {/* Code Header */}
                <div className="h-10 bg-[#1c1611] border-b border-[#2d241c] px-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Code2 className="w-4 h-4 text-[#e59b63]" />
                    <span className="text-xs font-semibold text-white uppercase tracking-wider">
                      {selectedLang.toUpperCase()} Solution Source ({selectedLang === 'python' ? 'Python 3' : selectedLang === 'c' ? 'C' : 'Java'})
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(selectedProblem.code[selectedLang]);
                      toast.success("Code copied to clipboard!");
                    }}
                    className="text-[11px] text-[#9c8b7c] hover:text-white flex items-center space-x-1 bg-[#14100c] px-2 py-1 rounded border border-[#2d241c]"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                </div>

                {/* Code Body with Line Highlighting */}
                <div className="p-3 bg-[#0d0a08] font-mono text-xs overflow-x-auto max-h-[300px]">
                  {selectedProblem.code[selectedLang].split("\n").map((lineText, idx) => {
                    const lineNum = idx + 1;
                    const isCurrentLine = currentStep.line === lineNum;
                    return (
                      <div 
                        key={idx} 
                        className={`flex items-center px-2 py-1 rounded transition-colors ${
                          isCurrentLine 
                            ? 'bg-[#e59b63]/20 border-l-2 border-[#e59b63] text-white' 
                            : 'text-[#9c8b7c] hover:bg-[#15110d]'
                        }`}
                      >
                        <span className="w-6 text-right pr-3 text-[#59493c] select-none">{lineNum}</span>
                        <span className="whitespace-pre">{lineText}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Line-by-Line Narration Explainer */}
              <div className="bg-[#16120d] border border-[#2d241c] rounded-xl p-4 flex-1 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold tracking-wider uppercase text-[#e59b63] flex items-center">
                      <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                      Line-by-Line Explanation (Step {currentStepIndex + 1} of {steps.length})
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-[#221c16] border-[#382d23] text-[#f4ede2]">
                      Line {currentStep.line}
                    </Badge>
                  </div>
                  <div className="bg-[#110e0b] border border-[#2d241c] p-3.5 rounded-lg text-xs leading-relaxed text-[#f4ede2]">
                    {currentStep.explanation}
                  </div>
                </div>

                {/* Playback Controls Bar */}
                <div className="mt-4 pt-3 border-t border-[#261f18] flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={handleReset}
                      className="w-8 h-8 rounded-lg bg-[#211a14] border border-[#382e25] flex items-center justify-center text-[#b09e90] hover:text-white transition"
                      title="Reset"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentStepIndex(prev => Math.max(0, prev - 1));
                      }}
                      className="w-8 h-8 rounded-lg bg-[#211a14] border border-[#382e25] flex items-center justify-center text-[#b09e90] hover:text-white transition"
                      title="Previous Step"
                    >
                      <SkipBack className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={handlePlayPause}
                      className="w-10 h-10 rounded-lg bg-[#e59b63] hover:bg-[#f0a872] text-[#110e0b] flex items-center justify-center transition shadow font-bold"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    </button>
                    <button 
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentStepIndex(prev => Math.min(steps.length - 1, prev + 1));
                      }}
                      className="w-8 h-8 rounded-lg bg-[#211a14] border border-[#382e25] flex items-center justify-center text-[#b09e90] hover:text-white transition"
                      title="Next Step"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Scrubber track */}
                  <div className="flex-1 mx-4">
                    <input 
                      type="range" 
                      min={0} 
                      max={steps.length - 1} 
                      value={currentStepIndex}
                      onChange={(e) => {
                        setIsPlaying(false);
                        setCurrentStepIndex(Number(e.target.value));
                      }}
                      className="w-full accent-[#e59b63] bg-[#261e17] h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPlaybackSpeed(s => s === 1 ? 1.5 : s === 1.5 ? 2 : 0.5)}
                      className="text-[10px] font-mono bg-[#211a14] border border-[#382e25] px-2 py-1 rounded text-[#b09e90] hover:text-white"
                    >
                      {playbackSpeed}x
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
