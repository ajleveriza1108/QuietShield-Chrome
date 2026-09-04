#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$CanonicalRoot = 'D:\Windows Projects\QuietShield-Chrome',
    [string]$SourceRepo = 'https://github.com/ajleveriza1108/QuietShield-Chrome.git',
    [string]$ReleaseRepo = 'https://github.com/ajleveriza1108/QuietShield-Chrome-Release.git',
    [string]$LogPath = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Version = '1.0.5'
$Revision = 'R6'
$LauncherName = 'START-PUBLISH-QUIETSHIELD-CHROME-R6.bat'
$PackageName = "QuietShield-Chrome-$Version-$Revision.zip"

function Write-Step([string]$Text) {
    Write-Host "`n=== $Text ===" -ForegroundColor Cyan
}

function Fail([string]$Text) {
    throw $Text
}

function Get-NormalizedPath([string]$Path) {
    if (Test-Path -LiteralPath $Path) {
        return ((Resolve-Path -LiteralPath $Path).Path -replace '[\\/]+$', '')
    }
    return ([System.IO.Path]::GetFullPath($Path) -replace '[\\/]+$', '')
}

function Assert-TextPatternAbsent {
    param(
        [Parameter(Mandatory = $true)]
        [System.IO.FileInfo[]]$Files,

        [Parameter(Mandatory = $true)]
        [string]$Pattern,

        [Parameter(Mandatory = $true)]
        [string]$FailureLabel
    )

    foreach ($file in $Files) {
        $hit = Select-String -LiteralPath $file.FullName -Pattern $Pattern -ErrorAction Stop | Select-Object -First 1
        if ($null -ne $hit) {
            Fail (
                $FailureLabel +
                "`nFile: " + $file.FullName +
                "`nLine: " + $hit.LineNumber +
                "`nText: " + $hit.Line.Trim()
            )
        }
    }
}

function Assert-LocalExtensionPath {
    param(
        [AllowNull()]
        [AllowEmptyString()]
        [string]$Path,
        [string]$Label
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return
    }

    if ($Path -match '^(?i)https?://') {
        Fail "$Label must reference a bundled extension file, not a remote URL: $Path"
    }

    if ($Path -match '^(?i)(data|javascript):') {
        Fail "$Label uses a disallowed executable URL scheme: $Path"
    }

    $resolved = Join-Path $CanonicalRoot $Path
    if (-not (Test-Path -LiteralPath $resolved -PathType Leaf)) {
        Fail "$Label references a missing bundled file: $Path"
    }
}

function Invoke-GitChecked {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [Parameter(Mandatory = $true)]
        [string]$FailureMessage
    )

    & $script:GitExe @Arguments | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Fail $FailureMessage
    }
}

function New-LoadUnpackedFolder {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectRoot
    )

    $target = Join-Path $ProjectRoot 'LOAD-UNPACKED'
    if (Test-Path -LiteralPath $target) {
        Remove-Item -LiteralPath $target -Recurse -Force
    }

    New-Item -ItemType Directory -Path $target -Force | Out-Null

    foreach ($name in @('manifest.json', 'assets', 'src')) {
        $source = Join-Path $ProjectRoot $name
        if (-not (Test-Path -LiteralPath $source)) {
            Fail "Cannot create LOAD-UNPACKED because required runtime item is missing: $name"
        }
        Copy-Item -LiteralPath $source -Destination $target -Recurse -Force
    }

    $readyManifest = Join-Path $target 'manifest.json'
    if (-not (Test-Path -LiteralPath $readyManifest -PathType Leaf)) {
        Fail 'LOAD-UNPACKED was created without manifest.json.'
    }

    try {
        $readyManifestJson = Get-Content -LiteralPath $readyManifest -Raw | ConvertFrom-Json
    } catch {
        Fail "LOAD-UNPACKED manifest.json is invalid JSON: $($_.Exception.Message)"
    }

    if ([int]$readyManifestJson.manifest_version -ne 3 -or [string]$readyManifestJson.version -ne $Version) {
        Fail 'LOAD-UNPACKED manifest identity does not match the validated R6 runtime.'
    }

    Write-Host "[PASS] Chrome Load Unpacked folder ready: $target" -ForegroundColor Green
    return $target
}

