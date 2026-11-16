/**
 * Centralized site copy and destination register for the Workouse redesign.
 *
 * Source of truth: `site-content.json` (WOR-3).
 * - Keep the booking appointment URL exclusively in `links.booking.href` so it
 *   can be replaced in one place before launch.
 * - External destinations carry `external: true` so link primitives can add
 *   `target="_blank" rel="noopener noreferrer"` and accessible new-tab copy.
 */

export interface DestinationLink {
  readonly href: string;
  readonly label?: string;
  readonly external?: boolean;
  readonly proposed?: boolean;
  readonly note?: string;
}

export interface LabeledDestinationLink extends DestinationLink {
  readonly label: string;
}

export interface MediaImage {
  readonly src: string;
  readonly alt: string;
}

/**
 * Complete destination register for internal routes, mailto links, booking CTA,
 * client sites, studio products, and team member sites.
 */
export const links = {
  booking: {
    href: 'https://calendar.google.com/calendar/u/1?cid=Y18xNTczMmM4MjAwYTMzOWNhZWFiZDg3MzIyZGNiYjc1NDkxNzU3MThhYTFkYzAwNjUxZWM5MDczOTRkZWU4NGE5QGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20',
    external: true,
    note: 'LAUNCH BLOCKER: not a public scheduler; replace with signed-out-testable appointment URL',
  },
  email: {
    href: 'mailto:emre@workouse.com',
    label: 'emre@workouse.com',
  },
  phpSymfony: {
    href: '/services/php-symfony',
    label: 'PHP & Symfony Development',
    proposed: true,
  },
  shopify: {
    href: '/services/shopify',
    label: 'Shopify Development',
    proposed: true,
  },
  work: {
    href: '/work',
    label: 'Work',
    proposed: true,
  },
  products: {
    href: '/products',
    label: 'Products',
    proposed: true,
  },
  about: {
    href: '/about',
    label: 'About',
    proposed: true,
  },
  blog: {
    href: '/blog',
    label: 'Blog',
  },
  audit: {
    href: '/#audit',
    label: 'Website Audit',
    note: 'move to dedicated route before homepage replacement',
  },
  privacy: {
    href: '/privacy',
    label: 'Privacy Policy',
  },
  terms: {
    href: '/terms',
    label: 'Terms of Service',
  },
  impressum: {
    href: '/impressum',
    label: 'Impressum / Legal Notice',
  },
  sevenCups: {
    href: 'https://7cups.com',
    label: '7cups',
    external: true,
  },
  carreb: {
    href: 'https://www.carreb.com.au/',
    label: 'Carreb',
    external: true,
  },
  helloCake: {
    href: 'https://hellocake.com',
    label: 'Hello Cake',
    external: true,
  },
  bitig: {
    href: 'https://bitig.emre.xyz',
    label: 'Bitig',
    external: true,
  },
  groundBox: {
    href: 'https://groundbox.emre.xyz',
    label: 'GroundBox',
    external: true,
  },
  ula: {
    href: 'https://ulasocial.com',
    label: 'Ula',
    external: true,
  },
  emre: {
    href: 'https://emre.xyz',
    label: 'emre.xyz',
    external: true,
  },
  altinciKat: {
    href: 'https://altincikat.com',
    label: 'altincikat.com',
    external: true,
  },
} as const satisfies Record<string, DestinationLink>;

export type LinkKey = keyof typeof links;
export type LabeledLinkKey = Exclude<LinkKey, 'booking'>;

export interface LinkReference<K extends LinkKey = LinkKey> {
  readonly label: string;
  readonly ref: K;
  readonly external?: boolean;
}

export interface ResolvedLink {
  readonly href: string;
  readonly label?: string;
  readonly external: boolean;
  readonly proposed: boolean;
  readonly note?: string;
}

export interface ResolvedLabeledLink extends ResolvedLink {
  readonly label: string;
}

