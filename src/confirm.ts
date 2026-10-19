// Two-tap confirmation: the first tap arms, a second tap within windowMs confirms.

export type Confirm = {
  tap: (now: number) => 'armed' | 'confirmed';
  isArmed: (now: number) => boolean;
};

export function createConfirm(windowMs: number): Confirm {
  let armedAt: number | null = null;
  const isArmed = (now: number) => armedAt !== null && now - armedAt < windowMs;

  return {
    tap: (now) => {
      if (isArmed(now)) {
        armedAt = null;
        return 'confirmed';
      }
      armedAt = now;
      return 'armed';
    },
    isArmed,
  };
}

const IDLE_LABEL = '↺ Session mới';
const ARMED_LABEL = 'Chạm lần nữa để xác nhận';

// A button that runs onConfirm(timeStamp) only after the two-tap confirmation.
export function bindConfirmButton(
  button: HTMLButtonElement,
  windowMs: number,
  onConfirm: (timeStamp: number) => void,
): void {
  const confirm = createConfirm(windowMs);
  let timer = 0;

  const render = (armed: boolean) => {
    button.textContent = armed ? ARMED_LABEL : IDLE_LABEL;
    button.dataset.armed = String(armed);
  };

  button.addEventListener('click', (e) => {
    // Drop focus so a later Space hold is not taken as a button press.
    button.blur();
    window.clearTimeout(timer);
    if (confirm.tap(e.timeStamp) === 'confirmed') {
      render(false);
      onConfirm(e.timeStamp);
      return;
    }
    render(true);
    timer = window.setTimeout(() => render(false), windowMs);
  });
  render(false);
}
