@echo off
setlocal EnableDelayedExpansion

echo Starting API Key Proxy Manager...
cd /d "%~dp0"

:: 设置控制台编码为 UTF-8
chcp 65001 >nul 2>&1

:: 检查依赖
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

:: 启动应用
call npm start

endlocal