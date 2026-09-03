# QuietShield Chrome 1.0.2 R3 validation

Validation performed on the final R3 tree before packaging.

## Passed here

- Manifest parses as JSON, `manifest_version = 3`, version `1.0.2`.
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

## Must run on the user's Windows environment

- PowerShell 7 parses and executes `scripts/PUBLISH-QUIETSHIELD-CHROME-R3.ps1`. The BAT performs this parser gate before modifying the canonical project.
- Source and release GitHub pushes authenticate successfully.
- Live Apps Script licensing works after Code372 is deployed to the existing QuietShield web-app deployment.
- Real Chrome browsing acceptance tests from `docs/TEST-PLAN.md`.

## Licensing dependency

The currently deployed pre-Code372 server can reject Chrome with `PACKAGE_NOT_AUTHORIZED`. Deploy the supplied `QuietShield_License_Server_v1.2.6_Code372_Chrome_R3.gs` to the SAME QuietShield Apps Script project/deployment before judging live Chrome activation.
