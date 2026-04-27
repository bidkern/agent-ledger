param([switch]$Silent)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$launcherDir = Join-Path $projectRoot ".launcher"
$runtimeFile = Join-Path $launcherDir "agent-ledger-runtime.json"
$windowTitle = "Agent Ledger Desktop Launcher"

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

function Get-ProcessTree {
  param([int[]]$RootIds)

  $all = @(Get-CimInstance Win32_Process)
  $queue = [System.Collections.Generic.Queue[int]]::new()
  $visited = [System.Collections.Generic.HashSet[int]]::new()

  foreach ($id in $RootIds) {
    $queue.Enqueue($id)
  }

  while ($queue.Count -gt 0) {
    $current = $queue.Dequeue()

    if (-not $visited.Add($current)) {
      continue
    }

    foreach ($child in $all | Where-Object { $_.ParentProcessId -eq $current }) {
      $queue.Enqueue([int]$child.ProcessId)
    }
  }

  return $visited
}

$matching = @(Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -and
  $_.CommandLine.Contains($projectRoot) -and
  (
    $_.CommandLine.Contains("next dev") -or
    $_.CommandLine.Contains("next start") -or
    $_.CommandLine.Contains("next.cmd") -or
    $_.CommandLine.Contains("next\dist\bin\next") -or
    $_.CommandLine.Contains("next/dist/bin/next") -or
    $_.CommandLine.Contains("desktop\main.cjs") -or
    $_.CommandLine.Contains("desktop/main.cjs") -or
    $_.CommandLine.Contains("electron")
  )
})

if ($matching.Count -eq 0) {
  if (Test-Path $runtimeFile) {
    Remove-Item -LiteralPath $runtimeFile -Force -ErrorAction SilentlyContinue
  }

  Show-LauncherMessage "Agent Ledger does not look like it is running right now."
  exit 0
}

$processIds = Get-ProcessTree -RootIds ($matching | ForEach-Object { [int]$_.ProcessId })

foreach ($processId in $processIds) {
  try {
    Stop-Process -Id $processId -Force -ErrorAction Stop
  } catch {
    # Ignore already-exited processes while shutting the tree down.
  }
}

if (Test-Path $runtimeFile) {
  Remove-Item -LiteralPath $runtimeFile -Force -ErrorAction SilentlyContinue
}

Show-LauncherMessage "Agent Ledger has been stopped."
