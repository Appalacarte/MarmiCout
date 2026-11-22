@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Etat avant envoi ===
git status --short
echo.
git add -u
git add src scripts
git commit -m "[v2.0.74] feat(ocr): OCR gratuit dans le navigateur (PaddleOCR) pour factures et tickets"
echo.
echo === Envoi vers GitHub ===
git push origin feature/marmicout-integration
echo.
git log -3 --oneline
git status -sb
echo.
echo Termine. Tu peux fermer cette fenetre.
pause
