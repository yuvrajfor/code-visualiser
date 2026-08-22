import { useEffect, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";

type MandalaIntensity = "calm" | "bright" | "festival";

type VantaEffect = {
  destroy: () => void;
  setOptions?: (options: Record<string, number | boolean>) => void;
};

type VantaFogFactory = (options: Record<string, unknown>) => VantaEffect;

const intensityOptions: Record<MandalaIntensity, { blurFactor: number; speed: number; zoom: number; opacity: number }> = {
  calm: { blurFactor: 0.78, speed: 0.22, zoom: 0.82, opacity: 0.22 },
  bright: { blurFactor: 0.62, speed: 0.36, zoom: 0.90, opacity: 0.31 },
  festival: { blurFactor: 0.46, speed: 0.52, zoom: 1.02, opacity: 0.40 },
};

function normalizeHex(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#7c3aed";
}

function mixHex(from: string, to: string, amount: number) {
  const source = normalizeHex(from).slice(1);
  const target = normalizeHex(to).slice(1);
  const clamp = Math.min(1, Math.max(0, amount));
  const channel = (index: number) => Math.round(parseInt(source.slice(index, index + 2), 16) * (1 - clamp) + parseInt(target.slice(index, index + 2), 16) * clamp).toString(16).padStart(2, "0");
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

function toColourNumber(value: string) {
  return Number.parseInt(normalizeHex(value).slice(1), 16);
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

function deviceAllowsAnimatedBackground() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return !connection?.saveData && (deviceMemory ?? 4) >= 3 && (navigator.hardwareConcurrency ?? 4) >= 4;
}

export function VantaFogBackground({
  active,
  accent,
  intensity,
  appearance,
}: {
  active: boolean;
  accent: string;
  intensity: MandalaIntensity;
  appearance: "light" | "dark";
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<VantaEffect | null>(null);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [status, setStatus] = useState<"idle" | "active" | "fallback">("idle");

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionAllowed(!media.matches && deviceAllowsAnimatedBackground());
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    const target = frameRef.current;
    if (!target || !active || !motionAllowed || !supportsWebGL()) {
      setStatus(active ? "fallback" : "idle");
      return;
    }

    let cancelled = false;
    const colour = normalizeHex(accent);
    const option = intensityOptions[intensity];
    const isDark = appearance === "dark";
    const highlight = mixHex(colour, "#fef3c7", isDark ? 0.22 : 0.38);
    const midtone = mixHex(colour, isDark ? "#172554" : "#ecfeff", isDark ? 0.34 : 0.18);
    const lowlight = isDark ? "#070b17" : "#2e1065";
    const base = isDark ? "#0f172a" : "#f8fafc";

    const createEffect = async () => {
      try {
        const module = await import("vanta/dist/vanta.fog.min");
        if (cancelled || !frameRef.current) return;
        const createFog = module.default as VantaFogFactory;
        effectRef.current = createFog({
          el: frameRef.current,
          THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          highlightColor: toColourNumber(highlight),
          midtoneColor: toColourNumber(midtone),
          lowlightColor: toColourNumber(lowlight),
          baseColor: toColourNumber(base),
          blurFactor: option.blurFactor,
          speed: option.speed,
          zoom: option.zoom,
        });
        if (!cancelled) setStatus("active");
      } catch {
        if (!cancelled) setStatus("fallback");
      }
    };

    void createEffect();
    return () => {
      cancelled = true;
      effectRef.current?.destroy();
      effectRef.current = null;
    };
  }, [accent, active, appearance, intensity, motionAllowed]);

  const option = intensityOptions[intensity];
  return <div ref={frameRef} aria-hidden="true" className="vanta-fog-layer" data-fog-status={status} data-fog-intensity={intensity} style={{ "--fog-opacity": option.opacity } as CSSProperties} />;
}
