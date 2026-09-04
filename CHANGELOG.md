## 1.0.9 R10 — Scalar-safe PowerShell publisher hardening

- Fixes the R9 PowerShell 7 StrictMode crash at the website-compatibility gate when a one-item `requestDomains` JSON array is unwrapped to a scalar and `.Count` is accessed.
- Normalizes every publisher count check through array subexpressions (`@(...).Count`) so zero, one, or many results are handled consistently.
- Keeps the R9 website-compatibility blocker runtime unchanged; this release is a publisher reliability correction only.
- Adds a regression gate that rejects unsafe direct `.Count` access on variables known to come from pipelines, JSON arrays, or optional DNR members.
- Retains durable first-line logging, no nested BAT relaunch, automatic `LOAD-UNPACKED`, two-repository publication, rollback backup, and the complete R9 protection engine.

## 1.0.8 R9 — StrictMode-safe publisher regression fix

- Fixed the R8 publisher crash under `Set-StrictMode -Version Latest` when a valid DNR condition omits optional `urlFilter`, `requestDomains`, or `domainType` properties.
- R9 reads optional JSON properties through `PSObject.Properties[...]` instead of direct member access.
- Added a publisher regression gate that validates optional DNR condition fields without assuming every rule uses every field.
- Preserves the R8 website-compatibility correction and the complete blocker/runtime feature set.
- Durable BAT logging, single-process publishing, LOAD-UNPACKED generation, source publication, and release publication remain unchanged.

## 1.0.7 R8 — Website compatibility regression correction

- Removed R7 canyoublockit.com-specific same-origin URL rules that could block the site's own assets.
- Converted generic WordPress/native-ad path rules to third-party-only blocking.
- Replaced broad semantic text/ancestor hiding with high-confidence explicit ad selectors.
- Added the observed extreme-test ad host ybs2ft75v.com and additional popup-network domains to network blocking.
- Added publisher gates that reject test-site-specific DNR rules and broad cosmetic heuristics.
- Retained durable BAT logging, licensing, GUI, per-site modes, Network Inspector, popup/redirect guards, and Load-Unpacked generation.

# QuietShield Chrome Changelog

## 1.0.6 R7 — Final Release

- Strengthened native/sponsored ad removal with high-confidence selectors and semantic card detection.
- Added anti-adblock/content-blocker overlay cleanup without hiding ordinary editorial content.
- Added first-party/same-origin ad asset blocking for common ad-insertion, native-widget, Prebid, GPT and WordPress ad paths.
- Expanded packaged advertising-domain coverage.
- Increased packaged DNR rules from 92 in R5/R6 to 104 total rules in R9.
- Added exact DNR matched-rule counters when Chrome debugging feedback is available.
- Added a built-in Protection Engine Self-Test using Chrome's unpacked-extension `testMatchOutcome()` API.
- Retained the synchronous `.ad-widget` detector bait hide used by common adblock detection tests.
- Retained popup/pop-under interception, push-notification suppression, redirect blocking, URL tracking cleanup and per-site modes.
- Retained the R6 durable publisher: one BAT, one PowerShell process, automatic persistent log, no nested BAT relaunch, and window stays open on success or failure.
- Retained hidden internal license endpoint and Code372 shared QuietShield licensing integration.
- Administrator key remains user-entered only and is not bundled or retained after successful administrator activation.
