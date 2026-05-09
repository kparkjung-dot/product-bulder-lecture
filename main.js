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

// ── Firebase anonymous comments ───────────────────────
firebase.initializeApp({
    apiKey: 'AIzaSyCGD_C2OG9gom7clnJPl1g9B0xbLkO9lBQ',
    authDomain: 'queque-test.firebaseapp.com',
    projectId: 'queque-test',
    storageBucket: 'queque-test.firebasestorage.app',
    messagingSenderId: '308848177676',
    appId: '1:308848177676:web:827f12717cd857c3517429',
});
const db = firebase.firestore();

const COMMENTS_META = {
    comer:     { badge: '🍽️ ¿Te tinca comer?',  desc: '¿Probaste alguno de estos platos hoy? ¡Cuéntanos qué tal!' },
    horoscopo: { badge: '🔮 Horóscopo',      desc: '¿Tu horóscopo de hoy te hizo sentido? ¡Comparte tu experiencia!' },
    hacer:     { badge: '🎯 ¿Te tinca hacer?',    desc: '¿Qué planes tienes para hoy? ¡Cuéntanos!' },
    ver:       { badge: '🎬 ¿Te tinca ver?',      desc: '¿Viste alguna de estas pelis o series? ¡Cuéntanos qué tal!' },
};

const BAD_WORDS = ['puta','huevon','weon','culiao','mierda','concha','pico','maricon','forro',
    'pene','pija','culo','teta','sexo','porno','fuck','shit','bitch','cunt','dick','pussy','ass'];

function normalize(str) {
    return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
function hasBadWord(text) {
    const n = normalize(text);
    return BAD_WORDS.some(w => n.includes(w));
}
function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatCommentTime(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }) + ' ' +
           d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

let currentCat = 'comer';
let unsubComments = null;

function loadComments(cat) {
    const listEl = document.getElementById('comment-list');
    listEl.innerHTML = '<div class="comment-empty">Cargando comentarios...</div>';
    if (unsubComments) { unsubComments(); unsubComments = null; }
    unsubComments = db.collection('comments_' + cat)
        .orderBy('ts', 'desc')
        .limit(20)
        .onSnapshot(snap => {
            if (snap.empty) {
                listEl.innerHTML = '<div class="comment-empty">Sé el primero en comentar ✍️</div>';
                return;
            }
            listEl.innerHTML = '';
            snap.forEach(doc => {
                const d = doc.data();
                const item = document.createElement('div');
                item.className = 'comment-item';
                item.innerHTML =
                    '<div class="comment-header">' +
                        '<span class="comment-author">' + escapeHtml(d.name || 'Anónimo') + '</span>' +
                        '<span class="comment-time">' + formatCommentTime(d.ts) + '</span>' +
                    '</div>' +
                    '<div class="comment-body">' + escapeHtml(d.text) + '</div>';
                listEl.appendChild(item);
            });
        }, () => {
            listEl.innerHTML = '<div class="comment-empty">No se pudieron cargar los comentarios.</div>';
        });
}

function switchComments(cat) {
    const meta = COMMENTS_META[cat] || COMMENTS_META.comer;
    document.getElementById('comments-cat-badge').textContent = meta.badge;
    document.getElementById('comments-desc').textContent = meta.desc;
    currentCat = cat;
    loadComments(cat);
}

// ── Category tabs ──────────────────────────────────────
document.querySelectorAll('.cat-tab:not([disabled])').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.cat-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const cat = tab.dataset.cat;
        document.getElementById(`panel-${cat}`).classList.add('active');
        switchComments(cat);
        if (cat === 'horoscopo' && !horoscopeData) loadHoroscope();
    });
});

// ── Mode tabs (scoped to active cat-panel) ─────────────
document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const panel = tab.closest('.cat-panel');
        panel.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        panel.querySelectorAll('.mode-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`mode-${tab.dataset.mode}`).classList.add('active');
    });
});

// ── Chilean food lists by meal time ───────────────────────
const FOODS_DESAYUNO = [
    { name: 'Marraqueta con mantequilla y mermelada', emoji: '🍞' },
    { name: 'Tostadas con palta',                     emoji: '🥑' },
    { name: 'Huevos revueltos con tostadas',          emoji: '🍳' },
    { name: 'Yogur con granola y fruta',              emoji: '🥣' },
    { name: 'Avena con leche',                        emoji: '🥣' },
    { name: 'Pan con queso y jamón',                  emoji: '🧀' },
    { name: 'Pancakes con miel',                      emoji: '🥞' },
    { name: 'Sopaipillas fritas',                     emoji: '🫓' },
    { name: 'Café con leche y galletas',              emoji: '☕' },
    { name: 'Marraqueta con palta y huevo',           emoji: '🥚' },
    { name: 'Tostadas con mantequilla de maní',       emoji: '🥜' },
    { name: 'Jugo de naranja natural',                emoji: '🍊' },
];