export function resolveLink(ref: LabeledLinkKey, labelOverride?: string): ResolvedLabeledLink;
export function resolveLink(ref: LinkKey, labelOverride: string): ResolvedLabeledLink;
export function resolveLink(ref: LinkKey, labelOverride?: string): ResolvedLink;
export function resolveLink(ref: LinkKey, labelOverride?: string): ResolvedLink {
  const entry: DestinationLink = links[ref];
  return {
    href: entry.href,
    label: labelOverride ?? entry.label,
    external: Boolean(entry.external),
    proposed: Boolean(entry.proposed),
    ...(entry.note ? { note: entry.note } : {}),
  };
}

export type NavDesktopDisclosure = {
  readonly type: 'disclosure';
  readonly label: string;
  readonly panelEyebrow: string;
  readonly items: readonly LabeledLinkKey[];
};

export type NavDesktopLink = {
  readonly type: 'link';
  readonly ref: LabeledLinkKey;
};

export type NavDesktopItem = NavDesktopDisclosure | NavDesktopLink;

export type NavMobileGroup = {
  readonly eyebrow: string;
  readonly items: readonly LabeledLinkKey[];
};

export type NavMobileCta = {
  readonly cta: string;
  readonly ref: 'booking';
  readonly external: true;
};

export type NavMobileEntry = NavMobileGroup | NavMobileCta;

export interface NavContent {
  readonly desktop: readonly NavDesktopItem[];
  readonly cta: LinkReference<'booking'> & { readonly external: true };
  readonly mobileMenu: readonly NavMobileEntry[];
  readonly mobileToggle: {
    readonly closed: string;
    readonly open: string;
    readonly icon: string;
  };
}

export const nav: NavContent = {
  desktop: [
    {
      type: 'disclosure',
      label: 'Services',
      panelEyebrow: 'SPECIALIST ENGINEERING',
      items: ['phpSymfony', 'shopify'],
    },
    { type: 'link', ref: 'work' },
    { type: 'link', ref: 'products' },
    { type: 'link', ref: 'about' },
    {
      type: 'disclosure',
      label: 'Resources',
      panelEyebrow: 'RESOURCES',
      items: ['audit'],
    },
    { type: 'link', ref: 'blog' },
  ],
  cta: {
    label: 'Book a discovery call',
    ref: 'booking',
    external: true,
  },
  mobileMenu: [
    {
      eyebrow: 'SERVICES',
      items: ['phpSymfony', 'shopify', 'work', 'products', 'about'],
    },
    {
      eyebrow: 'RESOURCES',
      items: ['audit', 'blog'],
    },
    {
      cta: 'Book a discovery call ↗',
      ref: 'booking',
      external: true,
    },
  ],
  mobileToggle: {
    closed: 'Menu',
    open: 'Close',
    icon: '☰',
  },
};

export interface HeroContent {
  readonly eyebrow: string;
  readonly headingLines: readonly [string, string];
  readonly body: string;
  readonly primaryCta: LinkReference<'booking'> & { readonly external: true };
  readonly secondaryCta: LinkReference<'work'>;
  readonly footnote: string;
}

export const hero: HeroContent = {
  eyebrow: 'INDEPENDENT SOFTWARE ENGINEERING',
  headingLines: ['Good software', 'keeps evolving.'],
  body: 'We modernize and extend the software your business depends on. From PHP and Symfony applications to custom Shopify experiences, we build reliable solutions that keep moving forward.',
  primaryCta: {
    label: 'Book a discovery call',
    ref: 'booking',
    external: true,
  },
  secondaryCta: {
    label: 'Explore our work',
    ref: 'work',
  },
  footnote: 'PHP & SYMFONY   /   SHOPIFY',
};

export interface ClientStripItem {
  readonly name: string;
  readonly logo: string | null;
  readonly pendingCaption: string;
}

export interface ClientStripContent {
  readonly label: readonly [string, string];
  readonly clients: readonly ClientStripItem[];
}

