# Python Tutor Reference Findings

## Scope

The supplied [Python Tutor visualizer](https://pythontutor.com/visualize.html) was reviewed on 18 August 2026 as a functional reference for Code Story Studio. This document records transferable interaction principles only; Code Story Studio will retain its own visual language, beginner explanations, and real-world scene concept.

## Transferable learning patterns

| Reference pattern | Why it helps learners | Code Story Studio adaptation |
| --- | --- | --- |
| One primary action: **Visualize Execution** | Makes the first action unambiguous. | Retain one clearly labeled **Create my visual story** action and reduce competing visual weight nearby. |
| Every execution moment maps to a source line | Learners can link the visual change directly to their code. | Make the active source line, step number, and current action a compact persistent execution strip. |
| Back/forward step navigation | Supports inspection and self-paced learning. | Preserve existing story navigation, but group it around a clear current-step counter and outcome. |
| State is shown as a concrete snapshot | Learners see what changed instead of receiving only prose. | Pair each real-world scene with a concise **Before / Now** state card drawn from the existing execution state. |
| Stack/heap separation | Gives a stable mental model for code state. | Use original, beginner-friendly labels such as **What is running** and **What the program remembers**, not a copied memory diagram. |
| Output remains visible through the execution | Reinforces the consequence of a completed instruction. | Surface the existing result/change field in a persistent, scannable completion area. |

## Design guardrails

The final Code Story Studio experience should not copy Python Tutor’s branding, wording, layout, instructional copy, or imagery. It should use a cleaner original blue-slate product palette, a calm three-column execution layout on desktop, a stacked phone layout, source-grounded real-world scenes, and plain-English terminology.
