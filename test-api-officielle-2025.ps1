# Test avec la VRAIE API OneSignal 2025 (documentation officielle)

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Key os_v2_app_qz7iqd6uqzec5n6y2f2nwoptelbcfyz3rome4aue3heo7mz6mpdebjbpum3qzzdl6crzi5o6z3u5zizdckxjkalkylohy5p3i4a5jsa"
}

$body = @{
    app_id = "867e880f-d486-482e-b7d8-d174db39f322"
    include_subscription_ids = @("3441e939-2f5a-4dd9-97a3-8d721d6f09c5")
    contents = @{
        en = "VRAIE API 2025 - Nouvelle course disponible!"
        fr = "VRAIE API 2025 - Nouvelle course disponible!"
    }
} | ConvertTo-Json -Depth 3

Write-Host "=============================================" -ForegroundColor Green
Write-Host "TEST AVEC VRAIE API ONESIGNAL 2025" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Green
Write-Host "URL: https://api.onesignal.com/notifications" -ForegroundColor Cyan
Write-Host "Header: Authorization: Key [REST_API_KEY]" -ForegroundColor Cyan
Write-Host "Body: include_subscription_ids (pas include_player_ids)" -ForegroundColor Yellow
Write-Host "Player ID: 3441e939-2f5a-4dd9-97a3-8d721d6f09c5" -ForegroundColor Cyan

try {
    Write-Host ""
    Write-Host "Envoi notification..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "https://api.onesignal.com/notifications" -Method Post -Headers $headers -Body $body
    
    Write-Host ""
    if ($response.recipients -and $response.recipients -gt 0) {
        Write-Host "=============================================" -ForegroundColor Green
        Write-Host "SUCCES - NOTIFICATION ENVOYEE!" -ForegroundColor Green
        Write-Host "=============================================" -ForegroundColor Green
        Write-Host "Recipients: $($response.recipients)" -ForegroundColor Green
        Write-Host ""
        Write-Host "REGARDEZ VOTRE TELEPHONE!" -ForegroundColor Black -BackgroundColor Green
    } else {
        Write-Host "=============================================" -ForegroundColor Red
        Write-Host "ECHEC" -ForegroundColor Red
        Write-Host "=============================================" -ForegroundColor Red
        if ($response.errors) {
            Write-Host "Erreurs: $($response.errors)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Response complete:" -ForegroundColor Cyan
    $response | ConvertTo-Json
}
catch {
    Write-Host ""
    Write-Host "ERREUR:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}