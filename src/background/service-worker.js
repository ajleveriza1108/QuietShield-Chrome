import { QS } from '../common/constants.js';
import { getCounters, getSettings, getSiteModes, incrementCounter, ensureInstallId, setSettings, setSiteMode } from '../common/storage.js';
import { callLicenseApi, listStoredLicenseDevices, refreshStoredLicense, removeStoredLicenseDevice, setAppsScriptEndpoint } from './licensing.js';

const tabTraffic = new Map();
const MAX_DOMAINS_PER_TAB = 80;
let networkInspectorEnabled = true;

getSettings().then(settings => { networkInspectorEnabled = settings.networkInspector !== false; });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[QS.STORAGE_KEYS.SETTINGS]) {
    networkInspectorEnabled = changes[QS.STORAGE_KEYS.SETTINGS].newValue?.networkInspector !== false;
    if (!networkInspectorEnabled) tabTraffic.clear();
  }
});

function safeDomain(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); }
  catch { return ''; }
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
    return {
      id: dynamicRuleId(domain, mode),
      priority: 10000,
      action: { type: 'allowAllRequests' },
      condition: { requestDomains: [domain], resourceTypes: ['main_frame'] }
    };
  }
  if (mode === 'blocked') {
    return {
      id: dynamicRuleId(domain, mode),
      priority: 20000,
      action: { type: 'block' },
      condition: { requestDomains: [domain], resourceTypes: ['main_frame', 'sub_frame'] }
    };
  }
  return null;
}

async function removeAllSiteModeRules() {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing
    .filter(rule => rule.id >= 100000 && rule.id < 1000000)
    .map(rule => rule.id);
  if (removeRuleIds.length) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds });
  }
}

async function syncSiteModeRules(enabled) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing
    .filter(rule => rule.id >= 100000 && rule.id < 1000000)
    .map(rule => rule.id);
  const addRules = [];
  if (enabled) {
    const modes = await getSiteModes();
    for (const [domain, mode] of Object.entries(modes)) {
      const rule = siteModeRule(domain, mode);
      if (rule) addRules.push(rule);
    }
  }
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

async function applySiteMode(domain, mode) {
  await setSiteMode(domain, mode);
  const settings = await getSettings();
  if (settings.enabled === false) {
    await removeAllSiteModeRules();
    return;
  }

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing
    .filter(rule => rule.id >= 100000 && rule.id < 1000000 && rule.condition?.requestDomains?.includes(domain))
    .map(rule => rule.id);
  const rule = siteModeRule(domain, mode);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: rule ? [rule] : []
  });
}

async function syncProtectionState() {
  const settings = await getSettings();
  const enabled = settings.enabled !== false;
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enabled ? ['qs_base'] : [],
    disableRulesetIds: enabled ? [] : ['qs_base']
  });
  await syncSiteModeRules(enabled);
  networkInspectorEnabled = settings.networkInspector !== false;
  if (!networkInspectorEnabled) tabTraffic.clear();
  return settings;
}

function recordTraffic(details) {
  if (!networkInspectorEnabled || details.tabId < 0) return;
  const domain = safeDomain(details.url);
  if (!domain) return;
  const current = tabTraffic.get(details.tabId) || { total: 0, domains: new Map() };
  current.total += 1;
  const entry = current.domains.get(domain) || { domain, requests: 0, types: {} };
  entry.requests += 1;
  entry.types[details.type] = (entry.types[details.type] || 0) + 1;
  current.domains.set(domain, entry);
  if (current.domains.size > MAX_DOMAINS_PER_TAB) {
    const least = [...current.domains.values()].sort((a, b) => a.requests - b.requests)[0];
    if (least) current.domains.delete(least.domain);
  }
  tabTraffic.set(details.tabId, current);
}

chrome.webRequest.onBeforeRequest.addListener(recordTraffic, { urls: ['<all_urls>'] });

chrome.tabs.onRemoved.addListener(tabId => tabTraffic.delete(tabId));

chrome.runtime.onInstalled.addListener(async () => {
  await ensureInstallId();
  await setSettings({});
  await syncProtectionState();
  await chrome.declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: true });
  await chrome.action.setBadgeBackgroundColor({ color: '#166534' });
});

chrome.runtime.onStartup.addListener(async () => {
  await syncProtectionState();
  await chrome.declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: true });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case 'QS_GET_STATE': {
        const [settings, siteModes, counters, storedLicense] = await Promise.all([
          getSettings(), getSiteModes(), getCounters(), chrome.storage.local.get(QS.STORAGE_KEYS.LICENSE)
        ]);
        const tabId = Number(message.tabId);
        const traffic = tabTraffic.get(tabId);
        const domains = traffic ? [...traffic.domains.values()].sort((a, b) => b.requests - a.requests).slice(0, 20) : [];
        let badge = '';
        if (Number.isInteger(tabId)) badge = await chrome.action.getBadgeText({ tabId });
        sendResponse({
          ok: true,
          settings,
          siteModes,
          counters,
          license: storedLicense[QS.STORAGE_KEYS.LICENSE] || null,
          blockedOnTab: Number.parseInt(badge || '0', 10) || 0,
          traffic: { total: traffic?.total || 0, domains }
        });
        break;
      }
      case 'QS_SET_ENABLED': {
        await setSettings({ enabled: Boolean(message.enabled) });
        const settings = await syncProtectionState();
        sendResponse({ ok: true, settings });
        break;
      }
      case 'QS_SET_SITE_MODE': {
        const domain = String(message.domain || '').toLowerCase();
        if (!domain) throw new Error('Missing site domain.');
        const mode = ['protected', 'trusted', 'blocked'].includes(message.mode) ? message.mode : 'protected';
        await applySiteMode(domain, mode);
        sendResponse({ ok: true, mode });
        break;
      }
      case 'QS_COSMETIC_EVENT': {
        if (message.hiddenCount) await incrementCounter('cosmeticHidden', Number(message.hiddenCount));
        if (message.cleanedParams) await incrementCounter('trackingParamsCleaned', Number(message.cleanedParams));
        sendResponse({ ok: true });
        break;
      }
      case 'QS_LICENSE_CALL': {
        sendResponse(await callLicenseApi(message.action, message.payload || {}));
        break;
      }
      case 'QS_LICENSE_REFRESH': {
        sendResponse(await refreshStoredLicense());
        break;
      }
      case 'QS_LICENSE_LIST_DEVICES': {
        sendResponse(await listStoredLicenseDevices());
        break;
      }
      case 'QS_LICENSE_REMOVE_DEVICE': {
        sendResponse(await removeStoredLicenseDevice(message.targetDeviceHash));
        break;
      }
      case 'QS_SET_LICENSE_ENDPOINT': {
        const endpoint = await setAppsScriptEndpoint(message.endpoint);
        sendResponse({ ok: true, endpoint });
        break;
      }
      default:
        sendResponse({ ok: false, code: 'UNKNOWN_MESSAGE' });
    }
  })().catch(error => sendResponse({ ok: false, code: 'ERROR', message: error?.message || String(error) }));
  return true;
});
