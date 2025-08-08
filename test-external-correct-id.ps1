# Test avec le VRAI External User ID du conducteur connecté

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Key os_v2_app_qz7iqd6uqzec5n6y2f2nwoptelbcfyz3rome4aue3heo7mz6mpdebjbpum3qzzdl6crzi5o6z3u5zizdckxjkalkylohy5p3i4a5jsa"
}

# External User ID = conducteur_ + ID en base
$externalUserId = "conducteur_69e0cde9-14a0-4dde-86c1-1fe9a306f2fa"

$body = @{
    app_id = "867e880f-d486-482e-b7d8-d174db39f322"
    contents = @{ en = "TEST EXTERNAL ID - Nouvelle course disponible!" }
    include_external_user_ids = @($externalUserId)
    priority = 10
} | ConvertTo-Json -Depth 3

Write-Host "==============================================" -ForegroundColor Green
Write-Host "TEST AVEC EXTERNAL USER ID CORRECT" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Green
Write-Host "ID Conducteur en base: 69e0cde9-14a0-4dde-86c1-1fe9a306f2fa" -ForegroundColor Cyan
Write-Host "External User ID: $externalUserId" -ForegroundColor Yellow
Write-Host ""

try {
    Write-Host "Envoi notification..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "https://onesignal.com/api/v1/notifications" -Method Post -Headers $headers -Body $body
    
    Write-Host ""
    if ($response.recipients -and $response.recipients -gt 0) {
        Write-Host "==============================================" -ForegroundColor Green
        Write-Host "SUCCES ! NOTIFICATION ENVOYEE !" -ForegroundColor Green
        Write-Host "==============================================" -ForegroundColor Green
        Write-Host "Recipients: $($response.recipients)" -ForegroundColor Green
        Write-Host "ID Notification: $($response.id)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "REGARDEZ VOTRE TELEPHONE!" -ForegroundColor Black -BackgroundColor Green
    } else {
        Write-Host "==============================================" -ForegroundColor Red
        Write-Host "ECHEC - External ID non reconnu" -ForegroundColor Red
        Write-Host "==============================================" -ForegroundColor Red
        if ($response.errors) {
            Write-Host "Erreurs: $($response.errors -join ', ')" -ForegroundColor Red
        }
        Write-Host ""
        Write-Host "L'app n'a pas encore défini cet External ID" -ForegroundColor Yellow
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