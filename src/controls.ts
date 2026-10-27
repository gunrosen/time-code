import { CURSOR_HIDE_MS } from './config';

// Taps inside elements marked data-no-fullscreen (the task picker) do not enter fullscreen,
// so the time-code screen itself still shows the hint and takes the first tap.
const NO_FULLSCREEN = '[data-no-fullscreen]';

export type Controls = {
  isAwake: () => boolean;
  // False when the browser has no element fullscreen (iPhone Safari).
  canFullscreen: boolean;
  isFullscreen: () => boolean;
};

// Fullscreen and keep-awake are always on. Browsers only allow both after a user
// gesture, so every tap, click or key press re-requests whatever is missing.
export function setupControls(): Controls {
  const fullscreen = setupFullscreen();
  const wake = setupWakeLock();
  setupIdleCursor();
  return { isAwake: wake.isAwake, ...fullscreen };
}

function setupFullscreen(): Pick<Controls, 'canFullscreen' | 'isFullscreen'> {
  const root = document.documentElement;
  const canFullscreen = document.fullscreenEnabled || document.webkitFullscreenEnabled === true;
  const isFullscreen = () => (document.fullscreenElement ?? document.webkitFullscreenElement ?? null) !== null;
  if (!canFullscreen) return { canFullscreen, isFullscreen };

  const enter = (e: Event) => {
    if (isFullscreen() || (e instanceof KeyboardEvent && e.key === 'Escape')) return;
    if (e.target instanceof Element && e.target.closest(NO_FULLSCREEN)) return;
    const request = root.requestFullscreen?.bind(root) ?? root.webkitRequestFullscreen?.bind(root);
    // Rejects when the browser does not count the event as a user gesture; the next one retries.
    void Promise.resolve(request?.()).catch(() => undefined);
  };
  document.addEventListener('click', enter);
  document.addEventListener('keydown', enter);
  return { canFullscreen, isFullscreen };
}

function setupWakeLock(): { isAwake: () => boolean } {
  if (!('wakeLock' in navigator)) return { isAwake: () => false };

  let sentinel: WakeLockSentinel | null = null;
  let pending = false;

  const acquire = async () => {
    if (sentinel || pending || document.visibilityState !== 'visible') return;
    pending = true;
    try {
      const lock = await navigator.wakeLock.request('screen');
      sentinel = lock;
      // The browser releases the lock when the tab is hidden; it is re-acquired on return.
      lock.addEventListener('release', () => {
        if (sentinel === lock) sentinel = null;
      });
    } catch {
      sentinel = null;
    } finally {
      pending = false;
    }
  };

  document.addEventListener('visibilitychange', () => void acquire());
  document.addEventListener('pointerdown', () => void acquire());
  document.addEventListener('keydown', () => void acquire());
  void acquire();
  return { isAwake: () => sentinel !== null };
}

function setupIdleCursor(): void {
  let timer = 0;
  const wake = () => {
    document.body.classList.remove('idle');
    window.clearTimeout(timer);
    timer = window.setTimeout(() => document.body.classList.add('idle'), CURSOR_HIDE_MS);
  };
  for (const type of ['pointermove', 'pointerdown', 'keydown'] as const) {
    document.addEventListener(type, wake);
  }
  wake();
}