export const clientStrip: ClientStripContent = {
  label: ['Selected companies', 'we’ve worked with'],
  clients: [
    { name: '7cups', logo: null, pendingCaption: 'LOGO PENDING' },
    { name: 'Carreb', logo: null, pendingCaption: 'LOGO PENDING' },
    { name: 'Hello Cake', logo: null, pendingCaption: 'LOGO PENDING' },
  ],
};

export interface PhpServiceContent {
  readonly eyebrow: string;
  readonly headingLines: readonly [string, string];
  readonly body: string;
  readonly listA: readonly string[];
  readonly listB: readonly string[];
  readonly link: LinkReference<'phpSymfony'>;
}

export interface ShopifyServiceContent {
  readonly eyebrow: string;
  readonly status: string;
  readonly headingLines: readonly [string, string];
  readonly body: string;
  readonly list: readonly string[];
  readonly link: LinkReference<'shopify'>;
}

export interface ServicesContent {
  readonly eyebrow: string;
  readonly php: PhpServiceContent;
  readonly shopify: ShopifyServiceContent;
}

export const services: ServicesContent = {
  eyebrow: '01 / TWO SPECIALISMS. ONE ENGINEERING MINDSET.',
  php: {
    eyebrow: 'PHP & SYMFONY ENGINEERING',
    headingLines: ['Keep your software', 'moving forward.'],
    body: 'Modernize legacy PHP applications and extend existing Symfony platforms without losing the systems your business already relies on.',
    listA: [
      'Legacy PHP modernization',
      'Symfony application development',
      'Ongoing feature development',
      'Framework and dependency upgrades',
    ],
    listB: [
      'Architecture improvements',
      'API development and integrations',
      'Performance and maintainability improvements',
      'Long-term engineering support',
    ],
    link: {
      label: 'Explore PHP & Symfony services',
      ref: 'phpSymfony',
    },
  },
  shopify: {
    eyebrow: 'SHOPIFY ENGINEERING',
    status: 'Shopify Partner',
    headingLines: ['Shopify, shaped', 'around your business.'],
    body: 'Custom storefront experiences, theme development, and extensions built for the way your business actually operates.',
    list: [
      'Shopify theme development',
      'Storefront customization',
      'Custom Shopify apps',
      'Admin and checkout extensions where supported',
      'Custom integrations',
      'Ongoing store development',
    ],
    link: {
      label: 'Explore Shopify services',
      ref: 'shopify',
    },
  },
};

export interface HomeEngagementItem {
  readonly index: string;
  readonly client: string;
  readonly summary: string;
  readonly tags: string;
  readonly href: string;
  readonly external: true;
  readonly linkLabel: string;
  readonly screenshotLabel: string;
  readonly logo?: string | null;
  readonly screenshot?: MediaImage | null;
}

export interface EngagementsHomeContent {
  readonly eyebrow: string;
  readonly headingLines: readonly [string, string];
  readonly items: readonly HomeEngagementItem[];
}

export const engagementsHome: EngagementsHomeContent = {
  eyebrow: '02 / SELECTED CLIENT ENGAGEMENTS',
  headingLines: ['Real software.', 'Ongoing partnerships.'],
  items: [
    {
      index: '01',
      client: '7cups',
      summary:
        'Modernization and ongoing development of web application architecture using Symfony and React.',
      tags: 'Symfony / React / Application Modernization',
      href: links.sevenCups.href,
      external: true,
      linkLabel: 'Visit 7cups ↗',
      screenshotLabel: 'Approved 7cups capture',
    },
    {
      index: '02',
      client: 'Carreb',
      summary:
        'Development and engineering support for a SaaS platform using Symfony backends and React frontends.',
      tags: 'Symfony / React / SaaS Development',
      href: links.carreb.href,
      external: true,
      linkLabel: 'Visit Carreb ↗',
      screenshotLabel: 'Approved Carreb capture',
    },
    {
      index: '03',
      client: 'Hello Cake',
      summary:
        'Shopify storefront development, theme engineering, custom extensions, and platform integrations.',
      tags: 'Shopify / Theme Development / Custom Extensions',
      href: links.helloCake.href,
      external: true,
      linkLabel: 'Visit Hello Cake ↗',
      screenshotLabel: 'Approved Hello Cake capture',
    },
  ],
};

