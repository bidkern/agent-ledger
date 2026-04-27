param([switch]$Silent)

& (Join-Path $PSScriptRoot "launch-agent-ledger.ps1") @PSBoundParameters
