# Code Story Studio: Full-Stack Upgrade Plan

## Product principle

The product’s main job is to make the current source line understandable. The interface should look calm and contemporary because it removes visual competition—not because it adds more effects. Each story step should visibly connect **source → execution state → plain-English meaning → optional visual detail**.

## Selected backend contract

The existing `stories.interpret` procedure remains the single request that creates a visual story. Each returned step will receive a deterministic `state` snapshot derived from its original source line after model validation. The model still provides beginner-friendly interpretation; the server—not the model—builds the state fields.

| Field | Meaning | Trust boundary |
|---|---|---|
| `subject` | The named function, value, collection, or current instruction in focus | Extracted from source text with conservative pattern matching. |
| `action` | A short structural action such as “checks a choice”, “updates a value”, or “returns a result” | Deterministically classified from syntax-like source patterns. |
| `change` | A source-grounded description of what the line introduces, checks, repeats, returns, or finishes | Does not claim that untrusted code was executed. |
| `kind` | The existing real-world scene category | Retained from the validated story contract. |

This avoids unsafe execution of arbitrary JavaScript, Python, C, or Java while giving the UI a stable, typed state view. A later JavaScript-only AST module can use Babel behind this same contract; the frontend will not need to change.

## Selected frontend direction

The generated workspace will use a compact two-column learning canvas on desktop and a deliberate source-then-state sequence on mobile. A high-contrast active-line card will remain synchronized with the code trace. The execution inspector will lead with **In focus**, **Action**, and **What changes**, using the normalized backend fields instead of decorative copy. The existing browser-native scene will be labeled “Visual model,” and the Python cinematic scene will remain a learner-opened detail.

The entry screen will keep the code form as the obvious first action. Introductory coaching will become quieter and never obscure input or the generate button. The theme selector, preset library, sound settings, shortcuts, and cinematic controls remain available through progressive disclosure.

## Resilience and scale boundaries

The current server already protects the model-backed interpretation with schema validation, source-line validation, short-lived caching, request de-duplication, and a local fallback. The upgrade preserves those safeguards. The normalized state snapshot has no extra network call and no credential exposure. It is calculated once when a story is generated, cacheable with the story, and small enough to return as part of the current response.

| Current strength | Upgrade effect |
|---|---|
| Validated model response | The state snapshot is derived only after the existing response has passed validation. |
| Fallback story | The same state snapshot is generated for fallback steps, so the workspace does not split into two UI paths. |
| In-flight de-duplication and short-lived cache | One request yields the whole typed learning trace; no per-step backend chatter is added. |
| Python cinematic timeout and fallback | Cinematic media remains optional, so it cannot block code understanding. |

## Library decision

No new UI runtime library is introduced for this upgrade. The project already has React, Tailwind, accessible shadcn-based controls, and a server-side LLM API. Adding an editor or graphics framework before the trace contract would increase bundle and maintenance cost without solving the learner’s current problem. The GitHub-evaluated CodeMirror and Babel projects remain documented, intentional follow-up options rather than unvalidated dependencies.
