# QuietShield Chrome 1.0.5 R6 validation

Validation performed on the final R6 source tree before packaging.

## Functional changes validated

- High-confidence synchronous cosmetic stylesheet is declared at `document_start` and contains `.ad-widget` for standard adblock-detector bait.
- Content script keeps the synchronous layer bypassable for Trusted sites and Master Protection OFF using `data-qs-bypass`.
- Cosmetic engine contains broader ad selectors plus conservative full-screen interstitial/ad-overlay cleanup.
- Popup Lock covers known redirectors and aggressive pop-under test pages.
- Annoyance Lock attempts to deny push-notification permission prompts while active.
- Popup uses a normal web-tab fallback instead of treating the QuietShield options page/extension ID as the current website.
- Popup quick-lock controls map to real stored settings for Ad, Tracker, Threat, Popup and Redirect protection.
- Per-tab action accounting includes network blocks, cosmetic ad hides, popups and tracking-parameter cleanup.
- `LOAD-UNPACKED` remains a generated clean runtime folder.

## DNR validation

- `ads-rules.json`: 61 rules.
- `tracker-rules.json`: 18 rules.
- `security-rules.json`: 1 rule.
- `redirect-rules.json`: 11 rules.
- `upgrade-rules.json`: 1 rule.
- Total packaged DNR rules: 92.
- Every DNR rule ID is globally unique.
- Every `resourceTypes` value is in Chrome's supported MV3 ResourceType set.
- Generic path rules use third-party scope where appropriate.
- CanYouBlockIt same-origin rules exclude main-frame navigation and target only ad-like subresources.

## Static package validation

- Manifest parses as JSON, `manifest_version = 3`, version `1.0.5`.
- All manifest-referenced background, popup, options, content JS/CSS and DNR resources exist.
- All 8 JavaScript runtime files pass `node --check`.
- Popup and options JavaScript element-ID references resolve to real HTML elements.
- Runtime remote executable-code scan passes: no remote script/import/worker, `eval`, or `new Function`.
- The Apps Script deployment route appears only in `src/background/licensing.js`.
- No administrator key, Payhip secret, receipt private key, PEM or server signing key is packaged.
- Chromium 144 `--pack-extension` validation completed with exit code 0 on the final R6 tree.
- Temporary Chromium-generated CRX/PEM validation artifacts were deleted immediately and are not shipped.

## Environment limitation

The build container does not have Windows PowerShell 7 installed, so the Windows PowerShell parser/runtime was not executed here. The R6 BAT performs PowerShell 7 parser validation before it modifies the canonical project on the user's Windows machine.

The build environment could not complete a live external CanYouBlockIt browser session. R6 therefore includes explicit regression gates for its documented `.ad-widget` detector behavior, same-origin test-ad rules, popup guard and interstitial cleanup; the final live-site check remains a user-browser acceptance test.
