param(
  [switch]$Silent,
  [string]$StartPath = "/"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$launcherDir = Join-Path $projectRoot ".launcher"
$serverLog = Join-Path $launcherDir "agent-ledger-dev.log"
$runtimeFile = Join-Path $launcherDir "agent-ledger-runtime.json"
$windowTitle = "Agent Ledger Desktop Launcher"
$defaultPort = 3260
$maxPort = 3399

Add-Type -AssemblyName System.Windows.Forms

function Show-LauncherMessage {
  param(
    [string]$Message,
    [string]$Title = $windowTitle,
    [System.Windows.Forms.MessageBoxIcon]$Icon = [System.Windows.Forms.MessageBoxIcon]::Information
  )

  if (-not $Silent) {
    [System.Windows.Forms.MessageBox]::Show(
      $Message,
      $Title,
      [System.Windows.Forms.MessageBoxButtons]::OK,
      $Icon
    ) | Out-Null
  }
}

function Get-EnvFileValues {
  param([string]$Path)

  $values = @{}

  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = $line.Trim()

    if (-not $trimmed -or $trimmed.StartsWith("#")) {
      continue
    }

    $separatorIndex = $trimmed.IndexOf("=")

    if ($separatorIndex -lt 1) {
      continue
    }

    $key = $trimmed.Substring(0, $separatorIndex).Trim()
    $value = $trimmed.Substring($separatorIndex + 1).Trim()
    $values[$key] = $value
  }

  return $values
}

function Get-PreferredPort {
  param([string]$ProjectRoot)

  $envPath = Join-Path $ProjectRoot ".env.local"

  if (-not (Test-Path $envPath)) {
    return $defaultPort
  }

  $values = Get-EnvFileValues -Path $envPath
  $appUrl = $values["APP_URL"]

  if (-not $appUrl) {
    return $defaultPort
  }

  try {
    $uri = [System.Uri]$appUrl
    if ($uri.Port -gt 0) {
      return $uri.Port
    }
  } catch {
    return $defaultPort
  }

  return $defaultPort
}

function Test-PortAvailable {
  param([int]$Port)

  $listener = $null

  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    if ($listener) {
      $listener.Stop()
    }
  }
}

function Get-FreePort {
  param(
    [int]$PreferredPort,
    [int]$MaxPort
  )

  for ($port = $PreferredPort; $port -le $MaxPort; $port++) {
    if (Test-PortAvailable -Port $port) {
      return $port
    }
  }

  throw "No free port was found between $PreferredPort and $MaxPort."
}

function Test-AgentLedgerHealth {
  param([string]$AppUrl)

  $healthUrl = "$AppUrl/api/health"

  try {
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2

    if ($response.StatusCode -ne 200 -or -not $response.Content) {
      return $false
    }

    try {
      $payload = $response.Content | ConvertFrom-Json
    } catch {
      return $false
    }

    return $payload.status -eq "ok" -and -not [string]::IsNullOrWhiteSpace([string]$payload.checkedAt)
  } catch {
    return $false
  }
}

function Wait-ForAgentLedger {
  param(
    [string]$AppUrl,
    [int]$Attempts = 45,
    [int]$DelayMilliseconds = 1000
  )

  for ($index = 0; $index -lt $Attempts; $index++) {
    if (Test-AgentLedgerHealth -AppUrl $AppUrl) {
      return $true
    }

    Start-Sleep -Milliseconds $DelayMilliseconds
  }

  return $false
}

function Get-RunningAgentLedgerPort {
  $matching = @(Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -and
    $_.CommandLine.Contains($projectRoot) -and
    (
      $_.CommandLine.Contains("next dev") -or
      $_.CommandLine.Contains("next start") -or
      $_.CommandLine.Contains("next.cmd")
    )
  })

  foreach ($process in $matching) {
    if ($process.CommandLine -match "(?:--port|-p)\s+(\d+)") {
      return [int]$Matches[1]
    }
  }

  return $null
}

