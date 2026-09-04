import { QS, AD_DOMAINS, TRACKER_DOMAINS, THREAT_DOMAINS, REDIRECT_DOMAINS } from '../common/constants.js';
import { addCounters, addDailyStats, clearActivity, ensureInstallId, getCounters, getDailyStats, getSettings, getSiteModes, setSettings, setSiteMode } from '../common/storage.js';
import { callLicenseApi, listStoredLicenseDevices, refreshStoredLicense, removeStoredLicenseDevice } from './licensing.js';

const tabTraffic = new Map();
const MAX_DOMAINS_PER_TAB = 100;
let settingsCache = { ...QS.DEFAULT_SETTINGS };
let siteModesCache = {};
let pendingStats = {};
let flushTimer = null;
let flushPromise = null;

const AD_PATH_RE = /(?:^|[\/_?&.=-])(?:ads?|advert(?:s|ising|isement)?|adserver|adserve|admanager|adsense|banner(?:s|ads)?|sponsor(?:ed)?|prebid|interstitial|native[-_]?ads?|floating[-_]?ads?)(?:[\/_?&.=-]|$)/i;
const TRACKER_PATH_RE = /(?:^|[\/_?&.=-])(?:analytics|collect|beacon|pixel|telemetry|tracking|pageview|metrics|events?\/collect)(?:[\/_?&.=-]|$)/i;
const REDIRECT_PATH_RE = /(?:popunder|popup|exitpop|smartpop|\/afu\.php|\/apu\.php|redirect\?feed=|click\?pid=)/i;

function normalizeDomain(value) {
  return String(value || '').trim().toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
}

function safeUrl(url) {
  try { return new URL(url); } catch { return null; }
}

function safeDomain(url) {
  const parsed = safeUrl(url);
  return parsed ? normalizeDomain(parsed.hostname) : '';
}

function domainMatches(host, candidates) {
  return Boolean(host) && candidates.some(domain => host === domain || host.endsWith(`.${domain}`));
}

function newTabState() {
  return {
    startedAt: Date.now(),
    total: 0,
    domains: new Map(),
    categories: {},
    cosmeticHidden: 0,
    annoyanceHidden: 0,
    trackingParamsCleaned: 0,
    popupsBlocked: 0,
    actionTotal: 0
  };
}

function getTabState(tabId) {
  let current = tabTraffic.get(tabId);
  if (!current) {
    current = newTabState();
    tabTraffic.set(tabId, current);
  }
  return current;
}

function incrementTab(tabId, key, amount = 1) {
  if (!Number.isInteger(tabId) || tabId < 0 || !amount) return;
  const current = getTabState(tabId);
  current[key] = Number(current[key] || 0) + Number(amount || 0);
  current.actionTotal = Number(current.actionTotal || 0) + Number(amount || 0);
}

function incrementTabCategory(tabId, category, amount = 1) {
  if (!Number.isInteger(tabId) || tabId < 0 || !category || !amount) return;
  const current = getTabState(tabId);
  current.categories[category] = Number(current.categories[category] || 0) + Number(amount || 0);
  current.actionTotal = Number(current.actionTotal || 0) + Number(amount || 0);
}

function classificationForRequest(url, requestDomain) {
  if (settingsCache.threatLock !== false && domainMatches(requestDomain, THREAT_DOMAINS)) return 'threatBlocked';
  if (settingsCache.redirectLock !== false && (domainMatches(requestDomain, REDIRECT_DOMAINS) || REDIRECT_PATH_RE.test(String(url || '')))) return 'redirectBlocked';
  if (settingsCache.adLock !== false && (domainMatches(requestDomain, AD_DOMAINS) || AD_PATH_RE.test(String(url || '')))) return 'adsBlocked';
  if (settingsCache.trackerLock !== false && (domainMatches(requestDomain, TRACKER_DOMAINS) || TRACKER_PATH_RE.test(String(url || '')))) return 'trackersBlocked';
  return '';
}

