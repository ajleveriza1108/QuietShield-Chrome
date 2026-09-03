# QuietShield Chrome 1.0.2 R3

QuietShield Chrome is a Manifest V3 privacy and ad-blocking extension that uses the same QuietShield product identity and shared licensing backend as the other QuietShield clients.

## R3 goals

- Real ad/tracker request blocking with packaged Declarative Net Request rules.
- Real per-site Protected / Trusted / Blocked controls.
- Real popup and redirect protection.
- Cosmetic ad-space and common annoyance cleanup.
- Tracking-parameter removal.
- Local Network Inspector and aggregate activity statistics.
- The approved dark QuietShield dashboard and compact extension popup.
- License, trial, administrator activation and customer-device management through the existing QuietShield licensing service.
- No customer-facing developer endpoint controls.
- No administrator key, Payhip secret, receipt private key, or other private server credential in the extension.

## Protection architecture

QuietShield uses separate packaged MV3 rulesets for ads, trackers, threats/cryptomining, redirect networks, and optional HTTP-to-HTTPS upgrades. Dashboard switches enable or disable the corresponding rulesets instead of changing only the appearance of the UI.

The extension also uses a small page guard for non-user-initiated `window.open()` popups and known advertising redirectors. Cosmetic cleanup runs in an isolated content script.

## Privacy

Network Inspector data is kept in memory for the current browser session. Aggregate counters and seven-day chart data are stored locally in Chrome storage. QuietShield does not upload browsing history to its licensing service.

## Licensing

The service address is internal application routing configuration and is not shown in the user interface. It is not treated as a secret. Private signing keys and licensing secrets remain server-side.

Administrator activation generates a device-bound RSA keypair in the Chrome profile and submits only its public key to the server. The full administrator activation key is never hard-coded and is not retained after successful administrator activation.

Before Chrome activation can pass, deploy the matching same-server Code372 integration described in `docs/APPS-SCRIPT-CHROME-INTEGRATION.md`.

## Windows publisher

Run normally, not as Administrator:

`START-PUBLISH-QUIETSHIELD-CHROME-R3.bat`

Requirements:
- PowerShell 7
- Git for Windows
- Git identity and GitHub authentication already configured

The publisher installs cleanly to `D:\Windows Projects\QuietShield-Chrome`, preserves `.git`, validates the MV3 package, builds the release ZIP, and pushes both QuietShield Chrome repositories.
