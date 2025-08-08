# Test SANS Authorization header comme dans votre exemple

$headers = @{
    "Content-Type" = "application/json; charset=utf-8"
}

$body = @{
    app_id = "867e880f-d486-482e-b7d8-d174db39f322"
    contents = @{ en = "TEST sans auth header - Nouvelle course disponible!" }
    include_player_ids = @("3441e939-2f5a-4dd9-97a3-8d721d6f09c5")
    priority = 10
} | ConvertTo-Json -Depth 3

Write-Host "=============================================" -ForegroundColor Green
Write-Host "TEST SANS AUTHORIZATION HEADER" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Green
Write-Host "URL: https://api.onesignal.com/notifications" -ForegroundColor Cyan
Write-Host "Player ID: 3441e939-2f5a-4dd9-97a3-8d721d6f09c5" -ForegroundColor Cyan
Write-Host "Methode de votre exemple qui marchait" -ForegroundColor Yellow

try {
    Write-Host ""
    Write-Host "Envoi notification..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "https://api.onesignal.com/notifications" -Method Post -Headers $headers -Body $body
    
    Write-Host ""
    Write-Host "RESPONSE:" -ForegroundColor Green
    $response | ConvertTo-Json
    
    if ($response -and !$response.errors) {
        Write-Host ""
        Write-Host "=============================================" -ForegroundColor Green
        Write-Host "SUCCES - REGARDEZ VOTRE TELEPHONE!" -ForegroundColor Black -BackgroundColor Green
        Write-Host "=============================================" -ForegroundColor Green
    }
}
catch {
    Write-Host ""
    Write-Host "ERREUR:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}