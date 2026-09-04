# QuietShield Chrome 1.0.9 R10 Final Acceptance Plan

1. Run `START-PUBLISH-QUIETSHIELD-CHROME-R10.bat` normally.
2. Confirm the BAT remains open and prints the persistent log and `LATEST.log` paths.
3. In `chrome://extensions`, load `D:\Windows Projects\QuietShield-Chrome\LOAD-UNPACKED`.
4. Confirm there are no extension Errors.
5. Open Dashboard -> Protection -> Run self-test. Require all network-engine tests PASS.
6. With all other ad blockers/Brave Shields disabled for the test site, open the CanYouBlockIt Adblock Detector page and confirm the detector bait is hidden.
7. Test web banners, pop-under, push-notification and eXtreme pages separately.
8. Verify the popup shows the real current website, DNR action count, category counts and live domains.
9. Toggle Ad Lock off/on and reload the test page; behavior must change.
10. Set a site to Trusted and reload; QuietShield must stop normal blocking for that site. Return it to Protected afterward.
11. Verify Popup Lock and Redirect Lock independently.
12. Verify URL Cleaner removes supported tracking parameters.
13. Verify License activation/trial/refresh against deployed Code372.
14. Verify administrator activation is device-bound and the administrator key is not retained after success.