const FOODS_ALMUERZO = [
    // Chilena
    { name: 'Lomo a lo pobre',             emoji: '🍳', cat: 'chilena' },
    { name: 'Chorrillana',                 emoji: '🍟', cat: 'chilena' },
    { name: 'Pollo broaster',              emoji: '🍗', cat: 'comida_rapida' },
    { name: 'Pastel de choclo',            emoji: '🌽', cat: 'chilena' },
    { name: 'Cazuela de vacuno',           emoji: '🍲', cat: 'chilena' },
    { name: 'Cazuela de pollo',            emoji: '🍲', cat: 'chilena' },
    { name: 'Plateada al horno',           emoji: '🍖', cat: 'chilena' },
    { name: 'Porotos granados',            emoji: '🫘', cat: 'chilena' },
    { name: 'Carbonada',                   emoji: '🥘', cat: 'chilena' },
    { name: 'Tallarines a la bolognesa',   emoji: '🍝', cat: 'chilena' },
    { name: 'Caldillo de congrio',         emoji: '🐟', cat: 'chilena' },
    { name: 'Ceviche de reineta',          emoji: '🍋', cat: 'chilena' },
    { name: 'Machas a la parmesana',       emoji: '🦪', cat: 'chilena' },
    { name: 'Chupe de mariscos',           emoji: '🦐', cat: 'chilena' },
    { name: 'Jaibas rellenas',             emoji: '🦀', cat: 'chilena' },
    { name: 'Churrasco italiano',          emoji: '🥩', cat: 'chilena' },
    { name: 'Barros Luco',                 emoji: '🧀', cat: 'chilena' },
    { name: 'Asado de tira a la parrilla', emoji: '🥩', cat: 'chilena' },
    { name: 'Costillas BBQ',              emoji: '🍖', cat: 'chilena' },
    { name: 'Filete al merkén',           emoji: '🥩', cat: 'chilena' },
    { name: 'Entraña con chimichurri',    emoji: '🥩', cat: 'chilena' },
    { name: 'Pollo al horno con papas',   emoji: '🍗', cat: 'chilena' },
    // Asiática
    { name: 'Arroz frito con verduras',    emoji: '🍚', cat: 'asiatica' },
    { name: 'Chow mein de pollo',          emoji: '🍜', cat: 'asiatica' },
    { name: 'Cerdo agridulce',             emoji: '🍖', cat: 'asiatica' },
    { name: 'Sopa wonton',                 emoji: '🥣', cat: 'asiatica' },
    { name: 'Bibimbap',                    emoji: '🍲', cat: 'asiatica' },
    { name: 'Pollo coreano frito (KFC)',   emoji: '🍗', cat: 'asiatica' },
    { name: 'Ramen coreano picante',       emoji: '🍜', cat: 'asiatica' },
    { name: 'Bulgogi',                     emoji: '🥩', cat: 'asiatica' },
    { name: 'Tteokbokki',                  emoji: '🌶️', cat: 'asiatica' },
    { name: 'Pollo tikka masala',          emoji: '🍛', cat: 'asiatica' },
    { name: 'Butter chicken',             emoji: '🍛', cat: 'asiatica' },
    { name: 'Ramen tonkotsu',             emoji: '🍜', cat: 'asiatica' },
    { name: 'Katsu curry',                emoji: '🍛', cat: 'asiatica' },
    { name: 'Udon con tempura',           emoji: '🍜', cat: 'asiatica' },
    { name: 'Donburi de pollo teriyaki',  emoji: '🍚', cat: 'asiatica' },
    { name: 'Miso ramen',                 emoji: '🍜', cat: 'asiatica' },
    // Internacional
    { name: 'Tacos de carne asada',       emoji: '🌮', cat: 'internacional' },
    { name: 'Burritos de pollo',          emoji: '🌯', cat: 'internacional' },
    { name: 'Lomo saltado',               emoji: '🍳', cat: 'internacional' },
    { name: 'Ají de gallina',             emoji: '🍲', cat: 'internacional' },
    { name: 'Ceviche peruano',            emoji: '🍋', cat: 'internacional' },
    // Italiana
    { name: 'Lasaña de carne',            emoji: '🍝', cat: 'italiana' },
    { name: 'Risotto de champiñones',     emoji: '🍚', cat: 'italiana' },
    { name: 'Pizza margherita',           emoji: '🍕', cat: 'italiana' },
    { name: 'Pasta al pesto',             emoji: '🍝', cat: 'italiana' },
    { name: 'Pasta carbonara',            emoji: '🍝', cat: 'italiana' },
    // Comida rápida
    { name: 'Hamburguesa con queso',      emoji: '🍔', cat: 'comida_rapida' },
    { name: 'Completo italiano',          emoji: '🌭', cat: 'comida_rapida' },
    { name: 'Pollo frito con papas',      emoji: '🍗', cat: 'comida_rapida' },
];

