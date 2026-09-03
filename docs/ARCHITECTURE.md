# QuietShield Chrome Architecture

## Security boundary

All executable JavaScript is bundled with the extension. Remote services may provide licensing responses and configuration data only. Remote JavaScript is never fetched or evaluated.

## Browser protection

- Static DNR rules: baseline ads, trackers, HTTPS upgrades.
- Dynamic DNR rules: user site Trust/Block decisions.
- Content script: cosmetic cleanup and tracking-parameter removal.
- Read-only webRequest observer: Network Inspector metadata; it never blocks traffic.

## Privacy

The service worker keeps per-tab Network Inspector state in memory. The browser does not persist a detailed URL history. Aggregate counters are stored locally.

## Licensing

`licensing.js` is a transport adapter to the existing QuietShield Apps Script. Product entitlement decisions remain server-side. No server signing secret is stored in the extension.

## Planned next layers

1. Signed filter metadata and Last Known Good rollback.
2. Strong and Family profiles.
3. Threat intelligence and suspicious redirect interstitial.
4. Element picker and user cosmetic rules.
5. Broken Site Reporter / compatibility repair.
6. Protected Window helpers.
7. QuietShield Windows native messaging bridge.
