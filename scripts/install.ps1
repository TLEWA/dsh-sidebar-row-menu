<#
.SYNOPSIS
  Install (or uninstall) dsh-sidebar-row-menu into one or more DSH profiles.

.DESCRIPTION
  The package name and bundle patch path are read from this repository's
  package.json, so the script stays valid if the package is renamed.

  Why not `dsh plugin --profile desktop add link:<absolute path>`:
  pnpm 10 on Windows resolves link:/file: relative to the profile directory,
  and a cross-drive path degrades into a broken junction. This script avoids
  pnpm entirely:

    1. Create a publish junction <DSH_HOME>\plugins\<package> -> this repo
       (the source stays live; no rebuild step).
    2. Write "link:../../plugins/<package>" into the profile dependencies
       (same drive, forward slashes, safe if pnpm runs later).
    3. Create <profile>\node_modules\<package> -> publish junction.
    4. Only after the link resolves to a manifest with dsh.bundle.patch, append
       the package to dsh.profile.bundles.

  Restart the desktop app after installing the host half (lib/index.js);
  a hard refresh is enough for client-only changes.

.PARAMETER Profile
  desktop | web | both, or the absolute path of a profile directory.
  Default: desktop.

.PARAMETER Uninstall
  Remove the bundle entry, the dependency and both junctions. Never deletes
  the repository or any real directory.

.EXAMPLE
  pwsh -NoProfile -File .\scripts\install.ps1
  pwsh -NoProfile -File .\scripts\install.ps1 -Profile both
  pwsh -NoProfile -File .\scripts\install.ps1 -Uninstall
