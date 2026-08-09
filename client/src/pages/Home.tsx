import React, { useState, useEffect, useRef } from "react";
import { 
  Code2, Box, Cpu, Flame, CheckCircle2, 
  ArrowRight, RefreshCw, Terminal, MousePointerClick
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

  // Pseudo-code execution steps with simple English explanations
  const [executionSteps] = useState<ExecutionStep[]>([
    {
      step: 1,
      line: 1,
      codeSnippet: "i = 0, j = size - 1  // Initialize two pointers",
      explanation: "Start by setting two pointers: 'i' at the very beginning (index 0) and 'j' at the very end (index 5) of our sorted list.",
      pointers: { i: 0, j: 5 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [0, 5],
      stateVars: { i: 0, j: 5, target: 19 }
    },
    {
      step: 2,
      line: 2,
      codeSnippet: "while (i < j)  // Repeat while pointers haven't crossed",
      explanation: "Check if pointer 'i' is still to the left of pointer 'j' (0 < 5). Since this is true, we enter the loop to search for our target.",
      pointers: { i: 0, j: 5 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [0, 5],
      stateVars: { condition: "0 < 5 (True)" }
    },
    {
      step: 3,
      line: 3,
      codeSnippet: "sum = numbers[i] + numbers[j]  // Calculate current pair sum",
      explanation: "Add the numbers at positions 'i' and 'j': 2 + 19 = 21. We want our target sum to be 19.",
      pointers: { i: 0, j: 5 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [0, 5],
      stateVars: { sum: 21, check: "21 > 19" }
    },
    {
      step: 4,
      line: 4,
      codeSnippet: "if (sum > target) j--  // Sum too large, shrink right pointer",
      explanation: "Our sum (21) is greater than target (19). Because the list is sorted, moving 'j' one step to the left decreases the sum. So we decrease 'j' from 5 to 4.",
      pointers: { i: 0, j: 4 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [4],
      stateVars: { i: 0, j: 4, action: "j moves left" }
    },
    {
      step: 5,
      line: 3,
      codeSnippet: "sum = numbers[i] + numbers[j]  // Recalculate sum with new j",
      explanation: "Add the new numbers at 'i' (0) and 'j' (4): 2 + 15 = 17. Now our sum is 17.",
      pointers: { i: 0, j: 4 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [0, 4],
      stateVars: { sum: 17, check: "17 < 19" }
    },
    {
      step: 6,
      line: 5,
      codeSnippet: "else if (sum < target) i++  // Sum too small, advance left pointer",
      explanation: "Our sum (17) is smaller than target (19). To increase the sum, we move 'i' one step to the right from 0 to 1.",
      pointers: { i: 1, j: 4 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [1, 4],
      stateVars: { i: 1, j: 4, action: "i moves right" }
    },
    {
      step: 7,
      line: 3,
      codeSnippet: "sum = numbers[i] + numbers[j]  // Add numbers at new i and j",
      explanation: "Add numbers at 'i' (1) and 'j' (3): 5 + 11 = 16. Still less than 19, so move 'i' to 2.",
      pointers: { i: 2, j: 3 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [2, 3],
      stateVars: { sum: 16, i: 2, j: 3 }
    },
    {
      step: 8,
      line: 6,
      codeSnippet: "return [i+1, j+1]  // Target matched! Return 1-based indices",
      explanation: "Success! Numbers at index 2 (8) and index 3 (11) add up exactly to 19. We return their 1-based positions [3, 4].",
      pointers: { i: 2, j: 3 },
      arrayState: [2, 5, 8, 11, 15, 19],
      highlights: [2, 3],
      matched: true,
      stateVars: { result: "[3, 4]", status: "Match Found!" }
    }
  ]);

  const currentStep = executionSteps[currentStepIndex] || executionSteps[0];

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
  }, [viewStep]);

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
  }, [viewStep]);

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

    saveSubmission.mutate({
      problemTitle: userProblem,
      language: selectedLang,
      code: userCode,
    });

    setTimeout(() => {
      setIsAnalyzing(false);
      setViewStep(2);
      toast.success("Generated Three.js 3D Visualizer & Auto-playing once!");
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
            Side-by-Side Three.js Ice 3D & Explainer
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
                  <Code2 className="w-5 h-5 text-[#e59b63] mr-2" />
                  Step 1: Enter Your Problem & {selectedLang.toUpperCase()} Code
                </h2>
                <p className="text-xs text-[#9c8b7c] mt-1">
                  Provide your code below. We will render a Three.js ice crystal 3D visualizer side-by-side with explanations.
                </p>
              </div>
              <Badge variant="outline" className="bg-[#221c16] border-[#382d23] text-[#e59b63] font-mono">
                Step 1 of 2
              </Badge>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <Label className="text-xs text-[#b09e90] uppercase tracking-wider mb-1.5 block">
                  Problem Title
                </Label>
                <Input 
                  value={userProblem}
                  onChange={(e) => setUserProblem(e.target.value)}
                  placeholder="e.g. Two Sum II"
                  className="bg-[#120e0a] border-[#382d23] text-white text-sm h-10"
                />
              </div>

              <div>
                <Label className="text-xs text-[#b09e90] uppercase tracking-wider mb-1.5 block">
                  Your Code ({selectedLang.toUpperCase()})
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
                    Rendering Three.js Ice Crystals...
                  </>
                ) : (
                  <>
                    Generate Side-by-Side 3D & Explainer <ArrowRight className="w-4 h-4 ml-2" />
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
                  <span className="text-[#9c8b7c]">Target Value:</span>
                  <span className="font-mono font-bold text-[#e59b63]">19</span>
                </div>
              </div>

              {/* RIGHT 6 COLS: Interactive Parallel Explanation */}
              <div className="lg:col-span-6 bg-[#16120d] border border-[#2d241c] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold tracking-wider uppercase text-[#e59b63] flex items-center">
                      <Terminal className="w-4 h-4 mr-1.5" />
                      Interactive Explanation & Pseudo-Code
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-[#221c16] border-[#382d23] text-white">
                      <MousePointerClick className="w-3 h-3 mr-1 text-[#e59b63]" />
                      Clickable
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
                              Step {st.step}: {st.codeSnippet}
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
