/**
 * Unit tests for Jurisdiction Detection and Regional Data Regulation Engine
 */
import {
  detectSiteJurisdiction,
  evaluateSiteDataRegulation,
} from '../src/lib/jurisdiction-engine.ts';
import { generateRegulationIssues } from '../src/lib/score-engine.ts';

async function runTests() {
  console.log('--- Starting Jurisdiction Engine Unit Tests ---');
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

  // 1. Australia (AU) Detection & Regulation Evaluation
  console.log('\n--- Test Suite 1: Australia (Carreb & .com.au) ---');
  const auHtml = `
    <!doctype html>
    <html lang="en-AU">
    <head><title>Carreb | Australian New Car Marketplace</title></head>
    <body>
      <header><nav><a href="/">Home</a><a href="/cars">New Cars</a></nav></header>
      <main><h1>Buy New Cars Across Sydney, Melbourne & Brisbane</h1></main>
      <footer>
        <p>Carreb Pty Ltd - ABN 51 824 753 556</p>
        <p>Contact: +61 2 9876 5432 | Sydney NSW Australia</p>
        <a href="/privacy-policy">Privacy Policy</a>
        <a href="/terms-and-conditions">Terms & Conditions</a>
      </footer>
    </body>
    </html>
  `;

  const auJurisdiction = detectSiteJurisdiction(auHtml, 'https://carreb.com.au');
  assert(auJurisdiction.region === 'AU', 'Detects carreb.com.au as region AU');
  assert(auJurisdiction.countryCode === 'AU', 'Detects countryCode AU');
  assert(auJurisdiction.countryName === 'Australia', 'Detects countryName Australia');
  assert(auJurisdiction.flagEmoji === '🇦🇺', 'Provides Australian flag emoji 🇦🇺');
  assert(auJurisdiction.applicableLaws.some(l => l.includes('Privacy Act 1988')), 'Includes Privacy Act 1988');
  assert(auJurisdiction.applicableLaws.some(l => l.includes('Australian Consumer Law')), 'Includes Australian Consumer Law (ACL)');

  const auRegulation = evaluateSiteDataRegulation(auHtml, 'https://carreb.com.au', 'en-AU');
  assert(auRegulation.au !== undefined, 'Contains au regulation diagnostics');
  assert(auRegulation.au?.hasPrivacyPolicy === true, 'Detects Australian Privacy Policy');
  assert(auRegulation.au?.hasTermsOfService === true, 'Detects Australian Terms of Service');
  assert(auRegulation.au?.hasAbnOrAcn === true, 'Detects ABN: 51 824 753 556');
  assert(auRegulation.au?.detectedAbn === '51 824 753 556', 'Extracts exact ABN string');

  const auIssues = generateRegulationIssues(auRegulation);
  assert(!auIssues.some(i => i.id.includes('impressum')), 'Australian site NEVER flagged for missing German Impressum');
  assert(!auIssues.some(i => i.id.startsWith('eu-')), 'Australian site NEVER flagged for EU GDPR issues');
  assert(auIssues.length === 0, 'Fully compliant Australian site has zero issues');

  // Australian site missing ABN & Privacy Policy
  const incompleteAuHtml = `
    <html lang="en"><head></head><body><p>Australian car dealer</p></body></html>
  `;
  const incompleteAuReg = evaluateSiteDataRegulation(incompleteAuHtml, 'https://dealers.com.au');
  const incompleteAuIssues = generateRegulationIssues(incompleteAuReg);
  assert(incompleteAuIssues.some(i => i.id === 'au-missing-privacy-policy'), 'Flags missing Australian Privacy Policy');
  assert(incompleteAuIssues.some(i => i.id === 'au-missing-terms-acl'), 'Flags missing ACL Terms');
  assert(incompleteAuIssues.some(i => i.id === 'au-missing-abn-disclosure'), 'Flags missing ABN disclosure');

  // 2. Turkey (TR) Detection & Regulation Evaluation (KVKK & TTK)
  console.log('\n--- Test Suite 2: Turkey (KVKK & .com.tr / MERSİS) ---');
  const trHtml = `
    <!doctype html>
    <html lang="tr-TR">
    <head><title>Örnek E-Ticaret A.Ş.</title></head>
    <body>
      <main><h1>Türkiye Geneli Hızlı Teslimat</h1></main>
      <footer>
        <p>MERSİS No: 0123456789012345 | VKN: 1234567890</p>
        <p>İletişim: +90 (212) 555 0123 | Maslak, İstanbul</p>
        <a href="/kvkk-aydinlatma-metni">KVKK Aydınlatma Metni</a>
        <a href="/mesafeli-satis-sozlesmesi">Mesafeli Satış Sözleşmesi</a>
        <a href="/cerez-politikasi">Çerez Politikası</a>
        <a href="/kunye">Şirket Künyesi</a>
      </footer>
    </body>
    </html>
  `;

  const trJurisdiction = detectSiteJurisdiction(trHtml, 'https://orneksite.com.tr');
  assert(trJurisdiction.region === 'TR', 'Detects .com.tr site as region TR');
  assert(trJurisdiction.countryCode === 'TR', 'Detects countryCode TR');
  assert(trJurisdiction.countryName === 'Türkiye', 'Detects countryName Türkiye');
  assert(trJurisdiction.flagEmoji === '🇹🇷', 'Provides Turkish flag emoji 🇹🇷');
  assert(trJurisdiction.applicableLaws.some(l => l.includes('6698 Sayılı KVKK')), 'Includes 6698 Sayılı KVKK');
  assert(trJurisdiction.applicableLaws.some(l => l.includes('TTK Madde 39')), 'Includes TTK Madde 39 MERSİS/Künye');

  const trRegulation = evaluateSiteDataRegulation(trHtml, 'https://orneksite.com.tr', 'tr-TR');
  assert(trRegulation.tr !== undefined, 'Contains tr regulation diagnostics');
  assert(trRegulation.tr?.hasKvkkNotice === true, 'Detects KVKK Aydınlatma Metni');
  assert(trRegulation.tr?.hasMersisOrKunye === true, 'Detects MERSİS / Künye');
  assert(trRegulation.tr?.hasEcommerceTerms === true, 'Detects Mesafeli Satış Sözleşmesi');
  assert(trRegulation.tr?.hasCookiePolicy === true, 'Detects Çerez Politikası');
  assert(trRegulation.tr?.detectedMersis === '0123456789012345', 'Extracts exact 16-digit MERSİS number');

  const trIssues = generateRegulationIssues(trRegulation);
  assert(!trIssues.some(i => i.id.includes('impressum')), 'Turkish site NEVER flagged for German Impressum');
  assert(trIssues.length === 0, 'Fully compliant Turkish site has zero issues');

  // Turkish site missing KVKK & MERSİS
  const incompleteTrHtml = `
    <html lang="tr"><head></head><body><h1>Hizmetlerimiz</h1></body></html>
  `;
  const incompleteTrReg = evaluateSiteDataRegulation(incompleteTrHtml, 'https://hizmet.com.tr');
  const incompleteTrIssues = generateRegulationIssues(incompleteTrReg);
  assert(incompleteTrIssues.some(i => i.id === 'tr-missing-kvkk-notice'), 'Flags missing KVKK Aydınlatma Metni');
  assert(incompleteTrIssues.some(i => i.id === 'tr-missing-mersis-kunye'), 'Flags missing MERSİS/Künye');
  assert(incompleteTrIssues.some(i => i.id === 'tr-missing-ecommerce-terms'), 'Flags missing E-Commerce / Distance terms');
  assert(incompleteTrIssues.some(i => i.id === 'tr-missing-cookie-policy'), 'Flags missing Çerez Politikası');

  // 3. Germany & European Union (DE / EU)
  console.log('\n--- Test Suite 3: Germany & EU (GDPR & Impressum) ---');
  const deHtml = `
    <!doctype html>
    <html lang="de">
    <head><title>Deutsche Werkzeuge GmbH</title></head>
    <body>
      <footer>
        <p>HRB 12345 Amtsgericht München</p>
        <a href="/impressum">Impressum</a>
        <a href="/datenschutz">Datenschutzerklärung</a>
        <a href="/agb">AGB</a>
      </footer>
    </body>
    </html>
  `;

  const deJurisdiction = detectSiteJurisdiction(deHtml, 'https://werkzeuge.de');
  assert(deJurisdiction.region === 'EU', 'Detects .de site as EU region');
  assert(deJurisdiction.countryCode === 'DE', 'Detects countryCode DE');
  assert(deJurisdiction.applicableLaws.some(l => l.includes('GDPR') || l.includes('TMG') || l.includes('DDG')), 'Includes GDPR and Impressum law');

  const deRegulation = evaluateSiteDataRegulation(deHtml, 'https://werkzeuge.de', 'de');
  assert(deRegulation.eu?.hasImpressumOrLegal === true, 'Detects German Impressum');
  assert(deRegulation.eu?.hasPrivacyPolicy === true, 'Detects Datenschutzerklärung');

  // 4. United Kingdom (GB)
  console.log('\n--- Test Suite 4: United Kingdom (UK GDPR & Companies Act) ---');
  const ukHtml = `
    <!doctype html>
    <html lang="en-GB">
    <head><title>London FinTech Ltd</title></head>
    <body>
      <footer>
        <p>Company Registered in England and Wales No. 01234567</p>
        <a href="/privacy">Privacy Notice</a>
        <a href="/terms">Terms of Use</a>
      </footer>
    </body>
    </html>
  `;

  const ukJurisdiction = detectSiteJurisdiction(ukHtml, 'https://londonfintech.co.uk');
  assert(ukJurisdiction.region === 'GB', 'Detects .co.uk as region GB');
  assert(ukJurisdiction.countryCode === 'GB', 'Detects countryCode GB');
  assert(ukJurisdiction.flagEmoji === '🇬🇧', 'Provides UK flag emoji 🇬🇧');

  const ukRegulation = evaluateSiteDataRegulation(ukHtml, 'https://londonfintech.co.uk', 'en-GB');
  assert(ukRegulation.gb?.hasCompanyRegistrationNumber === true, 'Detects UK Company Registration Number');
  assert(ukRegulation.gb?.detectedCompanyNumber === '01234567', 'Extracts exact 8-digit UK company number');

  // 5. United States (US)
  console.log('\n--- Test Suite 5: United States (CCPA/CPRA) ---');
  const usHtml = `
    <html lang="en-US">
    <head><title>US Retailer</title></head>
    <body>
      <footer>
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
        <a href="/do-not-sell">Do Not Sell or Share My Personal Info</a>
      </footer>
    </body>
    </html>
  `;
  const usJurisdiction = detectSiteJurisdiction(usHtml, 'https://retailer.us');
  assert(usJurisdiction.region === 'US', 'Detects .us site as region US');
  const usRegulation = evaluateSiteDataRegulation(usHtml, 'https://retailer.us');
  assert(usRegulation.us?.hasDoNotSellOrShare === true, 'Detects CCPA Do Not Sell link');
  assert(usRegulation.us?.hasTermsOfService === true, 'Detects Terms of Service');

  console.log(`\n========================================`);
  console.log(`Jurisdiction Engine Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
