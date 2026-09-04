const $ = id => document.getElementById(id);
let appState = null;

const FEATURES = [
  {key:'adLock',name:'Ad Lock',icon:'◈',desc:'Blocks requests to known advertising networks before they load.',counter:'adsBlocked',unit:'blocked'},
  {key:'trackerLock',name:'Tracker Lock',icon:'◎',desc:'Blocks analytics, profiling and cross-site tracking endpoints.',counter:'trackersBlocked',unit:'blocked'},
  {key:'threatLock',name:'Threat Lock',icon:'△',desc:'Blocks packaged threat-test and browser cryptomining endpoints.',counter:'threatBlocked',unit:'blocked'},
  {key:'popupLock',name:'Popup Lock',icon:'▣',desc:'Blocks unsolicited script popups and pop-under behavior, including aggressive ad-test pages.',counter:'popupsBlocked',unit:'blocked'},
  {key:'redirectLock',name:'Redirect Lock',icon:'↪',desc:'Blocks known popunder and advertising redirect networks.',counter:'redirectBlocked',unit:'blocked'},
  {key:'trackingParamCleanup',name:'URL Cleaner',icon:'⌁',desc:'Removes common campaign and click-tracking parameters from page URLs.',counter:'trackingParamsCleaned',unit:'cleaned'},
  {key:'annoyanceLock',name:'Annoyance Lock',icon:'▤',desc:'Hides common newsletter, push-notification, interstitial and floating-ad overlays.',counter:'annoyanceHidden',unit:'hidden'},
  {key:'networkInspector',name:'Network Inspector',icon:'⌁',desc:'Shows live request-domain insights for the active tab without keeping detailed history.',counter:null,unit:'live'}
];

function formatNumber(value) { return Intl.NumberFormat(undefined,{notation:Number(value)>=10000?'compact':'standard',maximumFractionDigits:1}).format(Number(value||0)); }
function settings() { return appState?.settings || {}; }
function counters() { return appState?.counters || {}; }

async function getState() { appState = await chrome.runtime.sendMessage({type:'QS_GET_STATE'}); return appState; }
async function patchSettings(patch) { await chrome.runtime.sendMessage({type:'QS_PATCH_SETTINGS',patch}); await refresh(); }

function buildFeatureCard(def, large=false) {
  const card=document.createElement('article'); card.className='feature-card';
  const top=document.createElement('div'); top.className='feature-top';
  const name=document.createElement('div'); name.className='feature-name'; name.innerHTML=`<span class="feature-symbol">${def.icon}</span><span>${def.name}</span>`;
  const label=document.createElement('label'); label.className='mini-switch'; const input=document.createElement('input'); input.type='checkbox'; input.checked=settings()[def.key]!==false; const slider=document.createElement('span'); label.append(input,slider); top.append(name,label);
  const p=document.createElement('p'); p.textContent=def.desc;
  const metric=document.createElement('div'); const strong=document.createElement('strong'); const count=def.counter?counters()[def.counter]:null; strong.textContent=def.counter?formatNumber(count):((settings()[def.key]!==false)?'ON':'OFF'); const small=document.createElement('small'); small.textContent=def.unit; metric.append(strong,small);
  input.addEventListener('change',()=>patchSettings({[def.key]:input.checked}));
  card.append(top,p,metric); return card;
}

function renderFeatureGrid(id) { const box=$(id); box.replaceChildren(); FEATURES.forEach(f=>box.append(buildFeatureCard(f,id==='protectionFeatureGrid'))); }

function lastSevenDays() {
  const out=[]; const now=new Date();
  for(let i=6;i>=0;i--){ const d=new Date(now); d.setDate(now.getDate()-i); const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; out.push({key,label:d.toLocaleDateString(undefined,{weekday:'short'}).slice(0,3)}); }
  return out;
}

