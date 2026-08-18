# Light-and-Dark Appearance Validation

**Scope.** The appearance preference is intentionally separate from the visual learning world. Mandala remains the default visual world while the header control sets the persistent light or dark product appearance.

**Validated behaviour.** The header control changes the root appearance class, the `data-appearance` value on the application shell, and its own accessible label. The 2D execution rail, code source, explanation journal, array cells, variable table, state comparison control, and mandala animation remained present and readable after the appearance change.

**Responsive evidence.** The focused automated browser check passed at 375×812 and 1280×760. Both runs generated a story, opened a second step, preserved the explanation history, validated the 2D diagram and tracked-state surfaces, confirmed no horizontal overflow, and confirmed the mandala background remained active. A direct visual review of the live Code Studio confirmed the dark header, code workspace, and learner-path card use the intended deeper surfaces and high-contrast copy.

**Accessibility safeguards.** High Contrast remains an independent visual theme. Decorative and control transitions respect `prefers-reduced-motion`, and the appearance button retains an explicit focus indicator.
