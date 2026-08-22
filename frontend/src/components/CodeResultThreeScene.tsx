import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { forceCenter, forceCollide, forceManyBody, forceSimulation } from "d3-force-3d";
import { useEffect, useMemo } from "react";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type ResultVariant = "stack" | "network" | "route" | "branch" | "loop" | "build";
type SceneLanguage = "javascript" | "python" | "c" | "java";
type SceneGeometry = "box" | "torus" | "octahedron" | "cylinder" | "sphere";
type StructureSummary = { parser: string; declarations: number; functions: number; branches: number; loops: number; calls: number } | null;

type SceneNode = {
  id: string;
  label: string;
  color: string;
  x?: number;
  y?: number;
  z?: number;
  position?: [number, number, number];
  geometry?: SceneGeometry;
};

const languageVisuals: Record<SceneLanguage, { label: string; accent: string; support: string; template: string }> = {
  javascript: { label: "Expression graph", accent: "#a78bfa", support: "#38bdf8", template: "expression-graph" },
  python: { label: "Indented flow", accent: "#34d399", support: "#67e8f9", template: "indent-flow" },
  c: { label: "Memory blocks", accent: "#f59e0b", support: "#fb7185", template: "memory-blocks" },
  java: { label: "Class pipeline", accent: "#f97316", support: "#facc15", template: "class-pipeline" },
};

function geometryFor(language: SceneLanguage, index: number, variant: ResultVariant): SceneGeometry {
  if (language === "python") return index % 3 === 1 ? "cylinder" : "sphere";
  if (language === "c") return index % 2 === 0 ? "box" : "octahedron";
  if (language === "java") return index % 3 === 0 ? "cylinder" : "box";
  if (variant === "loop" && index === 1) return "torus";
  if (variant === "branch" && index === 2) return "octahedron";
  return index % 3 === 0 ? "box" : "sphere";
}

function createForceLayout(subject: string, action: string, result: string, variant: ResultVariant, language: SceneLanguage, structure: StructureSummary) {
  const visual = languageVisuals[language];
  const metricNodes = [
    { key: "decl", label: `${structure?.declarations ?? 0} data`, count: structure?.declarations ?? 0 },
    { key: "branch", label: `${structure?.branches ?? 0} choice`, count: structure?.branches ?? 0 },
    { key: "loop", label: `${structure?.loops ?? 0} repeat`, count: structure?.loops ?? 0 },
    { key: "call", label: `${structure?.calls ?? 0} call`, count: structure?.calls ?? 0 },
  ].filter((node) => node.count > 0).slice(0, 4);
  const nodes: SceneNode[] = [
    { id: "object", label: subject, color: visual.support, x: -2.2, y: 0.55, z: -0.3 },
    { id: "action", label: action, color: visual.accent, x: 0, y: 0.95, z: 0.45 },
    { id: "result", label: result, color: "#fbbf24", x: 2.15, y: 0.2, z: -0.2 },
    ...metricNodes.map((metric, index) => ({ id: metric.key, label: metric.label, color: index % 2 ? visual.support : "#e0e7ff", x: -1.2 + index * 0.92, y: -0.58 + (index % 2) * 0.26, z: -0.65 + (index % 3) * 0.36 })),
  ];
  const simulation = forceSimulation(nodes as never[], 3)
    .force("charge", forceManyBody().strength(-8))
    .force("center", forceCenter(0, 0.1, 0))
    .force("collide", forceCollide(0.5));
  simulation.stop();
  simulation.tick(64);
  return nodes.map((node, index) => ({
    ...node,
    position: [node.x ?? (index - 1) * 1.1, node.y ?? 0, node.z ?? 0] as [number, number, number],
    geometry: geometryFor(language, index, variant),
  }));
}

function ResultMesh({ node }: { node: SceneNode & { position: [number, number, number]; geometry: SceneGeometry } }) {
  const isMetric = !["object", "action", "result"].includes(node.id);
  const scale = isMetric ? 0.42 : 1;
  return (
    <mesh position={node.position} scale={scale} castShadow receiveShadow>
      {node.geometry === "torus" ? <torusGeometry args={[0.58, 0.18, 18, 42]} /> : node.geometry === "octahedron" ? <octahedronGeometry args={[0.7, 0]} /> : node.geometry === "cylinder" ? <cylinderGeometry args={[0.48, 0.58, 1.05, 8]} /> : node.geometry === "sphere" ? <sphereGeometry args={[0.57, 20, 20]} /> : <boxGeometry args={[0.95, 0.95, 0.95]} />}
      <meshStandardMaterial color={node.color} metalness={isMetric ? 0.08 : 0.26} roughness={isMetric ? 0.46 : 0.26} emissive={node.color} emissiveIntensity={isMetric ? 0.06 : 0.17} />
    </mesh>
  );
}

