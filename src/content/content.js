(() => {
  const QS_COSMETIC_SELECTORS = [
    '[id^="google_ads_"]', '[id*="google_ads_iframe"]',
    '[class*="ad-container"]', '[class*="ad_container"]', '[class~="advertisement"]',
    '[data-ad-slot]', '[data-ad-client]', '[aria-label="Advertisement"]',
    '.adsbygoogle', '.ad-banner', '.ad-slot', '.sponsored-ad',
    '[class*="newsletter-popup"]', '[class*="newsletter-modal"]'
  ];

  const TRACKING_PARAMS = new Set([
    'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
    'fbclid','gclid','dclid','msclkid','mc_cid','mc_eid','igshid',
    'vero_conv','vero_id','_hsenc','_hsmi','mkt_tok'
  ]);

  let hiddenTotal = 0;
  let pendingHidden = 0;

  function report(payload) {
    try { chrome.runtime.sendMessage({ type: 'QS_COSMETIC_EVENT', ...payload }); } catch {}
  }

  function cleanCurrentUrl() {
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

  function hideMatches(root = document) {
    let count = 0;
    for (const selector of QS_COSMETIC_SELECTORS) {
      let nodes;
      try { nodes = root.querySelectorAll(selector); } catch { continue; }
      for (const node of nodes) {
        if (node.dataset?.qsHidden === '1') continue;
        if (node.dataset) node.dataset.qsHidden = '1';
        node.style.setProperty('display', 'none', 'important');
        node.style.setProperty('visibility', 'hidden', 'important');
        node.style.setProperty('height', '0', 'important');
        node.style.setProperty('min-height', '0', 'important');
        node.style.setProperty('margin', '0', 'important');
        node.style.setProperty('padding', '0', 'important');
        count += 1;
      }
    }
    if (count) {
      hiddenTotal += count;
      pendingHidden += count;
      if (pendingHidden >= 5) {
        report({ hiddenCount: pendingHidden });
        pendingHidden = 0;
      }
    }
  }


  chrome.runtime.sendMessage({ type: 'QS_GET_STATE' }).then(state => {
    const globallyEnabled = state?.ok ? state.settings?.enabled !== false : true;
    const domain = location.hostname.toLowerCase().replace(/^www\./, '');
    const trusted = state?.siteModes?.[domain] === 'trusted';
    if (!globallyEnabled || trusted) return;
    if (state?.settings?.trackingParamCleanup !== false) cleanCurrentUrl();
    if (state?.settings?.cosmeticFiltering === false) return;
    const start = () => {
      hideMatches(document);
      const observer = new MutationObserver(records => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              hideMatches(node);
              if (node.matches) {
                for (const selector of QS_COSMETIC_SELECTORS) {
                  try {
                    if (node.matches(selector) && node.dataset?.qsHidden !== '1') {
                      node.dataset.qsHidden = '1';
                      node.style.setProperty('display', 'none', 'important');
                    }
                  } catch {}
                }
              }
            }
          }
        }
      });
      observer.observe(document.documentElement || document, { childList: true, subtree: true });
      addEventListener('pagehide', () => {
        if (pendingHidden > 0) report({ hiddenCount: pendingHidden });
      }, { once: true });
    };
    if (document.documentElement) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
  }).catch(() => {
    // If extension state cannot be read, do not mutate the page.
    // User controls always win over fallback filtering.
  });
})();
