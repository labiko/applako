# Test simple OneSignal

$headers = @{
    "Authorization" = "Basic os_v2_app_qz7iqd6uqzec5n6y2f2nwoptelbcfyz3rome4aue3heo7mz6mpdebjbpum3qzzdl6crzi5o6z3u5zizdckxjkalkylohy5p3i4a5jsa"
    "Content-Type" = "application/json"
}

$body = @{
    app_id = "867e880f-d486-482e-b7d8-d174db39f322"
    include_player_ids = @("98678bf0-61b7-4cc5-97bd-07ddb5a99b47")
    contents = @{
        en = "Test notification Lako"
    }
} | ConvertTo-Json -Depth 3

Write-Host "Test simple..." -ForegroundColor Yellow
Write-Host "Player ID: 98678bf0-61b7-4cc5-97bd-07ddb5a99b47" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "https://api.onesignal.com/notifications" -Method Post -Headers $headers -Body $body
    
    Write-Host "SUCCES!" -ForegroundColor Green
    Write-Host "ID: $($response.id)" -ForegroundColor Green
    Write-Host "Recipients: $($response.recipients)" -ForegroundColor Green
    
    if ($response.recipients -gt 0) {
        Write-Host ""
        Write-Host "NOTIFICATION ENVOYEE AU TELEPHONE!" -ForegroundColor Black -BackgroundColor Green
    }
    
    $response | ConvertTo-Json
}
catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Details:" -ForegroundColor Yellow
        Write-Host $errorBody
    }
}