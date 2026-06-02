# Website Specification Checklist

> Source: [specification.website/checklist/](https://specification.website/checklist/)
> Every spec item, flat and tickable. Use as a self-audit.

Legend: `Required` · `Recommended` · `Optional` · `Avoid`

---

## 1. Foundations

> The HTML, head, and document basics every page needs.

- [ ] **[The HTML doctype](https://specification.website/spec/foundations/doctype/)** `Required`
  Every HTML document must start with `<!doctype html>` as its first line.

- [ ] **[The lang attribute on `<html>`](https://specification.website/spec/foundations/html-lang/)** `Required`
  Set a valid BCP 47 language tag on the `<html>` element.

- [ ] **[`<meta charset>`](https://specification.website/spec/foundations/meta-charset/)** `Required`
  Declare UTF-8 as the document character encoding in the first 1024 bytes of the HTML.

- [ ] **[`<meta viewport>`](https://specification.website/spec/foundations/meta-viewport/)** `Required`
  Tell mobile browsers to render the page at the device's actual width. Never disable user scaling.

- [ ] **[The `<title>` element](https://specification.website/spec/foundations/title/)** `Required`
  Every HTML document must have exactly one non-empty `<title>` element inside `<head>`.

- [ ] **[`<meta name="description">`](https://specification.website/spec/foundations/meta-description/)** `Recommended`
  A short, unique summary of the page used by search engines and social platforms as a snippet.

- [ ] **[Canonical URL (`rel="canonical"`)](https://specification.website/spec/foundations/canonical-url/)** `Recommended`
  Declare the preferred URL for a page so search engines consolidate ranking signals.

- [ ] **[Favicons and app icons](https://specification.website/spec/foundations/favicons/)** `Recommended`
  Ship an SVG favicon, an ICO fallback at `/favicon.ico`, an apple-touch-icon, and a maskable PWA icon.

- [ ] **[`<meta name="theme-color">`](https://specification.website/spec/foundations/theme-color/)** `Recommended`
  Tints the browser chrome and OS surfaces to match your brand. Use `media` for light/dark variants.

- [ ] **[`<meta name="color-scheme">`](https://specification.website/spec/foundations/color-scheme/)** `Recommended`
  Tells the browser which colour schemes your page is designed for. Prevents white flash in dark mode.

- [ ] **[Open Graph protocol](https://specification.website/spec/foundations/open-graph/)** `Recommended`
  Set `og:title`, `og:description`, `og:image`, `og:url`, and `og:type` on every page.

- [ ] **[Feed discovery with `rel="alternate"`](https://specification.website/spec/foundations/feed-discovery/)** `Recommended`
  Announce your RSS/Atom/JSON Feed in `<head>` with `<link rel="alternate">`.

- [ ] **[Feed content hygiene](https://specification.website/spec/foundations/feed-hygiene/)** `Recommended`
  Ship a well-formed feed with `atom:link rel="self"`, stable `guid` per item, and validate before deploy.

- [ ] **[Popover API](https://specification.website/spec/foundations/popover-api/)** `Recommended`
  Replace JavaScript modals, menus, and tooltips with the native top-layer Popover API.

---

## 2. SEO

> Search visibility — robots.txt, sitemaps, canonicals, structured data.

- [ ] **[robots.txt](https://specification.website/spec/seo/robots-txt/)** `Recommended`
  A plain-text file at the site root that tells crawlers which paths they may or may not fetch.

- [ ] **[XML sitemaps](https://specification.website/spec/seo/xml-sitemaps/)** `Recommended`
  An XML file listing the canonical URLs of a site with optional last-changed metadata.

- [ ] **[Sitemap index files](https://specification.website/spec/seo/sitemap-index/)** `Recommended`
  A sitemap of sitemaps — for sites with more than 50,000 URLs or multiple content types.

- [ ] **[Image and video sitemap extensions](https://specification.website/spec/seo/image-sitemaps/)** `Optional`
  Optional XML extensions adding image and video metadata to sitemap entries.

- [ ] **[URL structure](https://specification.website/spec/seo/url-structure/)** `Recommended`
  Keep URLs lowercase, hyphenated, descriptive, and shallow. Treat them as a public API.

- [ ] **[Redirects (301/302/308)](https://specification.website/spec/seo/redirects/)** `Required`
  Use 301/308 for permanent moves, 302/307 for temporary. Never chain more than necessary.

- [ ] **[Soft 404s](https://specification.website/spec/seo/soft-404/)** `Avoid`
  Never return 200 OK for "not found" pages — search engines treat soft 404s as a quality problem.

- [ ] **[Meta robots and X-Robots-Tag](https://specification.website/spec/seo/meta-robots/)** `Required`
  Every page must have an explicit, correct indexing policy. Use `noindex` on staging/admin/private content.

- [ ] **[Heading hierarchy](https://specification.website/spec/seo/heading-hierarchy/)** `Required`
  Headings must form a nested outline, never skip levels, and never be used for visual styling alone.

- [ ] **[Internal linking](https://specification.website/spec/seo/internal-linking/)** `Recommended`
  The strongest crawlability signal you control — links tell crawlers what pages are about and their importance.

- [ ] **[Structured data (JSON-LD)](https://specification.website/spec/seo/structured-data/)** `Recommended`
  Machine-readable annotations using the schema.org vocabulary in JSON-LD format.

- [ ] **[Breadcrumbs](https://specification.website/spec/seo/breadcrumbs/)** `Recommended`
  Visible trail in the UI, marked up as `BreadcrumbList` JSON-LD for search engines.

- [ ] **[IndexNow](https://specification.website/spec/seo/indexnow/)** `Optional`
  Push URL change notifications to Bing, Yandex, Naver, and Seznam. Google does not participate.

---

## 3. Accessibility

> WCAG-aligned rules so people of all abilities can use the site.

- [ ] **[Colour contrast](https://specification.website/spec/accessibility/color-contrast/)** `Required`
  Text and meaningful non-text elements must have sufficient contrast against their background.

- [ ] **[Image alt text](https://specification.website/spec/accessibility/image-alt-text/)** `Required`
  Every `<img>` element must have an `alt` attribute describing its purpose.

- [ ] **[Form labels](https://specification.website/spec/accessibility/form-labels/)** `Required`
  Every form control needs a programmatically associated label. A placeholder is not a label.

- [ ] **[Keyboard navigation](https://specification.website/spec/accessibility/keyboard-navigation/)** `Required`
  Every interactive element must be reachable and operable with a keyboard alone, in logical order.

- [ ] **[Visible focus indicators](https://specification.website/spec/accessibility/focus-indicators/)** `Required`
  Show a clear, high-contrast focus indicator whenever a control receives keyboard focus.

- [ ] **[Skip links](https://specification.website/spec/accessibility/skip-links/)** `Recommended`
  A "skip to main content" link as the first focusable element for keyboard and screen-reader users.

- [ ] **[Semantic HTML and landmarks](https://specification.website/spec/accessibility/semantic-html/)** `Required`
  Use `<header>`, `<nav>`, `<main>`, `<footer>`, and other appropriate semantic elements.

- [ ] **[ARIA — first rule of ARIA](https://specification.website/spec/accessibility/aria-usage/)** `Recommended`
  Reach for a native HTML element first; add ARIA only when nothing native fits.

- [ ] **[Descriptive link text](https://specification.website/spec/accessibility/link-text/)** `Required`
  Every link's text must describe where it goes. "Click here" and "read more" are failures.

- [ ] **[Empty links and buttons](https://specification.website/spec/accessibility/empty-links-buttons/)** `Avoid`
  Never ship a link or button with no accessible name. Icon-only controls must have a label.

- [ ] **[Accessible form errors](https://specification.website/spec/accessibility/form-errors/)** `Required`
  Errors must be identified in text, associated with the triggering input, and announced to assistive tech.

- [ ] **[Document and parts language](https://specification.website/spec/accessibility/document-language/)** `Required`
  Set the page language on `<html lang>` and mark inline content in a different language with its own `lang`.

- [ ] **[Reduced motion](https://specification.website/spec/accessibility/reduced-motion/)** `Required`
  Respect `prefers-reduced-motion`. Decorative animation can trigger vestibular distress and seizures.

- [ ] **[Accessibility overlays](https://specification.website/spec/accessibility/accessibility-overlays/)** `Avoid`
  Third-party runtime accessibility widgets do not work, often harm screen-reader users, and attract lawsuits.

- [ ] **[Captions and transcripts](https://specification.website/spec/accessibility/captions-and-transcripts/)** `Required`
  Video needs synchronised captions. Audio-only content needs a transcript. Auto-captions alone are not enough.

- [ ] **[Accessible data tables](https://specification.website/spec/accessibility/data-tables/)** `Required`
  Use real `<table>` markup with caption, header cells, and `scope` attributes for tabular data.

- [ ] **[Touch target size](https://specification.website/spec/accessibility/touch-target-size/)** `Required`
  Interactive controls must be at least 24×24 CSS px (WCAG 2.2 minimum), 44×44 CSS px is enhanced target.

- [ ] **[Hidden until found](https://specification.website/spec/accessibility/hidden-until-found/)** `Recommended`
  Use `hidden="until-found"` for collapsible content so browser find-in-page and search engines can reach it.

- [ ] **[Native interactive elements](https://specification.website/spec/accessibility/native-interactive-elements/)** `Recommended`
  Prefer `<button>`, `<a>`, `<details>`/`<summary>`, `<dialog>` over divs with click handlers.

- [ ] **[CSS state and relational selectors](https://specification.website/spec/accessibility/css-state-selectors/)** `Recommended`
  Use `:has()`, `:user-invalid`, `:user-valid`, `:placeholder-shown`, and `:focus-within` to express form state in CSS.

---

## 4. Security

> Headers, transport, and policies that keep visitors safe.

- [ ] **[HTTPS and TLS](https://specification.website/spec/security/https-tls/)** `Required`
  Serve every page over HTTPS using TLS 1.2 or 1.3. Redirect plain HTTP. Disable obsolete SSL/TLS versions.

- [ ] **[HSTS (Strict-Transport-Security)](https://specification.website/spec/security/hsts/)** `Required`
  Add `max-age`, `includeSubDomains`, and `preload`. Understand this is an irreversible commitment.

- [ ] **[Content Security Policy (CSP)](https://specification.website/spec/security/content-security-policy/)** `Recommended`
  A CSP tells browsers which sources of script, style, image, and frame content to trust.

- [ ] **[/.well-known/security.txt](https://specification.website/spec/security/security-txt/)** `Recommended`
  A standard file telling security researchers how to report vulnerabilities responsibly.

- [ ] **[X-Content-Type-Options: nosniff](https://specification.website/spec/security/x-content-type-options/)** `Required`
  Stops browsers from guessing a response's content type, blocking content-sniffing attacks.

- [ ] **[Clickjacking protection (frame-ancestors / X-Frame-Options)](https://specification.website/spec/security/frame-ancestors/)** `Required`
  Use CSP `frame-ancestors` to declare who may embed your pages in an iframe.

- [ ] **[Referrer-Policy](https://specification.website/spec/security/referrer-policy/)** `Recommended`
  Use `strict-origin-when-cross-origin` to limit URL leakage to third-party sites.

- [ ] **[Permissions-Policy](https://specification.website/spec/security/permissions-policy/)** `Recommended`
  Turn off powerful browser features (camera, mic, geolocation, payment, USB) for your pages and iframes.

- [ ] **[Subresource Integrity (SRI)](https://specification.website/spec/security/subresource-integrity/)** `Recommended`
  Add cryptographic hashes to every third-party script and stylesheet so browsers refuse tampered files.

- [ ] **[Cookie attributes — Secure, HttpOnly, SameSite](https://specification.website/spec/security/cookie-attributes/)** `Required`
  Every cookie should be `Secure`, `HttpOnly` where possible, and have an explicit `SameSite`.

- [ ] **[DNS CAA records](https://specification.website/spec/security/caa-records/)** `Recommended`
  Tell certificate authorities which of them are allowed to issue certificates for your domain.

- [ ] **[DNSSEC](https://specification.website/spec/security/dnssec/)** `Optional`
  Cryptographically sign DNS records so resolvers can verify they have not been tampered with.

---

## 5. Well-Known URIs

> Standard, agreed-upon paths under `/.well-known/`.

- [ ] **[Well-known URIs overview](https://specification.website/spec/well-known/well-known-overview/)** `Recommended`
  The `/.well-known/` path prefix is a standardised place to publish site-level metadata (RFC 8615).

- [ ] **[/.well-known/change-password](https://specification.website/spec/well-known/change-password/)** `Optional`
  A standard redirect endpoint pointing password managers at your real change-password page. Applicable only if the site has user accounts.

- [ ] **[/.well-known/openid-configuration](https://specification.website/spec/well-known/openid-configuration/)** `Optional`
  A JSON discovery document for OIDC endpoints and capabilities. Only required if you are an OIDC provider.

- [ ] **[/.well-known/api-catalog](https://specification.website/spec/well-known/api-catalog/)** `Recommended`
  A machine-readable index of the APIs a host exposes, served as a Linkset JSON document (RFC 9727).

- [ ] **[/.well-known/webfinger](https://specification.website/spec/well-known/webfinger/)** `Optional`
  Resolves account identifiers like `acct:user@example.com` to a set of links (RFC 7033). Used by the Fediverse.

- [ ] **[/.well-known/apple-app-site-association](https://specification.website/spec/well-known/apple-app-site-association/)** `Optional`
  JSON file telling iOS/macOS which Apple apps may handle URLs on your domain. Required for Universal Links.

- [ ] **[/.well-known/assetlinks.json](https://specification.website/spec/well-known/assetlinks-json/)** `Optional`
  Android's Digital Asset Links file proving app and web domain are owned by the same entity.

- [ ] **[/.well-known/nodeinfo](https://specification.website/spec/well-known/nodeinfo/)** `Optional`
  A discovery URI for federated platforms linking to NodeInfo documents describing the server.

- [ ] **[/.well-known/traffic-advice](https://specification.website/spec/well-known/traffic-advice/)** `Optional`
  A JSON file controlling whether private prefetch proxies (e.g. Chrome's) may send traffic to your origin.

---

## 6. Agent Readiness

> Things that make a site legible to AI agents and crawlers.

- [ ] **[Agent readiness overview](https://specification.website/spec/agent-readiness/agent-readiness-overview/)** `Recommended`
  Stable URLs, structured data, clean semantics, robots controls, and machine-readable endpoints.

- [ ] **[/llms.txt](https://specification.website/spec/agent-readiness/llms-txt/)** `Recommended`
  A proposed markdown file at the site root giving LLMs a curated index of your most important content.

- [ ] **[/llms-full.txt](https://specification.website/spec/agent-readiness/llms-full-txt/)** `Optional`
  An extended companion concatenating full markdown content of key pages into a single file.

- [ ] **[Per-page Markdown source endpoints](https://specification.website/spec/agent-readiness/markdown-source-endpoints/)** `Recommended`
  Expose raw Markdown source at predictable URLs (e.g. `.md` suffix) — agents prefer source over parsing HTML.

- [ ] **[robots.txt for AI crawlers](https://specification.website/spec/agent-readiness/robots-for-ai-crawlers/)** `Recommended`
  Set explicit allow/disallow rules per major AI crawler user-agent to control content usage.

- [ ] **[Content Signals in robots.txt](https://specification.website/spec/agent-readiness/content-signals/)** `Optional`
  Declare whether AI crawlers may search, ingest, or train on your content (emerging IETF proposal).

- [ ] **[Web Bot Auth — verifiable bot identity](https://specification.website/spec/agent-readiness/web-bot-auth/)** `Optional`
  Let bots prove their identity by signing HTTP requests with RFC 9421 HTTP Message Signatures.

- [ ] **[Stable URLs](https://specification.website/spec/agent-readiness/stable-urls/)** `Required`
  Once published, URLs must keep working. Breaking them invalidates citations, bookmarks, and agent caches.

- [ ] **[Structured data for agents](https://specification.website/spec/agent-readiness/structured-data-for-agents/)** `Recommended`
  JSON-LD with schema.org types gives agents typed facts about your page.

- [ ] **[Machine-readable formats](https://specification.website/spec/agent-readiness/machine-readable-formats/)** `Recommended`
  Offer JSON, RSS, or plain markdown endpoints alongside HTML where it makes sense.

- [ ] **[HTTP Link headers for discovery](https://specification.website/spec/agent-readiness/link-headers/)** `Recommended`
  Advertise machine-readable resources (llms.txt, sitemap, api-catalog, RSS) via the HTTP `Link` header.

- [ ] **[MCP and tool discovery](https://specification.website/spec/agent-readiness/mcp-and-tool-discovery/)** `Optional`
  The Model Context Protocol exposes queryable tools to agents over JSON-RPC.

- [ ] **[A2A agent cards](https://specification.website/spec/agent-readiness/a2a-agent-cards/)** `Optional`
  The Agent-to-Agent protocol discovery file: `/.well-known/agent-card.json`.

- [ ] **[Agent Skills discovery](https://specification.website/spec/agent-readiness/agent-skills-discovery/)** `Recommended`
  A well-known URI listing Agent Skills — short, scoped instructions for AI agents to work better with your site.

- [ ] **[DNS for AI Discovery (DNS-AID)](https://specification.website/spec/agent-readiness/dns-aid/)** `Optional`
  Publish SVCB/HTTPS records under `_agents.example.com` for DNS-based agent service discovery.

- [ ] **[NLWeb — conversational interface discovery](https://specification.website/spec/agent-readiness/nlweb/)** `Optional`
  Advertise a conversational AI endpoint via `rel="nlweb"` and serve an MCP-compatible JSON-RPC interface.

- [ ] **[WebMCP — browser-native tools for agents](https://specification.website/spec/agent-readiness/webmcp/)** `Optional`
  Register tools an in-browser AI agent can call via `navigator.modelContext` JavaScript API.

- [ ] **[Schemamap — discoverable JSON-LD endpoints per resource](https://specification.website/spec/agent-readiness/schemamap/)** `Optional`
  `/schemamap.xml` indexes one JSON-LD endpoint per resource for direct structured-data graph access.

---

## 7. Performance

> Core Web Vitals, caching, images, fonts, network behaviour.

- [ ] **[Core Web Vitals (LCP, INP, CLS)](https://specification.website/spec/performance/core-web-vitals/)** `Required`
  Hit LCP ≤ 2.5s, INP ≤ 200ms, and CLS ≤ 0.1 at the 75th percentile of real users.

- [ ] **[Image optimisation](https://specification.website/spec/performance/image-optimization/)** `Required`
  Serve images in WebP/AVIF, at the right viewport size, with explicit dimensions.

- [ ] **[Lazy loading images, iframes, and video](https://specification.website/spec/performance/lazy-loading/)** `Recommended`
  Use `loading="lazy"` on off-screen media — but never on the LCP element.

- [ ] **[Preload, prefetch, preconnect](https://specification.website/spec/performance/preload-prefetch-preconnect/)** `Recommended`
  Preload the LCP image and critical fonts. Preconnect to third-party origins. Prefetch next navigation.

- [ ] **[Cache-Control headers](https://specification.website/spec/performance/cache-control/)** `Required`
  Use `immutable + max-age=31536000` for fingerprinted assets and `no-cache` or short TTL for HTML.

- [ ] **[No-Vary-Search response header](https://specification.website/spec/performance/no-vary-search/)** `Recommended`
  Tell caches that some query parameters (UTM, tracking) do not change the response — reuse cached entries.

- [ ] **[Compression (gzip, brotli, zstd)](https://specification.website/spec/performance/compression/)** `Required`
  Compress text responses with brotli (preferred), gzip (fallback). Don't compress already-compressed media.

- [ ] **[Web font loading](https://specification.website/spec/performance/font-loading/)** `Recommended`
  Self-host WOFF2 fonts, subset them, use `font-display: swap`, and preload critical faces only.

- [ ] **[Critical CSS and render-blocking resources](https://specification.website/spec/performance/critical-css/)** `Recommended`
  Inline CSS for above-the-fold content and defer the rest. Render-blocking `<head>` resources are the #1 cause of slow first paint.

- [ ] **[Script loading — defer, async, module](https://specification.website/spec/performance/script-loading/)** `Recommended`
  Use `defer` for app code, `async` for independent third-party scripts, `type=module` for modern code. Never use bare `<script>` in `<head>`.

- [ ] **[HTTP/2 and HTTP/3](https://specification.website/spec/performance/http3/)** `Recommended`
  Serve over HTTP/2 at minimum, HTTP/3 where possible. QUIC removes TCP handshake delays.

- [ ] **[Speculation Rules](https://specification.website/spec/performance/speculation-rules/)** `Recommended`
  Tell the browser which links to prefetch or prerender before the user clicks.

- [ ] **[Resource hints overview](https://specification.website/spec/performance/resource-hints/)** `Recommended`
  Use dns-prefetch, preconnect, preload, modulepreload, and prefetch — each at the right stage.

- [ ] **[View Transitions](https://specification.website/spec/performance/view-transitions/)** `Recommended`
  Animate between page states or pages with a single CSS opt-in, replacing ad-hoc SPA animation libraries.

- [ ] **[Back/forward cache (BFCache)](https://specification.website/spec/performance/bfcache/)** `Recommended`
  Keep pages BFCache-eligible so back/forward navigation restores from memory instantly.

- [ ] **[Visibility-aware rendering](https://specification.website/spec/performance/visibility-aware-rendering/)** `Recommended`
  Use `content-visibility` with `contain-intrinsic-size` and Intersection Observer for lazy behaviour.

- [ ] **[CSS containment](https://specification.website/spec/performance/css-containment/)** `Optional`
  Use `contain: layout paint style` to isolate reflow and repaint to a subtree.

- [ ] **[Scroll-driven animations](https://specification.website/spec/performance/scroll-driven-animations/)** `Optional`
  Drive CSS animations from scroll position with `scroll-timeline` and `view-timeline`.

- [ ] **[Scrollbar gutter](https://specification.website/spec/performance/scrollbar-gutter/)** `Recommended`
  Use `scrollbar-gutter: stable` to prevent horizontal layout shift when scrollbars appear or disappear.

---

## 8. Privacy

> Consent, signals, and respecting visitor choice.

- [ ] **[Privacy policy](https://specification.website/spec/privacy/privacy-policy/)** `Required`
  Tell visitors what data you collect, why, on what legal basis, who you share it with, and their rights.

- [ ] **[Cookie consent](https://specification.website/spec/privacy/cookie-consent/)** `Required`
  In the EU/UK, non-essential cookies require freely given, informed, unambiguous opt-in consent before setting.

- [ ] **[Global Privacy Control (GPC)](https://specification.website/spec/privacy/global-privacy-control/)** `Recommended`
  Honour the browser-level GPC opt-out signal. Required by California and Colorado law.

- [ ] **[Third-party scripts and privacy](https://specification.website/spec/privacy/third-party-scripts/)** `Recommended`
  Audit every third-party script — they can read cookies, see URLs, and exfiltrate data from your page.

- [ ] **[Privacy-respecting analytics](https://specification.website/spec/privacy/analytics-privacy/)** `Recommended`
  Use aggregate, cookieless, EU-hosted analytics tools that don't require consent banners.

- [ ] **[Data minimisation](https://specification.website/spec/privacy/data-minimization/)** `Recommended`
  Collect only the personal data you need, keep it only as long as needed, and redact unnecessary leakage.

---

## 9. Resilience

> Graceful failure — error pages, offline, redirects.

- [ ] **[Custom error pages (404, 500)](https://specification.website/spec/resilience/error-pages/)** `Required`
  Return the correct HTTP status code, explain what went wrong, and offer users a way forward — without leaking internals.

- [ ] **[Maintenance pages and 503](https://specification.website/spec/resilience/maintenance-pages/)** `Recommended`
  Return HTTP 503 with a `Retry-After` header and a user-friendly message when intentionally offline.

- [ ] **[Offline support and service workers](https://specification.website/spec/resilience/offline-support/)** `Optional`
  A service worker can serve a cached offline fallback page when the network fails.

- [ ] **[Web app manifest](https://specification.website/spec/resilience/pwa-manifest/)** `Recommended`
  A small JSON file telling browsers how the site should appear when installed as a PWA.

- [ ] **[Monitoring and uptime](https://specification.website/spec/resilience/monitoring-uptime/)** `Recommended`
  Monitor from outside your own infrastructure. Combine synthetic checks with real-user data. Run status page on a separate host.

---

## 10. Internationalisation

> Language, locale, direction, and translated content.

- [ ] **[International URL structure](https://specification.website/spec/i18n/international-url-structure/)** `Recommended`
  Pick one URL pattern for multilingual content (ccTLD, subdomain, or subdirectory) and stick with it.

- [ ] **[hreflang for language and regional URLs](https://specification.website/spec/i18n/hreflang/)** `Recommended`
  Use BCP 47 codes with reciprocal `hreflang` across all alternates so search engines show the right version.

- [ ] **[Localised page metadata](https://specification.website/spec/i18n/localised-metadata/)** `Recommended`
  Translate `<title>`, meta description, Open Graph fields, JSON-LD, and image alt text — not just the body.

- [ ] **[hreflang in XML sitemaps](https://specification.website/spec/i18n/sitemap-hreflang/)** `Optional`
  Declare language alternates in the XML sitemap with `xhtml:link` instead of in the HTML `<head>`.

- [ ] **[Avoid automatic IP-based language redirects](https://specification.website/spec/i18n/avoid-auto-geo-redirects/)** `Avoid`
  Auto-redirecting based on IP or `Accept-Language` traps users, breaks crawlers, and breaks shared links.

- [ ] **[lang attribute on inline content](https://specification.website/spec/i18n/lang-attribute/)** `Required`
  Mark inline passages in a different language with a `lang` attribute (WCAG 3.1.2).

- [ ] **[Language switcher](https://specification.website/spec/i18n/language-switcher/)** `Recommended`
  List each locale in its own language ("Deutsch", "日本語"). Don't use flags — flags are countries, not languages.

- [ ] **[RTL and bidirectional text](https://specification.website/spec/i18n/rtl-support/)** `Recommended`
  Set `dir="rtl"` and use CSS logical properties for Arabic, Hebrew, Persian, and Urdu.

- [ ] **[Writing modes and CJK line breaking](https://specification.website/spec/i18n/writing-modes/)** `Optional`
  Vertical text needs CSS `writing-mode`. CJK and Thai need explicit `line-break` and `word-break` rules.

- [ ] **[Locale-aware content](https://specification.website/spec/i18n/locale-content/)** `Recommended`
  Format dates, numbers, currency, and units in the user's locale using `Intl` APIs.

- [ ] **[Plural rules and grammatical number](https://specification.website/spec/i18n/plural-rules/)** `Recommended`
  Use CLDR plural categories (zero, one, two, few, many, other) via `Intl.PluralRules`.

- [ ] **[Internationalised Domain Names (IDN)](https://specification.website/spec/i18n/idn-support/)** `Optional`
  IDNs allow non-ASCII characters in domain names, encoded as Punycode on the wire.

---

*Generated from [specification.website/checklist/](https://specification.website/checklist/) on 2026-06-01.*
