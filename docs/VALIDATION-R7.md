# QuietShield Chrome 1.0.6 R7 Final Validation

Release gates:

- Manifest V3 parses and reports version 1.0.6.
- Every manifest-referenced runtime file exists locally.
- All JavaScript sources pass Node parser validation.
- Five DNR rulesets parse successfully.
- 114 total DNR rule IDs are unique.
- Every DNR ResourceType is a Chrome-supported value.
- No remote executable JavaScript, eval, or new Function is present.
- No customer-facing developer endpoint configuration is present.
- Built-in Apps Script deployment route appears only in background licensing code.
- No administrator key, Payhip secret, server private key or PEM material is packaged.
- Synchronous `.ad-widget` detector bait coverage is present.
- Native/sponsored semantic filtering and anti-adblock overlay cleanup are present.
- Same-origin ad-insertion/native-widget DNR coverage is present.
- Popup/pop-under and push-notification page guards are present.
- `getMatchedRules`-based DNR feedback and `testMatchOutcome` Engine Self-Test are present.
- Publisher remains exactly one root BAT plus one publisher PS1.
- Publisher logs before mutation, never recursively launches another BAT, and keeps the command window open.
- Chromium 144 `--pack-extension` acceptance is required before final artifact freeze.

Live external ad-network behavior must still be verified in the user's Chrome environment because the build container does not have unrestricted public browser networking. R7 includes the built-in unpacked-extension Engine Self-Test so the installed Chrome DNR engine can be verified locally without relying on a third-party test page.