# Durable publisher logging. The BAT supplies a log path, but direct PS1 runs
# also get a persistent external log. Logs are intentionally outside the
# canonical project so clean installation cannot delete them.
if ([string]::IsNullOrWhiteSpace($LogPath)) {
    $preferredLogRoot = 'D:\QuietShield-Chrome-Logs'
    if (-not (Test-Path -LiteralPath 'D:\' -PathType Container)) {
        $preferredLogRoot = Join-Path $env:LOCALAPPDATA 'QuietShield\Chrome\Logs'
    }
    New-Item -ItemType Directory -Path $preferredLogRoot -Force | Out-Null
    $LogPath = Join-Path $preferredLogRoot ("QuietShield-Chrome-$Version-$Revision-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
} else {
    $logParent = Split-Path -Parent $LogPath
    if ($logParent -and -not (Test-Path -LiteralPath $logParent -PathType Container)) {
        New-Item -ItemType Directory -Path $logParent -Force | Out-Null
    }
}

$script:PublisherExitCode = 0
$script:TranscriptStarted = $false

try {
    Start-Transcript -LiteralPath $LogPath -Append -Force | Out-Null
    $script:TranscriptStarted = $true
    Write-Host "[LOG] Persistent publisher log: $LogPath" -ForegroundColor Cyan

Write-Host '============================================================'
Write-Host "QuietShield Chrome $Version $Revision - CLEAN BUILD + TWO-REPO PUBLISHER"
Write-Host 'Run normally - DO NOT Run as Administrator.'
Write-Host 'Requires PowerShell 7.'
Write-Host '============================================================'

if ($PSVersionTable.PSVersion.Major -lt 7) {
    Fail 'PowerShell 7 is required.'
}

$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($currentIdentity)
if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Fail 'Do not run this publisher as Administrator.'
}

$scriptRoot = Get-NormalizedPath (Split-Path -Parent $PSScriptRoot)
$canonicalFull = Get-NormalizedPath $CanonicalRoot

if ($scriptRoot -ine $canonicalFull) {
    Write-Step 'Installing clean package to canonical project path'

    $parent = Split-Path -Parent $CanonicalRoot
    if (-not (Test-Path -LiteralPath $parent -PathType Container)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }

    if (-not (Test-Path -LiteralPath $CanonicalRoot -PathType Container)) {
        New-Item -ItemType Directory -Force -Path $CanonicalRoot | Out-Null
    }

    $preserveNames = @('.git')
    $ephemeralNames = @('release-out', '.release-work', 'LOAD-UNPACKED')
    $existingItems = @(
        Get-ChildItem -LiteralPath $CanonicalRoot -Force -ErrorAction SilentlyContinue |
            Where-Object { $preserveNames -notcontains $_.Name }
    )

    $backupCandidates = @(
        $existingItems |
            Where-Object { $ephemeralNames -notcontains $_.Name }
    )

    if ($backupCandidates.Count -gt 0) {
        $backupRoot = Join-Path $parent 'QuietShield-Chrome-Backups'
        $backupPath = Join-Path $backupRoot (Get-Date -Format 'yyyyMMdd-HHmmss')
        New-Item -ItemType Directory -Force -Path $backupPath | Out-Null

        foreach ($item in $backupCandidates) {
            Copy-Item -LiteralPath $item.FullName -Destination $backupPath -Recurse -Force
        }

        Write-Host "[PASS] Previous canonical source backed up: $backupPath" -ForegroundColor Green
    }

    foreach ($item in $existingItems) {
        Remove-Item -LiteralPath $item.FullName -Recurse -Force
    }

    Get-ChildItem -LiteralPath $scriptRoot -Force |
        Where-Object { $_.Name -ne '.git' } |
        ForEach-Object {
            Copy-Item -LiteralPath $_.FullName -Destination $CanonicalRoot -Recurse -Force
        }

    $installedLauncher = Join-Path $CanonicalRoot $LauncherName
    if (-not (Test-Path -LiteralPath $installedLauncher -PathType Leaf)) {
        Fail "Canonical installation did not contain $LauncherName."
    }

    Write-Host '[PASS] Clean canonical installation completed.' -ForegroundColor Green
    Write-Host '[INFO] Continuing in the same PowerShell process; no nested BAT relaunch is used.' -ForegroundColor Cyan
}

Set-Location -LiteralPath $CanonicalRoot

$git = Get-Command git.exe -ErrorAction SilentlyContinue
if (-not $git) {
    Fail 'git.exe was not found. Install Git for Windows and sign in to GitHub first.'
}
$script:GitExe = $git.Source

$gitName = (& $script:GitExe config --global user.name 2>$null | Out-String).Trim()
$gitEmail = (& $script:GitExe config --global user.email 2>$null | Out-String).Trim()
if (-not $gitName -or -not $gitEmail) {
    Fail 'Git identity is not configured. Run: git config --global user.name "Your Name" and git config --global user.email "you@example.com".'
}

Write-Step 'Preflight validation'

$manifestPath = Join-Path $CanonicalRoot 'manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    Fail 'manifest.json is missing.'
}

try {
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
} catch {
    Fail "manifest.json is invalid JSON: $($_.Exception.Message)"
}

if ([int]$manifest.manifest_version -ne 3) {
    Fail 'Manifest V3 is required.'
}
if ([string]$manifest.version -ne $Version) {
    Fail "manifest version must be $Version."
}

$srcRoot = Join-Path $CanonicalRoot 'src'
if (-not (Test-Path -LiteralPath $srcRoot -PathType Container)) {
    Fail 'src folder is missing.'
}

# Only scan the actual extension runtime. R1 scanned every HTML/JS file under
# the canonical project and could be tripped by stale build/reference files.
$htmlFiles = @(
    Get-ChildItem -LiteralPath $srcRoot -Recurse -File |
        Where-Object { $_.Extension -in @('.html', '.htm') }
)
$jsFiles = @(
    Get-ChildItem -LiteralPath $srcRoot -Recurse -File |
        Where-Object { $_.Extension -in @('.js', '.mjs') }
)

Assert-TextPatternAbsent `
    -Files $htmlFiles `
    -Pattern '<script\b[^>]*\bsrc\s*=\s*["'']\s*https?://' `
    -FailureLabel 'Remote <script src> reference detected. MV3 executable logic must be bundled.'

$remoteJsPatterns = @(
    '(?i)\bimportScripts\s*\(\s*["'']https?://',
    '(?i)\bimport\s*\(\s*["'']https?://',
    '(?i)\bimport\s*["'']https?://',
    '(?i)\bfrom\s*["'']https?://',
    '(?i)\b(?:new\s+)?(?:SharedWorker|Worker)\s*\(\s*["'']https?://'
)

foreach ($pattern in $remoteJsPatterns) {
    Assert-TextPatternAbsent `
        -Files $jsFiles `
        -Pattern $pattern `
        -FailureLabel 'Remote executable JavaScript reference detected. MV3 executable logic must be bundled.'
}

