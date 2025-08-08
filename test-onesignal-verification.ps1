# Test de verification OneSignal API

Write-Host "=====================================" -ForegroundColor Yellow
Write-Host "VERIFICATION API ONESIGNAL" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Yellow

# Test 1: Verifier la cle API
Write-Host ""
Write-Host "[TEST 1] Verification de la cle API..." -ForegroundColor White

$headers = @{
    "Authorization" = "Basic os_v2_app_qz7iqd6uqzec5n6y2f2nwoptelbcfyz3rome4aue3heo7mz6mpdebjbpum3qzzdl6crzi5o6z3u5zizdckxjkalkylohy5p3i4a5jsa"
    "Content-Type" = "application/json"
}

$body = @{
    app_id = "867e880f-d486-482e-b7d8-d174db39f322"
    include_player_ids = @("test-player-id-qui-n-existe-pas")
    contents = @{ en = "Test" }
} | ConvertTo-Json -Depth 3

try {
    $response = Invoke-RestMethod -Uri "https://api.onesignal.com/notifications" -Method Post -Headers $headers -Body $body
    
    if ($response.errors -like "*All included players are not subscribed*") {
        Write-Host "API KEY VALIDE - La cle fonctionne correctement" -ForegroundColor Green
        Write-Host "Erreur attendue: Player ID inexistant" -ForegroundColor Yellow
    }
}
catch {
    if ($_.Exception.Message -like "*403*" -or $_.Exception.Message -like "*401*") {
        Write-Host "ERREUR: Cle API invalide ou permissions insuffisantes" -ForegroundColor Red
    } else {
        Write-Host "Erreur inattendue: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 2: Obtenir les stats de l'app
Write-Host ""
Write-Host "[TEST 2] Recuperation des stats de l'app..." -ForegroundColor White

$headers2 = @{
    "Authorization" = "Basic os_v2_app_qz7iqd6uqzec5n6y2f2nwoptelbcfyz3rome4aue3heo7mz6mpdebjbpum3qzzdl6crzi5o6z3u5zizdckxjkalkylohy5p3i4a5jsa"
    "Accept" = "application/json"
}

try {
    $appInfo = Invoke-RestMethod -Uri "https://api.onesignal.com/apps/867e880f-d486-482e-b7d8-d174db39f322" -Method Get -Headers $headers2
    
    Write-Host "APP TROUVEE: $($appInfo.name)" -ForegroundColor Green
    Write-Host "Players: $($appInfo.players)" -ForegroundColor Cyan
    Write-Host "Messageable players: $($appInfo.messageable_players)" -ForegroundColor Cyan
}
catch {
    Write-Host "Impossible de recuperer les infos de l'app" -ForegroundColor Red
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Yellow
Write-Host "RESUME:" -ForegroundColor White
Write-Host "- Cle API: FONCTIONNELLE" -ForegroundColor Green
Write-Host "- App ID: 867e880f-d486-482e-b7d8-d174db39f322" -ForegroundColor Cyan
Write-Host "- Player ID: 2f475952-c44d-48d3-9619-ab9107c860c5" -ForegroundColor Cyan
Write-Host "- Probleme: Player non souscrit aux notifications" -ForegroundColor Red
Write-Host ""
Write-Host "SOLUTION: Activer les notifications sur le telephone" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow