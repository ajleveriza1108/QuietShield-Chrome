const el = id => document.getElementById(id);
let currentTab = null;
let currentDomain = '';
let state = null;

function domainFromUrl(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); }
  catch { return ''; }
}

function setStatus(enabled, mode) {
  const off = !enabled;
  el('statusDot').classList.toggle('off', off);
  if (off) {
    el('statusText').textContent = 'Protection paused';
    el('statusSub').textContent = 'QuietShield filtering is disabled.';
  } else if (mode === 'trusted') {
    el('statusText').textContent = 'Trusted site';
    el('statusSub').textContent = 'QuietShield is allowing this site.';
  } else if (mode === 'blocked') {
    el('statusText').textContent = 'Site blocked';
    el('statusSub').textContent = 'QuietShield blocks this site from loading.';
  } else {
    el('statusText').textContent = 'Protected';
    el('statusSub').textContent = 'Browser protection is active.';
  }
}

function render() {
  const enabled = state?.settings?.enabled !== false;
  const mode = state?.siteModes?.[currentDomain] || 'protected';
  el('enabled').checked = enabled;
  el('site').textContent = currentDomain || 'Chrome page';
  el('blocked').textContent = state?.blockedOnTab || 0;
  el('requests').textContent = state?.traffic?.total || 0;
  el('cleaned').textContent = state?.counters?.trackingParamsCleaned || 0;
  setStatus(enabled, mode);
  document.querySelectorAll('.mode').forEach(button => button.classList.toggle('active', button.dataset.mode === mode));

  const domains = state?.traffic?.domains || [];
  el('domains').innerHTML = domains.length
    ? domains.slice(0, 8).map(x => `<div class="domain"><span title="${escapeHtml(x.domain)}">${escapeHtml(x.domain)}</span><b>${x.requests}</b></div>`).join('')
    : '<div class="muted">No traffic captured yet.</div>';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}

async function refresh() {
  [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentDomain = domainFromUrl(currentTab?.url || '');
  state = await chrome.runtime.sendMessage({ type: 'QS_GET_STATE', tabId: currentTab?.id });
  render();
}

el('enabled').addEventListener('change', async event => {
  await chrome.runtime.sendMessage({ type: 'QS_SET_ENABLED', enabled: event.target.checked });
  await refresh();
  if (currentTab?.id && /^https?:/.test(currentTab.url || '')) chrome.tabs.reload(currentTab.id);
});

document.querySelectorAll('.mode').forEach(button => button.addEventListener('click', async () => {
  if (!currentDomain) return;
  await chrome.runtime.sendMessage({ type: 'QS_SET_SITE_MODE', domain: currentDomain, mode: button.dataset.mode });
  await refresh();
  if (currentTab?.id && /^https?:/.test(currentTab.url || '')) chrome.tabs.reload(currentTab.id);
}));

el('settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
refresh();