Assert-TextPatternAbsent `
    -Files $jsFiles `
    -Pattern '\beval\s*\(|\bnew\s+Function\s*\(' `
    -FailureLabel 'eval/new Function detected. Refusing MV3 package.'

Assert-LocalExtensionPath -Path ([string]$manifest.background.service_worker) -Label 'background.service_worker'
Assert-LocalExtensionPath -Path ([string]$manifest.action.default_popup) -Label 'action.default_popup'
Assert-LocalExtensionPath -Path ([string]$manifest.options_page) -Label 'options_page'

foreach ($contentScript in @($manifest.content_scripts)) {
    foreach ($jsPath in @($contentScript.js)) {
        Assert-LocalExtensionPath -Path ([string]$jsPath) -Label 'content_scripts.js'
    }
    $cssProperty = $contentScript.PSObject.Properties['css']
    if ($null -ne $cssProperty) {
        foreach ($cssPath in @($cssProperty.Value)) {
            Assert-LocalExtensionPath -Path ([string]$cssPath) -Label 'content_scripts.css'
        }
    }
}

$csp = [string]$manifest.content_security_policy.extension_pages
if ($csp -match '(?i)https?://') {
    Fail 'Extension CSP contains a remote URL. Executable extension resources must remain local.'
}

$seenRuleIds = [System.Collections.Generic.HashSet[int]]::new()
$validDnrResourceTypes = [System.Collections.Generic.HashSet[string]]::new(
    [string[]]@(
        'main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font',
        'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket',
        'webtransport', 'webbundle', 'other'
    ),
    [System.StringComparer]::Ordinal
)
foreach ($resource in @($manifest.declarative_net_request.rule_resources)) {
    $resourcePath = [string]$resource.path
    Assert-LocalExtensionPath -Path $resourcePath -Label 'declarative_net_request.rule_resources.path'

    $fullRulePath = Join-Path $CanonicalRoot $resourcePath
    try {
        $rules = @(Get-Content -LiteralPath $fullRulePath -Raw | ConvertFrom-Json)
    } catch {
        Fail "DNR ruleset is invalid JSON: $resourcePath`n$($_.Exception.Message)"
    }

    foreach ($rule in $rules) {
        $ruleId = [int]$rule.id
        if (-not $seenRuleIds.Add($ruleId)) {
            Fail "Duplicate declarativeNetRequest rule id detected: $ruleId"
        }

        $resourceTypesProperty = $rule.condition.PSObject.Properties['resourceTypes']
        if ($null -ne $resourceTypesProperty) {
            foreach ($resourceType in @($resourceTypesProperty.Value)) {
                $resourceTypeText = [string]$resourceType
                if (-not $validDnrResourceTypes.Contains($resourceTypeText)) {
                    Fail (
                        "Unsupported Chrome declarativeNetRequest ResourceType '$resourceTypeText'." +
                        "`nRuleset: $resourcePath" +
                        "`nRule id: $ruleId" +
                        "`nAllowed values: " + (($validDnrResourceTypes | Sort-Object) -join ', ')
                    )
                }
            }
        }
    }
}

