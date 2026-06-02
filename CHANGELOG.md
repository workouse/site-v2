# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.0.0] — 2026-06-02

### Added
- Initial public release of the Workouse portfolio website
- Hero section with animated CTA buttons and ambient glow orbs
- Solo Edge section: founder narrative, terminal code mockup, and stats grid
- Core Competencies 3-card grid with SVG icons and hover glow effects
- Philosophy quote section with large typographic treatment
- Expertise section: prioritized tech stack grid, niche innovation block, and open-source project cards
- Footer with contact links (Email, GitHub, X/Twitter, Upwork, emre.xyz)
- Sticky glassmorphism navigation header with mobile hamburger menu
- Mouse-follow radial cursor glow animation (desktop only, respects `prefers-reduced-motion`)
- Brand color system: Deep Blue (`#003087`) and Yellow/Gold (`#FEC500`)
- Typography system: Inter (body), Space Grotesk (display), Geist Mono (code)
- Cloudflare Pages deployment with `@astrojs/cloudflare` adapter
- Full HTTP security headers via `_headers` (HSTS, CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- SEO: canonical URLs, Open Graph, Twitter cards, JSON-LD structured data
- Accessibility: skip-to-content link, `:focus-visible` indicators, `prefers-reduced-motion`, semantic HTML landmarks
- Agent readiness: `robots.txt` (with AI bot rules), `sitemap.xml`, `llms.txt`, `/.well-known/security.txt`
- Custom branded 404 error page
- `scrollbar-gutter: stable` to prevent layout shift on scroll
- `_redirects` for www → apex domain redirect

[Unreleased]: https://github.com/workouse/site-v2/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/workouse/site-v2/releases/tag/v1.0.0
