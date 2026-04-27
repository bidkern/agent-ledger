param(
  [switch]$Silent,
  [switch]$Reset
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

Push-Location $projectRoot

try {
  $seedArgs = @(".\scripts\prepare-agent-ledger-demo.mjs")

  if ($Reset) {
    $seedArgs += "--reset"
  }

  & node @seedArgs

  if ($LASTEXITCODE -ne 0) {
    throw "Demo preparation failed."
  }

  $launchArgs = @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    ".\scripts\launch-agent-ledger.ps1",
    "-StartPath",
    "/login?demo=1"
  )

  if ($Silent) {
    $launchArgs += "-Silent"
  }

  & powershell @launchArgs

  if ($LASTEXITCODE -ne 0) {
    throw "Desktop launch failed."
  }
}
finally {
  Pop-Location
}
