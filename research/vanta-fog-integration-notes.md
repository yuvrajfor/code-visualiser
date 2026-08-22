# Vanta FOG Integration Notes

## Verified source

The official [Vanta repository](https://github.com/tengbao/vanta) documents that a Vanta effect appends its canvas inside the supplied container element, placing existing children in the foreground. It also documents a React hook pattern with a retained effect reference and cleanup through `effect.destroy()` on unmount. Its npm example passes an imported Three.js instance through the `THREE` option rather than depending only on global script tags.

## Application decision

Code Story Studio should use the package-based React approach rather than adding raw CDN `<script>` tags. The FOG canvas will be contained in a non-interactive, `aria-hidden` layer inside the existing application frame. Code, navigation, visual setting controls, and explanation content will stay above it. The effect will be disabled for high-contrast mode, reduced-motion preferences, and smaller touch-first screens; its visual palette will take its accent from the saved Mandala preference.

## Source

1. [Vanta.js README — React Hooks, Three.js npm usage, sizing, cleanup](https://github.com/tengbao/vanta)
