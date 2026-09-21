// Workouse Audit Tool — Jurisdiction & Legal Country Detection Engine
// Multi-signal deterministic detection of site country, operating market, and applicable legal frameworks.

export type JurisdictionRegion = 'TR' | 'AU' | 'US' | 'EU' | 'GB' | 'CA' | 'NZ' | 'GLOBAL';

export interface DetectedJurisdiction {
  countryCode: string; // e.g. "TR", "AU", "DE", "FR", "GB", "US", "CA", "NZ", "GLOBAL"
  countryName: string; // e.g. "Türkiye", "Australia", "Germany", "United Kingdom", "United States", "Canada", "Global / Multi-Region"
  region: JurisdictionRegion;
  flag: string; // e.g. "🇹🇷", "🇦🇺", "🇩🇪", "🇬🇧", "🇺🇸", "🇨🇦", "🌐"
  flagEmoji?: string;
  applicableLaws: string[];
  confidence: 'high' | 'medium' | 'low';
  signals: string[];
  detectionSignals?: string[];
}

export interface TrRegulationDiagnostics {
  hasKvkkNotice: boolean;
  kvkkNoticeUrl: string | null;
  hasMersisOrKunye: boolean;
  mersisNumber: string | null;
  detectedMersis?: string | null;
  vknNumber: string | null;
  hasCommercialMessageConsent: boolean;
  hasDistanceSalesContract: boolean;
  hasEcommerceTerms?: boolean;
  hasCookiePolicy: boolean;
  hasExplicitCookieConsent: boolean;
  hasUnconsentedTrackers: boolean;
  detectedTrackers: string[];
}

export interface AuRegulationDiagnostics {
  hasPrivacyPolicy: boolean;
  privacyPolicyUrl: string | null;
  hasTermsOfService: boolean;
  hasAbnOrAcn: boolean;
  abnNumber: string | null;
  detectedAbn?: string | null;
  acnNumber: string | null;
  detectedAcn?: string | null;
  hasSpamActConsent: boolean;
  hasUnconsentedTrackers: boolean;
  detectedTrackers: string[];
}

export interface EuRegulationDiagnostics {
  hasCmp: boolean;
  cmpProvider: string | null;
  hasPrivacyPolicy: boolean;
  privacyPolicyUrl: string | null;
  hasCookiePolicy: boolean;
  hasImpressumOrLegal: boolean;
  hasUnconsentedTrackers: boolean;
  detectedTrackers: string[];
  hasExternalFontTransfer: boolean;
}

export interface UsRegulationDiagnostics {
  hasDoNotSellOrShare: boolean;
  hasUsStatePrivacyNotice: boolean;
  hasGpcReadiness: boolean;
  hasTermsOfService: boolean;
  hasCoppaStatement: boolean;
  hasUnconsentedTrackers: boolean;
  detectedTrackers: string[];
}

export interface GbRegulationDiagnostics {
  hasPrivacyPolicy: boolean;
  hasPrivacyNotice?: boolean;
  privacyPolicyUrl: string | null;
  hasCookieConsent: boolean;
  hasCompanyRegistration: boolean;
  hasCompanyRegistrationNumber?: boolean;
  companyNumber: string | null;
  detectedCompanyNumber?: string | null;
  hasTermsOfService: boolean;
  hasUnconsentedTrackers: boolean;
  detectedTrackers: string[];
}

export interface CaRegulationDiagnostics {
  hasPrivacyPolicy: boolean;
  privacyPolicyUrl: string | null;
  hasCaslConsent: boolean;
  hasTermsOfService: boolean;
  hasUnconsentedTrackers: boolean;
  detectedTrackers: string[];
}

export interface GlobalRegulationDiagnostics {
  hasPrivacyPolicy: boolean;
  privacyPolicyUrl: string | null;
  hasTermsOfService: boolean;
  hasCookieNotice: boolean;
  hasGpcReadiness: boolean;
  hasUnconsentedTrackers: boolean;
  detectedTrackers: string[];
}

