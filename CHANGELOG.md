# QuietShield Chrome Changelog

## 1.0.5 R6 — Durable publisher / no disappearing window

- Removed the recursive BAT relaunch after canonical installation. The same PowerShell process now continues against the clean canonical project.
- Added a persistent publisher transcript from the first runtime step through completion or failure.
- BAT preflight failures are also written to the same external log.
- Logs are stored outside the clean project at `D:\QuietShield-Chrome-Logs` when drive D: is available, otherwise under `%LOCALAPPDATA%\QuietShield\Chrome\Logs`.
- `LATEST.log` is always refreshed for quick recovery.
- The BAT window now pauses on both success and failure so output cannot disappear.
- Exceptions print the exact message, PowerShell position, and script stack trace before exit.
- R5 functional blocker, GUI, DNR, licensing, and LOAD-UNPACKED behavior are retained.

# Changelog

## 1.0.5 R6

- Expanded QuietShield from a starter blocker into a broader ad/tracker blocker with substantially larger packaged network-domain coverage.
- Added EasyList-style third-party ad-path blocking for common ad servers, WordPress ad plugins, prebid/VAST assets, popunders and interstitial loaders.
- Added same-origin CanYouBlockIt compatibility rules for self-hosted ad-test resources without blocking the test page navigation itself.
- Added synchronous high-confidence cosmetic filtering at `document_start`, including `.ad-widget`, so standard adblock-detector tests can detect QuietShield immediately.
- Added broader cosmetic selectors plus conservative semantic detection for full-screen advertising/interstitial overlays.
- Strengthened Popup Lock to suppress pop-under behavior on aggressive ad-test pages and known redirect networks.
- Annoyance Lock now rejects web-push permission prompts while enabled and records the action locally.
- Expanded tracking-parameter cleanup.
- Improved per-tab action accounting so cosmetic ad hides, popups and URL cleanups are reflected in the popup instead of showing misleading zeros.
- Fixed the popup selecting the extension/options tab as the "current site"; it now falls back to the most recently used normal web tab.
- Added real quick toggles for Ad, Tracker, Threat, Popup and Redirect protection directly in the popup.
- Refined the dashboard layout, colors, protection-status ribbon and coverage meter.
- Refreshed the QuietShield Android-style shield assets for better visibility at 16/32/48 px Chrome toolbar sizes while preserving the established logo shape.
- Preserved hidden licensing endpoint configuration, administrator key safety and the same Code372 licensing backend contract.
- Publisher continues creating a clean `LOAD-UNPACKED` folder automatically.

## 1.0.3 R4

- Fixed Chrome DNR ruleset parsing failure caused by unsupported `worker` ResourceType in `security-rules.json`.
- Added publisher validation that rejects unsupported Chrome `declarativeNetRequest` ResourceType values.
- Added automatic `LOAD-UNPACKED` folder creation containing only `manifest.json`, `assets`, and `src`.

## 1.0.2 R3

- Replaced the foundation UI with the approved QuietShield dark dashboard and compact popup.
- Removed customer-facing Developer Configuration and license endpoint override controls.
- Added independent MV3 rulesets for ads, trackers, threat/cryptomining domains, redirect networks, and optional HTTPS upgrades.
- Added persisted switches, Protected / Trusted / Blocked site modes, popup guard, cosmetic cleanup, annoyance cleanup and URL tracking cleanup.
- Added local aggregate activity counters, seven-day dashboard charting and Network Inspector.
- Added customer license/trial/device-management UI and administrator activation with a device-bound RSA public key.
- Added Code372 same-server integration for `quietshield.chrome`.

## 1.0.1 R2

- Fixed the R1 publisher remote-script false positive.
- Added clean canonical installation and stale-source removal while preserving `.git`.
- Added PowerShell 7 parser preflight.
