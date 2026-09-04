# QuietShield Chrome 1.0.6 R7 — Final Release

QuietShield is a Manifest V3 Chrome extension for local ad, tracker, popup, redirect, nuisance and tracking-parameter protection.

## Final protection engine

R7 ships five packaged DNR rulesets with 114 validated rules total:

- Ads: 83 rules, including major advertising/native recommendation networks and high-confidence same-origin ad asset paths.
- Trackers: 18 rules.
- Threat/mining: 1 consolidated domain rule.
- Redirect/popunder networks: 11 rules.
- Optional HTTP-to-HTTPS upgrade: 1 rule.

The page layer adds synchronous detector-bait hiding, cosmetic ad removal, native/sponsored-card detection, interstitial cleanup, anti-adblock overlay cleanup, popup protection, push-notification suppression and URL tracking cleanup.

## Native-ad test note

Some adblock test pages show a static screenshot labelled as an example of a native ad. An illustration is ordinary editorial page content and is not itself an advertising network request. QuietShield deliberately avoids deleting editorial examples merely because they look like an ad. Use the site's actual detector/live ad slots, banner tests, popup tests and QuietShield's own Engine Self-Test to verify blocking.

## Built-in Engine Self-Test

Open QuietShield Dashboard -> Protection -> Protection Engine Self-Test -> Run self-test.

When QuietShield is loaded unpacked, Chrome checks hypothetical requests against the installed DNR engine. R7 tests Google display ads, same-origin ad-insertion assets, native-ad assets, analytics, cryptomining and pop-under networks. All tests should report PASS.

## Load unpacked

The full-functional bundle contains a ready folder named `LOAD-UNPACKED`. In Chrome:

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Click Load unpacked.
4. Select the `LOAD-UNPACKED` folder itself.

After running the publisher, the same ready runtime is rebuilt at:

`D:\Windows Projects\QuietShield-Chrome\LOAD-UNPACKED`

## Durable publisher

Run `START-PUBLISH-QUIETSHIELD-CHROME-R7.bat` normally, not as Administrator. PowerShell 7 is required.

The publisher creates a persistent log before mutation and never relaunches a second BAT. On systems with drive D:, logs are written to:

`D:\QuietShield-Chrome-Logs`

The most recent run is copied to:

`D:\QuietShield-Chrome-Logs\LATEST.log`

If D: is unavailable, logs fall back to `%LOCALAPPDATA%\QuietShield\Chrome\Logs`.

## Licensing

QuietShield Chrome uses the existing QuietShield licensing service. The customer-facing UI does not show or edit the service URL. Customer and administrator keys are entered through the License page. No server signing key, Payhip secret or administrator key is bundled in the extension.

The matching shared server remains QuietShield License Server 1.2.6 Code372 with Chrome package authorization for `quietshield.chrome`.

## Scope

QuietShield can block a large class of network and cosmetic ads under Chrome Manifest V3, but no browser extension can truthfully guarantee permanent blocking of every first-party advertisement on every site. The release avoids making that claim.
