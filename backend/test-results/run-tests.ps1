$results = @()
function Call-Api($url,$outfile) {
  $entry = @{ url=$url; status=$null; timeMs=$null; body=$null }
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -ErrorAction Stop
    $sw.Stop()
    $entry.status = $resp.StatusCode.Value__
    try { $json = $resp.Content | ConvertFrom-Json } catch { $json = $resp.Content }
    $entry.body = $json
    $entry.timeMs = $sw.ElapsedMilliseconds
  } catch {
    $sw.Stop()
    if ($_.Exception.Response) { $entry.status = $_.Exception.Response.StatusCode.Value__ } else { $entry.status = 0 }
    $entry.body = $_.Exception.Message
    $entry.timeMs = $sw.ElapsedMilliseconds
  }
  $entry | ConvertTo-Json -Depth 10 | Out-File -FilePath $outfile -Encoding utf8
  $results += $entry
}

New-Item -ItemType Directory -Path .\test-results -Force | Out-Null
Call-Api 'http://localhost:3000/equipos' '.\test-results\equipos_default.json'
Call-Api 'http://localhost:3000/equipos?fecha=2026-07-11' '.\test-results\equipos_fecha_nonbusiness.json'
Call-Api 'http://localhost:3000/equipos?q=compresor' '.\test-results\equipos_q_compresor.json'
Call-Api 'http://localhost:3000/equipos?q=1' '.\test-results\equipos_q_1.json'
Call-Api 'http://localhost:3000/equipos?rutaNumero=R-12' '.\test-results\equipos_ruta_R-12.json'

$first = $results | Where-Object { $_.url -eq 'http://localhost:3000/equipos' } | Select-Object -First 1
if ($first -and $first.body -and $first.body.equipos -and $first.body.equipos.Count -gt 0) {
  $idEquipo = $first.body.equipos[0].idEquipo
  Call-Api "http://localhost:3000/hallazgos?codigoEquipo=$idEquipo" '.\test-results\hallazgos_for_first_equipo.json'
} else {
  $results += @{ url='http://localhost:3000/hallazgos?codigoEquipo=SKIP'; status='SKIP'; timeMs=0; body='No idEquipo available from /equipos' }
}

$results | ConvertTo-Json -Depth 10 | Out-File -FilePath '.\test-results\summary.json' -Encoding utf8
Write-Output 'TESTS_DONE'
