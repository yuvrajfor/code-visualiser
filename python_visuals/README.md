# Cinematic SVG Rendering Layer

Code Story Studio uses a **hybrid visual system**. The browser-native scene remains the immediate, clickable learning surface, while this Python renderer creates an optional richer SVG illustration for the active code step. A learner can move, pause, scrub, or restart the story without waiting for the illustration.

## Why standard-library SVG instead of a Python visual package

This is a request-time rendering path running inside a small autoscaling web container. A deterministic SVG renderer built with the Python standard library was selected over an external charting, animation, or raster-graphics package because it has no package-install overhead, no native system dependency, no external asset fetch, and no large image payload. It produces accessible, resolution-independent art in milliseconds and keeps the deployment surface intentionally small.

> The interactive browser visual is the primary learning experience. The Python illustration is progressive enhancement, never a dependency for reading the explanation or navigating steps.

## Boundary and reliability model

The server validates a compact scene contract—scene kind, title, simple-English explanation, visual focus, code line, and source-line number—before spawning `python_visuals/render_scene.py`. The renderer never executes learner code. It reads only JSON from standard input and returns only a self-contained SVG payload through standard output.

| Concern | Design choice |
|---|---|
| Browser responsiveness | The player opens immediately; the active, previous, and next scenes render in the background. |
| Safe failure | A failed or slow Python request switches the cinematic card to an optional-state notice while the original interactive scene, explanation, and controls stay available. |
| Process bounds | Each renderer process has a seven-second timeout and a capped response size. |
| Repeated use | A five-minute, bounded in-memory cache and in-flight request sharing prevent duplicate work within an application instance. |
| Deployment | The root Dockerfile installs only `python3` on top of the Node runtime and builds the full client and server bundle. |
| Larger-scale evolution | If cross-instance reuse becomes necessary, keep this input/output contract and move the short-lived cache to a shared cache service; do not introduce a background process in an autoscaling request container. |

The renderer supports the existing real-world visual vocabulary: workbench, storage shelf, sorting tray, linked chain, family tree, conveyor loop, recursion stairs, city map, decision gate, workshop, and delivery desk.
