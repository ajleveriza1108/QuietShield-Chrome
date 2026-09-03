import { QS } from '../common/constants.js';
import { ensureInstallId } from '../common/storage.js';

// Public deployment address used internally by QuietShield. It is intentionally not
// exposed in the UI. This is routing configuration, never a secret credential.
const LICENSE_SERVICE_URL = 'https://script.google.com/macros/s/AKfycbxFHqV37iPQLQBzG1hq9X3gXUGu3NzV69GqT9l5nncEOGLPx8oZlXopoO5SFZHhdr958w/exec';

function bytesToBase64(bytes) {
  let binary = '';
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);
  return btoa(binary);
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
  try {
    return JSON.parse(base64UrlToText(receipt.payload));
  } catch {
    throw new Error('QuietShield server returned an unreadable receipt payload.');
  }
}

async function ensureAdminDevicePublicKey() {
  const stored = await chrome.storage.local.get(QS.STORAGE_KEYS.ADMIN_DEVICE_KEY);
  const existing = stored[QS.STORAGE_KEYS.ADMIN_DEVICE_KEY];
  if (existing?.publicSpkiB64 && existing?.privatePkcs8B64) return existing.publicSpkiB64;

  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['sign', 'verify']
  );
  const [publicSpki, privatePkcs8] = await Promise.all([
    crypto.subtle.exportKey('spki', keyPair.publicKey),
    crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
  ]);
  const record = {
    algorithm: 'RSASSA-PKCS1-v1_5/SHA-256',
    publicSpkiB64: bytesToBase64(publicSpki),
    privatePkcs8B64: bytesToBase64(privatePkcs8),
    createdAt: Date.now()
  };
  await chrome.storage.local.set({ [QS.STORAGE_KEYS.ADMIN_DEVICE_KEY]: record });
  return record.publicSpkiB64;
}

async function buildDeviceEnvelope(action) {
  const envelope = {
    action,
    deviceHash: await ensureInstallId(),
    deviceName: 'QuietShield Chrome',
    platform: QS.PLATFORM,
    packageName: QS.PACKAGE_NAME,
    appVersion: chrome.runtime.getManifest().version,
    requestNonce: crypto.randomUUID(),
    clientTimestamp: new Date().toISOString()
  };
  if (action === 'activateLicense') envelope.adminPublicKey = await ensureAdminDevicePublicKey();
  return envelope;
}

function publicError(code, message) {
  return { ok: false, code, message };
}

export async function callLicenseApi(action, payload = {}) {
  const body = { ...(await buildDeviceEnvelope(action)), ...payload };
  if (!String(body.licenseKey || '').trim()) delete body.licenseKey;

  let response;
  try {
    response = await fetch(LICENSE_SERVICE_URL, {
      method: 'POST',
      redirect: 'follow',
      cache: 'no-store',
      headers: { 'Content-Type': 'text/plain;charset=utf-8', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch {
    return publicError('NETWORK_ERROR', 'QuietShield license service could not be reached.');
  }

  if (!response.ok) return publicError(`HTTP_${response.status}`, 'QuietShield license service could not be reached.');

  let data;
  try {
    data = JSON.parse(await response.text());
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

    const isAdmin = Boolean(data.adminKeySlot || data.adminSlot || String(data.code || '').includes('ADMIN_'));
    const storedLicense = {
      ok: true,
      kind: isAdmin ? 'admin' : (action === 'startTrial' ? 'trial' : 'customer'),
      code: String(data.code || ''),
      message: String(data.message || ''),
      requestId: String(data.requestId || ''),
      receipt: data.receipt,
      payload: receiptPayload,
      onlineServerAccepted: true,
      signaturePinnedAndVerified: false,
      adminKeySlot: Number(data.adminKeySlot || data.adminSlot || 0) || null,
      adminDeviceSeat: Number(data.adminDeviceSeat || 0) || null,
      lastCheckedAt: Date.now()
    };
    await chrome.storage.local.set({ [QS.STORAGE_KEYS.LICENSE]: storedLicense });

    if (action === 'activateLicense' && body.licenseKey && !isAdmin) {
      await chrome.storage.local.set({ [QS.STORAGE_KEYS.LICENSE_KEY]: String(body.licenseKey).trim() });
    } else if (isAdmin) {
      // Never persist the administrator key itself in the browser profile.
      await chrome.storage.local.remove(QS.STORAGE_KEYS.LICENSE_KEY);
    }

    const safeData = { ...data, ok: true, payload: receiptPayload };
    delete safeData.adminDeviceSecret;
    return safeData;
  }

  return { ...data, ok: true };
}

async function getStoredLicenseKey() {
  const stored = await chrome.storage.local.get(QS.STORAGE_KEYS.LICENSE_KEY);
  return String(stored[QS.STORAGE_KEYS.LICENSE_KEY] || '').trim();
}

async function getStoredLicense() {
  const stored = await chrome.storage.local.get(QS.STORAGE_KEYS.LICENSE);
  return stored[QS.STORAGE_KEYS.LICENSE] || null;
}

export async function refreshStoredLicense() {
  const current = await getStoredLicense();
  if (current?.kind === 'admin' && current?.onlineServerAccepted) {
    return { ok: true, code: 'ADMIN_DEVICE_BOUND', message: 'Administrator activation is already bound to this Chrome installation.', payload: current.payload };
  }
  const licenseKey = await getStoredLicenseKey();
  if (!licenseKey) return publicError('NO_STORED_LICENSE_KEY', 'No QuietShield customer license key is stored on this Chrome installation.');
  return callLicenseApi('refreshLicense', { licenseKey });
}

export async function listStoredLicenseDevices() {
  const current = await getStoredLicense();
  if (current?.kind === 'admin') {
    return publicError('ADMIN_DEVICE_MANAGER_NOT_EXPOSED', 'Administrator device management stays in the existing QuietShield admin system.');
  }
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
