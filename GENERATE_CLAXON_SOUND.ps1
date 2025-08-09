# ========================================
# GÉNÉRATEUR AUDIO CLAXON SIMPLE
# ========================================

# Créer un son de claxon basique avec Windows
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Beep {
    [DllImport("kernel32.dll")]
    public static extern bool Beep(uint dwFreq, uint dwDuration);
}
"@

Write-Host "🔊 Génération sons claxon..."

# Son 1: Claxon court (500Hz, 200ms)
[Beep]::Beep(500, 200)
Start-Sleep -Milliseconds 100
[Beep]::Beep(500, 200)

Write-Host "✅ Sons générés"
Write-Host "💡 Pour fichier WAV permanent, utilisez les sources ci-dessous:"