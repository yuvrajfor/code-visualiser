# System Appearance and Unified Background Findings

## Reliable system appearance behaviour

The standard `prefers-color-scheme` media feature represents the light-or-dark preference configured in the operating system or browser. It is broadly available and can be queried from JavaScript with `window.matchMedia`, then observed with a `change` listener for live operating-system updates.[1]

The application will therefore provide three **appearance preferences**: **System**, **Light**, and **Dark**. System is the default selection for a first visit, follows the operating system immediately, and continues to observe later changes. Choosing Light or Dark is an explicit learner override and must not be overwritten by a later system event. The effective light-or-dark value remains the only value applied to the root class so existing dark selectors and accessibility treatments stay compatible.

## Surface and background composition

The visual learning theme (Mandala, Kitchen, Office, Game World, or High Contrast) is separate from product appearance. The background should read as one continuous, fixed canvas behind the application, rather than repeated page-sized decorative fields. The finish will use one low-contrast "frame" layer with an inner highlight, soft edge falloff, and a restrained radial centre. Content panels retain their own elevation and contrast so the background never competes with code or explanations.

## Accessibility decisions

Native controls should receive the active scheme through CSS `color-scheme`, while clear manual Light and Dark choices remain available. High Contrast remains a distinct visual theme and bypasses decorative backgrounds; reduced-motion rules also freeze the Mandala motion layer.[1][2]

## Validation notes

The live preview was directly checked in all three persisted choices. **System** visibly reported the detected dark device state and rendered the dark frame. Choosing **Light** changed the header label, application root preference, cards, and single-frame background to the light surface system. Choosing **Dark** restored the dark frame; the final saved choice was returned to **System**. The standalone Chromium CDP verifier could not open this Radix popup menu after three synthetic interaction strategies, so direct preview interaction was used for menu verification instead. The automated test suite, type check, and production build remain the regression gate for the same contract.

## References

[1] [MDN: `prefers-color-scheme` CSS media feature](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-color-scheme)

[2] [web.dev: `prefers-color-scheme` implementation guidance](https://web.dev/articles/prefers-color-scheme)
