# Contributing

Thanks for taking a look at `svg-particle-lab`.

## Local setup

```bash
npm install
npm run dev
```

Before opening a pull request, run:

```bash
npm run typecheck
npm run build
npm run lint
```

## Good first areas

- More demo presets using permissively licensed SVGs.
- Browser compatibility fixes for SVG import edge cases.
- Performance measurements for high grid sizes.
- Accessibility improvements around reduced motion and static fallbacks.

## Accessibility expectations

- Keep interactive controls keyboard reachable.
- Preserve visible focus states.
- Respect reduced-motion preferences where practical.
- Do not communicate state through color or motion alone.
- Keep canvas labels and documentation alternatives accurate.

## Project boundaries

- Keep the core renderer dependency-free except React.
- Keep remote SVG CORS behavior explicit instead of silently proxying user URLs.
- Avoid adding brand assets unless their license and attribution are clear.
- Prefer small, measurable rendering changes over broad rewrites.

## Pull request checklist

- [ ] I ran the relevant checks or documented why not.
- [ ] I checked relevant accessibility expectations from [ACCESSIBILITY.md](ACCESSIBILITY.md).
- [ ] I updated docs or examples if user-facing behavior changed.
