# 자동 커밋·푸시 가이드

## 스크립트 위치

```
scripts/
├── auto-commit.sh   ← macOS / Linux / Git Bash (Windows)
└── auto-commit.bat  ← Windows 명령 프롬프트
```

---

## 즉시 실행

### Windows — 명령 프롬프트 (cmd)

```cmd
cd C:\Users\user\Desktop\isaac\workspace\vibe-game
scripts\auto-commit.bat
scripts\auto-commit.bat "feat: 새 캐릭터 추가"
```

### Windows — Git Bash / PowerShell / WSL

```bash
cd /c/Users/user/Desktop/isaac/workspace/vibe-game
bash scripts/auto-commit.sh
bash scripts/auto-commit.sh "feat: 새 캐릭터 추가"
```

---

## 동작 방식

1. `git status`로 변경 파일 확인 → 없으면 종료
2. 메시지 없이 실행 시 → 변경 파일 목록 기반 자동 메시지 생성
3. `git add -A` → `git commit` → `git push`
4. 원격 저장소 미설정 시 커밋만 수행

---

## 원격 저장소 연결 (GitHub 기준)

```bash
# 1. GitHub에서 빈 저장소 생성 후 URL 복사

# 2. 원격 추가
git remote add origin https://github.com/사용자명/vibe-game.git

# 3. 최초 푸시
git push -u origin main

# 4. 이후 자동 커밋·푸시
bash scripts/auto-commit.sh
```

---

## 주기적 자동 커밋 설정

### Windows 작업 스케줄러 (Task Scheduler)

1. `Win + R` → `taskschd.msc` 실행
2. 오른쪽 패널 **작업 만들기** 클릭
3. **트리거 탭** → 새로 만들기 → 반복 간격 설정 (예: 1시간마다)
4. **동작 탭** → 새로 만들기
   - 프로그램: `cmd.exe`
   - 인수: `/c scripts\auto-commit.bat "chore: scheduled auto-commit"`
   - 시작 위치: `C:\Users\user\Desktop\isaac\workspace\vibe-game`

### Git Hook 방식 (수동 저장 시 자동 커밋)

VS Code 저장 시 자동 커밋은 Hook이 아닌 VS Code Task로 구현합니다:

`.vscode/tasks.json` 생성:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Auto Commit",
      "type": "shell",
      "command": "bash scripts/auto-commit.sh",
      "group": "build",
      "presentation": { "reveal": "silent" }
    }
  ]
}
```

`Ctrl+Shift+B`로 언제든지 실행 가능.

---

## Claude Code 훅 방식 (자동 커밋 자동화)

Claude Code가 파일을 수정한 후 자동으로 커밋하게 하려면:

```bash
# Claude Code 설정에서 PostToolUse 훅 등록
# (settings.json 또는 Claude Code 설정 파일)
```

또는 Claude에게 직접 요청:

> "파일 수정이 끝나면 자동으로 커밋해줘"

---

## 주의사항

- `.env`, 시크릿 파일이 `.gitignore`에 포함되어 있는지 확인
- `git add -A`는 모든 변경·추가·삭제를 포함하므로 민감한 파일 주의
- 강제 푸시(`push --force`)는 스크립트에 포함되지 않음
