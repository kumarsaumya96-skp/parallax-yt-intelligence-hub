[CmdletBinding()]
param(
    [switch]$NoBrowser,
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$localUrl = "http://localhost:3000/overview"
$nodeInstall = "C:\Program Files\nodejs"

if (Test-Path -LiteralPath (Join-Path $nodeInstall "node.exe")) {
    $pathEntries = $env:Path -split ";"
    if ($pathEntries -notcontains $nodeInstall) {
        $env:Path = "$nodeInstall;$env:Path"
    }
}

if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js was not found." -ForegroundColor Red
    Write-Host "Install Node.js LTS, then run this launcher again."
    Read-Host "Press Enter to close"
    exit 1
}

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    Write-Host "npm was not found beside Node.js." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

Push-Location $projectRoot
try {
    Write-Host ""
    Write-Host "Parallax - YouTube Intelligence Hub" -ForegroundColor Magenta
    Write-Host "Project: $projectRoot"
    Write-Host "Node:    $(node.exe --version)"

    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "node_modules"))) {
        Write-Host ""
        Write-Host "Installing dependencies for the first run..." -ForegroundColor Yellow
        & npm.cmd install
        if ($LASTEXITCODE -ne 0) {
            throw "Dependency installation failed with exit code $LASTEXITCODE."
        }
    }

    $localEnvironment = Join-Path $projectRoot ".env.local"
    $exampleEnvironment = Join-Path $projectRoot ".env.example"
    if (-not (Test-Path -LiteralPath $localEnvironment) -and (Test-Path -LiteralPath $exampleEnvironment)) {
        Copy-Item -LiteralPath $exampleEnvironment -Destination $localEnvironment
        Write-Host "Created .env.local from the included example."
    }

    if ($CheckOnly) {
        Write-Host ""
        Write-Host "Launcher check passed. The app is ready to start." -ForegroundColor Green
        exit 0
    }

    $alreadyRunning = $false
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $localUrl -TimeoutSec 3
        $alreadyRunning = $response.StatusCode -eq 200
    } catch {
        $alreadyRunning = $false
    }

    if ($alreadyRunning) {
        Write-Host ""
        Write-Host "The app is already running at $localUrl" -ForegroundColor Green
        if (-not $NoBrowser) {
            Start-Process $localUrl
        }
        exit 0
    }

    $browserJob = $null
    if (-not $NoBrowser) {
        $browserJob = Start-Job -ArgumentList $localUrl -ScriptBlock {
            param($url)
            for ($attempt = 0; $attempt -lt 90; $attempt++) {
                try {
                    $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2
                    if ($response.StatusCode -eq 200) {
                        Start-Process $url
                        break
                    }
                } catch {
                    Start-Sleep -Seconds 1
                }
            }
        }
    }

    $workerJob = Start-Job -ArgumentList $projectRoot, $localUrl -ScriptBlock {
        param($root, $url)
        for ($attempt = 0; $attempt -lt 90; $attempt++) {
            try {
                $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2
                if ($response.StatusCode -eq 200) {
                    Set-Location -LiteralPath $root
                    & npm.cmd run worker
                    break
                }
            } catch {
                Start-Sleep -Seconds 1
            }
        }
    }

    Write-Host ""
    Write-Host "Starting Parallax at $localUrl" -ForegroundColor Green
    Write-Host "The report scheduler starts automatically." -ForegroundColor Green
    Write-Host "Keep this window open. Press Ctrl+C to stop Parallax." -ForegroundColor Cyan
    Write-Host ""

    try {
        & npm.cmd run dev
        if ($LASTEXITCODE -ne 0) {
            throw "The development server stopped with exit code $LASTEXITCODE."
        }
    } finally {
        if ($null -ne $browserJob) {
            Stop-Job -Job $browserJob -ErrorAction SilentlyContinue
            Remove-Job -Job $browserJob -Force -ErrorAction SilentlyContinue
        }
        if ($null -ne $workerJob) {
            Stop-Job -Job $workerJob -ErrorAction SilentlyContinue
            Remove-Job -Job $workerJob -Force -ErrorAction SilentlyContinue
        }
    }
} catch {
    Write-Host ""
    Write-Host "The app could not be started:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
} finally {
    Pop-Location
}
