import { QS } from './constants.js';

export async function getSettings() {
  const result = await chrome.storage.local.get(QS.STORAGE_KEYS.SETTINGS);
  return { ...QS.DEFAULT_SETTINGS, ...(result[QS.STORAGE_KEYS.SETTINGS] || {}) };
}

export async function setSettings(next) {
  const current = await getSettings();
  const merged = { ...current, ...next };
  await chrome.storage.local.set({ [QS.STORAGE_KEYS.SETTINGS]: merged });
  return merged;
}

export async function ensureInstallId() {
  const result = await chrome.storage.local.get(QS.STORAGE_KEYS.INSTALL_ID);
  let id = result[QS.STORAGE_KEYS.INSTALL_ID];
  if (!id) {
    id = crypto.randomUUID();
    await chrome.storage.local.set({ [QS.STORAGE_KEYS.INSTALL_ID]: id });
  }
  return id;
}

export async function getSiteModes() {
  const result = await chrome.storage.local.get(QS.STORAGE_KEYS.SITE_MODES);
  return result[QS.STORAGE_KEYS.SITE_MODES] || {};
}

export async function setSiteMode(domain, mode) {
  const modes = await getSiteModes();
  if (mode === 'protected') delete modes[domain];
  else modes[domain] = mode;
  await chrome.storage.local.set({ [QS.STORAGE_KEYS.SITE_MODES]: modes });
  return modes;
}

export async function incrementCounter(name, amount = 1) {
  const result = await chrome.storage.local.get(QS.STORAGE_KEYS.COUNTERS);
  const counters = result[QS.STORAGE_KEYS.COUNTERS] || {};
  counters[name] = Math.max(0, Number(counters[name] || 0) + amount);
  await chrome.storage.local.set({ [QS.STORAGE_KEYS.COUNTERS]: counters });
  return counters;
}

export async function getCounters() {
  const result = await chrome.storage.local.get(QS.STORAGE_KEYS.COUNTERS);
  return result[QS.STORAGE_KEYS.COUNTERS] || {};
}
