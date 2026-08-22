# Tree-sitter and 3D Runtime Notes

Tree-sitter is an incremental parser that builds concrete syntax trees and is designed to remain useful with syntax errors. The web binding loads the runtime first, then loads each language grammar as an individual WebAssembly file; it can parse source text and inspect the root node without executing that source. For this project, the compatible `web-tree-sitter@0.20.8` runtime loads the Python, C, and Java grammar files supplied by `tree-sitter-wasms@0.1.13` after resolving the runtime and grammar paths server-side. The runtime and grammar cache is retained in-process to avoid reinitializing WebAssembly for each learner request.

React Three Fiber’s `Canvas` is the entry point for a Three.js scene and supports a DOM fallback where WebGL is unavailable. The project preserves the existing SVG result scene as the accessible default and loads the optional Three Fiber scene only after the learner requests it, so WebGL is not required for core learning.

## References

1. [Tree-sitter introduction](https://tree-sitter.github.io/)
2. [Tree-sitter web binding guide](https://github.com/tree-sitter/tree-sitter/blob/master/lib/binding_web/README.md)
3. [React Three Fiber Canvas documentation](https://r3f.docs.pmnd.rs/api/canvas)
