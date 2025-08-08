# Test avec le format EXACT de votre code C# qui marche

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Key os_v2_app_qz7iqd6uqzec5n6y2f2nwoptelbcfyz3rome4aue3heo7mz6mpdebjbpum3qzzdl6crzi5o6z3u5zizdckxjkalkylohy5p3i4a5jsa"
}

# FORMAT EXACT de votre code C#:
# app_id = ConfigurationManager.AppSettings["onsignalAppId"],
# contents = new { en = Msge },
# include_player_ids = new string[] { PlayerId },
# priority = 10,

$body = @{
    app_id = "867e880f-d486-482e-b7d8-d174db39f322"
    contents = @{ en = "TEST EXACT FORMAT C# - Nouvelle course disponible!" }
    include_player_ids = @("3441e939-2f5a-4dd9-97a3-8d721d6f09c5")
    priority = 10
} | ConvertTo-Json -Depth 3

Write-Host "=============================================" -ForegroundColor Green
Write-Host "TEST FORMAT EXACT DE VOTRE CODE C#" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Green
Write-Host "app_id: 867e880f-d486-482e-b7d8-d174db39f322" -ForegroundColor Cyan
Write-Host "contents: { en: message }" -ForegroundColor Cyan
Write-Host "include_player_ids: [Player ID]" -ForegroundColor Cyan
Write-Host "priority: 10" -ForegroundColor Cyan

Write-Host ""
Write-Host "Body JSON:" -ForegroundColor Yellow
Write-Host $body -ForegroundColor White

try {
    Write-Host ""
    Write-Host "Envoi notification..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "https://api.onesignal.com/notifications" -Method Post -Headers $headers -Body $body
    
    Write-Host ""
    if ($response.recipients -and $response.recipients -gt 0) {
        Write-Host "=============================================" -ForegroundColor Green
        Write-Host "SUCCES - VOTRE FORMAT MARCHE!" -ForegroundColor Green
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
}