param([switch]$Silent)

& (Join-Path $PSScriptRoot "stop-agent-ledger.ps1") @PSBoundParameters