$node = Get-Command node.exe -ErrorAction SilentlyContinue
if ($node) {
    foreach ($jsFile in $jsFiles) {
        & $node.Source --check $jsFile.FullName
        if ($LASTEXITCODE -ne 0) {
            Fail "JavaScript parser failure: $($jsFile.FullName)"
        }
    }
    Write-Host '[PASS] JavaScript parser validation passed.' -ForegroundColor Green
} else {
    Write-Host '[WARN] node.exe not found; JavaScript parser validation skipped.' -ForegroundColor Yellow
}

Write-Host '[PASS] Manifest V3 validation passed.' -ForegroundColor Green
Write-Host '[PASS] Runtime remote-code scan passed.' -ForegroundColor Green
Write-Host '[PASS] DNR ruleset validation passed.' -ForegroundColor Green

# R6 release contracts: no customer-facing developer endpoint override, no
# hardcoded administrator credential, and the built-in service endpoint must
# live only in the background licensing client.
$runtimeTextFiles = @($jsFiles + $htmlFiles)
Assert-TextPatternAbsent `
    -Files $runtimeTextFiles `
    -Pattern '(?i)Developer Configuration|QS_SET_LICENSE_ENDPOINT|endpoint override|Use built-in endpoint' `
    -FailureLabel 'Customer-facing developer endpoint configuration was found in R6.'

Assert-TextPatternAbsent `
    -Files $runtimeTextFiles `
    -Pattern 'QS-ADMIN-[A-Z0-9-]{20,100}|BEGIN (RSA )?PRIVATE KEY|PAYHIP_PRODUCT_SECRET|RECEIPT_PRIVATE_KEY_B64' `
    -FailureLabel 'Private credential or signing material was found in the Chrome runtime.'