const FOODS_ONCE = [
    { name: 'Sopaipillas pasadas',              emoji: '🍯' },
    { name: 'Sopaipillas con pebre',            emoji: '🫓' },
    { name: 'Completo italiano',                emoji: '🌭' },
    { name: 'Ave palta',                        emoji: '🥑' },
    { name: 'Barros Luco',                      emoji: '🧀' },
    { name: 'Humitas',                          emoji: '🌿' },
    { name: 'Empanada frita de queso',          emoji: '🥟' },
    { name: 'Empanada de pino',                 emoji: '🥟' },
    { name: 'Empanada de mariscos',             emoji: '🥟' },
    { name: 'Empanada frita de pino',           emoji: '🥟' },
    { name: 'Kuchen de manzana',                emoji: '🍰' },
    { name: 'Hallulla con mantequilla',         emoji: '🧈' },
    { name: 'Café con leche y pan tostado',     emoji: '☕' },
    { name: 'Torta de mil hojas',               emoji: '🎂' },
    { name: 'Queque de vainilla',               emoji: '🧁' },
];

const FOODS_CENA = [
    // Chilena
    { name: 'Churrasco con palta',         emoji: '🥩', cat: 'chilena' },
    { name: 'Barros Jarpa',                emoji: '🧀', cat: 'chilena' },
    { name: 'Lomito clásico',              emoji: '🥪', cat: 'chilena' },
    { name: 'Chacarero',                   emoji: '🥖', cat: 'chilena' },
    { name: 'Choripán con pebre',          emoji: '🌭', cat: 'chilena' },
    { name: 'Completo dinámico',           emoji: '🌭', cat: 'chilena' },
    { name: 'Asado de tira a la parrilla', emoji: '🥩', cat: 'chilena' },
    { name: 'Costillas BBQ',              emoji: '🍖', cat: 'chilena' },
    { name: 'Filete al merkén',           emoji: '🥩', cat: 'chilena' },
    { name: 'Entraña con chimichurri',    emoji: '🥩', cat: 'chilena' },
    { name: 'T-bone a la parrilla',       emoji: '🥩', cat: 'chilena' },
    // Asiática
    { name: 'Roll california',             emoji: '🍣', cat: 'asiatica' },
    { name: 'Roll de salmón con palta',    emoji: '🍣', cat: 'asiatica' },
    { name: 'Temaki de salmón con palta',  emoji: '🍣', cat: 'asiatica' },
    { name: 'Sashimi de salmón',           emoji: '🐠', cat: 'asiatica' },
    { name: 'Roll de camarón tempura',     emoji: '🍣', cat: 'asiatica' },
    { name: 'Samgyeopsal (cerdo a la plancha)', emoji: '🥓', cat: 'asiatica' },
    { name: 'Korean BBQ mixto',            emoji: '🔥', cat: 'asiatica' },
    { name: 'Pollo coreano picante',       emoji: '🍗', cat: 'asiatica' },
    { name: 'Kimchi jjigae',               emoji: '🍲', cat: 'asiatica' },
    { name: 'Arroz frito especial',        emoji: '🍚', cat: 'asiatica' },
    { name: 'Mapo tofu',                   emoji: '🌶️', cat: 'asiatica' },
    { name: 'Pollo tikka masala',          emoji: '🍛', cat: 'asiatica' },
    { name: 'Curry de garbanzos',          emoji: '🍛', cat: 'asiatica' },
    { name: 'Ramen shoyu',                 emoji: '🍜', cat: 'asiatica' },
    { name: 'Gyoza frita',                 emoji: '🥟', cat: 'asiatica' },
    { name: 'Yakisoba',                    emoji: '🍜', cat: 'asiatica' },
    { name: 'Tonkatsu',                    emoji: '🍱', cat: 'asiatica' },
    { name: 'Pad thai de camarones',       emoji: '🍜', cat: 'asiatica' },
    { name: 'Curry verde tailandés',       emoji: '🍛', cat: 'asiatica' },
    // Italiana
    { name: 'Pizza quattro formaggi',      emoji: '🍕', cat: 'italiana' },
    { name: 'Pasta arrabiata',             emoji: '🍝', cat: 'italiana' },
    { name: 'Lasaña vegetariana',          emoji: '🍝', cat: 'italiana' },
    // Internacional
    { name: 'Tacos al pastor',             emoji: '🌮', cat: 'internacional' },
    { name: 'Quesadillas de pollo',        emoji: '🌮', cat: 'internacional' },
    { name: 'Shawarma de pollo',           emoji: '🌯', cat: 'internacional' },
    // Comida rápida
    { name: 'Hamburguesa con queso',       emoji: '🍔', cat: 'comida_rapida' },
    { name: 'Pizza de mechada',            emoji: '🍕', cat: 'comida_rapida' },
    { name: 'Pizza napolitana',            emoji: '🍕', cat: 'comida_rapida' },
    { name: 'Pollo frito con papas',       emoji: '🍗', cat: 'comida_rapida' },
    { name: 'Hot dog al estilo chileno',   emoji: '🌭', cat: 'comida_rapida' },
];

