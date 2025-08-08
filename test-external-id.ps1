# Test OneSignal avec External User IDs au lieu de Player IDs

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Key os_v2_app_qz7iqd6uqzec5n6y2f2nwoptelbcfyz3rome4aue3heo7mz6mpdebjbpum3qzzdl6crzi5o6z3u5zizdckxjkalkylohy5p3i4a5jsa"
}

# IMPORTANT: include_external_user_ids au lieu de include_player_ids
# Format: conducteur_1 (où 1 est l'ID du conducteur en base de données)
$body = @{
    app_id = "867e880f-d486-482e-b7d8-d174db39f322"
    contents = @{ en = "TEST EXTERNAL ID - Nouvelle course disponible!" }
    include_external_user_ids = @("conducteur_1")  # Remplacez 1 par l'ID réel
    priority = 10
} | ConvertTo-Json -Depth 3

Write-Host "==============================================" -ForegroundColor Green
Write-Host "TEST ONESIGNAL AVEC EXTERNAL USER IDS" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Green
Write-Host "Format: include_external_user_ids" -ForegroundColor Cyan
Write-Host "External ID: conducteur_1" -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANT: L'app doit d'abord appeler:" -ForegroundColor Red
Write-Host "OneSignal.login('conducteur_1')" -ForegroundColor Red
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
        Write-Host "Notification ID: $($response.id)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "REGARDEZ VOTRE TELEPHONE!" -ForegroundColor Black -BackgroundColor Green
    } else {
        Write-Host "==============================================" -ForegroundColor Red
        Write-Host "ECHEC - External ID non trouvé" -ForegroundColor Red
        Write-Host "==============================================" -ForegroundColor Red
        if ($response.errors) {
            Write-Host "Erreurs: $($response.errors -join ', ')" -ForegroundColor Red
        }
        Write-Host ""
        Write-Host "L'app doit d'abord définir l'External ID avec:" -ForegroundColor Yellow
        Write-Host "OneSignal.login('conducteur_1')" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Response complete:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5
}
catch {
    Write-Host ""
    Write-Host "ERREUR:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Si erreur 'All included players are not subscribed':" -ForegroundColor Yellow
    Write-Host "→ L'External ID n'est pas encore défini dans l'app" -ForegroundColor Yellow
    Write-Host "→ L'app doit appeler OneSignal.login('conducteur_1')" -ForegroundColor Yellow
}