$endpointHits = @(
    Get-ChildItem -LiteralPath $srcRoot -Recurse -File |
        Select-String -Pattern 'script\.google\.com/macros/s/' -ErrorAction SilentlyContinue
)
if ($endpointHits.Count -ne 1 -or $endpointHits[0].Path -notlike '*\src\background\licensing.js') {
    Fail 'The built-in Apps Script route must appear exactly once and only in src\background\licensing.js.'
}

$packageBat = @(Get-ChildItem -LiteralPath $CanonicalRoot -File -Filter '*.bat')
$packagePs1 = @(Get-ChildItem -LiteralPath (Join-Path $CanonicalRoot 'scripts') -File -Filter '*.ps1')
if ($packageBat.Count -ne 1 -or $packagePs1.Count -ne 1) {
    Fail 'R6 package contract requires exactly 1 root BAT and exactly 1 publisher PS1.'
}

# R6 functional blocker regression contracts. These are deliberately source-level
# gates so a later package cannot silently ship the old detector/counter failures.
$bootstrapCssPath = Join-Path $CanonicalRoot 'src\content\bootstrap.css'
$contentJsPath = Join-Path $CanonicalRoot 'src\content\content.js'
$pageGuardPath = Join-Path $CanonicalRoot 'src\content\page-guard.js'
$popupJsPath = Join-Path $CanonicalRoot 'src\ui\popup.js'
$adsRulesPath = Join-Path $CanonicalRoot 'src\rules\ads-rules.json'

$bootstrapCss = Get-Content -LiteralPath $bootstrapCssPath -Raw
$contentJs = Get-Content -LiteralPath $contentJsPath -Raw
$pageGuardJs = Get-Content -LiteralPath $pageGuardPath -Raw
$popupJs = Get-Content -LiteralPath $popupJsPath -Raw
$adsRulesText = Get-Content -LiteralPath $adsRulesPath -Raw

if ($bootstrapCss -notmatch '\.ad-widget') { Fail 'R6 detector contract missing: bootstrap.css must synchronously hide .ad-widget.' }
if ($contentJs -notmatch 'semantic-ad-overlay' -or $contentJs -notmatch 'data-qs-bypass') { Fail 'R6 cosmetic/interstitial regression contract is missing.' }
if ($pageGuardJs -notmatch 'canyoublockit\.com' -or $pageGuardJs -notmatch 'Notification\.requestPermission') { Fail 'R6 popup/push protection regression contract is missing.' }
if ($popupJs -notmatch 'resolveTargetTab' -or $popupJs -notmatch 'lastAccessed' -or $popupJs -notmatch 'lock-tile') { Fail 'R6 popup web-tab fallback or quick-lock controls are missing.' }
if ($adsRulesText -notmatch 'canyoublockit\.com' -or $adsRulesText -notmatch '"domainType"\s*:\s*"thirdParty"') { Fail 'R6 ad-path or CanYouBlockIt DNR coverage is missing.' }

Write-Host '[PASS] R6 functional blocker regression contracts passed.' -ForegroundColor Green
Write-Host '[PASS] R6 customer-configuration and secret-safety contracts passed.' -ForegroundColor Green

Write-Step 'Create Chrome Load Unpacked folder'
$loadUnpackedPath = New-LoadUnpackedFolder -ProjectRoot $CanonicalRoot

Write-Step 'Git source repository'

$gitFolder = Join-Path $CanonicalRoot '.git'
if (-not (Test-Path -LiteralPath $gitFolder -PathType Container)) {
    Invoke-GitChecked -Arguments @('init', '-b', 'main') -FailureMessage 'Could not initialize the source repository.'
    Invoke-GitChecked -Arguments @('remote', 'add', 'origin', $SourceRepo) -FailureMessage 'Could not configure the source repository origin.'
} else {
    $origin = (& $script:GitExe remote get-url origin 2>$null | Out-String).Trim()
    if (-not $origin) {
        Invoke-GitChecked -Arguments @('remote', 'add', 'origin', $SourceRepo) -FailureMessage 'Could not configure the source repository origin.'
    } elseif ($origin.TrimEnd('/') -ne $SourceRepo.TrimEnd('/')) {
        Invoke-GitChecked -Arguments @('remote', 'set-url', 'origin', $SourceRepo) -FailureMessage 'Could not update the source repository origin.'
    }

    $currentBranch = (& $script:GitExe branch --show-current 2>$null | Out-String).Trim()
    if ($currentBranch -ne 'main') {
        $mainExists = (& $script:GitExe branch --list main 2>$null | Out-String).Trim()
        if ($mainExists) {
            Invoke-GitChecked -Arguments @('switch', 'main') -FailureMessage 'Could not switch the source repository to main.'
        } else {
            Invoke-GitChecked -Arguments @('switch', '-c', 'main') -FailureMessage 'Could not create the source repository main branch.'
        }
    }
}

