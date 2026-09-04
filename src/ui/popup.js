const $ = id => document.getElementById(id);
let currentTab = null;
let currentDomain = '';
let state = null;

function domainFromUrl(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; }
}

function isWebUrl(url) { return /^https?:/i.test(String(url || '')); }
function webTab() { return Boolean(currentTab?.id && isWebUrl(currentTab?.url) && currentDomain); }
function number(value) { return Intl.NumberFormat().format(Number(value || 0)); }

async function resolveTargetTab() {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (active && isWebUrl(active.url)) return active;
  const tabs = await chrome.tabs.query({ currentWindow: true });
  return tabs
    .filter(tab => isWebUrl(tab.url))
    .sort((a, b) => Number(b.lastAccessed || 0) - Number(a.lastAccessed || 0))[0] || active || null;
}

function setStatus(enabled, mode) {
  const hero = $('hero');
  hero.classList.toggle('paused', !enabled);
  hero.classList.toggle('blocked', enabled && mode === 'blocked');
  $('liveState').classList.toggle('paused', !enabled);
  $('liveState').lastChild.textContent = enabled ? 'Active' : 'Paused';
  if (!enabled) {
    $('statusText').textContent = 'Paused';
    $('statusSub').textContent = 'QuietShield protection is paused';
  } else if (mode === 'trusted') {
    $('statusText').textContent = 'Trusted';
    $('statusSub').textContent = 'This site is allowed by your rule';
  } else if (mode === 'blocked') {
    $('statusText').textContent = 'Blocked';
    $('statusSub').textContent = 'QuietShield blocks this website';
  } else {
    $('statusText').textContent = 'Protected';
    $('statusSub').textContent = 'Blocking ads, trackers and threats';
  }
}

function renderDomains(domains) {
  const box = $('domains');
  box.replaceChildren();
  if (!domains?.length) {
    const n = document.createElement('div');
    n.className = 'muted';
    n.textContent = webTab() ? 'Reload the page to capture live request domains.' : 'Open a web page to inspect its requests.';
    box.append(n);
    return;
  }
  for (const item of domains.slice(0, 4)) {
    const row = document.createElement('div');
    row.className = 'domain';
    const name = document.createElement('span');
    name.textContent = item.domain;
    name.title = item.domain;
    const count = document.createElement('b');
    count.textContent = item.requests || item.blocked || 0;
    if (item.blocked) {
      const blocked = document.createElement('em');
      blocked.textContent = `· ${item.blocked} blocked`;
      count.append(blocked);
    }
    row.append(name, count);
    box.append(row);
  }
}

function renderLocks() {
  const enabled = state?.settings?.enabled !== false;
  document.querySelectorAll('.lock-tile').forEach(btn => {
    const key = btn.dataset.setting;
    const on = enabled && state?.settings?.[key] !== false;
    btn.classList.toggle('on', on);
    btn.disabled = !enabled;
    btn.title = `${btn.querySelector('b')?.textContent || key}: ${state?.settings?.[key] !== false ? 'On' : 'Off'}`;
  });
}

