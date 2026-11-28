$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not $env:BASE_URL) {
    $env:BASE_URL = "http://localhost:8080"
}
if (-not $env:K6_PROMETHEUS_RW_SERVER_URL) {
    $env:K6_PROMETHEUS_RW_SERVER_URL = "http://localhost:9090/api/v1/write"
}
$env:K6_PROMETHEUS_RW_TREND_STATS = "min,avg,max,p(50),p(95),p(99)"

$runId = Get-Date -Format "yyyyMMdd-HHmmss"
$testId = "home-spike-$runId"
Write-Host "Ejecutando prueba de pico de home con testid=$testId"

k6 run -o experimental-prometheus-rw --tag "testid=$testId" .\home-spike-k6.js
exit $LASTEXITCODE
