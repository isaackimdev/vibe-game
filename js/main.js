/**
 * Chronicles of Eternity - Main Entry / Screen Manager
 */
const GameManager = (() => {
    let currentScreen = 'title';
    let activeModal = null;

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
        requestAnimationFrame(() => {
            target.style.opacity = '1';
            target.classList.add('active');
        });
        currentScreen = id;
    }

    function showTitle() {
        closeModal();
        GameEngine.stop();
        CharacterSelect.reset();
        showScreen('title');
        initTitleFX();
    }

    function showCharacterSelect() {
        closeModal();
        showScreen('character-select');
        CharacterSelect.init();
    }

    function startGame(charId) {
        closeModal();
        showScreen('game');
        setTimeout(() => GameEngine.init(charId), 80);
    }

    function closeModal() {
        if (!activeModal) return;
        activeModal.remove();
        activeModal = null;
    }

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

    function confirmReturnToTitle() {
        showConfirmModal({
            title: 'Leave The Hunt',
            description: 'Current stage progress will be lost. Return to the title screen?',
            confirmText: 'Return To Title',
            cancelText: 'Keep Playing',
            onConfirm: showTitle,
        });
    }

    function initTitleFX() {
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

        const canvas = document.getElementById('title-canvas');
        if (!canvas) return;
        const context = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const stars = Array.from({ length: 160 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.5,
            blink: Math.random() * Math.PI * 2,
            spd: 0.5 + Math.random() * 1.5,
        }));

        let animationId;
        function drawFrame() {
            if (currentScreen !== 'title') {
                cancelAnimationFrame(animationId);
                return;
            }
            context.clearRect(0, 0, canvas.width, canvas.height);
            const time = performance.now() / 1000;

            stars.forEach((star) => {
                const alpha = 0.3 + 0.7 * Math.abs(Math.sin(time * star.spd + star.blink));
                context.fillStyle = `rgba(255,255,255,${alpha})`;
                context.beginPath();
                context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
                context.fill();
            });

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

    function init() {
        document.getElementById('btn-new-game').addEventListener('click', showCharacterSelect);
        document.getElementById('btn-game-menu').addEventListener('click', confirmReturnToTitle);
        showTitle();
    }

    return { init, showTitle, showCharacterSelect, startGame, showConfirmModal, closeModal };
})();

window.addEventListener('DOMContentLoaded', () => GameManager.init());
