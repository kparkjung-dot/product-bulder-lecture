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

// ── Disqus per-category reload ─────────────────────────
const COMMENTS_META = {
    comer:      { badge: '🍽️ ¿Qué comer?',  desc: '¿Probaste alguno de estos platos hoy? ¡Cuéntanos qué tal!' },
    horoscopo:  { badge: '🔮 Horóscopo',      desc: '¿Tu horóscopo de hoy te hizo sentido? ¡Comparte tu experiencia!' },
    hacer:      { badge: '🎯 ¿Qué hacer?',    desc: '¿Qué planes tienes para hoy? ¡Cuéntanos!' },
};

function reloadDisqus(catId) {
    const meta = COMMENTS_META[catId] || COMMENTS_META.comer;
    document.getElementById('comments-cat-badge').textContent = meta.badge;
    document.getElementById('comments-desc').textContent = meta.desc;

    if (typeof DISQUS !== 'undefined') {
        DISQUS.reset({
            reload: true,
            config: function () {
                this.page.identifier = 'queque-' + catId;
                this.page.url = 'https://kparkjung-dot.github.io/product-bulder-lecture/';
                this.language = 'es';
            }
        });
    }
}

// ── Category tabs ──────────────────────────────────────
document.querySelectorAll('.cat-tab:not([disabled])').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.cat-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const cat = tab.dataset.cat;
        document.getElementById(`panel-${cat}`).classList.add('active');
        reloadDisqus(cat);
        if (cat === 'horoscopo' && !horoscopeData) loadHoroscope();
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

