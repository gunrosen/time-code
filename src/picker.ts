import { SECTIONS, filterTasks, type Task } from './tasks';

const NO_STEPS = 'Không có bước định sẵn. Ghi nội dung thực tế của phiên quay vào sổ hiện trường.';

export type Picker = {
  // `closable: false` is the mandatory pick before recording: no close button.
  open: (options: { closable: boolean; current: Task | null }) => void;
  close: () => void;
  isOpen: () => boolean;
};

type Elements = {
  root: HTMLElement;
  search: HTMLInputElement;
  closeButton: HTMLButtonElement;
  list: HTMLElement;
  detail: HTMLElement;
  backButton: HTMLButtonElement;
  detailCode: HTMLElement;
  detailName: HTMLElement;
  steps: HTMLElement;
  selectButton: HTMLButtonElement;
};

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Full-screen overlay: a searchable list grouped by section, then the steps of one task to confirm.
export function createPicker(elements: Elements, onSelect: (task: Task) => void): Picker {
  const { root, search, closeButton, list, detail, backButton, detailCode, detailName, steps, selectButton } = elements;
  let current: Task | null = null;
  let shown: Task | null = null;

  const renderList = () => {
    list.replaceChildren();
    const tasks = filterTasks(search.value);
    for (const section of SECTIONS) {
      const inSection = tasks.filter((t) => t.section === section.id);
      if (inSection.length === 0) continue;
      list.append(el('div', 'picker-section', section.name));
      for (const task of inSection) {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'task-row';
        row.append(el('b', '', task.code), el('span', '', task.name));
        if (task.code === current?.code) row.setAttribute('aria-current', 'true');
        row.addEventListener('click', () => showDetail(task));
        list.append(row);
      }
    }
    if (tasks.length === 0) list.append(el('div', 'picker-empty', 'Không có task nào khớp'));
  };

  const showDetail = (task: Task) => {
    shown = task;
    detailCode.textContent = task.code;
    detailName.textContent = task.variantOf ? `${task.name} (biến thể của ${task.variantOf})` : task.name;
    steps.classList.toggle('empty', task.steps.length === 0);
    if (task.steps.length === 0) steps.replaceChildren(el('div', 'step-none', NO_STEPS));
    else steps.replaceChildren(
      ...task.steps.map((step) => {
        const item = el('div', 'step');
        item.append(el('span', 'step-no', String(step.order)), el('b', '', step.nameVi));
        if (step.nameEn) item.append(el('i', '', step.nameEn));
        if (step.description) item.append(el('p', '', step.description));
        if (step.props.length) item.append(el('small', '', `Đạo cụ: ${step.props.join(', ')}`));
        if (step.wristcamNote) item.append(el('small', 'note', `Wristcam: ${step.wristcamNote}`));
        return item;
      }),
    );
    selectButton.textContent = `Chọn ${task.code}`;
    list.hidden = true;
    detail.hidden = false;
  };

  const showList = () => {
    shown = null;
    detail.hidden = true;
    list.hidden = false;
    renderList();
  };

  search.addEventListener('input', () => {
    if (!detail.hidden) showList();
    else renderList();
  });
  backButton.addEventListener('click', showList);
  closeButton.addEventListener('click', () => {
    root.hidden = true;
  });
  selectButton.addEventListener('click', () => {
    if (!shown) return;
    const task = shown;
    root.hidden = true;
    onSelect(task);
  });

  return {
    open: ({ closable, current: selected }) => {
      current = selected;
      closeButton.hidden = !closable;
      search.value = '';
      root.hidden = false;
      showList();
      // The current task may be far down the list; keep it in view for a one-tap re-pick.
      list.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'center' });
    },
    close: () => {
      root.hidden = true;
    },
    isOpen: () => !root.hidden,
  };
}

