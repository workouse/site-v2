/**
 * Site navigation controller (progressive enhancement for SiteHeader.astro).
 *
 * Without this script the header still works: desktop disclosure panels and the
 * mobile menu render as visible lists. The script only runs when it can find
 * `[data-site-header]`, marks the header with `data-enhanced`, and then owns:
 *   - click/Escape/outside-pointer dismissal of the two desktop disclosures,
 *   - the mobile menu toggle (Escape or Close dismisses and returns focus),
 *   - panel alignment under each trigger (computed from layout, not hover).
 *
 * Panels are dismissed by visibility/opacity so the header height never changes
 * and the 160ms dissolve (or instant change under reduced motion) is CSS-driven.
 * Dependency-free on purpose so pure helpers run under node --experimental-strip-types.
 */

export const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';
export const PANEL_INSET_PX = 24;
export const OPEN_CLASS = 'is-open';
export const ENHANCED_ATTRIBUTE = 'data-enhanced';
export const ESCAPE_KEY = 'Escape';
export const ROOT_PATH = '/';

const SELECTORS = {
  header: '[data-site-header]',
  disclosure: '[data-disclosure]',
  disclosureTrigger: '[data-disclosure-trigger]',
  disclosurePanel: '[data-disclosure-panel]',
  menuToggle: '[data-menu-toggle]',
  menuLabel: '[data-menu-label]',
  mobileMenu: '[data-mobile-menu]',
} as const;

const LABEL_CLOSED_ATTRIBUTE = 'data-label-closed';
const LABEL_OPEN_ATTRIBUTE = 'data-label-open';

/**
 * Returns whether a navigation href should carry aria-current="page".
 * Hash-only destinations (e.g. /#audit) are never treated as the current page.
 */
export function isPathActive(href: string, currentPath: string): boolean {
  if (href.includes('#')) return false;
  const normalizedHref = stripTrailingSlash(href);
  const normalizedPath = stripTrailingSlash(currentPath);
  if (normalizedHref === ROOT_PATH) return normalizedPath === ROOT_PATH;
  return (
    normalizedPath === normalizedHref ||
    normalizedPath.startsWith(`${normalizedHref}/`)
  );
}

function stripTrailingSlash(value: string): string {
  return value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value;
}

/**
 * Horizontal offset of a disclosure panel relative to the header, so that the
 * panel text aligns roughly with its trigger label (spec: ~24px left of trigger).
 */
export function panelOffsetLeft(
  triggerLeft: number,
  headerLeft: number,
  inset: number = PANEL_INSET_PX,
): number {
  return triggerLeft - headerLeft - inset;
}

interface DisclosureRecord {
  readonly item: HTMLElement;
  readonly trigger: HTMLButtonElement;
  readonly panel: HTMLElement;
}

/**
 * Wires the header. Safe to call more than once: each call re-reads the DOM and
 * registers listeners only for the header it was given.
 */
export function initSiteNav(
  headerElement: HTMLElement | null = document.querySelector<HTMLElement>(SELECTORS.header),
): void {
  if (!headerElement) return;
  const header: HTMLElement = headerElement;
  header.setAttribute(ENHANCED_ATTRIBUTE, '');

  const disclosures = collectDisclosures(header);
  const menuToggle = header.querySelector<HTMLButtonElement>(SELECTORS.menuToggle);
  const mobileMenu = header.querySelector<HTMLElement>(SELECTORS.mobileMenu);
  const menuLabel = menuToggle?.querySelector<HTMLElement>(SELECTORS.menuLabel) ?? null;

  function isDisclosureOpen(record: DisclosureRecord): boolean {
    return record.trigger.getAttribute('aria-expanded') === 'true';
  }

  function isMobileOpen(): boolean {
    return menuToggle?.getAttribute('aria-expanded') === 'true';
  }

  function setDisclosureOpen(record: DisclosureRecord, open: boolean): void {
    if (open) {
      const headerRect = header.getBoundingClientRect();
      const triggerRect = record.trigger.getBoundingClientRect();
      record.panel.style.left = `${panelOffsetLeft(triggerRect.left, headerRect.left)}px`;
    }
    record.trigger.setAttribute('aria-expanded', String(open));
    record.panel.classList.toggle(OPEN_CLASS, open);
  }

  function closeAllDisclosures(): void {
    for (const record of disclosures) {
      if (isDisclosureOpen(record)) setDisclosureOpen(record, false);
    }
  }

  function setMobileOpen(open: boolean): void {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.setAttribute('aria-expanded', String(open));
    mobileMenu.classList.toggle(OPEN_CLASS, open);
    if (menuLabel) {
      const labelAttribute = open ? LABEL_OPEN_ATTRIBUTE : LABEL_CLOSED_ATTRIBUTE;
      menuLabel.textContent = menuToggle.getAttribute(labelAttribute) ?? '';
    }
  }

  for (const record of disclosures) {
    record.trigger.addEventListener('click', () => {
      const willOpen = !isDisclosureOpen(record);
      closeAllDisclosures();
      setDisclosureOpen(record, willOpen);
    });
  }

  menuToggle?.addEventListener('click', () => {
    setMobileOpen(!isMobileOpen());
  });

  const ownerDocument = header.ownerDocument;

  ownerDocument.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key !== ESCAPE_KEY) return;
    const openRecord = disclosures.find(isDisclosureOpen);
    if (openRecord) {
      setDisclosureOpen(openRecord, false);
      openRecord.trigger.focus();
      return;
    }
    if (isMobileOpen()) {
      setMobileOpen(false);
      menuToggle?.focus();
    }
  });

  ownerDocument.addEventListener('pointerdown', (event: PointerEvent) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    for (const record of disclosures) {
      if (isDisclosureOpen(record) && !record.item.contains(target)) {
        setDisclosureOpen(record, false);
      }
    }
  });

  const desktopQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
  desktopQuery.addEventListener('change', (event: MediaQueryListEvent) => {
    if (event.matches) {
      setMobileOpen(false);
    } else {
      closeAllDisclosures();
    }
  });
}

function collectDisclosures(header: HTMLElement): DisclosureRecord[] {
  return Array.from(header.querySelectorAll<HTMLElement>(SELECTORS.disclosure)).flatMap(
    (item): DisclosureRecord[] => {
      const trigger = item.querySelector<HTMLButtonElement>(SELECTORS.disclosureTrigger);
      const panel = item.querySelector<HTMLElement>(SELECTORS.disclosurePanel);
      return trigger && panel ? [{ item, trigger, panel }] : [];
    },
  );
}
