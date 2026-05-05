@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 开始构建 Electron 应用...
echo.
npm run build
echo.
echo 构建完成！按任意键退出...
pause >nul