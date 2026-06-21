
// ── Theme ──────────────────────────────────────────────
const themeBtn = document.getElementById('theme-btn');
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
    themeBtn.textContent = '☀️';
}

const CAT_THEMES = ['theme-comer','theme-hacer','theme-horoscopo','theme-ver','theme-encuesta','theme-trivia','theme-confesiones','theme-sudoku'];
function applyCatTheme(cat) {
    document.body.classList.remove(...CAT_THEMES);
    document.body.classList.add(`theme-${cat}`);
}
applyCatTheme('comer');

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
    comer:       { badge: '🍽️ ¿Te tinca comer?',  desc: '¿Probaste alguno de estos platos hoy? ¡Cuéntanos qué tal!' },
    horoscopo:   { badge: '🔮 Horóscopo',           desc: '¿Tu horóscopo de hoy te hizo sentido? ¡Comparte tu experiencia!' },
    hacer:       { badge: '🎯 ¿Te tinca hacer?',    desc: '¿Qué planes tienes para hoy? ¡Cuéntanos!' },
    ver:         { badge: '🎬 ¿Te tinca ver?',      desc: '¿Viste alguna de estas pelis o series? ¡Cuéntanos qué tal!' },
    encuesta:    { badge: '🗳️ Votemos',             desc: '¿Qué te pareció la pregunta de hoy? ¡Cuéntanos!' },
    trivia:      { badge: '🧠 Trivia',              desc: '¿Cómo te fue en la trivia? ¿Fue fácil o difícil?' },
    confesiones: { badge: '🤫 Confesiones',         desc: '¿Te identificaste con alguna? ¡Comenta!' },
    sudoku:      { badge: '🔢 Sudoku',              desc: '¿Cuánto tardaste? ¡Comparte tu tiempo!' },
};

const BAD_WORDS = [
    // Chilean/Spanish profanity
    'puta','puto','weon','weona','wea','huevon','huevona',
    'culiao','culiada','culiar','culiado','culiando',
    'mierda','concha','chucha','conchetumare','ctm',
    'aweonao','aweonado','maricon','maricona','marika','forro',
    'saco de wea',
    // Genitals
    'pico','pene','pija','verga','culo','teta','tetas','poto','cuca','raja',
    // Sexual
    'coger','cogida','follar','follando','culiar','mamada','porno','prostituta',
    // English
    'fuck','shit','bitch','cunt','dick','pussy','ass','asshole',
    'bastard','cock','whore','slut','nigger','nigga','faggot','motherfucker',
];

