/**
 * Unit tests for Universal Commerce Protocol (UCP) & E-Commerce Storefront Detection
 */
import { PRICING_TABLE } from '../src/lib/pricing.ts';
import { generateModernizationChecklist, detectTechStack, detectEcommerceStore } from '../src/lib/techstack-engine.ts';

async function runTests() {
  console.log('--- Starting Universal Commerce Protocol (UCP) & E-Commerce Unit Tests ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. E-Commerce Store Detection Tests
  console.log('\n--- Test Suite 1: E-Commerce Storefront Detection ---');

  const shopifyHtml = `
    <!doctype html>
    <html>
    <head><script src="https://cdn.shopify.com/s/files/1/00/theme.js"></script></head>
    <body>
      <div id="shopify-section-header"></div>
      <button class="shopify-payment-button">Buy Now</button>
    </body>
    </html>
  `;
  assert(detectEcommerceStore(shopifyHtml, 'https://store.example.com') === true, 'Detects Shopify storefront as e-commerce');

  const wooHtml = `
    <!doctype html>
    <html>
    <head></head>
    <body class="woocommerce woocommerce-page">
      <form class="cart" action="/product/shoes" method="post">
        <button type="submit" name="add-to-cart" value="123" class="single_add_to_cart_button button">Add to cart</button>
      </form>
    </body>
    </html>
  `;
  assert(detectEcommerceStore(wooHtml, 'https://wp-store.example.com') === true, 'Detects WooCommerce storefront as e-commerce');

  const magentoHtml = `
    <!doctype html>
    <html>
    <head><script src="/static/frontend/Magento/luma/en_US/requirejs/require.js"></script></head>
    <body>
      <div data-mage-init='{"cart": {}}'>Shopping Cart</div>
    </body>
    </html>
  `;
  assert(detectEcommerceStore(magentoHtml, 'https://magento-store.example.com') === true, 'Detects Magento storefront as e-commerce');

  const schemaProductHtml = `
    <!doctype html>
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "Wireless Headphones",
        "offers": {
          "@type": "Offer",
          "price": "99.00",
          "priceCurrency": "USD"
        }
      }
      </script>
    </head>
    <body><h1>Product Page</h1></body>
    </html>
  `;
  assert(detectEcommerceStore(schemaProductHtml, 'https://gadgets.example.com') === true, 'Detects Schema.org Product/Offer JSON-LD as e-commerce');

  const cartButtonHtml = `
    <!doctype html>
    <html>
    <body>
      <button class="add-to-cart" data-item-id="sku-101" data-item-price="29.99">Add to Basket</button>
    </body>
    </html>
  `;
  assert(detectEcommerceStore(cartButtonHtml, 'https://custom-shop.example.com') === true, 'Detects custom add-to-cart button and price markers');

  const blogHtml = `
    <!doctype html>
    <html>
    <head><title>Engineering Blog - Workouse</title></head>
    <body>
      <header><nav><a href="/">Home</a><a href="/blog">Blog</a></nav></header>
      <main>
        <article>
          <h1>Building Edge Workers with Astro</h1>
          <p>This is a technical article about web performance and Cloudflare edge architecture.</p>
        </article>
      </main>
      <footer><p>© 2026 Workouse. All rights reserved.</p></footer>
    </body>
    </html>
  `;
  assert(detectEcommerceStore(blogHtml, 'https://workouse.com/blog/article') === false, 'Detects standard blog / non-commerce site as non-e-commerce');

  // 2. PRICING TABLE & Pricing Entry Tests
  console.log('\n--- Test Suite 2: PRICING_TABLE Configuration ---');
  const ucpPricing = PRICING_TABLE['missing-ucp'];
  assert(ucpPricing !== undefined, 'PRICING_TABLE contains missing-ucp entry');
  assert(ucpPricing?.category === 'Standards', 'missing-ucp is categorized under Standards');
  assert(ucpPricing?.severity === 'warning', 'missing-ucp has warning severity');
  assert(ucpPricing?.estimatedMinutes === 45, 'missing-ucp has 45 minutes estimation');
  assert(ucpPricing?.price === 27, 'missing-ucp price computed correctly at $35/hr rate');

  // 3. Modernization Checklist Generator Tests
  console.log('\n--- Test Suite 3: Modernization Checklist UCP Recommendations ---');
  const dummyRawMetricsCommerce: any = {
    pagespeed: { score: 70, lcp: 2200, cls: 0.05, tbt: 100, ttfb: 400, speedIndex: 2000, hasUnoptimizedImages: false, hasRenderBlockingJs: false },
    security: { isHttps: true, hasHsts: true, hasCsp: true, hasXFrameOptions: true, hasReferrerPolicy: true, hasNosniff: true, hasPermissionsPolicy: true, rawHeaders: {} },
    seo: { hasTitle: true, titleText: 'Shop', titleLength: 10, hasMetaDescription: true, metaDescriptionText: 'Shop now', metaDescriptionLength: 60, hasH1: true, h1Count: 1, hasCanonical: true, canonicalUrl: 'https://shop.com', hasOgTags: true, hasOgImage: true, hasTwitterCards: true, hasSchemaOrg: true, schemaTypes: ['Product'], hasRobotsTxt: true, hasSitemapXml: true, imagesWithoutAltCount: 0, totalImagesCount: 2, hasPoorAltText: false, poorAltTextCount: 0, hasCharsetMeta: true, hasLangAttribute: true, hasSkippedHeadings: false, headingSkippedLevels: [], emptyHeadingsCount: 0, hasSemanticLandmarks: true, semanticLandmarks: { hasHeader: true, hasNav: true, hasMain: true, hasFooter: true, hasSectionOrArticle: true }, urlQuality: { isTooLong: false, hasUnderscores: false, hasUppercase: false, length: 20, path: '' }, hasHreflang: false, hreflangLocales: [], isNoindex: false },
    standards: { hasDoctype: true, hasLangAttribute: true, langValue: 'en', hasViewportMeta: true, hasFavicon: true, hasLlmsTxt: true, hasSecurityTxt: true, hasSitemapXml: true },
    techstack: { items: [], platform: 'wordpress', detectedExtensions: [], techDebtScore: 20, hasEolOrDeprecated: false, summary: '' },
    observatory: { score: 80, grade: 'A', state: 'SUCCESS', testsPassed: 8, testsFailed: 0, testsQuantity: 8 },
    pa11y: { score: 90, totalErrors: 0, totalWarnings: 0, issues: [] },
    mobile: { hasViewportMeta: true, hasZoomDisabled: false, hasHorizontalOverflow: false, overflowWidth: 0, undersizedTouchTargetsCount: 0, smallTextElementsCount: 0, hasResponsiveImages: true },
    regulation: undefined,
    distributed: {
      hasGoogleSiteVerification: true,
      hasMetaDomainVerification: false,
      hasBingVerification: false,
      hasYandexVerification: false,
      hasPinterestVerification: false,
      hasMetaPixel: true,
      hasGoogleAnalyticsOrGtm: true,
      hasTikTokPixel: false,
      hasLinkedInInsight: false,
      hasNostrJson: false,
      hasAtprotoDid: false,
      hasFediverseLink: false,
      hasMatrixServer: false,
      hasRssFeed: true,
      hasWebmention: false,
      hasLlmsTxt: true,
      hasSecurityTxt: true,
      isEcommerce: true,
      hasUcp: false,
      detectedCount: 5,
      totalChecked: 18,
    },
    fetchedAt: 1700000000,
  };

  const genericChecklist = generateModernizationChecklist(
    { items: [], platform: 'custom', detectedExtensions: [], techDebtScore: 20, hasEolOrDeprecated: false, summary: '' },
    dummyRawMetricsCommerce
  );
  assert(genericChecklist.checklist.some(item => item.id === 'mod-ucp-agentic-commerce'), 'Generic checklist recommends UCP for e-commerce store without UCP');

  const wpChecklist = generateModernizationChecklist(
    { items: [{ id: 'ecommerce-woocommerce', name: 'WooCommerce', category: 'E-Commerce', status: 'modern', detectedVia: 'html', description: '' }], platform: 'wordpress', detectedExtensions: [], techDebtScore: 20, hasEolOrDeprecated: false, summary: '' },
    dummyRawMetricsCommerce
  );
  assert(wpChecklist.checklist.some(item => item.id === 'wp-mod-ucp-commerce'), 'WordPress/WooCommerce checklist recommends UCP when missing');

  // Summary
  console.log(`\n================================`);
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log(`================================`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