function renderBars(id) {
  const box=$(id); box.replaceChildren(); const rows=lastSevenDays(); const daily=appState?.dailyStats||{};
  const max=Math.max(1,...rows.flatMap(r=>['adsBlocked','trackersBlocked','threatBlocked'].map(k=>Number(daily[r.key]?.[k]||0))));
  for(const r of rows){ const day=document.createElement('div'); day.className='bar-day'; for(const [k,c] of [['adsBlocked','a'],['trackersBlocked','t'],['threatBlocked','h']]){ const bar=document.createElement('i'); bar.className=c; bar.style.height=`${Math.max(2,(Number(daily[r.key]?.[k]||0)/max)*100)}%`; bar.title=`${r.key}: ${Number(daily[r.key]?.[k]||0)}`; day.append(bar); } const label=document.createElement('label'); label.textContent=r.label; day.append(label); box.append(day); }
}

function privacyScore() {
  if(settings().enabled===false) return 0;
  const keys=['adLock','trackerLock','threatLock','popupLock','redirectLock','trackingParamCleanup','annoyanceLock','networkInspector'];
  return Math.round(keys.filter(k=>settings()[k]!==false).length/keys.length*100);
}

function renderHome() {
  const activeRules = Array.isArray(appState?.enabledRulesets) ? appState.enabledRulesets.length : 0;
  if ($('engineRulesets')) $('engineRulesets').textContent = `${activeRules} / 5 active`;
  if ($('engineFiltering')) $('engineFiltering').textContent = settings().enabled === false ? 'Paused' : 'Network + page';
  $('sumAds').textContent=formatNumber(counters().adsBlocked);
  $('sumTrackers').textContent=formatNumber(counters().trackersBlocked);
  $('sumThreats').textContent=formatNumber(counters().threatBlocked);
  $('sumCleanups').textContent=formatNumber(Number(counters().trackingParamsCleaned||0)+Number(counters().cosmeticHidden||0)+Number(counters().popupsBlocked||0));
  renderFeatureGrid('homeFeatureGrid'); renderBars('homeBars');
  const score=privacyScore(); $('privacyScore').textContent=score; $('privacyGauge').style.setProperty('--score-deg',`${score*3.6}deg`);
  $('privacyLabel').textContent=score>=90?'Excellent':score>=70?'Strong':score>0?'Partial':'Protection off';
  $('privacyText').textContent=score>=90?'Core QuietShield protection layers are enabled.':score>0?'Some protection layers are disabled.':'Turn on QuietShield protection to restore coverage.';
  const preview=$('sitePreview'); preview.replaceChildren(); const modes=appState?.siteModes||{}; const entries=Object.entries(modes).slice(0,5);
  if(!entries.length){const n=document.createElement('span');n.className='empty';n.textContent='No custom site rules yet. Protected mode is the default.';preview.append(n);} else for(const [domain,mode] of entries){const chip=document.createElement('div');chip.className='site-chip';const b=document.createElement('b');b.textContent=domain;const s=document.createElement('span');s.textContent=mode[0].toUpperCase()+mode.slice(1);chip.append(b,s);preview.append(chip);}
}

function renderProtection() { $('masterEnabled').checked=settings().enabled!==false; renderFeatureGrid('protectionFeatureGrid'); }

