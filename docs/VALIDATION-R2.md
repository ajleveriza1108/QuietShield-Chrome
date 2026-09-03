# QuietShield Chrome v1.0.1 R2 — build validation

Validated before packaging:

- Manifest parses as Manifest V3, version 1.0.1.
- Static DNR JSON parses and rule IDs are unique.
- Every bundled JavaScript file passes Node.js syntax validation.
- No remote `<script src>`, remote ES module import, `importScripts`, remote Worker, `eval`, or `new Function` exists in the extension runtime.
- The publisher scanner is scoped to `src` and therefore does not treat stale documentation/build files as extension runtime.
- The BAT invokes the PowerShell 7 parser on the complete publisher before any project mutation.
- Canonical installation preserves `.git`, creates a rollback backup of prior source, deletes stale non-Git contents, and then installs the exact R2 package.
- Manifest-referenced service worker, popup, options page, content scripts, and DNR resources are required to exist locally.
- Extension CSP remains local-only.
- Chrome identity remains `platform=Chrome`, `packageName=quietshield.chrome`.
- Shared Apps Script adapter retains trial, activation, refresh, list-device, and remove-device flows.
- Master Protection state re-synchronizes static and dynamic site rules on toggle, startup, and extension install/update.
- Network Inspector disable/clear contract remains present.
- Chromium 144 pack-extension validation is performed on the final R2 package in the build environment.
- No PEM/private-key material is packaged.

Windows-only gates are performed by `START-PUBLISH-QUIETSHIELD-CHROME-R2.bat` using PowerShell 7 and the user's local Git credentials.
