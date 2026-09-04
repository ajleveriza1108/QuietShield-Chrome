# QuietShield shared license server: Chrome integration

QuietShield Chrome must use the existing QuietShield Apps Script project, existing database and existing keys. Do not create another license server or spreadsheet.

## Matching server source

Deploy `QuietShield_License_Server_v1.2.6_Code372_Chrome.gs`, supplied with the R6 full-functional bundle. Code372 itself is unchanged by the R6 DNR client fix.

Code372 is a cumulative update of the existing v1.2.5 Code371 server. It preserves Android, Google Play billing, family/admin functions, key registry, trial records and signed receipts. Its Chrome-specific changes are intentionally narrow:

1. Adds the fixed client identity `quietshield.chrome`.
2. Allows that identity in `validatedDevice_()`.
3. Allows it for the legacy tester-package check if that license class is used.
4. Keeps administrator device public-key registration intact.
5. Adds a non-mutating `runChromePackageSelfTestCode372()` function.

## Deployment order

1. Open the SAME Apps Script project currently serving QuietShield.
2. Back up its existing Code.gs.
3. Replace Code.gs with the supplied Code372 source and Save.
4. Run `setupQuietShieldLicenseSystem()` once. This advances the server's schema-ready build marker without clearing existing records.
5. Run `validateQuietShieldConfiguration()`.
6. Run `runChromePackageSelfTestCode372()`; it must return `CODE372_CHROME_PACKAGE_SELF_TEST_PASS`.
7. Deploy > Manage deployments > edit the EXISTING Web App deployment > create a new version > Deploy. Do not create a second web-app deployment.
8. Reload QuietShield Chrome and test Trial, customer key, then your administrator key.

## Administrator activation

The existing server requires `adminPublicKey` when an administrator key is activated. R6 generates a 2048-bit RSA device keypair locally and sends only the public SPKI material. The administrator activation key is never bundled and is removed from Chrome storage after a successful admin activation.

## Expected failures before deployment

- `PACKAGE_NOT_AUTHORIZED`: the old server is still deployed.
- `SERVER_SETUP_REQUIRED`: Code372 is saved/deployed but `setupQuietShieldLicenseSystem()` has not yet been run for the new build marker.
- `ADMIN_DEVICE_KEY_REQUIRED`: an older Chrome client is being used; R6 supplies the required device public key.
