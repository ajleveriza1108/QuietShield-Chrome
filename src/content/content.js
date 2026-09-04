(() => {
  const AD_SELECTORS = [
    '.ad-widget','.adWidget','.adsbox','.adbox','.ad-box','.ad-unit','.ad_unit','.ad-slot','.ad_slot','.ad-banner','.ad_banner','.ads-banner','.ads_banner',
    '.advert','.advertisement','.advertising','.sponsored-ad','.sponsor-ad','.native-ad','.native_ads','.native-ads','.native-advert','.native-advertisement',
    '.banner-ad','.banner_ads','.banner-ads','.promoted-content','.promoted-story','.sponsored-content','.sponsored-post','.sponsored-story','.sponsor-content',
    '.recommendation-ad','.recommended-ad','.recommended-content-ad','.ad-container','.ad_container','.ad-wrapper','.ad_wrapper','.ad-placement','.ad_placement',
    '[id="ad"]','[id="ads"]','[id^="ad-"]','[id^="ad_"]','[id^="ads-"]','[id^="ads_"]','[id^="google_ads_"]','[id*="google_ads_iframe"]',
    '[id*="native-ad"]','[id*="native_ad"]','[id*="sponsored-ad"]','[id*="promoted-ad"]','[id*="ad-container"]','[id*="ad_container"]','[id*="ad-wrapper"]','[id*="ad_wrapper"]',
    '[data-ad]','[data-ad-slot]','[data-ad-client]','[data-ad-unit]','[data-adunit]','[data-advertisement]','[data-native-ad]','[data-nativeads]','[data-sponsored]','[data-promoted]','.adsbygoogle',
    '[aria-label="Advertisement"]','[aria-label="advertisement"]','[aria-label="Sponsored"]','[aria-label="sponsored"]','[aria-label^="Advertisement"]','[aria-label^="Sponsored"]',
    '[class~="advertisement"]','[class*="native-ad"]','[class*="native_ad"]','[class*="sponsored-ad"]','[class*="sponsor-ad"]','[class*="promoted-ad"]',
    '[id^="ad-slot-"]','[rel~="sponsored"]'
  ];

  const ANNOYANCE_SELECTORS = [
    '[class*="newsletter-popup"]','[class*="newsletter-modal"]','[id*="newsletter-popup"]','[class*="subscribe-popup"]','[class*="subscribe-modal"]',
    '[class*="push-notification"]','[class*="notification-prompt"]','[class*="webpush"]','[class*="web-push"]','[class*="floating-ad"]','[class*="sticky-ad"]',
    '[class*="ad-interstitial"]','[class*="advert-interstitial"]','[id*="ad-interstitial"]','[id*="advert-interstitial"]','[class*="ad-overlay"]','[id*="ad-overlay"]',
    '[class*="popup-ad"]','[id*="popup-ad"]','[class*="popunder"]','[id*="popunder"]','[class*="in-page-push"]','[id*="in-page-push"]',
    '[class*="adblock-modal"]','[id*="adblock-modal"]','[class*="adblock-overlay"]','[id*="adblock-overlay"]','[class*="anti-adblock"]','[id*="anti-adblock"]'
  ];

  const TRACKING_PARAMS = new Set([
    'utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id','utm_name','utm_reader','utm_viz_id',
    'fbclid','gclid','dclid','gbraid','wbraid','msclkid','mc_cid','mc_eid','igshid','twclid','ttclid','yclid',
    'vero_conv','vero_id','_hsenc','_hsmi','mkt_tok','ref_src','ref_url','s_cid','cmpid','campaignid','adgroupid','creative','keyword','device','gad_source'
  ]);

  const LABEL_RE = /^(?:advertisement|advertising|sponsored|promoted|promoted story|recommended by .{1,80}|paid content|partner content|sponsored content)$/i;
  const ANTI_ADBLOCK_RE = /(?:disable|turn off|pause)\s+(?:your\s+)?ad\s*block(?:er)?|ad\s*block(?:er)?\s+(?:detected|enabled)|whitelist\s+(?:this|our)\s+(?:site|website)|allow\s+ads\s+to\s+continue/i;
  const EDITORIAL_EXAMPLE_RE = /(?:an?\s+example\s+of|for\s+example|how\s+it\s+looks|example\s+image|demonstration)/i;

  let state = null;
  let observer = null;
  let styleNode = null;
  let semanticTimer = null;
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

  function textOf(node, limit = 500) {
    return String(node?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, limit);
  }

  function hideNode(node, reason, category = 'ad') {
    if (!(node instanceof Element) || semanticallyHidden.has(node)) return false;
    semanticallyHidden.add(node);
    node.setAttribute('data-quietshield-hidden', reason);
    node.style.setProperty('display', 'none', 'important');
    node.style.setProperty('visibility', 'hidden', 'important');
    node.style.setProperty('opacity', '0', 'important');
    node.style.setProperty('pointer-events', 'none', 'important');
    if (category === 'annoyance') pendingAnnoyances += 1;
    else pendingAds += 1;
    return true;
  }

  function suitableCard(start) {
    if (!(start instanceof Element)) return null;
    const direct = start.closest?.('article,li,[role="listitem"],[data-ad],[data-sponsored],[data-promoted],[class*="native-ad"],[class*="sponsored"],[class*="promoted"],[class*="advert"]');
    if (direct && direct !== document.body && direct !== document.documentElement) return direct;

    let node = start;
    for (let depth = 0; depth < 4 && node?.parentElement; depth += 1) {
      node = node.parentElement;
      if (node === document.body || node === document.documentElement) break;
      const rect = node.getBoundingClientRect?.();
      const links = node.querySelectorAll?.('a[href]').length || 0;
      const media = node.querySelectorAll?.('img,video,iframe,picture').length || 0;
      const text = textOf(node, 700);
      if (rect && rect.width > 120 && rect.height > 35 && links + media > 0 && text.length < 700) return node;
    }
    return start.parentElement && start.parentElement !== document.body ? start.parentElement : start;
  }

  function isEditorialExample(node) {
    const context = textOf(node?.parentElement || node, 900);
    if (EDITORIAL_EXAMPLE_RE.test(context)) return true;
    const img = node?.querySelector?.('img[alt]') || node?.closest?.('figure')?.querySelector?.('img[alt]');
    return Boolean(img && EDITORIAL_EXAMPLE_RE.test(String(img.alt || '')));
  }

  function looksLikeAdOverlay(node) {
    if (!(node instanceof Element) || !protectionOn() || semanticallyHidden.has(node)) return false;
    let style;
    try { style = getComputedStyle(node); } catch { return false; }
    if (!['fixed','absolute','sticky'].includes(style.position)) return false;
    const rect = node.getBoundingClientRect();
    if (rect.width < Math.min(280, innerWidth * 0.40) || rect.height < 45) return false;
    const ident = `${node.id || ''} ${node.className || ''}`.toLowerCase();
    const text = textOf(node, 400).toLowerCase();
    const adWords = /\b(interstitial ads?|advertisement|sponsored|ad break|promoted|in-page push)\b/i.test(text);
    const adIdentity = /(ad[-_ ]?(overlay|modal|popup|interstitial|banner)|advert|sponsor|popunder|push[-_ ]?ad)/i.test(ident);
    return adWords && (adIdentity || rect.width >= innerWidth * 0.70);
  }

  function looksLikeAntiAdblock(node) {
    if (!(node instanceof Element) || !protectionOn() || state?.settings?.annoyanceLock === false) return false;
    const text = textOf(node, 700);
    if (!ANTI_ADBLOCK_RE.test(text)) return false;
    if (EDITORIAL_EXAMPLE_RE.test(text)) return false;
    let style;
    try { style = getComputedStyle(node); } catch { return false; }
    const rect = node.getBoundingClientRect();
    const ident = `${node.id || ''} ${node.className || ''}`.toLowerCase();
    return ['fixed','sticky'].includes(style.position) || /(?:modal|overlay|popup|adblock|anti-adblock)/i.test(ident) || (rect.width > innerWidth * 0.45 && rect.height > innerHeight * 0.20);
  }

  function scanSemanticAds(root = document) {
    if (!protectionOn() || state?.settings?.adLock === false || state?.settings?.cosmeticFiltering === false || !root?.querySelectorAll) return;
    let hidden = 0;

    const explicit = root.querySelectorAll('[rel~="sponsored"],[data-sponsored],[data-promoted],[data-native-ad],[class*="native-ad"],[class*="sponsored-ad"],[class*="sponsor-ad"],[class*="promoted-ad"]');
    for (const node of explicit) {
      const card = suitableCard(node);
      if (!card || isEditorialExample(card)) continue;
      if (hideNode(card, 'semantic-native-ad', 'ad')) hidden += 1;
      if (hidden >= 30) break;
    }

    if (hidden < 30) {
      const labelCandidates = root.querySelectorAll('span,small,label,p,div');
      let inspected = 0;
      for (const label of labelCandidates) {
        if (++inspected > 3000) break;
        const text = textOf(label, 120);
        if (!text || text.length > 100 || !LABEL_RE.test(text)) continue;
        const card = suitableCard(label);
        if (!card || isEditorialExample(card)) continue;
        if (hideNode(card, 'semantic-sponsored-card', 'ad')) hidden += 1;
        if (hidden >= 30) break;
      }
    }

    if (hidden) flushPending(true);
  }

  function scanOverlaysAndAntiAdblock(root = document) {
    if (!protectionOn() || state?.settings?.annoyanceLock === false || !root?.querySelectorAll) return;
    const candidates = root === document
      ? document.querySelectorAll('[role="dialog"],dialog,[class*="modal"],[class*="overlay"],[class*="popup"],[id*="modal"],[id*="overlay"],[id*="popup"],body > div')
      : [root, ...(root.querySelectorAll?.('[role="dialog"],dialog,[class*="modal"],[class*="overlay"],[class*="popup"],[id*="modal"],[id*="overlay"],[id*="popup"]') || [])];
    let hidden = 0;
    let inspected = 0;
    for (const node of candidates) {
      if (++inspected > 800 || !(node instanceof Element) || semanticallyHidden.has(node)) continue;
      if (looksLikeAdOverlay(node)) {
        if (hideNode(node, 'semantic-ad-overlay', 'ad')) hidden += 1;
      } else if (looksLikeAntiAdblock(node)) {
        if (hideNode(node, 'anti-adblock-overlay', 'annoyance')) hidden += 1;
      }
      if (hidden >= 12) break;
    }
    if (hidden) flushPending(true);
  }

  function scheduleSemanticScan(root = document) {
    if (semanticTimer) clearTimeout(semanticTimer);
    semanticTimer = setTimeout(() => {
      semanticTimer = null;
      scanSemanticAds(root);
      scanOverlaysAndAntiAdblock(root);
    }, 80);
  }

  function ensureObserver() {
    if (observer || !document.documentElement) return;
    observer = new MutationObserver(records => {
      let semanticRoot = null;
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          scanForCounters(node);
          semanticRoot = semanticRoot || node;
        }
      }
      if (semanticRoot) scheduleSemanticScan(semanticRoot);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function applyState(next) {
    state = next;
    updatePageGuardFlags();
    updateStyle();
    cleanCurrentUrl();
    scanForCounters(document);
    scheduleSemanticScan(document);
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
    addEventListener('load', () => {
      scanForCounters(document);
      scanSemanticAds(document);
      scanOverlaysAndAntiAdblock(document);
      flushPending(true);
    }, { once: true });
    addEventListener('pagehide', () => flushPending(true), { once: true });
  };

  if (document.documentElement) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