export interface DataRegulationDiagnostics {
  jurisdiction: DetectedJurisdiction;
  tr?: TrRegulationDiagnostics;
  au?: AuRegulationDiagnostics;
  eu?: EuRegulationDiagnostics;
  us?: UsRegulationDiagnostics;
  gb?: GbRegulationDiagnostics;
  ca?: CaRegulationDiagnostics;
  global?: GlobalRegulationDiagnostics;
  overallComplianceScore: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Country Metadata Registry
// ─────────────────────────────────────────────────────────────────────────────

interface CountryMeta {
  name: string;
  region: JurisdictionRegion;
  flag: string;
  laws: string[];
}

const COUNTRY_REGISTRY: Record<string, CountryMeta> = {
  TR: {
    name: 'Türkiye',
    region: 'TR',
    flag: '🇹🇷',
    laws: [
      '6698 Sayılı KVKK (Kişisel Verilerin Korunması Kanunu)',
      'Elektronik Ticaretin Düzenlenmesi Hakkında Kanun (No. 6563 / İYS)',
      'Türk Ticaret Kanunu (TTK Madde 39 Künye / MERSİS)',
      'Tüketicinin Korunması Hakkında Kanun (No. 6502 Mesafeli Satış)',
    ],
  },
  AU: {
    name: 'Australia',
    region: 'AU',
    flag: '🇦🇺',
    laws: [
      'Australian Consumer Law (ACL - Schedule 2 of Competition and Consumer Act 2010)',
      'Privacy Act 1988 (Australian Privacy Principles - APPs)',
      'Spam Act 2003 (Commercial Electronic Messaging)',
      'Corporations Act 2001 (ABN/ACN Identity Disclosures)',
    ],
  },
  DE: {
    name: 'Germany',
    region: 'EU',
    flag: '🇩🇪',
    laws: [
      'General Data Protection Regulation (EU GDPR / DSGVO)',
      'Telecommunications-Telemedia Data Protection Act (TDDDG / § 5 DDG Impressum)',
      'ePrivacy Directive & BGH Cookie Consent Standards',
    ],
  },
  FR: {
    name: 'France',
    region: 'EU',
    flag: '🇫🇷',
    laws: [
      'General Data Protection Regulation (EU GDPR / CNIL)',
      'Loi pour la Confiance dans l\'Économie Numérique (LCEN Mentions Légales)',
      'ePrivacy Directive & CNIL Cookie Guidelines',
    ],
  },
  AT: {
    name: 'Austria',
    region: 'EU',
    flag: '🇦🇹',
    laws: [
      'General Data Protection Regulation (EU GDPR / DSGVO)',
      'E-Commerce-Gesetz (ECG § 5 Impressum)',
      'Telekommunikationsgesetz (TKG 2021 Cookie Consent)',
    ],
  },
  CH: {
    name: 'Switzerland',
    region: 'EU',
    flag: '🇨🇭',
    laws: [
      'Federal Act on Data Protection (FADP / nDSG)',
      'Swiss Unfair Competition Act (UWG Impressumspflicht)',
    ],
  },
  NL: {
    name: 'Netherlands',
    region: 'EU',
    flag: '🇳🇱',
    laws: [
      'General Data Protection Regulation (EU GDPR / AVG)',
      'Telecommunicatiewet (Dutch Cookie Act)',
      'Dutch Civil Code (Handelsregister Identification)',
    ],
  },
  ES: {
    name: 'Spain',
    region: 'EU',
    flag: '🇪🇸',
    laws: [
      'General Data Protection Regulation (EU GDPR / LOPDGDD)',
      'Ley de Servicios de la Sociedad de la Información (LSSI-CE Aviso Legal)',
    ],
  },
  IT: {
    name: 'Italy',
    region: 'EU',
    flag: '🇮🇹',
    laws: [
      'General Data Protection Regulation (EU GDPR / Codice Privacy)',
      'Decreto Legislativo 70/2003 (Note Legali & Partita IVA)',
    ],
  },
  EU: {
    name: 'European Union',
    region: 'EU',
    flag: '🇪🇺',
    laws: [
      'General Data Protection Regulation (EU GDPR 2016/679)',
      'ePrivacy Directive (2002/58/EC)',
      'EU Digital Services Act (DSA) & Omnibus Directive',
    ],
  },
  GB: {
    name: 'United Kingdom',
    region: 'GB',
    flag: '🇬🇧',
    laws: [
      'UK General Data Protection Regulation (UK GDPR)',
      'Data Protection Act 2018 (DPA 2018)',
      'Privacy and Electronic Communications Regulations (PECR)',
      'Companies (Trading Disclosures) Regulations 2008',
      'Consumer Rights Act 2015',
    ],
  },
  US: {
    name: 'United States',
    region: 'US',
    flag: '🇺🇸',
    laws: [
      'California Consumer Privacy Act / CPRA (Cal. Civ. Code § 1798.100)',
      'US State Privacy Acts (Virginia VCDPA, Colorado CPA, Connecticut CTDPA)',
      'FTC Act § 5 (Unfair and Deceptive Trade Practices)',
      'Children\'s Online Privacy Protection Act (COPPA)',
    ],
  },
  CA: {
    name: 'Canada',
    region: 'CA',
    flag: '🇨🇦',
    laws: [
      'Personal Information Protection and Electronic Documents Act (PIPEDA)',
      'Canada\'s Anti-Spam Legislation (CASL)',
      'Provincial Consumer Protection Acts',
    ],
  },
  NZ: {
    name: 'New Zealand',
    region: 'NZ',
    flag: '🇳🇿',
    laws: [
      'Privacy Act 2020 (Information Privacy Principles - IPPs)',
      'Consumer Guarantees Act 1993 (CGA)',
      'Unsolicited Electronic Messages Act 2007',
    ],
  },
  GLOBAL: {
    name: 'Global / Multi-Region',
    region: 'GLOBAL',
    flag: '🌐',
    laws: [
      'International Data Privacy & Commercial Standards',
      'Global Privacy Control (GPC) Transparency Baseline',
      'Commercial Terms of Service & Consumer Transparency',
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Signal Jurisdiction Detection Engine
// ─────────────────────────────────────────────────────────────────────────────

interface ScoredSignal {
  countryCode: string;
  score: number;
  reason: string;
}

/**
 * Detect the target website's country and legal jurisdiction using multiple deterministic signals.
 */
export function detectSiteJurisdiction(
  urlOrHtml: string,
  htmlOrUrl?: string,
  schemaTypes?: string[],
  metaLang?: string | null
): DetectedJurisdiction {
  const signals: ScoredSignal[] = [];

  let url = (urlOrHtml || '').trim();
  let html = (htmlOrUrl || '').trim();

  // If first parameter is HTML and second parameter is URL, swap them
  if (
    (url.includes('<') || url.includes('\n') || url.length > 500) &&
    htmlOrUrl &&
    (htmlOrUrl.startsWith('http') || htmlOrUrl.includes('.') || htmlOrUrl.length < 200)
  ) {
    url = htmlOrUrl.trim();
    html = urlOrHtml.trim();
  }

  let hostname = '';
  try {
    const raw = url.startsWith('http') ? url : `https://${url}`;
    hostname = new URL(raw).hostname.toLowerCase();
  } catch {
    hostname = url.toLowerCase();
  }

  // ── Signal 1: Country Code Top-Level Domain (ccTLD) ───────────────────────
  if (hostname.endsWith('.com.au') || hostname.endsWith('.net.au') || hostname.endsWith('.org.au') || hostname.endsWith('.au') || hostname.endsWith('.gov.au') || hostname.endsWith('.edu.au')) {
    signals.push({ countryCode: 'AU', score: 50, reason: `ccTLD domain suffix (${hostname.split('.').slice(-2).join('.')})` });
  } else if (hostname.endsWith('.com.tr') || hostname.endsWith('.org.tr') || hostname.endsWith('.net.tr') || hostname.endsWith('.gov.tr') || hostname.endsWith('.edu.tr') || hostname.endsWith('.av.tr') || hostname.endsWith('.tr')) {
    signals.push({ countryCode: 'TR', score: 50, reason: `ccTLD domain suffix (${hostname.split('.').slice(-2).join('.')})` });
  } else if (hostname.endsWith('.co.uk') || hostname.endsWith('.org.uk') || hostname.endsWith('.gov.uk') || hostname.endsWith('.uk')) {
    signals.push({ countryCode: 'GB', score: 50, reason: `ccTLD domain suffix (${hostname.split('.').slice(-2).join('.')})` });
  } else if (hostname.endsWith('.de')) {
    signals.push({ countryCode: 'DE', score: 50, reason: 'ccTLD domain suffix (.de)' });
  } else if (hostname.endsWith('.at')) {
    signals.push({ countryCode: 'AT', score: 50, reason: 'ccTLD domain suffix (.at)' });
  } else if (hostname.endsWith('.ch')) {
    signals.push({ countryCode: 'CH', score: 50, reason: 'ccTLD domain suffix (.ch)' });
  } else if (hostname.endsWith('.fr')) {
    signals.push({ countryCode: 'FR', score: 50, reason: 'ccTLD domain suffix (.fr)' });
  } else if (hostname.endsWith('.it')) {
    signals.push({ countryCode: 'IT', score: 50, reason: 'ccTLD domain suffix (.it)' });
  } else if (hostname.endsWith('.es')) {
    signals.push({ countryCode: 'ES', score: 50, reason: 'ccTLD domain suffix (.es)' });
  } else if (hostname.endsWith('.nl')) {
    signals.push({ countryCode: 'NL', score: 50, reason: 'ccTLD domain suffix (.nl)' });
  } else if (hostname.endsWith('.ca')) {
    signals.push({ countryCode: 'CA', score: 50, reason: 'ccTLD domain suffix (.ca)' });
  } else if (hostname.endsWith('.co.nz') || hostname.endsWith('.nz') || hostname.endsWith('.org.nz')) {
    signals.push({ countryCode: 'NZ', score: 50, reason: 'ccTLD domain suffix (.nz)' });
  } else if (hostname.endsWith('.us') || hostname.endsWith('.gov') || hostname.endsWith('.mil')) {
    signals.push({ countryCode: 'US', score: 50, reason: 'ccTLD/gTLD domain suffix' });
  }

  // ── Signal 2: HTML Lang and Hreflang Attributes ───────────────────────────
  const langMatch = metaLang || (html.match(/<html[^>]*lang=["']([^"']+)["']/i)?.[1] || '').toLowerCase().trim();
  if (langMatch) {
    if (langMatch.startsWith('tr')) {
      signals.push({ countryCode: 'TR', score: 25, reason: `HTML language attribute (lang="${langMatch}")` });
    } else if (langMatch === 'en-au') {
      signals.push({ countryCode: 'AU', score: 30, reason: 'HTML localized language (lang="en-AU")' });
    } else if (langMatch === 'en-gb') {
      signals.push({ countryCode: 'GB', score: 30, reason: 'HTML localized language (lang="en-GB")' });
    } else if (langMatch === 'en-ca' || langMatch === 'fr-ca') {
      signals.push({ countryCode: 'CA', score: 30, reason: `HTML localized language (lang="${langMatch}")` });
    } else if (langMatch === 'en-nz') {
      signals.push({ countryCode: 'NZ', score: 30, reason: 'HTML localized language (lang="en-NZ")' });
    } else if (langMatch === 'en-us') {
      signals.push({ countryCode: 'US', score: 20, reason: 'HTML localized language (lang="en-US")' });
    } else if (langMatch.startsWith('de')) {
      signals.push({ countryCode: 'DE', score: 25, reason: `HTML language (lang="${langMatch}")` });
    } else if (langMatch.startsWith('fr')) {
      signals.push({ countryCode: 'FR', score: 25, reason: `HTML language (lang="${langMatch}")` });
    }
  }

  // ── Signal 3: Schema.org Structured Data (Address / Currency / AreaServed) ─
  const addressCountryMatch = html.match(/"addressCountry"\s*:\s*["']([^"']+)["']/i);
  if (addressCountryMatch) {
    const rawVal = addressCountryMatch[1].trim().toUpperCase();
    if (rawVal === 'AU' || rawVal === 'AUS' || rawVal === 'AUSTRALIA') {
      signals.push({ countryCode: 'AU', score: 35, reason: `Schema.org addressCountry ("${addressCountryMatch[1]}")` });
    } else if (rawVal === 'TR' || rawVal === 'TUR' || rawVal === 'TURKEY' || rawVal === 'TÜRKİYE' || rawVal === 'TURKIYE') {
      signals.push({ countryCode: 'TR', score: 35, reason: `Schema.org addressCountry ("${addressCountryMatch[1]}")` });
    } else if (rawVal === 'GB' || rawVal === 'UK' || rawVal === 'UNITED KINGDOM' || rawVal === 'GREAT BRITAIN') {
      signals.push({ countryCode: 'GB', score: 35, reason: `Schema.org addressCountry ("${addressCountryMatch[1]}")` });
    } else if (rawVal === 'US' || rawVal === 'USA' || rawVal === 'UNITED STATES' || rawVal === 'UNITED STATES OF AMERICA') {
      signals.push({ countryCode: 'US', score: 35, reason: `Schema.org addressCountry ("${addressCountryMatch[1]}")` });
    } else if (rawVal === 'DE' || rawVal === 'DEU' || rawVal === 'GERMANY' || rawVal === 'DEUTSCHLAND') {
      signals.push({ countryCode: 'DE', score: 35, reason: `Schema.org addressCountry ("${addressCountryMatch[1]}")` });
    } else if (rawVal === 'CA' || rawVal === 'CAN' || rawVal === 'CANADA') {
      signals.push({ countryCode: 'CA', score: 35, reason: `Schema.org addressCountry ("${addressCountryMatch[1]}")` });
    } else if (rawVal === 'NZ' || rawVal === 'NZL' || rawVal === 'NEW ZEALAND') {
      signals.push({ countryCode: 'NZ', score: 35, reason: `Schema.org addressCountry ("${addressCountryMatch[1]}")` });
    }
  }

  const currencyMatch = html.match(/"priceCurrency"\s*:\s*["']([^"']+)["']/i);
  if (currencyMatch) {
    const cur = currencyMatch[1].trim().toUpperCase();
    if (cur === 'AUD') signals.push({ countryCode: 'AU', score: 20, reason: 'Schema.org priceCurrency (AUD)' });
    else if (cur === 'TRY') signals.push({ countryCode: 'TR', score: 20, reason: 'Schema.org priceCurrency (TRY)' });
    else if (cur === 'GBP') signals.push({ countryCode: 'GB', score: 20, reason: 'Schema.org priceCurrency (GBP)' });
    else if (cur === 'EUR') signals.push({ countryCode: 'EU', score: 15, reason: 'Schema.org priceCurrency (EUR)' });
    else if (cur === 'CAD') signals.push({ countryCode: 'CA', score: 20, reason: 'Schema.org priceCurrency (CAD)' });
    else if (cur === 'NZD') signals.push({ countryCode: 'NZ', score: 20, reason: 'Schema.org priceCurrency (NZD)' });
  }

  // ── Signal 4: Business Identifiers & National Legal Terms ─────────────────
  // Turkey: MERSİS No, VKN, Aydınlatma Metni, KVKK
  const hasMersisPattern = Boolean(html.match(/mers[iıİI]s\s*(?:no|numaras[ıiİI])?\s*[:.-]?\s*0?\d{16}/i));
  const hasVknPattern = Boolean(html.match(/(?:vkn|vergi\s*kimlik\s*no)\s*[:.-]?\s*\d{10}/i));
  const hasKvkkKeywords = Boolean(
    html.match(/kvkk\s*ayd[ıiİI]nlatma\s*metni/i) ||
    html.match(/6698\s*say[ıiİI]l[ıiİI]\s*kanun/i) ||
    html.match(/ki[sşSŞ]isel\s*verilerin\s*korunmas[ıiİI]/i) ||
    html.match(/mesafeli\s*sat[ıiİI][sşSŞ]\s*s[öoÖO]zle[sşSŞ]mesi/i) ||
    html.match(/[iİI]ys\.org\.tr|elektronik\s*ticaretin\s*d[üuÜU]zenlenmesi/i)
  );
  if (hasMersisPattern) signals.push({ countryCode: 'TR', score: 35, reason: 'Turkish MERSİS company identifier detected' });
  if (hasVknPattern) signals.push({ countryCode: 'TR', score: 25, reason: 'Turkish Tax Number (VKN) detected' });
  if (hasKvkkKeywords) signals.push({ countryCode: 'TR', score: 25, reason: 'KVKK / Turkish E-Commerce legal text detected' });

  // Australia: ABN, ACN, Australian Consumer Law, APPs
  const hasAbnPattern = Boolean(html.match(/ABN\s*(?:[:#.-]|\b)\s*\d{2}\s*\d{3}\s*\d{3}\s*\d{3}/i) || html.match(/ABN\s*:\s*\d+/i));
  const hasAcnPattern = Boolean(html.match(/ACN\s*(?:[:#.-]|\b)\s*\d{3}\s*\d{3}\s*\d{3}/i) || html.match(/ACN\s*:\s*\d+/i));
  const hasAclKeywords = Boolean(
    html.match(/australian\s*consumer\s*law/i) ||
    html.match(/privacy\s*act\s*1988/i) ||
    html.match(/australian\s*privacy\s*principles/i) ||
    html.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\s+\d{4}\b/)
  );
  if (hasAbnPattern) signals.push({ countryCode: 'AU', score: 35, reason: 'Australian Business Number (ABN) detected' });
  if (hasAcnPattern) signals.push({ countryCode: 'AU', score: 30, reason: 'Australian Company Number (ACN) detected' });
  if (hasAclKeywords) signals.push({ countryCode: 'AU', score: 25, reason: 'Australian Consumer Law / State postal code detected' });

  // Germany / EU: Handelsregister, HRB, § 5 TMG / DDG
  const hasHrbPattern = Boolean(html.match(/HRB\s*\d+/i) || html.match(/HRA\s*\d+/i) || html.match(/Amtsgericht\s+[A-Za-zäöüÄÖÜß]+/i));
  const hasTmgPattern = Boolean(html.match(/§\s*5\s*(?:TMG|DDG)/i) || html.match(/Handelsregister/i) || html.match(/USt-IdNr/i));
  if (hasHrbPattern) signals.push({ countryCode: 'DE', score: 35, reason: 'German Commercial Register (HRB/Amtsgericht) detected' });
  if (hasTmgPattern) signals.push({ countryCode: 'DE', score: 30, reason: 'German Telemedia Impressum (§ 5 TMG/DDG) detected' });

  // United Kingdom: Companies House, DPA 2018
  const hasCompaniesHouse = Boolean(
    html.match(/registered\s+in\s+england\s+(?:and\s+wales)?/i) ||
    html.match(/company\s+(?:registration\s+)?(?:no\.?|number)[:\s]+\d{6,8}/i) ||
    html.match(/data\s*protection\s*act\s*2018/i)
  );
  if (hasCompaniesHouse) signals.push({ countryCode: 'GB', score: 35, reason: 'UK Companies House registration statement detected' });

  // ── Calculate Composite Scores per Country ────────────────────────────────
  const scoreMap = new Map<string, { totalScore: number; reasons: string[] }>();
  for (const s of signals) {
    const existing = scoreMap.get(s.countryCode) || { totalScore: 0, reasons: [] };
    existing.totalScore += s.score;
    existing.reasons.push(s.reason);
    scoreMap.set(s.countryCode, existing);
  }

  let bestCountry = 'GLOBAL';
  let bestScore = 0;
  let bestReasons: string[] = [];

  for (const [code, val] of scoreMap.entries()) {
    if (val.totalScore > bestScore) {
      bestScore = val.totalScore;
      bestCountry = code;
      bestReasons = val.reasons;
    }
  }

  const meta = COUNTRY_REGISTRY[bestCountry] || COUNTRY_REGISTRY.GLOBAL;
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (bestScore >= 50) confidence = 'high';
  else if (bestScore >= 25) confidence = 'medium';

  const finalReasons = bestReasons.length > 0 ? bestReasons : ['Default global multi-region baseline'];

  return {
    countryCode: bestCountry,
    countryName: meta.name,
    region: meta.region,
    flag: meta.flag,
    flagEmoji: meta.flag,
    applicableLaws: meta.laws,
    confidence,
    signals: finalReasons,
    detectionSignals: finalReasons,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Region-Specific Legal Compliance Evaluators
// ─────────────────────────────────────────────────────────────────────────────

const TRACKER_SIGNATURES: Array<{ name: string; pattern: RegExp }> = [
  { name: 'Google Analytics 4', pattern: /google-analytics\.com\/analytics\.js|googletagmanager\.com\/gtag\/js|gtag\(['"]config/i },
  { name: 'Facebook / Meta Pixel', pattern: /connect\.facebook\.net\/[a-z_]+\/fbevents\.js|fbq\(['"]init/i },
  { name: 'Hotjar', pattern: /static\.hotjar\.com|hjsv/i },
  { name: 'TikTok Pixel', pattern: /analytics\.tiktok\.com\/i18n\/pixel|ttq\.load/i },
  { name: 'Mixpanel', pattern: /cdn\.mxpnl\.com|mixpanel\.init/i },
  { name: 'HubSpot Tracking', pattern: /js\.hs-scripts\.com|_hsq/i },
  { name: 'Segment', pattern: /cdn\.segment\.com\/analytics\.js/i },
  { name: 'Microsoft Clarity', pattern: /www\.clarity\.ms\/tag/i },
];

function detectTrackers(html: string): string[] {
  const found: string[] = [];
  for (const t of TRACKER_SIGNATURES) {
    if (t.pattern.test(html)) {
      found.push(t.name);
    }
  }
  return found;
}

/**
 * Inspect Turkish KVKK, TTK Künye, and E-Commerce Law compliance.
 */
export function inspectTurkishRegulation(html: string): TrRegulationDiagnostics {
  // 1. KVKK Aydınlatma Metni
  const kvkkNoticeMatch = Boolean(
    html.match(/href=["'][^"']*(kvkk|aydinlatma|ayd[ıiİI]nlatma|kisisel-veri|ki[sşSŞ]isel-veri|gizlilik)[^"']*["']/i) ||
    html.match(/>\s*(kvkk\s*ayd[ıiİI]nlatma\s*metni|ayd[ıiİI]nlatma\s*metni|ki[sşSŞ]isel\s*verilerin\s*korunmas[ıiİI]|gizlilik\s*politikas[ıiİI])\s*</i) ||
    html.match(/kvkk\s*ayd[ıiİI]nlatma\s*metni/i)
  );
  const kvkkUrlMatch = html.match(/href=["']([^"']*(kvkk|aydinlatma|ayd[ıiİI]nlatma|kisisel-veri|ki[sşSŞ]isel-veri|gizlilik)[^"']*)["']/i);

  // 2. MERSİS / VKN / Künye
  const mersisMatch = html.match(/(?:mers[iıİI]s\s*(?:no|numaras[ıiİI])?|mers[iıİI]s\s*:)\s*[:.-]?\s*(\d{16})/i) || html.match(/mers[iıİI]s[^\d]*(\d{16})/i);
  const vknMatch = html.match(/(?:vkn|vergi\s*kimlik\s*no)\s*[:.-]?\s*(\d{10})/i);
  const kunyeLinkMatch = Boolean(
    html.match(/href=["'][^"']*(kunye|k[uüUÜ]nye|hakkimizda|hakk[ıiİI]m[ıiİI]zda|iletisim|[iİI]leti[sşSŞ]im)[^"']*["']/i) ||
    html.match(/>\s*(k[uüUÜ]nye|ticari\s*bilgiler|[sşSŞ]irket\s*k[uüUÜ]nyesi)\s*</i) ||
    html.match(/k[uüUÜ]nye/i)
  );
  const hasMersisOrKunye = Boolean(mersisMatch || vknMatch || kunyeLinkMatch);

  // 3. E-Commerce & Commercial Message Consent (İYS / Law No. 6563)
  const hasCommercialMessageConsent = Boolean(
    html.match(/ticari\s*elektronik\s*ileti|elektronik\s*ileti\s*onay|[iİI]ys|ticari\s*ileti/i) ||
    html.match(/onay\s*veriyorum|ticari\s*ileti\s*g[öoÖO]nderilmesini/i)
  );

  // 4. Distance Sales Contract (Mesafeli Satış Sözleşmesi / Law No. 6502)
  const hasDistanceSalesContract = Boolean(
    html.match(/href=["'][^"']*(mesafeli-satis|mesafeli-sat[ıiİI][sşSŞ]|on-bilgilendirme|[öoÖO]n-bilgilendirme|satis-sozlesmesi|sat[ıiİI][sşSŞ]-s[öoÖO]zle[sşSŞ]mesi)[^"']*["']/i) ||
    html.match(/>\s*(mesafeli\s*sat[ıiİI][sşSŞ]\s*s[öoÖO]zle[sşSŞ]mesi|[öoÖO]n\s*bilgilendirme\s*formu|sat[ıiİI][sşSŞ]\s*ko[sşSŞ]ullar[ıiİI])\s*</i) ||
    html.match(/mesafeli\s*sat[ıiİI][sşSŞ]\s*s[öoÖO]zle[sşSŞ]mesi/i)
  );

  // 5. Cookie Policy & Consent (Çerez Politikası)
  const hasCookiePolicy = Boolean(
    html.match(/href=["'][^"']*(cerez|[cçCÇ]erez|cookie|cerez-politikasi|[cçCÇ]erez-politikas[ıiİI])[^"']*["']/i) ||
    html.match(/>\s*([cçCÇ]erez\s*politikas[ıiİI]|[cçCÇ]erezler|cerez\s*politikasi)\s*</i) ||
    html.match(/[cçCÇ]erez\s*politikas[ıiİI]/i)
  );
  const hasExplicitCookieConsent = Boolean(
    html.match(/id=["'][^"']*(cookie|[cçCÇ]erez|consent)[^"']*["']/i) ||
    html.match(/class=["'][^"']*(cookie|[cçCÇ]erez|consent)[^"']*["']/i)
  );

  const detectedTrackers = detectTrackers(html);
  const mersisNumber = mersisMatch ? mersisMatch[1] : null;

  return {
    hasKvkkNotice: kvkkNoticeMatch,
    kvkkNoticeUrl: kvkkUrlMatch ? kvkkUrlMatch[1] : null,
    hasMersisOrKunye,
    mersisNumber,
    detectedMersis: mersisNumber,
    vknNumber: vknMatch ? vknMatch[1] : null,
    hasCommercialMessageConsent,
    hasDistanceSalesContract,
    hasEcommerceTerms: hasDistanceSalesContract,
    hasCookiePolicy,
    hasExplicitCookieConsent,
    hasUnconsentedTrackers: detectedTrackers.length > 0 && !hasExplicitCookieConsent,
    detectedTrackers,
  };
}

/**
 * Inspect Australian Consumer Law (ACL), Privacy Act 1988 (APPs), and Spam Act 2003 compliance.
 */
export function inspectAustralianRegulation(html: string): AuRegulationDiagnostics {
  // 1. Australian Privacy Policy (APPs)
  const privacyMatch = Boolean(
    html.match(/href=["'][^"']*(privacy|privacy-policy|privacy-act)[^"']*["']/i) ||
    html.match(/>\s*(privacy policy|privacy statement|privacy)\s*</i)
  );
  const privacyUrlMatch = html.match(/href=["']([^"']*(privacy|privacy-policy)[^"']*)["']/i);

  // 2. Terms of Service / Australian Consumer Law statutory disclosures
  const hasTermsOfService = Boolean(
    html.match(/href=["'][^"']*(terms|terms-and-conditions|terms-of-use|conditions-of-use|terms-of-service)[^"']*["']/i) ||
    html.match(/>\s*(terms of service|terms and conditions|terms of use|terms & conditions)\s*</i)
  );

  // 3. ABN / ACN Disclosure
  const abnMatch = html.match(/ABN\s*(?:[:#.-]|\b)\s*(\d{2}\s*\d{3}\s*\d{3}\s*\d{3})/i) || html.match(/ABN\s*:\s*(\d+)/i);
  const acnMatch = html.match(/ACN\s*(?:[:#.-]|\b)\s*(\d{3}\s*\d{3}\s*\d{3})/i) || html.match(/ACN\s*:\s*(\d+)/i);
  const hasAbnOrAcn = Boolean(abnMatch || acnMatch);

  // 4. Spam Act 2003 consent / direct marketing unsubscribe
  const hasSpamActConsent = Boolean(
    html.match(/unsubscribe|opt-out|marketing consent|direct marketing/i) ||
    privacyMatch
  );

  const detectedTrackers = detectTrackers(html);
  const abnNumber = abnMatch ? abnMatch[1].replace(/\s+/g, ' ') : null;
  const acnNumber = acnMatch ? acnMatch[1].replace(/\s+/g, ' ') : null;

  return {
    hasPrivacyPolicy: privacyMatch,
    privacyPolicyUrl: privacyUrlMatch ? privacyUrlMatch[1] : null,
    hasTermsOfService,
    hasAbnOrAcn,
    abnNumber,
    detectedAbn: abnNumber,
    acnNumber,
    detectedAcn: acnNumber,
    hasSpamActConsent,
    hasUnconsentedTrackers: detectedTrackers.length > 0,
    detectedTrackers,
  };
}

/**
 * Inspect UK GDPR, PECR, and Companies Act 2006 compliance.
 */
export function inspectUkRegulation(html: string): GbRegulationDiagnostics {
  const privacyMatch = Boolean(
    html.match(/href=["'][^"']*(privacy|privacy-policy|gdpr)[^"']*["']/i) ||
    html.match(/>\s*(privacy policy|privacy notice)\s*</i)
  );
  const privacyUrlMatch = html.match(/href=["']([^"']*(privacy|privacy-policy)[^"']*)["']/i);

  const hasCookieConsent = Boolean(
    html.match(/id=["'][^"']*(cookie|consent)[^"']*["']/i) ||
    html.match(/class=["'][^"']*(cookie|consent)[^"']*["']/i)
  );

  const companyMatch = html.match(/(?:company\s+(?:registration\s+)?(?:no\.?|number)|registered in england[^<]*no\.?|companies house[^<]*no\.?)\s*[:.-]?\s*([A-Z0-9]{6,8})/i) || html.match(/company\s+(?:registration\s+)?(?:no\.?|number)[:\s]+([A-Z0-9]{6,8})/i);
  const hasCompanyRegistration = Boolean(
    companyMatch ||
    html.match(/registered in england/i) ||
    html.match(/companies house/i)
  );

  const hasTermsOfService = Boolean(
    html.match(/href=["'][^"']*(terms|terms-and-conditions|terms-of-service)[^"']*["']/i) ||
    html.match(/>\s*(terms of service|terms & conditions|terms and conditions)\s*</i)
  );

  const detectedTrackers = detectTrackers(html);

  return {
    hasPrivacyPolicy: privacyMatch,
    hasPrivacyNotice: privacyMatch,
    privacyPolicyUrl: privacyUrlMatch ? privacyUrlMatch[1] : null,
    hasCookieConsent,
    hasCompanyRegistration,
    hasCompanyRegistrationNumber: hasCompanyRegistration,
    companyNumber: companyMatch ? companyMatch[1] : null,
    detectedCompanyNumber: companyMatch ? companyMatch[1] : null,
    hasTermsOfService,
    hasUnconsentedTrackers: detectedTrackers.length > 0 && !hasCookieConsent,
    detectedTrackers,
  };
}

/**
 * Inspect Canadian PIPEDA and CASL compliance.
 */
export function inspectCanadianRegulation(html: string): CaRegulationDiagnostics {
  const privacyMatch = Boolean(
    html.match(/href=["'][^"']*(privacy|privacy-policy|politique-de-confidentialite)[^"']*["']/i) ||
    html.match(/>\s*(privacy policy|politique de confidentialité)\s*</i)
  );
  const privacyUrlMatch = html.match(/href=["']([^"']*(privacy|privacy-policy)[^"']*)["']/i);

  const hasCaslConsent = Boolean(
    html.match(/casl|unsubscribe|anti-spam|consent/i) ||
    privacyMatch
  );

  const hasTermsOfService = Boolean(
    html.match(/href=["'][^"']*(terms|terms-of-use|terms-of-service)[^"']*["']/i) ||
    html.match(/>\s*(terms of service|conditions d'utilisation|terms of use)\s*</i)
  );

  const detectedTrackers = detectTrackers(html);

  return {
    hasPrivacyPolicy: privacyMatch,
    privacyPolicyUrl: privacyUrlMatch ? privacyUrlMatch[1] : null,
    hasCaslConsent,
    hasTermsOfService,
    hasUnconsentedTrackers: detectedTrackers.length > 0,
    detectedTrackers,
  };
}

/**
 * Inspect EU GDPR, ePrivacy, and § 5 TMG/DDG Impressum compliance.
 */
export function inspectEuRegulation(html: string): EuRegulationDiagnostics {
  const cmpSignatures: Array<{ provider: string; pattern: RegExp }> = [
    { provider: 'OneTrust', pattern: /onetrust|otSDKStub/i },
    { provider: 'Cookiebot', pattern: /cookiebot\.com|Cookiebot/i },
    { provider: 'CookieYes', pattern: /cookieyes\.com|cookieyes/i },
    { provider: 'Usercentrics', pattern: /usercentrics\.eu|usercentrics/i },
    { provider: 'Klaro', pattern: /klaro-config|klaro/i },
    { provider: 'Axeptio', pattern: /axept\.io|axeptio/i },
    { provider: 'Didomi', pattern: /didomi\.js|didomi/i },
    { provider: 'CookieNotice', pattern: /cookie-notice|cookieNotice/i },
    { provider: 'Termly', pattern: /termly\.io/i },
    { provider: 'TrustArc', pattern: /trustarc|truste/i },
  ];

  let cmpProvider: string | null = null;
  for (const sig of cmpSignatures) {
    if (sig.pattern.test(html)) {
      cmpProvider = sig.provider;
      break;
    }
  }

  const hasCmpBannerElement = Boolean(
    html.match(/id=["'][^"']*(cookie|consent)[^"']*["']/i) ||
    html.match(/class=["'][^"']*(cookie|consent)[^"']*["']/i) ||
    html.match(/aria-label=["'][^"']*(cookie|consent)[^"']*["']/i)
  );

  const hasCmp = Boolean(cmpProvider || hasCmpBannerElement);
  const detectedTrackers = detectTrackers(html);
  const hasUnconsentedTrackers = detectedTrackers.length > 0 && !hasCmp;

  const privacyMatch = Boolean(
    html.match(/href=["'][^"']*(privacy|gdpr|datenschutz|politique-de-confidentialite)[^"']*["']/i) ||
    html.match(/>\s*(privacy policy|datenschutz|politique de confidentialité|privacy)\s*</i)
  );
  const privacyUrlMatch = html.match(/href=["']([^"']*(privacy|gdpr|datenschutz|politique-de-confidentialite)[^"']*)["']/i);

  const hasCookiePolicy = Boolean(
    html.match(/href=["'][^"']*(cookie|cookies|cookie-policy)[^"']*["']/i) ||
    html.match(/>\s*(cookie policy|cookies policy|cookie-richtlinie|cookies)\s*</i)
  );

  const hasImpressumOrLegal = Boolean(
    html.match(/href=["'][^"']*(imprint|impressum|legal|mentions-legales)[^"']*["']/i) ||
    html.match(/>\s*(impressum|imprint|legal notice|mentions légales)\s*</i)
  );

  const hasExternalFontTransfer = Boolean(
    html.match(/fonts\.googleapis\.com/i) ||
    html.match(/fonts\.gstatic\.com/i)
  );

  return {
    hasCmp,
    cmpProvider,
    hasPrivacyPolicy: privacyMatch,
    privacyPolicyUrl: privacyUrlMatch ? privacyUrlMatch[1] : null,
    hasCookiePolicy,
    hasImpressumOrLegal,
    hasUnconsentedTrackers,
    detectedTrackers,
    hasExternalFontTransfer,
  };
}

/**
 * Inspect US CCPA/CPRA, State Privacy, and FTC compliance.
 */
export function inspectUsRegulation(html: string): UsRegulationDiagnostics {
  const hasDoNotSellOrShare = Boolean(
    html.match(/do not sell/i) ||
    html.match(/your privacy choices/i) ||
    html.match(/opt-out|opt out/i) ||
    html.match(/href=["'][^"']*(do-not-sell|privacy-choices|ccpa|opt-out)[^"']*["']/i)
  );

  const privacyMatch = Boolean(
    html.match(/href=["'][^"']*(privacy|us-privacy|california-privacy|privacy-policy)[^"']*["']/i) ||
    html.match(/>\s*(privacy policy|california privacy rights|privacy notice)\s*</i)
  );

  const hasUsStatePrivacyNotice = Boolean(
    html.match(/href=["'][^"']*(us-privacy|california-privacy|state-privacy)[^"']*["']/i) ||
    html.match(/california privacy rights|us state privacy notice|notice at collection/i) ||
    privacyMatch
  );

  const hasGpcReadiness = Boolean(
    html.match(/global-privacy-control/i) ||
    html.match(/globalPrivacyControl/i)
  );

  const hasTermsOfService = Boolean(
    html.match(/href=["'][^"']*(terms|terms-of-service|terms-and-conditions|tos)[^"']*["']/i) ||
    html.match(/>\s*(terms of service|terms & conditions|terms and conditions)\s*</i)
  );

  const hasCoppaStatement = Boolean(
    html.match(/coppa/i) ||
    html.match(/children'?s privacy/i) ||
    html.match(/under (13|16) years of age/i)
  );

  const detectedTrackers = detectTrackers(html);

  return {
    hasDoNotSellOrShare,
    hasUsStatePrivacyNotice,
    hasGpcReadiness,
    hasTermsOfService,
    hasCoppaStatement,
    hasUnconsentedTrackers: detectedTrackers.length > 0 && !hasDoNotSellOrShare,
    detectedTrackers,
  };
}

/**
 * Inspect Global / Universal baseline compliance.
 */
export function inspectGlobalRegulation(html: string): GlobalRegulationDiagnostics {
  const privacyMatch = Boolean(
    html.match(/href=["'][^"']*(privacy|privacy-policy)[^"']*["']/i) ||
    html.match(/>\s*(privacy policy|privacy notice|privacy)\s*</i)
  );
  const privacyUrlMatch = html.match(/href=["']([^"']*(privacy|privacy-policy)[^"']*)["']/i);

  const hasTermsOfService = Boolean(
    html.match(/href=["'][^"']*(terms|terms-of-service|terms-and-conditions)[^"']*["']/i) ||
    html.match(/>\s*(terms of service|terms & conditions|terms of use)\s*</i)
  );

  const hasCookieNotice = Boolean(
    html.match(/href=["'][^"']*(cookie|cookies|cookie-policy)[^"']*["']/i) ||
    html.match(/id=["'][^"']*(cookie|consent)[^"']*["']/i) ||
    html.match(/class=["'][^"']*(cookie|consent)[^"']*["']/i)
  );

  const hasGpcReadiness = Boolean(
    html.match(/global-privacy-control/i) ||
    html.match(/globalPrivacyControl/i)
  );

  const detectedTrackers = detectTrackers(html);

  return {
    hasPrivacyPolicy: privacyMatch,
    privacyPolicyUrl: privacyUrlMatch ? privacyUrlMatch[1] : null,
    hasTermsOfService,
    hasCookieNotice,
    hasGpcReadiness,
    hasUnconsentedTrackers: detectedTrackers.length > 0,
    detectedTrackers,
  };
}

/**
 * Master evaluator: Detects jurisdiction and runs tailored legal checks with a region-appropriate compliance score.
 */
export function evaluateSiteDataRegulation(
  html: string,
  targetUrl?: string,
  metaLang?: string | null
): DataRegulationDiagnostics {
  const jurisdiction = detectSiteJurisdiction(targetUrl || '', html, undefined, metaLang);

  let tr: TrRegulationDiagnostics | undefined;
  let au: AuRegulationDiagnostics | undefined;
  let eu: EuRegulationDiagnostics | undefined;
  let us: UsRegulationDiagnostics | undefined;
  let gb: GbRegulationDiagnostics | undefined;
  let ca: CaRegulationDiagnostics | undefined;
  let global: GlobalRegulationDiagnostics | undefined;

  let scorePenalty = 0;

  switch (jurisdiction.region) {
    case 'TR': {
      tr = inspectTurkishRegulation(html);
      if (!tr.hasKvkkNotice) scorePenalty += 35;
      if (!tr.hasMersisOrKunye) scorePenalty += 25;
      if (!tr.hasCookiePolicy) scorePenalty += 15;
      if (tr.hasUnconsentedTrackers) scorePenalty += 15;
      if (!tr.hasCommercialMessageConsent) scorePenalty += 10;
      break;
    }
    case 'AU': {
      au = inspectAustralianRegulation(html);
      if (!au.hasPrivacyPolicy) scorePenalty += 35;
      if (!au.hasTermsOfService) scorePenalty += 25;
      if (!au.hasAbnOrAcn) scorePenalty += 20;
      if (!au.hasSpamActConsent) scorePenalty += 10;
      if (au.detectedTrackers.length > 0 && !au.hasPrivacyPolicy) scorePenalty += 10;
      break;
    }
    case 'EU': {
      eu = inspectEuRegulation(html);
      if (!eu.hasPrivacyPolicy) scorePenalty += 25;
      if (eu.hasUnconsentedTrackers) scorePenalty += 25;
      if (!eu.hasImpressumOrLegal) scorePenalty += 20;
      if (!eu.hasCookiePolicy) scorePenalty += 10;
      if (eu.hasExternalFontTransfer) scorePenalty += 10;
      break;
    }
    case 'GB': {
      gb = inspectUkRegulation(html);
      if (!gb.hasPrivacyPolicy) scorePenalty += 30;
      if (gb.hasUnconsentedTrackers) scorePenalty += 25;
      if (!gb.hasCompanyRegistration) scorePenalty += 20;
      if (!gb.hasTermsOfService) scorePenalty += 15;
      if (!gb.hasCookieConsent) scorePenalty += 10;
      break;
    }
    case 'US': {
      us = inspectUsRegulation(html);
      if (!us.hasUsStatePrivacyNotice) scorePenalty += 30;
      if (us.hasUnconsentedTrackers) scorePenalty += 25;
      if (!us.hasTermsOfService) scorePenalty += 25;
      if (!us.hasDoNotSellOrShare && us.detectedTrackers.length > 0) scorePenalty += 20;
      break;
    }
    case 'CA': {
      ca = inspectCanadianRegulation(html);
      if (!ca.hasPrivacyPolicy) scorePenalty += 35;
      if (!ca.hasTermsOfService) scorePenalty += 25;
      if (!ca.hasCaslConsent) scorePenalty += 20;
      if (ca.detectedTrackers.length > 0 && !ca.hasPrivacyPolicy) scorePenalty += 15;
      break;
    }
    default: {
      global = inspectGlobalRegulation(html);
      if (!global.hasPrivacyPolicy) scorePenalty += 35;
      if (!global.hasTermsOfService) scorePenalty += 30;
      if (!global.hasCookieNotice) scorePenalty += 20;
      if (global.detectedTrackers.length > 0 && !global.hasPrivacyPolicy) scorePenalty += 15;
      break;
    }
  }

  // Also populate secondary EU / US objects if cross-border signals exist
  if (!eu && (jurisdiction.region !== 'EU')) {
    eu = inspectEuRegulation(html);
  }
  if (!us && (jurisdiction.region !== 'US')) {
    us = inspectUsRegulation(html);
  }

  const overallComplianceScore = Math.max(0, Math.min(100, Math.round(100 - scorePenalty)));

  return {
    jurisdiction,
    tr,
    au,
    eu,
    us,
    gb,
    ca,
    global,
    overallComplianceScore,
  };
}
