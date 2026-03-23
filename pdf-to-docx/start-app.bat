@echo off
REM Iniciar Backend y Frontend para PDF a DOCX Converter

echo ========================================
echo   PDF a DOCX - Conversor
echo ========================================
echo.

REM Verificar que exista el .env del backend
if not exist "backend\.env" (
    echo [!] No se encontro backend\.env
    echo     Copia backend\.env.example a backend\.env y configura tus credenciales de Adobe.
    echo.
    pause
    exit /b 1
)

echo [1/2] Iniciando Backend en puerto 3000...
start "PDF-DOCX Backend" cmd /c "cd backend && npm start"

echo [2/2] Iniciando Frontend Angular en puerto 4200...
start "PDF-DOCX Frontend" cmd /c "cd frontend && ng serve --open"

echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:4200
echo.
echo Cierra las ventanas de terminal para detener los servicios.
pause
