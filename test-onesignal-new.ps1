# Test OneSignal avec nouvelle cle API

$headers = @{
    "Authorization" = "Basic os_v2_app_qz7iqd6uqzec5n6y2f2nwoptelbcfyz3rome4aue3heo7mz6mpdebjbpum3qzzdl6crzi5o6z3u5zizdckxjkalkylohy5p3i4a5jsa"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

$body = @{
    app_id = "867e880f-d486-482e-b7d8-d174db39f322"
    include_player_ids = @("2f475952-c44d-48d3-9619-ab9107c860c5")
    contents = @{
        en = "Nouvelle reservation: Centre-ville Lieusaint vers Gare RER"
        fr = "Nouvelle reservation: Centre-ville Lieusaint vers Gare RER"
    }
    headings = @{
        en = "Nouvelle course disponible"
        fr = "Nouvelle course disponible"
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
} | ConvertTo-Json -Depth 3

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "TEST NOTIFICATION ONESIGNAL" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Player ID cible: 2f475952-c44d-48d3-9619-ab9107c860c5" -ForegroundColor White
Write-Host "App ID: 867e880f-d486-482e-b7d8-d174db39f322" -ForegroundColor White
Write-Host ""

try {
    Write-Host "Envoi en cours..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "https://api.onesignal.com/notifications" -Method Post -Headers $headers -Body $body
    
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "SUCCES - NOTIFICATION ENVOYEE!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "ID Notification: $($response.id)" -ForegroundColor Green
    Write-Host "Recipients: $($response.recipients)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response complete:" -ForegroundColor Cyan
    $response | ConvertTo-Json
}
catch {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Red
    Write-Host "ERREUR" -ForegroundColor Red
    Write-Host "=====================================" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}