const MEAL_POOLS = {
    desayuno: { hint: 'Perfecto para empezar el día',       pool: FOODS_DESAYUNO },
    almuerzo: { hint: 'La mejor hora para el almuerzo',     pool: FOODS_ALMUERZO },
    once:     { hint: '¡Hora de la once!',                  pool: FOODS_ONCE     },
    cena:     { hint: 'Para terminar el día con todo',      pool: FOODS_CENA     },
};

function getAutoMealKey() {
    const hour = new Date().getHours();
    if (hour >= 6  && hour < 12) return 'desayuno';
    if (hour >= 12 && hour < 16) return 'almuerzo';
    if (hour >= 16 && hour < 20) return 'once';
    return 'cena';
}

// ── Anti-repeat shuffle queue ──────────────────────────
const _queues = new Map();

function getNextItem(key, pool) {
    if (!_queues.has(key) || _queues.get(key).length === 0) {
        const shuffled = [...pool];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        _queues.set(key, shuffled);
    }
    return _queues.get(key).pop();
}

// ── Category filter ────────────────────────────────────
const CAT_META = {
    chilena:       '🇨🇱 Chilena',
    asiatica:      '🌏 Asiática',
    italiana:      '🍕 Italiana',
    internacional: '🌮 Internacional',
    comida_rapida: '🍔 Comida rápida',
};
const CAT_ORDER = ['chilena', 'asiatica', 'italiana', 'internacional', 'comida_rapida'];

let activeCats = new Set(
    JSON.parse(localStorage.getItem('tetinca_cats') || 'null') || CAT_ORDER
);

function saveCats() {
    localStorage.setItem('tetinca_cats', JSON.stringify([...activeCats]));
}

function getFilteredPool(pool) {
    if (!pool[0]?.cat) return pool;
    const filtered = pool.filter(item => activeCats.has(item.cat));
    return filtered.length > 0 ? filtered : pool;
}

function renderCatFilter(pool) {
    const filterEl  = document.getElementById('cat-filter');
    const chipsEl   = document.getElementById('cat-filter-chips');
    const available = CAT_ORDER.filter(cat => pool.some(item => item.cat === cat));

    if (available.length === 0) { filterEl.classList.add('hidden'); return; }
    filterEl.classList.remove('hidden');
    chipsEl.innerHTML = '';

    available.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'cat-filter-chip' + (activeCats.has(cat) ? ' active' : '');
        btn.textContent = CAT_META[cat];
        btn.addEventListener('click', () => {
            const activeAvail = available.filter(c => activeCats.has(c));
            if (activeCats.has(cat) && activeAvail.length <= 1) return;
            if (activeCats.has(cat)) activeCats.delete(cat); else activeCats.add(cat);
            saveCats();
            _queues.delete(selectedMeal);
            btn.classList.toggle('active', activeCats.has(cat));
            btn.classList.toggle('', !activeCats.has(cat));
        });
        chipsEl.appendChild(btn);
    });
}

function updateCatFilter() {
    renderCatFilter(MEAL_POOLS[selectedMeal].pool);
}

// ── Slot machine animation ─────────────────────────────
function slotMachine(pool, emojiEl, nameEl, card, onDone, finalItem) {
    card.classList.remove('revealed');
    card.classList.add('spinning');

    const STEPS = 28;
    let step = 0;

    function easeDelay(s) {
        const t = s / STEPS;
        return Math.round(55 + 520 * Math.pow(t, 2.4));
    }

    function tick() {
        const isLast = step === STEPS - 1;
        const item = (isLast && finalItem) ? finalItem : pool[Math.floor(Math.random() * pool.length)];

        emojiEl.textContent = item.emoji || '🎯';
        nameEl.textContent = item.name;
        nameEl.style.animation = 'none';
        void nameEl.offsetWidth;
        nameEl.style.animation = 'slot-in 0.11s ease-out forwards';

        step++;

        if (step < STEPS) {
            setTimeout(tick, easeDelay(step));
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
const randomHint  = document.getElementById('random-hint');

let selectedMeal = getAutoMealKey();

function updateMealButtons() {
    document.querySelectorAll('.meal-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.meal === selectedMeal);
    });
}

document.querySelectorAll('.meal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedMeal = btn.dataset.meal;
        updateMealButtons();
        updateCatFilter();
        randomCard.classList.remove('revealed');
        randomHint.textContent = 'Pulsa el botón y te lo decimos nosotros';
        randomEmoji.textContent = '🍽️';
        randomName.textContent = '¿Te tinca comer?';
    });
});

updateMealButtons();
updateCatFilter();

