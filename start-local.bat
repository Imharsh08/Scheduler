
@echo off
title ProSched Launcher

echo =======================================================
echo  Starting ProSched Application...
echo =======================================================
echo.
echo A new window will open for the server. 
echo Please keep that server window open while using the app.
echo.
echo The application will open in your browser automatically shortly.
echo.

:: Start the Next.js development server in a new window
start "ProSched Server" npm run dev

:: Wait a few seconds for the server to start up
:: Using ping for a delay that works across Windows versions without extra commands
echo Waiting for server to start...
ping 127.0.0.1 -n 8 > nul

:: Open the application in the default browser
echo Opening ProSched in your browser...
start http://localhost:9002

exit
