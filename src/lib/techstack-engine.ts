// Workouse Audit Tool — Tech Stack Detection & Platform-Specific Modernization Rules Engine

import type {
  DetectedExtension,
  DetectedTechItem,
  DetectedTechStackResult,
  ModernizationChecklistItem,
  ModernizationReport,
  PlatformType,
  TechCategory,
  TechStatus,
} from './types';
import type { AuditRawResults } from './audit-engine';

export interface MatchResult {
  match: boolean;
  version?: string;
  statusOverride?: TechStatus;
}

/**
 * Signature definitions for technology detection.
 */
interface TechSignature {
  id: string;
  name: string;
  category: TechCategory;
  defaultStatus: TechStatus;
  modernReplacement: string;
  description: string;
  headerMatch?: (headers: Record<string, string>) => MatchResult;
  htmlMatch?: (html: string) => MatchResult;
}

const TECH_SIGNATURES: TechSignature[] = [
  // ── CMS & Platforms ────────────────────────────────────────────────────────
  {
    id: 'cms-wordpress',
    name: 'WordPress CMS',
    category: 'CMS',
    defaultStatus: 'legacy',
    modernReplacement: 'WordPress 6.x Performance Architecture + Cloudflare APO / Super Page Cache',
    description: 'World\'s most popular CMS. Can achieve sub-second speeds when paired with Cloudflare APO, modern caching, and lightweight themes/plugins.',
    htmlMatch: (html) => {
      const match = html.match(/<meta[^>]*name=["']generator["'][^>]*content=["']WordPress\s*([\d\.]+)?["']/i) ||
                    html.match(/\/wp-content\//i) ||
                    html.match(/\/wp-includes\//i);
      if (match) {
        const ver = match[1] || undefined;
        let statusOverride: TechStatus = 'legacy';
        if (ver && (ver.startsWith('3.') || ver.startsWith('4.') || ver.startsWith('5.0'))) {
          statusOverride = 'end-of-life';
        } else if (ver && ver.startsWith('6.')) {
          statusOverride = 'modern';
        }
        return { match: true, version: ver, statusOverride };
      }
      return { match: false };
    },
    headerMatch: (headers) => {
      const xPow = headers['x-powered-by'] || '';
      const linkHeader = headers['link'] || '';
      if (xPow.includes('WordPress') || linkHeader.includes('wp-json')) {
        return { match: true };
      }
      return { match: false };
    },
  },
  {
    id: 'ecommerce-woocommerce',
    name: 'WooCommerce',
    category: 'E-Commerce',
    defaultStatus: 'legacy',
    modernReplacement: 'WooCommerce HPOS + Redis Object Cache + Cloudflare APO',
    description: 'WordPress e-commerce engine. Requires High-Performance Order Storage (HPOS) and server-side object caching for fast checkout.',
    htmlMatch: (html) => {
      if (html.includes('woocommerce') || html.includes('wc-ajax') || html.match(/\/plugins\/woocommerce\//i)) {
        return { match: true };
      }
      return { match: false };
    },
  },
  {
    id: 'ecommerce-shopify',
    name: 'Shopify Storefront',
    category: 'E-Commerce',
    defaultStatus: 'modern',
    modernReplacement: 'Shopify Online Store 2.0 (Dawn Architecture) + Native App Blocks + Cloudflare Zaraz',
    description: 'Hosted commerce platform. Peak performance is achieved using Online Store 2.0 themes, native Liquid sections, and pruning client-side app scripts.',
    htmlMatch: (html) => {
      if (
        html.includes('Shopify.shop') ||
        html.includes('cdn.shopify.com') ||
        html.includes('Shopify.theme') ||
        html.includes('window.ShopifyAnalytics') ||
        html.includes('shopify-section') ||
        html.includes('powered by Shopify') ||
        html.includes('shopify-payment-button')
      ) {
        return { match: true };
      }
      return { match: false };
    },
    headerMatch: (headers) => {
      if (headers['x-shopify-stage'] || headers['x-shopid'] || headers['server']?.toLowerCase().includes('cloudflare')) {
        const xShop = headers['x-shopid'] || headers['x-shopify-stage'];
        if (xShop) return { match: true };
      }
      return { match: false };
    },
  },
  {
    id: 'cms-wix',
    name: 'Wix Platform',
    category: 'CMS',
    defaultStatus: 'legacy',
    modernReplacement: 'Wix Studio (Responsive Engine) or Webflow',
    description: 'Visual website builder. Legacy Wix sites suffer from heavy JavaScript bundles; modern Wix Studio or Webflow provides cleaner layout rendering.',
    htmlMatch: (html) => {
      if (
        html.includes('wix.com') ||
        html.includes('wix-thunderbolt') ||
        html.includes('wix-warmup-data') ||
        html.includes('parastorage.com') ||
        html.includes('X-Wix-Renderer-Server')
      ) {
        const isStudio = html.includes('wix-studio') || html.includes('data-studio');
        return { match: true, version: isStudio ? 'Studio' : 'Classic', statusOverride: isStudio ? 'modern' : 'legacy' };
      }
      return { match: false };
    },
    headerMatch: (headers) => {
      if (headers['x-wix-request-id'] || headers['x-wix-renderer-server']) {
        return { match: true };
      }
      return { match: false };
    },
  },
  {
    id: 'cms-webflow',
    name: 'Webflow',
    category: 'CMS',
    defaultStatus: 'modern',
    modernReplacement: 'Webflow + Cloudflare Global Reverse-Proxy Edge Caching',
    description: 'Visual development platform with clean semantic HTML. Maximized by edge-caching reverse proxy and pruning interaction scripts.',
    htmlMatch: (html) => {
      if (
        html.includes('w-dyn-list') ||
        html.includes('wf-page') ||
        html.includes('wf-site') ||
        html.match(/assets\.website-files\.com/i) ||
        html.match(/webflow\.js/i)
      ) {
        return { match: true };
      }
      return { match: false };
    },
  },
  {
    id: 'cms-squarespace',
    name: 'Squarespace',
    category: 'CMS',
    defaultStatus: 'legacy',
    modernReplacement: 'Squarespace 7.1 Fluid Engine or Webflow / Shopify',
    description: 'All-in-one CMS platform. Upgrading from legacy 7.0 to 7.1 Fluid Engine removes layout reflow bottlenecks.',
    htmlMatch: (html) => {
      if (
        html.includes('squarespace.com') ||
        html.includes('static1.squarespace.com') ||
        html.includes('Squarespace.Constants') ||
        html.includes('data-template-body-classes')
      ) {
        const is71 = html.includes('squarespace-7-1') || html.includes('fe-block');
        return { match: true, version: is71 ? '7.1 Fluid Engine' : '7.0 Legacy', statusOverride: is71 ? 'modern' : 'legacy' };
      }
      return { match: false };
    },
  },
  {
    id: 'ecommerce-magento',
    name: 'Magento / Adobe Commerce',
    category: 'E-Commerce',
    defaultStatus: 'legacy',
    modernReplacement: 'Magento 2 + Hyvä Themes (Tailwind/Alpine) or Shopify Plus',
    description: 'Enterprise PHP e-commerce platform. Heavy default Luma/RequireJS frontend can be modernized with Hyvä Themes for sub-second speeds.',
    htmlMatch: (html) => {
      if (
        html.includes('Mage.Cookies') ||
        html.includes('/static/frontend/Magento/') ||
        html.includes('x-magento-init') ||
        html.includes('mage/cookies')
      ) {
        const isHyva = html.includes('hyva') || html.includes('Hyva');
        return { match: true, version: isHyva ? 'Hyvä Theme' : 'Luma Monolith', statusOverride: isHyva ? 'modern' : 'legacy' };
      }
      return { match: false };
    },
    headerMatch: (headers) => {
      if (headers['x-magento-tags'] || headers['x-magento-cache-debug']) {
        return { match: true };
      }
      return { match: false };
    },
  },
  {
    id: 'ecommerce-prestashop',
    name: 'PrestaShop',
    category: 'E-Commerce',
    defaultStatus: 'legacy',
    modernReplacement: 'PrestaShop 8+ Optimized Theme or Shopify',
    description: 'Open-source PHP e-commerce platform requiring opcode caching, memcached, and CDN media offloading.',
    htmlMatch: (html) => {
      if (html.includes('prestashop') || html.match(/\/modules\/ps_/i)) {
        return { match: true };
      }
      return { match: false };
    },
  },
  {
    id: 'cms-drupal',
    name: 'Drupal CMS',
    category: 'CMS',
    defaultStatus: 'end-of-life',
    modernReplacement: 'Headless CMS + Astro / Next.js or Drupal 10+ decoupled',
    description: 'Enterprise PHP CMS with high server overhead. Older major releases (Drupal 7/8) have reached End-Of-Life (EOL).',
    htmlMatch: (html) => {
      const match = html.match(/<meta[^>]*name=["']generator["'][^>]*content=["']Drupal\s*([\d\.]+)?["']/i) ||
                    html.match(/\/sites\/default\/files\//i) ||
                    html.match(/Drupal\.settings/i);
      if (match) {
        const ver = match[1] || undefined;
        return { match: true, version: ver, statusOverride: 'end-of-life' };
      }
      return { match: false };
    },
    headerMatch: (headers) => {
      if (headers['x-generator']?.includes('Drupal') || headers['x-drupal-cache']) {
        return { match: true, statusOverride: 'end-of-life' };
      }
      return { match: false };
    },
  },
  {
    id: 'cms-joomla',
    name: 'Joomla CMS',
    category: 'CMS',
    defaultStatus: 'deprecated',
    modernReplacement: 'Astro + Cloudflare Pages or Modern Headless CMS',
    description: 'Legacy PHP CMS framework with outdated database abstractions and frequent plugin vulnerabilities.',
    htmlMatch: (html) => {
      const match = html.match(/<meta[^>]*name=["']generator["'][^>]*content=["']Joomla!\s*([\d\.]+)?["']/i) ||
                    html.match(/\/components\/com_/i);
      if (match) {
        return { match: true, version: match[1] || undefined, statusOverride: 'deprecated' };
      }
      return { match: false };
    },
  },
  {
    id: 'platform-aspnet-webforms',
    name: 'ASP.NET WebForms',
    category: 'CMS',
    defaultStatus: 'end-of-life',
    modernReplacement: 'ASP.NET Core API / Cloudflare Workers + React/Astro',
    description: 'Legacy Microsoft server-side UI framework using stateful __VIEWSTATE hidden fields, heavy payloads, and non-semantic HTML.',
    htmlMatch: (html) => {
      if (html.includes('__VIEWSTATE') || html.includes('__EVENTTARGET') || html.match(/\.aspx(?:\?|$)/i)) {
        return { match: true, statusOverride: 'end-of-life' };
      }
      return { match: false };
    },
    headerMatch: (headers) => {
      const aspVer = headers['x-aspnet-version'] || '';
      if (aspVer.startsWith('1.') || aspVer.startsWith('2.') || aspVer.startsWith('4.0')) {
        return { match: true, version: aspVer, statusOverride: 'end-of-life' };
      }
      return { match: false };
    },
  },

  // ── Frontend JS Libraries ──────────────────────────────────────────────────
  {
    id: 'js-jquery',
    name: 'jQuery',
    category: 'Frontend JS',
    defaultStatus: 'deprecated',
    modernReplacement: 'Vanilla ES6+ JavaScript & Web APIs',
    description: 'Legacy DOM manipulation library that adds bloat, slows browser parsing, and introduces security vulnerabilities in older versions.',
    htmlMatch: (html) => {
      const match = html.match(/jquery[-.]([\d\.]+)(?:\.min)?\.js/i) ||
                    html.match(/code\.jquery\.com\/jquery-([\d\.]+)/i);
      if (match || html.includes('window.jQuery') || html.includes('$.fn.jquery')) {
        const ver = match ? match[1] : undefined;
        let statusOverride: TechStatus = 'deprecated';
        if (ver && (ver.startsWith('1.') || ver.startsWith('2.'))) {
          statusOverride = 'end-of-life';
        }
        return { match: true, version: ver, statusOverride };
      }
      return { match: false };
    },
  },
  {
    id: 'js-angularjs-1x',
    name: 'AngularJS (1.x)',
    category: 'Frontend JS',
    defaultStatus: 'end-of-life',
    modernReplacement: 'React / Vue 3 / Astro Islands',
    description: 'Deprecated Google frontend framework that reached official End-of-Life in December 2021. Unsafe for modern web apps.',
    htmlMatch: (html) => {
      if (html.includes('ng-app') || html.includes('ng-controller') || html.includes('ng-model') || html.match(/angular[-.](1\.\d+\.\d+)/i)) {
        const verMatch = html.match(/angular[-.](1\.\d+\.\d+)/i);
        return { match: true, version: verMatch ? verMatch[1] : '1.x', statusOverride: 'end-of-life' };
      }
      return { match: false };
    },
  },
  {
    id: 'js-prototype-mootools',
    name: 'Prototype.js / MooTools',
    category: 'Frontend JS',
    defaultStatus: 'end-of-life',
    modernReplacement: 'Vanilla JS ES6+',
    description: 'Obsolete 2000s JavaScript utility libraries that modify native JS prototypes and break modern ECMAScript standards.',
    htmlMatch: (html) => {
      if (html.match(/prototype[-.]([\d\.]+)?\.js/i) || html.match(/mootools[-.]([\d\.]+)?\.js/i)) {
        return { match: true, statusOverride: 'end-of-life' };
      }
      return { match: false };
    },
  },
  {
    id: 'js-astro-modern',
    name: 'Astro Framework',
    category: 'Frontend JS',
    defaultStatus: 'cutting-edge',
    modernReplacement: 'None — Current State-of-the-Art',
    description: 'Modern island-architecture framework delivering zero JavaScript by default for maximum performance.',
    htmlMatch: (html) => {
      if (html.includes('astro-island') || html.includes('data-astro-cid') || html.includes('astro-route')) {
        return { match: true };
      }
      return { match: false };
    },
  },
  {
    id: 'js-react-modern',
    name: 'React.js',
    category: 'Frontend JS',
    defaultStatus: 'modern',
    modernReplacement: 'React 19 / Astro Islands integration',
    description: 'Modern component-based UI library powering dynamic user interfaces.',
    htmlMatch: (html) => {
      if (html.includes('data-reactroot') || html.includes('_reactListening') || html.includes('react-dom')) {
        return { match: true };
      }
      return { match: false };
    },
  },
  {
    id: 'js-vue-modern',
    name: 'Vue.js',
    category: 'Frontend JS',
    defaultStatus: 'modern',
    modernReplacement: 'Vue 3 Composition API / Nuxt',
    description: 'Progressive JavaScript framework for building user interfaces.',
    htmlMatch: (html) => {
      if (html.includes('data-v-') || html.includes('__vue__') || html.includes('v-cloak')) {
        return { match: true };
      }
      return { match: false };
    },
  },
  {
    id: 'js-alpine-modern',
    name: 'Alpine.js',
    category: 'Frontend JS',
    defaultStatus: 'modern',
    modernReplacement: 'None — Modern Lightweight Reactive JS',
    description: 'Rugged, minimal tool for composing behavior directly in markup with tiny bundle footprint.',
    htmlMatch: (html) => {
      if (html.includes('x-data') || html.includes('x-init') || html.includes('x-bind')) {
        return { match: true };
      }
      return { match: false };
    },
  },

  // ── CSS Frameworks ─────────────────────────────────────────────────────────
  {
    id: 'css-bootstrap-legacy',
    name: 'Bootstrap 3 / 4',
    category: 'CSS Framework',
    defaultStatus: 'legacy',
    modernReplacement: 'Tailwind CSS / Modern CSS Grid & Flexbox',
    description: 'Heavy legacy CSS framework with bulky stylesheet bundles, jQuery reliance, and rigid class structures.',
    htmlMatch: (html) => {
      const match3 = html.match(/col-xs-\d+/i) || html.match(/btn-default/i) || html.match(/bootstrap[-.]3\./i);
      const match4 = html.match(/col-xl-\d+/i) || html.match(/embed-responsive/i) || html.match(/bootstrap[-.]4\./i);
      if (match3) {
        return { match: true, version: '3.x', statusOverride: 'deprecated' };
      }
      if (match4) {
        return { match: true, version: '4.x', statusOverride: 'legacy' };
      }
      return { match: false };
    },
  },
  {
    id: 'css-tailwind-modern',
    name: 'Tailwind CSS',
    category: 'CSS Framework',
    defaultStatus: 'modern',
    modernReplacement: 'None — Modern Utility CSS',
    description: 'Utility-first CSS framework enabling zero-runtime, tightly optimized stylesheet bundles.',
    htmlMatch: (html) => {
      if (html.includes('tailwind') || (html.includes('sm:flex') && html.includes('md:grid'))) {
        return { match: true };
      }
      return { match: false };
    },
  },

  // ── Backend & Server ───────────────────────────────────────────────────────
  {
    id: 'backend-php-legacy',
    name: 'PHP (Legacy Version)',
    category: 'Backend / Server',
    defaultStatus: 'end-of-life',
    modernReplacement: 'PHP 8.3+ containerized or Cloudflare Workers (Edge JS/TS)',
    description: 'Outdated server runtime. PHP versions below 8.1 no longer receive security patches and suffer from high RAM usage.',
    headerMatch: (headers) => {
      const xPow = headers['x-powered-by'] || '';
      const match = xPow.match(/PHP\/([\d\.]+)/i);
      if (match) {
        const ver = match[1];
        let statusOverride: TechStatus = 'legacy';
        if (ver.startsWith('5.') || ver.startsWith('7.')) {
          statusOverride = 'end-of-life';
        }
        return { match: true, version: ver, statusOverride };
      }
      return { match: false };
    },
  },
  {
    id: 'backend-iis-legacy',
    name: 'Microsoft IIS (Legacy)',
    category: 'Backend / Server',
    defaultStatus: 'deprecated',
    modernReplacement: 'Cloudflare Edge / Linux Docker Container',
    description: 'Legacy Windows Web Server. IIS 7.0/7.5/8.5 operate on unsupported Windows Server OS versions.',
    headerMatch: (headers) => {
      const server = headers['server'] || '';
      const match = server.match(/Microsoft-IIS\/([\d\.]+)/i);
      if (match) {
        const ver = match[1];
        let statusOverride: TechStatus = 'legacy';
        if (ver === '7.0' || ver === '7.5' || ver === '8.0' || ver === '8.5') {
          statusOverride = 'end-of-life';
        }
        return { match: true, version: ver, statusOverride };
      }
      return { match: false };
    },
  },
  {
    id: 'backend-cloudflare-edge',
    name: 'Cloudflare Edge Network',
    category: 'Backend / Server',
    defaultStatus: 'cutting-edge',
    modernReplacement: 'None — Modern Global Edge',
    description: 'Distributed edge serverless platform with sub-50ms global latency and automated TLS/HTTP3 execution.',
    headerMatch: (headers) => {
      if (headers['server'] === 'cloudflare' || headers['cf-ray']) {
        return { match: true };
      }
      return { match: false };
    },
  },

  // ── Protocol & Infrastructure ─────────────────────────────────────────────
  {
    id: 'net-http1',
    name: 'HTTP/1.1 Protocol',
    category: 'Protocol / Network',
    defaultStatus: 'legacy',
    modernReplacement: 'HTTP/2 & HTTP/3 (QUIC) over Cloudflare CDN',
    description: 'Legacy web protocol suffering from head-of-line blocking and sequential request latency.',
    headerMatch: (headers) => {
      if (!headers['alt-svc']?.includes('h3') && !headers['cf-ray'] && !headers['via']?.includes('2.0')) {
        return { match: true, statusOverride: 'legacy' };
      }
      return { match: false };
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Extension & Plugin Intelligence Registries
// ─────────────────────────────────────────────────────────────────────────────

interface PluginDescriptor {
  name: string;
  category: DetectedExtension['category'];
  currentStatus: DetectedExtension['currentStatus'];
  suggestedAlternative?: string;
  description: string;
}

const WP_PLUGIN_CATALOG: Record<string, PluginDescriptor> = {
  // Page Builders
  'elementor': {
    name: 'Elementor Page Builder',
    category: 'page_builder',
    currentStatus: 'bloated',
    suggestedAlternative: 'Kadence / Blocksy / Bricks Theme or Native Gutenberg Blocks',
    description: 'Deep DOM nesting and large JS runtime that delays mobile interaction and increases Total Blocking Time (TBT).',
  },
  'elementor-pro': {
    name: 'Elementor Pro',
    category: 'page_builder',
    currentStatus: 'bloated',
    suggestedAlternative: 'Gutenberg Blocks (Kadence/GenerateBlocks) or Bricks Builder',
    description: 'Adds additional client-side script payloads and dynamic asset dependencies on every page.',
  },
  'js_composer': {
    name: 'WPBakery Page Builder',
    category: 'page_builder',
    currentStatus: 'bloated',
    suggestedAlternative: 'Modern Block Builder (Gutenberg / Bricks / Kadence)',
    description: 'Legacy shortcode-based visual composer that bloats the WordPress database and injects inline styles.',
  },
  'divi-builder': {
    name: 'Divi Builder',
    category: 'page_builder',
    currentStatus: 'bloated',
    suggestedAlternative: 'Kadence / GeneratePress or Bricks Theme',
    description: 'Monolithic builder with heavy CSS bundles and substantial main-thread script execution.',
  },
  'beaver-builder-lite-version': {
    name: 'Beaver Builder',
    category: 'page_builder',
    currentStatus: 'bloated',
    suggestedAlternative: 'Native Gutenberg Blocks + GenerateBlocks',
    description: 'Client-side builder that slows down initial DOM parsing on mobile devices.',
  },

  // Caching & Performance
  'wp-rocket': {
    name: 'WP Rocket',
    category: 'caching',
    currentStatus: 'optimal',
    description: 'High-performance WordPress page caching, CSS delay, and critical path optimization.',
  },
  'litespeed-cache': {
    name: 'LiteSpeed Cache',
    category: 'caching',
    currentStatus: 'optimal',
    description: 'Server-level caching for LiteSpeed/OpenLiteSpeed web server environments.',
  },
  'flying-press': {
    name: 'FlyingPress',
    category: 'caching',
    currentStatus: 'optimal',
    description: 'Cutting-edge WordPress optimization delivering sub-second Core Web Vitals.',
  },
  'w3-total-cache': {
    name: 'W3 Total Cache',
    category: 'caching',
    currentStatus: 'legacy',
    suggestedAlternative: 'FlyingPress / WP Rocket / Cloudflare APO',
    description: 'Complex legacy caching plugin with high configuration overhead and potential cache stampede risks.',
  },
  'wp-super-cache': {
    name: 'WP Super Cache',
    category: 'caching',
    currentStatus: 'legacy',
    suggestedAlternative: 'Cloudflare Automatic Platform Optimization (APO)',
    description: 'Basic HTML file caching without advanced modern CSS delay or image optimization.',
  },
  'autoptimize': {
    name: 'Autoptimize',
    category: 'caching',
    currentStatus: 'good',
    suggestedAlternative: 'FlyingPress or WP Rocket (all-in-one)',
    description: 'Script and stylesheet aggregator; best combined with edge page caching.',
  },
  'perfmatters': {
    name: 'Perfmatters',
    category: 'caching',
    currentStatus: 'optimal',
    description: 'Asset script manager that unloads unused CSS/JS on specific pages to eliminate bloat.',
  },

  // SEO
  'wordpress-seo': {
    name: 'Yoast SEO',
    category: 'seo',
    currentStatus: 'bloated',
    suggestedAlternative: 'Rank Math SEO or SEOPress',
    description: 'Heavy legacy SEO plugin with significant admin overhead and larger frontend script footprint.',
  },
  'seo-by-rank-math': {
    name: 'Rank Math SEO',
    category: 'seo',
    currentStatus: 'optimal',
    description: 'Modern, modular, lightweight WordPress SEO suite with automated Schema.org JSON-LD.',
  },
  'all-in-one-seo-pack': {
    name: 'All in One SEO',
    category: 'seo',
    currentStatus: 'legacy',
    suggestedAlternative: 'Rank Math SEO',
    description: 'Older SEO plugin; upgrading to Rank Math reduces database query counts.',
  },

  // Forms
  'contact-form-7': {
    name: 'Contact Form 7',
    category: 'forms',
    currentStatus: 'bloated',
    suggestedAlternative: 'Fluent Forms / WS Form or Native Gutenberg Block Form',
    description: 'Loads its CSS and JavaScript bundles globally on every single page even where no forms exist.',
  },
  'wpforms-lite': {
    name: 'WPForms',
    category: 'forms',
    currentStatus: 'good',
    description: 'Modern drag-and-drop form builder for WordPress.',
  },
  'gravityforms': {
    name: 'Gravity Forms',
    category: 'forms',
    currentStatus: 'good',
    description: 'Advanced form management system.',
  },

  // Sliders & Media
  'revslider': {
    name: 'Slider Revolution',
    category: 'other',
    currentStatus: 'bloated',
    suggestedAlternative: 'CSS Grid Hero / Native Swiper Carousel',
    description: 'Extremely heavy JavaScript animation engine that delays Largest Contentful Paint (LCP) by up to 2.5 seconds.',
  },
  'layerslider': {
    name: 'LayerSlider',
    category: 'other',
    currentStatus: 'bloated',
    suggestedAlternative: 'CSS Grid / Swiper Carousel',
    description: 'Heavy legacy slider library with high mobile CPU hydration overhead.',
  },
  'webp-converter-for-media': {
    name: 'Converter for Media',
    category: 'caching',
    currentStatus: 'optimal',
    description: 'Automatically serves next-gen WebP/AVIF images to modern browsers.',
  },
  'shortpixel-image-optimiser': {
    name: 'ShortPixel Image Optimizer',
    category: 'caching',
    currentStatus: 'optimal',
    description: 'Automated lossy/lossless WebP image compression.',
  },

  // Security
  'wordfence': {
    name: 'Wordfence Security',
    category: 'security',
    currentStatus: 'good',
    description: 'Endpoint firewall and malware scanner (best paired with Cloudflare WAF).',
  },
  'better-wp-security': {
    name: 'Solid Security (iThemes)',
    category: 'security',
    currentStatus: 'good',
    description: 'WordPress hardening and two-factor authentication suite.',
  },

  // E-Commerce
  'woocommerce': {
    name: 'WooCommerce Core',
    category: 'ecommerce',
    currentStatus: 'good',
    suggestedAlternative: 'Enable High-Performance Order Storage (HPOS) + Redis Cache',
    description: 'E-commerce engine; needs HPOS and database indexing for high concurrent cart performance.',
  },
};

const SHOPIFY_APP_CATALOG: Record<string, PluginDescriptor> = {
  // Page Builders
  'pagefly': {
    name: 'PageFly Landing Page Builder',
    category: 'page_builder',
    currentStatus: 'bloated',
    suggestedAlternative: 'Shopify Online Store 2.0 Native Liquid Sections & JSON Templates',
    description: 'Injects extensive client-side JavaScript that executes before page rendering, impacting mobile speed.',
  },
  'shogun': {
    name: 'Shogun Page Builder',
    category: 'page_builder',
    currentStatus: 'bloated',
    suggestedAlternative: 'Shopify Online Store 2.0 Custom Theme Sections',
    description: 'Heavy external asset payloads that can be replaced with native Shopify 2.0 theme sections.',
  },
  'gempages': {
    name: 'GemPages Landing Page Builder',
    category: 'page_builder',
    currentStatus: 'bloated',
    suggestedAlternative: 'Shopify OS 2.0 Native Liquid Blocks & Metafields',
    description: 'Client-side page construction that inflates total blocking time.',
  },

  // Reviews
  'loox': {
    name: 'Loox Product Reviews & Photos',
    category: 'reviews',
    currentStatus: 'legacy',
    suggestedAlternative: 'Judge.me (Ultra-lightweight) or Native Shopify Reviews',
    description: 'Review widget that loads multiple client-side script tags, slowing down product page interactive time.',
  },
  'judgeme': {
    name: 'Judge.me Product Reviews',
    category: 'reviews',
    currentStatus: 'optimal',
    description: 'Ultra-lightweight review engine with minimal DOM overhead and fast asynchronous asset loading.',
  },
  'yotpo': {
    name: 'Yotpo Reviews & Loyalty',
    category: 'reviews',
    currentStatus: 'legacy',
    suggestedAlternative: 'Judge.me or Stamped.io',
    description: 'Enterprise review suite with significant client-side JS bundle footprint.',
  },
  'okendo': {
    name: 'Okendo Customer Reviews',
    category: 'reviews',
    currentStatus: 'good',
    description: 'High-performance customer marketing and review platform.',
  },

  // Marketing & Popups
  'klaviyo': {
    name: 'Klaviyo Email & SMS',
    category: 'marketing',
    currentStatus: 'good',
    suggestedAlternative: 'Offload tracking events via Cloudflare Zaraz / Server-Side Events',
    description: 'Marketing automation suite. Moving tracking scripts to edge offloads main-thread browser execution.',
  },
  'privy': {
    name: 'Privy Popups & Email',
    category: 'marketing',
    currentStatus: 'bloated',
    suggestedAlternative: 'Shopify Native Forms or Cloudflare Zaraz Tagging',
    description: 'Client-side modal overlays that trigger layout shifts and delay mobile interactivity.',
  },
  'omnisend': {
    name: 'Omnisend Marketing Automation',
    category: 'marketing',
    currentStatus: 'good',
    description: 'Email and SMS marketing integration for e-commerce.',
  },

  // Upsell & Checkout
  'reconvert': {
    name: 'ReConvert Post-Purchase Upsell',
    category: 'ecommerce',
    currentStatus: 'good',
    description: 'Checkout and thank-you page conversion optimization app.',
  },
  'bold-upsell': {
    name: 'Bold Upsell & Bundles',
    category: 'ecommerce',
    currentStatus: 'legacy',
    suggestedAlternative: 'Shopify Native Checkout UI Extensions',
    description: 'Legacy cart injection scripts; upgrading to native Checkout UI Extensions improves conversion speed.',
  },
};

/**
 * Scan HTML for WordPress plugins, builders, and themes.
 */
export function detectWordPressExtensions(html: string): DetectedExtension[] {
  const extensions: DetectedExtension[] = [];
  const foundSlugs = new Set<string>();

  // Extract from /wp-content/plugins/<slug>/
  const pluginRegex = /\/wp-content\/plugins\/([a-zA-Z0-9_-]+)\//gi;
  let match: RegExpExecArray | null;
  while ((match = pluginRegex.exec(html)) !== null) {
    const slug = match[1].toLowerCase();
    if (!foundSlugs.has(slug)) {
      foundSlugs.add(slug);
      const known = WP_PLUGIN_CATALOG[slug];
      if (known) {
        extensions.push({
          name: known.name,
          slug,
          category: known.category,
          currentStatus: known.currentStatus,
          suggestedAlternative: known.suggestedAlternative,
          description: known.description,
        });
      } else {
        // Generic detected plugin
        const formattedName = slug
          .split(/[-_]/)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(' ');
        extensions.push({
          name: formattedName,
          slug,
          category: 'other',
          currentStatus: 'good',
          description: `Active WordPress plugin detected in DOM: ${slug}`,
        });
      }
    }
  }

  // Detect themes like Elementor, Divi, Kadence, Astra, Blocksy
  const themeRegex = /\/wp-content\/themes\/([a-zA-Z0-9_-]+)\//gi;
  while ((match = themeRegex.exec(html)) !== null) {
    const themeSlug = match[1].toLowerCase();
    const themeKey = `theme-${themeSlug}`;
    if (!foundSlugs.has(themeKey)) {
      foundSlugs.add(themeKey);
      if (themeSlug.includes('divi')) {
        extensions.push({
          name: 'Divi Theme',
          slug: themeSlug,
          category: 'theme',
          currentStatus: 'bloated',
          suggestedAlternative: 'Kadence Theme / Blocksy / Bricks Builder',
          description: 'Heavy theme framework with monolithic stylesheet loading.',
        });
      } else if (themeSlug.includes('astra')) {
        extensions.push({
          name: 'Astra Theme',
          slug: themeSlug,
          category: 'theme',
          currentStatus: 'optimal',
          description: 'Lightweight, high-performance base theme for WordPress.',
        });
      } else if (themeSlug.includes('kadence') || themeSlug.includes('blocksy') || themeSlug.includes('generatepress')) {
        extensions.push({
          name: `${themeSlug.charAt(0).toUpperCase() + themeSlug.slice(1)} Theme`,
          slug: themeSlug,
          category: 'theme',
          currentStatus: 'optimal',
          description: 'Modern, lightweight, performance-tuned WordPress theme.',
        });
      }
    }
  }

  return extensions;
}

/**
 * Scan HTML for Shopify apps and extensions.
 */
export function detectShopifyApps(html: string): DetectedExtension[] {
  const extensions: DetectedExtension[] = [];
  const foundSlugs = new Set<string>();

  const checkApp = (slug: string, testPattern: RegExp | string) => {
    const isMatch = typeof testPattern === 'string' ? html.includes(testPattern) : testPattern.test(html);
    if (isMatch && !foundSlugs.has(slug)) {
      foundSlugs.add(slug);
      const known = SHOPIFY_APP_CATALOG[slug];
      if (known) {
        extensions.push({
          name: known.name,
          slug,
          category: known.category,
          currentStatus: known.currentStatus,
          suggestedAlternative: known.suggestedAlternative,
          description: known.description,
        });
      }
    }
  };

  checkApp('pagefly', /pagefly(?:\.min)?\.js|__pagefly/i);
  checkApp('shogun', /shogun(?:\.min)?\.js|shogun-page/i);
  checkApp('gempages', /gempages|gp-lazyload/i);
  checkApp('loox', /loox\.io|loox-rating/i);
  checkApp('judgeme', /judge\.me|judgeme/i);
  checkApp('yotpo', /yotpo\.com|yotpo-widget/i);
  checkApp('okendo', /okendo\.io|oke-reviews/i);
  checkApp('klaviyo', /klaviyo\.com|static\.klaviyo/i);
  checkApp('privy', /widget\.privy\.com|privy/i);
  checkApp('omnisend', /omnisend\.com|omnisend/i);
  checkApp('reconvert', /reconvert/i);
  checkApp('bold-upsell', /boldcommerce|bold-upsell/i);

  return extensions;
}

/**
 * Identify platform from detected tech items and HTML markers.
 */
function identifyPlatform(items: DetectedTechItem[], html: string): { platform: PlatformType; platformVersion?: string } {
  if (items.some((i) => i.id === 'cms-wordpress')) {
    const wpItem = items.find((i) => i.id === 'cms-wordpress');
    return { platform: 'wordpress', platformVersion: wpItem?.version };
  }
  if (items.some((i) => i.id === 'ecommerce-shopify')) {
    return { platform: 'shopify' };
  }
  if (items.some((i) => i.id === 'cms-wix')) {
    const wixItem = items.find((i) => i.id === 'cms-wix');
    return { platform: 'wix', platformVersion: wixItem?.version };
  }
  if (items.some((i) => i.id === 'cms-webflow')) {
    return { platform: 'webflow' };
  }
  if (items.some((i) => i.id === 'cms-squarespace')) {
    const sqItem = items.find((i) => i.id === 'cms-squarespace');
    return { platform: 'squarespace', platformVersion: sqItem?.version };
  }
  if (items.some((i) => i.id === 'ecommerce-magento')) {
    const magItem = items.find((i) => i.id === 'ecommerce-magento');
    return { platform: 'magento', platformVersion: magItem?.version };
  }
  if (items.some((i) => i.id === 'cms-drupal')) {
    return { platform: 'drupal' };
  }
  if (items.some((i) => i.id === 'cms-joomla')) {
    return { platform: 'joomla' };
  }
  return { platform: 'custom' };
}

/**
 * Perform deterministic tech stack detection from URL HTML payload & HTTP response headers.
 */
export function detectTechStack(
  html: string,
  headers: Record<string, string>,
  targetUrl: string
): DetectedTechStackResult {
  const items: DetectedTechItem[] = [];

  for (const sig of TECH_SIGNATURES) {
    let result: MatchResult = { match: false };

    if (sig.headerMatch) {
      result = sig.headerMatch(headers);
    }
    if (!result.match && sig.htmlMatch) {
      result = sig.htmlMatch(html);
    }

    if (result.match) {
      const status = result.statusOverride || sig.defaultStatus;
      let detectedVia = 'HTML signature inspection';
      if (sig.headerMatch && sig.headerMatch(headers).match) {
        detectedVia = 'HTTP Response Headers';
      }

      items.push({
        id: sig.id,
        name: sig.name,
        category: sig.category,
        status,
        version: result.version,
        detectedVia,
        modernReplacement: sig.modernReplacement,
        description: sig.description,
      });
    }
  }

  const { platform, platformVersion } = identifyPlatform(items, html);

  // Extract ecosystem extensions
  let detectedExtensions: DetectedExtension[] = [];
  if (platform === 'wordpress') {
    detectedExtensions = detectWordPressExtensions(html);
  } else if (platform === 'shopify') {
    detectedExtensions = detectShopifyApps(html);
  }

  // Calculate Tech Debt Score (0–100)
  let techDebtPoints = 0;
  let hasEolOrDeprecated = false;

  for (const item of items) {
    if (item.status === 'end-of-life') {
      techDebtPoints += 35;
      hasEolOrDeprecated = true;
    } else if (item.status === 'deprecated') {
      techDebtPoints += 20;
      hasEolOrDeprecated = true;
    } else if (item.status === 'legacy') {
      // For WordPress / Wix / Squarespace / Magento, legacy adds modest baseline debt that is tuneable
      techDebtPoints += 15;
    }
  }

  // Factor in detected extension bloat
  const bloatedExtCount = detectedExtensions.filter((e) => e.currentStatus === 'bloated').length;
  techDebtPoints += bloatedExtCount * 10;

  const techDebtScore = Math.min(100, techDebtPoints);

  let summary = 'Tech stack uses modern web standards with minimal technical debt.';
  if (platform === 'wordpress') {
    summary = `WordPress ecosystem detected (${detectedExtensions.length} plugins/themes identified). Optimizing caching, builders, and edge delivery will unlock sub-second load times.`;
  } else if (platform === 'shopify') {
    summary = `Shopify e-commerce storefront detected (${detectedExtensions.length} apps/integrations identified). Streamlining third-party scripts and OS 2.0 app blocks will maximize conversions.`;
  } else if (platform === 'wix') {
    summary = `Wix website detected. Upgrading legacy layout rendering to Wix Studio or Webflow will dramatically reduce mobile blocking time.`;
  } else if (platform === 'webflow') {
    summary = `Webflow website detected with semantic HTML structure. Edge caching and interaction tuning will optimize performance.`;
  } else if (platform === 'squarespace') {
    summary = `Squarespace website detected. Upgrading to 7.1 Fluid Engine or Webflow will enhance responsiveness.`;
  } else if (platform === 'magento') {
    summary = `Magento / Adobe Commerce platform detected. Modernizing frontend with Hyvä Themes eliminates heavy Knockout.js bloat.`;
  } else if (techDebtScore >= 70) {
    summary = 'Critical technical debt detected. Core framework components are End-of-Life and pose security & performance risks.';
  } else if (techDebtScore >= 40) {
    summary = 'Moderate technical debt detected. Outdated frontend libraries and legacy server configurations are slowing down user experience.';
  }

  return {
    items,
    platform,
    platformVersion,
    detectedExtensions,
    techDebtScore,
    hasEolOrDeprecated,
    summary,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform-Specific Modernization Checklist Generators
// ─────────────────────────────────────────────────────────────────────────────

function generateWordPressChecklist(
  techStack: DetectedTechStackResult,
  rawMetrics: AuditRawResults
): { checklist: ModernizationChecklistItem[]; targetStack: string; summary: string } {
  const checklist: ModernizationChecklistItem[] = [];
  const extensions = techStack.detectedExtensions;
  const hasCloudflare = techStack.items.some((i) => i.id === 'backend-cloudflare-edge');

  // 1. Cloudflare APO / Super Page Cache Integration
  if (!hasCloudflare || rawMetrics.pagespeed.ttfb > 500) {
    checklist.push({
      id: 'wp-mod-cloudflare-apo',
      title: 'Integrate Cloudflare Automatic Platform Optimization (APO) for WordPress',
      category: 'Architecture & Serverless',
      priority: 'critical',
      currentTech: 'Direct Origin Server / Uncached Dynamic PHP Requests',
      targetTech: 'Cloudflare APO + Super Page Cache (Global Edge HTML Caching)',
      whyModernize: 'Cloudflare APO caches dynamic WordPress pages at 300+ global edge locations, serving sub-50ms HTML directly without querying MySQL or executing PHP on repeat visits.',
      businessImpact: 'Slashes server response time (TTFB) by up to 300%, eliminates downtime during traffic spikes, and protects database from overload.',
      estimatedMinutes: 90,
      price: 290,
    });
  }

  // 2. High-Performance Caching & Redis Object Cache
  const hasModernWpCache = extensions.some((e) => e.slug === 'wp-rocket' || e.slug === 'litespeed-cache' || e.slug === 'flying-press');
  if (!hasModernWpCache || rawMetrics.pagespeed.tbt > 300) {
    checklist.push({
      id: 'wp-mod-caching-stack',
      title: 'Deploy High-Performance Caching & Redis Object Cache',
      category: 'Performance & Frontend',
      priority: 'critical',
      currentTech: 'Default WordPress Cache / Unoptimized Transients',
      targetTech: 'FlyingPress / WP Rocket + Redis In-Memory Object Cache',
      whyModernize: 'Redis stores complex SQL query results in RAM, while modern cache plugins automatically delay non-critical JavaScript execution until user interaction.',
      businessImpact: 'Eliminates frozen screens on mobile devices (TBT), accelerating checkout and form submission speeds.',
      estimatedMinutes: 120,
      price: 340,
    });
  }

  // 3. Page Builder & Asset Script Pruning
  const bloatedBuilders = extensions.filter((e) => e.category === 'page_builder' && e.currentStatus === 'bloated');
  if (bloatedBuilders.length > 0 || rawMetrics.pagespeed.hasRenderBlockingJs) {
    const builderNames = bloatedBuilders.map((b) => b.name).join(', ') || 'Heavy Visual Builder';
    checklist.push({
      id: 'wp-mod-builder-prune',
      title: `Optimize ${builderNames} & Prune Render-Blocking Assets`,
      category: 'Performance & Frontend',
      priority: 'recommended',
      currentTech: `${builderNames} Global Scripts & Deep DOM Nesting`,
      targetTech: 'Perfmatters Script Manager + Kadence/Blocksy Native Blocks',
      whyModernize: 'Legacy visual builders load heavy CSS/JS bundles across all pages. Script managers conditionally dequeue unused assets on pages where they are not required.',
      businessImpact: 'Reduces page payload by up to 60%, drastically improving Google Core Web Vitals (LCP & INP).',
      estimatedMinutes: 180,
      price: 490,
    });
  }

  // 4. Next-Gen Image Delivery (WebP/AVIF)
  if (rawMetrics.pagespeed.hasUnoptimizedImages) {
    checklist.push({
      id: 'wp-mod-image-pipeline',
      title: 'Automate Next-Gen WebP/AVIF Media Conversion',
      category: 'Performance & Frontend',
      priority: 'recommended',
      currentTech: 'Uncompressed JPEG/PNG Media Uploads',
      targetTech: 'Converter for Media / ShortPixel + Cloudflare Polish',
      whyModernize: 'Serving AVIF/WebP formats compresses image file sizes by up to 80% without visible quality loss, generating responsive srcset markup automatically.',
      businessImpact: 'Delivers instant mobile image loading on 4G/5G mobile connections and saves bandwidth costs.',
      estimatedMinutes: 60,
      price: 190,
    });
  }

  // 5. Upgrade Legacy SEO & Form Plugins
  const legacySeoOrForms = extensions.filter(
    (e) => (e.category === 'seo' || e.category === 'forms') && e.currentStatus === 'bloated'
  );
  for (const item of legacySeoOrForms) {
    checklist.push({
      id: `wp-mod-ext-${item.slug}`,
      title: `Replace Bloated Plugin: ${item.name}`,
      category: 'Performance & Frontend',
      priority: 'recommended',
      currentTech: item.name,
      targetTech: item.suggestedAlternative || 'Lightweight Alternative (Rank Math / Fluent Forms)',
      whyModernize: item.description || 'Legacy plugins load heavy global scripts on all URLs regardless of need.',
      businessImpact: 'Removes unnecessary admin and frontend database overhead, speeding up site maintenance.',
      estimatedMinutes: 60,
      price: 190,
    });
  }

  // 6. Enterprise Security Hardening (WAF & XML-RPC)
  if (!rawMetrics.security.hasCsp || !rawMetrics.security.hasHsts) {
    checklist.push({
      id: 'wp-mod-security-hardening',
      title: 'Harden WordPress Security & Cloudflare WAF Rules',
      category: 'Security & EOL',
      priority: 'critical',
      currentTech: 'Exposed XML-RPC & Missing HTTP Security Headers',
      targetTech: 'Cloudflare Managed WAF + Strict CSP/HSTS + XML-RPC Block',
      whyModernize: 'Automated brute-force bots target WordPress login and XML-RPC endpoints. Cloudflare WAF stops attacks at the edge before hitting origin PHP.',
      businessImpact: 'Stops 99.9% of automated bot attacks, prevents database hijacking, and safeguards customer data.',
      estimatedMinutes: 60,
      price: 240,
    });
  }

  const targetStack = 'WordPress 6.x Performance Architecture + Cloudflare APO & Edge Caching + Redis Object Cache + Lightweight Plugins';
  const summary = 'Tailored WordPress optimization plan designed to eliminate plugin bloat, implement edge caching, and achieve 90+ PageSpeed scores.';

  return { checklist, targetStack, summary };
}

function generateShopifyChecklist(
  techStack: DetectedTechStackResult,
  rawMetrics: AuditRawResults
): { checklist: ModernizationChecklistItem[]; targetStack: string; summary: string } {
  const checklist: ModernizationChecklistItem[] = [];
  const apps = techStack.detectedExtensions;

  // 1. Online Store 2.0 Theme Architecture
  checklist.push({
    id: 'shopify-mod-os2',
    title: 'Migrate to Shopify Online Store 2.0 (Dawn-Based Architecture)',
    category: 'Performance & Frontend',
    priority: 'critical',
    currentTech: 'Legacy Liquid Theme / Cluttered `content_for_header` Scripts',
    targetTech: 'Online Store 2.0 Theme Architecture + Native App Blocks',
    whyModernize: 'Online Store 2.0 replaces hardcoded script tag injections with Theme App Extensions and modular JSON templates that load cleanly.',
    businessImpact: 'Improves mobile conversion rates by eliminating layout shifts and accelerating product page rendering.',
    estimatedMinutes: 240,
    price: 690,
  });

  // 2. Third-Party App & Builder Script Audit
  const bloatedApps = apps.filter((a) => a.currentStatus === 'bloated' || a.category === 'page_builder');
  if (bloatedApps.length > 0 || rawMetrics.pagespeed.tbt > 250) {
    const appList = bloatedApps.map((a) => a.name).join(', ') || 'Third-Party App Scripts';
    checklist.push({
      id: 'shopify-mod-app-pruning',
      title: `Consolidate App Bloat & Replace ${appList} with Native Liquid`,
      category: 'Performance & Frontend',
      priority: 'recommended',
      currentTech: `${appList} (Heavy Client-Side JavaScript Injections)`,
      targetTech: 'Shopify Native Liquid Sections & Metafields (Zero-JS Rendering)',
      whyModernize: 'Third-party page builder apps inject bulky JavaScript bundles that block the browser main thread and cause delayed click response on mobile.',
      businessImpact: 'Unlocks snappy product interactions and prevents abandoned carts caused by sluggish checkout buttons.',
      estimatedMinutes: 180,
      price: 490,
    });
  }

  // 3. Edge Tag Management via Cloudflare Zaraz
  checklist.push({
    id: 'shopify-mod-zaraz-tagging',
    title: 'Offload Marketing & Tracking Pixels via Cloudflare Zaraz',
    category: 'Architecture & Serverless',
    priority: 'recommended',
    currentTech: 'Client-Side Pixels (Meta, TikTok, Google Analytics, Klaviyo)',
    targetTech: 'Cloudflare Zaraz Server-Side Edge Tag Management',
    whyModernize: 'Cloudflare Zaraz runs third-party analytics and marketing tools in edge workers instead of the visitor\'s browser, freeing up mobile CPU.',
    businessImpact: 'Boosts mobile Core Web Vitals (TBT/INP) by up to 50% while preserving 100% accurate conversion tracking.',
    estimatedMinutes: 120,
    price: 390,
  });

  // 4. Review Widget & Social Proof Optimization
  const heavyReviews = apps.filter((a) => a.category === 'reviews' && a.currentStatus !== 'optimal');
  if (heavyReviews.length > 0) {
    const reviewAppName = heavyReviews[0].name;
    checklist.push({
      id: 'shopify-mod-reviews',
      title: `Streamline Review Widget: Migrate ${reviewAppName} to High-Speed Alternative`,
      category: 'Performance & Frontend',
      priority: 'recommended',
      currentTech: reviewAppName,
      targetTech: 'Judge.me (Ultra-Lightweight) or Shopify Native Product Reviews',
      whyModernize: 'Legacy review widgets load megabytes of uncompressed assets. Modern alternatives load asynchronously without delaying LCP.',
      businessImpact: 'Builds customer trust with instant star rating displays on mobile product catalogs.',
      estimatedMinutes: 60,
      price: 190,
    });
  }

  // 5. Shopify Responsive Image & Media Pipeline
  if (rawMetrics.pagespeed.hasUnoptimizedImages) {
    checklist.push({
      id: 'shopify-mod-images',
      title: 'Implement Modern Shopify Liquid `image_url` Responsive Pipeline',
      category: 'Performance & Frontend',
      priority: 'recommended',
      currentTech: 'Fixed-Dimension Product Images & JS Resizers',
      targetTech: 'Native Liquid `image_url` with Dynamic `srcset` & WebP/AVIF',
      whyModernize: 'Shopify\'s global CDN automatically converts images to WebP/AVIF when queried with proper density filters and responsive srcset.',
      businessImpact: 'Reduces image download payload on mobile by up to 70%, boosting catalog browsing speed.',
      estimatedMinutes: 90,
      price: 240,
    });
  }

  const targetStack = 'Shopify Online Store 2.0 (Dawn Architecture) + Native App Blocks + Cloudflare Zaraz Edge Tagging';
  const summary = 'Actionable Shopify storefront optimization plan designed to prune third-party script bloat, modernize theme templates, and boost mobile conversions.';

  return { checklist, targetStack, summary };
}

function generateWixChecklist(
  techStack: DetectedTechStackResult,
  rawMetrics: AuditRawResults
): { checklist: ModernizationChecklistItem[]; targetStack: string; summary: string } {
  const checklist: ModernizationChecklistItem[] = [];
  const isStudio = techStack.platformVersion === 'Studio';

  if (!isStudio) {
    checklist.push({
      id: 'wix-mod-studio-upgrade',
      title: 'Upgrade Legacy Wix Site to Wix Studio or Webflow',
      category: 'Performance & Frontend',
      priority: 'critical',
      currentTech: 'Legacy Wix Classic Editor (Client-Side Rendering Bundle)',
      targetTech: 'Wix Studio (Responsive CSS Engine) or Webflow Visual CMS',
      whyModernize: 'Legacy Wix editors output complex absolute-positioned DOM elements and heavy JavaScript runtimes that score poorly on mobile Core Web Vitals.',
      businessImpact: 'Achieve responsive multi-breakpoint layouts, clean CSS rendering, and significantly faster initial page loads.',
      estimatedMinutes: 240,
      price: 590,
    });
  }

  checklist.push({
    id: 'wix-mod-turbo-assets',
    title: 'Optimize Wix Turbo Caching & Custom Font Payloads',
    category: 'Performance & Frontend',
    priority: 'recommended',
    currentTech: 'Uncached External Fonts & Widget Iframes',
    targetTech: 'Native Wix WebP Assets + Self-Hosted Typography',
    whyModernize: 'Consolidating third-party app iframes and optimizing custom fonts speeds up initial mobile layout rendering.',
    businessImpact: 'Reduces layout shifting (CLS) and ensures instant text display on smartphones.',
    estimatedMinutes: 90,
    price: 240,
  });

  const targetStack = isStudio ? 'Wix Studio (Responsive CSS Grid Architecture)' : 'Wix Studio or Webflow + Cloudflare Edge DNS';
  const summary = 'Modernization plan focused on upgrading legacy Wix rendering to modern responsive layouts and eliminating mobile blocking scripts.';

  return { checklist, targetStack, summary };
}

function generateWebflowChecklist(
  techStack: DetectedTechStackResult,
  rawMetrics: AuditRawResults
): { checklist: ModernizationChecklistItem[]; targetStack: string; summary: string } {
  const checklist: ModernizationChecklistItem[] = [];

  checklist.push({
    id: 'webflow-mod-edge-proxy',
    title: 'Deploy Cloudflare Global Reverse-Proxy Edge Cache for Webflow',
    category: 'Architecture & Serverless',
    priority: 'recommended',
    currentTech: 'Standard Webflow Hosting Origin',
    targetTech: 'Cloudflare Edge Worker Reverse-Proxy (Full Page Edge Caching)',
    whyModernize: 'A Cloudflare Worker reverse proxy caches Webflow HTML pages globally across 300+ PoPs, dropping TTFB to under 50ms worldwide.',
    businessImpact: 'Guarantees instantaneous global page loading and handles massive viral traffic surges seamlessly.',
    estimatedMinutes: 90,
    price: 290,
  });

  if (rawMetrics.pagespeed.tbt > 200 || rawMetrics.pagespeed.hasRenderBlockingJs) {
    checklist.push({
      id: 'webflow-mod-interactions',
      title: 'Optimize Webflow Interactions & Custom Embed Scripts',
      category: 'Performance & Frontend',
      priority: 'recommended',
      currentTech: 'Heavy JavaScript-Driven Scroll & Hover Animations',
      targetTech: 'Modern CSS Keyframe Transitions + Lenis Smooth Scrolling',
      whyModernize: 'Complex Webflow interactions run continuous event listeners that consume mobile CPU cycles. Replacing them with modern CSS creates smoother 60fps animations.',
      businessImpact: 'Eliminates stuttering and input lag on mobile devices (improving Google INP metric).',
      estimatedMinutes: 120,
      price: 340,
    });
  }

  if (rawMetrics.pagespeed.hasUnoptimizedImages) {
    checklist.push({
      id: 'webflow-mod-responsive-images',
      title: 'Audit Webflow CMS Image Formats & Responsive Breakpoints',
      category: 'Performance & Frontend',
      priority: 'recommended',
      currentTech: 'Uncompressed CMS Image Assets',
      targetTech: 'Webflow Responsive WebP Asset Pipeline',
      whyModernize: 'Ensuring all CMS images have WebP variants and responsive breakpoints configured minimizes mobile data payloads.',
      businessImpact: 'Speeds up image gallery and blog loading on mobile networks.',
      estimatedMinutes: 60,
      price: 190,
    });
  }

  const targetStack = 'Webflow + Cloudflare Global Reverse-Proxy Edge Caching + Modern CSS Animations';
  const summary = 'Webflow-specific performance plan designed to cache HTML at the edge and streamline interaction animations.';

  return { checklist, targetStack, summary };
}

function generateSquarespaceChecklist(
  techStack: DetectedTechStackResult,
  rawMetrics: AuditRawResults
): { checklist: ModernizationChecklistItem[]; targetStack: string; summary: string } {
  const checklist: ModernizationChecklistItem[] = [];
  const is71 = techStack.platformVersion?.includes('7.1');

  if (!is71) {
    checklist.push({
      id: 'squarespace-mod-71-upgrade',
      title: 'Upgrade from Squarespace 7.0 to 7.1 Fluid Engine',
      category: 'Performance & Frontend',
      priority: 'critical',
      currentTech: 'Squarespace 7.0 (Legacy Layout Engine)',
      targetTech: 'Squarespace 7.1 Fluid Engine or Webflow',
      whyModernize: 'Squarespace 7.1 Fluid Engine utilizes modern CSS Grid, removing legacy block-wrapper layout reflow delays on mobile.',
      businessImpact: 'Unlocks flexible mobile styling, faster rendering, and modern e-commerce capabilities.',
      estimatedMinutes: 180,
      price: 490,
    });
  }

  checklist.push({
    id: 'squarespace-mod-asset-clean',
    title: 'Audit Custom Code Injections & Third-Party Embeds',
    category: 'Performance & Frontend',
    priority: 'recommended',
    currentTech: 'Header/Footer Custom Script Embeds',
    targetTech: 'Optimized Asynchronous Embeds & Clean Font Loading',
    whyModernize: 'Heavy analytics or chat widgets in Squarespace code injection blocks delay first content paint.',
    businessImpact: 'Accelerates visual rendering and improves mobile Core Web Vitals.',
    estimatedMinutes: 60,
    price: 190,
  });

  const targetStack = is71 ? 'Squarespace 7.1 Fluid Engine + Cleaned Asset Pipeline' : 'Squarespace 7.1 Fluid Engine or Webflow / Shopify';
  const summary = 'Squarespace modernization plan aimed at upgrading legacy layout engines and pruning code injections.';

  return { checklist, targetStack, summary };
}

function generateMagentoChecklist(
  techStack: DetectedTechStackResult,
  rawMetrics: AuditRawResults
): { checklist: ModernizationChecklistItem[]; targetStack: string; summary: string } {
  const checklist: ModernizationChecklistItem[] = [];
  const isHyva = techStack.platformVersion?.includes('Hyvä');

  if (!isHyva) {
    checklist.push({
      id: 'magento-mod-hyva',
      title: 'Modernize Magento Frontend with Hyvä Themes (Tailwind + Alpine.js)',
      category: 'Performance & Frontend',
      priority: 'critical',
      currentTech: 'Magento 2 Luma Monolith (RequireJS, Knockout.js & jQuery)',
      targetTech: 'Hyvä Themes Frontend (Tailwind CSS + Alpine.js)',
      whyModernize: 'Default Magento Luma loads over 200 JS requests on initial load. Hyvä replaces the entire frontend stack with lightweight Tailwind + Alpine.js, boosting mobile PageSpeed from <40 to 95+.',
      businessImpact: 'Massively lifts mobile conversion rates, slashes bounce rate, and reduces developer maintenance costs.',
      estimatedMinutes: 360,
      price: 1200,
    });
  }

  checklist.push({
    id: 'magento-mod-edge-cache',
    title: 'Implement Varnish + Cloudflare Edge Full Page Caching',
    category: 'Architecture & Serverless',
    priority: 'critical',
    currentTech: 'Origin PHP Cache Processing',
    targetTech: 'Varnish Cache + Cloudflare Enterprise Full Page Edge Delivery',
    whyModernize: 'Delivering cached category and product pages from memory and edge PoPs drops TTFB from 1000ms+ to under 50ms.',
    businessImpact: 'Handles massive Black Friday / holiday traffic spikes effortlessly without server crashes.',
    estimatedMinutes: 180,
    price: 490,
  });

  const targetStack = 'Magento 2 + Hyvä Themes Frontend + Varnish / Cloudflare Global Edge Cache';
  const summary = 'Enterprise Magento modernization plan replacing legacy RequireJS with Hyvä Themes for sub-second speeds.';

  return { checklist, targetStack, summary };
}

function generateGenericChecklist(
  techStack: DetectedTechStackResult,
  rawMetrics: AuditRawResults
): { checklist: ModernizationChecklistItem[]; targetStack: string; summary: string } {
  const checklist: ModernizationChecklistItem[] = [];

  const hasModernEdge = techStack.items.some((i) => i.id === 'backend-cloudflare-edge');
  const hasTailwind = techStack.items.some((i) => i.id === 'css-tailwind-modern');
  const hasAstro = techStack.items.some((i) => i.id === 'js-astro-modern');

  // 1. Security & EOL Priorities
  const eolItems = techStack.items.filter((i) => i.status === 'end-of-life' || i.status === 'deprecated');
  for (const item of eolItems) {
    checklist.push({
      id: `mod-eol-${item.id}`,
      title: `Replace EOL/Deprecated Component: ${item.name}`,
      category: 'Security & EOL',
      priority: 'critical',
      currentTech: `${item.name}${item.version ? ` (${item.version})` : ''}`,
      targetTech: item.modernReplacement || 'Modern Web Standard / Astro',
      whyModernize: 'End-of-Life software no longer receives security updates, leaving your application vulnerable to cyber attacks and severe performance degradation.',
      businessImpact: 'Eliminate critical security vulnerabilities, avoid server crash risks, and protect customer data integrity.',
      estimatedMinutes: 240,
      price: 490,
    });
  }

  // Missing security headers
  if ((!rawMetrics.security.hasCsp || !rawMetrics.security.hasHsts) && (techStack.techDebtScore > 0 || !rawMetrics.security.isHttps)) {
    checklist.push({
      id: 'mod-sec-headers',
      title: 'Upgrade Enterprise Security Header Architecture',
      category: 'Security & EOL',
      priority: 'critical',
      currentTech: 'Missing CSP / HSTS Protection',
      targetTech: 'Strict Content-Security-Policy & HSTS via Cloudflare Workers',
      whyModernize: 'Modern browsers block unsafe script execution and enforce encrypted connections through declarative headers.',
      businessImpact: 'Prevents cross-site scripting (XSS), session hijacking, and domain spoofing attacks.',
      estimatedMinutes: 60,
      price: 190,
    });
  }

  // 2. Performance & Frontend Priorities
  const hasLegacyJs = techStack.items.some((i) => i.id === 'js-jquery' || i.id === 'js-angularjs-1x' || i.id === 'js-prototype-mootools');
  if (hasLegacyJs || (!hasAstro && rawMetrics.pagespeed.tbt > 400)) {
    checklist.push({
      id: 'mod-frontend-islands',
      title: 'Migrate Frontend to Astro Zero-JS Islands Architecture',
      category: 'Performance & Frontend',
      priority: 'recommended',
      currentTech: hasLegacyJs ? 'Heavy Legacy JS Bundles (jQuery/Angular 1.x)' : 'Render-blocking Monolithic JS',
      targetTech: 'Astro 4+ Island Architecture (Zero JS by default)',
      whyModernize: 'Shipping zero JavaScript by default reduces mobile CPU hydration time to near zero, unlocking instantaneous interactions.',
      businessImpact: 'Massively improves Google Core Web Vitals (INP/TBT), reduces mobile bounce rates by up to 40%.',
      estimatedMinutes: 300,
      price: 690,
    });
  }

  // CSS & Image Asset Pipeline
  const hasLegacyCss = techStack.items.some((i) => i.id === 'css-bootstrap-legacy');
  if (hasLegacyCss || (!hasTailwind && rawMetrics.pagespeed.hasUnoptimizedImages && techStack.techDebtScore > 0)) {
    checklist.push({
      id: 'mod-css-assets',
      title: 'Modernize UI Styling & Asset Delivery Pipeline',
      category: 'Performance & Frontend',
      priority: 'recommended',
      currentTech: hasLegacyCss ? 'Bootstrap 3/4 CSS Monolith' : 'Uncompressed Image Pipeline',
      targetTech: 'Tailwind CSS + Next-Gen WebP/AVIF Image Pipeline',
      whyModernize: 'Utility CSS purges unused styles while AVIF images compress image sizes by up to 80% without quality loss.',
      businessImpact: 'Decreases page payload from megabytes to kilobytes for ultra-fast mobile loading on 4G/5G.',
      estimatedMinutes: 180,
      price: 390,
    });
  }

  // 3. Architecture & Serverless Priorities
  const hasMonolithServer = techStack.items.some((i) => i.id === 'backend-php-legacy' || i.id === 'backend-iis-legacy');
  if (hasMonolithServer || (!hasModernEdge && rawMetrics.pagespeed.ttfb > 600)) {
    checklist.push({
      id: 'mod-edge-architecture',
      title: 'Transition from Monolithic Hosting to Cloudflare Global Edge',
      category: 'Architecture & Serverless',
      priority: 'recommended',
      currentTech: 'Legacy Origin Server / cPanel Monolith',
      targetTech: 'Cloudflare Workers / Pages Global Edge Network',
      whyModernize: 'Edge serverless runs code in 300+ cities worldwide, eliminating server response latency (TTFB) and origin downtime.',
      businessImpact: 'Guarantees 99.99% uptime, handles viral traffic spikes effortlessly, and slashes hosting bills.',
      estimatedMinutes: 360,
      price: 790,
    });
  }

  // 4. AI & PWA Readiness
  if (techStack.techDebtScore > 0 && (!rawMetrics.standards.hasLlmsTxt || !rawMetrics.seo.hasSchemaOrg)) {
    checklist.push({
      id: 'mod-ai-readiness',
      title: 'Implement AI Agent Readiness (`llms.txt` & JSON-LD)',
      category: 'AI & PWA Readiness',
      priority: 'future_proofing',
      currentTech: 'Unstructured HTML for Web Crawlers',
      targetTech: 'Structured JSON-LD + `/llms.txt` Agent Schema',
      whyModernize: 'AI search engines (ChatGPT, Perplexity, Gemini, Claude) consume clean markdown and structured data to cite businesses directly.',
      businessImpact: 'Ensures your business ranks top in AI-driven search engines and voice assistants.',
      estimatedMinutes: 90,
      price: 240,
    });
  }

  let targetStack = 'Astro 4+ Edge Architecture + Cloudflare Workers + Tailwind CSS + WebP/AVIF';
  if (techStack.techDebtScore === 0 && checklist.length === 0) {
    targetStack = 'Current Stack Matches Modern Web Standards! (Zero Tech Debt Detected)';
  }
  const summary = 'Modern web architecture plan delivering sub-second speed, zero JS runtime overhead, and global edge serverless deployment.';

  return { checklist, targetStack, summary };
}

/**
 * Generate a structured, prioritized Modernisation Checklist based on tech stack and audit diagnostics.
 */
export function generateModernizationChecklist(
  techStack: DetectedTechStackResult,
  rawMetrics: AuditRawResults
): ModernizationReport {
  let checklist: ModernizationChecklistItem[] = [];
  let targetStackRecommendation = '';
  let platformSummary = '';

  if (techStack.platform === 'wordpress') {
    const res = generateWordPressChecklist(techStack, rawMetrics);
    checklist = res.checklist;
    targetStackRecommendation = res.targetStack;
    platformSummary = res.summary;
  } else if (techStack.platform === 'shopify') {
    const res = generateShopifyChecklist(techStack, rawMetrics);
    checklist = res.checklist;
    targetStackRecommendation = res.targetStack;
    platformSummary = res.summary;
  } else if (techStack.platform === 'wix') {
    const res = generateWixChecklist(techStack, rawMetrics);
    checklist = res.checklist;
    targetStackRecommendation = res.targetStack;
    platformSummary = res.summary;
  } else if (techStack.platform === 'webflow') {
    const res = generateWebflowChecklist(techStack, rawMetrics);
    checklist = res.checklist;
    targetStackRecommendation = res.targetStack;
    platformSummary = res.summary;
  } else if (techStack.platform === 'squarespace') {
    const res = generateSquarespaceChecklist(techStack, rawMetrics);
    checklist = res.checklist;
    targetStackRecommendation = res.targetStack;
    platformSummary = res.summary;
  } else if (techStack.platform === 'magento') {
    const res = generateMagentoChecklist(techStack, rawMetrics);
    checklist = res.checklist;
    targetStackRecommendation = res.targetStack;
    platformSummary = res.summary;
  } else {
    const res = generateGenericChecklist(techStack, rawMetrics);
    checklist = res.checklist;
    targetStackRecommendation = res.targetStack;
    platformSummary = res.summary;
  }

  // Determine overall debt level
  let overallDebtLevel: 'Low' | 'Moderate' | 'High' | 'Critical' = 'Low';
  if (techStack.techDebtScore >= 70) overallDebtLevel = 'Critical';
  else if (techStack.techDebtScore >= 40) overallDebtLevel = 'High';
  else if (techStack.techDebtScore >= 20) overallDebtLevel = 'Moderate';

  return {
    techStack,
    checklist,
    overallDebtLevel,
    targetStackRecommendation,
    platformContext: techStack.platform,
    platformSummary,
    distributedWeb: rawMetrics.distributed,
  };
}