randomBtn.addEventListener('click', () => {
    randomBtn.disabled = true;
    document.getElementById('comer-share-wrapper').classList.add('hidden');
    const { pool, hint } = MEAL_POOLS[selectedMeal];
    const filteredPool = getFilteredPool(pool);
    const finalItem = getNextItem(selectedMeal, filteredPool);
    slotMachine(filteredPool, randomEmoji, randomName, randomCard, (item) => {
        randomHint.textContent = hint;
        randomBtn.disabled = false;
        showShareBtn('comer', item.name, item.emoji);
    }, finalItem);
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

// ── ¿Qué hacer? activity list ─────────────────────────
const ACTIVITIES = [
    // Social / Con amigos
    { name: 'Hacer un asado con amigos',        emoji: '🔥' },
    { name: 'Ir a carretear',                   emoji: '🍻' },
    { name: 'Tomar once en casa',               emoji: '🫖' },
    { name: 'Karaoke',                          emoji: '🎤' },
    { name: 'Juegos de mesa con amigos',        emoji: '🎲' },
    { name: 'Ir a ver el partido al estadio',   emoji: '⚽' },
    { name: 'Organizar una picada',             emoji: '🍽️' },

    // Aire libre / Naturaleza
    { name: 'Subir al cerro San Cristóbal',     emoji: '⛰️' },
    { name: 'Cajón del Maipo',                  emoji: '🏔️' },
    { name: 'Trekking en la cordillera',        emoji: '🥾' },
    { name: 'Pasear por el Parque Forestal',    emoji: '🌳' },
    { name: 'Andar en bici por la ciclovía',    emoji: '🚴' },
    { name: 'Salir a correr al parque',         emoji: '🏃' },
    { name: 'Picnic en el parque',              emoji: '🧺' },
    { name: 'Ir a la playa a Viña del Mar',     emoji: '🏖️' },
    { name: 'Escaparse a Valparaíso',           emoji: '🎨' },

    // Cultural / Entretenimiento
    { name: 'Ir al cine',                       emoji: '🎬' },
    { name: 'Recorrer el Barrio Bellavista',    emoji: '🗺️' },
    { name: 'Visitar el Mercado Central',       emoji: '🦞' },
    { name: 'Ir a un concierto o festival',     emoji: '🎶' },
    { name: 'Recorrer el Barrio Lastarria',     emoji: '☕' },
    { name: 'Visitar un museo',                 emoji: '🖼️' },
    { name: 'Ir a una obra de teatro',          emoji: '🎭' },
    { name: 'Feria de artesanía',               emoji: '🛍️' },
    { name: 'Viña en el Valle del Maipo',       emoji: '🍷' },

    // Deporte
    { name: 'Jugar pádel',                      emoji: '🏸' },
    { name: 'Jugar fútbol con el barrio',       emoji: '⚽' },
    { name: 'Nadar en la piscina',              emoji: '🏊' },
    { name: 'Clase de baile (salsa/cueca)',     emoji: '💃' },
    { name: 'Ir al gimnasio',                   emoji: '🏋️' },

    // En casa
    { name: 'Maratón de serie en Netflix',      emoji: '📺' },
    { name: 'Cocinar algo nuevo',               emoji: '👨‍🍳' },
    { name: 'Leer un libro',                    emoji: '📚' },
    { name: 'Videojuegos',                      emoji: '🎮' },
    { name: 'Escuchar música y relajarse',      emoji: '🎧' },
];

// ── ¿Qué hacer? — random mode ──────────────────────────
const hacerRandomBtn    = document.getElementById('hacer-random-btn');
const hacerRandomCard   = document.getElementById('hacer-random-result');
const hacerRandomEmoji  = document.getElementById('hacer-random-emoji');
const hacerRandomName   = document.getElementById('hacer-random-name');

hacerRandomBtn.addEventListener('click', () => {
    hacerRandomBtn.disabled = true;
    document.getElementById('hacer-share-wrapper').classList.add('hidden');
    const finalItem = getNextItem('hacer', ACTIVITIES);
    slotMachine(ACTIVITIES, hacerRandomEmoji, hacerRandomName, hacerRandomCard, (item) => {
        hacerRandomBtn.disabled = false;
        showShareBtn('hacer', item.name);
    }, finalItem);
});

// ── ¿Qué hacer? — custom mode ──────────────────────────
const hacerOptionInput  = document.getElementById('hacer-option-input');
const hacerAddBtn       = document.getElementById('hacer-add-btn');
const hacerChipsEl      = document.getElementById('hacer-chips');
const hacerCustomBtn    = document.getElementById('hacer-custom-btn');
const hacerCustomCard   = document.getElementById('hacer-custom-result');
const hacerCustomEmoji  = document.getElementById('hacer-custom-emoji');
const hacerCustomName   = document.getElementById('hacer-custom-name');

let hacerOptions = [];

function renderHacerChips() {
    hacerChipsEl.innerHTML = '';
    if (hacerOptions.length === 0) {
        hacerChipsEl.innerHTML = '<span class="chips-empty">Agrega al menos 2 opciones para decidir</span>';
        hacerCustomBtn.disabled = true;
        return;
    }
    hacerOptions.forEach((opt, i) => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.innerHTML = `${opt} <button class="chip-remove" aria-label="Eliminar">×</button>`;
        chip.querySelector('.chip-remove').addEventListener('click', () => {
            hacerOptions.splice(i, 1);
            renderHacerChips();
        });
        hacerChipsEl.appendChild(chip);
    });
    hacerCustomBtn.disabled = hacerOptions.length < 2;
}

function addHacerOption() {
    const val = hacerOptionInput.value.trim();
    if (!val || hacerOptions.includes(val)) return;
    hacerOptions.push(val);
    hacerOptionInput.value = '';
    renderHacerChips();
    hacerCustomCard.classList.add('hidden');
    hacerCustomCard.classList.remove('revealed');
}

hacerAddBtn.addEventListener('click', addHacerOption);
hacerOptionInput.addEventListener('keydown', e => { if (e.key === 'Enter') addHacerOption(); });

hacerCustomBtn.addEventListener('click', () => {
    hacerCustomBtn.disabled = true;
    hacerCustomCard.classList.remove('hidden');
    const pool = hacerOptions.map(o => ({ name: o, emoji: '🎯' }));
    slotMachine(pool, hacerCustomEmoji, hacerCustomName, hacerCustomCard, () => {
        hacerCustomBtn.disabled = false;
    });
});

renderHacerChips();

// ── Instagram Story image generation ──────────────────
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    const lines = [];
    for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = test;
        }
    }
    lines.push(line);
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}

