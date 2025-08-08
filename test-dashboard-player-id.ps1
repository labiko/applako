# Test avec le Player ID EXACT du dashboard OneSignal

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Key os_v2_app_qz7iqd6uqzec5n6y2f2nwoptelbcfyz3rome4aue3heo7mz6mpdebjbpum3qzzdl6crzi5o6z3u5zizdckxjkalkylohy5p3i4a5jsa"
}

# Player ID EXACT visible dans votre dashboard
$body = @{
    app_id = "867e880f-d486-482e-b7d8-d174db39f322"
    contents = @{ en = "TEST DASHBOARD - Player ID exact du dashboard!" }
    include_player_ids = @("3441e939-2f5a-4dd9-97a3-8d721d6f09c5")
    priority = 10
} | ConvertTo-Json -Depth 3

Write-Host "==============================================" -ForegroundColor Green
Write-Host "TEST AVEC PLAYER ID EXACT DU DASHBOARD" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Green
Write-Host "Player ID du dashboard: 3441e939-2f5a-4dd9-97a3-8d721d6f09c5" -ForegroundColor Cyan
Write-Host "Status dans dashboard: SUBSCRIBED" -ForegroundColor Green

try {
    Write-Host ""
    Write-Host "Envoi notification..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "https://api.onesignal.com/notifications" -Method Post -Headers $headers -Body $body
    
    Write-Host ""
    if ($response.recipients -and $response.recipients -gt 0) {
        Write-Host "==============================================" -ForegroundColor Green
        Write-Host "SUCCES - DASHBOARD CONFIRME SOUSCRIPTION!" -ForegroundColor Green
        Write-Host "==============================================" -ForegroundColor Green
        Write-Host "Recipients: $($response.recipients)" -ForegroundColor Green
        Write-Host ""
        Write-Host "REGARDEZ VOTRE TELEPHONE!" -ForegroundColor Black -BackgroundColor Green
    } else {
        Write-Host "==============================================" -ForegroundColor Red
        Write-Host "ECHEC MALGRE DASHBOARD SUBSCRIBED" -ForegroundColor Red
        Write-Host "==============================================" -ForegroundColor Red
        if ($response.errors) {
            Write-Host "Erreurs: $($response.errors -join ', ')" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Response complete:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5
}
catch {
    Write-Host ""
    Write-Host "ERREUR:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}