function render() {
  const enabled = state?.settings?.enabled !== false;
  const mode = currentDomain ? (state?.siteModes?.[currentDomain] || 'protected') : 'protected';
  const observed = state?.traffic?.categories || {};
  const matched = state?.traffic?.dnrCategories || {};
  const cat = {
    adsBlocked: Math.max(Number(observed.adsBlocked || 0), Number(matched.adsBlocked || 0)),
    trackersBlocked: Math.max(Number(observed.trackersBlocked || 0), Number(matched.trackersBlocked || 0)),
    threatBlocked: Math.max(Number(observed.threatBlocked || 0), Number(matched.threatBlocked || 0)),
    redirectBlocked: Math.max(Number(observed.redirectBlocked || 0), Number(matched.redirectBlocked || 0)),
    otherBlocked: Math.max(Number(observed.otherBlocked || 0), Number(matched.otherBlocked || 0))
  };
  const categorySum = cat.adsBlocked + cat.trackersBlocked + cat.threatBlocked + cat.redirectBlocked + cat.otherBlocked;
  const blockedNetwork = Math.max(Number(state?.blockedOnTab || 0), Number(state?.traffic?.dnrMatched || 0), categorySum);
  const totalActions = Math.max(blockedNetwork + Number(state?.traffic?.cosmeticHidden || 0) + Number(state?.traffic?.popupsBlocked || 0), Number(state?.traffic?.actionTotal || 0));

  $('enabled').checked = enabled;
  $('site').textContent = currentDomain || 'No web page selected';
  $('adsBlocked').textContent = number(cat.adsBlocked);
  $('trackersBlocked').textContent = number(cat.trackersBlocked);
  $('threatsBlocked').textContent = number(cat.threatBlocked);
  $('redirectsBlocked').textContent = number(cat.redirectBlocked);
  $('requests').textContent = number(state?.traffic?.total);
  $('blocked').textContent = number(blockedNetwork);
  $('domainCount').textContent = number(state?.traffic?.domains?.length);
  $('actionTotal').textContent = number(totalActions);
  $('actionCount').textContent = totalActions ? `${number(totalActions)} protection action${totalActions === 1 ? '' : 's'} on this page` : 'Protection is active on this page';
  $('pauseLabel').textContent = enabled ? 'Pause' : 'Resume';
  $('pauseIcon').textContent = enabled ? 'Ⅱ' : '▶';

  const badge = $('siteBadge');
  badge.textContent = mode === 'trusted' ? 'Trusted' : mode === 'blocked' ? 'Blocked' : 'Protected';
  badge.className = `badge ${mode}`;
  $('connection').textContent = webTab() ? (currentTab.url.startsWith('https:') ? 'HTTPS' : 'HTTP') : 'No active web page';
  setStatus(enabled, mode);
  renderLocks();

  document.querySelectorAll('.mode').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
    btn.disabled = !webTab();
  });
  renderDomains(state?.traffic?.domains || []);
}

async function refresh() {
  currentTab = await resolveTargetTab();
  currentDomain = domainFromUrl(currentTab?.url || '');
  state = await chrome.runtime.sendMessage({ type: 'QS_GET_STATE', tabId: currentTab?.id });
  render();
}

async function reloadWebTab() {
  if (webTab()) {
    try { await chrome.tabs.reload(currentTab.id); } catch {}
  }
}

$('enabled').addEventListener('change', async e => {
  await chrome.runtime.sendMessage({ type: 'QS_SET_ENABLED', enabled: e.target.checked });
  await reloadWebTab();
  await refresh();
});

$('pause').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'QS_SET_ENABLED', enabled: !(state?.settings?.enabled !== false) });
  await reloadWebTab();
  await refresh();
});

document.querySelectorAll('.lock-tile').forEach(btn => btn.addEventListener('click', async () => {
  const key = btn.dataset.setting;
  const next = state?.settings?.[key] === false;
  await chrome.runtime.sendMessage({ type: 'QS_PATCH_SETTINGS', patch: { [key]: next } });
  await reloadWebTab();
  await refresh();
}));

document.querySelectorAll('.mode').forEach(btn => btn.addEventListener('click', async () => {
  if (!webTab()) return;
  await chrome.runtime.sendMessage({ type: 'QS_SET_SITE_MODE', domain: currentDomain, mode: btn.dataset.mode });
  await reloadWebTab();
  await refresh();
}));

function openOptions(hash = '') {
  chrome.tabs.create({ url: chrome.runtime.getURL(`src/ui/options.html${hash}`) });
  window.close();
}

$('settings').addEventListener('click', () => openOptions('#settings'));
$('dashboard').addEventListener('click', () => openOptions('#home'));
$('activity').addEventListener('click', () => openOptions('#activity'));
void refresh();
