/** Magnify only the touched page; release always returns to its layout width. */
export function bindTemporaryPinch(frame: HTMLElement) {
  let gesture: { distance: number; x: number; y: number; image: HTMLImageElement } | null = null;
  const reset = () => {
    if (gesture) {
      gesture.image.style.removeProperty('transform');
      gesture.image.style.removeProperty('transform-origin');
    }
    gesture = null;
    frame.classList.remove('is-pinching');
    window.removeEventListener('resize', reset);
    window.removeEventListener('blur', reset);
    window.removeEventListener('pagehide', reset);
  };
  const start = (event: TouchEvent) => {
    reset();
    if (event.touches.length !== 2) return;
    const image = frame.querySelector<HTMLImageElement>('.page-image');
    if (!image || !image.complete || !image.naturalHeight) return;
    const [a, b] = Array.from(event.touches);
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (distance < 1) return;
    const rect = image.getBoundingClientRect();
    gesture = { distance, x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2, image };
    image.style.transformOrigin = `${gesture.x - rect.left}px ${gesture.y - rect.top}px`;
    frame.classList.add('is-pinching');
    window.addEventListener('resize', reset);
    window.addEventListener('blur', reset);
    window.addEventListener('pagehide', reset);
    event.preventDefault();
  };
  const move = (event: TouchEvent) => {
    if (!gesture || event.touches.length !== 2) { reset(); return; }
    event.preventDefault();
    const [a, b] = Array.from(event.touches);
    const scale = Math.max(1, Math.min(4, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / gesture.distance));
    const x = (a.clientX + b.clientX) / 2 - gesture.x;
    const y = (a.clientY + b.clientY) / 2 - gesture.y;
    gesture.image.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  };
  const end = (event: TouchEvent) => { if (event.touches.length !== 2) reset(); };
  const options = { passive: false };
  frame.addEventListener('touchstart', start, options);
  frame.addEventListener('touchmove', move, options);
  frame.addEventListener('touchend', end);
  frame.addEventListener('touchcancel', reset);
  return () => {
    reset();
    frame.removeEventListener('touchstart', start);
    frame.removeEventListener('touchmove', move);
    frame.removeEventListener('touchend', end);
    frame.removeEventListener('touchcancel', reset);
    window.removeEventListener('resize', reset);
    window.removeEventListener('blur', reset);
    window.removeEventListener('pagehide', reset);
  };
}
