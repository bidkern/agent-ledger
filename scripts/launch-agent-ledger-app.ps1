param([switch]$Silent)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$windowTitle = "Agent Ledger Desktop App"

Add-Type -AssemblyName System.Windows.Forms

function Show-LauncherMessage {
  param(
    [string]$Message,
    [System.Windows.Forms.MessageBoxIcon]$Icon = [System.Windows.Forms.MessageBoxIcon]::Information
  )

  if (-not $Silent) {
    [System.Windows.Forms.MessageBox]::Show(
      $Message,
      $windowTitle,
      [System.Windows.Forms.MessageBoxButtons]::OK,
      $Icon
    ) | Out-Null
  }
}

if (-not (Test-Path (Join-Path $projectRoot "node_modules\electron"))) {
  Show-LauncherMessage "Agent Ledger desktop runtime is missing. Run npm install in the project folder first." ([System.Windows.Forms.MessageBoxIcon]::Error)
  exit 1
}

if (-not (Test-Path (Join-Path $projectRoot ".env.local"))) {
  Show-LauncherMessage "Agent Ledger is missing .env.local. Create it before launching the desktop app." ([System.Windows.Forms.MessageBoxIcon]::Error)
  exit 1
}

$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
$npm = if ($npmCommand) { $npmCommand.Source } else { $null }

if (-not $npm) {
  $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
  $npm = if ($npmCommand) { $npmCommand.Source } else { $null }
}

if (-not $npm) {
  Show-LauncherMessage "npm was not found on this machine." ([System.Windows.Forms.MessageBoxIcon]::Error)
  exit 1
}

Start-Process -FilePath $npm -ArgumentList @("run", "desktop:app") -WorkingDirectory $projectRoot -WindowStyle Hidden | Out-Null
