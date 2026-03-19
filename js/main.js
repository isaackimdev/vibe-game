/**
 * Chronicles of Eternity — Main Entry / Screen Manager
 *
 * 역할:
 *  - 3개 화면(title / character-select / game) 전환 관리
 *  - 공통 모달 다이얼로그 표시/숨기기
 *  - 타이틀 화면 파티클·별 Canvas 애니메이션 초기화
 *
 * 의존성:
 *  - CharacterSelect (screens/characterSelect.js)
 *  - GameEngine      (game/gameEngine.js)
 */
const GameManager = (() => {
    /** 현재 활성화된 화면 ID */
    let currentScreen = 'title';
    /** 현재 열려 있는 모달 DOM 요소 (없으면 null) */
    let activeModal = null;

    /**
     * 특정 화면을 표시한다.
     * 모든 .screen 요소를 숨긴 뒤, 대상 화면만 fade-in 처리.
     * @param {string} id - 화면 ID ('title' | 'character-select' | 'game')
     */
    function showScreen(id) {
        document.querySelectorAll('.screen').forEach((screen) => {
            screen.classList.remove('active');
            screen.style.display = 'none';
            screen.style.opacity = '0';
        });
        const target = document.getElementById(`screen-${id}`);
        if (!target) return;
        target.style.display = 'flex';
        target.style.flexDirection = 'column';
        // 다음 프레임에서 opacity 전환을 시작해 CSS transition이 적용되게 함
        requestAnimationFrame(() => {
            target.style.opacity = '1';
            target.classList.add('active');
        });
        currentScreen = id;
    }

    /**
     * 타이틀 화면으로 이동한다.
     * 게임 엔진과 캐릭터 선택 상태를 초기화한다.
     */
    function showTitle() {
        closeModal();
        GameEngine.stop();
        CharacterSelect.reset();
        showScreen('title');
        initTitleFX();
    }

    /**
     * 캐릭터 선택 화면으로 이동한다.
     */
    function showCharacterSelect() {
        closeModal();
        showScreen('character-select');
        CharacterSelect.init();
    }

    /**
     * 게임 화면으로 이동하고 엔진을 시작한다.
     * @param {string} charId - 선택한 캐릭터 ID
     */
    function startGame(charId) {
        closeModal();
        showScreen('game');
        // 화면 전환 애니메이션이 완료된 후 엔진 초기화
        setTimeout(() => GameEngine.init(charId), 80);
    }

    /**
     * 현재 열려 있는 모달을 DOM에서 제거한다.
     */
    function closeModal() {
        if (!activeModal) return;
        activeModal.remove();
        activeModal = null;
    }

    /**
     * 확인/취소 두 버튼이 있는 공통 모달을 표시한다.
     * @param {object} opts
     * @param {string} opts.title       - 모달 제목
     * @param {string} opts.description - 모달 설명 텍스트
     * @param {string} opts.confirmText - 확인 버튼 텍스트
     * @param {string} opts.cancelText  - 취소 버튼 텍스트
     * @param {Function} opts.onConfirm - 확인 클릭 시 콜백
     */
    function showConfirmModal({ title, description, confirmText, cancelText, onConfirm }) {
        closeModal();
        const modal = document.createElement('div');
        modal.className = 'game-modal-overlay';
        modal.innerHTML = `
            <div class="game-modal">
                <div class="game-modal-title">${title}</div>
                <div class="game-modal-desc">${description}</div>
                <div class="game-modal-actions">
                    <button class="game-modal-btn game-modal-btn-secondary" data-action="cancel">${cancelText}</button>
                    <button class="game-modal-btn game-modal-btn-primary" data-action="confirm">${confirmText}</button>
                </div>
            </div>
        `;
        // 오버레이 영역 클릭 또는 취소 버튼 → 닫기
        // 확인 버튼 → 닫기 후 콜백 실행
        modal.addEventListener('click', (event) => {
            if (event.target === modal || event.target.dataset.action === 'cancel') {
                closeModal();
                return;
            }
            if (event.target.dataset.action === 'confirm') {
                closeModal();
                onConfirm?.();
            }
        });
        document.body.appendChild(modal);
        activeModal = modal;
    }

    /**
     * 타이틀로 돌아가기 전 확인 모달을 표시한다.
     * 현재 스테이지 진행 상황이 사라진다는 점을 알린다.
     */
    function confirmReturnToTitle() {
        showConfirmModal({
            title: 'Leave The Hunt',
            description: 'Current stage progress will be lost. Return to the title screen?',
            confirmText: 'Return To Title',
            cancelText: 'Keep Playing',
            onConfirm: showTitle,
        });
    }

    /**
     * 타이틀 화면 시각 효과를 초기화한다.
     *
     * 두 가지 효과:
     *  1) CSS 파티클 — 다양한 색상의 DOM 요소가 위로 부유
     *  2) Canvas 애니메이션 — 깜박이는 별(160개) + 회전하는 빛 줄기(5개)
     */
    function initTitleFX() {
        // ── 파티클 DOM 생성 ──────────────────────────────
        const container = document.getElementById('title-particles');
        if (!container) return;
        container.innerHTML = '';
        const colors = ['#c8a84b', '#9b59b6', '#3498db', '#e74c3c', '#2ecc71', '#e91e8c'];
        for (let i = 0; i < 28; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            const size = 2 + Math.random() * 5;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const duration = 4 + Math.random() * 6;
            particle.style.cssText = `
                width:${size}px;height:${size}px;background:${color};
                left:${Math.random() * 100}%;bottom:-10px;
                animation-duration:${duration}s;animation-delay:-${Math.random() * duration}s;
                opacity:0.7;box-shadow:0 0 ${size * 2}px ${color};`;
            container.appendChild(particle);
        }

        // ── Canvas 별 + 빛 줄기 ──────────────────────────
        const canvas = document.getElementById('title-canvas');
        if (!canvas) return;
        const context = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        /** @type {Array<{x:number, y:number, r:number, blink:number, spd:number}>} */
        const stars = Array.from({ length: 160 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.5,
            blink: Math.random() * Math.PI * 2, // 깜박임 위상 오프셋
            spd: 0.5 + Math.random() * 1.5,     // 깜박임 속도
        }));

        let animationId;

        /** Canvas 한 프레임을 그린다. title 화면이 아니면 루프를 중단한다. */
        function drawFrame() {
            if (currentScreen !== 'title') {
                cancelAnimationFrame(animationId);
                return;
            }
            context.clearRect(0, 0, canvas.width, canvas.height);
            const time = performance.now() / 1000;

            // 별 그리기 — alpha를 sin 함수로 깜박임
            stars.forEach((star) => {
                const alpha = 0.3 + 0.7 * Math.abs(Math.sin(time * star.spd + star.blink));
                context.fillStyle = `rgba(255,255,255,${alpha})`;
                context.beginPath();
                context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
                context.fill();
            });

            // 회전하는 빛 줄기 (5개, 황금색 그라디언트)
            context.save();
            context.globalAlpha = 0.03;
            for (let i = 0; i < 5; i++) {
                const angle = time * 0.08 + (i * Math.PI * 2) / 5;
                const length = Math.max(canvas.width, canvas.height);
                const gradient = context.createLinearGradient(
                    canvas.width / 2,
                    canvas.height / 2,
                    canvas.width / 2 + Math.cos(angle) * length,
                    canvas.height / 2 + Math.sin(angle) * length
                );
                gradient.addColorStop(0, '#c8a84b');
                gradient.addColorStop(1, 'transparent');
                context.fillStyle = gradient;
                context.beginPath();
                context.moveTo(canvas.width / 2, canvas.height / 2);
                context.lineTo(
                    canvas.width / 2 + Math.cos(angle - 0.06) * length,
                    canvas.height / 2 + Math.sin(angle - 0.06) * length
                );
                context.lineTo(
                    canvas.width / 2 + Math.cos(angle + 0.06) * length,
                    canvas.height / 2 + Math.sin(angle + 0.06) * length
                );
                context.closePath();
                context.fill();
            }
            context.restore();
            animationId = requestAnimationFrame(drawFrame);
        }

        drawFrame();
    }

    /**
     * 게임 전체를 초기화하고 타이틀 화면을 표시한다.
     * DOMContentLoaded 이벤트에서 한 번만 호출된다.
     */
    function init() {
        document.getElementById('btn-new-game').addEventListener('click', showCharacterSelect);
        document.getElementById('btn-game-menu').addEventListener('click', confirmReturnToTitle);
        showTitle();
    }

    // 외부에 공개하는 API
    return { init, showTitle, showCharacterSelect, startGame, showConfirmModal, closeModal };
})();

// DOM이 완전히 로드된 후 게임 초기화
window.addEventListener('DOMContentLoaded', () => GameManager.init());
