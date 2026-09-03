import { QS } from '../common/constants.js';
import { ensureInstallId } from '../common/storage.js';

function isAllowedEndpoint(value) {
  return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(?:\?.*)?$/.test(value);
}

async function getEndpoint() {
  const data = await chrome.storage.local.get(QS.STORAGE_KEYS.APPS_SCRIPT_ENDPOINT);
  const configured = String(data[QS.STORAGE_KEYS.APPS_SCRIPT_ENDPOINT] || '').trim();
  return configured || QS.DEFAULT_LICENSE_ENDPOINT;
}

export async function setAppsScriptEndpoint(endpoint) {
  const value = String(endpoint || '').trim();
  if (value && !isAllowedEndpoint(value)) {
    throw new Error('Use a QuietShield Google Apps Script HTTPS /exec URL.');
  }
  if (!value || value === QS.DEFAULT_LICENSE_ENDPOINT) {
    await chrome.storage.local.remove(QS.STORAGE_KEYS.APPS_SCRIPT_ENDPOINT);
    return QS.DEFAULT_LICENSE_ENDPOINT;
  }
  await chrome.storage.local.set({ [QS.STORAGE_KEYS.APPS_SCRIPT_ENDPOINT]: value });
  return value;
}

function base64UrlToText(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function decodeReceiptPayload(receipt) {
  if (!receipt || receipt.algorithm !== 'SHA256withRSA' || !receipt.payload || !receipt.signature) {
    throw new Error('QuietShield server returned an incomplete signed receipt.');
  }
  let payload;
  try {
    payload = JSON.parse(base64UrlToText(receipt.payload));
  } catch {
    throw new Error('QuietShield server returned an unreadable receipt payload.');
  }
  return payload;
}

async function buildDeviceEnvelope(action) {
  const deviceHash = await ensureInstallId();
  return {
    action,
    deviceHash,
    deviceName: 'QuietShield Chrome',
    platform: QS.PLATFORM,
    packageName: QS.PACKAGE_NAME,
    appVersion: chrome.runtime.getManifest().version,
    requestNonce: crypto.randomUUID(),
    clientTimestamp: new Date().toISOString()
  };
}

function publicError(code, message) {
  return { ok: false, code, message };
}

export async function callLicenseApi(action, payload = {}) {
  const endpoint = await getEndpoint();
  if (!isAllowedEndpoint(endpoint)) {
    return publicError('ENDPOINT_NOT_CONFIGURED', 'QuietShield licensing endpoint is not configured correctly.');
  }

  const body = {
    ...(await buildDeviceEnvelope(action)),
    ...payload
  };

  // Never transmit an empty key. startTrial intentionally needs no key.
  if (!String(body.licenseKey || '').trim()) delete body.licenseKey;

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      redirect: 'follow',
      cache: 'no-store',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });
  } catch {
    return publicError('NETWORK_ERROR', 'QuietShield license service could not be reached.');
  }

  if (!response.ok) {
    return publicError(`HTTP_${response.status}`, 'QuietShield license service could not be reached.');
  }

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return publicError('INVALID_RESPONSE', 'QuietShield license service returned an invalid response.');
  }

  if (data.ok !== true) {
    return {
      ...data,
      ok: false,
      code: String(data.code || 'LICENSE_REJECTED'),
      message: String(data.message || 'QuietShield license was not accepted.')
    };
  }

  if (['activateLicense', 'refreshLicense', 'startTrial'].includes(action)) {
    let receiptPayload;
    try {
      receiptPayload = decodeReceiptPayload(data.receipt);
    } catch (error) {
      return publicError('INVALID_RECEIPT', error.message);
    }

    const localDeviceHash = await ensureInstallId();
    if (String(receiptPayload.deviceHash || '') !== localDeviceHash) {
      return publicError('RECEIPT_DEVICE_MISMATCH', 'QuietShield receipt does not belong to this Chrome installation.');
    }

    // R2 validates the HTTPS response, receipt structure and device binding.
    // Offline Premium gating stays disabled until the existing RSA public key is
    // deliberately pinned into the Chrome build and WebCrypto verification is enabled.
    const storedLicense = {
      ok: true,
      code: String(data.code || ''),
      message: String(data.message || ''),
      requestId: String(data.requestId || ''),
      receipt: data.receipt,
      payload: receiptPayload,
      onlineServerAccepted: true,
      signaturePinnedAndVerified: false,
      lastCheckedAt: Date.now()
    };
    await chrome.storage.local.set({ [QS.STORAGE_KEYS.LICENSE]: storedLicense });

    if (action === 'activateLicense' && body.licenseKey) {
      // Kept locally only so refresh/list-device flows can reuse the customer key.
      // Never include it in backup/export or logs.
      await chrome.storage.local.set({ [QS.STORAGE_KEYS.LICENSE_KEY]: String(body.licenseKey).trim() });
    }

    return { ...data, ok: true, payload: receiptPayload };
  }

  return { ...data, ok: true };
}

async function getStoredLicenseKey() {
  const stored = await chrome.storage.local.get(QS.STORAGE_KEYS.LICENSE_KEY);
  return String(stored[QS.STORAGE_KEYS.LICENSE_KEY] || '').trim();
}

export async function refreshStoredLicense() {
  const licenseKey = await getStoredLicenseKey();
  if (!licenseKey) return publicError('NO_STORED_LICENSE_KEY', 'No QuietShield license key is stored on this Chrome installation.');
  return callLicenseApi('refreshLicense', { licenseKey });
}

export async function listStoredLicenseDevices() {
  const licenseKey = await getStoredLicenseKey();
  if (!licenseKey) return publicError('NO_STORED_LICENSE_KEY', 'Activate a QuietShield customer license on this Chrome installation first.');
  return callLicenseApi('listDevices', { licenseKey });
}

export async function removeStoredLicenseDevice(targetDeviceHash) {
  const licenseKey = await getStoredLicenseKey();
  if (!licenseKey) return publicError('NO_STORED_LICENSE_KEY', 'Activate a QuietShield customer license on this Chrome installation first.');
  const hash = String(targetDeviceHash || '').trim();
  if (!hash) return publicError('INVALID_DEVICE', 'Select a QuietShield device to remove.');
  return callLicenseApi('removeDevice', { licenseKey, targetDeviceHash: hash });
}
