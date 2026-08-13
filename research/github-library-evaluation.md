# GitHub Library Evaluation

Sources reviewed through GitHub on 14 August 2026:

| Project | Role evaluated | Decision for Code Story Studio |
|---|---|---|
| [uiwjs/react-codemirror](https://github.com/uiwjs/react-codemirror) | React wrapper for CodeMirror 6; MIT licensed; recently maintained | Suitable future editor upgrade if the simple textarea becomes a learning limitation. Do **not** add it during the core trace redesign because source-line navigation already works and a large editor migration would not fix the user’s main problem. |
| [codemirror/dev](https://github.com/codemirror/dev) | Core modular editor project | Use as the underlying direction if upgrading the editor later; keep the current plain, accessible editor while the product focuses on visible state and reliable learning steps. |
| [microsoft/monaco-editor](https://github.com/microsoft/monaco-editor) | Full browser-based editor; MIT licensed | Not selected for this app’s initial learning workflow because its IDE-scale bundle and complexity would distract from the code-to-story task. Consider only for an advanced developer mode. |
| [babel/babel](https://github.com/babel/babel) | JavaScript compiler and AST ecosystem; MIT licensed | A strong candidate for a later JavaScript-only deterministic trace extractor. It should be isolated behind the existing server contract and never imply safe execution of arbitrary learner code. |

## Architectural conclusion

The best near-term upgrade is **not** another visual-effects or editor library. It is a stable backend-to-frontend trace contract. The interpreter should return a small, validated state snapshot for every visual step—active line, named subject, action, and observable change. The React UI should show that snapshot in an execution-state inspector next to code and explanation.

This keeps the existing multi-language, LLM-assisted interpretation path resilient, avoids executing untrusted learner code, and gives a clear extension point for language-specific AST extractors later. The existing Python cinematic SVG renderer remains optional enrichment rather than part of the core learning contract.
