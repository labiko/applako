# Test avec External User ID conducteur_1

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Key os_v2_app_qz7iqd6uqzec5n6y2f2nwoptelbcfyz3rome4aue3heo7mz6mpdebjbpum3qzzdl6crzi5o6z3u5zizdckxjkalkylohy5p3i4a5jsa"
}

$body = @{
    app_id = "867e880f-d486-482e-b7d8-d174db39f322"
    contents = @{ en = "TEST EXTERNAL - Nouvelle course pour conducteur 1!" }
    include_external_user_ids = @("conducteur_1")
    priority = 10
} | ConvertTo-Json -Depth 3

Write-Host "==============================================" -ForegroundColor Green
Write-Host "TEST EXTERNAL USER ID - CONDUCTEUR 1" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Green
Write-Host "External User ID: conducteur_1" -ForegroundColor Cyan
Write-Host "OneSignal ID visible: 43181926-afc0-4db7-509e-462c0646e821" -ForegroundColor Yellow
Write-Host ""

try {
    Write-Host "Envoi notification..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "https://onesignal.com/api/v1/notifications" -Method Post -Headers $headers -Body $body
    
    Write-Host ""
    if ($response.recipients -and $response.recipients -gt 0) {
        Write-Host "==============================================" -ForegroundColor Green
        Write-Host "SUCCES - EXTERNAL ID FONCTIONNE!" -ForegroundColor Green
        Write-Host "==============================================" -ForegroundColor Green
        Write-Host "Recipients: $($response.recipients)" -ForegroundColor Green
        Write-Host ""
        Write-Host "REGARDEZ VOTRE TELEPHONE!" -ForegroundColor Black -BackgroundColor Green
    } else {
        Write-Host "==============================================" -ForegroundColor Red
        Write-Host "ECHEC - External ID non trouvé" -ForegroundColor Red
        Write-Host "==============================================" -ForegroundColor Red
        if ($response.errors) {
            Write-Host "Erreurs: $($response.errors -join ', ')" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5
}
catch {
    Write-Host ""
    Write-Host "ERREUR:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}