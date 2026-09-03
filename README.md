# QuietShield Chrome

QuietShield Chrome is the browser-protection layer of the QuietShield ecosystem.

## v1.0.1 R2 clean publisher fix

- Manifest V3 extension
- Declarative ad/tracker blocking baseline
- HTTPS upgrade rule
- Cosmetic ad/annoyance cleanup
- URL tracking-parameter cleanup
- Per-site Protected / Trusted / Blocked modes
- Network Inspector with ephemeral per-tab domain observations
- Chrome action block-count badge
- Privacy-first aggregate counters
- Same QuietShield Apps Script license service and customer keys
- License refresh + customer device list/removal using the same server
- Current server request contract: `deviceHash`, `deviceName`, `platform`, `packageName`, `appVersion`
- Stable generated Chrome installation/device ID
- 7-day trial + normal three-device license model remains server-side
- PowerShell 7 clean build + two-repository publisher
- PowerShell 7 parser gate before project mutation
- Transactional canonical install with rollback backup and stale-file cleanup
- Runtime-only MV3 remote-code scanner with exact file/line diagnostics

## Canonical Windows project

`D:\Windows Projects\QuietShield-Chrome`

Source repository: `https://github.com/ajleveriza1108/QuietShield-Chrome`

Release repository: `https://github.com/ajleveriza1108/QuietShield-Chrome-Release`

## First install / development test

1. Extract this package.
2. Run `START-PUBLISH-QUIETSHIELD-CHROME-R2.bat` if you want it installed to the canonical path and published to both repositories.
3. Open `chrome://extensions`.
4. Turn on **Developer mode**.
5. Click **Load unpacked**.
6. Select `D:\Windows Projects\QuietShield-Chrome`.
7. Test normal browsing, site Trust/Block, Network Inspector, and URL cleanup.

## Licensing

The extension intentionally contains no Payhip secret, RSA private key, admin token, customer database, or license pepper.

Chrome R2 sends the existing Apps Script:

- `deviceHash`: stable random installation ID
- `deviceName`: `QuietShield Chrome`
- `platform`: `Chrome`
- `packageName`: `quietshield.chrome`
- `appVersion`: extension version
- `licenseKey`: activation, refresh, list-device, and remove-device flows only; kept local and excluded from backup/logging

The current server is Android-package restricted, so deploy the small cross-platform allowlist patch in `docs/APPS-SCRIPT-CHROME-INTEGRATION.md` before expecting Chrome trial/license calls to pass.

The public Apps Script endpoint already used by QuietShield is built into R2. Settings provides a local override for test deployments.

R2 does **not** yet use a stored signed receipt as an offline Premium authority. It accepts online server success, decodes the signed receipt, and verifies its `deviceHash` binding. RSA public-key pinning/WebCrypto verification is the next security gate before offline Premium enforcement.

## Privacy model

Network Inspector observations are held in service-worker memory and disappear with the tab/service-worker lifecycle. Detailed browsing history is off. Aggregate protection counters may be stored locally.

## Publisher

Run:

`START-PUBLISH-QUIETSHIELD-CHROME-R2.bat`

The PowerShell 7 publisher validates the package, creates the ZIP and SHA-256 metadata, pushes the source repository, then updates the release repository.
