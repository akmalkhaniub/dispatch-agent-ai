param ([int]$Port = 3003)
$ErrorActionPreference = "Stop"
Write-Host "🌐 [Cloudflare Tunnel] Exposing DispatchAgent AI at localhost:$Port for live telephony webhooks..." -ForegroundColor Cyan

$cloudflaredCmd = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflaredCmd) {
    $tempDir = Join-Path $env:TEMP "cloudflared"
    if (-not (Test-Path $tempDir)) { New-Item -ItemType Directory -Path $tempDir | Out-Null }
    $exePath = Join-Path $tempDir "cloudflared.exe"
    if (-not (Test-Path $exePath)) {
        Write-Host "⬇️ Downloading standalone cloudflared binary..." -ForegroundColor Yellow
        $url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
        Invoke-WebRequest -Uri $url -OutFile $exePath
    }
    $cloudflaredCmd = $exePath
} else {
    $cloudflaredCmd = "cloudflared"
}

Write-Host "🚀 Telephony Tunnel active! Configure this URL in Amazon Chime Voice Connector / Twilio Webhooks:" -ForegroundColor Green
& $cloudflaredCmd tunnel --url "http://localhost:$Port"