Invoke-GitChecked -Arguments @('add', '-A') -FailureMessage 'git add failed for the source repository.'
$changes = (& $script:GitExe status --porcelain | Out-String).Trim()
if ($changes) {
    Invoke-GitChecked `
        -Arguments @('commit', '-m', "QuietShield Chrome $Version $Revision functional blocker and GUI upgrade") `
        -FailureMessage 'Source repository commit failed.'
} else {
    Write-Host '[INFO] Source repository has no uncommitted changes.' -ForegroundColor DarkGray
}

Invoke-GitChecked `
    -Arguments @('push', '-u', 'origin', 'main') `
    -FailureMessage 'Source repository push failed. Verify GitHub authentication and repository write access.'

Write-Step 'Build release package'

$outDir = Join-Path $CanonicalRoot 'release-out'
if (Test-Path -LiteralPath $outDir) {
    Remove-Item -LiteralPath $outDir -Recurse -Force
}
New-Item -ItemType Directory -Path $outDir | Out-Null

$stage = Join-Path $outDir 'stage'
New-Item -ItemType Directory -Path $stage | Out-Null

$excludeTop = @('.git', 'release-out', '.release-work', 'LOAD-UNPACKED')
Get-ChildItem -LiteralPath $CanonicalRoot -Force |
    Where-Object { $excludeTop -notcontains $_.Name } |
    ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $stage -Recurse -Force
    }

$zipPath = Join-Path $outDir $PackageName
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zipPath -CompressionLevel Optimal
Remove-Item -LiteralPath $stage -Recurse -Force

$hash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()

