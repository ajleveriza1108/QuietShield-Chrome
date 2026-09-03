# QuietShield Chrome 1.0.3 R4 validation

Validation performed on the final R4 tree before packaging.

R4 specifically fixes Chrome's `security-rules.json` parse error: `worker` is not a valid Chrome declarativeNetRequest ResourceType. The value is removed and the publisher now enforces Chrome's supported ResourceType allow-list.

## Passed here

- Manifest parses as JSON, `manifest_version = 3`, version `1.0.3`.
- All five packaged DNR rulesets parse and use unique rule IDs.
- All manifest-referenced local service-worker, popup, options, content-script and DNR files exist.
- All 8 extension JavaScript files pass Node.js 22.16.0 syntax checking.
- Complete QuietShield License Server v1.2.6 Code372 source passes JavaScript syntax checking after `.gs` -> `.js` test copy.
- Options and popup JavaScript ID references resolve to real HTML elements.
- No customer-facing Developer Configuration / endpoint override control remains.
- Built-in Apps Script deployment address appears exactly once under `src/`, only in `src/background/licensing.js`.
- No bundled administrator activation key, Payhip product secret, receipt private key or PEM private key was found in the extension runtime.
- Mocked service-worker runtime test passed:
  - default Ads / Trackers / Security / Redirect rulesets active;
  - Ad Lock independently disables/re-enables its ruleset;
  - master pause disables all QuietShield rulesets/dynamic rules;
  - Protected / Trusted / Blocked site-rule path works;
  - request inspection and `ERR_BLOCKED_BY_CLIENT` ad counters work;
  - administrator activation generates a device RSA public key;
  - returned administrator device secret is not exposed to the UI;
  - administrator activation key is not persisted as `qs.licenseKey`.
- Chromium 144.0.7559.96 `--pack-extension` accepted the final extension tree with exit code 0.
- Temporary Chromium-generated CRX/PEM validation artifacts were deleted and are not in this package.
- Publisher now recreates `D:\Windows Projects\QuietShield-Chrome\LOAD-UNPACKED` from the validated `manifest.json`, `assets`, and `src` runtime only.
- The exact ready-to-load folder structure (`manifest.json`, `assets`, `src`) passed the same static checks and Chromium 144 `--pack-extension` validation with exit code 0.

## Must run on the user's Windows environment

- The BAT performs a PowerShell 7 parser gate on `scripts/PUBLISH-QUIETSHIELD-CHROME-R4.ps1` before modifying the canonical project. PowerShell 7 is not installed in this build container, so the Windows parser/runtime gate must run on the user's machine.
- Source and release GitHub pushes authenticate successfully.
- Live Apps Script licensing works after Code372 is deployed to the existing QuietShield web-app deployment.
- Real Chrome browsing acceptance tests from `docs/TEST-PLAN.md`.

## Licensing dependency

The currently deployed pre-Code372 server can reject Chrome with `PACKAGE_NOT_AUTHORIZED`. Deploy the supplied `QuietShield_License_Server_v1.2.6_Code372_Chrome.gs` to the SAME QuietShield Apps Script project/deployment before judging live Chrome activation.