function normalize(str) {
    return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
function hasBadWord(text) {
    const n = normalize(text);
    return BAD_WORDS.some(w => {
        const nw = normalize(w);
        if (nw.includes(' ')) return n.includes(nw);
        return new RegExp('(?<![a-z])' + nw + '(?![a-z])').test(n);
    });
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
let isAdminMode = false;
let logoTaps = 0, logoTapTimer = null;
const ADMIN_HASH = '9c58f514b13304e33ae37067398b4c7ce6ae701f4004c66549627be6d76da2f1'; // tetinca2026

async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

document.querySelector('.logo-main').addEventListener('click', () => {
    logoTaps++;
    if (logoTapTimer) clearTimeout(logoTapTimer);
    if (logoTaps >= 5) { logoTaps = 0; showAdminModal(); return; }
    logoTapTimer = setTimeout(() => { logoTaps = 0; }, 2000);
});

function showAdminModal() {
    const overlay = document.createElement('div');
    overlay.className = 'admin-overlay';
    overlay.innerHTML =
        '<div class="admin-modal">' +
            '<h3>Acceso de administrador</h3>' +
            '<input type="password" id="admin-pw-input" placeholder="Contraseña" autocomplete="off">' +
            '<div class="admin-modal-actions">' +
                '<button class="admin-cancel-btn">Cancelar</button>' +
                '<button class="admin-enter-btn">Entrar</button>' +
            '</div>' +
            '<div class="admin-error hidden" id="admin-error">Contraseña incorrecta</div>' +
        '</div>';
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#admin-pw-input');
    input.focus();
    overlay.querySelector('.admin-cancel-btn').addEventListener('click', () => overlay.remove());
    overlay.querySelector('.admin-enter-btn').addEventListener('click', () => verifyAdmin(input.value, overlay));
    input.addEventListener('keydown', e => { if (e.key === 'Enter') verifyAdmin(input.value, overlay); });
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

async function verifyAdmin(password, overlay) {
    const hash = await sha256(password);
    if (hash === ADMIN_HASH) {
        isAdminMode = true;
        overlay.remove();
        loadComments(currentCat);
        if (confessionsInitialized) loadConfessions();
        const banner = document.createElement('div');
        banner.className = 'admin-banner';
        banner.id = 'admin-banner';
        banner.innerHTML =
            '🔑 Modo administrador activo' +
            '<button id="admin-delete-all-btn">🗑️ Borrar todos</button>' +
            '<button id="admin-exit-btn">Salir</button>';
        document.querySelector('.comments-section').prepend(banner);
        document.getElementById('admin-exit-btn').addEventListener('click', () => {
            isAdminMode = false;
            banner.remove();
            loadComments(currentCat);
            if (confessionsInitialized) loadConfessions();
        });
        document.getElementById('admin-delete-all-btn').addEventListener('click', async () => {
            if (!confirm('¿Borrar TODOS los comentarios de esta sección?')) return;
            const snap = await db.collection('comments_' + currentCat).get();
            const batch = db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        });
    } else {
        overlay.querySelector('#admin-error').classList.remove('hidden');
    }
}

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
            const reported = JSON.parse(localStorage.getItem('tetinca_reported') || '[]');
            listEl.innerHTML = '';
            snap.forEach(doc => {
                const d = doc.data();
                const docId = doc.id;
                const reports = d.reports || 0;
                const isReported = reports >= 3;
                const alreadyReported = reported.includes(docId);

                const item = document.createElement('div');
                item.className = 'comment-item' + (isReported ? ' comment-reported' : '');
                item.innerHTML =
                    '<div class="comment-header">' +
                        '<span class="comment-author">' + escapeHtml(d.name || 'Anónimo') + '</span>' +
                        '<span class="comment-time">' + formatCommentTime(d.ts) + '</span>' +
                        (isAdminMode ? '<button class="comment-delete-btn" data-id="' + docId + '" data-cat="' + cat + '">🗑️</button>' : '') +
                    '</div>' +
                    '<div class="comment-body' + (isReported ? ' comment-hidden-text' : '') + '">' +
                        (isReported ? 'Comentario oculto por reportes' : escapeHtml(d.text)) +
                    '</div>' +
                    '<div class="comment-footer">' +
                        (isReported
                            ? '<span class="comment-report-label">⚑ Reportado</span>'
                            : '<button class="comment-report-btn' + (alreadyReported ? ' already-reported' : '') + '" data-id="' + docId + '" data-cat="' + cat + '"' + (alreadyReported ? ' disabled' : '') + '>⚑ Reportar</button>') +
                    '</div>';
                listEl.appendChild(item);
            });

            listEl.querySelectorAll('.comment-report-btn:not([disabled])').forEach(btn => {
                btn.addEventListener('click', async () => {
                    btn.disabled = true;
                    await db.collection('comments_' + btn.dataset.cat).doc(btn.dataset.id).update({
                        reports: firebase.firestore.FieldValue.increment(1)
                    });
                    const rep = JSON.parse(localStorage.getItem('tetinca_reported') || '[]');
                    rep.push(btn.dataset.id);
                    localStorage.setItem('tetinca_reported', JSON.stringify(rep));
                });
            });

            listEl.querySelectorAll('.comment-delete-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (!confirm('¿Borrar este comentario?')) return;
                    await db.collection('comments_' + btn.dataset.cat).doc(btn.dataset.id).delete();
                });
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
        applyCatTheme(cat);
        if (cat === 'horoscopo' && !horoscopeData) loadHoroscope();
        if (cat === 'encuesta' && !pollInitialized) { pollInitialized = true; initPoll(); }
        if (cat === 'confesiones' && !confessionsInitialized) { confessionsInitialized = true; loadConfessions(); }
        if (cat === 'sudoku' && !sudokuTabInitialized) { sudokuTabInitialized = true; initSudokuTab(); }
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
let MOVIES = {};
let moviesUpdatedAt = null;
let cinemaUpdatedAt = null;

async function loadMovies() {
    try {
        const res = await fetch('data/movies.json?v=' + Date.now());
        const data = await res.json();
        MOVIES = data.categories;
        moviesUpdatedAt = data.updated_at;
        updateVerBadge();
    } catch (e) {
        console.error('Failed to load movies:', e);
    }
}

async function loadCinema() {
    try {
        const res = await fetch('data/cinema.json?v=' + Date.now());
        const data = await res.json();
        MOVIES['cines'] = data.cartelera;
        cinemaUpdatedAt = data.updated_at;
        updateVerBadge();
    } catch (e) {
        console.error('Failed to load cinema:', e);
    }
}

loadMovies();
loadCinema();

const PLATFORM_COLORS = {
    'Netflix':      { bg: '#e50914', text: '#fff' },
    'Prime Video':  { bg: '#00a8e0', text: '#fff' },
    'Disney+':      { bg: '#0063e5', text: '#fff' },
    'Max':          { bg: '#6b2df5', text: '#fff' },
    'Paramount+':   { bg: '#0064ff', text: '#fff' },
    'Cinemark':     { bg: '#dc2626', text: '#fff'    },
    'Cinépolis':    { bg: '#fbbf24', text: '#1c1917' },
};

function fmtDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${parseInt(d,10)} ${months[parseInt(m,10)-1]} ${y}`;
}

function fmtMonthYear(iso) {
    if (!iso) return '';
    const [y, m] = iso.split('-');
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${months[parseInt(m,10)-1]} ${y}`;
}

const MOOD_UPDATE_LABEL = {
    clasico: ()     => `🎞️ Selección de grandes clásicos del cine`,
    estreno: ()     => `✨ Estrenos — actualizado en ${fmtMonthYear(moviesUpdatedAt)}`,
    cines:   ()     => `🎟️ Cartelera Cinemark · Cinépolis — actualizado ${fmtDate(cinemaUpdatedAt)}`,
};

function updateVerBadge() {
    const badge = document.getElementById('ver-update-badge');
    if (!badge) return;
    const fn = MOOD_UPDATE_LABEL[selectedMood];
    if (fn) {
        badge.textContent = fn();
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

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
        updateVerBadge();
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
    const pool = MOVIES[selectedMood];
    if (!pool || pool.length === 0) return;
    verBtn.disabled = true;
    document.getElementById('ver-share-wrapper').classList.add('hidden');
    verPlatform.classList.add('hidden');
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

let pollInitialized = false;
let confessionsInitialized = false;

// ── Encuesta del día ─────────────────────────────────────
const DAILY_POLLS = [
    { q: '¿Tener plata de sobra pero trabajar todo el tiempo, o ganar lo justo con tiempo libre total?',   opts: ['💸 Más plata',            '🛋️ Más tiempo libre'] },
    { q: '¿Volver a tener 18 años sabiendo todo lo que sabes hoy, o quedarte con tu edad actual?',         opts: ['🔄 Volver a los 18',       '✋ Me quedo así'] },
    { q: '¿Vivir en Santiago con todo cerca o irte al sur con naturaleza pero sin delivery?',              opts: ['🏙️ Me quedo en Santiago',  '🌲 Me voy al sur'] },
    { q: '¿Poder leer las mentes o ser invisible cuando quieras?',                                        opts: ['🧠 Leer mentes',           '👻 Ser invisible'] },
    { q: '¿Carretear hasta las 6am o acostarte temprano y amanecer fresco?',                              opts: ['🍻 Carretear hasta el alba','😴 Dormir rico'] },
    { q: '¿Tener 3 amigos de verdad o 100 conocidos que te inviten a todo?',                              opts: ['❤️ 3 de verdad',           '🎉 100 conocidos'] },
    { q: '¿Ser famoso/a o ser millonario/a?',                                                             opts: ['🌟 Famoso/a',              '💰 Millonario/a'] },
    { q: '¿Trabajar desde casa para siempre o ir a la oficina todos los días?',                           opts: ['🏠 Casa para siempre',     '🏢 Oficina siempre'] },
    { q: '¿Empanada de pino o empanada de queso?',                                                        opts: ['🥩 De pino',               '🧀 De queso'] },
    { q: '¿Irte de mochilero 6 meses o comprarte tu primer departamento?',                                opts: ['🎒 Mochilero 6 meses',     '🏠 Mi propio depto'] },
    { q: '¿Vivir 100 años con salud regular o 70 años con salud perfecta?',                               opts: ['100 con altibajos',        '70 con plena salud'] },
    { q: '¿Saber cocinar como chef o tener plata infinita para comer afuera?',                            opts: ['👨‍🍳 Cocinar como chef',    '🍽️ Comer afuera siempre'] },
    { q: '¿Encontrar el amor de tu vida o no pasar nunca más pena de amor?',                              opts: ['❤️ El amor de mi vida',    '🛡️ Nunca más penas'] },
    { q: '¿Ganar el partido jugando horrible o perder jugando de lujo?',                                  opts: ['🏆 Ganar igual',           '⚽ Perder pero bien'] },
    { q: '¿Playa con calor insoportable o montaña con frío extremo?',                                     opts: ['🏖️ Playa igual',           '⛰️ Montaña igual'] },
    { q: '¿Poder hablar todos los idiomas del mundo o tocar cualquier instrumento?',                      opts: ['🗣️ Todos los idiomas',     '🎸 Tocar cualquier cosa'] },
    { q: '¿Tener perro o tener gato?',                                                                    opts: ['🐶 Perro',                 '🐱 Gato'] },
    { q: '¿Si tuvieras que eliminar para siempre una comida chilena, cuál sería?',                        opts: ['☕ Que muera la once',      '🌭 Que muera el completo'] },
    { q: '¿Tener un trabajo estable que odias o uno inestable que amas?',                                 opts: ['💼 Estable aunque lo odie', '❤️ Inestable pero lo amo'] },
    { q: '¿Nunca sentir frío o nunca sentir calor?',                                                      opts: ['🥶 Sin frío jamás',        '🥵 Sin calor jamás'] },
    { q: '¿Ver el final de tu serie favorita antes de terminarla o aguantar el misterio?',                opts: ['📺 Me spoileo altiro',     '🙈 Sin spoilers nunca'] },
    { q: '¿Poder parar el tiempo cuando quieras o retroceder 24 horas una vez por semana?',               opts: ['⏸️ Parar el tiempo',       '⏪ Retroceder 24h'] },
    { q: '¿Chorrillana o lomo a lo pobre?',                                                               opts: ['🍟 Chorrillana',           '🍳 Lomo a lo pobre'] },
    { q: '¿Tu jefe sabe menos que tú o te exige demasiado?',                                              opts: ['🤦 El que no sabe nada',   '😤 El que exige mucho'] },
    { q: '¿Tener memoria perfecta para todo o poder olvidar lo que quieras a voluntad?',                  opts: ['🧠 Memoria perfecta',      '🗑️ Olvidar lo que quiera'] },
    { q: '¿Saber el día exacto en que vas a morir o no saberlo nunca?',                                   opts: ['📅 Prefiero saberlo',      '🙈 Mejor no saber'] },
    { q: '¿Que Chile gane el Mundial o que no haya más Transantiago?',                                    opts: ['⚽ ¡Chile al Mundial!',    '🚌 ¡Mejor Transantiago!'] },
    { q: '¿Empanada frita o al horno? Solo una puede existir.',                                           opts: ['🔥 Frita para siempre',    '♨️ Al horno para siempre'] },
    { q: '¿Asado todos los fines de semana o un viaje internacional una vez al año?',                     opts: ['🔥 Asado cada semana',     '✈️ Viaje internacional'] },
    { q: '¿Despertar siempre descansado/a sin importar cuánto dormiste o nunca más tener hambre?',        opts: ['😴 Siempre descansado/a',  '🍽️ Nunca más hambre'] },
];

function getPollDayKey() {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' });
}

function getTodayPoll() {
    const dayNum = Math.floor(new Date(getPollDayKey()).getTime() / 86400000);
    return DAILY_POLLS[dayNum % DAILY_POLLS.length];
}

let pollUnsubscribe = null;

function renderPollResults(v0, v1, voted) {
    const total = v0 + v1 || 1;
    const pct0 = Math.round(v0 / total * 100);
    const pct1 = 100 - pct0;
    document.getElementById('poll-bar0').style.width = pct0 + '%';
    document.getElementById('poll-bar1').style.width = pct1 + '%';
    document.getElementById('poll-pct0').textContent = pct0 + '%';
    document.getElementById('poll-pct1').textContent = pct1 + '%';
    const total2 = v0 + v1;
    document.getElementById('poll-total').textContent = total2 ? `${total2} voto${total2 !== 1 ? 's' : ''}` : 'Sé el primero en votar';
    const res0 = document.getElementById('poll-res0');
    const res1 = document.getElementById('poll-res1');
    res0.classList.toggle('winner', pct0 >= pct1);
    res1.classList.toggle('winner', pct1 > pct0);
    document.getElementById('poll-mv0').classList.toggle('hidden', voted !== 0);
    document.getElementById('poll-mv1').classList.toggle('hidden', voted !== 1);
    document.getElementById('poll-voting').classList.add('hidden');
    document.getElementById('poll-results').classList.remove('hidden');
}

function initPoll() {
    const poll = getTodayPoll();
    const dateKey = getPollDayKey();
    const dateStr = new Date().toLocaleDateString('es-CL', { timeZone: 'America/Santiago', day: 'numeric', month: 'long' });
    document.getElementById('poll-date-label').textContent = dateStr;
    document.getElementById('poll-question').textContent = poll.q;
    function setOptHtml(spanId, optText) {
        const m = optText.match(/^(\S+)\s(.+)$/);
        const el = document.getElementById(spanId);
        if (m) {
            el.innerHTML = `<span class="poll-opt-emoji">${m[1]}</span><span class="poll-opt-label">${m[2]}</span>`;
        } else {
            el.textContent = optText;
        }
    }
    setOptHtml('poll-opt0-text', poll.opts[0]);
    setOptHtml('poll-opt1-text', poll.opts[1]);
    document.getElementById('poll-res0-text').textContent = poll.opts[0];
    document.getElementById('poll-res1-text').textContent = poll.opts[1];
    const voted = localStorage.getItem('tetinca_poll_' + dateKey);
    if (pollUnsubscribe) pollUnsubscribe();
    pollUnsubscribe = db.collection('comments_poll_' + dateKey).onSnapshot(snap => {
        const v0 = snap.docs.filter(d => d.data().text === 'vote_opt0').length;
        const v1 = snap.docs.filter(d => d.data().text === 'vote_opt1').length;
        const total = v0 + v1;
        if (voted !== null) {
            renderPollResults(v0, v1, parseInt(voted));
        } else {
            document.getElementById('poll-total').textContent = total ? `${total} voto${total !== 1 ? 's' : ''}` : 'Sé el primero en votar';
        }
    });
}

async function vote(optIndex) {
    const dateKey = getPollDayKey();
    if (localStorage.getItem('tetinca_poll_' + dateKey) !== null) return;
    document.getElementById('poll-opt0').disabled = true;
    document.getElementById('poll-opt1').disabled = true;
    try {
        await db.collection('comments_poll_' + dateKey).add({
            name: 'Anónimo',
            text: 'vote_opt' + optIndex,
            ts: firebase.firestore.FieldValue.serverTimestamp(),
        });
        localStorage.setItem('tetinca_poll_' + dateKey, optIndex.toString());
        const snap = await db.collection('comments_poll_' + dateKey).get();
        const v0 = snap.docs.filter(d => d.data().text === 'vote_opt0').length;
        const v1 = snap.docs.filter(d => d.data().text === 'vote_opt1').length;
        renderPollResults(v0, v1, optIndex);
    } catch {
        document.getElementById('poll-opt0').disabled = false;
        document.getElementById('poll-opt1').disabled = false;
    }
}

document.getElementById('poll-opt0').addEventListener('click', () => vote(0));
document.getElementById('poll-opt1').addEventListener('click', () => vote(1));

// ── Trivia Chilena ────────────────────────────────────────
const TRIVIA_POOL = [
    { q: '¿Cuál es la ciudad más austral del mundo?',
      opts: ['Punta Arenas', 'Ushuaia (Argentina)', 'Puerto Natales', 'Puerto Williams'],
      ans: 3 },
    { q: 'El terremoto de Valdivia de 1960 es el más poderoso registrado en la historia. ¿De qué magnitud fue?',
      opts: ['8.5', '9.0', '9.5', '10.0'],
      ans: 2 },
    { q: 'Bernardo O\'Higgins nunca fue "presidente" de Chile formalmente. ¿Qué cargo tuvo?',
      opts: ['Rey constitucional', 'Director Supremo', 'Capitán General', 'Primer Cónsul'],
      ans: 1 },
    { q: '¿Cuántos Premios Nobel ha ganado Chile en total?',
      opts: ['1', '2', '3', '4'],
      ans: 1 },
    { q: '¿Qué significa "filo" cuando alguien dice "filo, déjalo"?',
      opts: ['Está muy enojado', 'Está listo para pelear', 'Da lo mismo, no importa', 'Está muy ocupado'],
      ans: 2 },
    { q: '¿Cuánto equivale exactamente "una luca" en Chile?',
      opts: ['$100', '$500', '$1.000', '$5.000'],
      ans: 2 },
    { q: '¿Quién compuso "Gracias a la Vida", considerada una de las mejores canciones en español?',
      opts: ['Mercedes Sosa', 'Víctor Jara', 'Pablo Neruda', 'Violeta Parra'],
      ans: 3 },
    { q: '¿Cuántos volcanes activos tiene Chile aproximadamente, siendo el país con más en el mundo?',
      opts: ['Menos de 30', 'Unos 50', 'Unos 70', 'Más de 90'],
      ans: 3 },
    { q: '¿Qué animal aparece junto al cóndor en el escudo de Chile?',
      opts: ['Guanaco', 'Pudú', 'Puma', 'Huemul'],
      ans: 3 },
    { q: '¿En qué año se firmó el Acta de Independencia oficial de Chile?',
      opts: ['1810', '1814', '1818', '1823'],
      ans: 2 },
    { q: 'El río más largo de Chile no es el Biobío ni el Mapocho. ¿Cuál es?',
      opts: ['Río Baker', 'Río Loa', 'Río Maule', 'Río Aconcagua'],
      ans: 1 },
    { q: '¿Qué significa "estar pato" en Chile?',
      opts: ['Estar muy borracho', 'No tener nada de dinero', 'Estar muy aburrido', 'Estar muy cansado'],
      ans: 1 },
    { q: '¿Con cuántos países tiene frontera terrestre Chile?',
      opts: ['1', '2', '3', '4'],
      ans: 2 },
    { q: '¿Quién fue la primera persona latinoamericana en ganar el Premio Nobel de Literatura?',
      opts: ['Pablo Neruda', 'Jorge Luis Borges', 'Isabel Allende', 'Gabriela Mistral'],
      ans: 3 },
    { q: '¿Qué significa "arrancarse con los tarros" en Chile?',
      opts: ['Salir corriendo de algo peligroso', 'Robar algo y huir', 'Exagerar o pasarse de la raya', 'Celebrar de forma escandalosa'],
      ans: 2 },
    { q: '¿Cómo se llama el volcán más alto del mundo, ubicado en territorio chileno?',
      opts: ['Villarrica', 'Llullaillaco', 'Ojos del Salado', 'San Pedro'],
      ans: 2 },
    { q: '¿Qué significa tener una "tincada" en Chile?',
      opts: ['Tener mucha hambre', 'Mucha mala suerte seguida', 'Un presentimiento o corazonada', 'Una deuda pendiente'],
      ans: 2 },
    { q: 'Chile produce aproximadamente el ___% del cobre del mundo, siendo el mayor productor.',
      opts: ['5%', '15%', '28%', '55%'],
      ans: 2 },
    { q: '¿En qué año ganó Gabriela Mistral el Premio Nobel de Literatura?',
      opts: ['1938', '1945', '1952', '1971'],
      ans: 1 },
    { q: '¿Qué significa "al lote" en Chile?',
      opts: ['En grupo grande', 'Por sorteo o lotería', 'A la rápida y descuidado', 'En desorden total'],
      ans: 2 },
    { q: 'Mucha gente cree que el fútbol es el deporte nacional de Chile, pero no lo es. ¿Cuál es el oficial?',
      opts: ['Tenis', 'Polo ecuestre', 'Palín mapuche', 'Rodeo chileno'],
      ans: 3 },
    { q: '¿Qué es el "picoteo" en Chile?',
      opts: ['Molestar o picar a alguien', 'Una pelea pequeña de parejas', 'Comer varias cositas variadas', 'Un piropo callejero'],
      ans: 2 },
    { q: '¿Qué significa "comerse un cable" en Chile?',
      opts: ['Comer muy rápido', 'Sufrir mucho o angustiarse', 'Trabajar sin parar', 'Pelear con alguien'],
      ans: 1 },
    { q: '¿Cuál de estos NO es un sinónimo chileno de "amigo cercano"?',
      opts: ['Gancho', 'Compa', 'Copete', 'Cabro'],
      ans: 2 },
    { q: '¿Qué es el "kuchen" tan popular en el sur de Chile y de dónde viene?',
      opts: ['Guiso mapuche con papas', 'Embutido ahumado patagónico', 'Torta de origen alemán', 'Bebida caliente de mote'],
      ans: 2 },
    // ── Chile extra ──────────────────────────────────────
    { q: '¿Cuántos metros sobre el nivel del mar tiene el Ojos del Salado, el volcán más alto del mundo?',
      opts: ['5.500 m', '6.200 m', '6.893 m', '7.200 m'],
      ans: 2 },
    { q: '¿Cuál es la región más nueva de Chile, creada en 2007?',
      opts: ['Los Ríos', 'Arica y Parinacota', 'Ñuble', 'Las crea al mismo tiempo'],
      ans: 1 },
    { q: '¿Cómo se llama el desierto más árido del mundo, ubicado en el norte de Chile?',
      opts: ['Sahara', 'Gobi', 'Atacama', 'Namib'],
      ans: 2 },
    { q: 'La Torre Entel de Santiago mide aproximadamente:',
      opts: ['120 m', '162 m', '200 m', '240 m'],
      ans: 1 },
    { q: '¿Cuánto dura el verano oficial en el sur austral de Chile (Punta Arenas)?',
      opts: ['Casi no hay verano', '2-3 semanas reales de calor', '2 meses templados', '3 meses cálidos'],
      ans: 1 },
    { q: '¿Qué significa "estar en el horno" en Chile?',
      opts: ['Tener mucho calor', 'Estar en un problema grave', 'Estar muy borracho', 'Haber comido demasiado'],
      ans: 1 },
    { q: '¿En qué ciudad de Chile nació Pablo Neruda?',
      opts: ['Santiago', 'Valparaíso', 'Parral', 'Temuco'],
      ans: 2 },
    { q: '¿Cuál es el lago más grande de Chile?',
      opts: ['Lago Llanquihue', 'Lago General Carrera', 'Lago Villarrica', 'Lago Ranco'],
      ans: 1 },
    { q: '¿Cuántos presidentes ha tenido Chile desde el retorno a la democracia en 1990?',
      opts: ['5', '6', '7', '8'],
      ans: 2 },
    { q: 'El Complejo Volcánico Puyehue-Cordón Caulle entró en erupción en 2011. ¿A qué país afectó también con cenizas?',
      opts: ['Perú', 'Bolivia', 'Argentina', 'Brasil'],
      ans: 2 },
    { q: '¿Cuál es la flor nacional de Chile?',
      opts: ['Copihue rojo', 'Rosa mosqueta', 'Palma chilena', 'Alstroemeria'],
      ans: 0 },
    { q: '¿Cuántos días duró el rescate de los 33 mineros de Copiapó en 2010 bajo tierra?',
      opts: ['33 días', '45 días', '69 días', '88 días'],
      ans: 2 },
    { q: '¿Cómo se llama el personaje animado chileno de REC que se hizo viral?',
      opts: ['Trigueñita', 'Cóndor Matías', 'Huaso Coñejo', 'Cuchunflito'],
      ans: 3 },
    { q: '¿Cuánto mide aproximadamente Chile de norte a sur?',
      opts: ['2.500 km', '3.200 km', '4.270 km', '5.000 km'],
      ans: 2 },
    { q: '¿Qué significa "estar con el catre parado" en Chile?',
      opts: ['Estar sin dormir hace días', 'Estar muy enojado o de malas', 'Tener la cama sin hacer', 'Estar muy emocionado'],
      ans: 1 },
    { q: '¿Cuál es el país vecino que Chile no tiene frontera terrestre?',
      opts: ['Perú', 'Bolivia', 'Paraguay', 'Argentina'],
      ans: 2 },
    { q: '¿Qué animal endémico de Chile es el venado más pequeño del mundo?',
      opts: ['Chinchilla', 'Huemul', 'Pudú', 'Vicuña'],
      ans: 2 },
    { q: 'El vino Carménère, emblema de Chile, originalmente era de:',
      opts: ['España', 'Italia', 'Francia', 'Portugal'],
      ans: 2 },
    { q: '¿Cuántas estrellas tiene la bandera de Chile?',
      opts: ['0', '1', '2', '5'],
      ans: 1 },
    { q: '¿Cuál es el apodo del equipo de fútbol Colo-Colo?',
      opts: ['El Cacique', 'El Clásico', 'El Popular', 'El Grande'],
      ans: 0 },
    { q: '¿Dónde está la Isla de Pascua (Rapa Nui) en relación a Chile continental?',
      opts: ['700 km al oeste', '2.000 km al noroeste', '3.700 km al oeste', '5.000 km al norte'],
      ans: 2 },
    { q: '¿Qué año ocurrió el golpe de Estado en Chile que derrocó a Salvador Allende?',
      opts: ['1971', '1972', '1973', '1975'],
      ans: 2 },
    { q: '¿Cuál es el nombre del estadio más grande de Chile?',
      opts: ['Estadio Nacional', 'Estadio Monumental', 'Estadio Santa Laura', 'Estadio San Carlos'],
      ans: 1 },
    { q: '¿Qué significa "hacer la vista gorda" en Chile?',
      opts: ['Exagerar algo', 'Fingir no ver algo malo', 'Mirar con sospecha', 'Poner cara de enojado'],
      ans: 1 },
    { q: '¿Cuál es el himno no oficial de Chile durante los mundiales, interpretado por Los Prisioneros?',
      opts: ['El baile de los que sobran', 'Tren al sur', 'We Are the Champions', 'La voz de los 80'],
      ans: 0 },
    // ── Geografía mundial ────────────────────────────────
    { q: '¿Cuál es el país más grande del mundo por superficie?',
      opts: ['China', 'Estados Unidos', 'Canadá', 'Rusia'],
      ans: 3 },
    { q: '¿Cuál es el río más largo del mundo?',
      opts: ['Amazonas', 'Nilo', 'Yangtsé', 'Misisipi'],
      ans: 1 },
    { q: '¿Cuál es el océano más grande del mundo?',
      opts: ['Atlántico', 'Índico', 'Pacífico', 'Ártico'],
      ans: 2 },
    { q: '¿Cuántos países hay en el mundo actualmente (reconocidos por la ONU)?',
      opts: ['170', '185', '193', '210'],
      ans: 2 },
    { q: '¿Cuál es la capital de Australia?',
      opts: ['Sídney', 'Melbourne', 'Brisbane', 'Canberra'],
      ans: 3 },
    { q: '¿Cuál es el país más pequeño del mundo?',
      opts: ['Mónaco', 'San Marino', 'Liechtenstein', 'Ciudad del Vaticano'],
      ans: 3 },
    { q: '¿Cuál es la montaña más alta del mundo?',
      opts: ['K2', 'Kangchenjunga', 'Everest', 'Lhotse'],
      ans: 2 },
    { q: '¿Qué país tiene más islas en el mundo?',
      opts: ['Indonesia', 'Filipinas', 'Suecia', 'Noruega'],
      ans: 0 },
    { q: '¿Cuál es el desierto más grande del mundo? (Mucha gente se equivoca)',
      opts: ['Sahara', 'Gobi', 'Antártida', 'Arabigo'],
      ans: 2 },
    { q: '¿Cuál es la ciudad más poblada del mundo?',
      opts: ['Pekín', 'Mumbai', 'Tokio', 'Shanghai'],
      ans: 2 },
    { q: '¿En qué continente está Turquía mayoritariamente?',
      opts: ['Europa', 'Asia', 'África', 'A mitad en cada uno'],
      ans: 1 },
    { q: '¿Cuál es el lago más profundo del mundo?',
      opts: ['Lago Superior', 'Lago Titicaca', 'Lago Baikal', 'Lago Victoria'],
      ans: 2 },
    { q: '¿Cuántos países conforman América del Sur?',
      opts: ['10', '12', '13', '14'],
      ans: 1 },
    { q: '¿Cuál es el país con más frontera terrestre compartida con otros países?',
      opts: ['Rusia', 'China', 'Brasil', 'Alemania'],
      ans: 1 },
    { q: '¿Qué ciudad es la más alta del mundo habitada permanentemente?',
      opts: ['Cusco, Perú', 'La Paz, Bolivia', 'Lhasa, Tíbet', 'Potosí, Bolivia'],
      ans: 3 },
    { q: '¿Cuál es el único país que comienza con la letra "Ñ"?',
      opts: ['No existe ninguno', 'Ñoronha (Brasil)', 'Ñuble (Chile)', 'Ningún país empieza con Ñ'],
      ans: 3 },
    { q: '¿Cuál es la capital de Canadá?',
      opts: ['Toronto', 'Montreal', 'Vancouver', 'Ottawa'],
      ans: 3 },
    { q: '¿Cuántos países tiene el continente africano?',
      opts: ['44', '54', '62', '72'],
      ans: 1 },
    { q: '¿Cuál es el punto más bajo de la Tierra?',
      opts: ['Valle de la Muerte', 'Mar Muerto', 'Mar de Galilea', 'Lago Assal'],
      ans: 1 },
    { q: '¿Qué país es el único que NO tiene vecinos?',
      opts: ['Islandia', 'Nueva Zelanda', 'Australia', 'Todos los anteriores'],
      ans: 3 },
    { q: '¿Cuál es el país más visitado del mundo (turismo)?',
      opts: ['España', 'Francia', 'Estados Unidos', 'China'],
      ans: 1 },
    { q: '¿Qué país tiene más de 7.000 islas?',
      opts: ['Indonesia', 'Grecia', 'Filipinas', 'Japón'],
      ans: 2 },
    { q: '¿En qué país está el río Amazonas en su mayor parte?',
      opts: ['Perú', 'Colombia', 'Brasil', 'Ecuador'],
      ans: 2 },
    { q: '¿Cuál es la capital de Brasil?',
      opts: ['São Paulo', 'Río de Janeiro', 'Salvador', 'Brasilia'],
      ans: 3 },
    { q: '¿Cuál es el único mar sin costas (rodeado de tierra)?',
      opts: ['Mar Muerto', 'Mar de Aral', 'Mar Caspio', 'Mar de Sargazos'],
      ans: 3 },
    { q: '¿Cuál es el continente más seco del mundo?',
      opts: ['África', 'Australia', 'Asia', 'Antártida'],
      ans: 3 },
    // ── Ciencia y naturaleza ─────────────────────────────
    { q: '¿Cuántos huesos tiene el cuerpo humano adulto?',
      opts: ['150', '206', '250', '300'],
      ans: 1 },
    { q: '¿Cuánto tarda la luz del Sol en llegar a la Tierra?',
      opts: ['1 segundo', '8 minutos', '1 hora', '8 horas'],
      ans: 1 },
    { q: '¿Cuál es el elemento más abundante en el universo?',
      opts: ['Oxígeno', 'Carbono', 'Hidrógeno', 'Helio'],
      ans: 2 },
    { q: '¿A qué velocidad viaja la luz (aproximadamente)?',
      opts: ['100.000 km/s', '300.000 km/s', '1.000.000 km/s', '3.000.000 km/s'],
      ans: 1 },
    { q: '¿Cuántos cromosomas tiene una célula humana normal?',
      opts: ['23', '36', '46', '52'],
      ans: 2 },
    { q: '¿Cuál es el planeta más grande del sistema solar?',
      opts: ['Saturno', 'Urano', 'Neptuno', 'Júpiter'],
      ans: 3 },
    { q: '¿Cuántos planetas tiene el sistema solar según la IAU desde 2006?',
      opts: ['7', '8', '9', '10'],
      ans: 1 },
    { q: '¿Qué gas es el más abundante en la atmósfera terrestre?',
      opts: ['Oxígeno', 'Dióxido de carbono', 'Nitrógeno', 'Argón'],
      ans: 2 },
    { q: '¿Cuánto tarda la Tierra en dar una vuelta alrededor del Sol?',
      opts: ['364 días', '365.25 días', '366 días', '360 días'],
      ans: 1 },
    { q: '¿Cuál es el metal más abundante en la corteza terrestre?',
      opts: ['Hierro', 'Aluminio', 'Cobre', 'Silicio'],
      ans: 1 },
    { q: '¿Cuántas dimensiones tiene un punto geométrico?',
      opts: ['0', '1', '2', '3'],
      ans: 0 },
    { q: '¿Cuál es el órgano más grande del cuerpo humano?',
      opts: ['Hígado', 'Pulmón', 'Piel', 'Intestino delgado'],
      ans: 2 },
    { q: '¿A qué temperatura hierve el agua a nivel del mar?',
      opts: ['90°C', '95°C', '100°C', '105°C'],
      ans: 2 },
    { q: '¿Cuántas lunas tiene Marte?',
      opts: ['0', '1', '2', '4'],
      ans: 2 },
    { q: '¿Cuánto mide un año luz en kilómetros (aproximadamente)?',
      opts: ['9.4 billones km', '9.4 millones km', '940.000 km', '94 billones km'],
      ans: 0 },
    { q: '¿Cuál es el animal terrestre más rápido?',
      opts: ['León', 'Guepardo', 'Antílope', 'Caballo'],
      ans: 1 },
    { q: '¿Qué animal tiene la gestación más larga?',
      opts: ['Elefante africano', 'Elefante asiático', 'Ballena azul', 'Jirafa'],
      ans: 0 },
    { q: '¿Cuántos corazones tiene un pulpo?',
      opts: ['1', '2', '3', '4'],
      ans: 2 },
    { q: '¿Cuántas alas tiene una abeja?',
      opts: ['2', '4', '6', '8'],
      ans: 1 },
    { q: '¿Cuál es el animal más grande que ha existido en la Tierra?',
      opts: ['T-Rex', 'Diplodocus', 'Ballena azul', 'Elefante africano'],
      ans: 2 },
    { q: '¿Cuánto pesa el cerebro humano promedio?',
      opts: ['0.5 kg', '1 kg', '1.4 kg', '2 kg'],
      ans: 2 },
    { q: '¿Cuál es el elemento con número atómico 1?',
      opts: ['Helio', 'Litio', 'Hidrógeno', 'Berilio'],
      ans: 2 },
    { q: '¿A cuántos grados Celsius equivale 0 Kelvin (cero absoluto)?',
      opts: ['-100°C', '-173°C', '-273°C', '-373°C'],
      ans: 2 },
    { q: '¿Cuántos dientes tiene un adulto con todas las muelas del juicio?',
      opts: ['28', '30', '32', '34'],
      ans: 2 },
    { q: '¿Cuál es el planeta más cercano al Sol?',
      opts: ['Venus', 'Tierra', 'Marte', 'Mercurio'],
      ans: 3 },
    { q: '¿De qué está hecho el diamante?',
      opts: ['Silicio', 'Carbono', 'Cuarzo', 'Grafito puro'],
      ans: 1 },
    { q: '¿Cuánto tiempo tarda la Luna en orbitar la Tierra?',
      opts: ['7 días', '14 días', '27 días', '365 días'],
      ans: 2 },
    { q: '¿Cuál es la estrella más cercana al sistema solar?',
      opts: ['Sirio', 'Betelgeuse', 'Próxima Centauri', 'Vega'],
      ans: 2 },
    { q: '¿Cuántos lados tiene un hexágono?',
      opts: ['5', '6', '7', '8'],
      ans: 1 },
    { q: '¿Cuántos litros de sangre tiene el cuerpo humano adulto promedio?',
      opts: ['3 litros', '5 litros', '8 litros', '12 litros'],
      ans: 1 },
    // ── Historia mundial ─────────────────────────────────
    { q: '¿En qué año cayó el Muro de Berlín?',
      opts: ['1987', '1988', '1989', '1991'],
      ans: 2 },
    { q: '¿En qué año terminó la Segunda Guerra Mundial?',
      opts: ['1943', '1944', '1945', '1946'],
      ans: 2 },
    { q: '¿Cuántos años duró la Guerra de los 100 Años entre Francia e Inglaterra?',
      opts: ['100 años exactos', '87 años', '116 años', '150 años'],
      ans: 2 },
    { q: '¿En qué año llegó Cristóbal Colón a América?',
      opts: ['1488', '1490', '1492', '1498'],
      ans: 2 },
    { q: '¿Qué civilización construyó las pirámides de Giza?',
      opts: ['Sumerios', 'Mayas', 'Aztecas', 'Egipcios'],
      ans: 3 },
    { q: '¿En qué país ocurrió la Revolución Francesa?',
      opts: ['Francia', 'Inglaterra', 'Alemania', 'Italia'],
      ans: 0 },
    { q: '¿En qué año comenzó la Primera Guerra Mundial?',
      opts: ['1912', '1914', '1916', '1918'],
      ans: 1 },
    { q: '¿Quién fue el primer ser humano en viajar al espacio?',
      opts: ['Neil Armstrong', 'Buzz Aldrin', 'Yuri Gagarin', 'Alan Shepard'],
      ans: 2 },
    { q: '¿En qué año el hombre pisó la Luna por primera vez?',
      opts: ['1967', '1968', '1969', '1970'],
      ans: 2 },
    { q: '¿Dónde fue firmada la Declaración de Independencia de EE.UU.?',
      opts: ['Nueva York', 'Washington D.C.', 'Boston', 'Filadelfia'],
      ans: 3 },
    { q: '¿Cuánto tiempo duró el Imperio Romano de Occidente (aprox.)?',
      opts: ['500 años', '800 años', '1.000 años', '1.500 años'],
      ans: 2 },
    { q: '¿Quién escribió "El Capital"?',
      opts: ['Friedrich Engels', 'Lenin', 'Karl Marx', 'Adam Smith'],
      ans: 2 },
    { q: '¿En qué año se detonó la primera bomba atómica en la historia?',
      opts: ['1943', '1944', '1945', '1946'],
      ans: 2 },
    { q: '¿Qué país lanzó el primer satélite artificial al espacio (Sputnik)?',
      opts: ['Estados Unidos', 'Alemania', 'Reino Unido', 'Unión Soviética'],
      ans: 3 },
    { q: '¿Cuántos años estuvo Nelson Mandela preso en Sudáfrica?',
      opts: ['14 años', '21 años', '27 años', '35 años'],
      ans: 2 },
    { q: '¿Quién fue el último faraón de Egipto?',
      opts: ['Nefertiti', 'Tutankamón', 'Cleopatra VII', 'Ramsés II'],
      ans: 2 },
    { q: '¿En qué año se fundó la ONU?',
      opts: ['1942', '1945', '1948', '1950'],
      ans: 1 },
    { q: '¿Qué guerra terminó con el Tratado de Versalles?',
      opts: ['Segunda Guerra Mundial', 'Primera Guerra Mundial', 'Guerra de Crimea', 'Guerra Fría'],
      ans: 1 },
    { q: '¿En qué año se hundió el Titanic?',
      opts: ['1910', '1911', '1912', '1915'],
      ans: 2 },
    { q: '¿Cuál fue el primer país en dar el voto a la mujer?',
      opts: ['Francia', 'Reino Unido', 'Nueva Zelanda', 'Estados Unidos'],
      ans: 2 },
    { q: '¿Cuántos años gobernó Hitler en Alemania?',
      opts: ['8 años', '12 años', '16 años', '20 años'],
      ans: 1 },
    { q: '¿Dónde nació Napoleón Bonaparte?',
      opts: ['Francia continental', 'Córcega', 'Italia', 'Bélgica'],
      ans: 1 },
    { q: '¿En qué año se inventó la imprenta (Gutenberg)?',
      opts: ['1300', '1440', '1500', '1550'],
      ans: 1 },
    { q: '¿Cuántos viajes realizó Colón a América?',
      opts: ['1', '2', '3', '4'],
      ans: 3 },
    // ── Cultura pop, música y cine ───────────────────────
    { q: '¿Cuántos Oscars ganó "El Señor de los Anillos: El Retorno del Rey"?',
      opts: ['8', '9', '11', '13'],
      ans: 2 },
    { q: '¿En qué año se lanzó el primer iPhone de Apple?',
      opts: ['2005', '2006', '2007', '2008'],
      ans: 2 },
    { q: '¿Quién interpretó a Jack en "Titanic" (1997)?',
      opts: ['Brad Pitt', 'Tom Hanks', 'Leonardo DiCaprio', 'Johnny Depp'],
      ans: 2 },
    { q: '¿Cuántos álbumes de estudio lanzó Michael Jackson en solitario?',
      opts: ['5', '7', '10', '12'],
      ans: 2 },
    { q: '¿Cómo se llama el villano principal de Star Wars?',
      opts: ['Darth Maul', 'Palpatine', 'Darth Vader', 'Kylo Ren'],
      ans: 2 },
    { q: '¿De qué país es originaria la serie "Money Heist" (La Casa de Papel)?',
      opts: ['México', 'Argentina', 'España', 'Italia'],
      ans: 2 },
    { q: '¿En qué año se estrenó "Friends"?',
      opts: ['1992', '1993', '1994', '1996'],
      ans: 2 },
    { q: '¿Quién pintó la Mona Lisa?',
      opts: ['Miguel Ángel', 'Rafael', 'Botticelli', 'Leonardo da Vinci'],
      ans: 3 },
    { q: '¿En qué ciudad está ambientada "Breaking Bad"?',
      opts: ['Denver', 'Phoenix', 'Albuquerque', 'Las Vegas'],
      ans: 2 },
    { q: '¿Cuántos libros tiene la saga original de Harry Potter?',
      opts: ['5', '6', '7', '8'],
      ans: 2 },
    { q: '¿Quién es el artista con más Grammys ganados en la historia?',
      opts: ['Beyoncé', 'Jay-Z', 'Georg Solti', 'Stevie Wonder'],
      ans: 2 },
    { q: '¿En qué año se fundó Netflix?',
      opts: ['1995', '1997', '1999', '2001'],
      ans: 1 },
    { q: '¿Quién escribió "Cien años de soledad"?',
      opts: ['Pablo Neruda', 'Jorge Luis Borges', 'Gabriel García Márquez', 'Mario Vargas Llosa'],
      ans: 2 },
    { q: '¿En qué año se estrenó la primera película de Marvel del UCM (Iron Man)?',
      opts: ['2006', '2007', '2008', '2009'],
      ans: 2 },
    { q: '¿Cómo se llama la canción más escuchada de todos los tiempos en Spotify?',
      opts: ['Shape of You', 'Blinding Lights', 'Dance Monkey', 'Despacito'],
      ans: 1 },
    { q: '¿Cuántas películas tiene la saga original de Star Wars (Episodios I-IX)?',
      opts: ['6', '7', '8', '9'],
      ans: 3 },
    { q: '¿Quién es el autor de "Don Quijote de la Mancha"?',
      opts: ['Lope de Vega', 'Francisco de Quevedo', 'Miguel de Cervantes', 'Garcilaso de la Vega'],
      ans: 2 },
    { q: '¿En qué ciudad se ambienta la serie "Stranger Things"?',
      opts: ['Springfield', 'Hawkins', 'Derry', 'Castle Rock'],
      ans: 1 },
    { q: '¿Cuántos integrantes tenía la boy band BTS de K-pop?',
      opts: ['5', '6', '7', '8'],
      ans: 2 },
    { q: '¿En qué año se estrenó "El Rey León" de Disney original?',
      opts: ['1991', '1992', '1994', '1996'],
      ans: 2 },
    { q: '¿Qué artista vendió más álbumes en la historia de la música?',
      opts: ['Elvis Presley', 'Michael Jackson', 'The Beatles', 'Led Zeppelin'],
      ans: 2 },
    { q: '¿En qué país se desarrolla la historia de "Squid Game"?',
      opts: ['Japón', 'China', 'Corea del Sur', 'Tailandia'],
      ans: 2 },
    { q: '¿Quién interpreta a Iron Man en el UCM?',
      opts: ['Chris Evans', 'Chris Hemsworth', 'Robert Downey Jr.', 'Mark Ruffalo'],
      ans: 2 },
    { q: '¿Cómo se llama el famoso cuadro de Edvard Munch con una figura gritando?',
      opts: ['El grito', 'La angustia', 'El horror', 'El llanto'],
      ans: 0 },
    { q: '¿En qué año se estrenó el primer episodio de "Los Simpsons"?',
      opts: ['1987', '1989', '1991', '1993'],
      ans: 1 },
    // ── Deportes ─────────────────────────────────────────
    { q: '¿Cuántos Balones de Oro tiene Lionel Messi?',
      opts: ['6', '7', '8', '9'],
      ans: 2 },
    { q: '¿Cuántas veces ha ganado Brasil el Mundial de Fútbol?',
      opts: ['3', '4', '5', '6'],
      ans: 2 },
    { q: '¿En qué año ganó Chile su primera Copa América?',
      opts: ['2011', '2013', '2015', '2016'],
      ans: 2 },
    { q: '¿Cuántos sets necesitas ganar para llevarte un partido de tenis Grand Slam masculino?',
      opts: ['2 de 3', '3 de 5', '4 de 7', '2 de 5'],
      ans: 1 },
    { q: '¿Cuántos jugadores tiene un equipo de baloncesto en cancha?',
      opts: ['4', '5', '6', '7'],
      ans: 1 },
    { q: '¿Cada cuántos años se celebra el Mundial de Fútbol?',
      opts: ['2', '3', '4', '5'],
      ans: 2 },
    { q: '¿Cuántos Grand Slams ganó Roger Federer en su carrera?',
      opts: ['17', '18', '20', '22'],
      ans: 2 },
    { q: '¿Cuántos metros tiene una piscina olímpica?',
      opts: ['25 m', '50 m', '75 m', '100 m'],
      ans: 1 },
    { q: '¿Qué país ha ganado más medallas de oro olímpicas en la historia?',
      opts: ['China', 'Rusia', 'Estados Unidos', 'Alemania'],
      ans: 2 },
    { q: '¿Cuántas carreras olímpicas ganó Usain Bolt a lo largo de su carrera?',
      opts: ['5', '7', '8', '10'],
      ans: 2 },
    { q: '¿Cuántos jugadores tiene un equipo de fútbol americano en el campo?',
      opts: ['9', '11', '12', '15'],
      ans: 1 },
    { q: '¿En qué país se inventó el tenis?',
      opts: ['Francia', 'Estados Unidos', 'Australia', 'Reino Unido'],
      ans: 3 },
    { q: '¿Cuántas victorias necesita un equipo en la final de la NBA para ganar el campeonato?',
      opts: ['3', '4', '5', '7'],
      ans: 1 },
    { q: '¿En qué año se celebraron los primeros Juegos Olímpicos modernos?',
      opts: ['1892', '1896', '1900', '1904'],
      ans: 1 },
    { q: '¿Cuántos hoyos tiene un campo de golf estándar?',
      opts: ['9', '12', '18', '21'],
      ans: 2 },
    { q: '¿En qué deporte se usa el término "hat-trick" para 3 goles?',
      opts: ['Solo en fútbol', 'Fútbol y hockey', 'Cricket, fútbol y hockey', 'Solo en cricket'],
      ans: 2 },
    { q: '¿Cuántos metros tiene la pista de atletismo estándar?',
      opts: ['300 m', '400 m', '500 m', '600 m'],
      ans: 1 },
    { q: '¿En qué país es más popular el críquet como deporte?',
      opts: ['Australia', 'India', 'Reino Unido', 'Pakistán'],
      ans: 1 },
    { q: '¿Quién tiene el récord de más goles en una sola edición de un Mundial?',
      opts: ['Ronaldo (Brasil)', 'Miroslav Klose', 'Just Fontaine', 'Gerd Müller'],
      ans: 2 },
    // ── Comida y bebidas ─────────────────────────────────
    { q: '¿De qué país es originaria la pizza?',
      opts: ['Roma antigua', 'Italia (Nápoles)', 'Grecia', 'España'],
      ans: 1 },
    { q: '¿Cuál es el país que más café consume per cápita en el mundo?',
      opts: ['Brasil', 'Colombia', 'Finlandia', 'Italia'],
      ans: 2 },
    { q: '¿De qué planta se extrae el chocolate?',
      opts: ['Árbol del cacao', 'Planta del café', 'Árbol del carob', 'Árbol del hule'],
      ans: 0 },
    { q: '¿Qué país inventó el sushi?',
      opts: ['China', 'Corea', 'Japón', 'Vietnam'],
      ans: 2 },
    { q: '¿Cuántas calorias tiene aproximadamente una manzana mediana?',
      opts: ['25 kcal', '52 kcal', '95 kcal', '150 kcal'],
      ans: 2 },
    { q: '¿De qué país es originario el kimchi?',
      opts: ['Japón', 'China', 'Corea', 'Vietnam'],
      ans: 2 },
    { q: '¿Cuál es la especia más cara del mundo?',
      opts: ['Vainilla', 'Trufa negra', 'Azafrán', 'Cardamomo'],
      ans: 2 },
    { q: '¿De dónde es originaria la paella?',
      opts: ['Cataluña', 'Valencia', 'Madrid', 'Sevilla'],
      ans: 1 },
    { q: '¿Cuál es el país mayor productor de vino del mundo?',
      opts: ['Francia', 'Italia', 'España', 'Argentina'],
      ans: 1 },
    { q: '¿De qué país es el plato "pho"?',
      opts: ['Tailandia', 'Camboya', 'Vietnam', 'Laos'],
      ans: 2 },
    { q: '¿Qué fruta tiene más vitamina C que una naranja?',
      opts: ['Limón', 'Mandarina', 'Kiwi', 'Pomelo'],
      ans: 2 },
    { q: '¿De qué país es originaria la hamburguesa?',
      opts: ['Estados Unidos', 'Alemania', 'Reino Unido', 'Austria'],
      ans: 1 },
    { q: '¿El tomate es técnicamente una fruta o una verdura?',
      opts: ['Verdura', 'Fruta (botánicamente)', 'Depende del país', 'No es ni una ni otra'],
      ans: 1 },
    { q: '¿Cuántos granos de café necesitas para hacer una taza?',
      opts: ['10-20', '30-50', '60-70', '100-120'],
      ans: 2 },
    { q: '¿De qué país es el plato "ceviche" originalmente?',
      opts: ['Chile', 'Ecuador', 'Perú', 'Colombia'],
      ans: 2 },
    // ── Tecnología e inventos ────────────────────────────
    { q: '¿En qué año se inventó internet (ARPANET)?',
      opts: ['1959', '1969', '1979', '1989'],
      ans: 1 },
    { q: '¿Quién fundó Microsoft?',
      opts: ['Steve Jobs', 'Bill Gates y Paul Allen', 'Mark Zuckerberg', 'Larry Page'],
      ans: 1 },
    { q: '¿En qué año se lanzó Google?',
      opts: ['1996', '1998', '2000', '2002'],
      ans: 1 },
    { q: '¿Quién inventó el teléfono?',
      opts: ['Thomas Edison', 'Nikola Tesla', 'Alexander Graham Bell', 'Guglielmo Marconi'],
      ans: 2 },
    { q: '¿En qué año se creó Facebook?',
      opts: ['2002', '2004', '2006', '2008'],
      ans: 1 },
    { q: '¿Quién inventó la bombilla eléctrica?',
      opts: ['Nikola Tesla', 'Thomas Edison', 'Benjamin Franklin', 'James Watt'],
      ans: 1 },
    { q: '¿Cuántos bits tiene un byte?',
      opts: ['4', '8', '16', '32'],
      ans: 1 },
    { q: '¿En qué año se lanzó YouTube?',
      opts: ['2003', '2004', '2005', '2006'],
      ans: 2 },
    { q: '¿Quién desarrolló la teoría de la relatividad?',
      opts: ['Isaac Newton', 'Max Planck', 'Albert Einstein', 'Niels Bohr'],
      ans: 2 },
    { q: '¿Qué significa "www" en una dirección web?',
      opts: ['World Wide Web', 'World Web Windows', 'Wide World Web', 'Web World Wide'],
      ans: 0 },
    { q: '¿En qué año se lanzó Twitter (ahora X)?',
      opts: ['2004', '2005', '2006', '2007'],
      ans: 2 },
    { q: '¿Quién fue el primer CEO de Apple junto a Steve Jobs?',
      opts: ['Steve Wozniak', 'Tim Cook', 'John Sculley', 'Michael Spindler'],
      ans: 0 },
    { q: '¿En qué año se inventó la World Wide Web (Tim Berners-Lee)?',
      opts: ['1985', '1989', '1991', '1995'],
      ans: 1 },
    { q: '¿Cuántos transistores tiene aproximadamente un chip moderno?',
      opts: ['Millones', 'Cientos de millones', 'Miles de millones', 'Billones'],
      ans: 3 },
    { q: '¿Qué empresa creó el sistema operativo Android?',
      opts: ['Apple', 'Samsung', 'Google', 'Microsoft'],
      ans: 2 },
    // ── Animales y curiosidades ──────────────────────────
    { q: '¿Cuánto tiempo puede vivir una tortuga gigante de Galápagos?',
      opts: ['50 años', '100 años', '150 años', '200 años'],
      ans: 2 },
    { q: '¿Cuántos ojos tiene una araña promedio?',
      opts: ['4', '6', '8', '10'],
      ans: 2 },
    { q: '¿Cuántos huesos tiene la jirafa en el cuello?',
      opts: ['Los mismos que el humano: 7', '14', '21', '28'],
      ans: 0 },
    { q: '¿Cuál es el único mamífero que puede volar?',
      opts: ['Ardilla voladora', 'Zarigüeya', 'Murciélago', 'Ninguno puede volar de verdad'],
      ans: 2 },
    { q: '¿Cuánto pesa el cerebro de un elefante?',
      opts: ['2 kg', '4 kg', '5 kg', '7 kg'],
      ans: 2 },
    { q: '¿Cuántas patas tiene un cangrejo?',
      opts: ['6', '8', '10', '12'],
      ans: 2 },
    { q: '¿Qué animal tiene la lengua más larga en relación a su cuerpo?',
      opts: ['Camaleón', 'Oso hormiguero', 'Sapo de labios azules', 'Colibrí'],
      ans: 0 },
    { q: '¿Cuánto tiempo duerme un koala al día?',
      opts: ['8 horas', '12 horas', '18-22 horas', '24 horas'],
      ans: 2 },
    { q: '¿Los delfines duermen con los dos ojos cerrados?',
      opts: ['Sí, como los humanos', 'No, duermen con un ojo abierto', 'No duermen nunca', 'Solo duermen de noche'],
      ans: 1 },
    { q: '¿Cuánto tiempo puede vivir un medusa inmortal (Turritopsis dohrnii)?',
      opts: ['100 años', '500 años', 'Indefinidamente (teóricamente)', '50 años'],
      ans: 2 },
    { q: '¿Cuántos estómagos tiene una vaca?',
      opts: ['1', '2', '3', '4'],
      ans: 3 },
    { q: '¿Los tiburones tienen huesos?',
      opts: ['Sí, como todos los peces', 'No, tienen cartílago', 'Solo en las aletas', 'Depende de la especie'],
      ans: 1 },
    { q: '¿Cuántas especies de pingüinos existen?',
      opts: ['7', '12', '18', '25'],
      ans: 2 },
    { q: '¿Qué animal puede regenerar completamente su corazón?',
      opts: ['Salamandra', 'Pez cebra', 'Tritón', 'Axolotl'],
      ans: 1 },
    { q: '¿Cuánto puede saltar una pulga en relación a su tamaño?',
      opts: ['5 veces su cuerpo', '30 veces su cuerpo', '100 veces su cuerpo', '200 veces su cuerpo'],
      ans: 2 },
    // ── Datos curiosos ───────────────────────────────────
    { q: '¿Cuántas veces por día parpadea el ojo humano promedio?',
      opts: ['3.000', '7.000', '15.000', '30.000'],
      ans: 2 },
    { q: '¿Cuánto tiempo tardarías en contar hasta un millón (1 número por segundo)?',
      opts: ['3 días', '6 días', '12 días', '28 días'],
      ans: 2 },
    { q: '¿Cuántas páginas tiene la Biblia aproximadamente (edición estándar)?',
      opts: ['600', '900', '1.200', '1.500'],
      ans: 2 },
    { q: '¿Qué país tiene el mayor número de lagos del mundo?',
      opts: ['Rusia', 'Estados Unidos', 'Canadá', 'Finlandia'],
      ans: 2 },
    { q: '¿Cuántos idiomas hay en el mundo aproximadamente?',
      opts: ['2.000', '4.000', '7.000', '12.000'],
      ans: 2 },
    { q: '¿Cuántos músculos usa el ser humano para dar un paso?',
      opts: ['5', '50', '200', '600'],
      ans: 2 },
    { q: '¿Cuántos km² tiene la Antártida aproximadamente?',
      opts: ['5 millones', '10 millones', '14 millones', '20 millones'],
      ans: 2 },
    { q: '¿Cuántas personas nacen por segundo en el mundo aproximadamente?',
      opts: ['1', '3', '5', '10'],
      ans: 2 },
    { q: '¿Cuánto oro se ha extraído en toda la historia humana (aprox.)?',
      opts: ['50.000 toneladas', '100.000 toneladas', '200.000 toneladas', '1 millón de toneladas'],
      ans: 2 },
    { q: '¿Cuántos idiomas oficiales tiene Sudáfrica?',
      opts: ['3', '7', '11', '15'],
      ans: 2 },
    { q: '¿Qué país tiene el mayor número de hablantes de español nativo?',
      opts: ['España', 'Argentina', 'Colombia', 'México'],
      ans: 3 },
    { q: '¿Cuántas piezas tiene el cubo de Rubik estándar (3x3)?',
      opts: ['9', '20', '26', '54'],
      ans: 2 },
    { q: '¿Cuántos huesos tiene el pie humano?',
      opts: ['14', '21', '26', '33'],
      ans: 2 },
    { q: '¿Cuántos km tiene la Muralla China aproximadamente?',
      opts: ['5.000 km', '10.000 km', '21.000 km', '50.000 km'],
      ans: 2 },
    { q: '¿Cuántos colores puede distinguir el ojo humano promedio?',
      opts: ['1 millón', '5 millones', '10 millones', '100 millones'],
      ans: 2 },
    // ── Matemáticas y lógica ─────────────────────────────
    { q: '¿Cuánto es π (pi) redondeado a 4 decimales?',
      opts: ['3.1315', '3.1415', '3.1416', '3.1517'],
      ans: 2 },
    { q: '¿Cuánto es 2 elevado a la potencia 10?',
      opts: ['512', '1.024', '2.048', '4.096'],
      ans: 1 },
    { q: '¿Cuántos ceros tiene un millón?',
      opts: ['5', '6', '7', '9'],
      ans: 1 },
    { q: '¿Cuánto es la raíz cuadrada de 144?',
      opts: ['10', '11', '12', '13'],
      ans: 2 },
    { q: '¿El cero es par o impar?',
      opts: ['Impar', 'Par', 'Ni par ni impar', 'Depende del sistema'],
      ans: 1 },
    { q: '¿Cuántos lados tiene un dodecágono?',
      opts: ['10', '11', '12', '13'],
      ans: 2 },
    { q: '¿Cuánto es 1 + 2 + 3 + ... + 100?',
      opts: ['4.500', '5.000', '5.050', '5.500'],
      ans: 2 },
    { q: '¿Cuántos números primos hay entre 1 y 10?',
      opts: ['3', '4', '5', '6'],
      ans: 1 },
    { q: '¿Cuántos grados tiene un triángulo equilátero en cada ángulo?',
      opts: ['45°', '60°', '72°', '90°'],
      ans: 1 },
    { q: '¿Cuántos dígitos tiene el número más largo que puedes decir en español de una sola palabra? ("un billón")',
      opts: ['9', '12', '13', '15'],
      ans: 1 },
    // ── Idiomas y palabras ───────────────────────────────
    { q: '¿Cuántos idiomas oficiales tiene la ONU?',
      opts: ['3', '5', '6', '8'],
      ans: 2 },
    { q: '¿Cuál es el idioma más hablado del mundo (por hablantes nativos)?',
      opts: ['Inglés', 'Español', 'Mandarín', 'Hindi'],
      ans: 2 },
    { q: '¿De qué idioma viene la palabra "chocolate"?',
      opts: ['Español', 'Azteca (náhuatl)', 'Portugués', 'Francés'],
      ans: 1 },
    { q: '¿Cuántas letras tiene el alfabeto español?',
      opts: ['26', '27', '28', '29'],
      ans: 0 },
    { q: '¿Cuál es la palabra más larga del diccionario de la RAE?',
      opts: ['Electroencefalografista', 'Esternocleidomastoideo', 'Superextraordinarísimo', 'Anticonstitucionalmente'],
      ans: 3 },
    { q: '¿De qué idioma vienen palabras como "tsunami", "karaoke" y "sushi"?',
      opts: ['Chino', 'Japonés', 'Coreano', 'Tailandés'],
      ans: 1 },
    { q: '¿Cuántas vocales tiene el idioma español?',
      opts: ['4', '5', '6', '7'],
      ans: 1 },
    { q: '¿Cuál es el único idioma oficial que es también un Estado soberano (país)?',
      opts: ['Klingon', 'Esperanto', 'No existe ese caso', 'Luxemburgués'],
      ans: 2 },
    { q: '¿De qué idioma vienen las palabras "algebra", "alcohol" y "algodón"?',
      opts: ['Griego', 'Latín', 'Árabe', 'Persa'],
      ans: 2 },
    { q: '¿Cuál es el idioma con más palabras en su diccionario oficial?',
      opts: ['Español', 'Francés', 'Inglés', 'Alemán'],
      ans: 2 },
    // ── Personajes famosos ───────────────────────────────
    { q: '¿En qué país nació Albert Einstein?',
      opts: ['Austria', 'Suiza', 'Alemania', 'Polonia'],
      ans: 2 },
    { q: '¿A qué edad murió Mozart?',
      opts: ['29', '35', '42', '51'],
      ans: 1 },
    { q: '¿Quién fue la primera mujer en ganar un Premio Nobel?',
      opts: ['Gabriela Mistral', 'Marie Curie', 'Dorothy Hodgkin', 'Selma Lagerlöf'],
      ans: 1 },
    { q: '¿De qué país era Nikola Tesla?',
      opts: ['Rusia', 'Austria-Hungría (hoy Serbia/Croacia)', 'Alemania', 'Checoslovaquia'],
      ans: 1 },
    { q: '¿En qué ciudad nació Steve Jobs?',
      opts: ['Nueva York', 'Los Ángeles', 'San Francisco', 'Seattle'],
      ans: 2 },
    { q: '¿Cuántos años tenía Alexander el Grande cuando murió?',
      opts: ['28', '32', '36', '40'],
      ans: 1 },
    { q: '¿Quién fue el primer presidente de Estados Unidos?',
      opts: ['Abraham Lincoln', 'John Adams', 'Thomas Jefferson', 'George Washington'],
      ans: 3 },
    { q: '¿Cuántos años estuvo Mandela como presidente de Sudáfrica?',
      opts: ['5 años', '10 años', '15 años', '20 años'],
      ans: 0 },
    { q: '¿En qué año nació Cleopatra?',
      opts: ['69 a.C.', '51 a.C.', '30 a.C.', '100 a.C.'],
      ans: 0 },
    { q: '¿Quién escribió "Romeo y Julieta"?',
      opts: ['Charles Dickens', 'Lord Byron', 'William Shakespeare', 'John Keats'],
      ans: 2 },
    { q: '¿En qué país nació Freddie Mercury, cantante de Queen?',
      opts: ['Reino Unido', 'India', 'Zanzíbar (Tanzania)', 'Irán'],
      ans: 2 },
    { q: '¿Cuántos años tenía Leonardo da Vinci cuando empezó a pintar la Mona Lisa?',
      opts: ['40', '46', '51', '60'],
      ans: 2 },
    { q: '¿Cuántos idiomas hablaba Cleopatra?',
      opts: ['1 (egipcio)', '2', '5', '9'],
      ans: 3 },
    { q: '¿Quién fue la primera persona en circunnavegar el globo?',
      opts: ['Colón', 'Vasco da Gama', 'Juan Sebastián Elcano', 'Magallanes'],
      ans: 2 },
    { q: '¿Cuántas sinfonías compuso Beethoven?',
      opts: ['6', '7', '9', '12'],
      ans: 2 },
    // ── Cultura coreana (extra) ──────────────────────────
    { q: '¿Cómo se llama el plato coreano de arroz con verduras y carne?',
      opts: ['Bibimbap', 'Japchae', 'Tteokbokki', 'Doenjang jjigae'],
      ans: 0 },
    { q: '¿Qué significa "oppa" en coreano?',
      opts: ['Hombre mayor (para mujer)', 'Amigo íntimo', 'Hermano menor', 'Novio oficial'],
      ans: 0 },
    { q: '¿Cuántos caracteres tiene el alfabeto coreano Hangul?',
      opts: ['14 consonantes y 10 vocales', '20 consonantes y 10 vocales', '19 consonantes y 21 vocales', '26 letras como el inglés'],
      ans: 2 },
    { q: '¿En qué año se estrenó la película "Parásitos" (Parasite) de Bong Joon-ho?',
      opts: ['2017', '2018', '2019', '2020'],
      ans: 2 },
    { q: '¿Cuántos Oscars ganó "Parasite" (2020)?',
      opts: ['2', '3', '4', '6'],
      ans: 2 },
    // ── Extra miscelánea ─────────────────────────────────
    { q: '¿Cuánto pesa la Torre Eiffel aproximadamente?',
      opts: ['3.300 toneladas', '7.300 toneladas', '15.000 toneladas', '30.000 toneladas'],
      ans: 1 },
    { q: '¿En qué año se construyó la Torre Eiffel?',
      opts: ['1879', '1883', '1887-1889', '1900'],
      ans: 2 },
    { q: '¿Cuántos escalones tiene la Torre Eiffel hasta la cima?',
      opts: ['1.022', '1.665', '2.200', '2.800'],
      ans: 1 },
    { q: '¿Cuánto mide el Coliseo de Roma en su eje más largo?',
      opts: ['100 m', '188 m', '250 m', '300 m'],
      ans: 1 },
    { q: '¿En qué país está la Estatua de la Libertad?',
      opts: ['Francia (es un regalo)', 'Estados Unidos', 'Compartida Francia-EE.UU.', 'Es de la ONU'],
      ans: 1 },
    { q: '¿Cuántos metros de altura mide la Estatua de la Libertad (pedestal incluido)?',
      opts: ['46 m', '93 m', '93 m', '120 m'],
      ans: 1 },
    { q: '¿Cuántos años tiene la Gran Pirámide de Guiza (aproximadamente)?',
      opts: ['2.500 años', '3.500 años', '4.500 años', '6.000 años'],
      ans: 2 },
    { q: '¿Cuántas maravillas del mundo antiguo siguen en pie hoy?',
      opts: ['0', '1', '2', '3'],
      ans: 1 },
    { q: '¿Cuánto cuesta (aprox.) enviar un cohete al espacio por SpaceX hoy?',
      opts: ['$10 millones', '$50 millones', '$70 millones', '$200 millones'],
      ans: 2 },
    { q: '¿Cuántos países han llegado a la Luna?',
      opts: ['1 (solo EE.UU.)', '2', '3', '5'],
      ans: 0 },
    { q: '¿Cuántos astronautas han pisado la Luna en total?',
      opts: ['6', '9', '12', '14'],
      ans: 2 },
    { q: '¿En qué año se lanzó el primer cohete al espacio por un humano?',
      opts: ['1957', '1961', '1963', '1965'],
      ans: 1 },
    { q: '¿Cuánto dura un viaje a Marte aproximadamente con la tecnología actual?',
      opts: ['1 mes', '3 meses', '7-9 meses', '2 años'],
      ans: 2 },
    { q: '¿Cuántos países forman la Unión Europea actualmente?',
      opts: ['21', '25', '27', '30'],
      ans: 2 },
    { q: '¿Cuántos países comparten el euro como moneda?',
      opts: ['17', '19', '20', '22'],
      ans: 2 },
    { q: '¿Cuántas horas de diferencia hay entre Nueva York y Londres (horario estándar)?',
      opts: ['3 horas', '5 horas', '7 horas', '8 horas'],
      ans: 1 },
    { q: '¿Cuántas zonas horarias tiene Rusia?',
      opts: ['7', '9', '11', '14'],
      ans: 2 },
    { q: '¿Cuántos países se encuentran en el ecuador terrestre?',
      opts: ['9', '13', '16', '20'],
      ans: 1 },
    { q: '¿Cuánto tarda en promedio un relámpago en alcanzar el suelo?',
      opts: ['1 segundo', '200 milisegundos', '0.2 microsegundos', '2 nanosegundos'],
      ans: 1 },
    { q: '¿A qué temperatura explota el popcorn (maíz pira) dentro del grano?',
      opts: ['100°C', '135°C', '175°C', '220°C'],
      ans: 2 },
    { q: '¿Cuántos colores tiene el arcoíris?',
      opts: ['5', '6', '7', 'Infinitos (es un espectro continuo)'],
      ans: 3 },
    { q: '¿Cuánto tarda el sonido en viajar 1 km a nivel del mar?',
      opts: ['1 segundo', '3 segundos', '5 segundos', '10 segundos'],
      ans: 1 },
    { q: '¿Cuánto mide el diámetro de la Tierra?',
      opts: ['6.371 km', '10.000 km', '12.742 km', '40.075 km'],
      ans: 2 },
    { q: '¿Cuántas horas tiene una semana?',
      opts: ['120 h', '168 h', '196 h', '240 h'],
      ans: 1 },
    { q: '¿Cuántos segundos tiene un día?',
      opts: ['43.200', '72.000', '86.400', '100.000'],
      ans: 2 },
    { q: '¿Cuántos milímetros tiene 1 metro?',
      opts: ['10', '100', '1.000', '10.000'],
      ans: 2 },
    { q: '¿Cuánto pesa un litro de agua a 4°C?',
      opts: ['0,5 kg', '0,9 kg', '1 kg exacto', '1,1 kg'],
      ans: 2 },
    { q: '¿Cuántos gramos tiene una onza troy (usada para metales preciosos)?',
      opts: ['28 g', '31.1 g', '35 g', '40 g'],
      ans: 1 },
    { q: '¿A cuántos metros de profundidad está el punto más profundo del océano (Fosa de las Marianas)?',
      opts: ['7.000 m', '9.000 m', '11.000 m', '14.000 m'],
      ans: 2 },
    { q: '¿Cuántos países tienen más de 1.000 millones de habitantes?',
      opts: ['1', '2', '3', '4'],
      ans: 1 },
    { q: '¿Cuál es el país con más de 1.000 millones de habitantes además de China?',
      opts: ['EE.UU.', 'Indonesia', 'India', 'Brasil'],
      ans: 2 },
    { q: '¿Cuánto dura el mandato presidencial en Estados Unidos?',
      opts: ['3 años', '4 años', '5 años', '6 años'],
      ans: 1 },
    { q: '¿Cuántos planetas tiene el sistema solar que no tienen lunas?',
      opts: ['1 (Mercurio)', '2 (Mercurio y Venus)', '3', '4'],
      ans: 1 },
    { q: '¿Cuál es la luna más grande del sistema solar?',
      opts: ['La Luna (Tierra)', 'Titán (Saturno)', 'Ío (Júpiter)', 'Ganimedes (Júpiter)'],
      ans: 3 },
    { q: '¿Cuántos anillos tiene Saturno (grupos principales)?',
      opts: ['3', '7', '12', 'Más de 30 divisiones'],
      ans: 3 },
    { q: '¿Cuánto tarda la luz de la Luna en llegar a la Tierra?',
      opts: ['0.5 segundos', '1.3 segundos', '3 segundos', '8 minutos'],
      ans: 1 },
    { q: '¿Cuántas estrellas tiene la bandera de Estados Unidos?',
      opts: ['48', '50', '52', '54'],
      ans: 1 },
    { q: '¿Cuántas franjas tiene la bandera de Estados Unidos?',
      opts: ['7', '10', '13', '15'],
      ans: 2 },
    { q: '¿En qué año se independizó la India de Gran Bretaña?',
      opts: ['1945', '1947', '1949', '1952'],
      ans: 1 },
    { q: '¿Cuántos países componen el Reino Unido?',
      opts: ['2', '3', '4', '5'],
      ans: 2 },
    { q: '¿Cuál es el idioma oficial de Brasil?',
      opts: ['Español', 'Inglés', 'Portugués', 'Brasileño'],
      ans: 2 },
    { q: '¿Cuántos husos horarios tiene China oficialmente?',
      opts: ['1 solo (Beijing)', '3', '5', '7'],
      ans: 0 },
    { q: '¿Cuántos caracteres tiene el alfabeto ruso (cirílico)?',
      opts: ['24', '28', '33', '36'],
      ans: 2 },
    { q: '¿En qué año se disolvió la Unión Soviética?',
      opts: ['1989', '1990', '1991', '1993'],
      ans: 2 },
    { q: '¿Cuántos países conformaban la Unión Soviética?',
      opts: ['9', '12', '15', '20'],
      ans: 2 },
    { q: '¿Cuánto mide la Vía Láctea de extremo a extremo?',
      opts: ['10.000 años luz', '50.000 años luz', '100.000 años luz', '1 millón de años luz'],
      ans: 2 },
    { q: '¿Cuántas galaxias hay en el universo observable (estimación actualizada)?',
      opts: ['200 mil millones', '2 billones', '200 billones', '2 cuatrillones'],
      ans: 1 },
    { q: '¿Cuántos años tiene el universo aproximadamente?',
      opts: ['6.000 años', '4.500 millones de años', '13.800 millones de años', '100.000 millones de años'],
      ans: 2 },
    { q: '¿Cuál es la temperatura de la superficie del Sol?',
      opts: ['3.000°C', '5.500°C', '10.000°C', '1.000.000°C'],
      ans: 1 },
    { q: '¿Cuántas veces cabe la Tierra dentro del Sol?',
      opts: ['100 veces', '500 veces', '1.000.000 veces', '10.000 veces'],
      ans: 2 },
    { q: '¿En qué continente no hay país?',
      opts: ['Ártico', 'Antártida', 'Oceanía', 'Pacífico sur'],
      ans: 1 },
    { q: '¿Cuántos países hay en la Antártida?',
      opts: ['0 (ningún país)', '1', '5', '12 que la reclaman'],
      ans: 0 },
    { q: '¿Cuánto pesa la atmósfera de la Tierra?',
      opts: ['5 × 10¹⁵ toneladas', '5 × 10¹⁸ kg', '5 × 10²¹ kg', '5 × 10²⁴ kg'],
      ans: 1 },
    { q: '¿Cuántos huesos tiene el oído humano (en ambos oídos)?',
      opts: ['2', '4', '6', '8'],
      ans: 2 },
    { q: '¿El vidrio es un sólido o un líquido?',
      opts: ['Sólido cristalino', 'Líquido viscoso (fluye lento)', 'Sólido amorfo', 'Plasma frío'],
      ans: 2 },
    { q: '¿Cuántas veces se dobla una hoja de papel antes de llegar a la Luna (teóricamente)?',
      opts: ['18 veces', '25 veces', '42 veces', '100 veces'],
      ans: 2 },
    { q: '¿Cuántos ceros tiene un googol?',
      opts: ['10', '50', '100', '1.000'],
      ans: 2 },
    { q: '¿Cuántos granos de arena hay en la Tierra aproximadamente?',
      opts: ['Más que estrellas en el universo', 'Menos que estrellas en el universo', 'Igual que estrellas', 'Nadie lo sabe'],
      ans: 1 },
    { q: '¿De qué material está hecho el grafeno, el material más resistente conocido?',
      opts: ['Silicio', 'Titanio', 'Carbono', 'Diamante modificado'],
      ans: 2 },
    { q: '¿Cuántos pares de nervios craneales tiene el cerebro humano?',
      opts: ['6', '10', '12', '18'],
      ans: 2 },
    { q: '¿Cuántas caras tiene un dodecaedro regular?',
      opts: ['8', '10', '12', '20'],
      ans: 2 },
    { q: '¿Cuántas caras tiene un icosaedro regular?',
      opts: ['12', '16', '20', '24'],
      ans: 2 },
    { q: '¿Cuánto pesa el Sol en relación a todo el sistema solar?',
      opts: ['50%', '75%', '99.8%', '100%'],
      ans: 2 },
    { q: '¿Cuántas revoluciones por minuto gira un disco de vinilo LP?',
      opts: ['33 RPM', '45 RPM', '78 RPM', '100 RPM'],
      ans: 0 },
    { q: '¿Cuántos megapíxeles tiene el ojo humano equivalente?',
      opts: ['8 MP', '20 MP', '576 MP', '1.000 MP'],
      ans: 2 },
    { q: '¿En qué año se tomó la primera fotografía de la historia?',
      opts: ['1816', '1826', '1839', '1855'],
      ans: 1 },
    { q: '¿Cuántas palabras tiene el español (según la RAE, diccionario actual)?',
      opts: ['50.000', '93.000', '150.000', '500.000'],
      ans: 1 },
    { q: '¿Cuántas teclas tiene un piano de concierto estándar?',
      opts: ['72', '76', '88', '100'],
      ans: 2 },
    { q: '¿Cuántas cuerdas tiene una guitarra clásica?',
      opts: ['4', '5', '6', '7'],
      ans: 2 },
    { q: '¿En qué año se fundó la empresa Toyota?',
      opts: ['1927', '1933', '1937', '1945'],
      ans: 2 },
    { q: '¿Cuántos colores distintos puede mostrar una pantalla de 8 bits por canal (RGB)?',
      opts: ['256', '65.000', '16 millones', '1 billón'],
      ans: 2 },
    { q: '¿En qué año se lanzó el primer videojuego comercial?',
      opts: ['1958', '1962', '1972', '1978'],
      ans: 2 },
    { q: '¿Cuántos jugadores puede tener un equipo de League of Legends?',
      opts: ['3', '4', '5', '6'],
      ans: 2 },
    { q: '¿Cuánto mide Cristiano Ronaldo?',
      opts: ['1.81 m', '1.85 m', '1.87 m', '1.90 m'],
      ans: 2 },
    { q: '¿En qué ciudad se celebró el primer Mundial de Fútbol en 1930?',
      opts: ['Buenos Aires, Argentina', 'Montevideo, Uruguay', 'Río de Janeiro, Brasil', 'Ciudad de México'],
      ans: 1 },
    { q: '¿Cuánto pesa una pelota de fútbol oficial?',
      opts: ['300-350 g', '410-450 g', '500-550 g', '600 g'],
      ans: 1 },
    { q: '¿Cuántos cm tiene que medir un jugador de la NBA en promedio?',
      opts: ['185 cm', '195 cm', '200 cm', '210 cm'],
      ans: 2 },
    { q: '¿En qué año se disputó el primer Super Bowl?',
      opts: ['1960', '1963', '1967', '1970'],
      ans: 2 },
    { q: '¿Cuántos puntos vale un try en rugby?',
      opts: ['3', '4', '5', '7'],
      ans: 2 },
    { q: '¿Cuántos jugadores tiene un equipo de voleibol en cancha?',
      opts: ['5', '6', '7', '8'],
      ans: 1 },
    { q: '¿Cuántas vueltas da la vuelta ciclista a España "La Vuelta"?',
      opts: ['17', '19', '21', '23'],
      ans: 2 },
    { q: '¿En qué año se fundó el FC Barcelona?',
      opts: ['1895', '1899', '1903', '1910'],
      ans: 1 },
    { q: '¿Cuántos goles marcó Ronaldo (brasileño) en mundiales?',
      opts: ['12', '15', '17', '20'],
      ans: 2 },
    { q: '¿Cuál es el estadio con mayor capacidad del mundo?',
      opts: ['Camp Nou', 'Wembley', 'Maracaná', 'Rungrado (Corea del Norte)'],
      ans: 3 },
    { q: '¿Cuántos km² mide Japón?',
      opts: ['177.000 km²', '277.000 km²', '377.000 km²', '477.000 km²'],
      ans: 2 },
    { q: '¿Cuántos habitantes tiene India hoy?',
      opts: ['900 millones', '1.200 millones', '1.400 millones', '1.700 millones'],
      ans: 2 },
    { q: '¿Cuántas pirámides hay en Egipto?',
      opts: ['3', '13', '118', '300'],
      ans: 2 },
    { q: '¿Cuántos años vivió Tutankamón?',
      opts: ['10', '19', '35', '60'],
      ans: 1 },
    { q: '¿En qué año se construyó la Gran Muralla China (inicio de construcción principal)?',
      opts: ['700 a.C.', '221 a.C.', '100 a.C.', '600 d.C.'],
      ans: 1 },
    { q: '¿Cuántos tercios de la superficie terrestre cubre el océano?',
      opts: ['50%', '60%', '71%', '85%'],
      ans: 2 },
    { q: '¿Cuántos satélites artificiales hay orbitando la Tierra actualmente (aprox.)?',
      opts: ['500', '2.000', '8.000', '25.000'],
      ans: 2 },
    { q: '¿Cuántos km/h alcanza una bala promedio de pistola?',
      opts: ['500 km/h', '1.000 km/h', '1.500 km/h', '3.000 km/h'],
      ans: 1 },
    { q: '¿Cuántas especies de insectos existen aproximadamente?',
      opts: ['50.000', '500.000', '1 millón', '10 millones'],
      ans: 2 },
    { q: '¿Cuánto del ADN humano compartimos con los chimpancés?',
      opts: ['80%', '90%', '98.7%', '100%'],
      ans: 2 },
    { q: '¿Cuántas neuronas tiene el cerebro humano?',
      opts: ['100 millones', '10.000 millones', '86.000 millones', '1 billón'],
      ans: 2 },
    { q: '¿Cuántas conexiones sinápticas puede tener una sola neurona?',
      opts: ['10', '100', '10.000', '1.000.000'],
      ans: 2 },
    { q: '¿Cuántos litros de agua hay en los océanos de la Tierra?',
      opts: ['1 trillón', '1.335 trillones', '5 trillones', '100 trillones'],
      ans: 1 },
    { q: '¿Cuántos km de costas tiene Chile aproximadamente?',
      opts: ['3.000 km', '4.700 km', '6.435 km', '10.000 km'],
      ans: 2 },
    { q: '¿A qué velocidad rota la Tierra en el ecuador (aprox.)?',
      opts: ['460 km/h', '1.670 km/h', '3.000 km/h', '28.000 km/h'],
      ans: 1 },
    { q: '¿Cuántas veces más brillante es el Sol que la Luna llena vista desde la Tierra?',
      opts: ['400 veces', '4.000 veces', '400.000 veces', '4 millones de veces'],
      ans: 2 },
    { q: '¿Cuánto pesa la Tierra?',
      opts: ['6 × 10¹⁸ toneladas', '6 × 10²¹ toneladas', '6 × 10²⁴ kg', '6 × 10²⁷ kg'],
      ans: 2 },
    { q: '¿En qué año se fundó Amazon?',
      opts: ['1992', '1994', '1997', '2000'],
      ans: 1 },
    { q: '¿Quién fundó Tesla (como empresa)?',
      opts: ['Elon Musk', 'Martin Eberhard y Marc Tarpenning', 'Jeff Bezos', 'Steve Jobs'],
      ans: 1 },
    { q: '¿En qué año se fundó SpaceX?',
      opts: ['1999', '2002', '2005', '2008'],
      ans: 1 },
    { q: '¿Cuántos países forman el G7?',
      opts: ['5', '7', '8', '10'],
      ans: 1 },
    { q: '¿Cuántos países son miembros permanentes del Consejo de Seguridad de la ONU?',
      opts: ['3', '5', '7', '10'],
      ans: 1 },
    { q: '¿Cuántos países integran la OTAN actualmente?',
      opts: ['25', '28', '32', '40'],
      ans: 2 },
    { q: '¿Cuál es el país más endeudado del mundo en términos de deuda pública total?',
      opts: ['Grecia', 'Japón', 'Estados Unidos', 'Italia'],
      ans: 2 },
    { q: '¿Cuál es la moneda más fuerte del mundo en valor frente al dólar?',
      opts: ['Libra esterlina', 'Dinar kuwaití', 'Franco suizo', 'Euro'],
      ans: 1 },
    { q: '¿Cuántos idiomas oficiales tiene Suiza?',
      opts: ['2', '3', '4', '5'],
      ans: 2 },
    { q: '¿Cuántos metros tiene la altura del Monte Everest?',
      opts: ['8.091 m', '8.516 m', '8.849 m', '9.000 m'],
      ans: 2 },
    { q: '¿Cuántos grados bajo cero llegó la temperatura más fría registrada en la Tierra?',
      opts: ['-60°C', '-78°C', '-89°C', '-100°C'],
      ans: 2 },
    { q: '¿Cuántos grados es la temperatura más alta registrada en la Tierra?',
      opts: ['54°C', '56°C', '58°C', '62°C'],
      ans: 1 },
    { q: '¿Cuántos km/h puede alcanzar un tornado de categoría F5?',
      opts: ['250 km/h', '350 km/h', '500 km/h', '700 km/h'],
      ans: 2 },
    { q: '¿Cuántos km/h tienen los vientos del huracán más fuerte registrado (Patricia 2015)?',
      opts: ['250 km/h', '315 km/h', '345 km/h', '380 km/h'],
      ans: 2 },
    { q: '¿De qué material están hechos los huesos humanos principalmente?',
      opts: ['Calcio puro', 'Fosfato de calcio (hidroxiapatita)', 'Carbonato de calcio', 'Magnesio y calcio'],
      ans: 1 },
    { q: '¿Cuántos minutos tarda la sangre en recorrer todo el cuerpo?',
      opts: ['30 segundos', '1 minuto', '5 minutos', '10 minutos'],
      ans: 1 },
    { q: '¿Cuántas veces late el corazón por día en promedio?',
      opts: ['50.000', '72.000', '100.000', '150.000'],
      ans: 2 },
    { q: '¿Cuántos metros de intestinos tiene el cuerpo humano (delgado + grueso)?',
      opts: ['3 m', '5 m', '8 m', '15 m'],
      ans: 2 },
    { q: '¿Cuánto pesa un globo ocular humano?',
      opts: ['3 g', '7.5 g', '28 g', '50 g'],
      ans: 1 },
    { q: '¿Cuántos mm³ tiene 1 cm³?',
      opts: ['10', '100', '1.000', '10.000'],
      ans: 2 },
    { q: '¿Cuántas caras tiene un cubo?',
      opts: ['4', '6', '8', '12'],
      ans: 1 },
    { q: '¿Cuántos vértices tiene un cubo?',
      opts: ['6', '8', '10', '12'],
      ans: 1 },
    { q: '¿Cuántas aristas tiene un cubo?',
      opts: ['8', '10', '12', '16'],
      ans: 2 },
    { q: '¿Cuál es el número de Fibonacci que sigue a 13?',
      opts: ['18', '21', '24', '27'],
      ans: 1 },
    { q: '¿Cuánto es 1 / 0.5?',
      opts: ['0.5', '1', '2', '5'],
      ans: 2 },
    { q: '¿Cuánto es el 15% de 200?',
      opts: ['20', '25', '30', '35'],
      ans: 2 },
    { q: '¿Cuánto es 7 × 8?',
      opts: ['48', '54', '56', '64'],
      ans: 2 },
    { q: '¿Cuánto es 12²?',
      opts: ['122', '132', '144', '168'],
      ans: 2 },
    { q: '¿Cuánto es la raíz cuadrada de 256?',
      opts: ['12', '14', '16', '18'],
      ans: 2 },
    // ── Más geografía ────────────────────────────────────
    { q: '¿Cuál es el país más densamente poblado del mundo?',
      opts: ['Bangladés', 'Singapur', 'Mónaco', 'Hong Kong'],
      ans: 2 },
    { q: '¿Cuántos km² tiene el océano Pacífico?',
      opts: ['100 millones km²', '165 millones km²', '200 millones km²', '250 millones km²'],
      ans: 1 },
    { q: '¿En qué país está el Kilimanjaro?',
      opts: ['Kenia', 'Tanzania', 'Uganda', 'Etiopía'],
      ans: 1 },
    { q: '¿Cuál es el río más largo de Europa?',
      opts: ['Danubio', 'Rin', 'Volga', 'Támesis'],
      ans: 2 },
    { q: '¿Cuál es la capital de Argentina?',
      opts: ['Córdoba', 'Rosario', 'Buenos Aires', 'Mendoza'],
      ans: 2 },
    { q: '¿En qué continente está Madagascar?',
      opts: ['Asia', 'América del Sur', 'Oceanía', 'África'],
      ans: 3 },
    { q: '¿Cuántos países bañados por el mar Mediterráneo hay?',
      opts: ['12', '17', '21', '25'],
      ans: 2 },
    { q: '¿Cuál es la ciudad más alta del mundo con más de 1 millón de habitantes?',
      opts: ['Quito, Ecuador', 'La Paz, Bolivia', 'Bogotá, Colombia', 'Addis Abeba, Etiopía'],
      ans: 1 },
    { q: '¿Qué país tiene la mayor cantidad de agua dulce del mundo?',
      opts: ['China', 'Rusia', 'Brasil', 'Canadá'],
      ans: 2 },
    { q: '¿Cuál es el país de América del Sur sin salida al mar?',
      opts: ['Solo Bolivia', 'Bolivia y Paraguay', 'Solo Paraguay', 'Ecuador'],
      ans: 1 },
    { q: '¿Cuántos km tiene la frontera entre México y Estados Unidos?',
      opts: ['1.500 km', '3.145 km', '4.800 km', '6.000 km'],
      ans: 1 },
    { q: '¿En qué país se encuentra el Machu Picchu?',
      opts: ['Bolivia', 'Ecuador', 'Perú', 'Colombia'],
      ans: 2 },
    { q: '¿Cuál es la ciudad más antigua del mundo habitada continuamente?',
      opts: ['Roma', 'Atenas', 'Jericó', 'Damasco'],
      ans: 3 },
    { q: '¿Qué país tiene el mayor número de musulmanes del mundo?',
      opts: ['Arabia Saudita', 'Irán', 'Pakistán', 'Indonesia'],
      ans: 3 },
    { q: '¿Cuál es el país con más premios Nobel per cápita?',
      opts: ['Suecia', 'Islandia', 'Suiza', 'Noruega'],
      ans: 0 },
    // ── Más ciencia ──────────────────────────────────────
    { q: '¿Cuál es el único metal líquido a temperatura ambiente?',
      opts: ['Estaño', 'Plomo', 'Mercurio', 'Galio'],
      ans: 2 },
    { q: '¿De qué está hecho el sonido?',
      opts: ['Partículas especiales', 'Fotones', 'Ondas de presión mecánica', 'Electrones'],
      ans: 2 },
    { q: '¿Cuál es el hueso más largo del cuerpo humano?',
      opts: ['Húmero', 'Tibia', 'Radio', 'Fémur'],
      ans: 3 },
    { q: '¿Cuántos tipos de sangre principales existen en el sistema ABO?',
      opts: ['2', '3', '4', '8'],
      ans: 2 },
    { q: '¿Cuántos pares de bases tiene el ADN humano (genoma completo)?',
      opts: ['3 millones', '3.200 millones', '32.000 millones', '3 billones'],
      ans: 1 },
    { q: '¿A qué temperatura se convierte el agua en vapor a nivel del mar?',
      opts: ['80°C', '90°C', '100°C', '120°C'],
      ans: 2 },
    { q: '¿Cuántos electrones tiene el oxígeno (número atómico)?',
      opts: ['6', '7', '8', '9'],
      ans: 2 },
    { q: '¿Cuál es el gas más denso de los gases nobles?',
      opts: ['Argón', 'Kriptón', 'Xenón', 'Radón'],
      ans: 3 },
    { q: '¿Cuántos litros de oxígeno respira un humano por día?',
      opts: ['200 litros', '550 litros', '1.800 litros', '5.000 litros'],
      ans: 1 },
    { q: '¿Cuántas venas tiene el cuerpo humano (aproximadamente)?',
      opts: ['100', '1.000', '10.000', '100.000'],
      ans: 2 },
    { q: '¿Qué porcentaje del cuerpo humano es agua?',
      opts: ['40%', '50%', '60%', '75%'],
      ans: 2 },
    { q: '¿A qué distancia de la Tierra se encuentra la Luna?',
      opts: ['100.000 km', '384.400 km', '1.000.000 km', '3.8 millones km'],
      ans: 1 },
    { q: '¿Cuántos satélites naturales tiene Júpiter?',
      opts: ['4', '16', '80+', '200+'],
      ans: 2 },
    { q: '¿Qué es más pesado: 1 kg de plumas o 1 kg de hierro?',
      opts: ['El hierro', 'Las plumas', 'Son iguales', 'Depende de la altitud'],
      ans: 2 },
    { q: '¿Cuántas dimensiones tiene el espacio-tiempo según la relatividad general?',
      opts: ['3', '4', '5', '11'],
      ans: 1 },
    { q: '¿Cuántos isótopos tiene el hidrógeno?',
      opts: ['2', '3', '4', '5'],
      ans: 1 },
    // ── Más historia ─────────────────────────────────────
    { q: '¿En qué año comenzó la Revolución Industrial?',
      opts: ['1700', '1760', '1800', '1830'],
      ans: 1 },
    { q: '¿En qué país empezó la Revolución Industrial?',
      opts: ['Francia', 'Alemania', 'Estados Unidos', 'Reino Unido'],
      ans: 3 },
    { q: '¿Quién fue el primer emperador de China?',
      opts: ['Mao Zedong', 'Kublai Kan', 'Qin Shi Huang', 'Sun Yat-sen'],
      ans: 2 },
    { q: '¿En qué año se abolió la esclavitud en Estados Unidos?',
      opts: ['1855', '1863', '1865', '1870'],
      ans: 2 },
    { q: '¿En qué batalla fue derrotado Napoleón definitivamente?',
      opts: ['Trafalgar', 'Leipzig', 'Waterloo', 'Borodino'],
      ans: 2 },
    { q: '¿Cuántos años duró la Guerra de los 7 Años?',
      opts: ['5 años', '7 años', '9 años', '12 años'],
      ans: 1 },
    { q: '¿En qué siglo vivió Leonardo da Vinci?',
      opts: ['Siglo XIII', 'Siglo XIV', 'Siglo XV-XVI', 'Siglo XVII'],
      ans: 2 },
    { q: '¿En qué año se proclamó la República Popular China?',
      opts: ['1945', '1947', '1949', '1952'],
      ans: 2 },
    { q: '¿Cuántos años turó la Inquisición española?',
      opts: ['100 años', '200 años', '350 años', '500 años'],
      ans: 2 },
    { q: '¿Quién fue el primer presidente de la historia moderna de Estados Unidos nacido fuera del país continental?',
      opts: ['Barack Obama', 'John F. Kennedy', 'Barack Obama (Hawái)', 'Ninguno ha nacido fuera'],
      ans: 2 },
    { q: '¿En qué año se firmó la Magna Carta en Inglaterra?',
      opts: ['1066', '1215', '1350', '1492'],
      ans: 1 },
    { q: '¿Cuántos años gobernó Francisco Franco en España?',
      opts: ['20 años', '30 años', '36 años', '40 años'],
      ans: 2 },
    { q: '¿En qué año se realizó la Revolución Rusa bolchevique?',
      opts: ['1914', '1916', '1917', '1919'],
      ans: 2 },
    { q: '¿En qué año se independizó la mayoría de los países latinoamericanos?',
      opts: ['1790-1800', '1810-1826', '1830-1850', '1850-1870'],
      ans: 1 },
    { q: '¿Cuántos faraones tuvo el antiguo Egipto aproximadamente?',
      opts: ['50', '100', '170', '300'],
      ans: 2 },
    // ── Más cultura pop ──────────────────────────────────
    { q: '¿Cuántos episodios tiene "Game of Thrones" en total?',
      opts: ['60', '70', '73', '80'],
      ans: 2 },
    { q: '¿En qué año se estrenó "Breaking Bad"?',
      opts: ['2006', '2007', '2008', '2010'],
      ans: 2 },
    { q: '¿Cuántas temporadas tiene "Breaking Bad"?',
      opts: ['4', '5', '6', '7'],
      ans: 1 },
    { q: '¿Cómo se llama el personaje principal de "Breaking Bad"?',
      opts: ['Jesse Pinkman', 'Walter White', 'Saul Goodman', 'Mike Ehrmantraut'],
      ans: 1 },
    { q: '¿De qué país es originaria la serie "Dark" de Netflix?',
      opts: ['Austria', 'Suiza', 'Alemania', 'Países Bajos'],
      ans: 2 },
    { q: '¿Cuántas películas tiene el universo cinematográfico de Marvel (MCU) hasta 2023?',
      opts: ['25', '28', '32', '35'],
      ans: 2 },
    { q: '¿Cuántos libros tiene "El Señor de los Anillos" (trilogía original)?',
      opts: ['2', '3', '4', '5'],
      ans: 1 },
    { q: '¿En qué año se estrenó "Avatar" de James Cameron?',
      opts: ['2007', '2008', '2009', '2010'],
      ans: 2 },
    { q: '¿Quién dirige "Avatar" (2009)?',
      opts: ['Steven Spielberg', 'Christopher Nolan', 'James Cameron', 'Peter Jackson'],
      ans: 2 },
    { q: '¿Cuántos años duró la serie animada "Los Simpsons" (hasta 2024)?',
      opts: ['25 años', '30 años', '35 años', '40 años'],
      ans: 2 },
    { q: '¿En qué año murió Michael Jackson?',
      opts: ['2007', '2009', '2011', '2013'],
      ans: 1 },
    { q: '¿Cuántos álbumes de BTS son considerados "álbumes completos" (LPs)?',
      opts: ['5', '6', '8', '10'],
      ans: 2 },
    { q: '¿Qué artista tiene el álbum más vendido de la historia?',
      opts: ['Beatles', 'Led Zeppelin', 'Michael Jackson (Thriller)', 'Eagles'],
      ans: 2 },
    { q: '¿En qué año se publicó el primer libro de Harry Potter?',
      opts: ['1995', '1996', '1997', '1998'],
      ans: 2 },
    { q: '¿Quién escribió "El Señor de los Anillos"?',
      opts: ['C.S. Lewis', 'George R.R. Martin', 'J.R.R. Tolkien', 'Terry Pratchett'],
      ans: 2 },
    // ── Más tecnología ───────────────────────────────────
    { q: '¿En qué año se lanzó el primer Android?',
      opts: ['2006', '2007', '2008', '2009'],
      ans: 2 },
    { q: '¿Cuántos núcleos tiene un procesador "octa-core"?',
      opts: ['4', '6', '8', '16'],
      ans: 2 },
    { q: '¿Qué significa "SSD" en informática?',
      opts: ['Super Speed Drive', 'Solid State Drive', 'System Storage Device', 'Secure Standard Disk'],
      ans: 1 },
    { q: '¿Cuántos GB tiene 1 TB?',
      opts: ['100 GB', '512 GB', '1.000 GB', '1.024 GB'],
      ans: 3 },
    { q: '¿Quién inventó el bluetooth?',
      opts: ['Nokia', 'Ericsson', 'Apple', 'IBM'],
      ans: 1 },
    { q: '¿En qué año se lanzó Instagram?',
      opts: ['2008', '2009', '2010', '2011'],
      ans: 2 },
    { q: '¿Cuántos Hz refresca una pantalla "144Hz"?',
      opts: ['72 imágenes/s', '100 imágenes/s', '144 imágenes/s', '288 imágenes/s'],
      ans: 2 },
    { q: '¿Qué es el "machine learning"?',
      opts: ['Robots que aprenden físicamente', 'Sistemas que aprenden de datos sin ser programados explícitamente', 'Software que memoriza reglas', 'Hardware de aprendizaje'],
      ans: 1 },
    { q: '¿Cuándo fue lanzado el primer PlayStation?',
      opts: ['1992', '1993', '1994', '1995'],
      ans: 2 },
    { q: '¿En qué año se lanzó el primer Windows?',
      opts: ['1981', '1983', '1985', '1987'],
      ans: 2 },
    // ── Más Chile ────────────────────────────────────────
    { q: '¿Cuál es la segunda ciudad más grande de Chile?',
      opts: ['Valparaíso', 'Concepción', 'Antofagasta', 'La Serena'],
      ans: 1 },
    { q: '¿En qué región de Chile está Torres del Paine?',
      opts: ['Aysén', 'Los Lagos', 'Magallanes', 'Los Ríos'],
      ans: 2 },
    { q: '¿Cuál es el plato más típico de la zona sur de Chile?',
      opts: ['Ceviche', 'Curanto', 'Cazuela', 'Humitas'],
      ans: 1 },
    { q: '¿Qué significa "al tiro" en Chile?',
      opts: ['Con mucha fuerza', 'De inmediato', 'Con cuidado', 'De todas formas'],
      ans: 1 },
    { q: '¿Cuántos metros sobre el nivel del mar está Santiago?',
      opts: ['300 m', '520 m', '750 m', '1.200 m'],
      ans: 1 },
    { q: '¿Cómo se llama la moneda de Chile?',
      opts: ['Escudo', 'Austral', 'Peso', 'Real'],
      ans: 2 },
    { q: '¿En qué región está el Desierto de Atacama?',
      opts: ['Arica y Parinacota', 'Antofagasta', 'Atacama', 'Coquimbo'],
      ans: 1 },
    { q: '¿Cuántas regiones tiene Chile actualmente?',
      opts: ['13', '15', '16', '17'],
      ans: 2 },
    { q: '¿Quién fue el primer presidente de Chile?',
      opts: ['Bernardo O\'Higgins', 'José Miguel Carrera', 'Manuel Blanco Encalada', 'Ramón Freire'],
      ans: 2 },
    { q: '¿Qué significa "cachai" en Chile?',
      opts: ['¿Lo agarraste físicamente?', '¿Entiendes?/¿Sabes?', '¿Lo compraste?', '¿Lo buscaste?'],
      ans: 1 },
    { q: '¿Cuál es el cerro más alto de la Región Metropolitana?',
      opts: ['Cerro San Cristóbal', 'Cerro Manquehue', 'Cerro El Plomo', 'Cerro La Campana'],
      ans: 2 },
    { q: '¿Qué equipo ganó más campeonatos en el fútbol chileno (hasta 2024)?',
      opts: ['Universidad de Chile', 'Colo-Colo', 'Universidad Católica', 'Magallanes'],
      ans: 1 },
    { q: '¿Cómo se llama la bebida gaseosa más chilena y popular (marca local)?',
      opts: ['Bilz', 'Crush', 'Terma', 'Pap'],
      ans: 0 },
    { q: '¿Qué es una "once" en Chile?',
      opts: ['Una comida a las 11 AM', 'Un desayuno tardío', 'Una merienda-cena al final de la tarde', 'Un aperitivo antes del almuerzo'],
      ans: 2 },
    { q: '¿Cuántas estrellas tiene la Cruz del Sur en la bandera de Magallanes?',
      opts: ['4', '5', '6', 'No hay Cruz del Sur'],
      ans: 0 },
    { q: '¿Cuántos colores tiene la bandera olímpica?',
      opts: ['4', '5', '6', '7'],
      ans: 1 },
    { q: '¿Cuántos años tiene de historia el juego de ajedrez?',
      opts: ['500 años', '1.000 años', '1.500 años', '2.000 años'],
      ans: 2 },
    { q: '¿Cuántos casilleros tiene un tablero de ajedrez?',
      opts: ['32', '48', '64', '81'],
      ans: 2 },
    { q: '¿Cuántas piezas tiene cada jugador de ajedrez al inicio?',
      opts: ['12', '14', '16', '20'],
      ans: 2 },
    { q: '¿En qué año se fundó la FIFA?',
      opts: ['1900', '1904', '1910', '1920'],
      ans: 1 },
    { q: '¿Cuántas cuerdas tiene un violín?',
      opts: ['3', '4', '5', '6'],
      ans: 1 },
    { q: '¿Cuántos huesos tiene la mano humana (incluyendo muñeca)?',
      opts: ['19', '23', '27', '31'],
      ans: 2 },
    { q: '¿Cuántos km/h puede volar un halcón peregrino en picada?',
      opts: ['150 km/h', '240 km/h', '320 km/h', '500 km/h'],
      ans: 2 },
    { q: '¿Cuántos músculos tiene el cuerpo humano aproximadamente?',
      opts: ['200', '400', '600', '1.000'],
      ans: 2 },
    { q: '¿Cuántos km/h puede correr un guepardo (velocidad máxima)?',
      opts: ['80 km/h', '100 km/h', '112 km/h', '130 km/h'],
      ans: 2 },
];

let triviaQuestions = [];
let triviaIndex = 0;
let triviaScore = 0;
let triviaAnswered = false;

function startTrivia() {
    const shuffled = [...TRIVIA_POOL].sort(() => Math.random() - 0.5);
    triviaQuestions = shuffled.slice(0, 5);
    triviaIndex = 0;
    triviaScore = 0;
    document.getElementById('trivia-welcome').classList.add('hidden');
    document.getElementById('trivia-final').classList.add('hidden');
    document.getElementById('trivia-game').classList.remove('hidden');
    showTriviaQuestion();
}

function showTriviaQuestion() {
    triviaAnswered = false;
    const q = triviaQuestions[triviaIndex];
    document.getElementById('trivia-progress-text').textContent = `Pregunta ${triviaIndex + 1} de 5`;
    document.getElementById('trivia-progress-fill').style.width = (triviaIndex / 5 * 100) + '%';
    document.getElementById('trivia-score-live').textContent = triviaScore;
    document.getElementById('trivia-question-text').textContent = q.q;
    document.getElementById('trivia-next-btn').classList.add('hidden');
    const optionsEl = document.getElementById('trivia-options');
    optionsEl.innerHTML = '';
    q.opts.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'trivia-opt-btn';
        btn.textContent = opt;
        btn.addEventListener('click', () => answerTrivia(i, q.ans));
        optionsEl.appendChild(btn);
    });
}

function answerTrivia(selected, correct) {
    if (triviaAnswered) return;
    triviaAnswered = true;
    const optBtns = document.querySelectorAll('.trivia-opt-btn');
    optBtns.forEach((btn, i) => {
        btn.disabled = true;
        if (i === correct) btn.classList.add('correct');
        else if (i === selected) btn.classList.add('wrong');
    });
    if (selected === correct) triviaScore++;
    document.getElementById('trivia-score-live').textContent = triviaScore;
    if (triviaIndex < 4) {
        document.getElementById('trivia-next-btn').classList.remove('hidden');
    } else {
        setTimeout(showTriviaFinal, 900);
    }
}

function showTriviaFinal() {
    document.getElementById('trivia-game').classList.add('hidden');
    document.getElementById('trivia-final').classList.remove('hidden');
    const icons   = ['😅', '🙈', '🤔', '😎', '🏆', '🧠'];
    const msgs    = ['¡Sigue practicando!', '¡No está mal, pero puedes mejorar!', '¡Vas bien!', '¡Buen puntaje!', '¡Casi perfecto!', '¡Eres un crack de Chile! 🇨🇱'];
    document.getElementById('trivia-final-icon').textContent  = icons[triviaScore];
    document.getElementById('trivia-final-score').textContent = `${triviaScore} de 5`;
    document.getElementById('trivia-final-msg').textContent   = msgs[triviaScore];
    document.getElementById('trivia-stars').textContent       = '⭐'.repeat(triviaScore) + '☆'.repeat(5 - triviaScore);
    const shareText = `¡Saqué ${triviaScore}/5 en la Trivia Chilena de Estoy Fome! ${'⭐'.repeat(triviaScore)}${'☆'.repeat(5 - triviaScore)} ¿Tú lo puedes superar? → https://tetinca.cl`;
    document.getElementById('trivia-share-btn').onclick = () =>
        window.open('https://wa.me/?text=' + encodeURIComponent(shareText), '_blank', 'noopener');
}

document.getElementById('trivia-start-btn').addEventListener('click', startTrivia);
document.getElementById('trivia-next-btn').addEventListener('click', () => {
    triviaIndex++;
    showTriviaQuestion();
});
document.getElementById('trivia-restart-btn').addEventListener('click', () => {
    document.getElementById('trivia-final').classList.add('hidden');
    document.getElementById('trivia-welcome').classList.remove('hidden');
});

// ── Confesiones Fomes ─────────────────────────────────────
const CONFESSION_REACTIONS = [
    { key: 'joy',   emoji: '😂' },
    { key: 'cry',   emoji: '🥹' },
    { key: 'wow',   emoji: '😮' },
    { key: 'hands', emoji: '🤝' },
];

function getReacted() {
    return JSON.parse(localStorage.getItem('tetinca_reacted') || '{}');
}

function setReacted(confId, key) {
    const reacted = getReacted();
    if (!reacted[confId]) reacted[confId] = [];
    reacted[confId].push(key);
    localStorage.setItem('tetinca_reacted', JSON.stringify(reacted));
}

function formatTimeAgo(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'justo ahora';
    if (mins < 60) return `hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    return `hace ${Math.floor(hrs / 24)}d`;
}

let unsubConfessions = null;
const activeReplyUnsubs = new Map();

function toggleConfessionReplies(confId, btn) {
    const repliesEl = document.getElementById('conf-replies-' + confId);
    const isOpen = !repliesEl.classList.contains('hidden');
    if (isOpen) {
        repliesEl.classList.add('hidden');
        btn.classList.remove('open');
        if (activeReplyUnsubs.has(confId)) { activeReplyUnsubs.get(confId)(); activeReplyUnsubs.delete(confId); }
        return;
    }
    repliesEl.classList.remove('hidden');
    btn.classList.add('open');
    const listEl = document.getElementById('conf-reply-list-' + confId);
    const countEl = document.getElementById('conf-count-' + confId);
    listEl.innerHTML = '<div class="comment-empty" style="font-size:.85rem;padding:.4rem 0">Cargando...</div>';
    const unsub = db.collection('comments_confesion_' + confId)
        .orderBy('ts', 'asc').limit(30)
        .onSnapshot(snap => {
            if (countEl) countEl.textContent = snap.size;
            if (snap.empty) {
                listEl.innerHTML = '<div class="comment-empty" style="font-size:.85rem;padding:.4rem 0">Sé el primero en responder 💬</div>';
                return;
            }
            listEl.innerHTML = '';
            snap.forEach(doc => {
                const d = doc.data();
                const div = document.createElement('div');
                div.className = 'conf-reply-item';
                div.innerHTML =
                    '<div class="conf-reply-meta">' +
                        '<span class="conf-reply-author">👤 ' + escapeHtml(d.name || 'Anónimo') + '</span>' +
                        '<span>' + formatTimeAgo(d.ts) + '</span>' +
                        (isAdminMode ? '<button class="comment-delete-btn conf-reply-delete-btn" data-id="' + doc.id + '">🗑️</button>' : '') +
                    '</div>' +
                    '<div class="conf-reply-body">' + escapeHtml(d.text) + '</div>';
                if (isAdminMode) {
                    div.querySelector('.conf-reply-delete-btn').addEventListener('click', async () => {
                        if (!confirm('¿Borrar esta respuesta?')) return;
                        await db.collection('comments_confesion_' + confId).doc(doc.id).delete();
                    });
                }
                listEl.appendChild(div);
            });
        }, () => { listEl.innerHTML = '<div class="comment-empty">No se pudieron cargar respuestas.</div>'; });
    activeReplyUnsubs.set(confId, unsub);
}

function loadConfessions() {
    const listEl = document.getElementById('confession-list');
    listEl.innerHTML = '<div class="comment-empty">Cargando confesiones...</div>';
    if (unsubConfessions) { unsubConfessions(); unsubConfessions = null; }
    unsubConfessions = db.collection('comments_confesiones')
        .orderBy('ts', 'desc')
        .limit(20)
        .onSnapshot(snap => {
            if (snap.empty) {
                listEl.innerHTML = '<div class="comment-empty">¡Sé el primero en confesar algo! 🤫</div>';
                return;
            }
            const reacted = getReacted();
            listEl.innerHTML = '';
            snap.forEach(doc => {
                const d = doc.data();
                const confId = doc.id;
                const item = document.createElement('div');
                item.className = 'confession-item';
                const reactBtns = CONFESSION_REACTIONS.map(r => {
                    const count = d[r.key] || 0;
                    const hasReacted = reacted[confId]?.includes(r.key);
                    return `<button class="react-btn${hasReacted ? ' reacted' : ''}" data-id="${confId}" data-key="${r.key}"${hasReacted ? ' disabled' : ''}>${r.emoji} <span>${count}</span></button>`;
                }).join('');
                item.innerHTML =
                    '<div class="confession-meta">' +
                        '<span class="confession-author">👤 ' + escapeHtml(d.name || 'Anónimo') + '</span>' +
                        '<span class="confession-time">' + formatTimeAgo(d.ts) + '</span>' +
                        (isAdminMode ? '<button class="comment-delete-btn conf-delete-btn" data-id="' + confId + '">🗑️</button>' : '') +
                    '</div>' +
                    '<div class="confession-text">' + escapeHtml(d.text) + '</div>' +
                    '<div class="confession-footer">' +
                        '<div class="confession-reactions">' + reactBtns + '</div>' +
                        '<button class="conf-toggle-btn" data-id="' + confId + '">💬 <span id="conf-count-' + confId + '">0</span></button>' +
                    '</div>' +
                    '<div class="conf-replies hidden" id="conf-replies-' + confId + '">' +
                        '<div class="conf-reply-list" id="conf-reply-list-' + confId + '"></div>' +
                        '<div class="conf-reply-form">' +
                            '<input type="text" class="conf-reply-name" placeholder="Tu nombre (opcional)" maxlength="20" autocomplete="off">' +
                            '<div class="conf-reply-row">' +
                                '<textarea class="conf-reply-textarea" placeholder="Escribe tu respuesta..." maxlength="200" rows="2"></textarea>' +
                                '<button class="conf-reply-submit">Enviar</button>' +
                            '</div>' +
                            '<div class="conf-reply-feedback hidden"></div>' +
                        '</div>' +
                    '</div>';

                item.querySelectorAll('.react-btn:not([disabled])').forEach(btn => {
                    btn.addEventListener('click', () => {
                        btn.disabled = true;
                        btn.classList.add('reacted');
                        const countEl = btn.querySelector('span');
                        countEl.textContent = parseInt(countEl.textContent) + 1;
                        setReacted(btn.dataset.id, btn.dataset.key);
                        db.collection('comments_confesiones').doc(btn.dataset.id).update({
                            [btn.dataset.key]: firebase.firestore.FieldValue.increment(1)
                        }).catch(() => {});
                    });
                });

                if (isAdminMode) {
                    item.querySelector('.conf-delete-btn').addEventListener('click', async () => {
                        if (!confirm('¿Borrar esta confesión?')) return;
                        await db.collection('comments_confesiones').doc(confId).delete();
                    });
                }

                item.querySelector('.conf-toggle-btn').addEventListener('click', function() {
                    toggleConfessionReplies(confId, this);
                });

                item.querySelector('.conf-reply-submit').addEventListener('click', async function() {
                    const nameEl = item.querySelector('.conf-reply-name');
                    const textEl = item.querySelector('.conf-reply-textarea');
                    const feedbackEl = item.querySelector('.conf-reply-feedback');
                    const name = nameEl.value.trim();
                    const text = textEl.value.trim();
                    const showFb = (msg, type) => {
                        feedbackEl.textContent = msg;
                        feedbackEl.className = 'conf-reply-feedback ' + type;
                        setTimeout(() => { feedbackEl.className = 'conf-reply-feedback hidden'; }, 3500);
                    };
                    if (!text || text.length < 3) { showFb('Escribe al menos 3 caracteres.', 'error'); return; }
                    if (hasBadWord(name) || hasBadWord(text)) { showFb('Tu respuesta contiene palabras no permitidas 🙏', 'error'); return; }
                    this.disabled = true;
                    try {
                        await db.collection('comments_confesion_' + confId).add({
                            name: name || 'Anónimo',
                            text,
                            ts: firebase.firestore.FieldValue.serverTimestamp(),
                        });
                        textEl.value = '';
                        nameEl.value = '';
                        showFb('¡Respuesta publicada! 🎉', 'success');
                    } catch(e) { showFb('Error al publicar. Inténtalo de nuevo.', 'error'); }
                    finally { this.disabled = false; }
                });

                listEl.appendChild(item);
            });
        }, () => {
            listEl.innerHTML = '<div class="comment-empty">No se pudieron cargar las confesiones.</div>';
        });
}

const confessionTextEl = document.getElementById('confession-text');
const confessionCharsEl = document.getElementById('confession-chars');
confessionTextEl.addEventListener('input', () => {
    confessionCharsEl.textContent = confessionTextEl.value.length;
});

document.getElementById('confession-submit').addEventListener('click', async () => {
    const text = confessionTextEl.value.trim();
    const feedbackEl = document.getElementById('confession-feedback');
    function showConfFeedback(msg, type) {
        feedbackEl.textContent = msg;
        feedbackEl.className = 'comment-feedback ' + type;
        setTimeout(() => { feedbackEl.className = 'comment-feedback hidden'; }, 3500);
    }
    if (!text) { showConfFeedback('Escribe algo para confesar 🤫', 'error'); return; }
    if (text.length < 5) { showConfFeedback('¡Confiesa un poco más! Mínimo 5 caracteres.', 'error'); return; }
    if (hasBadWord(text)) { showConfFeedback('Sin palabrotas por favor 🙏', 'error'); return; }
    const lastConf = parseInt(localStorage.getItem('tetinca_last_confession') || '0');
    if (Date.now() - lastConf < 60000) { showConfFeedback('Espera 1 minuto antes de confesar de nuevo.', 'error'); return; }
    const submitBtn = document.getElementById('confession-submit');
    submitBtn.disabled = true;
    const authorName = document.getElementById('confession-author').value.trim();
    try {
        await db.collection('comments_confesiones').add({
            name: authorName || 'Anónimo',
            text,
            ts: firebase.firestore.FieldValue.serverTimestamp(),
            joy: 0, cry: 0, wow: 0, hands: 0,
        });
        confessionTextEl.value = '';
        confessionCharsEl.textContent = '0';
        document.getElementById('confession-author').value = '';
        localStorage.setItem('tetinca_last_confession', Date.now().toString());
        showConfFeedback('¡Confesión publicada! 🤫', 'success');
    } catch {
        showConfFeedback('Error al publicar. Inténtalo de nuevo.', 'error');
    } finally {
        submitBtn.disabled = false;
    }
});

// ── Sudoku ────────────────────────────────────────────────
let sudokuTabInitialized = false;
let sudokuSolution = null, sudokuCurrent = null, sudokuFixed = null;
let sudokuSelected = null, sudokuTimer = null, sudokuSeconds = 0;
let sudokuMistakes = 0, sudokuHintsLeft = 3, sudokuDifficulty = 'easy';
let sudokuComplete = false, sudokuHinted = new Set();

function sdkEmpty() { return Array.from({length:9}, () => Array(9).fill(0)); }

function sdkValid(g, r, c, n) {
    if (g[r].includes(n)) return false;
    for (let i = 0; i < 9; i++) if (g[i][c] === n) return false;
    const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
    for (let i = br; i < br+3; i++) for (let j = bc; j < bc+3; j++) if (g[i][j] === n) return false;
    return true;
}

function sdkShuffle(a) {
    for (let i = a.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; }
    return a;
}

function sdkFill(g) {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (g[r][c] === 0) {
        for (const n of sdkShuffle([1,2,3,4,5,6,7,8,9])) {
            if (sdkValid(g, r, c, n)) {
                g[r][c] = n;
                if (sdkFill(g)) return true;
                g[r][c] = 0;
            }
        }
        return false;
    }
    return true;
}

function sdkGenerate(diff) {
    const remove = {easy:30, medium:43, hard:53}[diff] || 35;
    const sol = sdkEmpty(); sdkFill(sol);
    const puz = sol.map(r => [...r]);
    sdkShuffle([...Array(81).keys()]).slice(0, remove).forEach(p => { puz[Math.floor(p/9)][p%9] = 0; });
    return { solution: sol, puzzle: puz };
}

function sdkFmt(s) { return String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0'); }

function initSudokuTab() {
    document.querySelectorAll('.sudoku-diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sudoku-diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            sudokuDifficulty = btn.dataset.diff;
        });
    });
    document.getElementById('sudoku-start-btn').addEventListener('click', sdkStart);
    document.getElementById('sudoku-new-btn').addEventListener('click', sdkStart);
    document.getElementById('sudoku-erase-btn').addEventListener('click', sdkErase);
    document.getElementById('sudoku-hint-btn').addEventListener('click', sdkHint);
    document.getElementById('sudoku-play-again-btn').addEventListener('click', sdkStart);
    document.querySelectorAll('.sudoku-diff-change-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            sudokuDifficulty = btn.dataset.diff;
            document.querySelectorAll('.sudoku-diff-btn').forEach(b => b.classList.toggle('active', b.dataset.diff === sudokuDifficulty));
            sdkStart();
        });
    });
    document.addEventListener('keydown', sdkKeyHandler);
}

function sdkShow(id) {
    const el = document.getElementById(id);
    el.classList.remove('hidden');
    el.style.display = 'block';
}
function sdkHide(id) {
    const el = document.getElementById(id);
    el.classList.add('hidden');
    el.style.display = 'none';
}

function sdkInjectStyles() {
    const old = document.getElementById('sdk-styles');
    if (old) old.remove();
    const avail = Math.min(window.innerWidth - 72, 354);
    const cp = Math.floor(avail / 9);
    const gw = cp * 9; // grid width = pure cell area, no border
    const fs = Math.max(11, Math.round(cp * 0.46));
    const s = document.createElement('style');
    s.id = 'sdk-styles';
    // No border/border-radius/overflow:hidden on grid — use box-shadow outline
    // so corner cells are NEVER clipped
    s.textContent = `
        @keyframes sdkShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}
          40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
        .sudoku-grid-wrap{display:flex!important;justify-content:center!important;margin-bottom:1rem!important;}
        #sudoku-grid{display:grid!important;grid-template-columns:repeat(9,${cp}px)!important;
          grid-template-rows:repeat(9,${cp}px)!important;width:${gw}px!important;height:${gw}px!important;
          box-shadow:0 0 0 3px #7c3aed,0 6px 24px rgba(124,58,237,.25)!important;
          border-radius:6px!important;box-sizing:content-box!important;}
        .sudoku-cell{width:${cp}px!important;height:${cp}px!important;font-size:${fs}px!important;
          display:flex!important;align-items:center!important;justify-content:center!important;
          font-weight:700!important;cursor:pointer!important;user-select:none!important;
          box-sizing:border-box!important;transition:background .12s!important;}
        .sudoku-cell.sdk-shake{animation:sdkShake .28s ease!important;}
        .sudoku-numpad{display:grid!important;grid-template-columns:repeat(9,1fr)!important;
          gap:4px!important;width:${gw}px!important;margin:0 auto .9rem!important;}
        .sudoku-num-btn{aspect-ratio:1!important;display:flex!important;align-items:center!important;
          justify-content:center!important;font-weight:900!important;font-size:${fs}px!important;
          cursor:pointer!important;border:2px solid #d4d4d8!important;border-radius:10px!important;
          background:#f4f4f5!important;color:#7c3aed!important;}
        .sudoku-num-btn:hover{background:#7c3aed!important;color:#fff!important;border-color:#7c3aed!important;}
        .sudoku-num-btn.num-done{opacity:.2!important;pointer-events:none!important;}
    `;
    document.head.appendChild(s);
}

function sdkPlaySound(correct) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        if (correct) {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523, ctx.currentTime);
            osc.frequency.setValueAtTime(659, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
            osc.start(); osc.stop(ctx.currentTime + 0.45);
        } else {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.setValueAtTime(160, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.18, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.start(); osc.stop(ctx.currentTime + 0.3);
        }
    } catch(e) {}
}

function sdkStart() {
    sdkInjectStyles();
    const {solution, puzzle} = sdkGenerate(sudokuDifficulty);
    sudokuSolution = solution;
    sudokuCurrent  = puzzle.map(r => [...r]);
    sudokuFixed    = puzzle.map(r => r.map(v => v !== 0));
    sudokuSelected = null;
    sudokuMistakes = 0;
    sudokuHintsLeft = 3;
    sudokuComplete  = false;
    sudokuHinted    = new Set();
    sudokuSeconds   = 0;
    clearInterval(sudokuTimer);
    sudokuTimer = setInterval(() => {
        sudokuSeconds++;
        const el = document.getElementById('sudoku-timer');
        if (el) el.textContent = sdkFmt(sudokuSeconds);
    }, 1000);
    sdkHide('sudoku-welcome');
    sdkHide('sudoku-complete');
    sdkShow('sudoku-game');
    document.getElementById('sudoku-diff-badge').textContent = {easy:'Fácil',medium:'Medio',hard:'Difícil'}[sudokuDifficulty];
    document.getElementById('sudoku-timer').textContent = '00:00';
    document.getElementById('sudoku-mistakes').textContent = '❌ 0';
    document.getElementById('sudoku-hints-left').textContent = '(3)';
    document.getElementById('sudoku-hint-btn').disabled = false;
    sdkRenderGrid();
    sdkBuildNumpad();
}

function sdkCellColor(r, c) {
    const val = sudokuCurrent[r][c];
    if (sudokuFixed[r][c]) return sudokuHinted.has(`${r},${c}`) ? '#059669' : '#18181b';
    if (val !== 0) return (val !== sudokuSolution[r][c]) ? '#ef4444' : '#7c3aed';
    return '#7c3aed';
}

function sdkRenderGrid() {
    const grid = document.getElementById('sudoku-grid');
    grid.innerHTML = '';
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.className = 'sudoku-cell';
        cell.dataset.r = r; cell.dataset.c = c;
        cell.style.borderRight  = c === 8 ? 'none' : (c===2||c===5) ? '2px solid #7c3aed' : '1px solid #d4d4d8';
        cell.style.borderBottom = r === 8 ? 'none' : (r===2||r===5) ? '2px solid #7c3aed' : '1px solid #d4d4d8';
        cell.style.color = sdkCellColor(r, c);
        const val = sudokuCurrent[r][c];
        if (sudokuFixed[r][c]) { cell.style.fontWeight = '900'; cell.textContent = val; }
        else if (val !== 0) cell.textContent = val;
        cell.addEventListener('click', () => sdkSelectCell(r, c));
        grid.appendChild(cell);
    }
    sdkHighlight();
}

function sdkSelectCell(r, c) {
    if (sudokuComplete) return;
    sudokuSelected = {r, c};
    sdkHighlight();
}

function sdkHighlight() {
    document.querySelectorAll('.sudoku-cell').forEach(cell => {
        const cr = +cell.dataset.r, cc = +cell.dataset.c;
        cell.style.background = '';
        cell.style.color = sdkCellColor(cr, cc);
        if (!sudokuSelected) return;
        const {r, c} = sudokuSelected;
        if (cr === r && cc === c) {
            cell.style.background = '#7c3aed';
            cell.style.color = '#fff';
            return;
        }
        const sameBox = Math.floor(cr/3)===Math.floor(r/3) && Math.floor(cc/3)===Math.floor(c/3);
        const selVal = sudokuCurrent[r][c];
        if (selVal && sudokuCurrent[cr][cc] === selVal) cell.style.background = '#fde68a';
        else if (cr===r || cc===c || sameBox) cell.style.background = '#ede9fe';
    });
}

function sdkInput(num) {
    if (!sudokuSelected || sudokuComplete) return;
    const {r, c} = sudokuSelected;
    if (sudokuFixed[r][c]) return;
    sudokuCurrent[r][c] = num;
    const correct = (num === sudokuSolution[r][c]);
    if (!correct) {
        sudokuMistakes++;
        document.getElementById('sudoku-mistakes').textContent = `❌ ${sudokuMistakes}`;
    }
    sdkRenderGrid();
    sdkUpdateNumpad();
    // Visual + audio feedback
    const cell = document.querySelector(`.sudoku-cell[data-r="${r}"][data-c="${c}"]`);
    if (cell) {
        if (correct) {
            cell.style.background = '#dcfce7';
            cell.style.color = '#16a34a';
            sdkPlaySound(true);
            setTimeout(() => sdkHighlight(), 600);
        } else {
            cell.style.background = '#fee2e2';
            cell.style.color = '#ef4444';
            cell.classList.add('sdk-shake');
            sdkPlaySound(false);
            setTimeout(() => cell && cell.classList.remove('sdk-shake'), 300);
        }
    }
    if (sdkIsSolved()) sdkFinish();
}

function sdkErase() {
    if (!sudokuSelected || sudokuComplete) return;
    const {r, c} = sudokuSelected;
    if (sudokuFixed[r][c]) return;
    sudokuCurrent[r][c] = 0;
    sdkRenderGrid();
    sdkUpdateNumpad();
}

function sdkHint() {
    if (sudokuHintsLeft <= 0 || sudokuComplete) return;
    const empties = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
        if (!sudokuFixed[r][c] && sudokuCurrent[r][c] !== sudokuSolution[r][c]) empties.push({r,c});
    if (!empties.length) return;
    const {r, c} = empties[Math.floor(Math.random() * empties.length)];
    sudokuCurrent[r][c] = sudokuSolution[r][c];
    sudokuFixed[r][c] = true;
    sudokuHinted.add(`${r},${c}`);
    sudokuHintsLeft--;
    document.getElementById('sudoku-hints-left').textContent = `(${sudokuHintsLeft})`;
    if (sudokuHintsLeft === 0) document.getElementById('sudoku-hint-btn').disabled = true;
    sudokuSelected = {r, c};
    sdkRenderGrid();
    const cell = document.querySelector(`.sudoku-cell[data-r="${r}"][data-c="${c}"]`);
    if (cell) { cell.classList.add('hint-pop'); setTimeout(() => cell.classList.remove('hint-pop'), 350); }
    sdkUpdateNumpad();
    if (sdkIsSolved()) sdkFinish();
}

function sdkIsSolved() {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
        if (sudokuCurrent[r][c] !== sudokuSolution[r][c]) return false;
    return true;
}

function sdkFinish() {
    sudokuComplete = true;
    clearInterval(sudokuTimer);
    setTimeout(() => {
        sdkHide('sudoku-game');
        sdkShow('sudoku-complete');
        document.getElementById('sudoku-complete-time').textContent = `⏱ Tiempo: ${sdkFmt(sudokuSeconds)}`;
        document.getElementById('sudoku-complete-mistakes').textContent = `❌ Errores: ${sudokuMistakes}`;
    }, 600);
}

function sdkBuildNumpad() {
    const pad = document.getElementById('sudoku-numpad');
    pad.innerHTML = '';
    for (let n = 1; n <= 9; n++) {
        const btn = document.createElement('button');
        btn.className = 'sudoku-num-btn';
        btn.textContent = n;
        btn.dataset.num = n;
        btn.addEventListener('click', () => sdkInput(n));
        pad.appendChild(btn);
    }
    sdkUpdateNumpad();
}

function sdkUpdateNumpad() {
    const counts = Array(10).fill(0);
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        const v = sudokuCurrent[r][c];
        if (v && v === sudokuSolution[r][c]) counts[v]++;
    }
    document.querySelectorAll('.sudoku-num-btn').forEach(btn => {
        btn.classList.toggle('num-done', counts[+btn.dataset.num] >= 9);
    });
}

function sdkKeyHandler(e) {
    if (['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
    const gameEl = document.getElementById('sudoku-game');
    if (!gameEl || gameEl.classList.contains('hidden')) return;
    if (e.key >= '1' && e.key <= '9') { sdkInput(+e.key); return; }
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { sdkErase(); return; }
    if (!sudokuSelected) return;
    const dirs = { ArrowUp:[-1,0], ArrowDown:[1,0], ArrowLeft:[0,-1], ArrowRight:[0,1] };
    if (dirs[e.key]) {
        e.preventDefault();
        const [dr, dc] = dirs[e.key];
        sudokuSelected = { r: Math.max(0, Math.min(8, sudokuSelected.r+dr)), c: Math.max(0, Math.min(8, sudokuSelected.c+dc)) };
        sdkHighlight();
    }
}

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
