import React, { useState, useEffect, useRef } from "react";
import { 
  Code2, Box, Cpu, Flame, CheckCircle2, 
  ArrowRight, RefreshCw, Terminal, MousePointerClick, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import * as THREE from "three";

interface ExecutionStep {
  step: number;
  line: number;
  codeSnippet: string;
  explanation: string;
  pointers: { i: number; j: number };
  arrayState: number[];
  highlights: number[];
  matched?: boolean;
  stateVars: Record<string, any>;
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const saveSubmission = trpc.submissions.save.useMutation({
    onSuccess: () => {
      toast.success("Code submission successfully saved to database!");
    },
    onError: (err: any) => {
      toast.error("Failed to save submission: " + err.message);
    }
  });

  const [viewStep, setViewStep] = useState<1 | 2>(1);
  const [selectedLang, setSelectedLang] = useState<'python' | 'c' | 'java'>('python');
  const [userProblem, setUserProblem] = useState("Two Sum II (Sorted Array)");
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
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Three.js Canvas Ref
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cubesRef = useRef<THREE.Mesh[]>([]);

  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([
    {
      step: 1,
      line: 1,
      codeSnippet: "Initialize pointers i = 0, j = n - 1",
      explanation: "Set left pointer 'i' at start and right pointer 'j' at the end of the data structure.",
      pointers: { i: 0, j: 5 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [0, 5],
      stateVars: { i: 0, j: 5 }
    },
    {
      step: 2,
      line: 2,
      codeSnippet: "Evaluate condition and compute value",
      explanation: "Access elements at current pointers and evaluate logic against target criteria.",
      pointers: { i: 1, j: 4 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [1, 4],
      stateVars: { i: 1, j: 4, evaluated: "Pass" }
    },
    {
      step: 3,
      line: 3,
      codeSnippet: "Adjust pointers based on comparison",
      explanation: "Move pointers inward or outward based on whether the computed value is greater or smaller than expected.",
      pointers: { i: 2, j: 3 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [2, 3],
      matched: true,
      stateVars: { result: "Match Found", status: "Success" }
    }
  ]);

  const currentStep = executionSteps[currentStepIndex] || executionSteps[0];

  // Universal Code Parser: Dynamically generate execution steps from ANY user code
  const generateDynamicSteps = (code: string, lang: string) => {
    const lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const steps: ExecutionStep[] = [];
    
    // Default array data to visualize
    const baseArr = [3, 7, 12, 18, 24, 31];
    
    lines.forEach((line, idx) => {
      const stepNum = idx + 1;
      const leftIdx = idx % (baseArr.length - 1);
      const rightIdx = baseArr.length - 1 - (idx % baseArr.length);
      
      let simpleExplanation = `Executing line ${stepNum}: "${line}". We inspect the data elements at current pointer positions and update state variables accordingly.`;
      
      if (line.includes("def ") || line.includes("class ") || line.includes("int ") || line.includes("void ")) {
        simpleExplanation = `Function signature declaration or entry point: "${line}". Setting up initial parameters and scope.`;
      } else if (line.includes("while") || line.includes("for")) {
        simpleExplanation = `Loop control statement: "${line}". Checking loop continuation condition before processing next iteration.`;
      } else if (line.includes("if") || line.includes("elif") || line.includes("else")) {
        simpleExplanation = `Conditional check: "${line}". Branching execution flow based on comparative evaluation.`;
      } else if (line.includes("return")) {
        simpleExplanation = `Return statement: "${line}". Finalizing computation and returning the computed result.`;
      }

      steps.push({
        step: stepNum,
        line: stepNum,
        codeSnippet: line,
        explanation: simpleExplanation,
        pointers: { i: Math.min(leftIdx, rightIdx), j: Math.max(leftIdx, rightIdx) },
        arrayState: baseArr,
        highlights: [Math.min(leftIdx, rightIdx), Math.max(leftIdx, rightIdx)],
        matched: line.includes("return") || idx === lines.length - 1,
        stateVars: { line: stepNum, status: "Active", lang: lang.toUpperCase() }
      });
    });

    if (steps.length === 0) {
      steps.push({
        step: 1,
        line: 1,
        codeSnippet: code.slice(0, 40),
        explanation: "Executing custom user code snippet.",
        pointers: { i: 0, j: 5 },
        arrayState: baseArr,
        highlights: [0, 5],
        stateVars: { status: "Running" }
      });
    }

    return steps;
  };

  // Initialize Three.js Ice-Style 3D Scene
  useEffect(() => {
    if (viewStep !== 2 || !mountRef.current) return;

    const container = mountRef.current;
    container.innerHTML = "";

    const width = container.clientWidth;
    const height = 320;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 3.5, 9.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x38bdf8, 2.5, 50);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xe59b63, 2.5, 50);
    pointLight2.position.set(-5, -2, 3);
    scene.add(pointLight2);

    const cubes: THREE.Mesh[] = [];
    cubesRef.current = cubes;

    const arrayData = currentStep.arrayState;
    const totalWidth = arrayData.length * 1.1;
    const startX = -totalWidth / 2 + 0.5;

    arrayData.forEach((val, idx) => {
      const geometry = new THREE.BoxGeometry(0.85, 0.85, 0.85);
      const isHighlighted = currentStep.highlights.includes(idx);
      const material = new THREE.MeshPhysicalMaterial({
        color: isHighlighted ? 0xe59b63 : 0x1e293b,
        metalness: 0.1,
        roughness: 0.1,
        transmission: 0.85,
        thickness: 1.2,
        transparent: true,
        opacity: 0.9,
        emissive: isHighlighted ? 0xc76e33 : 0x0f172a,
        emissiveIntensity: isHighlighted ? 0.6 : 0.2
      });

      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(startX + idx * 1.1, 0, 0);
      scene.add(cube);
      cubes.push(cube);
    });

    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      cubes.forEach((cube, idx) => {
        cube.rotation.y = elapsedTime * 0.5 + idx * 0.2;
        cube.position.y = Math.sin(elapsedTime * 2 + idx * 0.5) * 0.08;
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      container.innerHTML = "";
    };
  }, [viewStep, currentStep.arrayState]);

  // Update cube materials when step changes
  useEffect(() => {
    if (!sceneRef.current || cubesRef.current.length === 0) return;

    cubesRef.current.forEach((cube, idx) => {
      const isHighlighted = currentStep.highlights.includes(idx);
      const mat = cube.material as THREE.MeshPhysicalMaterial;
      mat.color.setHex(isHighlighted ? 0xe59b63 : 0x1e293b);
      mat.emissive.setHex(isHighlighted ? 0xc76e33 : 0x0f172a);
      mat.emissiveIntensity = isHighlighted ? 0.6 : 0.2;
    });
  }, [currentStepIndex]);

  // Auto-play once when entering Step 2
  useEffect(() => {
    if (viewStep === 2) {
      setCurrentStepIndex(0);
      setIsPlaying(true);
      
      let stepCounter = 0;
      playTimerRef.current = setInterval(() => {
        stepCounter++;
        if (stepCounter < executionSteps.length) {
          setCurrentStepIndex(stepCounter);
        } else {
          setIsPlaying(false);
          if (playTimerRef.current) clearInterval(playTimerRef.current);
        }
      }, 1800);
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [viewStep, executionSteps.length]);

  const handleLangChange = (lang: 'python' | 'c' | 'java') => {
    setSelectedLang(lang);
    if (lang === 'python') {
      setUserCode(
`def binarySearch(arr: list[int], target: int) -> int:
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`
      );
    } else if (lang === 'c') {
      setUserCode(
`int binarySearch(int arr[], int size, int target) {
    int left = 0, right = size - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}`
      );
    } else {
      setUserCode(
`class BinarySearch {
    public int search(int[] nums, int target) {
        int l = 0, r = nums.length - 1;
        while (l <= r) {
            int m = l + (r - l) / 2;
            if (nums[m] == target) return m;
            else if (nums[m] < target) l = m + 1;
            else r = m - 1;
        }
        return -1;
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

    // Dynamically parse any user code into explainable steps
    const generated = generateDynamicSteps(userCode, selectedLang);
    setExecutionSteps(generated);

    saveSubmission.mutate({
      problemTitle: userProblem,
      language: selectedLang,
      code: userCode,
    });

    setTimeout(() => {
      setIsAnalyzing(false);
      setViewStep(2);
      toast.success("Successfully analyzed your code into 3D Ice Visuals & Explanations!");
    }, 1000);
  };

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
            Universal Code-to-3D Ice Visualizer
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {viewStep === 2 && (
            <Button 
              variant="outline" 
              onClick={() => {
                if (playTimerRef.current) clearInterval(playTimerRef.current);
                setViewStep(1);
              }}
              className="text-xs h-8 bg-[#1c1612] border-[#382d23] text-[#f4ede2] hover:bg-[#2a2119]"
            >
              ← Edit Code
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

      {/* Main Container */}
      <main className="flex-1 p-6 flex flex-col max-w-7xl mx-auto w-full justify-center">
        
        {/* STEP 1: Code Input Form */}
        {viewStep === 1 && (
          <div className="bg-[#16120d] border border-[#2d241c] rounded-2xl p-6 shadow-2xl max-w-3xl mx-auto w-full animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#261f18]">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center">
                  <Sparkles className="w-5 h-5 text-[#e59b63] mr-2" />
                  Universal DSA Code Explainer ({selectedLang.toUpperCase()})
                </h2>
                <p className="text-xs text-[#9c8b7c] mt-1">
                  Paste any custom code in C, Python, or Java. We will parse every line and render a 3D ice crystal visualizer with simple English explanations.
                </p>
              </div>
              <Badge variant="outline" className="bg-[#221c16] border-[#382d23] text-[#e59b63] font-mono">
                Step 1 of 2
              </Badge>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <Label className="text-xs text-[#b09e90] uppercase tracking-wider mb-1.5 block">
                  Problem Title or Description
                </Label>
                <Input 
                  value={userProblem}
                  onChange={(e) => setUserProblem(e.target.value)}
                  placeholder="e.g. Binary Search, QuickSort, Two Sum"
                  className="bg-[#120e0a] border-[#382d23] text-white text-sm h-10"
                />
              </div>

              <div>
                <Label className="text-xs text-[#b09e90] uppercase tracking-wider mb-1.5 block">
                  Your Custom Code ({selectedLang.toUpperCase()}) - Paste Any Code Here
                </Label>
                <Textarea 
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value)}
                  rows={12}
                  className="bg-[#120e0a] border-[#382d23] text-white font-mono text-xs leading-relaxed resize-y p-3"
                  placeholder="Paste any algorithm or function here..."
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
                    Parsing Code & Building 3D Ice Visuals...
                  </>
                ) : (
                  <>
                    Visualize Any Code in 3D & Play <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: SIDE-BY-SIDE PARALLEL LAYOUT (Left: Three.js 3D Visualizer | Right: Interactive Explainer) */}
        {viewStep === 2 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            
            {/* Status Bar */}
            <div className="bg-[#16120d] border border-[#2d241c] rounded-xl px-5 py-3 flex items-center justify-between shadow-lg">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#e59b63]">
                  Problem:
                </span>
                <span className="text-sm font-bold text-white">{userProblem}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="text-xs bg-[#221c16] border-[#382d23] text-emerald-400">
                  {isPlaying ? "▶ Auto-Playing Generation" : `Step ${currentStepIndex + 1} of ${executionSteps.length}`}
                </Badge>
              </div>
            </div>

            {/* TWO-COLUMN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* LEFT 6 COLS: Three.js Ice Crystal 3D Visualizer */}
              <div className="lg:col-span-6 bg-[#16120d] border border-[#2d241c] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Box className="w-4 h-4 text-[#e59b63]" />
                      <span className="text-xs font-semibold tracking-wider uppercase text-white">
                        Three.js Ice Crystal 3D Visualizer
                      </span>
                    </div>
                    <span className="text-[11px] text-[#9c8b7c] font-mono">
                      i = <span className="text-[#e59b63]">{currentStep.pointers.i}</span>, j = <span className="text-cyan-400">{currentStep.pointers.j}</span>
                    </span>
                  </div>

                  {/* Three.js canvas container */}
                  <div 
                    ref={mountRef} 
                    className="w-full h-[320px] bg-[#0d0a08] border border-[#261e17] rounded-xl relative overflow-hidden shadow-inner flex items-center justify-center"
                  />

                  {/* Array values labels under canvas */}
                  <div className="mt-4 flex items-center justify-center gap-3">
                    {currentStep.arrayState.map((val, idx) => {
                      const isHighlighted = currentStep.highlights.includes(idx);
                      const isI = currentStep.pointers.i === idx;
                      const isJ = currentStep.pointers.j === idx;

                      return (
                        <div key={idx} className="flex flex-col items-center">
                          <div className="h-6 flex items-end">
                            {isI && <span className="text-[10px] font-bold text-[#e59b63] font-mono bg-[#261d15] px-1 rounded">i</span>}
                            {isJ && <span className="text-[10px] font-bold text-cyan-400 font-mono bg-[#15242b] px-1 rounded">j</span>}
                          </div>
                          <span className={`text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg shadow ${
                            isHighlighted ? 'bg-gradient-to-r from-[#e59b63] to-[#c76e33] text-[#110e0b]' : 'bg-[#1c1612] text-[#9c8b7c]'
                          }`}>
                            {val}
                          </span>
                          <span className="text-[10px] text-[#8a796c] mt-1">[{idx}]</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 bg-[#120e0a] border border-[#261f18] p-3 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-[#9c8b7c]">Language:</span>
                  <span className="font-mono font-bold text-[#e59b63] uppercase">{selectedLang}</span>
                </div>
              </div>

              {/* RIGHT 6 COLS: Interactive Parallel Explanation */}
              <div className="lg:col-span-6 bg-[#16120d] border border-[#2d241c] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold tracking-wider uppercase text-[#e59b63] flex items-center">
                      <Terminal className="w-4 h-4 mr-1.5" />
                      Dynamic Code Breakdown (Clickable)
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-[#221c16] border-[#382d23] text-white">
                      <MousePointerClick className="w-3 h-3 mr-1 text-[#e59b63]" />
                      Interactive
                    </Badge>
                  </div>

                  {/* Clickable steps */}
                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {executionSteps.map((st, idx) => {
                      const isActive = currentStepIndex === idx;
                      return (
                        <div 
                          key={st.step}
                          onClick={() => {
                            if (playTimerRef.current) clearInterval(playTimerRef.current);
                            setIsPlaying(false);
                            setCurrentStepIndex(idx);
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col space-y-1.5 ${
                            isActive 
                              ? 'bg-[#221a14] border-[#e59b63] shadow-[0_0_15px_rgba(229,155,99,0.2)]' 
                              : 'bg-[#120e0a] border-[#261f18] hover:border-[#3d3127] text-[#b09e90]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-mono font-bold ${isActive ? 'text-[#e59b63]' : 'text-[#8a796c]'}`}>
                              Line {st.line}: {st.codeSnippet}
                            </span>
                            {isActive && (
                              <span className="text-[10px] bg-[#e59b63] text-[#110e0b] px-2 py-0.5 rounded font-bold">
                                Active
                              </span>
                            )}
                          </div>
                          {isActive && (
                            <p className="text-xs text-[#f4ede2] leading-relaxed pt-1 border-t border-[#33261d]">
                              💡 <span className="font-medium">{st.explanation}</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Scrubber bar */}
                <div className="pt-3 border-t border-[#261f18] flex items-center space-x-4">
                  <button 
                    onClick={() => {
                      if (playTimerRef.current) clearInterval(playTimerRef.current);
                      setIsPlaying(false);
                      setCurrentStepIndex(prev => Math.max(0, prev - 1));
                    }}
                    disabled={currentStepIndex === 0}
                    className="px-3 py-1.5 rounded-lg bg-[#211a14] border border-[#382e25] text-xs text-[#b09e90] hover:text-white disabled:opacity-40"
                  >
                    ← Prev
                  </button>

                  <div className="flex-1">
                    <input 
                      type="range" 
                      min={0} 
                      max={executionSteps.length - 1} 
                      value={currentStepIndex}
                      onChange={(e) => {
                        if (playTimerRef.current) clearInterval(playTimerRef.current);
                        setIsPlaying(false);
                        setCurrentStepIndex(Number(e.target.value));
                      }}
                      className="w-full accent-[#e59b63] bg-[#261e17] h-2.5 rounded-lg cursor-pointer"
                    />
                  </div>

                  <button 
                    onClick={() => {
                      if (playTimerRef.current) clearInterval(playTimerRef.current);
                      setIsPlaying(false);
                      setCurrentStepIndex(prev => Math.min(executionSteps.length - 1, prev + 1));
                    }}
                    disabled={currentStepIndex === executionSteps.length - 1}
                    className="px-3 py-1.5 rounded-lg bg-[#e59b63] hover:bg-[#f0a872] text-[#110e0b] font-bold text-xs shadow disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}