function pageDomainForRequest(details) {
  if (details.type === 'main_frame') return safeDomain(details.url);
  return safeDomain(details.documentUrl || details.initiator || '');
}

function queueStat(name, amount = 1) {
  const numeric = Number(amount || 0);
  if (!numeric) return;
  pendingStats[name] = Number(pendingStats[name] || 0) + numeric;
  if (Object.values(pendingStats).reduce((sum, n) => sum + n, 0) >= 25) {
    void flushStats();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => { flushTimer = null; void flushStats(); }, 1500);
  }
}

async function flushStats() {
  if (flushPromise) return flushPromise;
  if (!Object.keys(pendingStats).length) return;
  flushPromise = (async () => {
    while (Object.keys(pendingStats).length) {
      const delta = pendingStats;
      pendingStats = {};
      await Promise.all([addCounters(delta), addDailyStats(delta)]);
    }
  })()
    .catch(() => {})
    .finally(() => { flushPromise = null; });
  return flushPromise;
}

function recordTraffic(details) {
  if (details.tabId < 0) return;
  if (details.type === 'main_frame') tabTraffic.set(details.tabId, newTabState());
  if (settingsCache.networkInspector === false) return;
  const requestDomain = safeDomain(details.url);
  if (!requestDomain) return;

  const current = getTabState(details.tabId);
  current.total += 1;
  const entry = current.domains.get(requestDomain) || { domain: requestDomain, requests: 0, blocked: 0, types: {} };
  entry.requests += 1;
  entry.types[details.type] = (entry.types[details.type] || 0) + 1;
  current.domains.set(requestDomain, entry);
  if (current.domains.size > MAX_DOMAINS_PER_TAB) {
    const least = [...current.domains.values()].sort((a, b) => a.requests - b.requests)[0];
    if (least) current.domains.delete(least.domain);
  }
}

function recordBlockedTraffic(details) {
  if (details.tabId < 0 || !String(details.error || '').includes('BLOCKED_BY_CLIENT')) return;
  const requestDomain = safeDomain(details.url);
  if (!requestDomain || settingsCache.enabled === false) return;
  const pageDomain = pageDomainForRequest(details);
  if (pageDomain && siteModesCache[pageDomain] === 'trusted') return;
  const category = classificationForRequest(details.url, requestDomain) || 'otherBlocked';

  const current = getTabState(details.tabId);
  incrementTabCategory(details.tabId, category, 1);
  const entry = current.domains.get(requestDomain) || { domain: requestDomain, requests: 0, blocked: 0, types: {} };
  entry.blocked = Number(entry.blocked || 0) + 1;
  current.domains.set(requestDomain, entry);
  queueStat(category, 1);
}

function dynamicRuleId(domain, mode) {
  let hash = 2166136261;
  for (const ch of `${mode}:${domain}`) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return 100000 + (Math.abs(hash >>> 0) % 900000);
}

function siteModeRule(domain, mode) {
  if (mode === 'trusted') {
    return { id: dynamicRuleId(domain, mode), priority: 10000, action: { type: 'allowAllRequests' }, condition: { requestDomains: [domain], resourceTypes: ['main_frame'] } };
  }
  if (mode === 'blocked') {
    return { id: dynamicRuleId(domain, mode), priority: 20000, action: { type: 'block' }, condition: { requestDomains: [domain], resourceTypes: ['main_frame', 'sub_frame'] } };
  }
  return null;
}

async function syncSiteModeRules(enabled) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.filter(rule => rule.id >= 100000 && rule.id < 1000000).map(rule => rule.id);
  const addRules = [];
  if (enabled) {
    for (const [domain, mode] of Object.entries(siteModesCache)) {
      const rule = siteModeRule(domain, mode);
      if (rule) addRules.push(rule);
    }
  }
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

