# Test avec la methode qui marche (ongnal.com)

$headers = @{
    "Content-Type" = "application/json; charset=utf-8"
    "Keep-Alive" = "true"
}

$body = @{
    app_id = "867e880f-d486-482e-b7d8-d174db39f322"
    contents = @{ en = "TEST avec methode qui marche - Nouvelle course!" }
    include_player_ids = @("3441e939-2f5a-4dd9-97a3-8d721d6f09c5")
    priority = 10
    android_channel_id = "a84f6b39-6a10-4a06-8a5d-9e9eb2a3ab3a"
} | ConvertTo-Json -Depth 3

Write-Host "=============================================" -ForegroundColor Green
Write-Host "TEST AVEC METHODE QUI MARCHE" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Green
Write-Host "URL: https://ongnal.com/api/v1/notifications" -ForegroundColor Cyan
Write-Host "Player ID: 3441e939-2f5a-4dd9-97a3-8d721d6f09c5" -ForegroundColor Cyan
Write-Host "Pas d'Authorization header - App ID dans body" -ForegroundColor Yellow

try {
    Write-Host ""
    Write-Host "Envoi notification..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "https://ongnal.com/api/v1/notifications" -Method Post -Headers $headers -Body $body
    
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
    
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Details:" -ForegroundColor Yellow
        Write-Host $errorBody
    }
}