@echo off
REM ===============================================
REM cURL pour API TriggerPaymentOnAcceptance (Windows)
REM Test avec reservation et conducteur specifiques
REM ===============================================

set RESERVATION_ID=0b1c5f4f-38ab-4419-8fd2-f2cca9d63e78
set CONDUCTEUR_ID=75f2bd16-d906-4ea5-8f30-5ff66612ea5c
set API_BASE_URL=https://your-api-domain.com
set ENDPOINT=/api/TriggerPaymentOnAcceptance

echo ===============================================
echo Test API TriggerPaymentOnAcceptance
echo Reservation: %RESERVATION_ID%
echo Conducteur: %CONDUCTEUR_ID%
echo ===============================================

REM Test 1: POST JSON
echo.
echo [TEST 1] POST avec JSON...
curl -X POST ^
  "%API_BASE_URL%%ENDPOINT%" ^
  -H "Content-Type: application/json" ^
  -H "Accept: application/json" ^
  -H "Authorization: Bearer YOUR_API_TOKEN_HERE" ^
  -d "{\"reservation_id\": \"%RESERVATION_ID%\", \"conducteur_id\": \"%CONDUCTEUR_ID%\", \"action\": \"accept_and_trigger_payment\"}" ^
  -v

echo.
echo ===============================================

REM Test 2: GET avec parametres URL
echo.
echo [TEST 2] GET avec parametres...
curl -X GET ^
  "%API_BASE_URL%%ENDPOINT%?reservation_id=%RESERVATION_ID%&conducteur_id=%CONDUCTEUR_ID%" ^
  -H "Accept: application/json" ^
  -H "Authorization: Bearer YOUR_API_TOKEN_HERE" ^
  -v

echo.
echo ===============================================

REM Test 3: POST form-data
echo.
echo [TEST 3] POST form-data...
curl -X POST ^
  "%API_BASE_URL%%ENDPOINT%" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -H "Accept: application/json" ^
  -H "Authorization: Bearer YOUR_API_TOKEN_HERE" ^
  -d "reservation_id=%RESERVATION_ID%" ^
  -d "conducteur_id=%CONDUCTEUR_ID%" ^
  -v

echo.
echo ===============================================
echo Tests termines
pause