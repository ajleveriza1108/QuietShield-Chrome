import { QS, AD_DOMAINS, TRACKER_DOMAINS, THREAT_DOMAINS, REDIRECT_DOMAINS } from '../common/constants.js';
import { addCounters, addDailyStats, clearActivity, ensureInstallId, getCounters, getDailyStats, getSettings, getSiteModes, setSettings, setSiteMode } from '../common/storage.js';
import { callLicenseApi, listStoredLicenseDevices, refreshStoredLicense, removeStoredLicenseDevice } from './licensing.js';

const tabTraffic = new Map();
const MAX_DOMAINS_PER_TAB = 80;
let settingsCache = { ...QS.DEFAULT_SETTINGS };
let siteModesCache = {};
let pendingStats = {};
let flushTimer = null;
let flushPromise = null;

function normalizeDomain(value) {
  return String(value || '').trim().toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
}

function safeDomain(url) {
  try { return normalizeDomain(new URL(url).hostname); } catch { return ''; }
}

function domainMatches(host, candidates) {
  return candidates.some(domain => host === domain || host.endsWith(`.${domain}`));
}

function classificationForDomain(domain) {
  if (!domain) return '';
  if (settingsCache.threatLock && domainMatches(domain, THREAT_DOMAINS)) return 'threatBlocked';
  if (settingsCache.redirectLock && domainMatches(domain, REDIRECT_DOMAINS)) return 'redirectBlocked';
  if (settingsCache.adLock && domainMatches(domain, AD_DOMAINS)) return 'adsBlocked';
  if (settingsCache.trackerLock && domainMatches(domain, TRACKER_DOMAINS)) return 'trackersBlocked';
  return '';
}

function pageDomainForRequest(details) {
  if (details.type === 'main_frame') return safeDomain(details.url);
  return safeDomain(details.documentUrl || details.initiator || '');
}

function queueStat(name, amount = 1) {
  pendingStats[name] = Number(pendingStats[name] || 0) + amount;
  if (Object.values(pendingStats).reduce((sum, n) => sum + n, 0) >= 25) {
    void flushStats();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => { flushTimer = null; void flushStats(); }, 2500);
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
  if (details.tabId < 0 || settingsCache.networkInspector === false) return;
  const requestDomain = safeDomain(details.url);
  if (!requestDomain) return;

  const current = tabTraffic.get(details.tabId) || { total: 0, domains: new Map(), categories: {} };
  current.total += 1;
  const entry = current.domains.get(requestDomain) || { domain: requestDomain, requests: 0, types: {} };
  entry.requests += 1;
  entry.types[details.type] = (entry.types[details.type] || 0) + 1;
  current.domains.set(requestDomain, entry);
  if (current.domains.size > MAX_DOMAINS_PER_TAB) {
    const least = [...current.domains.values()].sort((a, b) => a.requests - b.requests)[0];
    if (least) current.domains.delete(least.domain);
  }
  tabTraffic.set(details.tabId, current);
}

function recordBlockedTraffic(details) {
  if (details.tabId < 0 || !String(details.error || '').includes('BLOCKED_BY_CLIENT')) return;
  const requestDomain = safeDomain(details.url);
  if (!requestDomain || settingsCache.enabled === false) return;
  const pageDomain = pageDomainForRequest(details);
  if (pageDomain && siteModesCache[pageDomain] === 'trusted') return;
  const category = classificationForDomain(requestDomain);
  if (!category) return;

  const current = tabTraffic.get(details.tabId) || { total: 0, domains: new Map(), categories: {} };
  current.categories[category] = Number(current.categories[category] || 0) + 1;
  tabTraffic.set(details.tabId, current);
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
  if (settingsCache.networkInspector === false) tabTraffic.clear();
  return settingsCache;
}

async function applySiteMode(domain, mode) {
  await setSiteMode(domain, mode);
  siteModesCache = await getSiteModes();
  await syncSiteModeRules(settingsCache.enabled !== false);
}

async function stateForTab(tabId) {
  const [settings, siteModes, counters, dailyStats, storedLicense, enabledRulesets] = await Promise.all([
    getSettings(), getSiteModes(), getCounters(), getDailyStats(), chrome.storage.local.get(QS.STORAGE_KEYS.LICENSE), chrome.declarativeNetRequest.getEnabledRulesets()
  ]);
  const traffic = Number.isInteger(tabId) ? tabTraffic.get(tabId) : null;
  const domains = traffic ? [...traffic.domains.values()].sort((a, b) => b.requests - a.requests).slice(0, 20) : [];
  let badge = '';
  if (Number.isInteger(tabId)) badge = await chrome.action.getBadgeText({ tabId });
  return {
    ok: true,
    settings,
    siteModes,
    counters,
    dailyStats,
    enabledRulesets,
    license: storedLicense[QS.STORAGE_KEYS.LICENSE] || null,
    blockedOnTab: Number.parseInt(badge || '0', 10) || 0,
    traffic: { total: traffic?.total || 0, domains, categories: traffic?.categories || {} }
  };
}

chrome.webRequest.onBeforeRequest.addListener(recordTraffic, { urls: ['<all_urls>'] });
chrome.webRequest.onErrorOccurred.addListener(recordBlockedTraffic, { urls: ['<all_urls>'] });
chrome.tabs.onRemoved.addListener(tabId => tabTraffic.delete(tabId));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes[QS.STORAGE_KEYS.SETTINGS] || changes[QS.STORAGE_KEYS.SITE_MODES]) void syncProtectionState().catch(() => {});
});

chrome.runtime.onInstalled.addListener(() => {
  void (async () => {
    await ensureInstallId();
    await setSettings({});
    await syncProtectionState();
    await chrome.declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: true });
    await chrome.action.setBadgeBackgroundColor({ color: '#2f9e44' });
  })().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  void (async () => {
    await syncProtectionState();
    await chrome.declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: true });
  })().catch(() => {});
});

void syncProtectionState().catch(() => {});

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
        if (message.hiddenCount) delta.cosmeticHidden = Number(message.hiddenCount);
        if (message.cleanedParams) delta.trackingParamsCleaned = Number(message.cleanedParams);
        for (const [name, amount] of Object.entries(delta)) queueStat(name, amount);
        sendResponse({ ok: true });
        break;
      }
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
