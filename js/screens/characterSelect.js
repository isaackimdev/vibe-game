/**
 * Chronicles of Eternity — Character Select Screen Controller
 *
 * 역할:
 *  - 캐릭터 선택 화면 전체를 관리한다.
 *  - 캐릭터 그리드 빌드 (buildGrid)
 *  - 캐릭터 선택 및 상세 패널 렌더링 (selectChar / renderDetail)
 *  - 성별 필터 (applyFilter)
 *  - 버튼 이벤트 바인딩 (bindEvents)
 *  - 상태 초기화 (reset)
 *
 * 의존성:
 *  - CHARACTERS, TYPE_NAMES, getCharById  (characters.js)
 *  - GameManager.showTitle / startGame    (main.js)
 *
 * 패턴:
 *  - IIFE 모듈 패턴
 *  - isBuilt / isBound 플래그로 중복 초기화 방지
 */
const CharacterSelect = (() => {
    /** 현재 선택된 캐릭터 ID. 미선택 시 null */
    let selectedCharId = null;
    /** 그리드가 한 번이라도 빌드되었는지 여부 */
    let isBuilt = false;
    /** 이벤트 리스너가 바인딩되었는지 여부 */
    let isBound = false;

    /**
     * 캐릭터 선택 화면을 초기화한다.
     * 처음 호출 시에만 그리드 빌드 및 이벤트 바인딩을 수행해 중복을 방지한다.
     */
    function init() {
        if (!isBuilt) {
            buildGrid();
            isBuilt = true;
        }
        if (!isBound) {
            bindEvents();
            isBound = true;
        }
    }

    /**
     * 전체 캐릭터 카드를 #character-grid DOM에 삽입한다.
     * 각 카드는 캐릭터 색상(--card-color CSS 변수), 이모지, 이름, 타입 배지를 포함한다.
     */
    function buildGrid() {
        const grid = document.getElementById('character-grid');
        grid.innerHTML = '';
        CHARACTERS.forEach((char) => {
            const card = document.createElement('div');
            card.className = 'char-card';
            card.dataset.id = char.id;
            card.dataset.gender = char.gender; // 성별 필터용
            card.style.setProperty('--card-color', char.color);
            card.innerHTML = `
                <span class="char-gender-icon">${char.gender === 'male' ? 'M' : 'F'}</span>
                <div class="char-emoji">${char.emoji}</div>
                <div class="char-name">${char.name}</div>
                <div class="char-type-badge type-${char.type}"
                     style="background:${char.color}25; color:${char.color}; border:1px solid ${char.color}60;">
                    ${TYPE_NAMES[char.type]}
                </div>
            `;
            card.addEventListener('click', () => selectChar(char.id));
            grid.appendChild(card);
        });
    }

    /**
     * 특정 캐릭터를 선택 상태로 전환한다.
     *  - 이전 선택 해제 → 새 카드에 'selected' 클래스 추가
     *  - 상세 패널 렌더링
     *  - 시작 버튼 활성화
     * @param {string} id - 선택할 캐릭터 ID
     */
    function selectChar(id) {
        selectedCharId = id;
        const char = getCharById(id);
        if (!char) return;

        // 기존 선택 해제 후 새 카드 선택
        document.querySelectorAll('.char-card').forEach((card) => card.classList.remove('selected'));
        document.querySelector(`.char-card[data-id="${id}"]`)?.classList.add('selected');

        renderDetail(char);

        // 선택 정보 텍스트 업데이트
        const info = document.getElementById('selected-info');
        info.textContent = `Selected ${char.name} (${char.engName})`;
        info.style.color = char.color;

        // 시작 버튼 활성화
        document.getElementById('btn-start-game').disabled = false;
    }

    /**
     * 선택된 캐릭터의 상세 패널을 렌더링한다.
     * 포함 요소: 이모지, 이름, 배지(성별/타입/무기), 스탯 바, 스킬 목록, 설명
     * @param {CharacterData} char
     */
    function renderDetail(char) {
        const panel = document.getElementById('character-detail');
        const genderColor = char.gender === 'male' ? '#4a90e2' : '#e24a8a';
        const genderText  = char.gender === 'male' ? 'Male' : 'Female';

        panel.innerHTML = `
            <div class="detail-content">
                <div class="detail-hero">
                    <span class="detail-hero-emoji">${char.emoji}</span>
                    <div class="detail-hero-name" style="color:${char.color}">${char.name}</div>
                    <div class="detail-hero-eng">${char.engName}</div>
                    <div class="detail-badges">
                        <span class="badge badge-gender" style="color:${genderColor};border-color:${genderColor}">${genderText}</span>
                        <span class="badge type-${char.type}">${TYPE_NAMES[char.type]}</span>
                        <span class="badge badge-weapon">${char.weapon}</span>
                    </div>
                </div>
                <div class="detail-stats">
                    <h4>Stats</h4>
                    ${renderStats(char)}
                </div>
                <div class="detail-skills">
                    <h4>Skills</h4>
                    ${renderSkills(char)}
                </div>
                <div class="detail-desc">
                    <h4>Description</h4>
                    <p>${char.description}</p>
                </div>
            </div>
        `;
    }

    /**
     * 캐릭터 스탯을 색상 바 형태의 HTML 문자열로 반환한다.
     * stats 값(0~100)을 width % 로 직접 사용한다.
     * @param {CharacterData} char
     * @returns {string} HTML
     */
    function renderStats(char) {
        const stats = char.stats;
        const rows = [
            { label: 'HP',   val: stats.hp,   color: '#e74c3c' },
            { label: 'MP',   val: stats.mp,   color: '#3498db' },
            { label: 'ATK',  val: stats.atk,  color: '#e67e22' },
            { label: 'MATK', val: stats.matk, color: '#9b59b6' },
            { label: 'DEF',  val: stats.def,  color: '#2980b9' },
            { label: 'SPD',  val: stats.spd,  color: '#27ae60' },
            { label: 'CRIT', val: stats.crit, color: '#f39c12' },
        ];
        return rows.map((row) => `
            <div class="stat-row">
                <span class="stat-label">${row.label}</span>
                <div class="stat-bar-bg">
                    <div class="stat-bar-fill" style="width:${row.val}%;background:linear-gradient(90deg,${row.color}88,${row.color})"></div>
                </div>
                <span class="stat-value" style="color:${row.color}">${row.val}</span>
            </div>
        `).join('');
    }

    /**
     * 캐릭터 스킬 4개를 목록 형태의 HTML 문자열로 반환한다.
     * 각 항목에 키바인드([Z]/[X]/[C]/[V])와 스킬 설명을 표시한다.
     * @param {CharacterData} char
     * @returns {string} HTML
     */
    function renderSkills(char) {
        return char.skills.map((skill) => `
            <div class="skill-item">
                <div class="skill-icon-small">${skill.icon}</div>
                <div class="skill-info">
                    <div class="skill-name">[${skill.key}] ${skill.name}</div>
                    <div class="skill-desc">${skill.desc}</div>
                </div>
            </div>
        `).join('');
    }

    /**
     * 성별 필터를 적용해 해당하지 않는 카드를 숨긴다.
     * CSS 클래스 'filtered-out'으로 시각적으로 제거한다.
     * @param {'all'|'male'|'female'} filter
     */
    function applyFilter(filter) {
        document.querySelectorAll('.char-card').forEach((card) => {
            const match = filter === 'all' || card.dataset.gender === filter;
            card.classList.toggle('filtered-out', !match);
        });
    }

    /**
     * 화면의 버튼 이벤트를 한 번만 바인딩한다.
     *  - 성별 필터 버튼 (.filter-btn)
     *  - 뒤로가기 버튼 (#btn-cs-back)
     *  - 시작 버튼 (#btn-start-game)
     */
    function bindEvents() {
        // 성별 필터 버튼
        document.querySelectorAll('.filter-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                applyFilter(btn.dataset.filter);
            });
        });

        // 뒤로가기 → 타이틀로
        document.getElementById('btn-cs-back').addEventListener('click', () => {
            GameManager.showTitle();
        });

        // 시작 → 선택된 캐릭터로 게임 시작
        document.getElementById('btn-start-game').addEventListener('click', () => {
            if (selectedCharId) GameManager.startGame(selectedCharId);
        });
    }

    /**
     * 캐릭터 선택 화면을 초기 상태로 완전히 리셋한다.
     *  - 선택 해제
     *  - 시작 버튼 비활성화
     *  - 상세 패널을 플레이스홀더로 교체
     *  - 필터를 '전체'로 초기화
     */
    function reset() {
        selectedCharId = null;

        // 시작 버튼 비활성화
        const btn = document.getElementById('btn-start-game');
        if (btn) btn.disabled = true;

        // 선택 정보 텍스트 초기화
        const info = document.getElementById('selected-info');
        if (info) {
            info.textContent = 'No character selected';
            info.style.color = '';
        }

        // 상세 패널을 플레이스홀더로 교체
        const detail = document.getElementById('character-detail');
        if (detail) {
            detail.innerHTML = `
                <div class="detail-placeholder">
                    <div class="placeholder-icon">⚔️</div>
                    <p>Select a character</p>
                </div>`;
        }

        // 카드 선택 상태 해제
        document.querySelectorAll('.char-card').forEach((card) => card.classList.remove('selected'));

        // 필터 버튼을 '전체'로 초기화
        applyFilter('all');
        document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
        document.querySelector('.filter-btn[data-filter="all"]')?.classList.add('active');
    }

    // 외부에 공개하는 API
    return { init, reset };
})();
