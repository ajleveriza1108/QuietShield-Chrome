# Changelog

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
