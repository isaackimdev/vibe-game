@echo off
:: ============================================================
:: Chronicles of Eternity — Auto Commit & Push (Windows)
::
:: 사용법:
::   scripts\auto-commit.bat
::   scripts\auto-commit.bat "커스텀 커밋 메시지"
:: ============================================================

setlocal enabledelayedexpansion

cd /d "%~dp0\.."

:: ── 1. 변경 사항 확인 ──────────────────────────────────────
for /f "delims=" %%L in ('git status --short 2^>nul') do (
    set HAS_CHANGES=1
)

if not defined HAS_CHANGES (
    echo [auto-commit] 변경된 파일이 없습니다. 종료합니다.
    exit /b 0
)

:: ── 2. 커밋 메시지 결정 ────────────────────────────────────
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set DT=%%I
set TIMESTAMP=%DT:~0,4%-%DT:~4,2%-%DT:~6,2% %DT:~8,2%:%DT:~10,2%

if "%~1"=="" (
    set COMMIT_MSG=chore: auto commit [%TIMESTAMP%]
) else (
    set COMMIT_MSG=%~1 [%TIMESTAMP%]
)

:: ── 3. 스테이징 및 커밋 ────────────────────────────────────
echo [auto-commit] 변경 파일을 스테이징합니다...
git add -A

echo [auto-commit] 커밋: !COMMIT_MSG!
git commit -m "!COMMIT_MSG!"

if errorlevel 1 (
    echo [auto-commit] 커밋 실패.
    exit /b 1
)

:: ── 4. 푸시 (원격 저장소가 있을 때만) ─────────────────────
for /f "delims=" %%R in ('git remote 2^>nul') do (
    set REMOTE=%%R
    goto :do_push
)
echo [auto-commit] 원격 저장소 없음. 커밋만 완료했습니다.
echo   원격 추가: git remote add origin ^<URL^>
goto :done

:do_push
for /f "delims=" %%B in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%B
echo [auto-commit] !REMOTE!/!BRANCH! 에 푸시합니다...
git push !REMOTE! !BRANCH!
if errorlevel 1 (
    echo [auto-commit] 푸시 실패. 커밋은 완료되었습니다.
    exit /b 1
)
echo [auto-commit] 푸시 완료!

:done
echo [auto-commit] 완료: !COMMIT_MSG!
endlocal
