param(
    [string]$Destination = (Join-Path $PSScriptRoot 'payload')
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $Destination | Out-Null

$release = Invoke-RestMethod -Uri 'https://api.github.com/repos/tectonic-typesetting/tectonic/releases/latest' -Headers @{ 'User-Agent' = 'ENG-LATEX-desktop-build' }
$asset = $release.assets | Where-Object {
    $_.name -match '(?i)(x86_64|x64).*(windows|pc-windows)|(windows|pc-windows).*(x86_64|x64)' -and
    $_.name -match '(?i)\.(zip|exe)$'
} | Select-Object -First 1

if (-not $asset) {
    throw "Não foi encontrado um artefato Tectonic Windows x64 na release $($release.tag_name)."
}

$download = Join-Path $env:TEMP $asset.name
Write-Host "Baixando Tectonic $($release.tag_name): $($asset.name)"
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $download -Headers @{ 'User-Agent' = 'ENG-LATEX-desktop-build' }

if ($asset.name -match '(?i)\.exe$') {
    Copy-Item $download (Join-Path $Destination 'tectonic.exe') -Force
} else {
    $unpack = Join-Path $env:TEMP ('tectonic-' + [Guid]::NewGuid().ToString())
    Expand-Archive -Path $download -DestinationPath $unpack -Force
    $tectonic = Get-ChildItem $unpack -Recurse -Filter 'tectonic.exe' | Select-Object -First 1
    if (-not $tectonic) { throw "O arquivo $($asset.name) não contém tectonic.exe." }
    Copy-Item $tectonic.FullName (Join-Path $Destination 'tectonic.exe') -Force
    Remove-Item $unpack -Recurse -Force
}

if (-not (Test-Path (Join-Path $Destination 'tectonic.exe'))) {
    throw 'tectonic.exe não foi preparado.'
}
