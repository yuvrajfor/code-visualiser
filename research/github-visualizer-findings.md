# GitHub Visualizer Research Notes

## Algorithm Visualizer

Repository: <https://github.com/algorithm-visualizer/algorithm-visualizer>

The project describes itself as an interactive platform that visualizes algorithms from code and separates the system into a React web app, a server, an algorithms content repository, and language-specific tracer libraries. The useful product lesson is not its surface styling: it is the **command-to-visual-state contract**. Code execution emits compact visualization events, then a dedicated UI interprets those events into a clear state view.

### Applicable direction for Code Story Studio

Code Story Studio should move its visible center of gravity from optional cinematic decoration to a concrete **Execution State** workspace: an active source line, a small set of named state objects, what changed, and a useful interactive representation. The current simple-English narration remains a differentiator, but it should explain an observable state transition rather than a separate decorative scene.

## Research criteria for remaining references

The selected references must demonstrate at least one of the following: line-synchronized execution, direct state inspection, deterministic algorithm timeline controls, or a layout where the code and the currently changed data structure are both immediately visible. Repositories are reference material only; Code Story Studio will not copy their source code or branding.

## Illustrated Algorithms

Repository: <https://github.com/ovidiuch/illustrated-algorithms>

This project pairs the actual displayed source code with an execution trace and records context at each step. Its particularly useful interaction pattern is a compact, reversible timeline: learners can pause, resume, fast-forward, and rewind while variables, operations, and control flow remain aligned. It also treats phone fit as a core constraint rather than a later adaptation.

### Applicable direction for Code Story Studio

The redesigned Code Studio should use a **single visible execution timeline** that controls the highlighted source line, simple-English explanation, state cards, and primary visual together. The timeline must make the next meaningful transition obvious, rather than foregrounding a secondary cinematic layer.

## CodeVisualizer

Repository: <https://github.com/DucPhamNgoc08/CodeVisualizer>

The project converts function control flow into an interactive graph and makes nodes actionable: users can click a visual node to navigate to the matching code. It also separates quick-reference and detailed views and uses optional human-friendly labels instead of forcing AI text into every interaction.

### Applicable direction for Code Story Studio

The primary visual should expose **clickable execution-state nodes**—for example variables, collections, function calls, and decisions—that move the user to the matching source line and show a short “what changed” explanation. AI-generated plain English should label observed state, not substitute for it.

## Algo Visualizers

Repository: <https://github.com/sadanandpai/algo-visualizers>

This project keeps its controls practical: start, pause, reset, speed adjustment, custom input, and side-by-side comparison where it helps learning. It uses controlled state progression rather than unbounded animation.

### Applicable direction for Code Story Studio

Retain the working playback controls but reduce visual competition. Every panel in the focused Code Studio should earn space by answering one learner question: **Which code line runs now? What state changed? Why does it matter?**

## Emerging redesign principles

| Keep | Change |
|---|---|
| User code input, source-line focus, simple-English explanation, timeline controls, and City Map Lab | Move the cinematic layer out of the primary flow and make it a secondary optional illustration. |
| Existing interpretation contract and fallback reliability | Add an explicit execution-state model with small clickable state cards and state-to-line navigation. |
| Responsive controls and motion preferences | Remove ornamental depth controls from the default learner path; show only the controls needed to understand the current execution state. |

## Code Story Studio redesign decision

The current workspace already has reliable line progression, a simple-English explanation, an interactive browser-native visual, and a code navigator. The learner problem is hierarchy: the optional Python cinematic panel currently sits beside the main visual and on phones is intentionally shown first. That makes the page feel like a collection of effects rather than a working code visualizer.

The redesigned default will therefore lead with an **Execution State** surface. It will answer three questions in one glance: *which source line is active, what named object changed, and what action is happening*. The browser-native scene will remain the visual model for that state. The cinematic illustration will become a closed, optional “scene detail” disclosure, so it can add richness without competing with the code trace.

This applies the researched patterns without copying any repository’s code or branding: line-synchronized state from Algorithm Visualizer, a reversible single timeline from Illustrated Algorithms, actionable state-to-line navigation from CodeVisualizer, and restrained control density from Algo Visualizers.