function generateStoryImage(emoji, foodName) {
    const W = 540, H = 960;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Background
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#fb923c');
    grad.addColorStop(1, '#ea580c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Decorative circles
    [[W * 0.88, H * 0.10, 130, 0.09], [W * 0.12, H * 0.85, 100, 0.07], [W * 0.5, H * 0.96, 70, 0.05]].forEach(([cx, cy, r, a]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fill();
    });

    ctx.textAlign = 'center';

    // Logo
    ctx.font = 'bold 60px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('¿Tetinca?', W / 2, 140);

    ctx.font = '24px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('El que decide por ti', W / 2, 182);

    ctx.beginPath();
    ctx.moveTo(W / 2 - 60, 205);
    ctx.lineTo(W / 2 + 60, 205);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Emoji
    ctx.font = '190px serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(emoji, W / 2, 485);

    // Label
    ctx.font = '26px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('Hoy me toca comer...', W / 2, 578);

    // Food name
    ctx.font = 'bold 52px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    wrapText(ctx, foodName, W / 2, 652, W - 80, 64);

    // URL
    ctx.font = '22px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText('tetinca.cl', W / 2, H - 68);

    return canvas;
}

function shareAsStory(emoji, foodName) {
    const canvas = generateStoryImage(emoji, foodName);
    canvas.toBlob(async (blob) => {
        const file = new File([blob], 'tetinca-story.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file] });
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
            }
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tetinca-story.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 'image/png');
}

// ── WhatsApp share ─────────────────────────────────────
function showShareBtn(context, resultText, emoji = null) {
    const wrapper = document.getElementById(`${context}-share-wrapper`);
    if (!wrapper) return;
    const btn = document.getElementById(`${context}-share-btn`);
    const siteUrl = 'https://tetinca.cl';
    const messages = {
        comer:  `¡¿Tetinca? me dijo que coma *${resultText}* hoy 🍽️\n¿Tú qué vas a comer? → ${siteUrl}`,
        hacer:  `¡¿Tetinca? me recomienda *${resultText}* hoy 🎯\n¿Tú qué vas a hacer? → ${siteUrl}`,
        ver:    `¡¿Tetinca? me recomienda ver *${resultText}* 🎬\n¿Tú qué ves esta noche? → ${siteUrl}`,
    };
    const text = messages[context] || `¡¿Tetinca? me recomienda: *${resultText}* → ${siteUrl}`;
    btn.onclick = () => window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');

    const instaBtn = document.getElementById(`${context}-insta-btn`);
    if (instaBtn && emoji !== null) {
        instaBtn.onclick = () => shareAsStory(emoji, resultText);
    }

    wrapper.classList.remove('hidden');
}

// ── ¿Qué ver? — movies & series by mood ───────────────
const MOVIES = {
    comedia: [
        { name: 'Superbad',                      emoji: '😂', platform: 'Netflix'      },
        { name: 'The Grand Budapest Hotel',      emoji: '😂', platform: 'Disney+'      },
        { name: 'Knives Out',                    emoji: '😂', platform: 'Netflix'      },
        { name: 'Game Night',                    emoji: '😂', platform: 'Max'          },
        { name: 'What We Do in the Shadows',     emoji: '😂', platform: 'Disney+'      },
        { name: 'The Nice Guys',                 emoji: '😂', platform: 'Prime Video'  },
        { name: 'Palm Springs',                  emoji: '😂', platform: 'Prime Video'  },
        { name: 'Schitt\'s Creek',               emoji: '😂', platform: 'Netflix'      },
        { name: 'Abbott Elementary',             emoji: '😂', platform: 'Disney+'      },
        { name: 'Only Murders in the Building',  emoji: '😂', platform: 'Disney+'      },
    ],
    drama: [
        { name: 'Succession',                    emoji: '🎭', platform: 'Max'          },
        { name: 'The Shawshank Redemption',      emoji: '🎭', platform: 'Netflix'      },
        { name: 'Breaking Bad',                  emoji: '🎭', platform: 'Netflix'      },
        { name: 'Parasite',                      emoji: '🎭', platform: 'Prime Video'  },
        { name: 'The Crown',                     emoji: '🎭', platform: 'Netflix'      },
        { name: 'Ozark',                         emoji: '🎭', platform: 'Netflix'      },
        { name: 'Mare of Easttown',              emoji: '🎭', platform: 'Max'          },
        { name: 'Peaky Blinders',                emoji: '🎭', platform: 'Netflix'      },
        { name: 'The Bear',                      emoji: '🎭', platform: 'Disney+'      },
        { name: 'Manchester by the Sea',         emoji: '🎭', platform: 'Prime Video'  },
    ],
    accion: [
        { name: 'Mad Max: Fury Road',            emoji: '💥', platform: 'Max'          },
        { name: 'John Wick',                     emoji: '💥', platform: 'Netflix'      },
        { name: 'The Gray Man',                  emoji: '💥', platform: 'Netflix'      },
        { name: 'Extraction',                    emoji: '💥', platform: 'Netflix'      },
        { name: 'Top Gun: Maverick',             emoji: '💥', platform: 'Prime Video'  },
        { name: 'The Boys',                      emoji: '💥', platform: 'Prime Video'  },
        { name: 'Squid Game',                    emoji: '💥', platform: 'Netflix'      },
        { name: 'Nobody',                        emoji: '💥', platform: 'Netflix'      },
        { name: 'Reacher',                       emoji: '💥', platform: 'Prime Video'  },
        { name: 'Money Heist',                   emoji: '💥', platform: 'Netflix'      },
    ],
    terror: [
        { name: 'Hereditary',                    emoji: '👻', platform: 'Max'          },
        { name: 'A Quiet Place',                 emoji: '👻', platform: 'Prime Video'  },
        { name: 'The Haunting of Hill House',    emoji: '👻', platform: 'Netflix'      },
        { name: 'Midsommar',                     emoji: '👻', platform: 'Prime Video'  },
        { name: 'Get Out',                       emoji: '👻', platform: 'Prime Video'  },
        { name: 'The Black Phone',               emoji: '👻', platform: 'Netflix'      },
        { name: 'Barbarian',                     emoji: '👻', platform: 'Disney+'      },
        { name: 'Midnight Mass',                 emoji: '👻', platform: 'Netflix'      },
        { name: 'The Menu',                      emoji: '👻', platform: 'Disney+'      },
        { name: 'Smile',                         emoji: '👻', platform: 'Prime Video'  },
    ],
    romance: [
        { name: 'To All the Boys I\'ve Loved',  emoji: '❤️', platform: 'Netflix'      },
        { name: 'Bridgerton',                    emoji: '❤️', platform: 'Netflix'      },
        { name: 'The Notebook',                  emoji: '❤️', platform: 'Netflix'      },
        { name: 'Normal People',                 emoji: '❤️', platform: 'Disney+'      },
        { name: 'About Time',                    emoji: '❤️', platform: 'Prime Video'  },
        { name: 'Outlander',                     emoji: '❤️', platform: 'Netflix'      },
        { name: 'La La Land',                    emoji: '❤️', platform: 'Prime Video'  },
        { name: 'One Day',                       emoji: '❤️', platform: 'Netflix'      },
        { name: 'Virgin River',                  emoji: '❤️', platform: 'Netflix'      },
        { name: 'When Harry Met Sally',          emoji: '❤️', platform: 'Max'          },
    ],
    documental: [
        { name: 'Making a Murderer',             emoji: '🔬', platform: 'Netflix'      },
        { name: 'Our Planet',                    emoji: '🔬', platform: 'Netflix'      },
        { name: 'The Last Dance',                emoji: '🔬', platform: 'Netflix'      },
        { name: 'Wild Wild Country',             emoji: '🔬', platform: 'Netflix'      },
        { name: 'My Octopus Teacher',            emoji: '🔬', platform: 'Netflix'      },
        { name: 'The Tinder Swindler',           emoji: '🔬', platform: 'Netflix'      },
        { name: 'Abstract: The Art of Design',   emoji: '🔬', platform: 'Netflix'      },
        { name: 'Chef\'s Table',                 emoji: '🔬', platform: 'Netflix'      },
        { name: 'Formula 1: Drive to Survive',   emoji: '🔬', platform: 'Netflix'      },
        { name: 'Don\'t F**k with Cats',         emoji: '🔬', platform: 'Netflix'      },
    ],
};

const PLATFORM_COLORS = {
    'Netflix':      { bg: '#e50914', text: '#fff' },
    'Prime Video':  { bg: '#00a8e0', text: '#fff' },
    'Disney+':      { bg: '#0063e5', text: '#fff' },
    'Max':          { bg: '#6b2df5', text: '#fff' },
};

let selectedMood = 'comedia';

function updateMoodButtons() {
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mood === selectedMood);
    });
}

