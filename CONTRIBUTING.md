# Contributing

Thanks for taking a look at `svg-particle-lab`.

## Local setup

```bash
npm install
npm run dev
```

Before opening a pull request, run:

```bash
npm run verify
```

## Good first areas

- More demo presets using permissively licensed SVGs.
- Browser compatibility fixes for SVG import edge cases.
- Performance measurements for high grid sizes.
- Accessibility improvements around reduced motion and static fallbacks.

## Project boundaries

- Keep the core renderer dependency-free except React.
- Keep remote SVG CORS behavior explicit instead of silently proxying user URLs.
- Avoid adding brand assets unless their license and attribution are clear.
- Prefer small, measurable rendering changes over broad rewrites.