export type WorkEngagementLayout = 'featured' | 'standard' | 'compact';
export type WorkFilterId =
  | 'all'
  | 'php-symfony'
  | 'shopify'
  | 'engineering-integrations';

export interface WorkEngagementItem {
  readonly client: string;
  readonly layout: WorkEngagementLayout;
  readonly category: string;
  readonly headline: string;
  readonly description: string;
  readonly technologies: string;
  readonly href: string;
  readonly external: true;
  readonly screenshotLabel: string;
  readonly filters: readonly WorkFilterId[];
  readonly logo?: string | null;
  readonly screenshot?: MediaImage | null;
}

export const engagementsWork: readonly WorkEngagementItem[] = [
  {
    client: '7cups',
    layout: 'featured',
    category: 'PHP / Symfony / Application Modernization',
    headline: 'Evolving an established platform.',
    description:
      'Engineering and modernization work across an established web platform, including Symfony backend development and React-based application functionality.',
    technologies: 'PHP · Symfony · React',
    href: links.sevenCups.href,
    external: true,
    screenshotLabel: '7cups — Website / Application Screenshot',
    filters: ['all', 'php-symfony'],
  },
  {
    client: 'Carreb',
    layout: 'standard',
    category: 'Symfony / SaaS Engineering',
    headline: 'Building and supporting modern software platforms.',
    description:
      'Development and engineering support for a SaaS platform, combining Symfony backend development with React frontend implementation and quality assurance.',
    technologies: 'Symfony · React · SaaS · QA',
    href: links.carreb.href,
    external: true,
    screenshotLabel: 'Carreb — Platform Screenshot',
    filters: ['all', 'php-symfony'],
  },
  {
    client: 'Hello Cake',
    layout: 'compact',
    category: 'Shopify Engineering',
    headline: 'Custom commerce experiences beyond the standard theme.',
    description:
      'Shopify theme engineering, storefront customization, custom extensions, and platform integrations supporting specialized commerce requirements.',
    technologies:
      'Shopify · Theme Development · Custom Extensions · Integrations',
    href: links.helloCake.href,
    external: true,
    screenshotLabel: 'Hello Cake — Shopify Storefront Screenshot',
    filters: ['all', 'shopify', 'engineering-integrations'],
  },
];

export interface EngagementsContent {
  readonly home: EngagementsHomeContent;
  readonly work: readonly WorkEngagementItem[];
}

export const engagements: EngagementsContent = {
  home: engagementsHome,
  work: engagementsWork,
};

export interface FeaturedProduct {
  readonly eyebrow: string;
  readonly name: string;
  readonly body: string;
  readonly href: string;
  readonly external: true;
  readonly linkLabel: string;
  readonly placeholder: readonly [string, string];
  readonly screenshot?: MediaImage | null;
}

export interface SupportingProduct {
  readonly name: string;
  readonly body: string;
  readonly href: string;
  readonly external: true;
  readonly linkLabel: string;
  readonly placeholder: string;
  readonly screenshot?: MediaImage | null;
}

export interface ProductsContent {
  readonly eyebrow: string;
  readonly heading: string;
  readonly intro: string;
  readonly featured: FeaturedProduct;
  readonly supporting: readonly SupportingProduct[];
}

export const products: ProductsContent = {
  eyebrow: '03 / PRODUCTS FROM OUR STUDIO',
  heading: 'Curiosity, put to work.',
  intro:
    'Alongside client work, we build our own products. A place to explore ideas through practical software.',
  featured: {
    eyebrow: 'FEATURED PRODUCT',
    name: 'Bitig',
    body: 'A developer-focused task and project management platform built around practical engineering workflows.',
    href: links.bitig.href,
    external: true,
    linkLabel: 'Explore Bitig ↗',
    placeholder: [
      'BITIG / APPLICATION SCREENSHOT',
      'Placeholder — approved capture to be supplied',
    ],
  },
  supporting: [
    {
      name: 'GroundBox',
      body: 'A venue-based digital jukebox experience that lets guests request music and interact with the atmosphere around them.',
      href: links.groundBox.href,
      external: true,
      linkLabel: 'Explore GroundBox ↗',
      placeholder: 'Approved GroundBox capture to be supplied',
    },
    {
      name: 'Ula',
      body: 'A location-based social discovery experience designed to help people connect safely in the same physical space.',
      href: links.ula.href,
      external: true,
      linkLabel: 'Explore Ula ↗',
      placeholder: 'Approved Ula capture to be supplied',
    },
  ],
};

