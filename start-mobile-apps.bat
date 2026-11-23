@echo off
title School Coupon - Mobile Apps Launcher

echo Starting Parent Mobile App (Port 8081)...
start "Parent App (Expo - Port 8081)" cmd /k "cd /d D:\School-Coupon\apps\parent-mobile && npx expo start"

echo Starting Merchant POS App (Port 8082)...
start "Merchant POS App (Expo - Port 8082)" cmd /k "cd /d D:\School-Coupon\apps\merchant-mobile && npx expo start --port 8082"

echo.
echo Opened both terminals! Scan the QR codes in each window with Expo Go.
pause
