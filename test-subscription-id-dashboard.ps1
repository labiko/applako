# Test avec SUBSCRIPTION ID du dashboard (pas OneSignal ID)

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Key os_v2_app_qz7iqd6uqzec5n6y2f2nwoptelbcfyz3rome4aue3heo7mz6mpdebjbpum3qzzdl6crzi5o6z3u5zizdckxjkalkylohy5p3i4a5jsa"
}

# SUBSCRIPTION ID du dashboard (première ligne): 56956230-53e8-431e-ba82-c7ff6dac675a
$body = @{
    app_id = "867e880f-d486-482e-b7d8-d174db39f322"
    contents = @{ en = "TEST SUBSCRIPTION ID - Du dashboard!" }
    include_subscription_ids = @("56956230-53e8-431e-ba82-c7ff6dac675a")
    priority = 10
} | ConvertTo-Json -Depth 3

Write-Host "==============================================" -ForegroundColor Green
Write-Host "TEST AVEC SUBSCRIPTION ID DU DASHBOARD" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Green
Write-Host "Subscription ID: 56956230-53e8-431e-ba82-c7ff6dac675a" -ForegroundColor Cyan
Write-Host "OneSignal ID: 3441e939-2f5a-4dd9-97a3-8d721d6f09c5" -ForegroundColor Yellow
Write-Host "Utilisation: include_subscription_ids (pas include_player_ids)" -ForegroundColor Green

try {
    Write-Host ""
    Write-Host "Envoi notification..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "https://api.onesignal.com/notifications" -Method Post -Headers $headers -Body $body
    
    Write-Host ""
    if ($response.recipients -and $response.recipients -gt 0) {
        Write-Host "==============================================" -ForegroundColor Green
        Write-Host "SUCCES - SUBSCRIPTION ID MARCHE!" -ForegroundColor Green
        Write-Host "==============================================" -ForegroundColor Green
        Write-Host "Recipients: $($response.recipients)" -ForegroundColor Green
        Write-Host ""
        Write-Host "REGARDEZ VOTRE TELEPHONE!" -ForegroundColor Black -BackgroundColor Green
    } else {
        Write-Host "==============================================" -ForegroundColor Red
        Write-Host "ECHEC AVEC SUBSCRIPTION ID" -ForegroundColor Red
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