async function syncProtectionState() {
  settingsCache = await getSettings();
  siteModesCache = await getSiteModes();
  const master = settingsCache.enabled !== false;
  const active = new Set();
  if (master && settingsCache.adLock !== false) active.add('qs_ads');
  if (master && settingsCache.trackerLock !== false) active.add('qs_trackers');
  if (master && settingsCache.threatLock !== false) active.add('qs_security');
  if (master && settingsCache.redirectLock !== false) active.add('qs_redirects');
  if (master && settingsCache.httpsUpgrade === true) active.add('qs_upgrade');
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: [...active],
    disableRulesetIds: QS.RULESETS.filter(id => !active.has(id))
  });
  await syncSiteModeRules(master);
  if (settingsCache.networkInspector === false) {
    for (const current of tabTraffic.values()) {
      current.total = 0;
      current.domains = new Map();
    }
  }
  return settingsCache;
}

async function applySiteMode(domain, mode) {
  await setSiteMode(domain, mode);
  siteModesCache = await getSiteModes();
  await syncSiteModeRules(settingsCache.enabled !== false);
}


function dnrCategoryForMatchedRule(rule) {
  const rulesetId = String(rule?.rulesetId || '');
  const ruleId = Number(rule?.ruleId || 0);
  if (rulesetId === 'qs_ads' || (ruleId >= 1000 && ruleId < 2000)) return 'adsBlocked';
  if (rulesetId === 'qs_trackers' || (ruleId >= 2000 && ruleId < 3000)) return 'trackersBlocked';
  if (rulesetId === 'qs_security' || (ruleId >= 3000 && ruleId < 4000)) return 'threatBlocked';
  if (rulesetId === 'qs_redirects' || (ruleId >= 4000 && ruleId < 5000)) return 'redirectBlocked';
  if (rulesetId === '_dynamic' && ruleId >= 100000) return 'siteRule';
  return 'otherBlocked';
}

async function matchedDnrForTab(tabId, minTimeStamp) {
  if (!Number.isInteger(tabId) || tabId < 0) return { available: false, count: 0, categories: {} };
  try {
    const result = await chrome.declarativeNetRequest.getMatchedRules({ tabId, minTimeStamp: Number(minTimeStamp || 0) });
    const rows = Array.isArray(result?.rulesMatchedInfo) ? result.rulesMatchedInfo : [];
    const categories = {};
    for (const row of rows) {
      const category = dnrCategoryForMatchedRule(row.rule);
      if (category === 'siteRule') continue;
      categories[category] = Number(categories[category] || 0) + 1;
    }
    return { available: true, count: Object.values(categories).reduce((sum, n) => sum + Number(n || 0), 0), categories };
  } catch {
    return { available: false, count: 0, categories: {} };
  }
}

