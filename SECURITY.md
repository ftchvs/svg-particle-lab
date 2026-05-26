# Security Policy

## Supported versions

`svg-particle-lab` is an early-stage sample package. Security fixes should target
the latest `main` branch unless a release branch exists.

## Reporting a vulnerability

Please do not open public issues for vulnerabilities.

Report suspected security issues through GitHub private vulnerability reporting
for this repository, or contact the maintainer through the repository owner
profile if private reporting is unavailable.

## Scope

This package renders SVGs in the browser using DOM image loading and canvas.
Important boundaries:

- Prefer same-origin SVGs, object URLs from local uploads, or CORS-enabled URLs.
- Remote SVGs can taint canvas reads if served without compatible CORS headers.
- Do not feed private customer artwork or proprietary brand assets into public
  demos, issues, screenshots, or fixtures.
- This package does not proxy remote SVGs or sanitize arbitrary SVG content.

If you need to accept untrusted remote SVGs in production, validate and sanitize
them before passing them to the renderer.