document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedMood = btn.dataset.mood;
        updateMoodButtons();
        const verCard = document.getElementById('ver-result');
        verCard.classList.remove('revealed');
        document.getElementById('ver-emoji').textContent = '🎬';
        document.getElementById('ver-name').textContent = '¿Te tinca ver algo?';
        document.getElementById('ver-hint').textContent = 'Elige un género y decidimos por ti';
        document.getElementById('ver-platform').classList.add('hidden');
        document.getElementById('ver-share-wrapper').classList.add('hidden');
    });
});

updateMoodButtons();

const verBtn      = document.getElementById('ver-btn');
const verCard     = document.getElementById('ver-result');
const verEmoji    = document.getElementById('ver-emoji');
const verName     = document.getElementById('ver-name');
const verHint     = document.getElementById('ver-hint');
const verPlatform = document.getElementById('ver-platform');

verBtn.addEventListener('click', () => {
    verBtn.disabled = true;
    document.getElementById('ver-share-wrapper').classList.add('hidden');
    verPlatform.classList.add('hidden');
    const pool = MOVIES[selectedMood];
    const finalItem = getNextItem('ver-' + selectedMood, pool);
    slotMachine(pool, verEmoji, verName, verCard, (item) => {
        verBtn.disabled = false;
        const colors = PLATFORM_COLORS[item.platform] || { bg: '#555', text: '#fff' };
        verPlatform.textContent = item.platform;
        verPlatform.style.setProperty('--platform-bg', colors.bg);
        verPlatform.style.setProperty('--platform-text', colors.text);
        verPlatform.classList.remove('hidden');
        showShareBtn('ver', `${item.name} (${item.platform})`);
    }, finalItem);
});

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
            document.getElementById('horo-salud').textContent    = data.salud    || '';
            document.getElementById('horo-consejo').textContent  = data.consejo  || '';

            const energia = data.energia || 5;
            document.getElementById('horo-energia-fill').style.width = (energia * 10) + '%';
            document.getElementById('horo-energia-fill').dataset.level = energia >= 7 ? 'high' : energia >= 4 ? 'mid' : 'low';
            document.getElementById('horo-energia-val').textContent = energia + '/10';
            document.getElementById('horo-numero').textContent  = data.numero_suerte || '–';
            document.getElementById('horo-color').textContent   = data.color_suerte  || '–';
        }

        card.classList.add('hidden');
        requestAnimationFrame(() => card.classList.remove('hidden'));
    });
});

