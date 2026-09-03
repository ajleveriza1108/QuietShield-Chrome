# Changelog

## 1.0.3 R4

- Fixed Chrome DNR ruleset parsing failure caused by unsupported `worker` ResourceType in `security-rules.json`.
- Security blocking now uses Chrome-supported request types while retaining main-frame, sub-frame, script, XHR, WebSocket and other coverage.
- Added publisher validation that rejects any unsupported Chrome `declarativeNetRequest` ResourceType before Git publication or release packaging.
- Preserved the R3 GUI, licensing, protection engine, hidden endpoint configuration, and Code372 backend integration.
- Publisher now automatically recreates a clean `LOAD-UNPACKED` folder containing only `manifest.json`, `assets`, and `src` for direct selection in Chrome.

## 1.0.2 R3

- Replaced the foundation UI with the approved QuietShield dark dashboard and compact popup.
- Aligned Chrome icons with the established QuietShield green shield/check identity.
- Removed all customer-facing Developer Configuration and license endpoint override controls.
- Added independent MV3 rulesets for ads, trackers, threat/cryptomining domains, redirect networks, and optional HTTPS upgrades.
- Added real persisted switches for every visible protection feature.
- Added real Protected / Trusted / Blocked per-site modes.
- Added popup lock, redirect guard, cosmetic cleanup, annoyance cleanup, and tracking-parameter cleanup.
- Added local aggregate activity counters, seven-day dashboard charting, Privacy Score, and live Network Inspector.
- Added customer license/trial/device-management UI to the new dashboard.
- Added administrator activation support with a locally generated device RSA public key; administrator key is not persisted after successful activation.
- Added Code372 same-server integration instructions for `quietshield.chrome`.
- Strengthened the publisher with endpoint-UI, private-credential, package-contract, MV3, DNR and JavaScript validation gates.

## 1.0.1 R2

- Fixed the R1 publisher remote-script false positive.
- Added clean canonical installation and stale-source removal while preserving `.git`.
- Added PowerShell 7 parser preflight.