function normalizeDomainInput(value) {
  let text=String(value||'').trim().toLowerCase(); if(!text) return '';
  try { if(text.includes('://')) text=new URL(text).hostname; } catch {}
  text=text.replace(/^www\./,'').replace(/^https?:\/\//,'').split('/')[0].split(':')[0].replace(/\.$/,'');
  return /^[a-z0-9.-]+$/.test(text)&&text.includes('.')?text:'';
}

function renderSites() {
  const list=$('siteList'); list.replaceChildren(); const entries=Object.entries(appState?.siteModes||{}).sort((a,b)=>a[0].localeCompare(b[0])); $('siteCount').textContent=`${entries.length} custom rule${entries.length===1?'':'s'}`;
  if(!entries.length){const n=document.createElement('div');n.className='empty';n.textContent='No custom rules. All websites use Protected mode by default.';list.append(n);return;}
  for(const [domain,mode] of entries){ const row=document.createElement('div');row.className='site-row';const b=document.createElement('b');b.textContent=domain;const select=document.createElement('select');for(const value of ['protected','trusted','blocked']){const o=document.createElement('option');o.value=value;o.textContent=value[0].toUpperCase()+value.slice(1);o.selected=value===mode;select.append(o);} select.addEventListener('change',async()=>{await chrome.runtime.sendMessage({type:'QS_SET_SITE_MODE',domain,mode:select.value});await refresh();});const remove=document.createElement('button');remove.textContent='Remove';remove.addEventListener('click',async()=>{await chrome.runtime.sendMessage({type:'QS_SET_SITE_MODE',domain,mode:'protected'});await refresh();});row.append(b,select,remove);list.append(row); }
}

function renderActivity() {
  $('actAds').textContent=formatNumber(counters().adsBlocked); $('actTrackers').textContent=formatNumber(counters().trackersBlocked); $('actThreats').textContent=formatNumber(counters().threatBlocked); $('actCleaned').textContent=formatNumber(counters().trackingParamsCleaned); renderBars('activityBars');
}

function licenseDisplay() {
  const license=appState?.license; const load=$('loadDevices');
  if(!license?.ok){$('licenseTitle').textContent='License not checked';$('licenseDetail').textContent='Activate a key or start the 7-day trial.';load.hidden=false;return;}
  const kind=license.kind||'licensed'; $('licenseTitle').textContent=kind==='admin'?'Administrator activated':kind==='trial'?'QuietShield trial active':'QuietShield licensed';
  const payload=license.payload||{}; const expiry=payload.expiresAt||payload.expires_at||''; $('licenseDetail').textContent=kind==='admin'?`Device-bound administrator activation${license.adminKeySlot?` · key ${license.adminKeySlot}`:''}${license.adminDeviceSeat?` · seat ${license.adminDeviceSeat}`:''}`:(expiry?`Expires ${new Date(expiry).toLocaleString()}`:(license.message||'Online license accepted.')); load.hidden=kind==='admin';
}

function showLicense(message,ok=false){const node=$('licenseStatus');node.textContent=message;node.className=`status ${ok?'ok':'bad'}`;}
function renderDevices(response){const list=$('deviceList');list.replaceChildren();list.hidden=false;if(!response?.ok){const p=document.createElement('p');p.className='empty';p.textContent=response?.message||'Device list unavailable.';list.append(p);return;}const devices=Array.isArray(response.devices)?response.devices:[];if(!devices.length){const p=document.createElement('p');p.className='empty';p.textContent='No device records returned.';list.append(p);return;}for(const d of devices){const row=document.createElement('div');row.className='device-row';const text=document.createElement('div');const b=document.createElement('b');b.textContent=d.deviceName||d.platform||'QuietShield device';const s=document.createElement('small');s.textContent=`${d.platform||'Unknown'} · ${d.status||'unknown'}${d.lastSeenAt?` · last seen ${new Date(d.lastSeenAt).toLocaleString()}`:''}`;text.append(b,s);row.append(text);if(d.status==='active'&&d.deviceHash){const btn=document.createElement('button');btn.textContent='Remove';btn.addEventListener('click',async()=>{if(!confirm(`Remove ${d.deviceName||'this device'} from this QuietShield license?`))return;btn.disabled=true;const res=await chrome.runtime.sendMessage({type:'QS_LICENSE_REMOVE_DEVICE',targetDeviceHash:d.deviceHash});showLicense(res?.message||(res?.ok?'Device removed.':'Could not remove device.'),Boolean(res?.ok));if(res?.ok){const refreshed=await chrome.runtime.sendMessage({type:'QS_LICENSE_LIST_DEVICES'});renderDevices(refreshed);}else btn.disabled=false;});row.append(btn);}list.append(row);}}


function renderEngineSelfTest(response) {
  const status = $('engineSelfTestResult');
  const rows = $('engineSelfTestRows');
  rows.replaceChildren();
  rows.hidden = false;
  if (!response?.available) {
    status.textContent = response?.message || 'Chrome DNR self-test is unavailable.';
    status.className = 'status bad';
    return;
  }
  status.textContent = response.message || `${response.passed || 0} of ${response.total || 0} tests passed.`;
  status.className = `status ${response.ok ? 'ok' : 'bad'}`;
  for (const test of response.results || []) {
    const row = document.createElement('div');
    row.className = 'device-row';
    const text = document.createElement('div');
    const b = document.createElement('b');
    b.textContent = `${test.passed ? 'PASS' : 'FAIL'} · ${test.name}`;
    const small = document.createElement('small');
    const matched = (test.matched || []).map(item => `${item.rulesetId || 'ruleset'} #${item.ruleId}`).join(', ');
    small.textContent = matched || `Expected ${test.expected}`;
    text.append(b, small);
    row.append(text);
    rows.append(row);
  }
}

async function runEngineSelfTest() {
  const button = $('runEngineSelfTest');
  const status = $('engineSelfTestResult');
  button.disabled = true;
  status.textContent = 'Running QuietShield network-engine tests...';
  status.className = 'status';
  try {
    const response = await chrome.runtime.sendMessage({ type: 'QS_ENGINE_SELF_TEST' });
    renderEngineSelfTest(response);
  } catch (error) {
    renderEngineSelfTest({ available: false, message: error?.message || String(error) });
  } finally {
    button.disabled = false;
  }
}

function renderSettings(){ document.querySelectorAll('[data-setting]').forEach(input=>input.checked=settings()[input.dataset.setting]===true || (input.dataset.setting!=='httpsUpgrade'&&settings()[input.dataset.setting]!==false)); }
function renderSide(){const on=settings().enabled!==false;$('sideProtection').textContent=on?'ON':'OFF';$('sideProtection').style.color=on?'var(--green)':'#aaa';$('sideProtectionText').textContent=on?'QuietShield is actively protecting you.':'Protection is paused.';}

async function refresh(){await getState();renderSide();renderHome();renderProtection();renderSites();renderActivity();licenseDisplay();renderSettings();}

function showSection(name){const valid=['home','protection','sites','activity','license','settings','about'].includes(name)?name:'home';document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===`section-${valid}`));document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.section===valid));history.replaceState(null,'',`#${valid}`);window.scrollTo({top:0});}
document.querySelectorAll('[data-section],.link-nav').forEach(btn=>btn.addEventListener('click',()=>showSection(btn.dataset.section)));
$('masterEnabled').addEventListener('change',e=>patchSettings({enabled:e.target.checked}));
$('runEngineSelfTest').addEventListener('click',runEngineSelfTest);
document.querySelectorAll('[data-setting]').forEach(input=>input.addEventListener('change',()=>patchSettings({[input.dataset.setting]:input.checked})));
$('saveSite').addEventListener('click',async()=>{const domain=normalizeDomainInput($('siteInput').value);if(!domain){alert('Enter a valid site domain, for example example.com.');return;}await chrome.runtime.sendMessage({type:'QS_SET_SITE_MODE',domain,mode:$('siteModeInput').value});$('siteInput').value='';await refresh();showSection('sites');});
$('siteInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('saveSite').click();});
$('clearActivity').addEventListener('click',async()=>{if(!confirm('Clear QuietShield aggregate activity counters? Your settings and site rules will be kept.'))return;await chrome.runtime.sendMessage({type:'QS_CLEAR_ACTIVITY'});await refresh();});

async function licenseCall(action){const key=$('licenseKey').value.trim();if(action==='activateLicense'&&!key){showLicense('Enter your QuietShield license or administrator key.');return;}showLicense('Checking QuietShield license service...');const res=await chrome.runtime.sendMessage({type:'QS_LICENSE_CALL',action,payload:action==='activateLicense'?{licenseKey:key}:{}});showLicense(res?.message||(res?.ok?'License accepted.':'License could not be verified.'),Boolean(res?.ok));if(res?.ok)$('licenseKey').value='';await refresh();}
$('activate').addEventListener('click',()=>licenseCall('activateLicense')); $('trial').addEventListener('click',()=>licenseCall('startTrial')); $('refreshLicense').addEventListener('click',async()=>{showLicense('Refreshing QuietShield license...');const res=await chrome.runtime.sendMessage({type:'QS_LICENSE_REFRESH'});showLicense(res?.message||(res?.ok?'License refreshed.':'License could not be refreshed.'),Boolean(res?.ok));await refresh();}); $('loadDevices').addEventListener('click',async()=>{showLicense('Retrieving licensed devices...');const res=await chrome.runtime.sendMessage({type:'QS_LICENSE_LIST_DEVICES'});renderDevices(res);showLicense(res?.message||(res?.ok?'Device list retrieved.':'Device list unavailable.'),Boolean(res?.ok));});

void refresh().then(()=>showSection(location.hash.replace('#','')||'home')).catch(error=>{console.error('QuietShield dashboard failed to load',error);});