export interface TeamMember {
  readonly name: string;
  readonly role: string;
  readonly bio: string;
  readonly focus?: string;
  readonly verificationNote?: string;
  readonly href: string;
  readonly external: true;
  readonly linkLabel: string;
  readonly photo: string | null;
  readonly alt?: string;
  readonly placeholder?: readonly string[];
}

export interface TeamContent {
  readonly eyebrow: string;
  readonly headingLines: readonly [string, string];
  readonly people: readonly TeamMember[];
}

export const team: TeamContent = {
  eyebrow: '04 / PEOPLE BEHIND WORKOUSE',
  headingLines: ['The people behind', 'the engineering.'],
  people: [
    {
      name: 'Emre Yılmaz',
      role: 'Founder & Software Engineer',
      bio: 'Software engineer and founder of Workouse, with extensive experience building and modernizing web applications, backend systems, and developer infrastructure.',
      focus:
        'Hands-on engineering, architecture, and practical PHP & Symfony delivery.',
      href: links.emre.href,
      external: true,
      linkLabel: 'emre.xyz ↗',
      photo: 'src/assets/team/emre.jpg',
      alt: 'Emre Yılmaz, founder and software engineer at Workouse',
    },
    {
      name: 'Sarp Doruk Aslan',
      role: 'Software Developer — Symfony & Magento',
      bio: '25 years of software development experience. Associated with Altıncı Kat, a software and digital services agency.',
      verificationNote:
        'Experience statement supplied by the project owner; verify before public release.',
      href: links.altinciKat.href,
      external: true,
      linkLabel: 'altincikat.com ↗',
      photo: null,
      placeholder: [
        'PORTRAIT PLACEHOLDER',
        'Sarp Doruk Aslan',
        'Approved photography to be supplied',
      ],
    },
  ],
};

export interface CtaVariantCopy {
  readonly eyebrow: string;
  readonly heading: string;
  readonly body: string;
}

export interface CtaContent {
  readonly home: CtaVariantCopy;
  readonly work: CtaVariantCopy;
  readonly primary: LinkReference<'booking'> & { readonly external: true };
  readonly secondary: LinkReference<'email'>;
}

export const cta: CtaContent = {
  home: {
    eyebrow: 'A CONVERSATION IS A GOOD PLACE TO START.',
    heading: 'Let’s build what’s next.',
    body: 'Whether you’re modernizing an existing application or developing something new, we’d be glad to hear about it.',
  },
  work: {
    eyebrow: 'A CONVERSATION IS A GOOD PLACE TO START.',
    heading: 'Have a project in mind?',
    body: 'Tell us what you’re building, maintaining, or trying to improve. We’d be happy to discuss how we can help.',
  },
  primary: {
    label: 'Book a discovery call',
    ref: 'booking',
    external: true,
  },
  secondary: {
    label: 'Email us ↗',
    ref: 'email',
  },
};

export type FooterGroupItem = LabeledLinkKey | LinkReference<LabeledLinkKey>;

export interface FooterGroup {
  readonly eyebrow: string;
  readonly items: readonly FooterGroupItem[];
}

export interface FooterActionItem {
  readonly label: string;
  readonly type: 'button';
  readonly action: string;
}

export type FooterLegalItem = LabeledLinkKey | FooterActionItem;

export interface FooterContent {
  readonly tagline: readonly [string, string];
  readonly email: string;
  readonly groups: readonly FooterGroup[];
  readonly legal: readonly FooterLegalItem[];
  readonly signature: string;
}

