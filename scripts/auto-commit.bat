@echo off
:: ============================================================
:: Chronicles of Eternity — Auto Commit & Push (Windows)
::
:: 사용법:
::   scripts\auto-commit.bat
::   scripts\auto-commit.bat "커스텀 커밋 메시지"
::
:: 동작:
::   1. 변경된 파일 확인
::   2. 없으면 종료
::   3. 있으면 타임스탬프 포함 커밋
::   4. 원격 저장소에 푸시
:: ============================================================

setlocal enabledelayedexpansion

cd /d "%~dp0\.."

:: ── 1. 변경 사항 확인 ──────────────────────────────
git status --short > "%TEMP%\git_status.txt" 2>&1
for %%A in ("%TEMP%\git_status.txt") do set SIZE=%%~zA
if %SIZE%==0 (
    echo [auto-commit] 변경된 파일이 없습니다. 종료합니다.
    exit /b 0
)

:: ── 2. 커밋 메시지 결정 ────────────────────────────
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set DATE=%%c-%%a-%%b
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set TIME=%%a:%%b

if "%~1"=="" (
    set COMMIT_MSG=chore: auto commit [%DATE% %TIME%]
) else (
    set COMMIT_MSG=%~1 [%DATE% %TIME%]
)

:: ── 3. 스테이징 및 커밋 ────────────────────────────
echo [auto-commit] 변경 파일을 스테이징합니다...
git add -A

echo [auto-commit] 커밋: !COMMIT_MSG!
git commit -m "!COMMIT_MSG!"

:: ── 4. 푸시 ────────────────────────────────────────
for /f %%R in ('git remote 2^>nul') do set REMOTE=%%R
if defined REMOTE (
    for /f %%B in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%B
    echo [auto-commit] !REMOTE!/!BRANCH! 에 푸시합니다...
    git push !REMOTE! !BRANCH!
    echo [auto-commit] 푸시 완료!
) else (
    echo [auto-commit] 원격 저장소 없음. 커밋만 완료했습니다.
    echo   원격 추가: git remote add origin ^<URL^>
)

echo [auto-commit] 완료: !COMMIT_MSG!
endlocal
