# QuietShield Chrome v1.0.1 R2 — Windows Chrome test plan

Use Chrome Developer Mode and load `D:\Windows Projects\QuietShield-Chrome` unpacked.

## Gate A — install/startup

1. `chrome://extensions` shows QuietShield v1.0.1 with no manifest/ruleset errors.
2. Service worker opens without uncaught errors.
3. Toolbar popup opens and shows the active site.
4. Block-count badge is visible after a DNR rule matches.

## Gate B — protection state

1. With Protection ON, visit a normal HTTPS site and confirm the page remains usable.
2. Turn Protection OFF. Static rules and all QuietShield dynamic site rules must stop applying.
3. Turn Protection ON. Stored Trusted/Blocked site modes must be rebuilt automatically.
4. Restart Chrome and confirm the saved master state is restored.

## Gate C — per-site modes

For a disposable test domain:

- Protected: normal QuietShield filtering applies.
- Trusted: QuietShield DNR protection is bypassed for that frame hierarchy and cosmetic cleanup does not run.
- Blocked: main/subframe navigation is blocked.
- Switch back to Protected and confirm the dynamic rule is removed.

## Gate D — cosmetic + URL cleanup

1. Open a URL containing `utm_source`, `fbclid`, or `gclid` and confirm only known tracking parameters are removed.
2. Disable Tracking parameter cleanup and confirm the URL is left unchanged.
3. Disable Cosmetic cleanup and confirm QuietShield no longer hides matching page elements.
4. Trust a site and confirm both content-script cleanup layers stop on that site.

## Gate E — Network Inspector

1. Open a normal page and confirm request domains appear in the popup.
2. Disable Network Inspector. Existing in-memory observations must clear and new requests must not be recorded.
3. Re-enable it and confirm new observations start from an empty state.
4. Close the tab and confirm its in-memory entry disappears.

## Gate F — shared licensing

First deploy `docs/APPS-SCRIPT-CHROME-INTEGRATION.md` to the existing QuietShield Apps Script.

1. GET the existing `/exec` endpoint and confirm the expected healthy server build.
2. Start/restore a trial. Receipt `deviceHash` must match this Chrome installation ID.
3. Activate a normal customer key.
4. Refresh the license using the stored local key.
5. Open **My licensed devices** and confirm Chrome appears as platform `Chrome`.
6. Remove a disposable active device and confirm its slot becomes available.
7. Verify a normal license still rejects a fourth active device.
8. Verify shared tester/family/giveaway keys retain their server-side device-management restrictions.

## Gate G — privacy/security

1. Inspect extension storage: no Payhip product secret, RSA private key, license pepper, admin token, or customer database exists.
2. Confirm Network Inspector data is not persisted as detailed browsing history.
3. Confirm the stored customer license key never appears in popup/options DOM after activation and is not logged.
4. Confirm no remote JavaScript is loaded and no `eval`/`new Function` is used.
5. Until a later security release pins the existing RSA public verification key and verifies receipts with WebCrypto, do not treat a cached receipt as offline Premium authority.

## Gate H — publisher

Run `START-PUBLISH-QUIETSHIELD-CHROME-R2.bat` normally, not elevated.

Expected:

- PowerShell 7 required.
- Canonical project becomes `D:\Windows Projects\QuietShield-Chrome`.
- Source pushes to `ajleveriza1108/QuietShield-Chrome`.
- Release ZIP, `latest.json`, and `SHA256SUMS.txt` are generated.
- Release files push to `ajleveriza1108/QuietShield-Chrome-Release`.
- Any Git/auth/parser/build failure stops publication with a non-zero exit code.
