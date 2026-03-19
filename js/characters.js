/**
 * Chronicles of Eternity — Character Database v2
 *
 * 역할:
 *  - 19종 플레이어 캐릭터의 모든 데이터를 정의한다.
 *  - bodyEmoji(게임 내 몸체)와 weaponEmoji(무기)를 분리해
 *    게임 내 이중 이모지 렌더링을 지원한다.
 *
 * 데이터 구조:
 *  - stats: UI 캐릭터 선택 화면 표시용 (0~100 퍼센트 수치)
 *  - baseStats: GameEngine에서 사용하는 실제 게임 수치
 *  - skills: Z/X/C/V 4개 슬롯 스킬 정의
 *
 * 외부 접근:
 *  - CHARACTERS    전체 캐릭터 배열
 *  - TYPE_NAMES    타입 코드 → 한국어 이름 맵
 *  - getCharById(id)      ID로 단일 캐릭터 조회
 *  - getCharsByGender(g)  성별 필터 조회
 */

/** 캐릭터 타입 코드 → 표시 이름 매핑 */
const TYPE_NAMES = {
    physical: '물리',
    magic:    '마법',
    support:  '지원',
    hybrid:   '혼합',
    dark:     '암흑',
    tech:     '기계',
};

/**
 * 전체 캐릭터 데이터베이스
 * 각 항목 구조:
 * @typedef {Object} CharacterData
 * @property {string}   id          - 고유 식별자
 * @property {string}   name        - 한국어 이름
 * @property {string}   engName     - 영어 이름
 * @property {'male'|'female'} gender
 * @property {'physical'|'magic'|'support'|'hybrid'|'dark'|'tech'} type
 * @property {string}   weapon      - 무기 설명
 * @property {string}   emoji       - 캐릭터 선택 카드 대표 이모지
 * @property {string}   bodyEmoji   - 게임 내 몸체 이모지
 * @property {string}   weaponEmoji - 게임 내 무기 이모지
 * @property {string}   color       - 테마 색상 (hex)
 * @property {string}   description - 캐릭터 설명
 * @property {Object}   stats       - UI용 스탯 (0~100)
 * @property {Array}    skills      - 스킬 정의 배열
 * @property {Object}   baseStats   - 엔진 실제 수치
 */
