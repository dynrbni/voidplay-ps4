type Point = { x: number; y: number };
type Direction = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

export function findNext(origin: Point, candidates: Point[], direction: Direction): number {
  let best = -1;
  let score = Infinity;
  candidates.forEach((point, index) => {
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    const forward = direction === 'ArrowRight' ? dx : direction === 'ArrowLeft' ? -dx : direction === 'ArrowDown' ? dy : -dy;
    const sideways = direction === 'ArrowRight' || direction === 'ArrowLeft' ? Math.abs(dy) : Math.abs(dx);
    const distance = forward + sideways * 3;
    if (forward > 1 && distance < score) {
      best = index;
      score = distance;
    }
  });
  return best;
}

export function installKeyboardNavigation(): () => void {
  function onKeyDown(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) ||
      event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented) return;
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || active.matches('input, textarea, select, [contenteditable]')) return;
    const row = active.closest('[data-focus-row]');
    if (row && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      const cards = Array.from(row.querySelectorAll<HTMLElement>('.app-card'));
      const next = cards.indexOf(active) + (event.key === 'ArrowRight' ? 1 : -1);
      event.preventDefault();
      cards[next]?.focus({ preventScroll: true });
      return;
    }
    const root = document.querySelector('dialog[open]') ?? document;
    const controls = Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled)'))
      .filter(element => element.getClientRects().length > 0);
    const center = (element: HTMLElement): Point => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    };
    const next = findNext(center(active), controls.map(center), event.key as Direction);
    event.preventDefault();
    controls[next]?.focus();
    controls[next]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }
  document.addEventListener('keydown', onKeyDown);
  return () => document.removeEventListener('keydown', onKeyDown);
}
