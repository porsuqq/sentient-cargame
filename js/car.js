const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.querySelector('.score');
const timerDisplay = document.querySelector('.timer');
const startButton = document.getElementById('startButton');
const soundToggle = document.getElementById('soundToggle');

let gameState = 'stopped';
let score = 0;
let time = 0;
let timerInterval;
let playerX = 500; // Ortada, 3 şerit: 266.67, 500, 733.33
let speed = 0;
let maxSpeed = 8; // Başlangıç hızı
let speedLevel = 0; // Hız kademesi
let obstacles = [];
let collectibles = [];
let difficulty = 1;
let lastObstacleTime = 0;
let lastCollectibleTime = 0;
let musicPlaying = true;
let lastTime = 0;
let frameCount = 0;
let lastFpsTime = 0;

const playerImg = new Image();
playerImg.src = 'assets/car.png';
const obstacleImgs = ['bar1.png', 'bar2.png', 'bar3.png', 'bar4.png'].map(src => {
    const img = new Image();
    img.src = `assets/${src}`;
    return img;
});
const collectibleImg = new Image();
collectibleImg.src = 'assets/cartop.png';
const crashImg = new Image();
crashImg.src = 'assets/carcross.png';

const backgroundMusic = new Audio('assets/car.mp3');
backgroundMusic.loop = true;
const crashSound = new Audio('assets/carcross.mp3');

function startGame() {
    if (gameState !== 'stopped') return;
    gameState = 'running';
    score = 0;
    time = 0;
    speed = 0;
    maxSpeed = 8;
    speedLevel = 0;
    obstacles = [];
    collectibles = [];
    difficulty = 1;
    playerX = 500;
    lastTime = performance.now();
    frameCount = 0;
    lastFpsTime = lastTime;
    scoreDisplay.textContent = `Score: ${score}`;
    startButton.textContent = 'Start';
    startButton.style.display = 'none';
    if (musicPlaying) backgroundMusic.play();
    timerInterval = setInterval(updateTimer, 10);
    requestAnimationFrame(gameLoop);
}

function updateTimer() {
    time += 10;
    let ms = Math.floor((time % 1000) / 10).toString().padStart(2, '0');
    let s = Math.floor((time / 1000) % 60).toString().padStart(2, '0');
    let m = Math.floor(time / 60000).toString().padStart(2, '0');
    timerDisplay.textContent = `${m}:${s}:${ms}`;
}

function endGame() {
    gameState = 'stopped';
    clearInterval(timerInterval);
    backgroundMusic.pause();
    if (musicPlaying) crashSound.play();
    ctx.drawImage(crashImg, canvas.width / 2 - 100, canvas.height / 2 - 100, 200, 200);
    startButton.textContent = 'Restart';
    startButton.style.display = 'block';
}

function toggleSound() {
    musicPlaying = !musicPlaying;
    soundToggle.src = musicPlaying ? 'assets/sound-on.png' : 'assets/sound-off.png';
    if (musicPlaying && gameState === 'running') backgroundMusic.play();
    else backgroundMusic.pause();
}

function gameLoop(timestamp) {
    if (gameState !== 'running') return;

    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    frameCount++;
    if (timestamp - lastFpsTime >= 1000) {
        const fps = frameCount / ((timestamp - lastFpsTime) / 1000);
        console.log(`FPS: ${fps.toFixed(2)}, DeltaTime: ${(deltaTime * 1000).toFixed(2)}ms`);
        frameCount = 0;
        lastFpsTime = timestamp;
    }

    if (speed < maxSpeed) speed += 0.05 * deltaTime * 60;

    // Skora göre hız kademesi
    speedLevel = Math.floor(score / 50);
    maxSpeed = 8 + speedLevel * 2; // Her 50 puanda maxSpeed 2 artar
    difficulty = 1 + speedLevel * 0.5; // Zorluk da artar

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawRoad();
    drawPlayer();
    updateObstacles(timestamp, deltaTime);
    updateCollectibles(timestamp, deltaTime);
    checkCollisions();

    requestAnimationFrame(gameLoop);
}

function drawRoad() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(150, 0, 700, canvas.height);

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(150, 0);
    ctx.lineTo(150, canvas.height);
    ctx.moveTo(850, 0);
    ctx.lineTo(850, canvas.height);
    ctx.stroke();

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let y = 0; y < canvas.height; y += 40) {
        ctx.moveTo(383.33, y);
        ctx.lineTo(383.33, y + 20);
        ctx.moveTo(616.67, y);
        ctx.lineTo(616.67, y + 20);
    }
    ctx.stroke();
}

function drawPlayer() {
    ctx.drawImage(playerImg, playerX - 50, canvas.height - 100, 100, 100);
}

function updateObstacles(timestamp, deltaTime) {
    if (timestamp - lastObstacleTime > 1000 / difficulty) {
        const lanes = [266.67, 500, 733.33];
        const lane = lanes[Math.floor(Math.random() * 3)];
        obstacles.push({ x: lane, y: -50, img: obstacleImgs[Math.floor(Math.random() * 4)] });
        lastObstacleTime = timestamp;
    }
    obstacles = obstacles.filter(o => o.y < canvas.height + 50);
    obstacles.forEach(o => {
        o.y += speed * deltaTime * 60;
        ctx.drawImage(o.img, o.x - 50, o.y - 50, 100, 100);
    });
}

function updateCollectibles(timestamp, deltaTime) {
    if (timestamp - lastCollectibleTime > 2000 / difficulty) {
        const lanes = [266.67, 500, 733.33];
        const lane = lanes[Math.floor(Math.random() * 3)];
        collectibles.push({ x: lane, y: -50 });
        lastCollectibleTime = timestamp;
    }
    collectibles = collectibles.filter(c => c.y < canvas.height + 50);
    collectibles.forEach(c => {
        c.y += speed * deltaTime * 60;
        ctx.drawImage(collectibleImg, c.x - 25, c.y - 25, 50, 50);
    });
}

function checkCollisions() {
    const playerRect = { x: playerX - 40, y: canvas.height - 100, width: 80, height: 80 };
    for (let o of obstacles) {
        const obsRect = { x: o.x - 40, y: o.y - 40, width: 80, height: 80 };
        if (playerRect.x < obsRect.x + obsRect.width &&
            playerRect.x + playerRect.width > obsRect.x &&
            playerRect.y < obsRect.y + obsRect.height &&
            playerRect.y + playerRect.height > obsRect.y) {
            endGame();
            return;
        }
    }
    for (let i = collectibles.length - 1; i >= 0; i--) {
        const c = collectibles[i];
        const colRect = { x: c.x - 20, y: c.y - 20, width: 40, height: 40 };
        if (playerRect.x < colRect.x + colRect.width &&
            playerRect.x + playerRect.width > colRect.x &&
            playerRect.y < colRect.y + colRect.height &&
            playerRect.y + playerRect.height > colRect.y) {
            score += 10;
            scoreDisplay.textContent = `Score: ${score}`;
            collectibles.splice(i, 1);
        }
    }
}

document.addEventListener('keydown', e => {
    if (gameState !== 'running') return;
    if (e.code === 'ArrowLeft' && playerX > 266.67) {
        playerX -= 233.33;
    } else if (e.code === 'ArrowRight' && playerX < 733.33) {
        playerX += 233.33;
    } else if (e.code === 'Space') {
        speed = maxSpeed * 0.5;
    }
});

startButton.addEventListener('click', startGame);
soundToggle.addEventListener('click', toggleSound);