import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { z } from "zod";
import { API_SCENE_KINDS } from "./codeStoryInterpreter";

// Code Story accepts source inputs up to 12,000 characters. A one-character
// line is valid source, so the cinematic metadata must allow that same maximum.
const MAX_CINEMATIC_LINE_NUMBER = 12_000;

export const cinematicSceneInputSchema = z.object({
  kind: z.enum(API_SCENE_KINDS),
  title: z.string().trim().min(1).max(90),
  plainEnglish: z.string().trim().min(1).max(260),
  visualFocus: z.string().trim().min(1).max(180),
  codeLine: z.string().trim().min(1).max(220),
  lineNumber: z.number().int().positive().max(MAX_CINEMATIC_LINE_NUMBER),
});

export type CinematicSceneInput = z.infer<typeof cinematicSceneInputSchema>;

const cinematicSceneResponseSchema = z.object({
  svg: z.string().startsWith("<svg").max(240_000),
  caption: z.string().min(1).max(280),
  renderer: z.literal("python-svg"),
});

type CachedScene = z.infer<typeof cinematicSceneResponseSchema>;
const cache = new Map<string, { value: CachedScene; expiresAt: number }>();
const inFlight = new Map<string, Promise<CachedScene>>();
const CACHE_TTL_MS = 5 * 60_000;
const CACHE_LIMIT = 60;

function cacheKey(input: CinematicSceneInput) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function storeScene(key: string, value: CachedScene) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  while (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    cache.delete(oldest);
  }
}

function runPythonRenderer(input: CinematicSceneInput): Promise<CachedScene> {
  const rendererPath = path.resolve(process.cwd(), "python_visuals", "render_scene.py");
  return new Promise((resolve, reject) => {
    const child = spawn("python3", [rendererPath], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("The cinematic renderer took too long."));
    }, 7_000);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.length > 250_000) child.kill("SIGKILL");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(stderr.trim() || "The cinematic renderer could not create this scene."));
        return;
      }
      try {
        resolve(cinematicSceneResponseSchema.parse(JSON.parse(stdout)));
      } catch {
        reject(new Error("The cinematic renderer returned an invalid scene."));
      }
    });
    child.stdin.end(JSON.stringify(input));
  });
}

/** Creates a quick, deterministic Python-rendered SVG without blocking the interactive story player. */
export async function renderCinematicScene(rawInput: CinematicSceneInput): Promise<CachedScene> {
  const input = cinematicSceneInputSchema.parse(rawInput);
  const key = cacheKey(input);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) cache.delete(key);

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = runPythonRenderer(input)
    .then((scene) => {
      storeScene(key, scene);
      return scene;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}
