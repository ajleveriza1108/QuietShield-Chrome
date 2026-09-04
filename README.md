# QuietShield Chrome 1.0.5 R6

QuietShield Chrome is a Manifest V3 browser-protection extension using the same QuietShield identity and shared licensing backend as the other QuietShield clients.

## What changed in R6

R6 is a functional blocker upgrade, not only a GUI revision. The earlier starter rules were too narrow for dedicated adblock test pages and the popup could display zeros even when page-level protection had acted. R6 addresses both problems.

- Broader packaged ad-network and tracker-domain coverage.
- Common third-party ad-path filtering for ad servers, ad scripts, prebid/VAST resources and WordPress ad plugins.
- CanYouBlockIt same-origin test-ad filtering while keeping its test pages navigable.
- Immediate `document_start` cosmetic filtering for high-confidence ad elements such as `.ad-widget`.
- Interstitial/ad-overlay cleanup and stronger pop-under suppression.
- Real popup quick switches for Ad, Tracker, Threat, Popup and Redirect protection.
- Correct fallback to the latest normal web tab when the popup is opened while the QuietShield dashboard is active.
- Improved per-page counters for network blocks, cosmetic ad hides, popups and URL cleanups.
- Refined dashboard and popup visuals with refreshed QuietShield toolbar icons.
- Hidden licensing endpoint remains internal; administrator credentials remain outside the package.

## Protection architecture

QuietShield uses five packaged MV3 rulesets: ads, trackers, threats/mining, redirect networks and optional HTTPS upgrades. The visible protection switches enable or disable real filtering behavior.

Page-level protection includes cosmetic filtering, URL tracking cleanup, popup/pop-under guards and annoyance cleanup. Trusted sites bypass QuietShield page protection after the stored site policy loads.

## CanYouBlockIt behavior

CanYouBlockIt deliberately uses both third-party and self-hosted advertisements. R6 adds browser-level blocking plus page-level cosmetic rules for its detector bait and interstitial test elements. QuietShield does not expose a unique webpage-visible "QuietShield installed" marker; the test should detect it as an ad blocker because ad elements are actually blocked/hidden.

## Privacy

Network Inspector details remain in service-worker memory. Aggregate protection counters and site policies are stored locally. QuietShield does not upload browsing history to the licensing service.

## Licensing

The service address is internal routing configuration and is not shown in the UI. Administrator keys are never hard-coded. Administrator activation uses a device-bound RSA keypair and does not retain the administrator activation key after successful activation.

Deploy the matching existing-server Code372 Chrome authorization before testing live Chrome licensing.

## Load unpacked

The publisher automatically recreates:

`D:\Windows Projects\QuietShield-Chrome\LOAD-UNPACKED`

Select that exact folder in `chrome://extensions` -> Developer mode -> Load unpacked.

## Windows publisher

Run normally, not as Administrator:

`START-PUBLISH-QUIETSHIELD-CHROME-R6.bat`

Requirements:
- PowerShell 7
- Git for Windows
- Existing GitHub authentication

## R6 publisher reliability

Run `START-PUBLISH-QUIETSHIELD-CHROME-R6.bat` normally. The launcher now always keeps its window open and always creates a persistent log before publisher work begins. On systems with drive D:, logs are written to `D:\QuietShield-Chrome-Logs`; otherwise they are written under `%LOCALAPPDATA%\QuietShield\Chrome\Logs`. The newest complete run is mirrored as `LATEST.log`.

R6 no longer relaunches a second BAT after installing to `D:\Windows Projects\QuietShield-Chrome`; the original PowerShell process continues against the canonical project so nested-window crashes and lost output are eliminated.
