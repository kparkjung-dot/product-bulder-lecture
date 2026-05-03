// ── Theme ──────────────────────────────────────────────
const themeBtn = document.getElementById('theme-btn');
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
    themeBtn.textContent = '☀️';
}
themeBtn.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    themeBtn.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// ── Category tabs ──────────────────────────────────────
document.querySelectorAll('.cat-tab:not([disabled])').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.cat-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`panel-${tab.dataset.cat}`).classList.add('active');
    });
});

// ── Mode tabs ──────────────────────────────────────────
document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.mode-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`mode-${tab.dataset.mode}`).classList.add('active');
    });
});

// ── Chilean food list ──────────────────────────────────
const FOODS = [
    { name: 'Completo',          emoji: '🌭' },
    { name: 'Empanadas',         emoji: '🥟' },
    { name: 'Churrasco',         emoji: '🥩' },
    { name: 'Cazuela',           emoji: '🍲' },
    { name: 'Pastel de choclo',  emoji: '🌽' },
    { name: 'Sopaipillas',       emoji: '🫓' },
    { name: 'Lomito',            emoji: '🥪' },
    { name: 'Barros Luco',       emoji: '🍔' },
    { name: 'Pollo asado',       emoji: '🍗' },
    { name: 'Humitas',           emoji: '🌿' },
    { name: 'Ceviche',           emoji: '🍋' },
    { name: 'Tallarines',        emoji: '🍝' },
    { name: 'Carbonada',         emoji: '🍵' },
    { name: 'Chupe de mariscos', emoji: '🦐' },
    { name: 'Sushi',             emoji: '🍣' },
    { name: 'Pizza',             emoji: '🍕' },
    { name: 'Kuchen',            emoji: '🍰' },
    { name: 'Leche asada',       emoji: '🍮' },
    { name: 'Arrollado huaso',   emoji: '🌯' },
    { name: 'Plateada',          emoji: '🍖' },
    { name: 'Caldillo de congrio', emoji: '🐟' },
    { name: 'Sandwich',          emoji: '🥖' },
];

// ── Slot machine animation ─────────────────────────────
function slotMachine(pool, emojiEl, nameEl, card, onDone) {
    card.classList.remove('revealed');
    card.classList.add('spinning');

    let step = 0;
    const steps = 28;
    let delay = 60;

    function tick() {
        const item = pool[Math.floor(Math.random() * pool.length)];
        emojiEl.textContent = item.emoji || '🎯';
        nameEl.textContent = item.name;
        step++;

        if (step < steps) {
            if (step > 18) delay += 18;
            setTimeout(tick, delay);
        } else {
            card.classList.remove('spinning');
            card.classList.add('revealed');
            onDone(item);
        }
    }
    tick();
}

// ── Random mode ────────────────────────────────────────
const randomBtn   = document.getElementById('random-btn');
const randomCard  = document.getElementById('random-result');
const randomEmoji = document.getElementById('random-emoji');
const randomName  = document.getElementById('random-name');

randomBtn.addEventListener('click', () => {
    randomBtn.disabled = true;
    slotMachine(FOODS, randomEmoji, randomName, randomCard, () => {
        randomBtn.disabled = false;
    });
});

// ── Custom mode ────────────────────────────────────────
const optionInput  = document.getElementById('option-input');
const addBtn       = document.getElementById('add-btn');
const chipsEl      = document.getElementById('chips');
const customBtn    = document.getElementById('custom-btn');
const customCard   = document.getElementById('custom-result');
const customEmoji  = document.getElementById('custom-emoji');
const customName   = document.getElementById('custom-name');

let options = [];

function renderChips() {
    chipsEl.innerHTML = '';
    if (options.length === 0) {
        chipsEl.innerHTML = '<span class="chips-empty">Agrega al menos 2 opciones para decidir</span>';
        customBtn.disabled = true;
        return;
    }
    options.forEach((opt, i) => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.innerHTML = `${opt} <button class="chip-remove" aria-label="Eliminar">×</button>`;
        chip.querySelector('.chip-remove').addEventListener('click', () => {
            options.splice(i, 1);
            renderChips();
        });
        chipsEl.appendChild(chip);
    });
    customBtn.disabled = options.length < 2;
}

function addOption() {
    const val = optionInput.value.trim();
    if (!val || options.includes(val)) return;
    options.push(val);
    optionInput.value = '';
    renderChips();
    customCard.classList.add('hidden');
    customCard.classList.remove('revealed');
}

addBtn.addEventListener('click', addOption);
optionInput.addEventListener('keydown', e => { if (e.key === 'Enter') addOption(); });

customBtn.addEventListener('click', () => {
    customBtn.disabled = true;
    customCard.classList.remove('hidden');
    const pool = options.map(o => ({ name: o, emoji: '🎯' }));
    slotMachine(pool, customEmoji, customName, customCard, () => {
        customBtn.disabled = false;
    });
});

renderChips();

// ── Contact form ───────────────────────────────────────
const contactForm = document.querySelector('.contact-form');
const formStatus  = document.getElementById('form-status');
const submitBtn   = document.querySelector('.contact-submit-btn');

contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    formStatus.className = 'form-status';

    try {
        const res = await fetch(contactForm.action, {
            method: 'POST',
            body: new FormData(contactForm),
            headers: { Accept: 'application/json' },
        });
        if (res.ok) {
            formStatus.className = 'form-status success';
            formStatus.textContent = '✓ ¡Mensaje enviado! Te responderemos a la brevedad.';
            contactForm.reset();
            submitBtn.textContent = 'Enviado';
        } else {
            throw new Error();
        }
    } catch {
        formStatus.className = 'form-status error';
        formStatus.textContent = '✗ Hubo un problema al enviar. Inténtalo de nuevo.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar Mensaje';
    }
});