async function runEngineSelfTest() {
  const tests = [
    { name: 'Google display ad script', url: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', type: 'script', expected: 'qs_ads' },
    { name: 'Third-party Advanced Ads asset', url: 'https://cdn.publisher-example.net/wp-content/plugins/advanced-ads/public/assets/js/advanced.min.js', type: 'script', expected: 'qs_ads' },
    { name: 'Third-party native ad widget', url: 'https://cdn.publisher-example.net/native-ads/widget.js', type: 'script', expected: 'qs_ads' },
    { name: 'Google Analytics collection', url: 'https://www.google-analytics.com/g/collect?v=2', type: 'xmlhttprequest', expected: 'qs_trackers' },
    { name: 'Cryptomining script', url: 'https://coinhive.com/lib/coinhive.min.js', type: 'script', expected: 'qs_security' },
    { name: 'Pop-under network', url: 'https://popads.net/pop.js', type: 'script', expected: 'qs_redirects' }
  ];
  const results = [];
  for (const test of tests) {
    try {
      const outcome = await chrome.declarativeNetRequest.testMatchOutcome({ url: test.url, type: test.type, initiator: 'https://example.com/' });
      const matched = Array.isArray(outcome?.matchedRules) ? outcome.matchedRules : [];
      const passed = matched.some(rule => String(rule.rulesetId || '') === test.expected);
      results.push({ ...test, passed, matched: matched.map(rule => ({ ruleId: rule.ruleId, rulesetId: rule.rulesetId })) });
    } catch (error) {
      return { ok: false, available: false, code: 'SELF_TEST_UNAVAILABLE', message: error?.message || 'Chrome DNR self-test is unavailable. Load QuietShield as an unpacked extension and try again.', results };
    }
  }
  const passed = results.filter(row => row.passed).length;
  return { ok: passed === results.length, available: true, passed, total: results.length, results, message: passed === results.length ? `All ${passed} network-engine tests passed.` : `${passed} of ${results.length} network-engine tests passed.` };
}

async function stateForTab(tabId) {
  const [settings, siteModes, counters, dailyStats, storedLicense, enabledRulesets] = await Promise.all([
    getSettings(), getSiteModes(), getCounters(), getDailyStats(), chrome.storage.local.get(QS.STORAGE_KEYS.LICENSE), chrome.declarativeNetRequest.getEnabledRulesets()
  ]);
  const traffic = Number.isInteger(tabId) ? tabTraffic.get(tabId) : null;
  const domains = traffic ? [...traffic.domains.values()].sort((a, b) => (b.blocked || 0) - (a.blocked || 0) || b.requests - a.requests).slice(0, 24) : [];
  const matchedDnr = await matchedDnrForTab(tabId, traffic?.startedAt || (Date.now() - 5 * 60 * 1000));
  let badge = '';
  if (Number.isInteger(tabId)) {
    try { badge = await chrome.action.getBadgeText({ tabId }); } catch {}
  }
  const dnrCount = Number.parseInt(badge || '0', 10) || 0;
  return {
    ok: true,
    settings,
    siteModes,
    counters,
    dailyStats,
    enabledRulesets,
    license: storedLicense[QS.STORAGE_KEYS.LICENSE] || null,
    blockedOnTab: Math.max(dnrCount, matchedDnr.count || 0),
    traffic: {
      total: traffic?.total || 0,
      domains,
      categories: traffic?.categories || {},
      dnrAvailable: matchedDnr.available,
      dnrCategories: matchedDnr.categories || {},
      dnrMatched: matchedDnr.count || 0,
      cosmeticHidden: traffic?.cosmeticHidden || 0,
      annoyanceHidden: traffic?.annoyanceHidden || 0,
      trackingParamsCleaned: traffic?.trackingParamsCleaned || 0,
      popupsBlocked: traffic?.popupsBlocked || 0,
      actionTotal: Math.max(dnrCount, traffic?.actionTotal || 0)
    }
  };
}

chrome.webRequest.onBeforeRequest.addListener(recordTraffic, { urls: ['<all_urls>'] });
chrome.webRequest.onErrorOccurred.addListener(recordBlockedTraffic, { urls: ['<all_urls>'] });
chrome.tabs.onRemoved.addListener(tabId => tabTraffic.delete(tabId));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes[QS.STORAGE_KEYS.SETTINGS] || changes[QS.STORAGE_KEYS.SITE_MODES]) void syncProtectionState().catch(() => {});
});

async function enableActionBadge() {
  await chrome.declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: true });
  await chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
}

chrome.runtime.onInstalled.addListener(() => {
  void (async () => {
    await ensureInstallId();
    await setSettings({});
    await syncProtectionState();
    await enableActionBadge();
  })().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  void (async () => {
    await syncProtectionState();
    await enableActionBadge();
  })().catch(() => {});
});