// ── Chilean food list (based on PedidosYa & Uber Eats Chile 2024–2025 data) ──
const FOODS = [
    // Completos & sánduches — top delivery category in Chile
    { name: 'Completo italiano',           emoji: '🌭' },
    { name: 'Completo dinámico',           emoji: '🌭' },
    { name: 'Churrasco italiano',          emoji: '🥩' },
    { name: 'Churrasco con palta',         emoji: '🥩' },
    { name: 'Barros Luco',                 emoji: '🧀' },
    { name: 'Barros Jarpa',                emoji: '🧀' },
    { name: 'Lomito clásico',              emoji: '🥪' },
    { name: 'Chacarero',                   emoji: '🥖' },
    { name: 'Ave palta',                   emoji: '🥑' },
    { name: 'Choripán con pebre',          emoji: '🌭' },

    // Platos de fondo
    { name: 'Lomo a lo pobre',             emoji: '🍳' },
    { name: 'Chorrillana',                 emoji: '🍟' },
    { name: 'Pollo broaster',              emoji: '🍗' },
    { name: 'Pastel de choclo',            emoji: '🌽' },
    { name: 'Cazuela de vacuno',           emoji: '🍲' },
    { name: 'Cazuela de pollo',            emoji: '🍲' },
    { name: 'Plateada al horno',           emoji: '🍖' },
    { name: 'Porotos granados',            emoji: '🫘' },
    { name: 'Carbonada',                   emoji: '🥘' },
    { name: 'Tallarines a la bolognesa',   emoji: '🍝' },

    // Empanadas — #1 plato tradicional en PedidosYa (3M+ unidades)
    { name: 'Empanada de pino',            emoji: '🥟' },
    { name: 'Empanada frita de queso',     emoji: '🥟' },
    { name: 'Empanada de mariscos',        emoji: '🥟' },
    { name: 'Empanada frita de pino',      emoji: '🥟' },

    // Mariscos & pescados
    { name: 'Caldillo de congrio',         emoji: '🐟' },
    { name: 'Ceviche de reineta',          emoji: '🍋' },
    { name: 'Machas a la parmesana',       emoji: '🦪' },
    { name: 'Chupe de mariscos',           emoji: '🦐' },
    { name: 'Jaibas rellenas',             emoji: '🦀' },

    // Sushi — Chile lidera consumo en Latinoamérica, #1 en Uber Eats 2024
    { name: 'Roll california',             emoji: '🍣' },
    { name: 'Roll de salmón con palta',    emoji: '🍣' },
    { name: 'Temaki de salmón con palta',  emoji: '🍣' },
    { name: 'Sashimi de salmón',           emoji: '🐠' },

    // Comida rápida
    { name: 'Hamburguesa con queso',       emoji: '🍔' },
    { name: 'Pizza de mechada',            emoji: '🍕' },
    { name: 'Pizza napolitana',            emoji: '🍕' },
    { name: 'Pollo frito con papas',       emoji: '🍗' },

    // Once & antojitos
    { name: 'Sopaipillas pasadas',         emoji: '🍯' },
    { name: 'Sopaipillas con pebre',       emoji: '🫓' },
    { name: 'Humitas',                     emoji: '🌿' },
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

// ── Horoscope ──────────────────────────────────────────
let horoscopeData = null;

const SIGN_META = {
    'Aries':       { symbol: '♈', dates: '21 mar – 19 abr' },
    'Tauro':       { symbol: '♉', dates: '20 abr – 20 may' },
    'Géminis':     { symbol: '♊', dates: '21 may – 20 jun' },
    'Cáncer':      { symbol: '♋', dates: '21 jun – 22 jul' },
    'Leo':         { symbol: '♌', dates: '23 jul – 22 ago' },
    'Virgo':       { symbol: '♍', dates: '23 ago – 22 sep' },
    'Libra':       { symbol: '♎', dates: '23 sep – 22 oct' },
    'Escorpio':    { symbol: '♏', dates: '23 oct – 21 nov' },
    'Sagitario':   { symbol: '♐', dates: '22 nov – 21 dic' },
    'Capricornio': { symbol: '♑', dates: '22 dic – 19 ene' },
    'Acuario':     { symbol: '♒', dates: '20 ene – 18 feb' },
    'Piscis':      { symbol: '♓', dates: '19 feb – 20 mar' },
};

async function loadHoroscope() {
    try {
        const res = await fetch('data/horoscope.json?v=' + Date.now());
        horoscopeData = await res.json();

        const today = new Date().toLocaleDateString('es-CL', {
            timeZone: 'America/Santiago',
            year: 'numeric', month: 'long', day: 'numeric'
        });
        const todayISO = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' });

        document.getElementById('horo-date').textContent = today;
        const freshness = document.getElementById('horo-freshness');
        if (horoscopeData.fecha === todayISO) {
            freshness.textContent = '✓ Actualizado hoy';
            freshness.className = 'horo-freshness fresh';
        } else {
            freshness.textContent = '⚠ Datos de ' + horoscopeData.fecha;
            freshness.className = 'horo-freshness stale';
        }
    } catch {
        document.getElementById('horo-date').textContent = 'No disponible';
    }
}

document.querySelectorAll('.sign-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.sign-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const sign = btn.dataset.sign;
        const meta = SIGN_META[sign] || {};
        const card = document.getElementById('horo-card');

        document.getElementById('horo-symbol').textContent = meta.symbol || '🔮';
        document.getElementById('horo-sign-name').textContent = sign;
        document.getElementById('horo-sign-dates').textContent = meta.dates || '';

        if (!horoscopeData) {
            document.getElementById('horo-general').textContent = 'Cargando...';
            card.classList.remove('hidden');
            return;
        }

        const data = horoscopeData.signos[sign];
        if (data) {
            document.getElementById('horo-general').textContent  = data.general  || '';
            document.getElementById('horo-amor').textContent     = data.amor     || '';
            document.getElementById('horo-trabajo').textContent  = data.trabajo  || '';
            document.getElementById('horo-consejo').textContent  = data.consejo  || '';
        }

        card.classList.add('hidden');
        requestAnimationFrame(() => card.classList.remove('hidden'));
    });
});

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
