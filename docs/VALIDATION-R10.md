# QuietShield Chrome 1.0.9 R10 Validation

R10 is a publisher reliability correction. It preserves the R8 website-compatibility blocker runtime and fixes the PowerShell 7 `Set-StrictMode -Version Latest` crash caused by direct access to optional DNR condition properties.

## Publisher regression fixed

The publisher now reads optional `urlFilter`, `requestDomains`, and `domainType` members via `PSObject.Properties[...]`. Valid DNR rules may omit any of these fields. The R8 publisher incorrectly assumed they existed.

## Runtime retained

- Manifest V3
- 104 packaged DNR rules across Ads, Trackers, Security, Redirects and HTTPS Upgrade
- compatibility-safe high-confidence cosmetic filtering
- popup/redirect guard
- per-site Protected / Trusted / Blocked modes
- Network Inspector and matched-rule diagnostics
- hidden built-in licensing endpoint and Code372 compatibility

## Windows gate

The BAT runs PowerShell 7's parser before mutation and writes a durable log to `D:\QuietShield-Chrome-Logs`.
