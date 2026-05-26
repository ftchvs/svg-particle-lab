# Accessibility

`svg-particle-lab` is an interactive canvas renderer and demo. Accessibility
work in this repo focuses on providing useful alternatives for visual effects,
supporting keyboard and reduced-motion users, and keeping documentation usable.

## What we aim for

- Rendered canvases have an accessible label.
- Visual demos have text descriptions and do not rely on animation alone.
- Controls are reachable and operable by keyboard.
- Focus states are visible.
- Motion-heavy effects respect reduced-motion preferences where practical.
- Color, particle density, and motion are not the only way to understand state.
- Documentation uses clear headings, descriptive links, and useful alt text.

## Reporting accessibility issues

Please open an accessibility issue if you find:

- missing or misleading canvas labels
- controls that cannot be reached or used by keyboard
- animation or motion that cannot be reduced
- status or state communicated only through color or motion
- docs, images, or recordings without useful text alternatives

Include the browser, operating system, assistive technology, reduced-motion
setting, keyboard-only workflow, and a minimal reproduction when relevant.

## Contribution expectations

Interactive changes should include a keyboard pass, visible-focus check, and
reduced-motion review. Documentation changes should check headings, link text,
alt text, and whether animated demos have a text or video fallback.
