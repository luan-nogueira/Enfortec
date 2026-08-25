@echo off
cd /d "%~dp0"
git add .
git commit -m "feat: configure Mercado Pago payment credentials"
git push
