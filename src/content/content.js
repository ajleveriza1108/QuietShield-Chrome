(() => {
  const AD_SELECTORS = [
    '.ad-widget','.adWidget','.adsbox','.adbox','.ad-box','.ad-unit','.ad_unit','.ad-slot','.ad_slot','.ad-banner','.ad_banner','.ads-banner','.ads_banner',
    '.advert','.advertisement','.advertising','.sponsored-ad','.sponsor-ad','.native-ad','.native_ads','.native-ads','.banner-ad','.banner_ads','.banner-ads',
    '[id="ad"]','[id="ads"]','[id^="ad-"]','[id^="ad_"]','[id^="ads-"]','[id^="ads_"]','[id^="google_ads_"]','[id*="google_ads_iframe"]',
    '[data-ad]','[data-ad-slot]','[data-ad-client]','[data-ad-unit]','[data-adunit]','[data-advertisement]','.adsbygoogle',
    '[aria-label="Advertisement"]','[aria-label="advertisement"]','[aria-label="Sponsored"]','[aria-label="sponsored"]',
    '[class~="advertisement"]','[class*="ad-container"]','[class*="ad_container"]','[class*="ad-wrapper"]','[class*="ad_wrapper"]','[class*="ad-placement"]','[class*="ad_placement"]',
    '[id^="ad-slot-"]','[id*="ad-container"]','[id*="ad_container"]','[id*="ad-wrapper"]','[id*="ad_wrapper"]'
  ];

  const ANNOYANCE_SELECTORS = [
    '[class*="newsletter-popup"]','[class*="newsletter-modal"]','[id*="newsletter-popup"]','[class*="subscribe-popup"]','[class*="subscribe-modal"]',
    '[class*="push-notification"]','[class*="notification-prompt"]','[class*="webpush"]','[class*="web-push"]','[class*="floating-ad"]','[class*="sticky-ad"]',
    '[class*="ad-interstitial"]','[class*="advert-interstitial"]','[id*="ad-interstitial"]','[id*="advert-interstitial"]','[class*="ad-overlay"]','[id*="ad-overlay"]',
    '[class*="popup-ad"]','[id*="popup-ad"]','[class*="popunder"]','[id*="popunder"]'
  ];

  const TRACKING_PARAMS = new Set([
    'utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id','utm_name','utm_reader','utm_viz_id',
    'fbclid','gclid','dclid','gbraid','wbraid','msclkid','mc_cid','mc_eid','igshid','twclid','ttclid','yclid',
    'vero_conv','vero_id','_hsenc','_hsmi','mkt_tok','ref_src','ref_url','s_cid','cmpid','campaignid','adgroupid','creative','keyword','device','gad_source'
  ]);

  let state = null;
  let observer = null;
  let styleNode = null;
  const countedAds = new WeakSet();
  const countedAnnoyances = new WeakSet();
  const semanticallyHidden = new WeakSet();
  let pendingAds = 0;
  let pendingAnnoyances = 0;

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

  function countSelectorMatches(root, selectors, countedSet) {
    if (!selectors.length || !root?.querySelectorAll) return 0;
    let count = 0;
    for (const selector of selectors) {
      let nodes = [];
      try { nodes = root.querySelectorAll(selector); } catch { continue; }
      for (const node of nodes) {
        if (countedSet.has(node)) continue;
        countedSet.add(node);
        count += 1;
      }
    }
    return count;
  }

  function flushPending(force = false) {
    if (!force && pendingAds + pendingAnnoyances < 4) return;
    if (pendingAds || pendingAnnoyances) {
      report({ adHiddenCount: pendingAds, annoyanceHiddenCount: pendingAnnoyances });
      pendingAds = 0;
      pendingAnnoyances = 0;
    }
  }

  function scanForCounters(root = document) {
    pendingAds += countSelectorMatches(root, activeAdSelectors(), countedAds);
    pendingAnnoyances += countSelectorMatches(root, activeAnnoyanceSelectors(), countedAnnoyances);
    flushPending(false);
  }

  function looksLikeAdOverlay(node) {
    if (!(node instanceof Element) || !protectionOn()) return false;
    if (semanticallyHidden.has(node)) return false;
    let style;
    try { style = getComputedStyle(node); } catch { return false; }
    if (!['fixed','absolute'].includes(style.position)) return false;
    const rect = node.getBoundingClientRect();
    if (rect.width < Math.min(300, innerWidth * 0.45) || rect.height < 45) return false;
    const ident = `${node.id || ''} ${node.className || ''}`.toLowerCase();
    const text = String(node.textContent || '').replace(/\s+/g,' ').trim().slice(0,300).toLowerCase();
    const adWords = /\b(interstitial ads?|advertisement|sponsored|ad break|promoted)\b/i.test(text);
    const adIdentity = /(ad[-_ ]?(overlay|modal|popup|interstitial|banner)|advert|sponsor|popunder)/i.test(ident);
    const extremeTest = /(^|\.)canyoublockit\.com$/.test(domain()) && /interstitial ads?|wait\s*\d+|advertisement/.test(text);
    return extremeTest || (adWords && adIdentity);
  }

  function hideSemanticOverlays(root = document) {
    if (!protectionOn() || state?.settings?.annoyanceLock === false || !root?.querySelectorAll) return;
    const candidates = root === document ? document.querySelectorAll('body *') : [root, ...(root.querySelectorAll?.('*') || [])];
    let hidden = 0;
    for (const node of candidates) {
      if (!looksLikeAdOverlay(node)) continue;
      semanticallyHidden.add(node);
      node.setAttribute('data-quietshield-hidden','semantic-ad-overlay');
      node.style.setProperty('display','none','important');
      node.style.setProperty('visibility','hidden','important');
      hidden += 1;
      if (hidden >= 8) break;
    }
    if (hidden) {
      pendingAds += hidden;
      flushPending(true);
    }
  }

  function ensureObserver() {
    if (observer || !document.documentElement) return;
    observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          scanForCounters(node);
          hideSemanticOverlays(node);
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
    scanForCounters(document);
    hideSemanticOverlays(document);
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

  const start = () => {
    void refreshState();
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && (changes['qs.settings'] || changes['qs.siteModes'])) void refreshState();
    });
    addEventListener('popstate', cleanCurrentUrl);
    addEventListener('hashchange', cleanCurrentUrl);
    addEventListener('message', onPageGuardMessage);
    addEventListener('load', () => { scanForCounters(document); hideSemanticOverlays(document); flushPending(true); }, { once: true });
    addEventListener('pagehide', () => flushPending(true), { once: true });
  };

  if (document.documentElement) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
