Add-Type -AssemblyName System.Net.Http
$json = Get-Content -Path 'scratch/seed_db_payload.json' -Raw
$client = New-Object System.Net.Http.HttpClient
$content = New-Object System.Net.Http.StringContent($json, [System.Text.Encoding]::UTF8, "application/json")
$response = $client.PutAsync("https://rc-proyectos-default-rtdb.firebaseio.com/rc_ws_main.json", $content).Result
Write-Host "Firebase RTDB Status:" $response.StatusCode
$body = $response.Content.ReadAsStringAsync().Result
Write-Host "Firebase Response:" $body
