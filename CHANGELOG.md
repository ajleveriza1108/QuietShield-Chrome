# QuietShield Chrome Changelog

## 1.0.6 R7 — Final Release

- Strengthened native/sponsored ad removal with high-confidence selectors and semantic card detection.
- Added anti-adblock/content-blocker overlay cleanup without hiding ordinary editorial content.
- Added first-party/same-origin ad asset blocking for common ad-insertion, native-widget, Prebid, GPT and WordPress ad paths.
- Expanded packaged advertising-domain coverage.
- Increased packaged DNR rules from 92 in R5/R6 to 114 total rules in R7.
- Added exact DNR matched-rule counters when Chrome debugging feedback is available.
- Added a built-in Protection Engine Self-Test using Chrome's unpacked-extension `testMatchOutcome()` API.
- Retained the synchronous `.ad-widget` detector bait hide used by common adblock detection tests.
- Retained popup/pop-under interception, push-notification suppression, redirect blocking, URL tracking cleanup and per-site modes.
- Retained the R6 durable publisher: one BAT, one PowerShell process, automatic persistent log, no nested BAT relaunch, and window stays open on success or failure.
- Retained hidden internal license endpoint and Code372 shared QuietShield licensing integration.
- Administrator key remains user-entered only and is not bundled or retained after successful administrator activation.
