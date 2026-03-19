# Chronicles of Eternity — 설계 및 기획 문서

> 버전: v0.1.0 ALPHA
> 최종 수정: 2026-03-19

---

## 1. 프로젝트 비전

### 1.1 목표

- **외부 라이브러리 없는** 순수 Vanilla JS + HTML5 Canvas 게임 엔진 구현
- 다양한 캐릭터 클래스와 플레이 스타일로 **리플레이 가치** 확보
- 브라우저에서 **즉시 실행 가능**한 진입 장벽 없는 경험

### 1.2 핵심 가치

| 가치 | 구현 방향 |
|------|----------|
| 다양성 | 19종 캐릭터, 클래스별 차별화된 스킬 |
| 즉각성 | 빌드 없이 브라우저 오픈만으로 플레이 |
| 확장성 | 모듈 분리 설계, 스테이지·캐릭터 추가 용이 |
| 시각적 피드백 | 파티클, 이펙트, 화면 흔들기, 데미지 텍스트 |

---

## 2. 아키텍처 설계

### 2.1 모듈 구조

```
┌─────────────────────────────────────────────────┐
│                   index.html                     │
│         (화면 레이아웃 + 스크립트 로드)           │
└───────────┬──────────────┬──────────────────────┘
            │              │
    ┌───────▼──────┐ ┌─────▼──────────┐
    │  GameManager │ │  CharacterSelect│
    │  (main.js)   │ │  (screens/)     │
    │              │ │                 │
    │  - 화면 전환  │ │  - 그리드 렌더  │
    │  - 모달      │ │  - 필터/선택    │
    │  - 타이틀FX  │ │  - 상세 패널    │
    └───────┬──────┘ └─────────────────┘
            │
    ┌───────▼──────────────────────────────────────┐
    │                  GameEngine                   │
    │               (game/gameEngine.js)            │
    │                                               │
    │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
    │  │   Map    │ │  Player  │ │   Monsters   │  │
    │  │ Generate │ │  Update  │ │   AI (8종)   │  │
    │  └──────────┘ └──────────┘ └──────────────┘  │
    │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
    │  │Projectile│ │ Particle │ │   Effects    │  │
    │  │  System  │ │  System  │ │   System     │  │
    │  └──────────┘ └──────────┘ └──────────────┘  │
    │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
    │  │  Camera  │ │   HUD    │ │   Minimap    │  │
    │  │  (Lerp)  │ │  Update  │ │   Canvas     │  │
    │  └──────────┘ └──────────┘ └──────────────┘  │
    └───────────────────────────────────────────────┘
```

### 2.2 게임 루프 흐름

```
init(charId)
  │
  ├── spawnPlayer(charId)    캐릭터 스탯 초기화
  ├── initStage(1)           맵 생성 + 몬스터 스폰
  └── loop(ts)               rAF 시작
        │
        ├── update(dt)
        │     ├── updatePlayer(dt)       이동·MP재생·상태이상
        │     ├── updateMonsters(dt)     AI 실행·HP재생·사망처리
        │     ├── updateProjectiles(dt)  충돌 감지
        │     ├── updateParticles(dt)    물리 시뮬레이션
        │     ├── updateEffects(dt)      이펙트 수명
        │     ├── updateCamera()         Lerp 추적
        │     ├── updateHUD()            DOM 업데이트
        │     └── updateSkillUI()        쿨타임 표시
        │
        └── renderFrame()
              ├── renderMap()
              ├── renderEffectsBehind()
              ├── renderParticles()
              ├── renderMonsters()
              ├── renderProjectiles()
              ├── renderPlayerV2()
              ├── renderEffectsFront()
              └── drawMinimap()
```

### 2.3 화면 상태 기계 (Screen State Machine)

```
         [시작]
           │
    ┌──────▼──────┐
    │    title    │ ← showTitle()
    └──────┬──────┘
           │ 새 게임 클릭
    ┌──────▼──────────┐
    │ character-select │ ← CharacterSelect.init()
    └──────┬──────────┘
           │ 시작 클릭
    ┌──────▼──────┐
    │    game     │ ← GameEngine.init(charId)
    │             │
    │  playing ──→│──→ stage-clear ──→ playing (next)
    │             │          └──→ character-select
    │  gameover   │          └──→ title
    └──────┬──────┘
           │ 메뉴 클릭 / 게임오버
    ┌──────▼──────┐
    │    title    │
    └─────────────┘
```

---

## 3. 데이터 설계

### 3.1 캐릭터 데이터 구조

