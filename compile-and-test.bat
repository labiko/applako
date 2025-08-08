@echo off
echo ========================================
echo COMPILATION ET TEST ONESIGNAL C#
echo ========================================

echo Compilation du test OneSignal...
csc /reference:System.Web.Extensions.dll TestOneSignal.cs

if exist TestOneSignal.exe (
    echo.
    echo Compilation réussie! Exécution du test...
    echo.
    TestOneSignal.exe
) else (
    echo.
    echo ERREUR: Compilation échouée
    echo Vérifiez que vous avez .NET Framework installé
)

pause