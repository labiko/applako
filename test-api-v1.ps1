# Test avec OneSignal API v1 (votre URL qui marche)

$headers = @{
    "Authorization" = "Basic os_v2_app_qz7iqd6uqzec5n6y2f2nwoptelbcfyz3rome4aue3heo7mz6mpdebjbpum3qzzdl6crzi5o6z3u5zizdckxjkalkylohy5p3i4a5jsa"
    "Content-Type" = "application/json; charset=utf-8"
}

$body = @{
    app_id = "867e880f-d486-482e-b7d8-d174db39f322"
    contents = @{ en = "TEST API v1 - Nouvelle course Lako disponible!" }
    include_player_ids = @("3441e939-2f5a-4dd9-97a3-8d721d6f09c5")
    priority = 10
    android_channel_id = "a84f6b39-6a10-4a06-8a5d-9e9eb2a3ab3a"
} | ConvertTo-Json -Depth 3

Write-Host "=============================================" -ForegroundColor Green
Write-Host "TEST AVEC ONESIGNAL API v1" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Green
Write-Host "URL: https://onesignal.com/api/v1/notifications" -ForegroundColor Cyan
Write-Host "Player ID: 3441e939-2f5a-4dd9-97a3-8d721d6f09c5" -ForegroundColor Cyan
Write-Host "Format exact de votre exemple qui marchait" -ForegroundColor Yellow

try {
    Write-Host ""
    Write-Host "Envoi notification..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "https://onesignal.com/api/v1/notifications" -Method Post -Headers $headers -Body $body
    
    Write-Host ""
    if ($response.recipients -gt 0) {
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
        Write-Host "Erreurs: $($response.errors)" -ForegroundColor Red
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