#>
[CmdletBinding()]
param(
  [string]$Profile = 'desktop',
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------- package identity

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceManifestPath = Join-Path $repoRoot 'package.json'
if (-not (Test-Path -LiteralPath $sourceManifestPath)) { throw "Missing $sourceManifestPath" }

$sourceManifest = Get-Content -LiteralPath $sourceManifestPath -Raw | ConvertFrom-Json
$packageName = $sourceManifest.name
if ([string]::IsNullOrWhiteSpace($packageName)) { throw "$sourceManifestPath has no name field" }

$patchRel = $sourceManifest.dsh.bundle.patch
if ([string]::IsNullOrWhiteSpace($patchRel)) {
  throw "$packageName does not declare dsh.bundle.patch — the profile would not load it"
}
if (-not (Test-Path -LiteralPath (Join-Path $repoRoot $patchRel))) {
  throw "dsh.bundle.patch points at a missing file: $patchRel"
}

Write-Host "Plugin : $packageName@$($sourceManifest.version)" -ForegroundColor Cyan
Write-Host "Source : $repoRoot"

# ---------------------------------------------------------------- target profiles

$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
$profilesDir = Join-Path $dshHome 'profiles'

$targetSpecs = switch ($Profile) {
  'both' { @('desktop', 'web') }
  default { @($Profile) }
}

function Resolve-ProfileDir([string]$spec) {
  if (Test-Path -LiteralPath $spec -PathType Container) { return (Resolve-Path -LiteralPath $spec).Path }
  return (Join-Path $profilesDir $spec)
}

# ---------------------------------------------------------------- write probe

function Test-Writable([string]$dir, [string]$label) {
  try {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $probe = Join-Path $dir '.__dsh_plugin_write_probe.tmp'
    Set-Content -LiteralPath $probe -Value 'probe' -ErrorAction Stop
    Remove-Item -LiteralPath $probe -Force -ErrorAction SilentlyContinue
  } catch {
    throw "$label is not writable: $dir`n$($_.Exception.Message)`nRun this script from a normal terminal, not from inside DSH."
  }
}

# ---------------------------------------------------------------- relative link (same drive)

function Get-RelativeTo([string]$Base, [string]$Target) {
  $b = [IO.Path]::GetFullPath($Base).TrimEnd('\') + '\'
  $t = [IO.Path]::GetFullPath($Target)
  if ([IO.Path]::GetPathRoot($b) -ne [IO.Path]::GetPathRoot($t)) {
    throw "Profile and publish point are on different drives ($b vs $t): pnpm link: would be broken on Windows."
  }
  $bu = [Uri]('file:///' + $b.Replace('\', '/'))
  $tu = [Uri]('file:///' + $t.Replace('\', '/'))
  return (([Uri]::UnescapeDataString($bu.MakeRelativeUri($tu).ToString())) -replace '/', '\')
}

# ------------------------------------------------ remove only links, never targets

function Remove-LinkOnly([string]$path) {
  if ([string]::IsNullOrWhiteSpace($path)) { return }
  $item = $null
  try { $item = Get-Item -LiteralPath $path -Force -ErrorAction Stop } catch { return }
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    & cmd.exe /c rmdir "$path" 2>$null | Out-Null
  } else {
    throw "A real directory exists at $path; move or delete it manually first."
  }
}

function Set-Junction([string]$path, [string]$target) {
  Remove-LinkOnly $path
  $parent = Split-Path -Parent $path
  if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
  New-Item -ItemType Junction -Path $path -Target $target | Out-Null
}

# ================================================================ main

$publishDir = Join-Path (Join-Path $dshHome 'plugins') $packageName
$anythingInstalled = $false

foreach ($spec in $targetSpecs) {
  $profileDir = Resolve-ProfileDir $spec
  Write-Host ''
  Write-Host "=== profile: $spec" -ForegroundColor Cyan
  Write-Host "    $profileDir"

  if (-not (Test-Path -LiteralPath $profileDir)) {
    throw "Profile directory not found: $profileDir`nBoot that profile once, then rerun."
  }
  $pkgPath = Join-Path $profileDir 'package.json'
  if (-not (Test-Path -LiteralPath $pkgPath)) {
    throw "Manifest not found: $pkgPath`nBoot that profile once, then rerun."
  }
  Test-Writable $profileDir 'profile directory'
  Test-Writable (Join-Path $profileDir 'node_modules') 'profile node_modules'
  Test-Writable (Join-Path $dshHome 'plugins') 'publish point root'

  $backup = "$pkgPath.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  Copy-Item -LiteralPath $pkgPath -Destination $backup
  Write-Host "    backup -> $backup"

  $pkg = Get-Content -LiteralPath $pkgPath -Raw | ConvertFrom-Json
  $deps = [ordered]@{}
  if ($pkg.dependencies) {
    foreach ($property in $pkg.dependencies.PSObject.Properties) { $deps[$property.Name] = $property.Value }
  }
  $bundles = @()
  if ($pkg.dsh -and $pkg.dsh.profile -and $pkg.dsh.profile.bundles) { $bundles = @($pkg.dsh.profile.bundles) }

  $linkPath = Join-Path (Join-Path $profileDir 'node_modules') $packageName
  $enabled = $false

  if ($Uninstall) {
    Remove-LinkOnly $linkPath
    Remove-LinkOnly $publishDir
    if ($deps.Contains($packageName)) { $deps.Remove($packageName) }
    $bundles = @($bundles | Where-Object { $_ -ne $packageName })
    Write-Host "    removed: $packageName (dependency / bundles / junctions)"
  } else {
    # 1) publish point: junction -> this repo (live source)
    Set-Junction $publishDir $repoRoot

    # 2) dependency: same-drive relative link
    $linkSpec = 'link:' + ((Get-RelativeTo $profileDir $publishDir) -replace '\\', '/')
    $deps[$packageName] = $linkSpec

    # 3) profile node_modules junction
    Set-Junction $linkPath $publishDir

    # 4) verify the link really resolves to our manifest before selecting the bundle
    $manifest = $null
    $manifestPath = Join-Path $linkPath 'package.json'
    if (Test-Path -LiteralPath $manifestPath) {
      try { $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json } catch { $manifest = $null }
    }
    $ok = ($manifest -ne $null) -and ($manifest.name -eq $packageName) -and ($manifest.dsh.bundle.patch)
    if ($ok) {
      if ($bundles -notcontains $packageName) { $bundles += $packageName }
      $enabled = $true
      Write-Host "    OK  $packageName -> $linkSpec" -ForegroundColor Green
    } else {
      Write-Warning "    $packageName did not resolve through the link — bundle entry NOT written."
      Write-Warning "    Expected: $manifestPath (name=$packageName + dsh.bundle.patch)"
    }
  }

  $pkg | Add-Member -NotePropertyName dependencies -NotePropertyValue ([pscustomobject]$deps) -Force
  if ($null -eq $pkg.dsh) { $pkg | Add-Member -NotePropertyName dsh -NotePropertyValue ([pscustomobject]@{ profile = [pscustomobject]@{} }) }
  if ($null -eq $pkg.dsh.profile) { $pkg.dsh | Add-Member -NotePropertyName profile -NotePropertyValue ([pscustomobject]@{}) }
  $pkg.dsh.profile | Add-Member -NotePropertyName bundles -NotePropertyValue $bundles -Force
  [IO.File]::WriteAllText($pkgPath, (($pkg | ConvertTo-Json -Depth 20) + "`n"), (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "    wrote $pkgPath"
  Write-Host "    bundles = $($bundles -join ', ')"

  if ($enabled) {
    $anythingInstalled = $true
    Write-Host "    enabled: $packageName@$($manifest.version)" -ForegroundColor Green
  }
}

Write-Host ''
if ($Uninstall) {
  Write-Host 'Uninstalled. Restart the desktop app / dsh web to apply.' -ForegroundColor Yellow
} elseif ($anythingInstalled) {
  Write-Host 'Next:' -ForegroundColor Yellow
  Write-Host '  1) Restart the desktop app for the host half (lib/index.js).'
  Write-Host '  2) Hard refresh the page (Ctrl+Shift+R) for the client half (lib/client.js).'
} else {
  Write-Host 'Nothing was enabled; review the warnings above.' -ForegroundColor Yellow
}
