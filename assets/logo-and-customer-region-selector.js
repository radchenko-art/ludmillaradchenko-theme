/**
 * Cross-domain store region: same-path redirect with query + hash.
 * Theme editor: block navigation; popover still toggles via native popover.
 */
document.addEventListener(
  'click',
  (event) => {
    const link = event.target?.closest?.('.region-selector-popover__link');
    if (!link || !(link instanceof HTMLAnchorElement)) return;

    const root = link.closest('[data-region-selector-root]');
    if (root instanceof HTMLElement && root.dataset.designMode === 'true') {
      event.preventDefault();
      return;
    }

    const origin = link.dataset.storeOrigin;
    if (!origin) return;

    event.preventDefault();

    try {
      const url = new URL(origin);
      url.pathname = window.location.pathname;
      url.search = window.location.search;
      url.hash = window.location.hash;
      window.location.assign(url.toString());
    } catch {
      window.location.assign(link.href);
    }
  },
  false
);
