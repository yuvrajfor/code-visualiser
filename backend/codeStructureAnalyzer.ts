import { parse as parseBabel } from "@babel/parser";
import * as esprima from "esprima";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import TreeSitter from "web-tree-sitter";

export type CodeStructureSummary = {
  language: string;
  parser: "babel" | "esprima" | "tree-sitter" | "heuristic";
  parseStatus: "parsed" | "recovered" | "fallback";
  nodeCount: number;
  declarations: number;
  functions: number;
  branches: number;
  loops: number;
  calls: number;
};

type MutableStructureSummary = CodeStructureSummary;
type TreeSitterLanguage = Awaited<ReturnType<typeof TreeSitter.Language.load>>;
type TreeSitterNode = { type: string; hasError?: boolean; children?: TreeSitterNode[] };

const SKIPPED_AST_KEYS = new Set(["loc", "start", "end", "range", "errors", "tokens", "comments", "extra"]);
const nodeRequire = createRequire(import.meta.url);
const treeSitterRuntimePath = join(dirname(nodeRequire.resolve("web-tree-sitter")), "tree-sitter.wasm");
const treeSitterGrammarRoot = dirname(nodeRequire.resolve("tree-sitter-wasms/package.json"));
const treeSitterGrammarFiles = {
  python: "tree-sitter-python.wasm",
  c: "tree-sitter-c.wasm",
  java: "tree-sitter-java.wasm",
} as const;
const treeSitterLanguages = new Map<keyof typeof treeSitterGrammarFiles, Promise<TreeSitterLanguage>>();
let treeSitterRuntime: Promise<void> | null = null;

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
  summary.calls = Math.max(0, count(/\b[A-Za-z_$][\w$]*\s*\(/g) - summary.functions);
  return summary;
}

function getTreeSitterGrammarLanguage(language: string): keyof typeof treeSitterGrammarFiles | null {
  if (language === "python" || language === "py") return "python";
  if (language === "c" || language === "c++" || language === "cpp") return "c";
  if (language === "java") return "java";
  return null;
}

async function getTreeSitterLanguage(language: keyof typeof treeSitterGrammarFiles): Promise<TreeSitterLanguage> {
  let loaded = treeSitterLanguages.get(language);
  if (!loaded) {
    loaded = (async () => {
      treeSitterRuntime ??= TreeSitter.init({ locateFile: () => treeSitterRuntimePath });
      await treeSitterRuntime;
      const grammarBytes = new Uint8Array(await readFile(join(treeSitterGrammarRoot, "out", treeSitterGrammarFiles[language])));
      return TreeSitter.Language.load(grammarBytes);
    })();
    treeSitterLanguages.set(language, loaded);
  }
  return loaded;
}

function countTreeSitterNode(node: TreeSitterNode, summary: MutableStructureSummary): void {
  const type = node.type.toLowerCase();
  summary.nodeCount += 1;
  if (/(declaration|definition|class|interface|enum)/.test(type)) summary.declarations += 1;
  if (/(function_definition|function_declarator|method_declaration|constructor_declaration|lambda)/.test(type)) summary.functions += 1;
  if (/(if_statement|switch_statement|conditional_expression|catch_clause|try_statement)/.test(type)) summary.branches += 1;
  if (/(for_statement|while_statement|do_statement|enhanced_for_statement)/.test(type)) summary.loops += 1;
  if (/(call|invocation|new_expression)/.test(type)) summary.calls += 1;
  node.children?.forEach((child) => countTreeSitterNode(child, summary));
}

/**
 * Synchronous source-only analysis for JavaScript and a conservative fallback
 * for other languages. The async Tree-sitter extension below upgrades Python,
 * C, and Java once the grammar is ready.
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

/**
 * Loads cached Tree-sitter WebAssembly grammars for Python, C, and Java. It
 * parses source text only and never executes learner code. A grammar failure
 * returns the established synchronous summary so learning never blocks.
 */
export async function analyzeCodeStructureWithTreeSitter(code: string, language: string): Promise<CodeStructureSummary> {
  const normalizedLanguage = language.trim().toLowerCase();
  const grammarLanguage = getTreeSitterGrammarLanguage(normalizedLanguage);
  if (!grammarLanguage) return analyzeCodeStructure(code, normalizedLanguage || "unknown");

  try {
    const languageDefinition = await getTreeSitterLanguage(grammarLanguage);
    const parser = new TreeSitter();
    parser.setLanguage(languageDefinition);
    const tree = parser.parse(code);
    const summary = createEmptySummary(normalizedLanguage, "tree-sitter", tree.rootNode.hasError() ? "recovered" : "parsed");
    countTreeSitterNode(tree.rootNode as unknown as TreeSitterNode, summary);
    tree.delete();
    parser.delete();
    return summary;
  } catch {
    return analyzeCodeStructure(code, normalizedLanguage || grammarLanguage);
  }
}
