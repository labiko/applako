# Test notification avec NOUVEAU Player ID

$headers = @{
    "Authorization" = "Basic os_v2_app_qz7iqd6uqzec5n6y2f2nwoptelbcfyz3rome4aue3heo7mz6mpdebjbpum3qzzdl6crzi5o6z3u5zizdckxjkalkylohy5p3i4a5jsa"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

$body = @{
    app_id = "867e880f-d486-482e-b7d8-d174db39f322"
    include_player_ids = @("98678bf0-61b7-4cc5-97bd-07ddb5a99b47")
    contents = @{
        en = "Nouvelle course: Centre-ville Lieusaint vers Gare RER"
        fr = "Nouvelle course: Centre-ville Lieusaint vers Gare RER"
    }
    headings = @{
        en = "Nouvelle reservation disponible!"
        fr = "Nouvelle reservation disponible!"
    }
    data = @{
        type = "new_reservation"
        reservationId = "test-$(Get-Date -Format 'HHmmss')"
        departNom = "Centre-ville Lieusaint"
        destinationNom = "Gare RER D Lieusaint-Moissy"
        prix = "15.50 EUR"
    }
    android_accent_color = "FFC1F11D"
    priority = 10
    android_channel_id = "reservation_channel"
    small_icon = "ic_notification"
} | ConvertTo-Json -Depth 3

Write-Host "=====================================" -ForegroundColor Green
Write-Host "TEST AVEC NOUVEAU PLAYER ID" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Green
Write-Host "Player ID: 98678bf0-61b7-4cc5-97bd-07ddb5a99b47" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "Envoi notification..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "https://api.onesignal.com/notifications" -Method Post -Headers $headers -Body $body
    
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "SUCCES - NOTIFICATION ENVOYEE!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "ID Notification: $($response.id)" -ForegroundColor Green
    Write-Host "Recipients: $($response.recipients)" -ForegroundColor Green
    Write-Host ""
    
    if ($response.recipients -gt 0) {
        Write-Host "LA NOTIFICATION DEVRAIT ARRIVER SUR LE TELEPHONE!" -ForegroundColor Yellow -BackgroundColor DarkGreen
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