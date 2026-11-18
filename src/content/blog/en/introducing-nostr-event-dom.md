---
title: "Introducing <nostr-event>: Zero-Dependency Nostr Web Component"
description: "How to embed and render decentralized Nostr profiles, notes, articles, and media on any website with zero framework lock-in, progressive enhancement, strict XSS protection, and native CSS styling."
pubDate: 2026-09-18
author: "delirehberi"
lang: "en"
tags: ["Nostr", "Web Components", "Open Source", "JavaScript", "TypeScript", "Progressive Enhancement", "HTML5", "Decentralization"]
draft: false
---

Decentralized protocols like **Nostr** have proven that open, censorship-resistant communication works at global scale. Through simple cryptographic keypairs (`npub`/`nsec`) and distributed WebSocket relays, users own their identity, social graphs, and content.

However, displaying Nostr content on traditional websites, documentation, and blogs has remained surprisingly painful.

Most existing solutions force developers to import heavy framework dependencies (React, Vue, or Svelte), battle stylesheet leaks, and write manual bech32 decoders. Even worse, rendering unsanitized user content from open public relays introduces severe **Cross-Site Scripting (XSS)** vulnerabilities.

Today, we are excited to introduce [**`@nostr-org-tr/nostr-event-dom`**](https://github.com/Nostr-org-tr/nostr-event-dom)—a lightweight, zero-dependency, framework-agnostic Custom Element (`<nostr-event>`) that brings clean, secure, and progressively enhanced Nostr embedding to the open web.

---

## 1. The Embedding Dilemma: Why Nostr on the Web Was Broken

Embedding content from centralized social platforms (like Twitter or YouTube) typically relies on heavy `<iframe>` embeds. These iframes block search engines, degrade performance, track visitors, and prevent custom styling.

When developers attempt to build native embeds for Nostr, they face four major hurdles:

| Challenge | Traditional Client SDKs / iFrames | `<nostr-event>` Web Component |
| :--- | :--- | :--- |
| **Framework Lock-in** | Requires React, Vue, or Svelte runtime | **Zero dependencies**; native browser Web Component |
| **Styling Isolation** | Global CSS collisions and layout breaks | **Shadow DOM encapsulation** with CSS variables & `::part()` |
| **Security & XSS** | Risk of script injection from unvetted relays | **Strict HTML sanitization** and protocol allowlisting |
| **SEO & Fallback** | Empty DOM for bots and non-JS clients | **Progressive enhancement** with semantic `<a>` fallbacks |
| **Bundle Footprint** | 150KB+ bundled runtimes | **~15KB minified & gzipped** |

---

## 2. Progressive Enhancement & Architecture

The component follows progressive enhancement principles. You start with standard semantic HTML that works without JavaScript, search crawlers index the link, and modern browsers automatically upgrade the element into an interactive card.

```text
+-----------------------------------------------------------------------+
|  HTML Markup (Server-Side / Crawlers / No-JS):                        |
|  <nostr-event>                                                        |
|    <a href="nostr:npub1...">View fiatjaf on Nostr</a>                 |
|  </nostr-event>                                                       |
+-----------------------------------------------------------------------+
                                   |
                                   v  (JavaScript Loads & Hydrates)
+-----------------------------------------------------------------------+
|  Shadow DOM Boundary (Encapsulated CSS & Sanitized Structure):        |
|  #shadow-root (open)                                                  |
|    ├── <style> (Theme tokens: --ne-card-bg, --ne-accent, etc.)        |
|    └── <article part="card">                                          |
|          ├── <header part="header"> (Avatar, Name, NIP-05 Badge)      |
|          ├── <div part="body"> (Sanitized Rich Text, Links, Media)    |
|          └── <footer part="footer"> (Timestamp, Protocol Link)        |
+-----------------------------------------------------------------------+
```

When `<nostr-event>` connects to the DOM:
1. It reads the `event` attribute (bech32 string, hex ID, NIP-05 identifier, or inline JSON).
2. If raw JSON is provided, it renders immediately with zero network delay.
3. If an identifier (`note1...`, `nevent1...`, `naddr1...`, `npub1...`, or `name@domain.com`) is provided, it queries configured WebSocket relays in parallel with in-memory caching.
4. It sanitizes all metadata and text content before rendering into the isolated Shadow DOM.

---

## 3. Supported Event Kinds Out of the Box

Nostr is far more than short microblog posts. The `<nostr-event>` component includes dedicated visual layouts for all major NIP event specifications:

- **Kind 0 (Profiles & NIP-05)**: Renders banners, avatars, display names, bio descriptions, verified NIP-05 badges, personal websites, and Lightning addresses (`lud16`).
- **Kind 1 (Text Notes)**: Full inline parsing for URLs, hashtags, NIP-21 `nostr:` mentions, and embedded images or video players.
- **Kind 30023 (NIP-23 Long-Form Articles)**: Formatted typography, cover images, titles, summaries, and categorized tag chips.
- **Kind 31922 & 31923 (NIP-52 Calendar Events)**: Start/end dates, location badges, organizer info, and event details.
- **Kind 20, 21, 22, 1063, 34235 & 34236 (NIP-68 / NIP-71 Media)**: Responsive 16:9 video players, 9:16 vertical short videos, high-resolution photo galleries, and file metadata.
- **Generic Fallback**: Any unknown or experimental event kind is rendered in a clean card with an expandable, formatted raw JSON inspector.

---

## 4. Zero-Trust Security: Preventing Relay XSS Attacks

Because anyone can run a relay and publish arbitrary payloads, rendering untrusted decentralized data directly into the DOM is dangerous.

`<nostr-event>` implements a strict zero-trust sanitization pipeline:

1. **Strict Protocol Allowlist**: Links and media sources only allow safe URI schemes (`https:`, `http:`, `nostr:`, `web+nostr:`, `lightning:`, `mailto:`, `magnet:`). Dangerous protocols like `javascript:`, `data:`, or `vbscript:` are completely stripped.
2. **HTML Entity Escaping**: All text content, usernames, and bio descriptions are strictly encoded before parsing inline tokens.
3. **No `eval()` or Dynamic Scripts**: The component runs purely on standard web APIs without arbitrary code execution.
4. **Isolated Shadow DOM**: Encapsulation guarantees that third-party content cannot access or manipulate the parent page's scripts or styles.

---

## 5. Quick Start & Integration Recipes

Integrating `<nostr-event>` takes less than 60 seconds and requires no build tools.

### Option A: Via CDN Script Tag

Add the script tag to your HTML header and use `<nostr-event>` anywhere in your page:

```html
<!-- Load component from CDN -->
<script src="https://cdn.jsdelivr.net/npm/@nostr-org-tr/nostr-event-dom/dist/nostr-event.global.js"></script>

<!-- Render Fiatjaf's Profile via NIP-05 -->
<nostr-event event="fiatjaf@fiatjaf.com"></nostr-event>

<!-- Render a Note by note1 or nevent1 ID -->
<nostr-event event="note1..."></nostr-event>

<!-- Render a Long-Form Article by naddr1 -->
<nostr-event event="naddr1..."></nostr-event>
```

### Option B: Progressive Fallback (Best for SEO)

Provide an accessible HTML fallback link. If the user has disabled JavaScript or the network fails, the link remains fully readable:

```html
<nostr-event event="note1...">
  <a href="nostr:note1...">
    Read note on Nostr
  </a>
</nostr-event>
```

### Option C: Instant SSR / Offline Rendering via Direct JSON

In server-rendered environments (like Astro, Next.js, or Remix), you can fetch the event on your server and pass the raw JSON directly to avoid client-side relay fetches:

```html
<nostr-event event='{"id":"...","pubkey":"...","created_at":1700000000,"kind":1,"tags":[],"content":"Hello nostr!","sig":"..."}'></nostr-event>
```

Or bind the event object programmatically in TypeScript:

```typescript
const element = document.querySelector('nostr-event');
if (element) {
  element.event = fetchedNostrEvent;
}
```

### Option D: Install via Package Manager

```bash
npm install @nostr-org-tr/nostr-event-dom
```

```typescript
import '@nostr-org-tr/nostr-event-dom';
```

---

## 6. Styling & Theme Integration

`<nostr-event>` adapts to your site's design system using standard CSS Custom Properties and Shadow DOM `::part()` selectors.

### Customizing with CSS Variables

```css
nostr-event.my-custom-theme {
  --ne-card-bg: #18181b;
  --ne-text: #f4f4f5;
  --ne-text-muted: #a1a1aa;
  --ne-border: #27272a;
  --ne-accent: #f59e0b;
  --ne-accent-hover: #d97706;
  --ne-radius: 16px;
  --ne-font-sans: "Inter", system-ui, sans-serif;
}
```

### Granular Styling with `::part()`

Target specific internal elements without breaking shadow boundary isolation:

```css
/* Add a custom shadow to the card */
nostr-event::part(card) {
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.3);
}

/* Customize author display names */
nostr-event::part(name) {
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* Style the NIP-05 verification badge */
nostr-event::part(nip05) {
  color: #10b981;
}
```

---

## Summary & Open-Source Ecosystem

The future of the open web relies on composable, interoperable standards. With `<nostr-event>`, publishing and embedding sovereign Nostr events across the web is as simple as dropping an HTML tag.

- ⭐️ **GitHub Repository**: [Nostr-org-tr/nostr-event-dom](https://github.com/Nostr-org-tr/nostr-event-dom)
- 📦 **NPM Package**: [`@nostr-org-tr/nostr-event-dom`](https://www.npmjs.com/package/@nostr-org-tr/nostr-event-dom)
- 📖 **Documentation & Demo**: Check out the repository for live examples and test suites.

---

## Need Custom Decentralized Web Solutions?

At **[Workouse](https://workouse.com)**, we design and build high-performance web applications, edge architectures, and decentralized protocol integrations.

[**Talk with our team**](https://workouse.com) to discuss your next project.
