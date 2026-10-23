export interface Platform {
  id: string;
  left: number;
  right: number;
  y: number;
  bottom: number;
}
// World coordinates: scrolling only changes the render offset, never physics.
export function observePlatforms(
  onChange: (platforms: Platform[], dragging: boolean) => void,
) {
  let frame = 0,
    disposed = false;
  const measured = new Set<Element>();
  const measure = () => {
    frame = 0;
    const nodes = [
      ...document.querySelectorAll<HTMLElement>(".widget[data-widget]"),
    ];
    for (const old of measured)
      if (!nodes.includes(old as HTMLElement)) {
        resize.unobserve(old);
        measured.delete(old);
      }
    for (const el of nodes)
      if (!measured.has(el)) {
        resize.observe(el);
        measured.add(el);
      }
    const dragging = nodes.some((el) =>
      el.classList.contains("widget-dragging"),
    );
    // Ignore CSS transforms while dragging; a final measurement happens on drop.
    if (dragging) {
      onChange([], true);
      return;
    }
    onChange(
      nodes
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            id: el.dataset.widget!,
            left: r.left + scrollX,
            right: r.right + scrollX,
            y: r.top + scrollY,
            bottom: r.bottom + scrollY,
          };
        })
        .filter((p) => p.right - p.left > 60),
      false,
    );
  };
  const schedule = () => {
    if (!disposed && !frame) frame = requestAnimationFrame(measure);
  };
  let settling: ReturnType<typeof setTimeout>[] = [];
  // Native decoration/DPI changes can settle across several layout passes.
  const settle = () => {
    settling.forEach(clearTimeout);
    schedule();
    settling = [120, 350, 800].map((delay) => setTimeout(schedule, delay));
  };
  const resize = new ResizeObserver(schedule);
  const mutation = new MutationObserver((records) => {
    if (
      records.some(
        (r) =>
          !(r.target instanceof Element) ||
          !r.target.closest(".companion-layer, .music-particles"),
      )
    )
      schedule();
  });
  const root = document.querySelector(".widgets");
  if (root) {
    resize.observe(root);
    mutation.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });
  }
  // A header/notice can move every widget without changing any widget's size.
  const main = document.querySelector("main");
  const layout = new MutationObserver(schedule);
  if (main) {
    resize.observe(main);
    layout.observe(main, { childList: true });
    main
      .querySelectorAll(".welcome, .masthead")
      .forEach((el) => resize.observe(el));
  }
  window.addEventListener("resize", settle);
  window.addEventListener("focus", settle);
  window.addEventListener("pageshow", settle);
  window.addEventListener("focus-window-layout", settle);
  window.visualViewport?.addEventListener("resize", settle);
  document.fonts.ready.then(schedule);
  settle();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    resize.disconnect();
    mutation.disconnect();
    layout.disconnect();
    settling.forEach(clearTimeout);
    window.removeEventListener("resize", settle);
    window.removeEventListener("focus", settle);
    window.removeEventListener("pageshow", settle);
    window.removeEventListener("focus-window-layout", settle);
    window.visualViewport?.removeEventListener("resize", settle);
  };
}
