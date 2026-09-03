# QuietShield Apps Script — Chrome integration

QuietShield Chrome reuses the existing QuietShield Apps Script, license registry, Payhip verification, trials, device slots, and RSA-signed receipts. Do **not** create a second key database and do **not** put any server secret in the extension.

## Why the existing server needs one small change

The current server validates `packageName` against only the Android `APP_PACKAGE` and `APP_PACKAGE + '.trial'`. Chrome therefore needs its own explicitly authorized identity rather than pretending to be Android.

Chrome R2 sends:

```text
platform   = Chrome
packageName = quietshield.chrome
appVersion  = 1.0.1
```

It also sends the existing required `deviceHash` and `deviceName` fields.

## Server property

Add this Script Property to the **same** Apps Script project:

```text
CHROME_PACKAGE=quietshield.chrome
```

This value is an application identifier, not a secret.

## Patch validatedDevice_

In the current server, replace the Android-only authorized-package block inside `validatedDevice_(request)` with this cross-platform block:

```javascript
const props = PropertiesService.getScriptProperties();
const premiumPackage = requiredProperty_('APP_PACKAGE');
const chromePackage = String(
  props.getProperty('CHROME_PACKAGE') || ''
).trim();

const authorizedPackages = new Set([
  premiumPackage,
  premiumPackage + '.trial'
]);

if (chromePackage) {
  authorizedPackages.add(chromePackage);
}

if (!authorizedPackages.has(packageName)) {
  const error = new Error('Package is not authorized.');
  error.qsPublicCode = 'PACKAGE_NOT_AUTHORIZED';
  error.qsPublicMessage = 'This QuietShield client is not authorized for this license service.';
  throw error;
}
```

Keep the rest of `validatedDevice_` unchanged.

## Configuration validation

Add `CHROME_PACKAGE` to the required Script Properties list used by `validateQuietShieldConfiguration()` after the Chrome deployment is ready. This makes a missing Chrome identity fail visibly instead of silently disabling Chrome licensing.

## Closed-test key note

If the legacy closed-test key must also work in Chrome, update `assertClosedTestPackage_(device)` to accept either the Android premium package or `CHROME_PACKAGE`. Do not remove package validation entirely.

## Receipt verification

The existing server returns RSA-SHA256 receipts shaped as:

```json
{
  "receipt": {
    "algorithm": "SHA256withRSA",
    "payload": "<base64url>",
    "signature": "<base64url>"
  }
}
```

R2 validates the online HTTPS response, receipt format, and local `deviceHash` binding. Before Premium features rely on offline receipts, pin the existing QuietShield SPKI public verification key in the extension and verify the signature with WebCrypto. Never copy `RECEIPT_PRIVATE_KEY_B64`, Payhip secrets, admin tokens, or license peppers into Chrome.

## Deployment order

1. Patch the same Apps Script project.
2. Add `CHROME_PACKAGE=quietshield.chrome`.
3. Run the server's configuration validation.
4. Update the existing Web App deployment (do not create a separate license database).
5. Confirm GET `/exec` reports the expected healthy server build.
6. Load QuietShield Chrome unpacked and start a trial.
7. Activate a real test license and confirm Chrome occupies one normal device slot.
8. Confirm a fourth active device is rejected for a normal three-device license.
