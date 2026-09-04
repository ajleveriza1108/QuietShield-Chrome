# QuietShield Chrome 1.0.4 R5 acceptance plan

R5 is not considered complete merely because the dashboard opens.

## Chrome load

1. Run `START-PUBLISH-QUIETSHIELD-CHROME-R5.bat` normally, not as Administrator.
2. Select `D:\Windows Projects\QuietShield-Chrome\LOAD-UNPACKED` in `chrome://extensions`.
3. Confirm there are no Manifest/DNR/service-worker errors.

## CanYouBlockIt

1. Disable other ad blockers for the test so QuietShield is isolated.
2. Visit the CanYouBlockIt Adblock Detector. QuietShield should be detected because the `.ad-widget` detector bait is synchronously hidden.
3. Visit Simple Test `/testing/`; the self-hosted interstitial/ad elements should be hidden.
4. Visit eXtreme Test; third-party banner/pop-under/redirect resources should be blocked where they match packaged rules.
5. Click on the eXtreme/Pop-Under test page. Popup Lock should suppress the advertising pop-under.
6. Re-open QuietShield while the dashboard tab is active; the popup should show the most recently used normal website, not the extension ID.

## Switch behavior

- Ad Lock OFF then reload: ad filtering should reduce/stop while other layers remain active.
- Tracker Lock OFF: tracker ruleset disables independently.
- Threat Lock OFF: security ruleset disables independently.
- Popup Lock OFF: `window.open` guard no longer suppresses its popup test behavior.
- Redirect Lock OFF: redirect ruleset disables independently.
- Master Protection OFF: packaged rulesets and page protection pause.
- Trusted site: site bypass takes precedence over ordinary protection.
- Blocked site: top-level navigation is blocked.

## Counters

- Network blocks should increase page action/badge counts.
- Cosmetic ad hides should increase Ads Blocked and cosmetic totals.
- URL tracking cleanup should increase cleanup totals.
- Popup suppression should increase popup totals.
- Network Inspector should list request domains only while enabled and only in service-worker memory.

## Licensing

Live Chrome activation requires the existing QuietShield Apps Script deployment to be updated to Code372 so `quietshield.chrome` is authorized. Test customer key, trial, administrator key, refresh, list devices and remove device after server deployment.
