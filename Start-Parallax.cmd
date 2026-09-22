@echo off
title Parallax - YouTube Intelligence Hub
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-Parallax.ps1" %*
if errorlevel 1 pause
