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

export async function addCounters(delta = {}) {
  const result = await chrome.storage.local.get(QS.STORAGE_KEYS.COUNTERS);
  const counters = { ...(result[QS.STORAGE_KEYS.COUNTERS] || {}) };
  for (const [name, amount] of Object.entries(delta)) {
    counters[name] = Math.max(0, Number(counters[name] || 0) + Number(amount || 0));
  }
  await chrome.storage.local.set({ [QS.STORAGE_KEYS.COUNTERS]: counters });
  return counters;
}

export async function getCounters() {
  const result = await chrome.storage.local.get(QS.STORAGE_KEYS.COUNTERS);
  return result[QS.STORAGE_KEYS.COUNTERS] || {};
}

function dayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function addDailyStats(delta = {}) {
  const result = await chrome.storage.local.get(QS.STORAGE_KEYS.DAILY_STATS);
  const all = { ...(result[QS.STORAGE_KEYS.DAILY_STATS] || {}) };
  const key = dayKey();
  const row = { ...(all[key] || {}) };
  for (const [name, amount] of Object.entries(delta)) row[name] = Math.max(0, Number(row[name] || 0) + Number(amount || 0));
  all[key] = row;
  const keys = Object.keys(all).sort();
  while (keys.length > 14) delete all[keys.shift()];
  await chrome.storage.local.set({ [QS.STORAGE_KEYS.DAILY_STATS]: all });
  return all;
}

export async function getDailyStats() {
  const result = await chrome.storage.local.get(QS.STORAGE_KEYS.DAILY_STATS);
  return result[QS.STORAGE_KEYS.DAILY_STATS] || {};
}

export async function clearActivity() {
  await chrome.storage.local.remove([QS.STORAGE_KEYS.COUNTERS, QS.STORAGE_KEYS.DAILY_STATS]);
}
