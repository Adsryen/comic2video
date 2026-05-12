$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

try {
    $Host.UI.RawUI.WindowTitle = 'Comic2Video Platform'
} catch {
}

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $RootDir 'platform/backend'
$FrontendDir = Join-Path $RootDir 'platform/frontend'
$VenvDir = Join-Path $BackendDir '.venv-win'
$EnvExample = Join-Path $BackendDir '.env.example'
$EnvFile = Join-Path $BackendDir '.env'
$BackendLogDir = Join-Path $BackendDir '.logs'
$FrontendLogDir = Join-Path $FrontendDir '.logs'
$BackendPort = if ($env:BACKEND_PORT) { $env:BACKEND_PORT } else { '8000' }
$FrontendPort = if ($env:FRONTEND_PORT) { $env:FRONTEND_PORT } else { '5173' }
$CeleryConcurrency = if ($env:CELERY_CONCURRENCY) { $env:CELERY_CONCURRENCY } else { '1' }

function Pause-OnError($Message) {
    Write-Host "`n[ERROR] $Message" -ForegroundColor Red
    Write-Host 'Press Enter to close...' -ForegroundColor Yellow
    [void](Read-Host)
}

function Write-Info($Message) {
    Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] $Message"
}

function Require-Directory($Path) {
    if (-not (Test-Path $Path -PathType Container)) {
        throw "Required directory not found: $Path"
    }
}

function Find-Python {
    foreach ($candidate in @('py', 'python', 'python3')) {
        $command = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($command) {
            return $candidate
        }
    }
    throw 'Python not found. Install Python 3 first.'
}

function Ensure-BackendEnv {
    if (-not (Test-Path $EnvFile) -and (Test-Path $EnvExample)) {
        Write-Info 'Creating backend .env from .env.example'
        Copy-Item $EnvExample $EnvFile
    }
}

function Ensure-BackendVenv {
    $python = Find-Python
    if (-not (Test-Path $VenvDir)) {
        Write-Info "Creating Windows backend virtual environment at $VenvDir"
        if ($python -eq 'py') {
            & py -3 -m venv $VenvDir
        } else {
            & $python -m venv $VenvDir
        }
    }
}

function Get-VenvPython {
    $venvPython = Join-Path $VenvDir 'Scripts/python.exe'
    if (-not (Test-Path $venvPython)) {
        throw "Virtual environment python not found: $venvPython"
    }
    return $venvPython
}

function Install-BackendDeps {
    $venvPython = Get-VenvPython
    Write-Info 'Installing backend dependencies'
    & $venvPython -m pip install --upgrade pip
    & $venvPython -m pip install -r (Join-Path $BackendDir 'requirements.txt')
}

function Install-FrontendDeps {
    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $npm) {
        throw 'npm not found. Install Node.js 18+ first.'
    }

    Write-Info 'Installing frontend dependencies'
    Push-Location $FrontendDir
    try {
        & npm install
    }
    finally {
        Pop-Location
    }
}

function Ensure-LogDirs {
    New-Item -ItemType Directory -Force -Path $BackendLogDir | Out-Null
    New-Item -ItemType Directory -Force -Path $FrontendLogDir | Out-Null
}

function Quote-ProcessArg($Value) {
    if ($null -eq $Value) {
        return '""'
    }

    $text = [string]$Value
    if ($text -match '[\s"]') {
        return '"' + ($text -replace '"', '\\"') + '"'
    }

    return $text
}

function Start-ServiceProcess($Label, $WorkingDir, $FilePath, $ArgumentList, $LogPath, $ExtraEnv) {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $FilePath
    $psi.WorkingDirectory = $WorkingDir
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.Arguments = (($ArgumentList | ForEach-Object { Quote-ProcessArg $_ }) -join ' ')

    foreach ($key in $ExtraEnv.Keys) {
        $psi.Environment[$key] = $ExtraEnv[$key]
    }

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi
    $writer = [System.IO.StreamWriter]::new($LogPath, $false)

    $process.add_OutputDataReceived({
        param($sender, $args)
        if ($args.Data) {
            $line = "[$Label] $($args.Data)"
            $writer.WriteLine($args.Data)
            $writer.Flush()
            Write-Host $line
        }
    })
    $process.add_ErrorDataReceived({
        param($sender, $args)
        if ($args.Data) {
            $line = "[$Label] $($args.Data)"
            $writer.WriteLine($args.Data)
            $writer.Flush()
            Write-Host $line
        }
    })
    $process.add_Exited({ $writer.Dispose() })
    $process.EnableRaisingEvents = $true

    [void]$process.Start()
    $process.BeginOutputReadLine()
    $process.BeginErrorReadLine()
    return $process
}

try {
    Require-Directory $BackendDir
    Require-Directory $FrontendDir
    Ensure-BackendEnv
    Ensure-BackendVenv
    Install-BackendDeps
    Install-FrontendDeps
    Ensure-LogDirs

    $venvPython = Get-VenvPython
    $backendEnv = @{
        'PYTHONPATH' = $BackendDir
    }

    Write-Info 'Starting Celery worker'
    $celeryProcess = Start-ServiceProcess `
        -Label 'celery' `
        -WorkingDir $BackendDir `
        -FilePath $venvPython `
        -ArgumentList @('-m', 'celery', '-A', 'app.celery_app', 'worker', '--loglevel=info', '--concurrency', $CeleryConcurrency) `
        -LogPath (Join-Path $BackendLogDir 'celery.log') `
        -ExtraEnv $backendEnv

    Write-Info "Starting FastAPI backend on port $BackendPort"
    $uvicornProcess = Start-ServiceProcess `
        -Label 'uvicorn' `
        -WorkingDir $BackendDir `
        -FilePath $venvPython `
        -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', $BackendPort, '--reload') `
        -LogPath (Join-Path $BackendLogDir 'uvicorn.log') `
        -ExtraEnv $backendEnv

    Write-Info "Starting Vite frontend on port $FrontendPort"
    $frontendProcess = Start-ServiceProcess `
        -Label 'vite' `
        -WorkingDir $FrontendDir `
        -FilePath 'npm.cmd' `
        -ArgumentList @('run', 'dev', '--', '--host', '0.0.0.0', '--port', $FrontendPort) `
        -LogPath (Join-Path $FrontendLogDir 'vite.log') `
        -ExtraEnv @{}

    Write-Info 'Platform started'
    Write-Host "Frontend: http://localhost:$FrontendPort"
    Write-Host "Backend : http://localhost:$BackendPort"
    Write-Host "Logs    : $BackendLogDir and $FrontendLogDir"
    Write-Host "Windows venv: $VenvDir"
    Write-Host 'Press Ctrl+C to stop all services'

    try {
        while ($true) {
            Start-Sleep -Seconds 2
            if ($celeryProcess.HasExited) {
                throw "Celery worker exited unexpectedly. Check $(Join-Path $BackendLogDir 'celery.log')"
            }
            if ($uvicornProcess.HasExited) {
                throw "FastAPI backend exited unexpectedly. Check $(Join-Path $BackendLogDir 'uvicorn.log')"
            }
            if ($frontendProcess.HasExited) {
                throw "Vite frontend exited unexpectedly. Check $(Join-Path $FrontendLogDir 'vite.log')"
            }
        }
    }
    finally {
        foreach ($process in @($frontendProcess, $uvicornProcess, $celeryProcess)) {
            if ($process -and -not $process.HasExited) {
                $process.Kill($true)
            }
        }
    }
}
catch {
    Pause-OnError $_.Exception.Message
    exit 1
}
