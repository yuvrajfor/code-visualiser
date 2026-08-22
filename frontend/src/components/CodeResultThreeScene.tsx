import { Canvas } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import { forceCenter, forceCollide, forceManyBody, forceSimulation } from "d3-force-3d";
import { useMemo } from "react";

type ResultVariant = "stack" | "network" | "route" | "branch" | "loop" | "build";
type SceneGeometry = "box" | "torus" | "octahedron";

type SceneNode = {
  id: "object" | "action" | "result";
  label: string;
  color: string;
  x?: number;
  y?: number;
  z?: number;
  position?: [number, number, number];
};

function createForceLayout(subject: string, action: string, result: string, variant: ResultVariant): Array<SceneNode & { position: [number, number, number]; geometry: SceneGeometry }> {
  const nodes: SceneNode[] = [
    { id: "object", label: subject, color: "#38bdf8", x: -2, y: 0.45, z: -0.3 },
    { id: "action", label: action, color: "#a78bfa", x: 0, y: 0.75, z: 0.45 },
    { id: "result", label: result, color: "#fbbf24", x: 2, y: 0.1, z: -0.2 },
  ];
  const simulation = forceSimulation(nodes as never[], 3)
    .force("charge", forceManyBody().strength(-8))
    .force("center", forceCenter(0, 0.2, 0))
    .force("collide", forceCollide(0.75));
  simulation.stop();
  simulation.tick(56);

  return nodes.map((node, index) => ({
    ...node,
    position: [node.x ?? (index - 1) * 1.8, node.y ?? 0, node.z ?? 0] as [number, number, number],
    geometry: (variant === "loop" && index === 1 ? "torus" : variant === "branch" && index === 2 ? "octahedron" : "box") as SceneGeometry,
  }));
}

function ResultMesh({ node, geometry }: { node: SceneNode & { position: [number, number, number] }; geometry: SceneGeometry }) {
  return (
    <mesh position={node.position} castShadow receiveShadow>
      {geometry === "torus" ? <torusGeometry args={[0.58, 0.18, 18, 42]} /> : geometry === "octahedron" ? <octahedronGeometry args={[0.7, 0]} /> : <boxGeometry args={[0.95, 0.95, 0.95]} />}
      <meshStandardMaterial color={node.color} metalness={0.24} roughness={0.28} emissive={node.color} emissiveIntensity={0.16} />
    </mesh>
  );
}

export default function CodeResultThreeScene({ subject, action, result, variant }: { subject: string; action: string; result: string; variant: ResultVariant }) {
  const nodes = useMemo(() => createForceLayout(subject, action, result, variant), [subject, action, result, variant]);

  return (
    <section className="code-result-three-scene" data-three-result-scene data-three-layout="d3-force-3d" aria-label="Interactive 3D code result scene">
      <div className="code-result-three-heading"><span>Interactive 3D result</span><small>Drag to orbit · scroll to zoom</small></div>
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [5.4, 3.8, 7], fov: 42 }} fallback={<p className="code-result-three-fallback">3D is unavailable here. The SVG result visual remains ready.</p>}>
        <ambientLight intensity={0.88} />
        <hemisphereLight args={["#dbeafe", "#1e293b", 1.05]} />
        <directionalLight castShadow position={[4, 7, 5]} intensity={2.2} shadow-mapSize-width={512} shadow-mapSize-height={512} />
        <pointLight position={[-4, 2, -2]} color="#a78bfa" intensity={4.4} distance={10} />
        <group rotation={[-0.22, 0.38, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -1.08, 0]}>
            <circleGeometry args={[4.6, 48]} />
            <meshStandardMaterial color="#0f172a" metalness={0.1} roughness={0.86} transparent opacity={0.9} />
          </mesh>
          {nodes.map((node) => <ResultMesh key={node.id} node={node} geometry={node.geometry} />)}
          {nodes.slice(0, -1).map((node, index) => <Line key={`${node.id}-${nodes[index + 1]?.id}`} points={[node.position, nodes[index + 1]!.position]} color="#bfdbfe" lineWidth={1.2} transparent opacity={0.82} />)}
        </group>
        <OrbitControls enablePan={false} minDistance={5.2} maxDistance={10} minPolarAngle={0.55} maxPolarAngle={1.48} />
      </Canvas>
    </section>
  );
}
