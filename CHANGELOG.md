# Changelog

## 1.0.1 R2 - 2026-09-03

Publisher reliability update.

- Fixed the R1 MV3 remote-code scanner false-positive/stale-file failure.
- Canonical install now backs up the previous source, preserves `.git`, and removes stale runtime/build files before copying the new package.
- Remote executable-code validation now scans only the actual extension runtime under `src` and reports exact file/line details.
- Added PowerShell 7 parser preflight in the BAT before any project mutation.
- Added manifest-referenced local-file checks, CSP checks, DNR JSON parsing, and duplicate rule-ID validation.
- Preserved the existing two-repository publication contract and PowerShell 7 requirement.

## 1.0.0 R1 - 2026-09-03

Initial QuietShield Chrome foundation.

- Added MV3 service-worker architecture.
- Added bundled declarative baseline filtering.
- Added cosmetic cleanup and tracking-parameter cleanup.
- Added Protected / Trusted / Blocked site modes.
- Added privacy-first Network Inspector.
- Added toolbar block-count badge integration.
- Added shared QuietShield Apps Script licensing adapter.
- Added PowerShell 7 two-repository publisher and release metadata generation.