const CHARACTERS = [
    /* ============================================================
       남성 캐릭터 (10)
    ============================================================ */

    /**
     * 검사 (Swordsman) — 물리 / 균형형
     * 초보자 추천 캐릭터. 균형 잡힌 스탯으로 어떤 상황에서도 안정적.
     */
    {
        id: 'swordsman', name: '검사', engName: 'Swordsman',
        gender: 'male', type: 'physical', weapon: '검',
        emoji: '⚔️',          // 캐릭터 선택 카드용
        bodyEmoji: '🧑',      // 게임 내 몸체
        weaponEmoji: '⚔️',    // 게임 내 무기
        color: '#e67e22',
        description: '전통적인 근접 전투의 달인. 균형 잡힌 스탯으로 어떤 상황에서도 안정적인 딜링을 보여준다. 초보자에게 추천.',
        stats: { hp: 85, mp: 40, atk: 80, matk: 20, def: 65, spd: 60, crit: 50 },
        skills: [
            { name: '기본 베기',  icon: '⚔️', desc: '빠른 검격. 쿨타임 없음.',           key: 'Z' },
            { name: '연속 베기',  icon: '🌀', desc: '3회 연속 공격. 마지막 충격파.',      key: 'X' },
            { name: '방어 자세',  icon: '🛡️', desc: '1.5초간 피해 60% 감소.',            key: 'C' },
            { name: '검기 방출',  icon: '💥', desc: '관통 검기 발사.',                    key: 'V' },
        ],
        baseStats: { maxHp: 1200, maxMp: 300, atk: 85, matk: 15, def: 60, spd: 160, crit: 0.15 },
    },

    /**
     * 버서커 (Berserker) — 물리 / 하이리스크형
     * HP가 낮을수록 더욱 강해지는 광전사. 고위험 고보상.
     */
    {
        id: 'berserker', name: '버서커', engName: 'Berserker',
        gender: 'male', type: 'physical', weapon: '대도끼',
        emoji: '🪓', bodyEmoji: '😤', weaponEmoji: '🪓', color: '#c0392b',
        description: '분노와 광기로 싸우는 광전사. HP가 낮을수록 더욱 강해진다. 하이 리스크 하이 리턴.',
        stats: { hp: 100, mp: 20, atk: 100, matk: 10, def: 40, spd: 55, crit: 60 },
        skills: [
            { name: '대도끼 강타',  icon: '🪓', desc: '강력한 내리치기. 200% 데미지.',    key: 'Z' },
            { name: '광전사 질주',  icon: '💨', desc: '돌진 후 충격파.',                   key: 'X' },
            { name: '분노 해방',    icon: '🔥', desc: '공격력 50% 증가 (10초)',            key: 'C' },
            { name: '절망의 일격',  icon: '💢', desc: 'HP 낮을수록 강한 일격.',             key: 'V' },
        ],
        baseStats: { maxHp: 1600, maxMp: 150, atk: 110, matk: 10, def: 40, spd: 155, crit: 0.25 },
    },

    /**
     * 성기사 (Paladin) — 혼합 / 탱커
     * 최고 수준의 방어력 + 신성 마법 겸비. 언데드에 특화.
     */
    {
        id: 'paladin', name: '성기사', engName: 'Paladin',
        gender: 'male', type: 'hybrid', weapon: '검+방패',
        emoji: '🛡️', bodyEmoji: '👼', weaponEmoji: '🛡️', color: '#2980b9',
        description: '빛의 기사. 강력한 방어와 신성 마법을 겸비한 탱커.',
        stats: { hp: 95, mp: 60, atk: 60, matk: 55, def: 95, spd: 45, crit: 30 },
        skills: [
            { name: '신성한 일격',  icon: '✨', desc: '빛 속성 공격. 언데드 2배.',         key: 'Z' },
            { name: '신의 방패',    icon: '🛡️', desc: '2초간 무적 상태.',                  key: 'X' },
            { name: '성스러운 빛',  icon: '💫', desc: '주변 적에게 신성 피해.',             key: 'C' },
            { name: '심판의 망치',  icon: '⚡', desc: '강력한 신성 폭발. 광역.',           key: 'V' },
        ],
        baseStats: { maxHp: 1400, maxMp: 500, atk: 60, matk: 55, def: 85, spd: 145, crit: 0.10 },
    },

    /**
     * 다크나이트 (Dark Knight) — 암흑 / HP 소모형
     * HP를 희생해 강력한 암흑 마법을 사용하는 위험한 기사.
     */
    {
        id: 'darkknight', name: '다크나이트', engName: 'Dark Knight',
        gender: 'male', type: 'dark', weapon: '암흑검',
        emoji: '🗡️', bodyEmoji: '😈', weaponEmoji: '🗡️', color: '#8e44ad',
        description: '어둠과 계약한 기사. HP를 소모해 강력한 암흑 마법 사용. 하이 리스크 하이 리턴.',
        stats: { hp: 80, mp: 70, atk: 85, matk: 70, def: 55, spd: 60, crit: 55 },
        skills: [
            { name: '암흑 베기',   icon: '🗡️', desc: '암흑 속성 연속 공격.',              key: 'Z' },
            { name: '죽음의 낫',   icon: '💀', desc: '거대한 에너지 낫. 넓은 범위.',      key: 'X' },
            { name: '생명 흡수',   icon: '🩸', desc: '적 HP 흡수.',                        key: 'C' },
            { name: '암흑 해방',   icon: '🌑', desc: 'HP 희생 후 폭발적 암흑 방출.',      key: 'V' },
        ],
        baseStats: { maxHp: 1100, maxMp: 600, atk: 85, matk: 70, def: 50, spd: 160, crit: 0.20 },
    },

    /**
     * 격투가 (Fighter) — 물리 / 속도형
     * 맨손 5회 연타와 빠른 콤보가 특기. 높은 크리티컬.
     */
    {
        id: 'fighter', name: '격투가', engName: 'Fighter',
        gender: 'male', type: 'physical', weapon: '너클',
        emoji: '👊', bodyEmoji: '🧑', weaponEmoji: '👊', color: '#f39c12',
        description: '맨몸으로 싸우는 전투의 달인. 빠른 연타와 콤보 공격이 특기.',
        stats: { hp: 80, mp: 35, atk: 85, matk: 15, def: 60, spd: 90, crit: 65 },
        skills: [
            { name: '연타',        icon: '👊', desc: '빠른 5회 연타.',                     key: 'Z' },
            { name: '어퍼컷',      icon: '💥', desc: '적 공중으로 날림.',                  key: 'X' },
            { name: '회전 킥',     icon: '🌀', desc: '주변 적 모두 공격.',                 key: 'C' },
            { name: '기공 해방',   icon: '⚡', desc: '기를 모아 에너지 파 발사.',          key: 'V' },
        ],
        baseStats: { maxHp: 1100, maxMp: 250, atk: 90, matk: 15, def: 55, spd: 185, crit: 0.30 },
    },

    /**
     * 건슬링거 (Gunslinger) — 물리 / 원거리
     * 쌍권총 연사와 관통탄. 가장 빠른 이동속도 중 하나.
     */
    {
        id: 'gunslinger', name: '건슬링거', engName: 'Gunslinger',
        gender: 'male', type: 'physical', weapon: '쌍권총',
        emoji: '🔫', bodyEmoji: '🤠', weaponEmoji: '🔫', color: '#f1c40f',
        description: '두 자루 권총을 든 총잡이. 빠른 연사와 날카로운 반사신경이 장점.',
        stats: { hp: 70, mp: 40, atk: 80, matk: 20, def: 45, spd: 85, crit: 70 },
        skills: [
            { name: '연사',        icon: '🔫', desc: '빠른 3연속 발사.',                   key: 'Z' },
            { name: '관통탄',      icon: '💫', desc: '관통하는 탄환.',                      key: 'X' },
            { name: '구르기',      icon: '💨', desc: '굴러서 회피. 무적 발생.',             key: 'C' },
            { name: '풀버스트',    icon: '💥', desc: '전탄 발사. 광역 + 크리.',             key: 'V' },
        ],
        baseStats: { maxHp: 950, maxMp: 300, atk: 80, matk: 20, def: 40, spd: 190, crit: 0.35 },
    },

    /**
     * 암살자 (Assassin) — 물리 / 크리티컬 특화
     * 게임 최고 크리티컬(45%). 은신 중 다음 공격은 크리 확정.
     */
    {
        id: 'assassin', name: '암살자', engName: 'Assassin',
        gender: 'male', type: 'physical', weapon: '단검',
        emoji: '🔪', bodyEmoji: '🥷', weaponEmoji: '🔪', color: '#7f8c8d',
        description: '그림자의 암살자. 압도적인 속도와 크리티컬로 한 방에 적을 쓰러뜨린다.',
        stats: { hp: 65, mp: 45, atk: 90, matk: 25, def: 40, spd: 100, crit: 90 },
        skills: [
            { name: '빠른 찌르기',  icon: '🔪', desc: '초고속 찌르기. 높은 크리티컬.',   key: 'Z' },
            { name: '은신',         icon: '👻', desc: '2초 은신. 다음 공격 크리 확정.',    key: 'X' },
            { name: '독 단검',      icon: '☠️', desc: '독 바른 단검 투척.',               key: 'C' },
            { name: '죽음의 춤',    icon: '💃', desc: '극도로 빠른 다중 찌르기.',         key: 'V' },
        ],
        baseStats: { maxHp: 800, maxMp: 350, atk: 95, matk: 25, def: 35, spd: 210, crit: 0.45 },
    },

    /**
     * 마법사 (Wizard) — 마법 / 광역 폭딜
     * 최고 마법 공격력. 파이어볼~메테오까지 다양한 원소 마법.
     */
    {
        id: 'wizard', name: '마법사', engName: 'Wizard',
        gender: 'male', type: 'magic', weapon: '스태프',
        emoji: '🧙', bodyEmoji: '🧙', weaponEmoji: '🪄', color: '#9b59b6',
        description: '고대 마법을 연구한 현자. 압도적인 마법 공격력으로 적을 초토화한다.',
        stats: { hp: 55, mp: 100, atk: 20, matk: 100, def: 35, spd: 55, crit: 60 },
        skills: [
            { name: '파이어볼',   icon: '🔥', desc: '불꽃 구체. 폭발 범위 피해.',          key: 'Z' },
            { name: '블리자드',   icon: '❄️', desc: '광역 얼음 폭풍. 이동속도 감소.',       key: 'X' },
            { name: '번개 사슬',  icon: '⚡', desc: '번개가 여러 적에게 튕김.',           key: 'C' },
            { name: '메테오',     icon: '☄️', desc: '거대한 운석 소환. 최고 광역.',        key: 'V' },
        ],
        baseStats: { maxHp: 700, maxMp: 1000, atk: 20, matk: 120, def: 30, spd: 155, crit: 0.25 },
    },

    /**
     * 소환사 (Summoner) — 마법 / 소환형
     * 다양한 소환수로 전장을 지배한다. 봉황이 궁극기.
     */
    {
        id: 'summoner', name: '소환사', engName: 'Summoner',
        gender: 'male', type: 'magic', weapon: '소환석',
        emoji: '🔮', bodyEmoji: '🧙', weaponEmoji: '🔮', color: '#6c5ce7',
        description: '이계의 존재를 소환하는 마법사. 다양한 소환수로 전장을 지배한다.',
        stats: { hp: 65, mp: 95, atk: 25, matk: 80, def: 40, spd: 50, crit: 40 },
        skills: [
            { name: '소환수 공격',      icon: '🔮', desc: '소환수 공격 명령.',           key: 'Z' },
            { name: '불꽃 정령 소환',   icon: '🔥', desc: '강력한 불꽃 정령 소환.',      key: 'X' },
            { name: '얼음 골렘 소환',   icon: '🧊', desc: '탱킹하는 얼음 골렘 소환.',    key: 'C' },
            { name: '봉황 강림',        icon: '🦅', desc: '전설의 봉황 소환. 광역 화염.', key: 'V' },
        ],
        baseStats: { maxHp: 850, maxMp: 900, atk: 25, matk: 85, def: 38, spd: 145, crit: 0.15 },
    },

    /**
     * 음유시인 (Bard) — 지원 / 버프·힐형
     * 음악으로 아군을 강화한다. 전투의 노래(ATK 30% 버프)가 핵심.
     */
    {
        id: 'bard', name: '음유시인', engName: 'Bard',
        gender: 'male', type: 'support', weapon: '류트',
        emoji: '🎸', bodyEmoji: '🧑', weaponEmoji: '🎸', color: '#27ae60',
        description: '음악의 힘으로 싸우는 마법사. 회복과 버프로 전투를 지원한다.',
        stats: { hp: 70, mp: 90, atk: 40, matk: 65, def: 50, spd: 65, crit: 40 },
        skills: [
            { name: '음파 공격',    icon: '🎵', desc: '음파로 적 공격.',                 key: 'Z' },
            { name: '전투의 노래',  icon: '🎶', desc: '공격력 30% 증가 버프.',           key: 'X' },
            { name: '치유의 선율',  icon: '💚', desc: 'HP 회복 + 지속 회복.',             key: 'C' },
            { name: '파멸의 연주',  icon: '🎼', desc: '강력한 음파 폭발. 광역 기절.',   key: 'V' },
        ],
        baseStats: { maxHp: 950, maxMp: 800, atk: 40, matk: 65, def: 45, spd: 165, crit: 0.15 },
    },

    /* ============================================================
       여성 캐릭터 (9)
    ============================================================ */

    /**
     * 마녀 (Witch) — 마법 / 독·저주 디버프형
     * 디버프와 지속 피해로 적을 서서히 죽인다.
     */
    {
        id: 'witch', name: '마녀', engName: 'Witch',
        gender: 'female', type: 'magic', weapon: '빗자루+스태프',
        emoji: '🧙‍♀️', bodyEmoji: '🧙‍♀️', weaponEmoji: '🧹', color: '#a855f7',
        description: '저주와 독 계열 마법에 특화. 디버프와 지속 피해로 적을 서서히 죽인다.',
        stats: { hp: 60, mp: 95, atk: 20, matk: 90, def: 35, spd: 70, crit: 70 },
        skills: [
            { name: '독 마법',       icon: '🧪', desc: '독 구체. 지속 독 피해.',          key: 'Z' },
            { name: '저주',          icon: '💜', desc: '적 방어+속도 30% 감소.',           key: 'X' },
            { name: '빗자루 타격',   icon: '💫', desc: '넓게 휘두르기. 범위 공격.',       key: 'C' },
            { name: '마녀의 가마솥', icon: '🫕', desc: '광역 폭발. 독+화염 복합.',       key: 'V' },
        ],
        baseStats: { maxHp: 750, maxMp: 950, atk: 20, matk: 105, def: 30, spd: 170, crit: 0.30 },
    },

    /**
     * 정령술사 (Elementalist) — 마법 / 원소 조합형
     * 4원소(화·수·풍·지)를 순환하며 상황에 맞는 전략을 구사한다.
     * 최고 마법 공격력(125).
     */
    {
        id: 'elementalist', name: '정령술사', engName: 'Elementalist',
        gender: 'female', type: 'magic', weapon: '원소 스태프',
        emoji: '🌟', bodyEmoji: '👩', weaponEmoji: '💫', color: '#3498db',
        description: '4원소를 자유자재로 다루는 마법사. 원소 조합에 따라 다양한 전략.',
        stats: { hp: 58, mp: 100, atk: 15, matk: 100, def: 32, spd: 60, crit: 55 },
        skills: [
            { name: '원소 발사',  icon: '🌟', desc: '현재 원소로 공격.',                 key: 'Z' },
            { name: '원소 변환',  icon: '🔄', desc: '화→수→풍→지 원소 순환.',           key: 'X' },
            { name: '원소 폭발',  icon: '💥', desc: '현재 원소의 강력한 폭발.',          key: 'C' },
            { name: '원소 융합',  icon: '🌈', desc: '4원소 동시 발동. 최강의 마법.',     key: 'V' },
        ],
        baseStats: { maxHp: 700, maxMp: 1100, atk: 15, matk: 125, def: 28, spd: 160, crit: 0.20 },
    },

    /**
     * 성녀 (Healer) — 지원 / 회복 특화
     * 강력한 HP 회복과 보호막. 장기전에서 탁월하다.
     */
    {
        id: 'healer', name: '성녀', engName: 'Healer',
        gender: 'female', type: 'support', weapon: '성스러운 스태프',
        emoji: '💊', bodyEmoji: '👩', weaponEmoji: '✨', color: '#2ecc71',
        description: '빛의 치유사. 회복과 보호에 특화. 강력한 버프로 장기전에서 빛을 발한다.',
        stats: { hp: 75, mp: 100, atk: 25, matk: 55, def: 60, spd: 55, crit: 25 },
        skills: [
            { name: '신성 공격',    icon: '✨', desc: '빛 속성 공격.',                   key: 'Z' },
            { name: '치유의 빛',    icon: '💚', desc: 'HP 대량 회복.',                   key: 'X' },
            { name: '빛의 보호막',  icon: '🛡️', desc: '3초간 피해 흡수 보호막.',        key: 'C' },
            { name: '부활의 기적',  icon: '🌟', desc: '큰 HP 회복 + 전체 버프.',        key: 'V' },
        ],
        baseStats: { maxHp: 1050, maxMp: 1000, atk: 25, matk: 55, def: 55, spd: 155, crit: 0.08 },
    },

    /**
     * 드루이드 (Druid) — 지원 / 자연·소환형
     * 자연 마법과 곰·나무 정령 소환으로 탱킹과 딜을 겸비한다.
     */
    {
        id: 'druid', name: '드루이드', engName: 'Druid',
        gender: 'female', type: 'support', weapon: '자연의 지팡이',
        emoji: '🌿', bodyEmoji: '👩', weaponEmoji: '🌿', color: '#1abc9c',
        description: '자연과 교감하는 숲의 수호자. 자연 마법과 동물 소환으로 전투한다.',
        stats: { hp: 78, mp: 85, atk: 30, matk: 72, def: 52, spd: 58, crit: 38 },
        skills: [
            { name: '덩굴 채찍',    icon: '🌿', desc: '덩굴로 적을 묶고 공격.',         key: 'Z' },
            { name: '자연 치유',    icon: '🍃', desc: '지속적인 HP 재생.',               key: 'X' },
            { name: '곰 소환',      icon: '🐻', desc: '전투 곰 소환해 돌격.',            key: 'C' },
            { name: '자연의 분노',  icon: '🌳', desc: '거대한 나무 정령 소환.',          key: 'V' },
        ],
        baseStats: { maxHp: 1050, maxMp: 750, atk: 30, matk: 75, def: 50, spd: 158, crit: 0.12 },
    },

    /**
     * 레인저 (Ranger) — 물리 / 원거리 다중 무기
     * 석궁과 권총을 번갈아 사용하는 정찰병. 덫 설치로 적을 기절.
     */
    {
        id: 'ranger', name: '레인저', engName: 'Ranger',
        gender: 'female', type: 'physical', weapon: '석궁+권총',
        emoji: '🏹', bodyEmoji: '👩', weaponEmoji: '🏹', color: '#16a085',
        description: '숲의 정찰병. 석궁과 권총을 번갈아 사용하는 원거리 전투 전문가.',
        stats: { hp: 72, mp: 50, atk: 82, matk: 28, def: 48, spd: 80, crit: 72 },
        skills: [
            { name: '정밀 사격',     icon: '🏹', desc: '정확한 단발 사격. 높은 크리.',  key: 'Z' },
            { name: '폭발 화살',     icon: '💥', desc: '폭발하는 화살. 범위 피해.',     key: 'X' },
            { name: '덫 설치',       icon: '⚙️', desc: '함정 설치. 밟으면 기절.',      key: 'C' },
            { name: '화살 폭격',     icon: '🌧️', desc: '광역에 화살 폭격.',            key: 'V' },
        ],
        baseStats: { maxHp: 950, maxMp: 400, atk: 85, matk: 28, def: 42, spd: 180, crit: 0.35 },
    },

    /**
     * 닌자 (Ninja) — 물리 / 최고속도·크리티컬
     * 분신술과 순간이동으로 적을 혼란에 빠뜨린다. 이동속도 1위(220).
     */
    {
        id: 'ninja', name: '닌자', engName: 'Ninja',
        gender: 'female', type: 'physical', weapon: '수리검+쿠나이',
        emoji: '🥷', bodyEmoji: '🥷', weaponEmoji: '⭐', color: '#636e72',
        description: '그림자의 전사. 초고속 이동과 분신술로 적을 혼란에 빠뜨린다.',
        stats: { hp: 68, mp: 55, atk: 88, matk: 22, def: 42, spd: 100, crit: 80 },
        skills: [
            { name: '수리검 투척',  icon: '⭐', desc: '수리검 다중 투척.',              key: 'Z' },
            { name: '분신술',       icon: '👥', desc: '분신 생성. 함께 공격.',          key: 'X' },
            { name: '순간이동',     icon: '💨', desc: '적 뒤로 순간이동 후 기습.',      key: 'C' },
            { name: '닌자 폭탄',    icon: '💣', desc: '폭발 닌자 폭탄 투척.',          key: 'V' },
        ],
        baseStats: { maxHp: 880, maxMp: 450, atk: 92, matk: 22, def: 38, spd: 220, crit: 0.40 },
    },

    /**
     * 검무사 (Blade Dancer) — 물리 / 화려한 연속기
     * 춤과 검술을 결합. 높은 크리티컬과 우아한 회피 카운터.
     */
    {
        id: 'bladedancer', name: '검무사', engName: 'Blade Dancer',
        gender: 'female', type: 'physical', weapon: '쌍검',
        emoji: '🌸', bodyEmoji: '💃', weaponEmoji: '🗡️', color: '#e91e8c',
        description: '우아한 춤과 검술을 결합한 전사. 화려한 연속 공격과 유려한 회피.',
        stats: { hp: 75, mp: 50, atk: 85, matk: 30, def: 52, spd: 92, crit: 78 },
        skills: [
            { name: '검의 춤',      icon: '💃', desc: '회전하며 쌍검 연타.',            key: 'Z' },
            { name: '우아한 회피',  icon: '🌸', desc: '화려하게 회피. 반격 카운터.',    key: 'X' },
            { name: '화려한 난무',  icon: '✨', desc: '빠른 난타. 다단히트.',            key: 'C' },
            { name: '피날레',       icon: '🌺', desc: '화려한 피니쉬. 거대한 피해.',    key: 'V' },
        ],
        baseStats: { maxHp: 1000, maxMp: 400, atk: 88, matk: 30, def: 48, spd: 200, crit: 0.38 },
    },

    /**
     * 메카닉 (Mechanic) — 기계 / 로봇·캐논
     * 자작 기계로 싸우는 천재 공학자. 전투 로봇 소환과 대포격.
     */
    {
        id: 'mechanic', name: '메카닉', engName: 'Mechanic',
        gender: 'female', type: 'tech', weapon: '기계 캐논+로봇',
        emoji: '🤖', bodyEmoji: '🤖', weaponEmoji: '🔧', color: '#00b894',
        description: '기계공학의 천재. 직접 제작한 로봇과 무기로 전투한다.',
        stats: { hp: 73, mp: 75, atk: 70, matk: 60, def: 58, spd: 62, crit: 55 },
        skills: [
            { name: '캐논 발사',      icon: '💣', desc: '강력한 포탄 발사.',             key: 'Z' },
            { name: '전투 로봇 소환', icon: '🤖', desc: '전투 로봇 소환. 자동 공격.',   key: 'X' },
            { name: '미사일 폭격',    icon: '🚀', desc: '미사일 여러 발 발사.',          key: 'C' },
            { name: '메가 캐논',      icon: '💥', desc: '최대 출력 포격. 광역 피해.',    key: 'V' },
        ],
        baseStats: { maxHp: 980, maxMp: 650, atk: 72, matk: 62, def: 52, spd: 162, crit: 0.20 },
    },

    /**
     * 궁수 (Archer) — 물리 / 장궁 저격
     * 정밀한 장거리 단발 저격과 화살 폭풍 궁극기.
     */
    {
        id: 'archer', name: '궁수', engName: 'Archer',
        gender: 'female', type: 'physical', weapon: '장궁',
        emoji: '🎯', bodyEmoji: '👩', weaponEmoji: '🎯', color: '#d35400',
        description: '정확한 조준으로 멀리서 적을 제압. 장거리 저격과 빠른 연사.',
        stats: { hp: 68, mp: 45, atk: 85, matk: 20, def: 42, spd: 78, crit: 75 },
        skills: [
            { name: '빠른 발사',  icon: '🎯', desc: '빠른 연속 화살 발사.',              key: 'Z' },
            { name: '저격',       icon: '🔭', desc: '강력한 단발 저격.',                  key: 'X' },
            { name: '불화살',     icon: '🔥', desc: '불꽃 화살. 화염 지속 피해.',         key: 'C' },
            { name: '화살 폭풍',  icon: '🌪️', desc: '수십 발의 화살을 한꺼번에.',        key: 'V' },
        ],
        baseStats: { maxHp: 900, maxMp: 350, atk: 88, matk: 20, def: 38, spd: 175, crit: 0.38 },
    },
];

/**
 * ID로 캐릭터를 찾아 반환한다.
 * @param {string} id - 캐릭터 고유 ID
 * @returns {CharacterData|null}
 */
function getCharById(id) {
    return CHARACTERS.find((c) => c.id === id) || null;
}

/**
 * 성별 필터로 캐릭터 목록을 반환한다.
 * @param {'all'|'male'|'female'} g - 필터 값
 * @returns {CharacterData[]}
 */
function getCharsByGender(g) {
    return g === 'all' ? CHARACTERS : CHARACTERS.filter((c) => c.gender === g);
}
