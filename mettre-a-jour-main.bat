@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Mise a jour de main avec la version 2.0.72 ===
git fetch origin
git checkout main
git pull --ff-only origin main
git merge --ff-only feature/marmicout-integration
if errorlevel 1 (echo. & echo PROBLEME : fusion impossible, rien n a ete envoye. Envoie une capture a Claude. & git checkout feature/marmicout-integration & pause & exit /b 1)
git push origin main
git checkout feature/marmicout-integration
echo.
git log -1 --oneline origin/main
echo.
echo Termine. Tu peux fermer cette fenetre.
pause
