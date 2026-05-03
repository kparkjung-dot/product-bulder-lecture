const generatorBtn = document.getElementById('generator-btn');
const themeBtn = document.getElementById('theme-btn');
const mainBalls = document.getElementById('main-balls');
const rekinoBalls = document.getElementById('rekino-balls');
const requetekinoBalls = document.getElementById('requetekino-balls');
const nextDraw = document.getElementById('next-draw');

// Theme
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
    themeBtn.textContent = '☀️';
}

themeBtn.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    themeBtn.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// Next draw: Wed(3), Fri(5), Sun(0) at 18:00 Chile time
function getNextDrawDate() {
    const drawDays = [0, 3, 5];
    const drawDayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }));
    const todayDay = now.getDay();
    const todayHour = now.getHours();

    let daysAhead = null;
    for (let i = 0; i < 7; i++) {
        const checkDay = (todayDay + i) % 7;
        if (drawDays.includes(checkDay)) {
            if (i === 0 && todayHour >= 18) continue;
            daysAhead = i;
            break;
        }
    }
    if (daysAhead === null) daysAhead = 7;

    const drawDate = new Date(now);
    drawDate.setDate(drawDate.getDate() + daysAhead);
    const dayName = drawDayNames[drawDate.getDay()];

    if (daysAhead === 0) return `Hoy, ${dayName} 18:00`;
    if (daysAhead === 1) return `Mañana, ${dayName} 18:00`;
    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} 18:00`;
}

nextDraw.textContent = getNextDrawDate();

// Generate 14 unique numbers from 1–25
function generateKino() {
    const pool = Array.from({ length: 25 }, (_, i) => i + 1);
    const picked = [];
    while (picked.length < 14) {
        const idx = Math.floor(Math.random() * pool.length);
        picked.push(pool.splice(idx, 1)[0]);
    }
    return picked.sort((a, b) => a - b);
}

function ballRange(n) {
    if (n <= 5) return '1';
    if (n <= 10) return '2';
    if (n <= 15) return '3';
    if (n <= 20) return '4';
    return '5';
}

function renderBalls(container, numbers, small = false) {
    container.innerHTML = '';
    numbers.forEach((n, i) => {
        const ball = document.createElement('div');
        ball.classList.add('ball');
        if (small) ball.classList.add('ball-sm');
        ball.dataset.range = ballRange(n);
        ball.textContent = n;
        ball.style.animationDelay = `${i * 60}ms`;
        container.appendChild(ball);
    });
}

generatorBtn.addEventListener('click', () => {
    const numbers = generateKino();
    renderBalls(mainBalls, numbers);
    renderBalls(rekinoBalls, numbers, true);
    renderBalls(requetekinoBalls, numbers, true);
});
