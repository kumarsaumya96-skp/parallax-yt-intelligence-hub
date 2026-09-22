[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$ProjectId
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gcloud.cmd -ErrorAction SilentlyContinue) -and -not (Get-Command gcloud.exe -ErrorAction SilentlyContinue)) {
    Write-Host "Google Cloud CLI is not installed." -ForegroundColor Yellow
    Write-Host "Use the Google Cloud setup links on the Data & Integrations page, or install gcloud and run this script again."
    exit 1
}

$activeAccount = (& gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>$null | Select-Object -First 1)
if (-not $activeAccount) {
    Write-Host "No active Google Cloud CLI account was found." -ForegroundColor Yellow
    Write-Host "Run: gcloud auth login"
    exit 1
}

Write-Host ""
Write-Host "Enabling YouTube APIs" -ForegroundColor Magenta
Write-Host "Project: $ProjectId"
Write-Host "Account: $activeAccount"
Write-Host ""

& gcloud services enable youtube.googleapis.com youtubeanalytics.googleapis.com --project $ProjectId
if ($LASTEXITCODE -ne 0) {
    throw "Google Cloud could not enable one or more YouTube APIs."
}

Write-Host ""
Write-Host "YouTube Data API v3: enabled" -ForegroundColor Green
Write-Host "YouTube Analytics API: enabled" -ForegroundColor Green
Write-Host "YouTube Live Streaming API: available through YouTube Data API v3" -ForegroundColor Green
Write-Host ""
Write-Host "Next: create a Web application OAuth client and use this redirect URI:"
Write-Host "http://localhost:3000/api/auth/youtube/callback" -ForegroundColor Cyan
