const $ = id => document.getElementById(id);
let currentTab = null;
let currentDomain = '';
let state = null;

function domainFromUrl(url) { try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } }
function webTab() { return Boolean(currentTab?.id && /^https?:/i.test(currentTab?.url || '') && currentDomain); }

function setStatus(enabled, mode) {
  const hero = document.querySelector('.hero');
  hero.classList.toggle('paused', !enabled);
  hero.classList.toggle('blocked', enabled && mode === 'blocked');
  if (!enabled) { $('statusText').textContent='Paused'; $('statusSub').textContent='QuietShield protection is paused'; }
  else if (mode === 'trusted') { $('statusText').textContent='Trusted'; $('statusSub').textContent='QuietShield is allowing this site'; }
  else if (mode === 'blocked') { $('statusText').textContent='Blocked'; $('statusSub').textContent='QuietShield blocks this site'; }
  else { $('statusText').textContent='Protected'; $('statusSub').textContent='QuietShield is protecting you'; }
}

function renderDomains(domains) {
  const box = $('domains'); box.replaceChildren();
  if (!domains?.length) { const n=document.createElement('div'); n.className='muted'; n.textContent='No request domains captured yet.'; box.append(n); return; }
  for (const item of domains.slice(0,5)) { const row=document.createElement('div'); row.className='domain'; const name=document.createElement('span'); name.textContent=item.domain; name.title=item.domain; const count=document.createElement('b'); count.textContent=item.requests; row.append(name,count); box.append(row); }
}

function render() {
  const enabled = state?.settings?.enabled !== false;
  const mode = state?.siteModes?.[currentDomain] || 'protected';
  const cat = state?.traffic?.categories || {};
  $('enabled').checked = enabled;
  $('site').textContent = currentDomain || 'Chrome page';
  $('adsBlocked').textContent = cat.adsBlocked || 0;
  $('trackersBlocked').textContent = cat.trackersBlocked || 0;
  $('threatsBlocked').textContent = cat.threatBlocked || 0;
  $('requests').textContent = state?.traffic?.total || 0;
  $('blocked').textContent = state?.blockedOnTab || 0;
  $('domainCount').textContent = state?.traffic?.domains?.length || 0;
  $('actionCount').textContent = `${state?.blockedOnTab || 0} protection actions on this page`;
  $('pauseLabel').textContent = enabled ? 'Pause Protection' : 'Resume Protection';
  const badge = $('siteBadge'); badge.textContent = mode === 'trusted' ? 'Trusted' : mode === 'blocked' ? 'Blocked' : 'Protected'; badge.className=`badge ${mode}`;
  $('connection').textContent = webTab() ? (currentTab.url.startsWith('https:') ? '🔒 Connection is secure · HTTPS' : 'Web page · HTTP') : 'Site controls are available on web pages.';
  setStatus(enabled, mode);
  document.querySelectorAll('.mode').forEach(btn => { btn.classList.toggle('active', btn.dataset.mode === mode); btn.disabled=!webTab(); });
  renderDomains(state?.traffic?.domains || []);
}

async function refresh() {
  [currentTab] = await chrome.tabs.query({ active:true, currentWindow:true });
  currentDomain = domainFromUrl(currentTab?.url || '');
  state = await chrome.runtime.sendMessage({ type:'QS_GET_STATE', tabId:currentTab?.id });
  render();
}

async function reloadWebTab() { if (webTab()) await chrome.tabs.reload(currentTab.id); }

$('enabled').addEventListener('change', async e => { await chrome.runtime.sendMessage({type:'QS_SET_ENABLED',enabled:e.target.checked}); await reloadWebTab(); await refresh(); });
$('pause').addEventListener('click', async () => { await chrome.runtime.sendMessage({type:'QS_SET_ENABLED',enabled:!(state?.settings?.enabled!==false)}); await reloadWebTab(); await refresh(); });
document.querySelectorAll('.mode').forEach(btn => btn.addEventListener('click', async () => { if(!webTab()) return; await chrome.runtime.sendMessage({type:'QS_SET_SITE_MODE',domain:currentDomain,mode:btn.dataset.mode}); await reloadWebTab(); await refresh(); }));
function openOptions(hash='') { chrome.tabs.create({url:chrome.runtime.getURL(`src/ui/options.html${hash}`)}); window.close(); }
$('settings').addEventListener('click',()=>openOptions('#settings'));
$('dashboard').addEventListener('click',()=>openOptions('#home'));
$('help').addEventListener('click',()=>openOptions('#about'));
void refresh();
