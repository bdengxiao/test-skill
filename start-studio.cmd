@echo off
cd /d "%~dp0"
node scripts\studio.js
if errorlevel 1 pause
