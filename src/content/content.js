(() => {
  const AD_SELECTORS = [
    '[id^="google_ads_"]','[id*="google_ads_iframe"]','[data-ad-slot]','[data-ad-client]','.adsbygoogle',
    '[aria-label="Advertisement"]','[aria-label="advertisement"]','.ad-banner','.ad-slot','.sponsored-ad',
    '[class~="advertisement"]','[class*="ad-container"]','[class*="ad_container"]','[id^="ad-slot-"]'
  ];
  const ANNOYANCE_SELECTORS = [
    '[class*="newsletter-popup"]','[class*="newsletter-modal"]','[id*="newsletter-popup"]','[class*="subscribe-popup"]',
    '[class*="push-notification"]','[class*="notification-prompt"]','[class*="floating-ad"]','[class*="sticky-ad"]'
  ];
  const TRACKING_PARAMS = new Set([
    'utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id','utm_name','utm_reader','utm_viz_id',
    'fbclid','gclid','dclid','gbraid','wbraid','msclkid','mc_cid','mc_eid','igshid','twclid','ttclid','yclid',
    'vero_conv','vero_id','_hsenc','_hsmi','mkt_tok','ref_src','ref_url'
  ]);

  let state = null;
  let observer = null;
  let styleNode = null;
  const counted = new WeakSet();
  let pendingHidden = 0;

  function report(payload) {
    try { chrome.runtime.sendMessage({ type: 'QS_COSMETIC_EVENT', ...payload }); } catch {}
  }

  function domain() {
    return location.hostname.toLowerCase().replace(/^www\./, '');
  }

  function isTrusted() {
    return state?.siteModes?.[domain()] === 'trusted';
  }

  function protectionOn() {
    return state?.settings?.enabled !== false && !isTrusted();
  }

  function cleanCurrentUrl() {
    if (!protectionOn() || state?.settings?.trackingParamCleanup === false) return;
    try {
      const url = new URL(location.href);
      let removed = 0;
      for (const key of [...url.searchParams.keys()]) {
        if (TRACKING_PARAMS.has(key.toLowerCase())) {
          url.searchParams.delete(key);
          removed += 1;
        }
      }
      if (removed > 0) {
        history.replaceState(history.state, '', url.href);
        report({ cleanedParams: removed });
      }
    } catch {}
  }

  function activeSelectors() {
    if (!protectionOn()) return [];
    const selectors = [];
    if (state?.settings?.cosmeticFiltering !== false && state?.settings?.adLock !== false) selectors.push(...AD_SELECTORS);
    if (state?.settings?.annoyanceLock !== false) selectors.push(...ANNOYANCE_SELECTORS);
    return selectors;
  }

  function updatePageGuardFlags() {
    const root = document.documentElement;
    if (!root) return;
    root.setAttribute('data-qs-popup-lock', protectionOn() && state?.settings?.popupLock !== false ? '1' : '0');
    root.setAttribute('data-qs-redirect-lock', protectionOn() && state?.settings?.redirectLock !== false ? '1' : '0');
  }

  function updateStyle() {
    const selectors = activeSelectors();
    if (!selectors.length) {
      styleNode?.remove();
      styleNode = null;
      return;
    }
    if (!styleNode) {
      styleNode = document.createElement('style');
      styleNode.id = 'quietshield-cosmetic-style';
      (document.head || document.documentElement).appendChild(styleNode);
    }
    styleNode.textContent = `${selectors.join(',\n')}{display:none!important;visibility:hidden!important;}`;
  }

  function scanForCounters(root = document) {
    const selectors = activeSelectors();
    if (!selectors.length || !root?.querySelectorAll) return;
    let count = 0;
    for (const selector of selectors) {
      let nodes = [];
      try { nodes = root.querySelectorAll(selector); } catch { continue; }
      for (const node of nodes) {
        if (counted.has(node)) continue;
        counted.add(node);
        count += 1;
      }
    }
    if (count) {
      pendingHidden += count;
      if (pendingHidden >= 5) {
        report({ hiddenCount: pendingHidden });
        pendingHidden = 0;
      }
    }
  }

  function ensureObserver() {
    if (observer) return;
    observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) if (node.nodeType === Node.ELEMENT_NODE) scanForCounters(node);
      }
    });
    observer.observe(document.documentElement || document, { childList: true, subtree: true });
  }

  function applyState(next) {
    state = next;
    updatePageGuardFlags();
    updateStyle();
    cleanCurrentUrl();
    scanForCounters(document);
    ensureObserver();
  }

  async function refreshState() {
    try {
      const next = await chrome.runtime.sendMessage({ type: 'QS_GET_STATE' });
      if (next?.ok) applyState(next);
    } catch {}
  }

  const start = () => {
    void refreshState();
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && (changes['qs.settings'] || changes['qs.siteModes'])) void refreshState();
    });
    addEventListener('popstate', cleanCurrentUrl);
    addEventListener('hashchange', cleanCurrentUrl);
    addEventListener('pagehide', () => { if (pendingHidden > 0) report({ hiddenCount: pendingHidden }); }, { once: true });
  };

  if (document.documentElement) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
