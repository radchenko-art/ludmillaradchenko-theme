/**
 * Cross-domain store region switcher (Italy / UAE).
 * Preserves path, query string, and hash on redirect.
 */
document.addEventListener(
  'change',
  (event) => {
    const select = event.target?.closest?.('[data-logo-customer-region-select]');
    if (!select || !(select instanceof HTMLSelectElement)) return;

    if (select.dataset.designMode === 'true') {
      const keep = select.dataset.currentValue;
      if (keep) select.value = keep;
      return;
    }

    const origin = select.value;
    if (!origin) return;

    try {
      const url = new URL(origin);
      url.pathname = window.location.pathname;
      url.search = window.location.search;
      url.hash = window.location.hash;
      window.location.assign(url.toString());
    } catch {
      window.location.assign(origin);
    }
  },
  false
);
