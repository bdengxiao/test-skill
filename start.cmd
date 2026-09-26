@echo off
cd /d "%~dp0"
echo Test Skill - open http://127.0.0.1:4173
node scripts/serve.js
pause
