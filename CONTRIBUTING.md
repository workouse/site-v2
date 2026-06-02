# Contributing to Workouse Portfolio

Thank you for your interest in contributing! This is an open-source portfolio website, and contributions that improve the template for the community are welcome.

## What belongs here

This repo is intentionally a focused template. Good contributions:

- Bug fixes (layout issues, broken links, accessibility regressions)
- Performance improvements
- Accessibility improvements
- Documentation clarity

Out of scope (please don't open PRs for):

- Changing the personal content (copy, links, contact details) — that's Emre's site
- Adding new frameworks or dependencies without prior discussion
- Subjective design changes

## Getting started

```bash
# 1. Fork and clone
git clone https://github.com/<your-username>/site-v2.git
cd site-v2

# 2. Use the correct Node version
nvm use 22

# 3. Install dependencies
npm install

# 4. Start the dev server
npm run dev
```

## Before opening a PR

- [ ] `npm run build` succeeds with no errors
- [ ] Your change works on both mobile and desktop
- [ ] You haven't introduced any new Tailwind classes that aren't in the config
- [ ] Accessibility isn't regressed (keyboard nav, focus indicators, contrast)

## Commit style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
fix: correct mobile button padding on Hero
feat: add scroll-driven section entrance animations
docs: improve getting started instructions
chore: bump astro to 4.11
```

## Opening an issue first

For anything non-trivial, please open an issue before starting work. It avoids duplicated effort and ensures the change aligns with the project's direction.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you agree to uphold it.
