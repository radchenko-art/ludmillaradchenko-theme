/**
 * Cross-domain store region: same-path redirect with query + hash.
 * Sets an override for 2 hours (cookie + localStorage) to prevent geo-redirect loops.
 * Cookie uses domain=.ludmillaradchenko.art so Italy and UAE subdomains share it (localStorage does not).
 * Theme editor: block navigation; popover still toggles via native popover.
 */
function lrGetSharedCookieDomain() {
  try {
    const host = window.location.hostname.toLowerCase();
    if (host === 'ludmillaradchenko.art' || host.endsWith('.ludmillaradchenko.art')) {
      return '.ludmillaradchenko.art';
    }
  } catch (_) {}
  return '';
}

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

    // Persist explicit choice for 2 hours (cookie is readable on both storefront hosts).
    try {
      const region = link.dataset.storeRegion;
      const expiresAt = Date.now() + 2 * 60 * 60 * 1000;
      if (region === 'italy' || region === 'uae') {
        const payload = JSON.stringify({ region, expiresAt });
        try {
          window.localStorage.setItem('lr_preferred_store', payload);
        } catch (_) {}
        const maxAge = 7200;
        const sharedDomain = lrGetSharedCookieDomain();
        let cookie = `lr_preferred_store=${encodeURIComponent(payload)}; path=/; max-age=${maxAge}; SameSite=Lax`;
        if (sharedDomain) cookie += `; domain=${sharedDomain}`;
        if (window.location.protocol === 'https:') cookie += '; Secure';
        document.cookie = cookie;
      }
    } catch (_) {}

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
