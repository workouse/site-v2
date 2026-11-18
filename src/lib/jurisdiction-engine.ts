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

// ─────────────────────────────────────────────────────────────────────────────
// Universal Multi-Jurisdiction Signal Extractors
// ─────────────────────────────────────────────────────────────────────────────

function extractCorporateSuffixSignals(html: string): ScoredSignal[] {
  const signals: ScoredSignal[] = [];

  // Australia: Pty Ltd, Pty. Ltd., Proprietary Limited, No Liability, NL
  if (/\b(?:Pty\.?\s*Ltd\.?|Proprietary\s+Limited|No\s+Liability|\bNL\b)\b/i.test(html)) {
    signals.push({ countryCode: 'AU', score: 35, reason: 'Australian corporate suffix (Pty Ltd / Proprietary Limited)' });
  }

  // Turkey: A.Ş., Ltd. Şti., Anonim Şirketi, Limited Şirketi, etc.
  if (/\b(?:A\.?Ş\.?|A\.?S\.?|Anonim\s+[SŞsş]irketi|Ltd\.?\s*[SŞsş]ti\.?|Limited\s+[SŞsş]irketi|Kollektif\s+[SŞsş]irketi|Komandit\s+[SŞsş]irketi)\b/i.test(html)) {
    signals.push({ countryCode: 'TR', score: 35, reason: 'Turkish corporate entity form (A.Ş. / Ltd. Şti.)' });
  }

  // Germany / DACH: GmbH, AG, UG, GmbH & Co. KG, OHG, e.K.
  if (/\b(?:GmbH\s*&\s*Co\.?\s*KG|GmbH|AG|UG\s*\([^)]+\)|OHG|e\.K\.)\b/i.test(html)) {
    signals.push({ countryCode: 'DE', score: 35, reason: 'German/Austrian corporate form (GmbH / AG / UG)' });
  }

  // France: SAS, SASU, SARL, SA, EURL
  if (/\b(?:SASU|SAS|SARL|SA|EURL)\b/.test(html)) {
    signals.push({ countryCode: 'FR', score: 35, reason: 'French corporate entity form (SAS / SARL / SA)' });
  }

  // Netherlands: B.V., N.V.
  if (/\b(?:B\.V\.|N\.V\.)\b/i.test(html)) {
    signals.push({ countryCode: 'NL', score: 35, reason: 'Dutch corporate form (B.V. / N.V.)' });
  }

  // Spain: S.L., S.A., S.L.U.
  if (/\b(?:S\.L\.|S\.A\.|S\.L\.U\.)\b/i.test(html)) {
    signals.push({ countryCode: 'ES', score: 35, reason: 'Spanish corporate entity form (S.L. / S.A.)' });
  }

  // Italy: S.r.l., S.p.A., Srl, SpA
  if (/\b(?:S\.r\.l\.|S\.p\.A\.|Srl|SpA)\b/i.test(html)) {
    signals.push({ countryCode: 'IT', score: 35, reason: 'Italian corporate form (S.r.l. / S.p.A.)' });
  }

  // United Kingdom: Plc, Public Limited Company, LLP, CIC
  if (/\b(?:Plc|Public\s+Limited\s+Company|LLP|CIC)\b/i.test(html)) {
    signals.push({ countryCode: 'GB', score: 35, reason: 'UK corporate form (Plc / LLP / CIC)' });
  } else if (/\b(?:Ltd\.?|Limited)\b/i.test(html)) {
    signals.push({ countryCode: 'GB', score: 20, reason: 'Common corporate designation (Ltd / Limited)' });
  }

  // United States: LLC, L.L.C., Inc., Incorporated, Corp., Corporation
  if (/\b(?:LLC|L\.L\.C\.|Inc\.?|Incorporated|Corp\.?|Corporation)\b/i.test(html)) {
    signals.push({ countryCode: 'US', score: 25, reason: 'US corporate entity designation (LLC / Inc / Corp)' });
  }

  // Canada: Ltée, Limitée, ULC, S.E.N.C.
  if (/\b(?:Ltée|Limitée|ULC|S\.E\.N\.C\.)\b/i.test(html)) {
    signals.push({ countryCode: 'CA', score: 35, reason: 'Canadian provincial corporate form (Ltée / ULC)' });
  }

  return signals;
}