void syncProtectionState().catch(() => {});
void enableActionBadge().catch(() => {});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  void (async () => {
    switch (message?.type) {
      case 'QS_GET_STATE':
        sendResponse(await stateForTab(Number.isInteger(Number(message.tabId)) ? Number(message.tabId) : sender.tab?.id));
        break;
      case 'QS_SET_ENABLED':
        await setSettings({ enabled: Boolean(message.enabled) });
        sendResponse({ ok: true, settings: await syncProtectionState() });
        break;
      case 'QS_PATCH_SETTINGS':
        await setSettings(message.patch && typeof message.patch === 'object' ? message.patch : {});
        sendResponse({ ok: true, settings: await syncProtectionState() });
        break;
      case 'QS_SET_SITE_MODE': {
        const domain = normalizeDomain(message.domain);
        if (!domain || !/^[a-z0-9.-]+$/.test(domain)) throw new Error('Enter a valid site domain.');
        const mode = ['protected', 'trusted', 'blocked'].includes(message.mode) ? message.mode : 'protected';
        await applySiteMode(domain, mode);
        sendResponse({ ok: true, mode, siteModes: siteModesCache });
        break;
      }
      case 'QS_COSMETIC_EVENT': {
        const delta = {};
        const tabId = sender.tab?.id;
        const adHidden = Math.max(0, Number(message.adHiddenCount || message.hiddenCount || 0));
        const annoyanceHidden = Math.max(0, Number(message.annoyanceHiddenCount || 0));
        const cleaned = Math.max(0, Number(message.cleanedParams || 0));
        const popups = Math.max(0, Number(message.popupsBlocked || 0));
        const annoyanceBlocked = Math.max(0, Number(message.annoyanceBlocked || 0));

        if (adHidden) {
          delta.adsBlocked = (delta.adsBlocked || 0) + adHidden;
          delta.cosmeticHidden = (delta.cosmeticHidden || 0) + adHidden;
          incrementTabCategory(tabId, 'adsBlocked', adHidden);
          incrementTab(tabId, 'cosmeticHidden', adHidden);
        }
        if (annoyanceHidden) {
          delta.annoyanceHidden = (delta.annoyanceHidden || 0) + annoyanceHidden;
          delta.cosmeticHidden = (delta.cosmeticHidden || 0) + annoyanceHidden;
          incrementTab(tabId, 'annoyanceHidden', annoyanceHidden);
        }
        if (cleaned) {
          delta.trackingParamsCleaned = cleaned;
          incrementTab(tabId, 'trackingParamsCleaned', cleaned);
        }
        if (popups) {
          delta.popupsBlocked = popups;
          incrementTab(tabId, 'popupsBlocked', popups);
        }
        if (annoyanceBlocked) {
          delta.annoyanceBlocked = annoyanceBlocked;
          incrementTab(tabId, 'annoyanceHidden', annoyanceBlocked);
        }
        for (const [name, amount] of Object.entries(delta)) queueStat(name, amount);
        sendResponse({ ok: true });
        break;
      }
      case 'QS_ENGINE_SELF_TEST':
        sendResponse(await runEngineSelfTest());
        break;
      case 'QS_CLEAR_ACTIVITY':
        if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
        if (flushPromise) await flushPromise;
        pendingStats = {};
        await clearActivity();
        sendResponse({ ok: true });
        break;
      case 'QS_LICENSE_CALL':
        sendResponse(await callLicenseApi(message.action, message.payload || {}));
        break;
      case 'QS_LICENSE_REFRESH':
        sendResponse(await refreshStoredLicense());
        break;
      case 'QS_LICENSE_LIST_DEVICES':
        sendResponse(await listStoredLicenseDevices());
        break;
      case 'QS_LICENSE_REMOVE_DEVICE':
        sendResponse(await removeStoredLicenseDevice(message.targetDeviceHash));
        break;
      default:
        sendResponse({ ok: false, code: 'UNKNOWN_MESSAGE' });
    }
  })().catch(error => sendResponse({ ok: false, code: 'ERROR', message: error?.message || String(error) }));
  return true;
});
