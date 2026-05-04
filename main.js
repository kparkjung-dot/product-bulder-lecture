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
    ver:        { badge: '🎬 ¿Qué ver?',      desc: '¿Viste alguna de estas pelis o series? ¡Cuéntanos qué tal!' },
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
                this.page.url = window.location.origin + window.location.pathname;
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
    { name: 'Caldillo de congrio',         emoji: '🐟' },
    { name: 'Ceviche de reineta',          emoji: '🍋' },
    { name: 'Machas a la parmesana',       emoji: '🦪' },
    { name: 'Chupe de mariscos',           emoji: '🦐' },
    { name: 'Jaibas rellenas',             emoji: '🦀' },
    { name: 'Churrasco italiano',          emoji: '🥩' },
    { name: 'Barros Luco',                 emoji: '🧀' },
    // China
    { name: 'Arroz frito con verduras',    emoji: '🍚' },
    { name: 'Chow mein de pollo',          emoji: '🍜' },
    { name: 'Cerdo agridulce',             emoji: '🍖' },
    { name: 'Dim sum variado',             emoji: '🥟' },
    { name: 'Sopa wonton',                 emoji: '🥣' },
    { name: 'Pato Pekín',                  emoji: '🦆' },
    // Coreana
    { name: 'Bibimbap',                    emoji: '🍲' },
    { name: 'Pollo coreano frito (KFC)',   emoji: '🍗' },
    { name: 'Ramen coreano picante',       emoji: '🍜' },
    { name: 'Bulgogi',                     emoji: '🥩' },
    { name: 'Japchae (fideos de vidrio)',  emoji: '🍝' },
    { name: 'Tteokbokki',                  emoji: '🌶️' },
    // India
    { name: 'Pollo tikka masala',          emoji: '🍛' },
    { name: 'Butter chicken',             emoji: '🍛' },
    { name: 'Dal tadka con naan',          emoji: '🫓' },
    { name: 'Biryani de cordero',          emoji: '🍚' },
    { name: 'Palak paneer',               emoji: '🥬' },
    // Japonesa
    { name: 'Ramen tonkotsu',             emoji: '🍜' },
    { name: 'Katsu curry',                emoji: '🍛' },
    { name: 'Udon con tempura',           emoji: '🍜' },
    { name: 'Donburi de pollo teriyaki',  emoji: '🍚' },
    { name: 'Yakitori',                   emoji: '🍢' },
    { name: 'Miso ramen',                 emoji: '🍜' },
    // China
    { name: 'Pato laqueado',              emoji: '🦆' },
    { name: 'Cerdo Moo Shu',              emoji: '🥢' },
    { name: 'Fideos de arroz salteados',  emoji: '🍜' },
    { name: 'Bok choy con ostras',        emoji: '🥬' },
    // Mexicana / Peruana
    { name: 'Tacos de carne asada',       emoji: '🌮' },
    { name: 'Burritos de pollo',          emoji: '🌯' },
    { name: 'Lomo saltado',               emoji: '🍳' },
    { name: 'Ají de gallina',             emoji: '🍲' },
    { name: 'Ceviche peruano',            emoji: '🍋' },
    // Italiana
    { name: 'Lasaña de carne',            emoji: '🍝' },
    { name: 'Risotto de champiñones',     emoji: '🍚' },
    { name: 'Pizza margherita',           emoji: '🍕' },
    { name: 'Pasta al pesto',             emoji: '🍝' },
    { name: 'Pasta carbonara',            emoji: '🍝' },
    { name: 'Ossobuco al vino',           emoji: '🍷' },
    { name: 'Gnocchi al pomodoro',        emoji: '🍝' },
    // Carnes
    { name: 'Asado de tira a la parrilla', emoji: '🥩' },
    { name: 'Costillas BBQ',              emoji: '🍖' },
    { name: 'Filete al merkén',           emoji: '🥩' },
    { name: 'Entraña con chimichurri',    emoji: '🥩' },
    { name: 'Pollo al horno con papas',   emoji: '🍗' },
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
    { name: 'Churrasco con palta',         emoji: '🥩' },
    { name: 'Barros Jarpa',                emoji: '🧀' },
    { name: 'Lomito clásico',              emoji: '🥪' },
    { name: 'Chacarero',                   emoji: '🥖' },
    { name: 'Choripán con pebre',          emoji: '🌭' },
    { name: 'Completo dinámico',           emoji: '🌭' },
    // Sushi
    { name: 'Roll california',             emoji: '🍣' },
    { name: 'Roll de salmón con palta',    emoji: '🍣' },
    { name: 'Temaki de salmón con palta',  emoji: '🍣' },
    { name: 'Sashimi de salmón',           emoji: '🐠' },
    { name: 'Roll de camarón tempura',     emoji: '🍣' },
    // Comida rápida
    { name: 'Hamburguesa con queso',       emoji: '🍔' },
    { name: 'Pizza de mechada',            emoji: '🍕' },
    { name: 'Pizza napolitana',            emoji: '🍕' },
    { name: 'Pollo frito con papas',       emoji: '🍗' },
    { name: 'Hot dog al estilo chileno',   emoji: '🌭' },
    // Coreana
    { name: 'Samgyeopsal (cerdo a la plancha)', emoji: '🥓' },
    { name: 'Korean BBQ mixto',            emoji: '🔥' },
    { name: 'Pollo coreano picante',       emoji: '🍗' },
    { name: 'Kimchi jjigae',               emoji: '🍲' },
    // China
    { name: 'Chop suey de res',            emoji: '🥢' },
    { name: 'Arroz frito especial',        emoji: '🍚' },
    { name: 'Mapo tofu',                   emoji: '🌶️' },
    // India
    { name: 'Pollo tikka masala',          emoji: '🍛' },
    { name: 'Curry de garbanzos',          emoji: '🍛' },
    { name: 'Naan con hummus',             emoji: '🫓' },
    // Japonesa
    { name: 'Ramen shoyu',                 emoji: '🍜' },
    { name: 'Gyoza frita',                 emoji: '🥟' },
    { name: 'Onigiri variado',             emoji: '🍙' },
    { name: 'Yakisoba',                    emoji: '🍜' },
    { name: 'Tonkatsu',                    emoji: '🍱' },
    // China
    { name: 'Pato Pekín',                  emoji: '🦆' },
    { name: 'Fideos chinos salteados',     emoji: '🥢' },
    { name: 'Mapo tofu picante',           emoji: '🌶️' },
    { name: 'Sopa de fideos de res',       emoji: '🍜' },
    // Italiana
    { name: 'Pizza quattro formaggi',      emoji: '🍕' },
    { name: 'Pasta alla norma',            emoji: '🍝' },
    { name: 'Risotto al limón',            emoji: '🍚' },
    { name: 'Pasta arrabiata',             emoji: '🍝' },
    { name: 'Lasaña vegetariana',          emoji: '🍝' },
    // Carnes
    { name: 'Asado de tira a la parrilla', emoji: '🥩' },
    { name: 'Costillas BBQ',              emoji: '🍖' },
    { name: 'Filete al merkén',           emoji: '🥩' },
    { name: 'Entraña con chimichurri',    emoji: '🥩' },
    { name: 'T-bone a la parrilla',       emoji: '🥩' },
    // Mexicana
    { name: 'Tacos al pastor',             emoji: '🌮' },
    { name: 'Quesadillas de pollo',        emoji: '🌮' },
    // Thai
    { name: 'Pad thai de camarones',       emoji: '🍜' },
    { name: 'Curry verde tailandés',       emoji: '🍛' },
    { name: 'Pad see ew',                  emoji: '🍜' },
    // Mediterránea / Árabe
    { name: 'Shawarma de pollo',           emoji: '🌯' },
    { name: 'Falafel con pita',            emoji: '🫓' },
    { name: 'Kebab de cordero',            emoji: '🍢' },
    { name: 'Moussaka',                    emoji: '🥘' },
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
        randomCard.classList.remove('revealed');
        randomHint.textContent = 'Pulsa el botón y te lo decimos nosotros';
        randomEmoji.textContent = '🍽️';
        randomName.textContent = '¿Qué vamos a comer hoy?';
    });
});

