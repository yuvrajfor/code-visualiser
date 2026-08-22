import { parse as parseBabel } from "@babel/parser";
import * as esprima from "esprima";

export type CodeStructureSummary = {
  language: string;
  parser: "babel" | "esprima" | "heuristic";
  parseStatus: "parsed" | "recovered" | "fallback";
  nodeCount: number;
  declarations: number;
  functions: number;
  branches: number;
  loops: number;
  calls: number;
};

type MutableStructureSummary = CodeStructureSummary;

const SKIPPED_AST_KEYS = new Set(["loc", "start", "end", "range", "errors", "tokens", "comments", "extra"]);

function createEmptySummary(language: string, parser: CodeStructureSummary["parser"], parseStatus: CodeStructureSummary["parseStatus"]): MutableStructureSummary {
  return { language, parser, parseStatus, nodeCount: 0, declarations: 0, functions: 0, branches: 0, loops: 0, calls: 0 };
}

function countNode(node: unknown, summary: MutableStructureSummary): void {
  if (!node || typeof node !== "object") return;
  const record = node as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type : "";

  if (type) {
    summary.nodeCount += 1;
    if (/(VariableDeclaration|ClassDeclaration|FunctionDeclaration|EnumDeclaration)/.test(type)) summary.declarations += 1;
    if (/(Function|Method|ArrowFunction)/.test(type)) summary.functions += 1;
    if (/(IfStatement|ConditionalExpression|SwitchStatement|TryStatement)/.test(type)) summary.branches += 1;
    if (/(ForStatement|ForInStatement|ForOfStatement|WhileStatement|DoWhileStatement)/.test(type)) summary.loops += 1;
    if (/(CallExpression|NewExpression)/.test(type)) summary.calls += 1;
  }

  for (const [key, value] of Object.entries(record)) {
    if (SKIPPED_AST_KEYS.has(key)) continue;
    if (Array.isArray(value)) value.forEach((child) => countNode(child, summary));
    else countNode(value, summary);
  }
}

function createHeuristicSummary(code: string, language: string): CodeStructureSummary {
  const summary = createEmptySummary(language, "heuristic", "fallback");
  const normalized = code.replace(/\/\/.*$|#.*$/gm, "");
  const count = (pattern: RegExp) => (normalized.match(pattern) ?? []).length;
  summary.nodeCount = Math.max(1, normalized.split(/\n/).filter((line) => line.trim()).length);
  summary.declarations = count(/\b(?:let|const|var|int|long|float|double|boolean|String|class|def|function)\b/g);
  summary.functions = count(/\b(?:def|function|[A-Za-z_$][\w$<>\[\]]*\s+[A-Za-z_$][\w$]*\s*\()/g);
  summary.branches = count(/\b(?:if|else|switch|case|try|catch)\b/g);
  summary.loops = count(/\b(?:for|while|do)\b/g);
  summary.calls = count(/\b[A-Za-z_$][\w$]*\s*\(/g) - summary.functions;
  summary.calls = Math.max(0, summary.calls);
  return summary;
}

/**
 * Parses code as data only. JavaScript and TypeScript receive an AST through
 * Babel, plain JavaScript retries with Esprima, and other supported languages
 * receive a deliberately conservative structural summary until dedicated
 * language parsers are introduced.
 */
export function analyzeCodeStructure(code: string, language: string): CodeStructureSummary {
  const normalizedLanguage = language.trim().toLowerCase();
  const isJavaScriptFamily = normalizedLanguage === "javascript" || normalizedLanguage === "js" || normalizedLanguage === "typescript" || normalizedLanguage === "ts";
  if (!isJavaScriptFamily) return createHeuristicSummary(code, normalizedLanguage || "unknown");

  try {
    const ast = parseBabel(code, {
      sourceType: "unambiguous",
      plugins: ["typescript", "jsx"],
      errorRecovery: true,
      attachComment: false,
    });
    const recovered = "errors" in ast && Array.isArray((ast as { errors?: unknown[] }).errors) && Boolean((ast as { errors?: unknown[] }).errors?.length);
    const summary = createEmptySummary(normalizedLanguage, "babel", recovered ? "recovered" : "parsed");
    countNode(ast.program, summary);
    return summary;
  } catch {
    try {
      const ast = esprima.parseScript(code, { tolerant: true });
      const recovered = Array.isArray((ast as { errors?: unknown[] }).errors) && Boolean((ast as { errors?: unknown[] }).errors?.length);
      const summary = createEmptySummary(normalizedLanguage, "esprima", recovered ? "recovered" : "parsed");
      countNode(ast, summary);
      return summary;
    } catch {
      return createHeuristicSummary(code, normalizedLanguage || "javascript");
    }
  }
}