export const footer: FooterContent = {
  tagline: ['Independent minds.', 'Reliable engineering.'],
  email: 'emre@workouse.com',
  groups: [
    {
      eyebrow: 'ENGINEERING',
      items: ['phpSymfony', 'shopify'],
    },
    {
      eyebrow: 'STUDIO',
      items: ['work', 'products', 'about'],
    },
    {
      eyebrow: 'EXPLORE',
      items: [
        { label: 'Resources / Website Audit', ref: 'audit' },
        'blog',
        { label: 'Contact', ref: 'email' },
      ],
    },
  ],
  legal: [
    'privacy',
    'terms',
    'impressum',
    {
      label: 'Cookie preferences',
      type: 'button',
      action: 'open existing consent manager',
    },
  ],
  signature: 'WORKOUSE / SOFTWARE THAT KEEPS MOVING FORWARD',
};

export interface WorkFilterOption {
  readonly id: WorkFilterId;
  readonly label: string;
}

export interface WorkCapabilityItem {
  readonly index: string;
  readonly title: string;
  readonly body: string;
}

export interface WorkRelatedServiceItem {
  readonly title: string;
  readonly body: string;
  readonly link: LinkReference<'phpSymfony' | 'shopify'>;
}

export interface WorkPageContent {
  readonly intro: {
    readonly eyebrow: string;
    readonly heading: string;
    readonly body: string;
    readonly tags: string;
  };
  readonly filters: readonly WorkFilterOption[];
  readonly capabilities: {
    readonly eyebrow: string;
    readonly heading: string;
    readonly body: string;
    readonly items: readonly WorkCapabilityItem[];
  };
  readonly relatedServices: {
    readonly eyebrow: string;
    readonly items: readonly WorkRelatedServiceItem[];
  };
}

export const workPage: WorkPageContent = {
  intro: {
    eyebrow: 'WORK / SELECTED ENGAGEMENTS',
    heading: 'Good work speaks through what it builds.',
    body: 'From established platforms to growing commerce businesses, we help teams modernize applications, develop new capabilities, and keep their software moving forward.',
    tags: 'PHP / Symfony · Shopify · Software Engineering',
  },
  filters: [
    { id: 'all', label: 'All Work' },
    { id: 'php-symfony', label: 'PHP & Symfony' },
    { id: 'shopify', label: 'Shopify' },
    { id: 'engineering-integrations', label: 'Engineering & Integrations' },
  ],
  capabilities: {
    eyebrow: 'ENGINEERING / BEYOND THE ENGAGEMENT',
    heading: 'Different platforms. The same engineering mindset.',
    body: 'Every existing system has its own constraints, history, and opportunities. We work with what businesses already have, improve what needs attention, and build what comes next.',
    items: [
      {
        index: '01',
        title: 'Modernize',
        body: 'Improve existing applications, dependencies, architecture, and maintainability.',
      },
      {
        index: '02',
        title: 'Extend',
        body: 'Develop new features, integrations, APIs, and business functionality.',
      },
      {
        index: '03',
        title: 'Support',
        body: 'Provide ongoing engineering expertise as software and business requirements evolve.',
      },
    ],
  },
  relatedServices: {
    eyebrow: 'RELATED SERVICES',
    items: [
      {
        title: 'PHP & Symfony Development',
        body: 'Modernization, new features, architecture, and ongoing development.',
        link: {
          label: 'Explore PHP & Symfony services',
          ref: 'phpSymfony',
        },
      },
      {
        title: 'Shopify Development',
        body: 'Custom themes, extensions, integrations, and storefront engineering.',
        link: {
          label: 'Explore Shopify services',
          ref: 'shopify',
        },
      },
    ],
  },
};

export const siteContent = {
  links,
  nav,
  hero,
  clientStrip,
  services,
  engagementsHome,
  engagementsWork,
  engagements,
  products,
  team,
  cta,
  footer,
  workPage,
} as const;
