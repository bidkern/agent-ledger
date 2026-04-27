param([switch]$Silent)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$desktopPath = [Environment]::GetFolderPath("Desktop")
$launcherDir = Join-Path $projectRoot ".launcher"
$shortcutIconDir = Join-Path $launcherDir "shortcut-icons"
$launchScript = Join-Path $PSScriptRoot "launch-agent-ledger.vbs"
$stopScript = Join-Path $PSScriptRoot "stop-agent-ledger.vbs"
$iconPath = Join-Path $projectRoot "src\app\favicon.ico"
$launchIconPath = Join-Path $shortcutIconDir "agent-ledger-launch.ico"
$stopIconPath = Join-Path $shortcutIconDir "agent-ledger-stop.ico"
$wscriptPath = Join-Path $env:SystemRoot "System32\wscript.exe"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Show-InstallerMessage {
  param(
    [string]$Message,
    [System.Windows.Forms.MessageBoxIcon]$Icon = [System.Windows.Forms.MessageBoxIcon]::Information
  )

  if (-not $Silent) {
    [System.Windows.Forms.MessageBox]::Show(
      $Message,
      "Agent Ledger Shortcuts",
      [System.Windows.Forms.MessageBoxButtons]::OK,
      $Icon
    ) | Out-Null
  }
}

function Write-UInt16 {
  param(
    [System.IO.BinaryWriter]$Writer,
    [int]$Value
  )

  $Writer.Write([uint16]$Value)
}

function Write-UInt32 {
  param(
    [System.IO.BinaryWriter]$Writer,
    [int]$Value
  )

  $Writer.Write([uint32]$Value)
}

function New-RoundedRectanglePath {
  param(
    [int]$X,
    [int]$Y,
    [int]$Width,
    [int]$Height,
    [int]$Radius
  )

  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $diameter = $Radius * 2

  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()

  return $path
}

