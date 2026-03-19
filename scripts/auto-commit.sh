#!/bin/bash
# ============================================================
# Chronicles of Eternity — Auto Commit & Push Script
#
# 사용법:
#   bash scripts/auto-commit.sh
#   bash scripts/auto-commit.sh "커스텀 커밋 메시지"
#
# 동작:
#   1. 변경된 파일이 있는지 확인
#   2. 없으면 종료 (깨끗한 상태)
#   3. 있으면 변경 내역을 스탬프 포함 커밋 메시지로 커밋
#   4. 원격 저장소(origin main)에 푸시
# ============================================================

set -e  # 오류 발생 시 즉시 중단

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

# ── 1. 변경 사항 확인 ──────────────────────────────────────
if git diff --quiet && git diff --staged --quiet && [ -z "$(git status --short)" ]; then
    echo "[auto-commit] 변경된 파일이 없습니다. 종료합니다."
    exit 0
fi

# ── 2. 커밋 메시지 결정 ────────────────────────────────────
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
if [ -n "$1" ]; then
    COMMIT_MSG="$1 [$TIMESTAMP]"
else
    # 변경된 파일 목록을 요약해 자동 메시지 생성
    CHANGED=$(git diff --name-only HEAD 2>/dev/null | head -5 | tr '\n' ', ' | sed 's/,$//')
    UNTRACKED=$(git ls-files --others --exclude-standard | head -3 | tr '\n' ', ' | sed 's/,$//')
    SUMMARY=""
    [ -n "$CHANGED"   ] && SUMMARY="수정: $CHANGED"
    [ -n "$UNTRACKED" ] && SUMMARY="$SUMMARY | 추가: $UNTRACKED"
    [ -z "$SUMMARY"   ] && SUMMARY="자동 커밋"
    COMMIT_MSG="chore: $SUMMARY [$TIMESTAMP]"
fi

# ── 3. 스테이징 및 커밋 ────────────────────────────────────
echo "[auto-commit] 변경 파일을 스테이징합니다..."
git add -A

echo "[auto-commit] 커밋 메시지: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

# ── 4. 푸시 (원격 저장소가 설정된 경우에만) ───────────────
REMOTE=$(git remote 2>/dev/null | head -1)
if [ -n "$REMOTE" ]; then
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo "[auto-commit] '$REMOTE/$BRANCH' 에 푸시합니다..."
    git push "$REMOTE" "$BRANCH"
    echo "[auto-commit] 푸시 완료!"
else
    echo "[auto-commit] 원격 저장소가 설정되지 않았습니다. 커밋만 완료했습니다."
    echo "  원격 추가: git remote add origin <URL>"
fi

echo "[auto-commit] 완료: $COMMIT_MSG"
