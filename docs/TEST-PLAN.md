# QuietShield Chrome 1.0.3 R4 acceptance plan

R4 is not considered complete merely because the GUI loads.

## Gate A - installation
- Load `D:\Windows Projects\QuietShield-Chrome` unpacked in Chrome 120+.
- No manifest, DNR, service-worker or content-script errors.
- QuietShield shield icon appears in Chrome.

## Gate B - master protection
- Master ON: ads/tracker/security/redirect rulesets match their individual switches.
- Master OFF: all QuietShield packaged rulesets and dynamic site rules are disabled.
- Re-enable: persisted settings and site rules are restored.

## Gate C - real ad blocking
- A page requesting a known test ad-network hostname is blocked and increments Chrome's action badge.
- Disabling Ad Lock disables the ad ruleset immediately without changing unrelated Tracker Lock.
- Cosmetic ad slots disappear when cosmetic filtering is enabled.

## Gate D - tracker/threat/redirect layers
- Tracker Lock blocks a known packaged tracker domain.
- Threat Lock blocks a packaged safe threat-test hostname.
- Redirect Lock blocks a packaged redirect-network request.
- Popup Lock prevents non-user-initiated scripted `window.open()` and still permits a user-click popup.

## Gate E - site controls
- Protected = normal QuietShield filtering.
- Trusted = QuietShield request filtering and page cleanup bypassed for the site.
- Blocked = main frame cannot load.
- Rules survive Chrome restart and can be edited/removed in Sites.

## Gate F - URL Cleaner and annoyances
- `utm_*`, `fbclid`, `gclid`, `msclkid` and listed tracking parameters are removed without a network navigation.
- Turning URL Cleaner off stops the behavior.
- Newsletter/push/floating-ad overlays are cosmetically hidden only when Annoyance Lock is enabled.

## Gate G - Network Inspector and activity
- Current-tab request count/domains update while browsing.
- Network Inspector OFF clears in-memory inspection data.
- Aggregate counters and seven-day chart survive restart.
- Clear Activity resets activity only, preserving settings/site modes/license.

## Gate H - licensing after Code372 deployment
- 7-day Trial starts/restores through the same QuietShield server.
- Customer key activates and can list/remove devices where supported.
- Fourth active device remains rejected for a standard 3-device license.
- Administrator key activation sends a generated public device key and succeeds within current admin-seat policy.
- Administrator key is absent from Chrome local storage after successful activation.
- The Apps Script deployment address is absent from every customer-facing screen.

## Gate I - privacy/security
- No Payhip secret, private receipt key, admin activation key, service-account material or signing password is bundled.
- No remote executable JavaScript.
- No `eval` / `new Function`.
- Network activity to the licensing server occurs only for explicit license operations/refreshes, not browsing telemetry.

## Gate J - publisher
- Run normally under PowerShell 7.
- PowerShell parser gate passes before canonical files are changed.
- Canonical clean install backup succeeds.
- Source and release repositories both push successfully.
- Release ZIP SHA-256 is printed and stored in the release repository.
