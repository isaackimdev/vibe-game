/**
 * Character Select Screen Controller
 */
const CharacterSelect = (() => {
    let selectedCharId = null;
    let isBuilt = false;
    let isBound = false;

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

    function buildGrid() {
        const grid = document.getElementById('character-grid');
        grid.innerHTML = '';
        CHARACTERS.forEach((char) => {
            const card = document.createElement('div');
            card.className = 'char-card';
            card.dataset.id = char.id;
            card.dataset.gender = char.gender;
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

    function selectChar(id) {
        selectedCharId = id;
        const char = getCharById(id);
        if (!char) return;

        document.querySelectorAll('.char-card').forEach((card) => card.classList.remove('selected'));
        document.querySelector(`.char-card[data-id="${id}"]`)?.classList.add('selected');

        renderDetail(char);

        const info = document.getElementById('selected-info');
        info.textContent = `Selected ${char.name} (${char.engName})`;
        info.style.color = char.color;

        document.getElementById('btn-start-game').disabled = false;
    }

    function renderDetail(char) {
        const panel = document.getElementById('character-detail');
        const genderColor = char.gender === 'male' ? '#4a90e2' : '#e24a8a';
        const genderText = char.gender === 'male' ? 'Male' : 'Female';

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

    function renderStats(char) {
        const stats = char.stats;
        const rows = [
            { label:'HP', val:stats.hp, color:'#e74c3c' },
            { label:'MP', val:stats.mp, color:'#3498db' },
            { label:'ATK', val:stats.atk, color:'#e67e22' },
            { label:'MATK', val:stats.matk, color:'#9b59b6' },
            { label:'DEF', val:stats.def, color:'#2980b9' },
            { label:'SPD', val:stats.spd, color:'#27ae60' },
            { label:'CRIT', val:stats.crit, color:'#f39c12' },
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

    function applyFilter(filter) {
        document.querySelectorAll('.char-card').forEach((card) => {
            const match = filter === 'all' || card.dataset.gender === filter;
            card.classList.toggle('filtered-out', !match);
        });
    }

    function bindEvents() {
        document.querySelectorAll('.filter-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach((button) => button.classList.remove('active'));
                btn.classList.add('active');
                applyFilter(btn.dataset.filter);
            });
        });

        document.getElementById('btn-cs-back').addEventListener('click', () => {
            GameManager.showTitle();
        });

        document.getElementById('btn-start-game').addEventListener('click', () => {
            if (selectedCharId) GameManager.startGame(selectedCharId);
        });
    }

    function reset() {
        selectedCharId = null;
        const btn = document.getElementById('btn-start-game');
        if (btn) btn.disabled = true;
        const info = document.getElementById('selected-info');
        if (info) {
            info.textContent = 'No character selected';
            info.style.color = '';
        }
        const detail = document.getElementById('character-detail');
        if (detail) {
            detail.innerHTML = `
                <div class="detail-placeholder">
                    <div class="placeholder-icon">⚔️</div>
                    <p>Select a character</p>
                </div>`;
        }
        document.querySelectorAll('.char-card').forEach((card) => card.classList.remove('selected'));
        applyFilter('all');
        document.querySelectorAll('.filter-btn').forEach((button) => button.classList.remove('active'));
        document.querySelector('.filter-btn[data-filter="all"]')?.classList.add('active');
    }

    return { init, reset };
})();
