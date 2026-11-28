$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$env:RATE = "100"
$env:DURATION = "1m"
$env:K6_PROMETHEUS_RW_TREND_STATS = "p(50),p(95),p(99),avg,max,min"
$env:K6_PROMETHEUS_RW_SERVER_URL = "http://localhost:9090/api/v1/write"

k6 run -o experimental-prometheus-rw --tag testid=home-rate150-01 .\home-capacity-k6.js