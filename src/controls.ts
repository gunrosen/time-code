import { CONTROLS_HIDE_MS } from './config';

export type Controls = {
  isAwake: () => boolean;
};

export function setupControls(fsButton: HTMLButtonElement, wakeButton: HTMLButtonElement): Controls {
  setupFullscreen(fsButton);
  const wake = setupWakeLock(wakeButton);
  setupAutoHide();
  return { isAwake: wake.isAwake };
}

function setupFullscreen(button: HTMLButtonElement): void {
  const root = document.documentElement;
  const enabled = document.fullscreenEnabled || document.webkitFullscreenEnabled === true;
  if (!enabled) {
    // iPhone Safari has no element fullscreen.
    button.hidden = true;
    return;
  }

  const current = () => document.fullscreenElement ?? document.webkitFullscreenElement ?? null;
  const toggle = () => {
    if (current()) {
      void (document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen?.());
    } else {
      void (root.requestFullscreen ? root.requestFullscreen() : root.webkitRequestFullscreen?.());
    }
  };
  const sync = () => {
    const on = current() !== null;
    button.setAttribute('aria-pressed', String(on));
    button.textContent = on ? 'Thoát toàn màn hình' : 'Toàn màn hình';
  };

  button.addEventListener('click', toggle);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') toggle();
  });
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  sync();
}

// Keep-awake is wanted by default. Browsers may refuse it until the first user
// gesture, so it is retried on interaction and when the tab becomes visible.
function setupWakeLock(button: HTMLButtonElement): { isAwake: () => boolean } {
  if (!('wakeLock' in navigator)) {
    button.hidden = true;
    return { isAwake: () => false };
  }

  let wanted = true;
  let sentinel: WakeLockSentinel | null = null;

  const sync = () => {
    const on = sentinel !== null;
    button.setAttribute('aria-pressed', String(on));
    button.textContent = on ? 'Đang giữ sáng' : 'Giữ màn hình sáng';
  };

  const acquire = async () => {
    if (!wanted || sentinel || document.visibilityState !== 'visible') return;
    try {
      const lock = await navigator.wakeLock.request('screen');
      sentinel = lock;
      lock.addEventListener('release', () => {
        if (sentinel === lock) sentinel = null;
        sync();
      });
    } catch {
      sentinel = null;
    }
    sync();
  };

  button.addEventListener('click', () => {
    if (sentinel) {
      wanted = false;
      void sentinel.release();
    } else {
      wanted = true;
      void acquire();
    }
  });
  document.addEventListener('visibilitychange', () => void acquire());
  document.addEventListener('pointerdown', () => void acquire());
  document.addEventListener('keydown', () => void acquire());

  sync();
  void acquire();
  return { isAwake: () => sentinel !== null };
}

function setupAutoHide(): void {
  let timer = 0;
  const wake = () => {
    document.body.classList.remove('idle');
    window.clearTimeout(timer);
    timer = window.setTimeout(() => document.body.classList.add('idle'), CONTROLS_HIDE_MS);
  };
  for (const type of ['pointermove', 'pointerdown', 'keydown'] as const) {
    document.addEventListener(type, wake);
  }
  wake();
}
