# QuietShield Chrome R7 architecture

## UI
- `src/ui/popup.*`: active-site protection, master switch, live counters, site mode, Network Inspector.
- `src/ui/options.*`: Home, Protection, Sites, Activity, License, Settings and About.
- There are no placeholder Family or developer-endpoint pages in R7.

## Request protection
- `qs_ads`: known advertising networks.
- `qs_trackers`: analytics, profiling and cross-site tracking endpoints.
- `qs_security`: packaged threat-test and browser cryptomining endpoints.
- `qs_redirects`: known popunder/advertising redirect networks.
- `qs_upgrade`: optional HTTP main/subframe upgrade; off by default.

The background service worker maps persisted settings to enabled rulesets. Master Protection disables all QuietShield packaged rulesets and per-site dynamic rules. Trusted sites receive a high-priority `allowAllRequests` main-frame rule; Blocked sites receive a higher-priority block rule.

## Page protection
`content.js` performs cosmetic cleanup, annoyance cleanup and tracking-parameter removal. `page-guard.js` runs in the page's MAIN world and intercepts non-user-initiated scripted popups and known redirector `window.open()` calls when the corresponding settings are enabled.

## Activity
The service worker observes request metadata read-only through `webRequest`, categorizes known QuietShield domains, keeps current-tab domain details in memory, and stores aggregate counters/daily totals locally. It does not use `webRequestBlocking`.

## Licensing
`licensing.js` contains the built-in public service route and the fixed platform/package identity. The UI cannot edit the route. Private server secrets never enter the extension. Administrator activation creates a local device-bound RSA keypair so the existing server can register the Chrome admin device.
