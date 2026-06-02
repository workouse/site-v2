# Workouse — Portfolio Website

> Source code for [workouse.com](https://workouse.com) — the portfolio and public presence of Workouse, a boutique solo software development house.

Built with [Astro](https://astro.build), [Tailwind CSS](https://tailwindcss.com), and deployed on [Cloudflare Pages](https://pages.cloudflare.com).

---

## Stack

| Layer | Technology |
|---|---|
| Framework | [Astro 4](https://astro.build) |
| Styling | [Tailwind CSS 3](https://tailwindcss.com) |
| Deployment | [Cloudflare Pages](https://pages.cloudflare.com) |
| Adapter | [@astrojs/cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) |
| Fonts | Inter, Space Grotesk, Geist Mono (via Google Fonts) |
| Node | 22.x |

---

## Features

- ⚡ **Performance-first** — Static output by default, zero unnecessary JavaScript
- 🌑 **Dark-mode only** — Deep zinc/slate palette with brand yellow (`#FEC500`) and blue (`#003087`) accents
- 📱 **Mobile-first responsive** — Fluid layouts from 320px to ultrawide
- ♿ **Accessible** — Semantic HTML, skip-to-content link, `:focus-visible` indicators, `prefers-reduced-motion` support
- 🔒 **Secure** — Full HTTP security headers via Cloudflare `_headers` (HSTS, CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- 🤖 **Agent-ready** — `robots.txt`, `sitemap.xml`, `llms.txt`, and `/.well-known/security.txt` included
- 🔍 **SEO** — Canonical URLs, Open Graph, Twitter cards, JSON-LD structured data

---

## Project Structure

```
workouse/
├── public/
│   ├── _headers          # Cloudflare Pages HTTP security headers
│   ├── _redirects        # Cloudflare Pages redirect rules
│   ├── robots.txt        # Crawl rules (incl. AI bots)
│   ├── sitemap.xml       # XML sitemap
│   ├── llms.txt          # LLM/AI agent index
│   └── .well-known/
│       └── security.txt  # Responsible disclosure
├── src/
│   ├── components/
│   │   ├── Header.astro       # Sticky glassmorphism navigation
│   │   ├── Hero.astro         # Landing hero section
│   │   ├── SoloEdge.astro     # Founder narrative & stats
│   │   ├── Competencies.astro # Core competencies cards
│   │   ├── Philosophy.astro   # Engineering philosophy quote
│   │   ├── Expertise.astro    # Tech stack & open source
│   │   └── Footer.astro       # Contact & social links
│   ├── layouts/
│   │   └── Layout.astro       # Base HTML shell, SEO, fonts
│   └── pages/
│       ├── index.astro        # Homepage (single-page)
│       └── 404.astro          # Custom error page
├── astro.config.mjs
├── tailwind.config.mjs
├── wrangler.toml              # Cloudflare Pages config
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 22+ (use [nvm](https://github.com/nvm-sh/nvm))

### Install

```bash
nvm use 22
npm install
```

### Develop

```bash
npm run dev
```

Opens at `http://localhost:4321`.

### Build

```bash
npm run build
```

Output goes to `dist/`. The build targets Cloudflare Pages via the `@astrojs/cloudflare` adapter.

### Preview production build locally

```bash
npm run preview
```

---

## Deployment

This site is deployed to **Cloudflare Pages** on every push to `main`.

### Manual deploy via Wrangler

```bash
# Authenticate once
npx wrangler login

# Build and deploy
npm run build
npx wrangler pages deploy dist --project-name site-v2
```

### Environment

The `wrangler.toml` is pre-configured:

```toml
name = "workouse-portfolio"
pages_build_output_dir = "dist"
compatibility_date = "2024-04-03"
compatibility_flags = ["nodejs_compat"]
```

---

## Customisation

All brand tokens are defined in `tailwind.config.mjs`:

```js
colors: {
  brand: {
    blue:   { DEFAULT: '#003087', ... },
    yellow: { DEFAULT: '#FEC500', ... }
  }
}
```

All site copy, links, and contact details live in the individual component files under `src/components/`.

---

## Security Headers

Delivered via `public/_headers` on Cloudflare Pages:

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Camera, mic, geolocation, payment, USB disabled |
| `Content-Security-Policy` | Scoped to self + Google Fonts + GitHub avatars |

---

## License

MIT © [Workouse](https://workouse.com) — Feel free to use this as a template for your own portfolio.

---

## Author

**Emre Yılmaz** — Senior Software Architect & Founder  
[workouse.com](https://workouse.com) · [emre.xyz](https://emre.xyz) · [github.com/workouse](https://github.com/workouse) · [x.com/workousecom](https://x.com/workousecom)