function Save-RuntimeInfo {
  param(
    [string]$AppUrl,
    [int]$Port
  )

  $runtime = @{
    appUrl = $AppUrl
    port = $Port
    log = $serverLog
    updatedAt = (Get-Date).ToString("o")
  }

  $runtime | ConvertTo-Json | Set-Content -LiteralPath $runtimeFile -Encoding UTF8
}

function Open-AgentLedgerWindow {
  param([string]$LaunchUrl)

  $browserCandidates = @(
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "C:\Program Files\Google\Chrome\Application\chrome.exe"
  )

  $browserPath = $browserCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

  if ($browserPath) {
    Start-Process -FilePath $browserPath -ArgumentList @("--new-window", "--app=$LaunchUrl") | Out-Null
    return
  }

  Start-Process $LaunchUrl | Out-Null
}

function Join-AgentLedgerUrl {
  param(
    [string]$BaseUrl,
    [string]$RequestedPath
  )

  if ([string]::IsNullOrWhiteSpace($RequestedPath) -or $RequestedPath -eq "/") {
    return $BaseUrl
  }

  if ($RequestedPath.StartsWith("http://") -or $RequestedPath.StartsWith("https://")) {
    return $RequestedPath
  }

  $baseUri = [System.Uri]($BaseUrl.TrimEnd("/") + "/")
  $relativePath = $RequestedPath.TrimStart("/")
  return [System.Uri]::new($baseUri, $relativePath).ToString()
}

if (-not (Test-Path $launcherDir)) {
  New-Item -ItemType Directory -Path $launcherDir -Force | Out-Null
}

if (-not (Test-Path (Join-Path $projectRoot ".env.local"))) {
  Show-LauncherMessage "Agent Ledger is missing .env.local. Open the project folder and create it before launching." $windowTitle ([System.Windows.Forms.MessageBoxIcon]::Error)
  exit 1
}

if (-not (Test-Path (Join-Path $projectRoot "node_modules"))) {
  Show-LauncherMessage "Agent Ledger dependencies are missing. Run npm install in the project folder first." $windowTitle ([System.Windows.Forms.MessageBoxIcon]::Error)
  exit 1
}

$runningPort = Get-RunningAgentLedgerPort

if ($runningPort) {
  $existingUrl = "http://localhost:$runningPort"
  $launchUrl = Join-AgentLedgerUrl -BaseUrl $existingUrl -RequestedPath $StartPath

  if (Test-AgentLedgerHealth -AppUrl $existingUrl) {
    Save-RuntimeInfo -AppUrl $existingUrl -Port $runningPort
    Open-AgentLedgerWindow -LaunchUrl $launchUrl
    exit 0
  }
}

$preferredPort = Get-PreferredPort -ProjectRoot $projectRoot
$appPort = Get-FreePort -PreferredPort $preferredPort -MaxPort $maxPort
$appUrl = "http://localhost:$appPort"
$launchUrl = Join-AgentLedgerUrl -BaseUrl $appUrl -RequestedPath $StartPath
$allowedOrigins = "localhost:$appPort,127.0.0.1:$appPort"
$nextBinary = Join-Path $projectRoot "node_modules\.bin\next.cmd"
$command = "cd /d `"$projectRoot`" && set APP_URL=$appUrl && set SERVER_ACTIONS_ALLOWED_ORIGINS=$allowedOrigins && `"$nextBinary`" dev --port $appPort >> `"$serverLog`" 2>&1"

Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $command -WindowStyle Hidden | Out-Null

if (-not (Wait-ForAgentLedger -AppUrl $appUrl)) {
  Show-LauncherMessage "Agent Ledger did not finish starting. Check the launcher log at:`n$serverLog" $windowTitle ([System.Windows.Forms.MessageBoxIcon]::Error)
  exit 1
}

Save-RuntimeInfo -AppUrl $appUrl -Port $appPort
Open-AgentLedgerWindow -LaunchUrl $launchUrl
