const generatorBtn = document.getElementById('generator-btn');
const lottoNumbersContainer = document.querySelector('.lotto-numbers');
const themeBtn = document.getElementById('theme-btn');

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    themeBtn.textContent = '☀️ Light Mode';
}

themeBtn.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    themeBtn.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

generatorBtn.addEventListener('click', () => {
    lottoNumbersContainer.innerHTML = '';
    const numbers = new Set();
    while (numbers.size < 6) {
        numbers.add(Math.floor(Math.random() * 45) + 1);
    }

    for (const number of Array.from(numbers).sort((a, b) => a - b)) {
        const lottoNumber = document.createElement('div');
        lottoNumber.classList.add('lotto-number');
        lottoNumber.textContent = number;

        let backgroundColor;
        if (number <= 10) {
            backgroundColor = '#f4a261';
        } else if (number <= 20) {
            backgroundColor = '#e76f51';
        } else if (number <= 30) {
            backgroundColor = '#d62828';
        } else if (number <= 40) {
            backgroundColor = '#2a9d8f';
        } else {
            backgroundColor = '#264653';
        }
        lottoNumber.style.backgroundColor = backgroundColor;
        lottoNumber.style.color = 'white';

        lottoNumbersContainer.appendChild(lottoNumber);
    }
});