function extractRegistrationIdSignals(html: string): ScoredSignal[] {
  const signals: ScoredSignal[] = [];

  // Australia: ABN & ACN
  const hasAbn = Boolean(
    html.match(/\b(?:ABN|Australian\s+Business\s+Number)\s*[:#.-]?\s*(\d{2}\s*\d{3}\s*\d{3}\s*\d{3}|\d{11})\b/i) ||
    html.match(/ABN\s*:\s*\d+/i)
  );
  const hasAcn = Boolean(
    html.match(/\b(?:ACN|Australian\s+Company\s+Number)\s*[:#.-]?\s*(\d{3}\s*\d{3}\s*\d{3}|\d{9})\b/i) ||
    html.match(/ACN\s*:\s*\d+/i)
  );
  if (hasAbn) signals.push({ countryCode: 'AU', score: 45, reason: 'Australian Business Number (ABN) detected' });
  if (hasAcn) signals.push({ countryCode: 'AU', score: 40, reason: 'Australian Company Number (ACN) detected' });

  // Turkey: MERSİS, VKN, Ticaret Sicil
  const hasMersis = Boolean(html.match(/\bmers[iıİI]s\s*(?:no|numaras[ıiİI])?\s*[:.-]?\s*(0?\d{16})\b/i));
  const hasVkn = Boolean(html.match(/\b(?:vkn|vergi\s*kimlik\s*no)\s*[:.-]?\s*(\d{10})\b/i));
  const hasTicaretSicil = Boolean(html.match(/\bticaret\s*sicil\s*(?:no|numaras[ıiİI]|memurlu[gğ]u)?\s*[:.-]?\s*\d+\b/i));
  if (hasMersis) signals.push({ countryCode: 'TR', score: 45, reason: 'Turkish MERSİS registration number detected' });
  if (hasVkn) signals.push({ countryCode: 'TR', score: 35, reason: 'Turkish Tax Number (VKN) detected' });
  if (hasTicaretSicil) signals.push({ countryCode: 'TR', score: 30, reason: 'Turkish Commercial Registry (Ticaret Sicil) detected' });

  // Germany / DACH: HRB / HRA / Amtsgericht, USt-IdNr
  const hasHrb = Boolean(html.match(/\b(?:HRB|HRA)\s*\d+\b/i) || html.match(/\bAmtsgericht\s+[A-Za-zäöüÄÖÜß]+/i));
  const hasUStId = Boolean(html.match(/\b(?:USt-IdNr\.?|USt-ID|Umsatzsteuer-ID)\s*[:.-]?\s*(DE\s*\d{9})\b/i));
  if (hasHrb) signals.push({ countryCode: 'DE', score: 45, reason: 'German Commercial Register (HRB/Amtsgericht) detected' });
  if (hasUStId) signals.push({ countryCode: 'DE', score: 40, reason: 'German VAT identification (USt-IdNr) detected' });

  // France: SIREN, SIRET, RCS
  const hasSiren = Boolean(html.match(/\bSIREN\s*[:.-]?\s*(\d{3}\s*\d{3}\s*\d{3}|\d{9})\b/i));
  const hasSiret = Boolean(html.match(/\bSIRET\s*[:.-]?\s*(\d{3}\s*\d{3}\s*\d{3}\s*\d{5}|\d{14})\b/i));
  const hasRcs = Boolean(html.match(/\bRCS\s+[A-Za-zÀ-ÿ]+/i));
  if (hasSiren || hasSiret) signals.push({ countryCode: 'FR', score: 45, reason: 'French Business Registry Number (SIREN/SIRET) detected' });
  if (hasRcs) signals.push({ countryCode: 'FR', score: 35, reason: 'French Commercial Register (RCS) detected' });

  // Netherlands: KvK, BTW
  const hasKvk = Boolean(html.match(/\b(?:KvK|Kamer\s+van\s+Koophandel)\s*(?:nummer|nr\.?)?\s*[:.-]?\s*(\d{8})\b/i));
  const hasBtw = Boolean(html.match(/\b(?:Btw-nummer|Btw-nr\.?)\s*[:.-]?\s*(NL\s*\d{9}B\d{2})\b/i));
  if (hasKvk) signals.push({ countryCode: 'NL', score: 45, reason: 'Dutch Chamber of Commerce (KvK) number detected' });
  if (hasBtw) signals.push({ countryCode: 'NL', score: 40, reason: 'Dutch VAT Number (Btw) detected' });

  // Spain: CIF / NIF
  const hasCif = Boolean(html.match(/\b(?:CIF|NIF)\s*[:.-]?\s*([A-Z]\s*-\s*\d{8}|[A-Z]\d{8})\b/i));
  if (hasCif) signals.push({ countryCode: 'ES', score: 45, reason: 'Spanish Tax ID (CIF/NIF) detected' });

  // Italy: Partita IVA / P.IVA
  const hasPiva = Boolean(html.match(/\b(?:Partita\s+IVA|P\.?\s*IVA)\s*[:.-]?\s*(IT\s*\d{11}|\d{11})\b/i));
  const hasCodiceFiscale = Boolean(html.match(/\bCodice\s+Fiscale\s*[:.-]?\s*[A-Z0-9]{16}\b/i));
  if (hasPiva) signals.push({ countryCode: 'IT', score: 45, reason: 'Italian VAT Number (Partita IVA) detected' });
  if (hasCodiceFiscale) signals.push({ countryCode: 'IT', score: 35, reason: 'Italian Codice Fiscale detected' });

  // United Kingdom: Companies House, VAT
  const hasUkCompanyNo = Boolean(
    html.match(/\b(?:company\s+(?:registration\s+)?(?:no\.?|number)|registered\s+in\s+england\s+(?:and\s+wales)?|companies\s+house)\s*[:.-]?\s*([0-9A-Z]{8})\b/i) ||
    html.match(/registered\s+in\s+england\s+(?:and\s+wales)?/i)
  );
  const hasUkVat = Boolean(html.match(/\bVAT\s*(?:Reg(?:istration)?\.?\s*(?:No\.?|Number)?)?\s*[:.-]?\s*(GB\s*\d{9}|GB\s*\d{3}\s*\d{4}\s*\d{2})\b/i));
  if (hasUkCompanyNo) signals.push({ countryCode: 'GB', score: 45, reason: 'UK Companies House registration statement detected' });
  if (hasUkVat) signals.push({ countryCode: 'GB', score: 40, reason: 'UK VAT Registration Number detected' });

  // United States: EIN, DUNS
  const hasEin = Boolean(html.match(/\bEIN\s*[:.-]?\s*(\d{2}-\d{7})\b/i));
  const hasDuns = Boolean(html.match(/\bDUNS\s*[:.-]?\s*(\d{2}-\d{3}-\d{4})\b/i));
  if (hasEin) signals.push({ countryCode: 'US', score: 35, reason: 'US Employer Identification Number (EIN) detected' });
  if (hasDuns) signals.push({ countryCode: 'US', score: 30, reason: 'Dun & Bradstreet (DUNS) identifier detected' });

  // Canada: CRA BN, NEQ
  const hasCraBn = Boolean(html.match(/\b(?:Business\s+Number|CRA\s+BN)\s*[:.-]?\s*(\d{9}\s*RC\s*\d{4}|\d{9})\b/i));
  const hasNeq = Boolean(html.match(/\bNEQ\s*[:.-]?\s*(\d{10})\b/i));
  if (hasCraBn) signals.push({ countryCode: 'CA', score: 45, reason: 'Canada Revenue Agency Business Number (CRA BN) detected' });
  if (hasNeq) signals.push({ countryCode: 'CA', score: 40, reason: 'Quebec Enterprise Number (NEQ) detected' });

  // New Zealand: NZBN
  const hasNzbn = Boolean(html.match(/\bNZBN\s*[:.-]?\s*(9429\d{9})\b/i));
  if (hasNzbn) signals.push({ countryCode: 'NZ', score: 45, reason: 'New Zealand Business Number (NZBN) detected' });

  return signals;
}

function extractStatutoryKeywordsSignals(html: string): ScoredSignal[] {
  const signals: ScoredSignal[] = [];

  // Australia
  if (/\b(?:australian\s+consumer\s+law|privacy\s+act\s+1988|australian\s+privacy\s+principles|australian\s+government|commonwealth\s+of\s+australia|spam\s+act\s+2003)\b/i.test(html)) {
    signals.push({ countryCode: 'AU', score: 30, reason: 'Australian statutory reference (ACL / Privacy Act 1988 / Australian Gov)' });
  }

  // Turkey
  if (/\b(?:kvkk|6698\s+say[ıiİI]l[ıiİI]|ki[sşSŞ]isel\s+verilerin\s+korunmas[ıiİI]|ayd[ıiİI]nlatma\s+metni|mesafeli\s+sat[ıiİI][sşSŞ]|ttk\s+madde\s+39|[sşSŞ]irket\s+k[uüUÜ]nyesi|[iİI]ys\.org\.tr|etbis|ticaret\s+bakanl[ıiİI][gğ]ı)\b/i.test(html)) {
    signals.push({ countryCode: 'TR', score: 30, reason: 'KVKK / TTK / Turkish E-Commerce statutory references detected' });
  }

  // Germany / EU
  if (/\b(?:impressum|datenschutzerkl[äa]rung|§\s*5\s*(?:tmg|ddg)|tdddg|dsgvo|widerrufsbelehrung|handelsregister)\b/i.test(html)) {
    signals.push({ countryCode: 'DE', score: 30, reason: 'German Telemedia / DSGVO legal terms (Impressum / § 5 DDG)' });
  }

  // France / EU
  if (/\b(?:mentions\s+l[ée]gales|politique\s+de\s+confidentialit[ée]|rgpd|loi\s+informatique\s+et\s+libert[ée]s)\b/i.test(html)) {
    signals.push({ countryCode: 'FR', score: 30, reason: 'French legal terms (Mentions Légales / RGPD)' });
  }

  // Spain / EU
  if (/\b(?:aviso\s+legal|pol[íi]tica\s+de\s+privacidad|lopdgdd|lssi-ce)\b/i.test(html)) {
    signals.push({ countryCode: 'ES', score: 30, reason: 'Spanish legal disclosures (Aviso Legal / LOPDGDD)' });
  }

  // Italy / EU
  if (/\b(?:note\s+legali|informativa\s+privacy|codice\s+privacy)\b/i.test(html)) {
    signals.push({ countryCode: 'IT', score: 30, reason: 'Italian legal terms (Note Legali / Codice Privacy)' });
  }

  // United Kingdom
  if (/\b(?:data\s+protection\s+act\s+2018|uk\s+gdpr|pecr|companies\s+act\s+2006|information\s+commissioner(?:'s)?\s+office)\b/i.test(html)) {
    signals.push({ countryCode: 'GB', score: 30, reason: 'UK statutory references (DPA 2018 / PECR / Companies Act)' });
  }

  // United States
  if (/\b(?:do\s+not\s+sell\s+or\s+share|california\s+consumer\s+privacy\s+act|your\s+california\s+privacy\s+rights|ccpa|cpra|global\s+privacy\s+control)\b/i.test(html)) {
    signals.push({ countryCode: 'US', score: 30, reason: 'US Privacy statutory references (CCPA / CPRA / Do Not Sell)' });
  }

  // Canada
  if (/\b(?:pipeda|personal\s+information\s+protection\s+and\s+electronic\s+documents|casl|canadian\s+anti-spam|loi\s+25)\b/i.test(html)) {
    signals.push({ countryCode: 'CA', score: 30, reason: 'Canadian privacy & anti-spam references (PIPEDA / CASL)' });
  }

  // New Zealand
  if (/\b(?:privacy\s+act\s+2020|fair\s+trading\s+act\s+1986|consumer\s+guarantees\s+act)\b/i.test(html)) {
    signals.push({ countryCode: 'NZ', score: 30, reason: 'New Zealand statutory references (Privacy Act 2020 / CGA)' });
  }

  return signals;
}

function extractGeographicAndPhoneSignals(html: string): ScoredSignal[] {
  const signals: ScoredSignal[] = [];

  // Australia
  const hasAuPostcode = Boolean(html.match(/\b(?:NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\s+\d{4}\b/i));
  const hasAuCities = Boolean(html.match(/\b(?:Sydney|Melbourne|Brisbane|Perth|Adelaide|Gold\s+Coast|Canberra|Hobart|Darwin)\b/i));
  const hasAuPhone = Boolean(html.match(/(?:\+61|02|03|07|08|1300|1800)\s*[\d\s()-]{6,12}/));
  if (hasAuPostcode || (hasAuCities && hasAuPhone)) {
    signals.push({ countryCode: 'AU', score: 25, reason: 'Australian state postal code or phone prefix (+61/1300/1800)' });
  }

  // Turkey
  const hasTrCity = Boolean(html.match(/\b(?:[İI]stanbul|Ankara|[İI]zmir|Bursa|Antalya|Maslak|Kad[ıiİI]k[öoÖO]y|Levent|[ÇC]ankaya|[ŞS]i[sşSŞ]li|Be[sşSŞ]ikta[sşSŞ])\b/i));
  const hasTrPhone = Boolean(html.match(/(?:\+90|0850|0212|0216|0312|0232|0224|0242)\s*[\d\s()-]{7,12}/));
  if (hasTrCity && hasTrPhone) {
    signals.push({ countryCode: 'TR', score: 25, reason: 'Turkish city and national phone prefix (+90 / 0850 / 0212)' });
  } else if (hasTrPhone) {
    signals.push({ countryCode: 'TR', score: 20, reason: 'Turkish phone number prefix (+90 / 0850)' });
  }

  // United Kingdom
  const hasUkPostcode = Boolean(html.match(/\b[A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2}\b/i));
  const hasUkPhone = Boolean(html.match(/(?:\+44|020|0161|0121|0131|0800|0808)\s*[\d\s()-]{6,12}/));
  if (hasUkPostcode) {
    signals.push({ countryCode: 'GB', score: 25, reason: 'UK standard postcode format detected' });
  }
  if (hasUkPhone) {
    signals.push({ countryCode: 'GB', score: 20, reason: 'UK national telephone dialing prefix (+44 / 020 / 0800)' });
  }

  // United States
  const hasUsZip = Boolean(html.match(/\b(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\s+\d{5}(?:-\d{4})?\b/));
  const hasUsCity = Boolean(html.match(/\b(?:New\s+York|San\s+Francisco|Los\s+Angeles|Austin|Seattle|Chicago|Boston|Denver|Atlanta)\b/i));
  if (hasUsZip) {
    signals.push({ countryCode: 'US', score: 25, reason: 'US state abbreviation with 5-digit ZIP code detected' });
  } else if (hasUsCity) {
    signals.push({ countryCode: 'US', score: 15, reason: 'Major US metro location detected' });
  }

  // Canada
  const hasCaPostal = Boolean(html.match(/\b[A-CEGHJ-NPR-TVXY]\d[A-CEGHJ-NPR-TV-Z]\s*\d[A-CEGHJ-NPR-TV-Z]\d\b/i));
  const hasCaProvince = Boolean(html.match(/\b(?:ON|BC|QC|AB|MB|SK|NS|NB|NL|PE|YT|NT|NU)\b/));
  if (hasCaPostal) {
    signals.push({ countryCode: 'CA', score: 25, reason: 'Canadian alphanumeric postal code (A1A 1A1) detected' });
  } else if (hasCaProvince) {
    signals.push({ countryCode: 'CA', score: 15, reason: 'Canadian province abbreviation detected' });
  }

  // DACH / EU Phones
  if (/(?:\+49|\+43|\+41)\s*[\d\s()-]{6,14}/.test(html)) {
    signals.push({ countryCode: 'DE', score: 20, reason: 'DACH telephone dialing prefix (+49 / +43 / +41)' });
  }
  if (/\+33\s*[\d\s()-]{6,14}/.test(html)) {
    signals.push({ countryCode: 'FR', score: 20, reason: 'French telephone dialing prefix (+33)' });
  }
  if (/\+31\s*[\d\s()-]{6,14}/.test(html)) {
    signals.push({ countryCode: 'NL', score: 20, reason: 'Dutch telephone dialing prefix (+31)' });
  }
  if (/\+34\s*[\d\s()-]{6,14}/.test(html)) {
    signals.push({ countryCode: 'ES', score: 20, reason: 'Spanish telephone dialing prefix (+34)' });
  }
  if (/\+39\s*[\d\s()-]{6,14}/.test(html)) {
    signals.push({ countryCode: 'IT', score: 20, reason: 'Italian telephone dialing prefix (+39)' });
  }

  return signals;
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
    } else if (langMatch.startsWith('es')) {
      signals.push({ countryCode: 'ES', score: 25, reason: `HTML language (lang="${langMatch}")` });
    } else if (langMatch.startsWith('it')) {
      signals.push({ countryCode: 'IT', score: 25, reason: `HTML language (lang="${langMatch}")` });
    } else if (langMatch.startsWith('nl')) {
      signals.push({ countryCode: 'NL', score: 25, reason: `HTML language (lang="${langMatch}")` });
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
    } else if (rawVal === 'FR' || rawVal === 'FRA' || rawVal === 'FRANCE') {
      signals.push({ countryCode: 'FR', score: 35, reason: `Schema.org addressCountry ("${addressCountryMatch[1]}")` });
    } else if (rawVal === 'NL' || rawVal === 'NLD' || rawVal === 'NETHERLANDS') {
      signals.push({ countryCode: 'NL', score: 35, reason: `Schema.org addressCountry ("${addressCountryMatch[1]}")` });
    } else if (rawVal === 'ES' || rawVal === 'ESP' || rawVal === 'SPAIN' || rawVal === 'ESPAÑA') {
      signals.push({ countryCode: 'ES', score: 35, reason: `Schema.org addressCountry ("${addressCountryMatch[1]}")` });
    } else if (rawVal === 'IT' || rawVal === 'ITA' || rawVal === 'ITALY' || rawVal === 'ITALIA') {
      signals.push({ countryCode: 'IT', score: 35, reason: `Schema.org addressCountry ("${addressCountryMatch[1]}")` });
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

  // ── Signal 4: Universal Corporate Forms, Business IDs, Statutory & Geo Signals ─
  signals.push(...extractCorporateSuffixSignals(html));
  signals.push(...extractRegistrationIdSignals(html));
  signals.push(...extractStatutoryKeywordsSignals(html));
  signals.push(...extractGeographicAndPhoneSignals(html));

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
    html.match(/href=["'][^"']*(terms|terms-and-conditions|terms-of-use|conditions-of-use|terms-of-service|disclaimer)[^"']*["']/i) ||
    html.match(/>\s*(terms of service|terms and conditions|terms of use|terms & conditions|disclaimer)\s*</i)
  );

  // 3. ABN / ACN Disclosure
  const abnMatch = html.match(/(?:ABN|Australian\s+Business\s+Number)\s*[:#.-]?\s*(\d{2}\s*\d{3}\s*\d{3}\s*\d{3}|\d{11})/i) || html.match(/ABN\s*[:.-]?\s*(\d+)/i);
  const acnMatch = html.match(/(?:ACN|Australian\s+Company\s+Number)\s*[:#.-]?\s*(\d{3}\s*\d{3}\s*\d{3}|\d{9})/i) || html.match(/ACN\s*[:.-]?\s*(\d+)/i);
  const hasAbnOrAcn = Boolean(abnMatch || acnMatch);

  // 4. Spam Act 2003 consent / direct marketing unsubscribe
  const hasSpamActConsent = Boolean(
    html.match(/unsubscribe|opt-out|marketing consent|direct marketing/i) ||
    privacyMatch
  );

  const detectedTrackers = detectTrackers(html);
  let abnNumber: string | null = null;
  if (abnMatch) {
    const raw = abnMatch[1].replace(/\s+/g, '');
    if (raw.length === 11) {
      abnNumber = `${raw.slice(0, 2)} ${raw.slice(2, 5)} ${raw.slice(5, 8)} ${raw.slice(8, 11)}`;
    } else {
      abnNumber = abnMatch[1].replace(/\s+/g, ' ');
    }
  }

  let acnNumber: string | null = null;
  if (acnMatch) {
    const raw = acnMatch[1].replace(/\s+/g, '');
    if (raw.length === 9) {
      acnNumber = `${raw.slice(0, 3)} ${raw.slice(3, 6)} ${raw.slice(6, 9)}`;
    } else {
      acnNumber = acnMatch[1].replace(/\s+/g, ' ');
    }
  }

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