$latest = [ordered]@{
    product = 'QuietShield Chrome'
    version = $Version
    revision = $Revision
    package = $PackageName
    sha256 = $hash
    sourceRepo = 'https://github.com/ajleveriza1108/QuietShield-Chrome'
    releaseRepo = 'https://github.com/ajleveriza1108/QuietShield-Chrome-Release'
    publishedAtUtc = [DateTime]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 4

Set-Content -LiteralPath (Join-Path $outDir 'latest.json') -Value $latest -Encoding utf8NoBOM
Set-Content -LiteralPath (Join-Path $outDir 'SHA256SUMS.txt') -Value "$hash  $PackageName" -Encoding ascii

Write-Host "[PASS] Release package built: $zipPath" -ForegroundColor Green
Write-Host "[PASS] Release SHA-256: $hash" -ForegroundColor Green

Write-Step 'Release repository'

$releaseWork = Join-Path $CanonicalRoot '.release-work'
if (Test-Path -LiteralPath $releaseWork) {
    Remove-Item -LiteralPath $releaseWork -Recurse -Force
}

Invoke-GitChecked -Arguments @('clone', $ReleaseRepo, $releaseWork) -FailureMessage 'Release repository clone failed.'

Push-Location $releaseWork
try {
    $releaseBranch = (& $script:GitExe branch --show-current 2>$null | Out-String).Trim()
    if ($releaseBranch -ne 'main') {
        $releaseMainExists = (& $script:GitExe branch --list main 2>$null | Out-String).Trim()
        if ($releaseMainExists) {
            Invoke-GitChecked -Arguments @('switch', 'main') -FailureMessage 'Could not switch release repository to main.'
        } else {
            Invoke-GitChecked -Arguments @('switch', '-c', 'main') -FailureMessage 'Could not create release repository main branch.'
        }
    }
} finally {
    Pop-Location
}

Copy-Item -LiteralPath $zipPath -Destination (Join-Path $releaseWork $PackageName) -Force
Copy-Item -LiteralPath (Join-Path $outDir 'latest.json') -Destination (Join-Path $releaseWork 'latest.json') -Force
Copy-Item -LiteralPath (Join-Path $outDir 'SHA256SUMS.txt') -Destination (Join-Path $releaseWork 'SHA256SUMS.txt') -Force

@"
# QuietShield Chrome Releases

Latest package: `$PackageName`

Verify the package against `SHA256SUMS.txt` before loading or distributing it.

Source: https://github.com/ajleveriza1108/QuietShield-Chrome
"@ | Set-Content -LiteralPath (Join-Path $releaseWork 'README.md') -Encoding utf8NoBOM

Push-Location $releaseWork
try {
    Invoke-GitChecked -Arguments @('add', '-A') -FailureMessage 'git add failed for the release repository.'
    $releaseChanges = (& $script:GitExe status --porcelain | Out-String).Trim()
    if ($releaseChanges) {
        Invoke-GitChecked `
            -Arguments @('commit', '-m', "Publish QuietShield Chrome $Version $Revision") `
            -FailureMessage 'Release repository commit failed.'
    } else {
        Write-Host '[INFO] Release repository has no uncommitted changes.' -ForegroundColor DarkGray
    }

    Invoke-GitChecked `
        -Arguments @('push', '-u', 'origin', 'main') `
        -FailureMessage 'Release repository push failed. Verify GitHub authentication and repository write access.'
} finally {
    Pop-Location
}

Remove-Item -LiteralPath $releaseWork -Recurse -Force

Write-Step 'Complete'
Write-Host "[PASS] Source published: $SourceRepo" -ForegroundColor Green
Write-Host "[PASS] Release published: $ReleaseRepo" -ForegroundColor Green
Write-Host "[PASS] Package: $zipPath" -ForegroundColor Green
Write-Host "[PASS] Chrome Load Unpacked folder: $loadUnpackedPath" -ForegroundColor Green
Write-Host '[INFO] In Chrome: chrome://extensions -> Developer mode -> Load unpacked -> select the LOAD-UNPACKED folder above.' -ForegroundColor Cyan
Write-Host "[PASS] SHA-256: $hash" -ForegroundColor Green


}
catch {
    $script:PublisherExitCode = 1
    Write-Host ''
    Write-Host '============================================================' -ForegroundColor Red
    Write-Host '[FAIL] QUIETSHIELD CHROME PUBLISHER STOPPED' -ForegroundColor Red
    Write-Host '============================================================' -ForegroundColor Red
    Write-Host ("[ERROR] " + $_.Exception.Message) -ForegroundColor Red

    if ($_.InvocationInfo -and $_.InvocationInfo.PositionMessage) {
        Write-Host $_.InvocationInfo.PositionMessage -ForegroundColor DarkRed
    }
    if ($_.ScriptStackTrace) {
        Write-Host '[STACK]' -ForegroundColor DarkRed
        Write-Host $_.ScriptStackTrace -ForegroundColor DarkRed
    }
}
finally {
    if ($script:TranscriptStarted) {
        try { Stop-Transcript | Out-Null } catch { }
    }

    try {
        if (Test-Path -LiteralPath $LogPath -PathType Leaf) {
            $latestPath = Join-Path (Split-Path -Parent $LogPath) 'LATEST.log'
            Copy-Item -LiteralPath $LogPath -Destination $latestPath -Force
        }
    } catch { }

    Write-Host ''
    Write-Host '============================================================'
    if ($script:PublisherExitCode -eq 0) {
        Write-Host '[PASS] Publisher finished successfully.' -ForegroundColor Green
    } else {
        Write-Host '[FAIL] Publisher finished with an error.' -ForegroundColor Red
    }
    Write-Host "[LOG] $LogPath" -ForegroundColor Cyan
    Write-Host '============================================================'
}

exit $script:PublisherExitCode
