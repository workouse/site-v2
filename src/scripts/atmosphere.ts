/**
 * Atmosphere motion controller (progressive enhancement for Atmosphere.astro).
 *
 * The static pigment composition and the autonomous CSS drift work without this
 * script. This module only adds:
 *   - pointer parallax on wide, fine-pointer devices (group moves ≤ 6px X / 4px Y),
 *   - pausing of the CSS drift while the atmosphere is offscreen or the tab is hidden.
 *
 * It never touches layout: it writes two CSS custom properties consumed by a
 * `transform` and toggles a data attribute consumed by `animation-play-state`.
 */

export const POINTER_MAX_X_PX = 6;
export const POINTER_MAX_Y_PX = 4;

export const ROOT_SELECTOR = '[data-atmosphere]';
export const GROUP_SELECTOR = '[data-atmosphere-group]';
const READY_ATTRIBUTE = 'data-atmosphere-ready';
const PAUSED_ATTRIBUTE = 'data-paused';
const POINTER_X_PROPERTY = '--atmo-px';
const POINTER_Y_PROPERTY = '--atmo-py';
const TOUCH_POINTER_TYPE = 'touch';

/** Must stay in sync with the desktop breakpoint in Atmosphere.astro. */
const DESKTOP_QUERY = '(min-width: 1024px)';
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface Offset {
  readonly x: number;
  readonly y: number;
}

const ZERO_OFFSET: Offset = { x: 0, y: 0 };

function clampUnit(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(-1, value));
}

/**
 * Maps a pointer position inside `bounds` to a translation toward the pointer.
 * The bounds centre maps to (0, 0), the edges to ±max; positions outside the
 * bounds are clamped so the group can never exceed the design limits.
 */
export function computePointerOffset(
  clientX: number,
  clientY: number,
  bounds: Bounds,
  maxX: number = POINTER_MAX_X_PX,
  maxY: number = POINTER_MAX_Y_PX,
): Offset {
  if (bounds.width <= 0 || bounds.height <= 0) return ZERO_OFFSET;

  const halfWidth = bounds.width / 2;
  const halfHeight = bounds.height / 2;
  const nx = clampUnit((clientX - (bounds.left + halfWidth)) / halfWidth);
  const ny = clampUnit((clientY - (bounds.top + halfHeight)) / halfHeight);

  return { x: nx * maxX, y: ny * maxY };
}

/** Formats a pixel value for a CSS custom property, avoiding "-0px" noise. */
export function toPx(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded === 0 ? 0 : rounded}px`;
}

function applyOffset(group: HTMLElement, offset: Offset): void {
  group.style.setProperty(POINTER_X_PROPERTY, toPx(offset.x));
  group.style.setProperty(POINTER_Y_PROPERTY, toPx(offset.y));
}

function setupPointer(root: HTMLElement, group: HTMLElement, signal: AbortSignal): void {
  // The atmosphere itself has pointer-events: none, so listen on the hero that hosts it.
  const host = root.parentElement;
  if (!host) return;

  const desktop = window.matchMedia(DESKTOP_QUERY);
  const finePointer = window.matchMedia(FINE_POINTER_QUERY);
  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);

  let pointerController: AbortController | null = null;
  let frame = 0;
  let pendingX = 0;
  let pendingY = 0;

  const flush = (): void => {
    frame = 0;
    applyOffset(group, computePointerOffset(pendingX, pendingY, host.getBoundingClientRect()));
  };

  const cancelFrame = (): void => {
    if (frame === 0) return;
    window.cancelAnimationFrame(frame);
    frame = 0;
  };

  const onMove = (event: PointerEvent): void => {
    if (event.pointerType === TOUCH_POINTER_TYPE) return;
    pendingX = event.clientX;
    pendingY = event.clientY;
    // One rect read + one style write per frame, regardless of event rate.
    if (frame === 0) frame = window.requestAnimationFrame(flush);
  };

  const onLeave = (): void => {
    cancelFrame();
    // The CSS transition on the group eases this back to rest.
    applyOffset(group, ZERO_OFFSET);
  };

  const detach = (): void => {
    pointerController?.abort();
    pointerController = null;
    cancelFrame();
    applyOffset(group, ZERO_OFFSET);
  };

  const sync = (): void => {
    const enabled = desktop.matches && finePointer.matches && !reducedMotion.matches;
    if (!enabled) {
      detach();
      return;
    }
    if (pointerController) return;

    pointerController = new AbortController();
    const options: AddEventListenerOptions = { passive: true, signal: pointerController.signal };
    host.addEventListener('pointermove', onMove, options);
    host.addEventListener('pointerleave', onLeave, options);
  };

  for (const query of [desktop, finePointer, reducedMotion]) {
    query.addEventListener('change', sync, { signal });
  }
  signal.addEventListener('abort', detach, { once: true });
  sync();
}

function setupPausing(root: HTMLElement, signal: AbortSignal): void {
  let onScreen = true;

  const update = (): void => {
    root.toggleAttribute(PAUSED_ATTRIBUTE, !onScreen || document.hidden);
  };

  document.addEventListener('visibilitychange', update, { signal });

  if (typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      onScreen = entry.isIntersecting;
      update();
    });
    observer.observe(root);
    signal.addEventListener('abort', () => observer.disconnect(), { once: true });
  }

  signal.addEventListener('abort', () => root.removeAttribute(PAUSED_ATTRIBUTE), { once: true });
  update();
}

/**
 * Enhances one atmosphere element. Returns a cleanup function; aborting the
 * optional `signal` has the same effect.
 */
export function initAtmosphere(root: HTMLElement, signal?: AbortSignal): () => void {
  const controller = new AbortController();
  const cleanup = (): void => {
    controller.abort();
    root.removeAttribute(READY_ATTRIBUTE);
  };

  if (signal?.aborted) return cleanup;
  signal?.addEventListener('abort', cleanup, { once: true });

  const group = root.querySelector<HTMLElement>(GROUP_SELECTOR);
  if (!group) return cleanup;

  root.setAttribute(READY_ATTRIBUTE, '');
  setupPausing(root, controller.signal);
  setupPointer(root, group, controller.signal);
  return cleanup;
}

/** Enhances every atmosphere on the page that has not been enhanced yet. */
export function initAllAtmospheres(scope: ParentNode = document): void {
  for (const root of scope.querySelectorAll<HTMLElement>(ROOT_SELECTOR)) {
    if (root.hasAttribute(READY_ATTRIBUTE)) continue;
    initAtmosphere(root);
  }
}
