(() => {
  const AD_SELECTORS = [
    '.ad-widget','.adsbygoogle','.ad-unit','.ad_unit','.ad-slot','.ad_slot','.ad-banner','.ad_banner','.ads-banner','.ads_banner',
    '.sponsored-ad','.sponsor-ad','.native-ad','.native-ads','.native_ads','.promoted-ad','.promoted-content','.sponsored-content',
    '[data-ad-slot]','[data-ad-client]','[data-ad-unit]','[data-adunit]','[data-native-ad]','[data-sponsored="true"]','[data-promoted="true"]',
    '[id^="google_ads_"]','[id*="google_ads_iframe"]','[aria-label="Advertisement"]','[aria-label="Sponsored"]'
  ];

  const ANNOYANCE_SELECTORS = [
    '.ad-interstitial','.advert-interstitial','.ad-overlay','.advert-overlay','.popup-ad','.popunder','.in-page-push',
    '.anti-adblock','.adblock-modal','.adblock-overlay','[data-ad-interstitial="true"]','[data-ad-overlay="true"]'
  ];

  const TRACKING_PARAMS = new Set([
    'utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id','utm_name','utm_reader','utm_viz_id',
    'fbclid','gclid','dclid','gbraid','wbraid','msclkid','mc_cid','mc_eid','igshid','twclid','ttclid','yclid',
    'vero_conv','vero_id','_hsenc','_hsmi','mkt_tok','ref_src','ref_url','s_cid','cmpid','campaignid','adgroupid','creative','keyword','device','gad_source'
  ]);

  let state = null;
  let observer = null;
  let styleNode = null;
  let pendingAds = 0;
  let pendingAnnoyances = 0;
  const countedAds = new WeakSet();
  const countedAnnoyances = new WeakSet();
  const explicitlyHidden = new WeakSet();

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
      if (removed) {
        history.replaceState(history.state, '', url.href);
        report({ cleanedParams: removed });
      }
    } catch {}
  }

  function activeAdSelectors() {
    if (!protectionOn() || state?.settings?.cosmeticFiltering === false || state?.settings?.adLock === false) return [];
    return AD_SELECTORS;
  }

  function activeAnnoyanceSelectors() {
    if (!protectionOn() || state?.settings?.annoyanceLock === false) return [];
    return ANNOYANCE_SELECTORS;
  }

  function updatePageGuardFlags() {
    const root = document.documentElement;
    if (!root) return;
    root.setAttribute('data-qs-bypass', protectionOn() ? '0' : '1');
    root.setAttribute('data-qs-popup-lock', protectionOn() && state?.settings?.popupLock !== false ? '1' : '0');
    root.setAttribute('data-qs-redirect-lock', protectionOn() && state?.settings?.redirectLock !== false ? '1' : '0');
    root.setAttribute('data-qs-annoyance-lock', protectionOn() && state?.settings?.annoyanceLock !== false ? '1' : '0');
  }

  function updateStyle() {
    const selectors = [...activeAdSelectors(), ...activeAnnoyanceSelectors()];
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
    styleNode.textContent = `${selectors.join(',\n')}{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}`;
  }

  function countMatches(root, selectors, seen) {
    if (!root?.querySelectorAll || !selectors.length) return 0;
    let total = 0;
    for (const selector of selectors) {
      let nodes = [];
      try { nodes = root.querySelectorAll(selector); } catch { continue; }
      for (const node of nodes) {
        if (seen.has(node)) continue;
        seen.add(node);
        total += 1;
      }
    }
    return total;
  }

  function flush(force = false) {
    if (!force && pendingAds + pendingAnnoyances < 4) return;
    if (!pendingAds && !pendingAnnoyances) return;
    report({ adHiddenCount: pendingAds, annoyanceHiddenCount: pendingAnnoyances });
    pendingAds = 0;
    pendingAnnoyances = 0;
  }

  function scanCounters(root = document) {
    pendingAds += countMatches(root, activeAdSelectors(), countedAds);
    pendingAnnoyances += countMatches(root, activeAnnoyanceSelectors(), countedAnnoyances);
    flush(false);
  }

  function hideExplicitSponsoredCard(node) {
    if (!(node instanceof Element) || explicitlyHidden.has(node) || !protectionOn() || state?.settings?.adLock === false) return false;
    const isSponsoredLink = node.matches('a[rel~="sponsored"]');
    const isExplicit = node.matches('[data-native-ad],[data-sponsored="true"],[data-promoted="true"],.native-ad,.native-ads,.native_ads,.sponsored-ad,.sponsor-ad,.promoted-ad');
    if (!isSponsoredLink && !isExplicit) return false;

    let target = node;
    if (isSponsoredLink) {
      const card = node.closest('article,li,[role="listitem"]');
      if (card) {
        const rect = card.getBoundingClientRect();
        const viewportArea = Math.max(1, innerWidth * innerHeight);
        const cardArea = Math.max(0, rect.width * rect.height);
        if (cardArea > 0 && cardArea < viewportArea * 0.45) target = card;
      }
    }

    explicitlyHidden.add(target);
    target.setAttribute('data-quietshield-hidden', 'explicit-sponsored');
    target.style.setProperty('display', 'none', 'important');
    pendingAds += 1;
    return true;
  }

  function scanExplicitSponsored(root = document) {
    if (!root?.querySelectorAll || !protectionOn() || state?.settings?.cosmeticFiltering === false || state?.settings?.adLock === false) return;
    let hidden = 0;
    const nodes = root.querySelectorAll('a[rel~="sponsored"],[data-native-ad],[data-sponsored="true"],[data-promoted="true"],.native-ad,.native-ads,.native_ads,.sponsored-ad,.sponsor-ad,.promoted-ad');
    for (const node of nodes) {
      if (hideExplicitSponsoredCard(node)) hidden += 1;
      if (hidden >= 30) break;
    }
    if (hidden) flush(true);
  }

  function ensureObserver() {
    if (observer || !document.documentElement) return;
    observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          scanCounters(node);
          scanExplicitSponsored(node);
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function applyState(next) {
    state = next;
    updatePageGuardFlags();
    updateStyle();
    cleanCurrentUrl();
    scanCounters(document);
    scanExplicitSponsored(document);
    ensureObserver();
  }

  async function refreshState() {
    try {
      const next = await chrome.runtime.sendMessage({ type: 'QS_GET_STATE' });
      if (next?.ok) applyState(next);
    } catch {}
  }

  function onPageGuardMessage(event) {
    if (event.source !== window || event.data?.source !== 'quietshield-page-guard') return;
    if (event.data.type === 'popup-blocked') report({ popupsBlocked: 1 });
    if (event.data.type === 'notification-blocked') report({ annoyanceBlocked: 1 });
  }

  function start() {
    void refreshState();
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && (changes['qs.settings'] || changes['qs.siteModes'])) void refreshState();
    });
    addEventListener('popstate', cleanCurrentUrl);
    addEventListener('hashchange', cleanCurrentUrl);
    addEventListener('message', onPageGuardMessage);
    addEventListener('load', () => {
      scanCounters(document);
      scanExplicitSponsored(document);
      flush(true);
    }, { once: true });
    addEventListener('pagehide', () => flush(true), { once: true });
  }

  if (document.documentElement) start();
  else document.addEventListener('readystatechange', () => { if (document.documentElement) start(); }, { once: true });
})();