function New-AgentLedgerIcon {
  param(
    [string]$Path,
    [string]$BackgroundColor,
    [string]$AccentColor,
    [string]$Label,
    [string]$Caption
  )

  $size = 256
  $bitmap = [System.Drawing.Bitmap]::new($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $pngStream = [System.IO.MemoryStream]::new()

  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
    $graphics.Clear([System.Drawing.Color]::Transparent)

    $background = [System.Drawing.ColorTranslator]::FromHtml($BackgroundColor)
    $accent = [System.Drawing.ColorTranslator]::FromHtml($AccentColor)
    $white = [System.Drawing.Color]::FromArgb(246, 251, 255)
    $mutedWhite = [System.Drawing.Color]::FromArgb(204, 232, 246, 255)
    $shadowColor = [System.Drawing.Color]::FromArgb(72, 3, 12, 22)
    $ringColor = [System.Drawing.Color]::FromArgb(118, $accent.R, $accent.G, $accent.B)

    $shadowBrush = [System.Drawing.SolidBrush]::new($shadowColor)
    $backgroundBrush = [System.Drawing.SolidBrush]::new($background)
    $accentBrush = [System.Drawing.SolidBrush]::new($accent)
    $textBrush = [System.Drawing.SolidBrush]::new($white)
    $captionBrush = [System.Drawing.SolidBrush]::new($mutedWhite)
    $ringPen = [System.Drawing.Pen]::new($ringColor, 7)

    $shadowPath = New-RoundedRectanglePath -X 24 -Y 32 -Width 208 -Height 200 -Radius 58
    $bodyPath = New-RoundedRectanglePath -X 20 -Y 20 -Width 216 -Height 208 -Radius 58
    $accentPath = New-RoundedRectanglePath -X 50 -Y 50 -Width 156 -Height 26 -Radius 13

    $graphics.FillPath($shadowBrush, $shadowPath)
    $graphics.FillPath($backgroundBrush, $bodyPath)
    $graphics.DrawPath($ringPen, $bodyPath)
    $graphics.FillPath($accentBrush, $accentPath)

    $labelFontSize = if ($Label.Length -le 2) { 74 } elseif ($Label.Length -le 4) { 48 } else { 38 }
    $labelFont = [System.Drawing.Font]::new("Segoe UI", $labelFontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $captionFont = [System.Drawing.Font]::new("Segoe UI", 24, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $format = [System.Drawing.StringFormat]::new()
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    $graphics.DrawString($Label, $labelFont, $textBrush, [System.Drawing.RectangleF]::new(28, 78, 200, 76), $format)
    $graphics.DrawString($Caption, $captionFont, $captionBrush, [System.Drawing.RectangleF]::new(28, 154, 200, 42), $format)

    $bitmap.Save($pngStream, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytes = $pngStream.ToArray()

    $fileStream = [System.IO.File]::Open($Path, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
    $writer = [System.IO.BinaryWriter]::new($fileStream)

    try {
      Write-UInt16 -Writer $writer -Value 0
      Write-UInt16 -Writer $writer -Value 1
      Write-UInt16 -Writer $writer -Value 1
      $writer.Write([byte]0)
      $writer.Write([byte]0)
      $writer.Write([byte]0)
      $writer.Write([byte]0)
      Write-UInt16 -Writer $writer -Value 1
      Write-UInt16 -Writer $writer -Value 32
      Write-UInt32 -Writer $writer -Value $pngBytes.Length
      Write-UInt32 -Writer $writer -Value 22
      $writer.Write($pngBytes)
    } finally {
      $writer.Dispose()
      $fileStream.Dispose()
    }
  } finally {
    if ($format) { $format.Dispose() }
    if ($labelFont) { $labelFont.Dispose() }
    if ($captionFont) { $captionFont.Dispose() }
    if ($ringPen) { $ringPen.Dispose() }
    if ($shadowBrush) { $shadowBrush.Dispose() }
    if ($backgroundBrush) { $backgroundBrush.Dispose() }
    if ($accentBrush) { $accentBrush.Dispose() }
    if ($textBrush) { $textBrush.Dispose() }
    if ($captionBrush) { $captionBrush.Dispose() }
    if ($shadowPath) { $shadowPath.Dispose() }
    if ($bodyPath) { $bodyPath.Dispose() }
    if ($accentPath) { $accentPath.Dispose() }
    $pngStream.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

function Ensure-AgentLedgerShortcutIcons {
  if (-not (Test-Path $shortcutIconDir)) {
    New-Item -ItemType Directory -Path $shortcutIconDir -Force | Out-Null
  }

  New-AgentLedgerIcon `
    -Path $launchIconPath `
    -BackgroundColor "#08131d" `
    -AccentColor "#169bff" `
    -Label "AL" `
    -Caption "LAUNCH"

  New-AgentLedgerIcon `
    -Path $stopIconPath `
    -BackgroundColor "#351015" `
    -AccentColor "#ff5d4f" `
    -Label "STOP" `
    -Caption "QUIT"
}

function New-Shortcut {
  param(
    [string]$ShortcutPath,
    [string]$TargetPath,
    [string]$Arguments,
    [string]$Description,
    [string]$IconLocation
  )

  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($ShortcutPath)
  $shortcut.TargetPath = $TargetPath
  $shortcut.Arguments = $Arguments
  $shortcut.WorkingDirectory = $projectRoot
  $shortcut.Description = $Description

  if ($IconLocation -and (Test-Path $IconLocation)) {
    $shortcut.IconLocation = "$IconLocation,0"
  } elseif (Test-Path $iconPath) {
    $shortcut.IconLocation = "$iconPath,0"
  }

  $shortcut.Save()
}

Ensure-AgentLedgerShortcutIcons

New-Shortcut `
  -ShortcutPath (Join-Path $desktopPath "Agent Ledger.lnk") `
  -TargetPath $wscriptPath `
  -Arguments ('"' + $launchScript + '"') `
  -Description "Launch the Agent Ledger desktop mission control window" `
  -IconLocation $launchIconPath

New-Shortcut `
  -ShortcutPath (Join-Path $desktopPath "Stop Agent Ledger.lnk") `
  -TargetPath $wscriptPath `
  -Arguments ('"' + $stopScript + '"') `
  -Description "Stop the Agent Ledger local desktop session" `
  -IconLocation $stopIconPath

Show-InstallerMessage "Created Agent Ledger desktop shortcuts on your Desktop."