// ── Comment submission ─────────────────────────────────
const commentSubmit   = document.getElementById('comment-submit');
const commentFeedback = document.getElementById('comment-feedback');

function showCommentFeedback(msg, type) {
    commentFeedback.textContent = msg;
    commentFeedback.className = 'comment-feedback ' + type;
    setTimeout(() => { commentFeedback.className = 'comment-feedback hidden'; }, 3500);
}

commentSubmit.addEventListener('click', async () => {
    const name = document.getElementById('comment-name').value.trim();
    const text = document.getElementById('comment-text').value.trim();
    if (!text) { showCommentFeedback('Escribe algo para comentar 📝', 'error'); return; }
    if (text.length < 3) { showCommentFeedback('El comentario es muy corto.', 'error'); return; }
    if (hasBadWord(name) || hasBadWord(text)) {
        showCommentFeedback('Tu comentario contiene palabras no permitidas.', 'error'); return;
    }
    const lastSubmit = parseInt(localStorage.getItem('tetinca_last_comment') || '0');
    if (Date.now() - lastSubmit < 30000) {
        showCommentFeedback('Espera 30 segundos antes de comentar de nuevo.', 'error'); return;
    }
    commentSubmit.disabled = true;
    try {
        await db.collection('comments_' + currentCat).add({
            name: name || 'Anónimo',
            text,
            ts: firebase.firestore.FieldValue.serverTimestamp(),
        });
        document.getElementById('comment-text').value = '';
        localStorage.setItem('tetinca_last_comment', Date.now().toString());
        showCommentFeedback('¡Comentario publicado! 🎉', 'success');
    } catch {
        showCommentFeedback('Error al publicar. Inténtalo de nuevo.', 'error');
    } finally {
        commentSubmit.disabled = false;
    }
});

switchComments('comer');

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
