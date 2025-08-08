# Test OneSignal Direct Notification

$headers = @{
    "Authorization" = "Basic os_v2_app_qz71dd6uqzec5n6y2f2nwoptejjh6kxodawegmexvwa22gdcj2go3ypdkyucr4d5azya5er7pwybz1eddkzmfeds3h2f7fe756y363q"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

$body = @{
    app_id = "867e880f-d486-482e-b7d8-d174db39f322"
    include_player_ids = @("2f475952-c44d-48d3-9619-ab9107c860c5")
    contents = @{
        en = "Nouvelle reservation: Centre-ville Lieusaint -> Gare RER"
        fr = "Nouvelle reservation: Centre-ville Lieusaint -> Gare RER"
    }
    headings = @{
        en = "Nouvelle course disponible"
        fr = "Nouvelle course disponible"
    }
    data = @{
        type = "new_reservation"
        reservationId = "test-123"
        departNom = "Centre-ville Lieusaint"
        destinationNom = "Gare RER D Lieusaint-Moissy"
        prix = "15.50"
    }
} | ConvertTo-Json -Depth 3

Write-Host "Envoi notification OneSignal..." -ForegroundColor Yellow
Write-Host "Player ID: 2f475952-c44d-48d3-9619-ab9107c860c5" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "https://api.onesignal.com/notifications" -Method Post -Headers $headers -Body $body
    
    Write-Host "Notification envoyee avec succes!" -ForegroundColor Green
    Write-Host "ID Notification: $($response.id)" -ForegroundColor Green
    Write-Host "Recipients: $($response.recipients)" -ForegroundColor Green
    
    $response | ConvertTo-Json
}
catch {
    Write-Host "Erreur lors de envoi:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}