```javascript
{
  id: string,           // 고유 식별자 (예: 'swordsman')
  name: string,         // 한국어 이름
  engName: string,      // 영어 이름
  gender: 'male'|'female',
  type: 'physical'|'magic'|'support'|'hybrid'|'dark'|'tech',
  weapon: string,       // 무기 설명
  emoji: string,        // 캐릭터 선택 카드 대표 이모지
  bodyEmoji: string,    // 게임 내 몸체 이모지
  weaponEmoji: string,  // 게임 내 무기 이모지
  color: string,        // 캐릭터 테마 색상 (hex)
  description: string,  // 캐릭터 설명
  stats: {              // UI 표시용 (0~100 퍼센트)
    hp, mp, atk, matk, def, spd, crit
  },
  skills: [             // 4개 스킬 정의
    { name, icon, desc, key: 'Z'|'X'|'C'|'V' }
  ],
  baseStats: {          // 게임 내 실제 수치
    maxHp, maxMp, atk, matk, def, spd, crit
  }
}
```

### 3.2 플레이어 런타임 객체

```javascript
player = {
  charData,             // 원본 캐릭터 데이터 참조
  x, y, r,             // 위치, 반지름
  speed,               // 실제 이동속도 (spd × 1.14)
  hp, maxHp,           // 현재/최대 HP
  mp, maxMp,           // 현재/최대 MP
  atk, matk, def, crit,// 전투 스탯
  level, exp, expMax,  // 레벨 시스템
  facing,              // 방향 (1: 우, -1: 좌)
  state,               // 'idle' | 'run' | 'attack' | 'dead'
  stateTimer,          // 상태 지속 타이머
  invincible,          // 무적 잔여 시간 (초)
  hitFlash,            // 피격 플래시 타이머
  mpRegenTimer,        // MP 재생 타이머
  buffAtk,             // 공격력 버프 배율
  buffTimer,           // 버프 잔여 시간
  poisoned,            // 독 피해량 (0이면 미중독)
  poisonTimer,         // 독 틱 타이머
}
```

### 3.3 몬스터 런타임 객체

```javascript
{
  // MON_TYPES 원본 필드 복사
  name, emoji, color,
  hp, maxHp, atk, def, spd, r, exp,
  behavior,            // AI 패턴 종류
  x, y,               // 위치
  aggro, aggroRange,  // 어그로 상태
  attackRange, attackCd,// 공격 범위, 쿨타임
  hitFlash, id,       // 렌더링용
  isBoss,             // 보스 여부
  // 차지 AI용
  chargePhase,        // 'idle' | 'telegraph' | 'charging'
  chargeTelegraph,    // 예고 타이머
  chargeTarget,       // 돌진 목표 좌표
  // 지그재그 AI용
  zigzagAngle, zigzagTimer,
  // 텔레포트 AI용
  tpTimer,
}
```

### 3.4 스테이지 상태

```javascript
stage = {
  number,              // 스테이지 번호
  kills,               // 현재 처치 수
  targetKills,         // 클리어 목표 (보스 처치 후)
  bossSpawnKills,      // 보스 소환 트리거 처치 수
  bossSpawned,         // 보스 소환 여부
  bossDefeated,        // 보스 처치 여부
  completed,           // 스테이지 완료 여부
  clearShown,          // 클리어 오버레이 표시 여부
}
```

---

## 4. 전투 시스템 설계

### 4.1 데미지 공식

```
물리 피해 = max(1, ATK × 스킬배율 × 버프배율 - DEF × 0.3)
마법 피해 = max(1, MATK × 스킬배율 - DEF × 0.15)  ※ 마법은 방어 감소 경감
크리티컬  = 피해 × 2.3  (crit 확률로 판정, 소수 0.0~1.0)
```

### 4.2 스킬 설계 원칙

| 슬롯 | 역할 | 쿨타임 | MP | 예시 |
|------|------|--------|-----|------|
| Z (기본) | 주된 딜링 도구 | 짧음 (0.28s) | 8 | 베기, 마법탄 |
| X (스킬2) | 기동기 또는 광역 | 중간 (1.5s) | 25 | 돌진, 3방향 투사체 |
| C (스킬3) | 유틸리티 | 길다 (3.0s) | 40 | 회복, 콤보, 무적 |
| V (궁극) | 판도를 바꾸는 기술 | 매우 길다 (8.0s) | 80 | 광역 폭발, 8방향 공격 |

### 4.3 캐릭터 타입별 C 스킬 오버라이드

근접 계열 8종(`swordsman`, `berserker`, `paladin`, `darkknight`, `fighter`, `assassin`, `ninja`, `bladedancer`)은 C 스킬이 **Blade Rush** (4연타 + 무적 0.8초)로 대체됩니다.

