# Browser Product Research: Code Visualizers

## Python Tutor — execution-first reference

Source: <https://pythontutor.com/visualize.html>

Python Tutor begins with only the decisions that matter: language choice, code input, and one execution action. Its documented learning model maps each execution step to a visible active line, function frames and local variables, heap objects, and program output. It also offers permanent links for a runnable example.

### Application to Code Story Studio

Code Story Studio should keep its plain-English teaching advantage while adopting the same disciplined default flow: **paste code → generate a trace → select a step → see a single state snapshot**. The execution-state panel already supplies a semantic approximation of this model; the next backend improvement should add a structured per-step state payload so arrays, variables, and references can render consistently rather than relying only on prose.

The primary UI should keep advanced visual settings, cinematic art, and experimental controls behind progressive disclosure. Direct source-line selection, reusable share links, short visible status feedback, and a compact state inspector belong in the default workspace.

## Algorithm Visualizer — integrated workspace reference

Source: <https://algorithm-visualizer.org/>

Algorithm Visualizer demonstrates a compact application workspace: a searchable left catalogue, an editor, a playback surface with a step counter and speed control, plus a fullscreen action. Its own documentation describes a separation between the React web application, a server that provides code-running APIs, an algorithms collection, and per-language tracer libraries that emit visualizing commands.

### Application to Code Story Studio

The useful pattern is not its dense three-column visual style. It is the explicit boundary between a learner-facing player and a structured tracing protocol. Code Story Studio can adopt that boundary incrementally: retain the current server interpretation API, add an optional normalized state-trace field, and render it with small reusable state cards. The UI should remain simpler than Algorithm Visualizer: one clear code column, one state/visual column, and details revealed on demand.

## Live Code Story Studio audit

Source: current local preview, reviewed in browser on 14 August 2026.

The entry screen has a polished dark editor card, a clear language choice, and an understandable three-step teaching promise. However, the first-time coaching popover occupies a prominent part of the initial viewport and competes with the primary code entry task. The navigation and introductory card copy also consume more visual attention than the single action that matters: paste code and generate a trace.

### Immediate product direction

The modern revision should reduce above-the-fold competition. Keep language selection, code input, and the primary action visible without scrolling; convert the first-time coach to a subtle inline helper or a non-blocking cue; and treat the three-step learning promise as secondary evidence below the action. The generated workspace should then surface a structured state trace that has the same visual importance as code, with decoration and cinematic media explicitly optional.
