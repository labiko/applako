# Test avec include_subscription_ids + Player ID dans array

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Key os_v2_app_qz7iqd6uqzec5n6y2f2nwoptelbcfyz3rome4aue3heo7mz6mpdebjbpum3qzzdl6crzi5o6z3u5zizdckxjkalkylohy5p3i4a5jsa"
}

$body = @{
    app_id = "867e880f-d486-482e-b7d8-d174db39f322"
    contents = @{
        en = "TEST subscription_ids avec Player ID - Nouvelle course!"
        fr = "TEST subscription_ids avec Player ID - Nouvelle course!"
    }
    include_subscription_ids = @("3441e939-2f5a-4dd9-97a3-8d721d6f09c5")
    priority = 10
} | ConvertTo-Json -Depth 3

Write-Host "=============================================" -ForegroundColor Green
Write-Host "TEST include_subscription_ids + PLAYER ID" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Green
Write-Host "URL: https://api.onesignal.com/notifications" -ForegroundColor Cyan
Write-Host "Body: include_subscription_ids avec NOTRE Player ID" -ForegroundColor Yellow
Write-Host "Player ID: 3441e939-2f5a-4dd9-97a3-8d721d6f09c5" -ForegroundColor Cyan

try {
    Write-Host ""
    Write-Host "Envoi notification..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "https://api.onesignal.com/notifications" -Method Post -Headers $headers -Body $body
    
    Write-Host ""
    if ($response.recipients -and $response.recipients -gt 0) {
        Write-Host "=============================================" -ForegroundColor Green
        Write-Host "SUCCES - NOTIFICATION ENVOYEE!" -ForegroundColor Green
        Write-Host "=============================================" -ForegroundColor Green
        Write-Host "Recipients: $($response.recipients)" -ForegroundColor Green
        Write-Host ""
        Write-Host "REGARDEZ VOTRE TELEPHONE!" -ForegroundColor Black -BackgroundColor Green
    } else {
        Write-Host "=============================================" -ForegroundColor Red
        Write-Host "ECHEC" -ForegroundColor Red
        Write-Host "=============================================" -ForegroundColor Red
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
    
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
        try {
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            Write-Host "Error Body: $errorBody" -ForegroundColor Yellow
        } catch {
            Write-Host "Could not read error details" -ForegroundColor Yellow
        }
    }
}