### 4.4 넉백 시스템

| 상황 | 넉백 거리 |
|------|----------|
| 몬스터 일반 공격 피격 | 70 px |
| 보스 근접 공격 피격 | 120 px |
| 보스 돌진 피격 | 130 px |
| 투사체 피격 | 55 px |
| 플레이어 공격 → 몬스터 | 50 px |

---

## 5. 맵 생성 알고리즘

### 5.1 절차적 맵 (Procedural Map)

```
1. 38×30 격자 초기화
2. 외곽(엣지) → 무조건 벽(1)
3. 내부 → 7% 확률로 벽(1), 나머지 바닥(0)
4. 시작 지점(3,3) 주변 7×7 클리어 (벽 제거)
5. 4% 확률로 바닥에 장식 데칼 배치 (🕯️💎🪨)
```

### 5.2 충돌 감지 (AABB 근사)

```javascript
// 엔티티의 4방향 코너가 벽 타일과 겹치는지 확인
wouldCollide(x, y, r) {
  corners = [(-1,-1), (1,-1), (-1,1), (1,1)]
  return corners.some(corner =>
    isSolid(floor((x + corner.x * r) / TILE),
            floor((y + corner.y * r) / TILE))
  )
}
```

---

## 6. 몬스터 AI 설계

### 6.1 AI 패턴 상태 전환

```
[어그로 해제]
    └→ 어그로 범위 진입 시 aggro = true

[기본 추격] (split / flee / tank / regen)
    └→ 공격 범위 내 → tryMeleeAttack()
    └→ flee: HP < 25% → 후퇴

[돌진 패턴] (charge / boss 일부)
    idle → telegraph(0.8s 예고) → charging → idle
    └→ 돌진 중 벽 충돌 시 idle로 복귀

[원거리 패턴] (ranged / teleport / boss 일부)
    └→ 선호 거리 유지 (가까우면 후퇴, 멀면 접근)
    └→ 사거리 내 → 투사체 발사

[무리 패턴] (swarm)
    └→ 지그재그 이동으로 예측 어렵게

[텔레포트 패턴] (teleport)
    └→ 3초마다 플레이어 주변 100~180px로 순간이동
    └→ 원거리 마법 공격

[보스 AI] (boss)
    HP ≥ 45%: 근접 접근 → 돌진 or 원거리 교체
    HP < 45%: 5방향 산탄 + 빠른 추격
```

### 6.2 보스 스폰 조건

```
kills >= bossSpawnKills = 14 + stageNumber × 4
```

---

## 7. 렌더링 설계

### 7.1 레이어 순서

```
Layer 0: 맵 타일 (바닥, 벽, 데칼)
Layer 1: 바닥 이펙트 (explosion, dash_trail, telegraph)
Layer 2: 파티클
Layer 3: 몬스터
Layer 4: 투사체 (+ 트레일)
Layer 5: 플레이어 (벡터 + 무기 이모지)
Layer 6: 전면 이펙트 (slash, magic_ring, shockwave, heal_burst)
Layer 7: 미니맵 (별도 Canvas)
Layer 8: HUD DOM (CSS 오버레이)
Layer 9: 데미지 텍스트 (절대 위치 DOM)
```

### 7.2 카메라

```javascript
// Lerp 계수 0.13 (1 = 즉각 추적, 0 = 고정)
// 낮을수록 부드럽지만 지연 증가
camera.x += (target.x - W/2 - camera.x) * 0.13;
```

### 7.3 플레이어 벡터 렌더링 (renderCharacterBody)

```
[머리] → 원형 (accent 색상) + 외곽선 (primary 색상)
[몸통] → 둥근 사각형 (primary 색상)
[망토] → 곡선 패스 (cloak 색상)
[팔/다리] → 선분 (runCycle로 흔들림)
[흉갑] → 다이아몬드 모양 (armor 색상)
[눈/입] → 작은 원, 호 선분
[장식] → 머리 위 곡선 (accent, 시간에 따라 흔들림)
```

---

## 8. 이펙트 시스템

### 8.1 이펙트 타입

| 타입 | 설명 | 사용 시점 |
|------|------|----------|
| `slash` | 호 모양 베기 이펙트 | 근접 공격 |
| `magic_ring` | 팽창하는 마법 원 | 마법 공격 |
| `explosion` | 방사형 폭발 | 몬스터 사망, 투사체 충돌 |
| `shockwave` | 팽창 충격파 원 | 레벨업, 궁극기, 스테이지 클리어 |
| `heal_burst` | 녹색 회복 방사 | 힐 스킬 |
| `dash_trail` | 대시 방향 선 | 돌진 스킬 |
| `telegraph` | 점선 예고 | 몬스터 돌진 예고 |

