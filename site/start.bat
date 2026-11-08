@echo off
cd /d "%~dp0"
rem Port 8123: 8080 is often taken by other local apps.
echo Starting Starship site at http://localhost:8123  (Ctrl+C to stop)
start "" http://localhost:8123
python -m http.server 8123