function SceneLink({ from, to, color }: { from: [number, number, number]; to: [number, number, number]; color: string }) {
  const points = useMemo(() => new Float32Array([...from, ...to]), [from, to]);
  return <line><bufferGeometry><bufferAttribute attach="attributes-position" args={[points, 3]} /></bufferGeometry><lineBasicMaterial color={color} transparent opacity={0.78} /></line>;
}

function CameraOrbit() {
  const { camera, gl } = useThree();
  const controls = useMemo(() => new OrbitControls(camera, gl.domElement), [camera, gl.domElement]);
  useEffect(() => {
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 5.2;
    controls.maxDistance = 10;
    controls.minPolarAngle = 0.55;
    controls.maxPolarAngle = 1.48;
    return () => controls.dispose();
  }, [controls]);
  useFrame(() => controls.update());
  return null;
}

function DensePlatform({ language }: { language: SceneLanguage }) {
  const visual = languageVisuals[language];
  const tiles = Array.from({ length: 15 }, (_, index) => ({ x: (index % 5) * 0.62 - 1.24, z: Math.floor(index / 5) * 0.55 - 0.55 }));
  return <group position={[0, -1.06, 0]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[4.6, 48]} /><meshStandardMaterial color="#0f172a" metalness={0.12} roughness={0.84} transparent opacity={0.92} /></mesh>
    {tiles.map((tile, index) => <mesh key={`${tile.x}-${tile.z}`} position={[tile.x, 0.05 + (index % 3) * 0.015, tile.z]}><boxGeometry args={[0.46, 0.08, 0.38]} /><meshStandardMaterial color={index % 2 ? visual.accent : visual.support} transparent opacity={0.24 + (index % 3) * 0.08} /></mesh>)}
  </group>;
}

export default function CodeResultThreeScene({ subject, action, result, variant, language, structure }: { subject: string; action: string; result: string; variant: ResultVariant; language: SceneLanguage; structure: StructureSummary }) {
  const nodes = useMemo(() => createForceLayout(subject, action, result, variant, language, structure), [subject, action, result, variant, language, structure]);
  const visual = languageVisuals[language];

  return (
    <section className="code-result-three-scene" data-three-result-scene data-three-layout="d3-force-3d" data-three-language={language} data-three-template={visual.template} aria-label={`Interactive ${language} 3D code result scene`}>
      <div className="code-result-three-heading"><span>{visual.label} · 3D result</span><small>{structure?.parser ?? "source"} AST · drag to orbit · scroll to zoom</small></div>
      <div className="code-result-three-legend" aria-hidden="true"><span style={{ "--scene-accent": visual.accent } as React.CSSProperties}>Object</span><span style={{ "--scene-accent": visual.support } as React.CSSProperties}>Flow</span><span style={{ "--scene-accent": "#fbbf24" } as React.CSSProperties}>Result</span></div>
      <Canvas shadows dpr={[1, 1.45]} camera={{ position: [5.4, 3.8, 7], fov: 42 }} fallback={<p className="code-result-three-fallback">3D is unavailable here. The SVG result visual remains ready.</p>}>
        <ambientLight intensity={0.88} />
        <hemisphereLight args={["#dbeafe", "#1e293b", 1.05]} />
        <directionalLight castShadow position={[4, 7, 5]} intensity={2.2} shadow-mapSize-width={512} shadow-mapSize-height={512} />
        <pointLight position={[-4, 2, -2]} color={visual.accent} intensity={4.4} distance={10} />
        <group rotation={[-0.22, 0.38, 0]}>
          <DensePlatform language={language} />
          {nodes.map((node) => <ResultMesh key={node.id} node={node} />)}
          {nodes.slice(0, -1).map((node, index) => <SceneLink key={`${node.id}-${nodes[index + 1]?.id}`} from={node.position} to={nodes[index + 1]!.position} color={index === 1 ? "#fbbf24" : visual.support} />)}
        </group>
        <CameraOrbit />
      </Canvas>
    </section>
  );
}