### 8.2 이펙트 수명 관리

```javascript
// 매 프레임 수명 감소, 0 이하 제거
effects = effects.filter(e => { e.life -= dt; return e.life > 0; });
```

---

## 9. UI/UX 설계

### 9.1 HUD 레이아웃

```
┌─────────────────────────────────────────────────────┐
│ [플레이어 정보]                    [레벨 · EXP바]  │
│  Avatar | Name                     Lv.X [===   ]   │
│  [HP ========       ] 800/1200     [스테이지 정보]  │
│  [MP ====           ] 300/1000                      │
│                                                     │
│                  [게임 화면]                        │
│                                                     │
│ [조작 안내]      [스킬 슬롯 Z X C V]   [미니맵]    │
│                  [스킬 툴팁]                        │
└─────────────────────────────────────────────────────┘
```

### 9.2 캐릭터 선택 화면

```
┌──────────────────────────────────────────────┐
│  [뒤로]         캐릭터 선택           [시작] │
│  ┌──────────────────┬────────────────────┐   │
│  │  [전체] [♂] [♀] │   상세 패널         │   │
│  │                  │   이모지 · 이름     │   │
│  │  [카드] [카드]   │   [타입 배지]       │   │
│  │  [카드] [카드]   │   스탯 바           │   │
│  │  [카드] [카드]   │   스킬 목록         │   │
│  │  ...             │   설명              │   │
│  └──────────────────┴────────────────────┘   │
└──────────────────────────────────────────────┘
```

### 9.3 데미지 텍스트 색상 코드

| 타입 | 색상 | 예시 |
|------|------|------|
| normal | 흰색 | `150` |
| critical | 주황색 | `345 🔥` |
| magic | 보라색 | `220` |
| heal | 녹색 | `+180 회복!` |
| miss | 회색 | `MP 부족!` |

---

## 10. 밸런스 설계

### 10.1 캐릭터 분류

| 등급 | 특징 | 해당 클래스 |
|------|------|------------|
| 초보 친화 | 안정적, 배우기 쉬움 | 검사, 성녀 |
| 중급 | 특화된 강점, 단점 관리 필요 | 대부분 |
| 고급 | 하이리스크 하이리턴 | 버서커, 다크나이트, 암살자 |

### 10.2 스테이지 난이도 스케일링

```
초기 몬스터 수  = 14 + stageNumber × 2
보스 소환 조건 = 14 + stageNumber × 4  처치

몬스터 수가 12 미만이면 추가 스폰 (보스 소환 전)
```

### 10.3 경험치 요구량

```
Level 1→2: 120 EXP
Level 2→3: 168 EXP (×1.4)
Level 3→4: 235 EXP
...
Level n→n+1: 120 × 1.4^(n-1) EXP
```

---

## 11. 기술 부채 및 개선 사항

| 항목 | 우선순위 | 설명 |
|------|---------|------|
| 세이브/로드 | 높음 | localStorage 활용 진행 상황 저장 |
| 사운드 시스템 | 중간 | Web Audio API 기반 효과음 |
| 모바일 지원 | 중간 | 터치 컨트롤, 가상 조이스틱 |
| 맵 다양성 | 중간 | 던전 방 연결 구조, 테마별 타일셋 |
| 슬라임 분열 버그 | 낮음 | `hp_original_for_split` 조건 미완성 |
| 인벤토리 | 낮음 | 아이템·장비 시스템 |
| 스킬 강화 | 낮음 | 레벨업 시 스킬 선택 강화 |
| 렌더링 최적화 | 낮음 | 뷰포트 외 엔티티 업데이트 스킵 |

---

## 12. 용어 사전

| 용어 | 설명 |
|------|------|
| TILE | 타일 크기 (64px) |
| MAP_W / MAP_H | 맵 너비/높이 (38×30 타일) |
| rAF | requestAnimationFrame |
| dt | Delta Time (프레임 간 경과 시간, 초) |
| Lerp | 선형 보간 (Linear Interpolation) |
| Telegraph | 몬스터 돌진 예고 (점선 표시) |
| aggro | 몬스터가 플레이어를 추적하는 상태 |
| baseStats | 게임 내 실제 수치 (vs `stats`: UI 퍼센트 수치) |
| isMeleeStyle | 근접 계열 8종 판별 (C 스킬 Blade Rush 적용) |
