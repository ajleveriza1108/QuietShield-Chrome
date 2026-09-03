const $ = id => document.getElementById(id);
const DEFAULT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxFHqV37iPQLQBzG1hq9X3gXUGu3NzV69GqT9l5nncEOGLPx8oZlXopoO5SFZHhdr958w/exec';

async function state() {
  return chrome.runtime.sendMessage({ type: 'QS_GET_STATE' });
}

async function load() {
  const data = await state();
  for (const key of ['cosmeticFiltering', 'trackingParamCleanup', 'networkInspector']) {
    $(key).checked = data?.settings?.[key] !== false;
  }
  const endpoint = await chrome.storage.local.get('qs.appsScriptEndpoint');
  $('endpoint').value = endpoint['qs.appsScriptEndpoint'] || DEFAULT_ENDPOINT;
  if (data?.license?.ok) {
    const payload = data.license.payload || {};
    const label = payload.entitlement || data.license.code || 'licensed';
    showLicense(`Last online license check: ${label}`, true);
  }
}


function escapeText(value) {
  return String(value ?? '');
}

function renderDevices(response) {
  const list = $('deviceList');
  list.replaceChildren();
  list.hidden = false;
  if (!response?.ok) {
    const note = document.createElement('p');
    note.className = 'device-empty';
    note.textContent = response?.message || 'Could not retrieve QuietShield devices.';
    list.append(note);
    return;
  }

  const summary = document.createElement('p');
  summary.className = 'device-summary';
  summary.textContent = response.unlimited
    ? `${response.activeDevices || 0} active devices · unlimited owner entitlement`
    : `${response.activeDevices || 0} of ${response.maxDevices || 0} active devices`;
  list.append(summary);

  const devices = Array.isArray(response.devices) ? response.devices : [];
  if (!devices.length) {
    const note = document.createElement('p');
    note.className = 'device-empty';
    note.textContent = 'No device records were returned.';
    list.append(note);
    return;
  }

  for (const device of devices) {
    const row = document.createElement('div');
    row.className = 'device-row';

    const text = document.createElement('div');
    const name = document.createElement('b');
    name.textContent = escapeText(device.deviceName || device.platform || 'QuietShield device');
    const meta = document.createElement('small');
    const seen = device.lastSeenAt ? ` · last seen ${new Date(device.lastSeenAt).toLocaleString()}` : '';
    meta.textContent = `${escapeText(device.platform || 'Unknown platform')} · ${escapeText(device.status || 'unknown')}${seen}`;
    text.append(name, meta);
    row.append(text);

    if (device.status === 'active' && device.deviceHash) {
      const button = document.createElement('button');
      button.className = 'danger-outline';
      button.textContent = 'Remove';
      button.addEventListener('click', async () => {
        if (!confirm(`Remove ${device.deviceName || 'this device'} from this QuietShield license?`)) return;
        button.disabled = true;
        const removed = await chrome.runtime.sendMessage({ type: 'QS_LICENSE_REMOVE_DEVICE', targetDeviceHash: device.deviceHash });
        showLicense(removed?.message || (removed?.ok ? 'Device removed.' : 'Could not remove device.'), Boolean(removed?.ok));
        if (removed?.ok) {
          const refreshed = await chrome.runtime.sendMessage({ type: 'QS_LICENSE_LIST_DEVICES' });
          renderDevices(refreshed);
        } else button.disabled = false;
      });
      row.append(button);
    }
    list.append(row);
  }
}

async function patchSettings(patch) {
  const stored = await chrome.storage.local.get('qs.settings');
  await chrome.storage.local.set({ 'qs.settings': { ...(stored['qs.settings'] || {}), ...patch } });
}

for (const key of ['cosmeticFiltering', 'trackingParamCleanup', 'networkInspector']) {
  $(key).addEventListener('change', event => patchSettings({ [key]: event.target.checked }));
}

function showLicense(message, ok = false) {
  const node = $('licenseStatus');
  node.textContent = message;
  node.className = `status ${ok ? 'ok' : 'bad'}`;
}

async function licenseCall(action) {
  const licenseKey = $('licenseKey').value.trim();
  if (action === 'activateLicense' && !licenseKey) return showLicense('Enter the QuietShield license key.');
  showLicense('Checking QuietShield license service...');
  const payload = action === 'activateLicense' ? { licenseKey } : {};
  const response = await chrome.runtime.sendMessage({ type: 'QS_LICENSE_CALL', action, payload });
  showLicense(response?.message || (response?.ok ? 'License accepted.' : 'License could not be verified.'), Boolean(response?.ok));
  if (response?.ok && action === 'activateLicense') $('licenseKey').value = '';
}

$('activate').addEventListener('click', () => licenseCall('activateLicense'));
$('trial').addEventListener('click', () => licenseCall('startTrial'));
$('refreshLicense').addEventListener('click', async () => {
  showLicense('Refreshing QuietShield license...');
  const response = await chrome.runtime.sendMessage({ type: 'QS_LICENSE_REFRESH' });
  showLicense(response?.message || (response?.ok ? 'License refreshed.' : 'License could not be refreshed.'), Boolean(response?.ok));
});
$('loadDevices').addEventListener('click', async () => {
  showLicense('Retrieving licensed devices...');
  const response = await chrome.runtime.sendMessage({ type: 'QS_LICENSE_LIST_DEVICES' });
  renderDevices(response);
  showLicense(response?.message || (response?.ok ? 'Device list retrieved.' : 'Device list unavailable.'), Boolean(response?.ok));
});
$('saveEndpoint').addEventListener('click', async () => {
  const response = await chrome.runtime.sendMessage({ type: 'QS_SET_LICENSE_ENDPOINT', endpoint: $('endpoint').value.trim() });
  if (response?.ok) {
    $('endpoint').value = response.endpoint;
    showLicense('QuietShield Apps Script endpoint override saved locally.', true);
  } else showLicense(response?.message || 'Could not save Apps Script endpoint.');
});
$('resetEndpoint').addEventListener('click', async () => {
  const response = await chrome.runtime.sendMessage({ type: 'QS_SET_LICENSE_ENDPOINT', endpoint: '' });
  if (response?.ok) {
    $('endpoint').value = response.endpoint || DEFAULT_ENDPOINT;
    showLicense('Built-in QuietShield Apps Script endpoint restored.', true);
  } else showLicense(response?.message || 'Could not restore Apps Script endpoint.');
});

load();