updateMealButtons();

randomBtn.addEventListener('click', () => {
    randomBtn.disabled = true;
    document.getElementById('comer-share-wrapper').classList.add('hidden');
    const { pool, hint } = MEAL_POOLS[selectedMeal];
    const finalItem = getNextItem(selectedMeal, pool);
    slotMachine(pool, randomEmoji, randomName, randomCard, (item) => {
        randomHint.textContent = hint;
        randomBtn.disabled = false;
        showShareBtn('comer', item.name);
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

// ── WhatsApp share ─────────────────────────────────────
function showShareBtn(context, resultText) {
    const wrapper = document.getElementById(`${context}-share-wrapper`);
    if (!wrapper) return;
    const btn = document.getElementById(`${context}-share-btn`);
    const siteUrl = 'https://queque.cl';
    const messages = {
        comer:  `¡¿Queque? me dijo que coma *${resultText}* hoy 🍽️\n¿Tú qué vas a comer? → ${siteUrl}`,
        hacer:  `¡¿Queque? me recomienda *${resultText}* hoy 🎯\n¿Tú qué vas a hacer? → ${siteUrl}`,
        ver:    `¡¿Queque? me recomienda ver *${resultText}* 🎬\n¿Tú qué ves esta noche? → ${siteUrl}`,
    };
    const text = messages[context] || `¡¿Queque? me recomienda: *${resultText}* → ${siteUrl}`;
    btn.onclick = () => window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
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
        document.getElementById('ver-name').textContent = '¿Qué ponemos esta noche?';
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
