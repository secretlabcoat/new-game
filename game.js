const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const cashEl = document.getElementById('cash');
const timerEl = document.getElementById('timer');
const hostagesEl = document.getElementById('hostages');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const world = {
  width: canvas.width,
  height: canvas.height,
};

const keys = {};
const gravity = 0;

const walls = [
  { x: 0, y: 0, w: world.width, h: 18 },
  { x: 0, y: 0, w: 18, h: world.height },
  { x: 0, y: world.height - 18, w: world.width, h: 18 },
  { x: world.width - 18, y: 0, w: 18, h: world.height },
  { x: 120, y: 100, w: 150, h: 18 },
  { x: 350, y: 100, w: 18, h: 170 },
  { x: 540, y: 130, w: 220, h: 18 },
  { x: 118, y: 260, w: 220, h: 18 },
  { x: 500, y: 300, w: 180, h: 18 },
  { x: 250, y: 420, w: 280, h: 18 },
  { x: 720, y: 230, w: 18, h: 210 },
  { x: 680, y: 400, w: 120, h: 18 },
];

const exitDoor = { x: 860, y: 52, w: 56, h: 64 };

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectsIntersect(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function makeCashBag(x, y) {
  return { x, y, size: 14, collected: false };
}

function createPolice(x, y, patrolMin, patrolMax) {
  return {
    x,
    y,
    w: 18,
    h: 18,
    speed: 1.25,
    patrolMin,
    patrolMax,
    direction: 1,
    aggro: false,
  };
}

function createHostage(x, y) {
  return { x, y, w: 16, h: 16, following: false, isRescued: false };
}

const state = {
  running: false,
  score: 0,
  cash: 0,
  timer: 90,
  win: false,
  lose: false,
  message: 'Collect the cash and escape',
};

const player = {
  x: 45,
  y: 120,
  w: 18,
  h: 18,
  speed: 2.5,
  health: 100,
};

const cashBags = [
  makeCashBag(70, 360),
  makeCashBag(180, 80),
  makeCashBag(210, 180),
  makeCashBag(440, 180),
  makeCashBag(610, 200),
  makeCashBag(810, 330),
  makeCashBag(770, 110),
  makeCashBag(460, 450),
  makeCashBag(200, 470),
  makeCashBag(820, 470),
];

const hostages = [
  createHostage(280, 330),
  createHostage(440, 320),
  createHostage(620, 80),
];

const police = [
  createPolice(780, 100, 660, 900),
  createPolice(150, 460, 80, 260),
  createPolice(630, 444, 560, 790),
];

function resetGame() {
  state.running = true;
  state.score = 0;
  state.cash = 0;
  state.timer = 90;
  state.win = false;
  state.lose = false;
  state.message = 'Collect the cash and escape';

  player.x = 45;
  player.y = 120;
  player.health = 100;

  cashBags.forEach((bag) => {
    bag.collected = false;
  });

  hostages.forEach((hostage) => {
    hostage.following = false;
    hostage.isRescued = false;
  });

  police.forEach((unit) => {
    unit.aggro = false;
  });

  updateHud();
}

function updateHud() {
  scoreEl.textContent = String(state.score);
  cashEl.textContent = String(state.cash);
  timerEl.textContent = String(Math.max(0, Math.ceil(state.timer)));
  hostagesEl.textContent = String(hostages.filter((h) => h.following).length);
}

function moveEntity(entity, dx, dy) {
  const next = {
    x: entity.x + dx,
    y: entity.y + dy,
    w: entity.w,
    h: entity.h,
  };

  let collided = false;

  for (const wall of walls) {
    if (rectsIntersect(next, wall)) {
      collided = true;
      break;
    }
  }

  if (!collided) {
    entity.x = clamp(entity.x + dx, 18, world.width - entity.w - 18);
    entity.y = clamp(entity.y + dy, 18, world.height - entity.h - 18);
  }
}

function handleInput(dt) {
  let dx = 0;
  let dy = 0;

  if (keys['ArrowLeft'] || keys['a']) dx -= player.speed * dt * 60;
  if (keys['ArrowRight'] || keys['d']) dx += player.speed * dt * 60;
  if (keys['ArrowUp'] || keys['w']) dy -= player.speed * dt * 60;
  if (keys['ArrowDown'] || keys['s']) dy += player.speed * dt * 60;

  moveEntity(player, dx, dy);
}

function updateCashBags() {
  for (const bag of cashBags) {
    if (bag.collected) continue;

    const bagRect = { x: bag.x, y: bag.y, w: bag.size, h: bag.size };
    const playerRect = { x: player.x, y: player.y, w: player.w, h: player.h };

    if (rectsIntersect(playerRect, bagRect)) {
      bag.collected = true;
      state.cash += 1;
      state.score += 25;
      state.message = 'Cash secured';
    }
  }
}

function updateHostages() {
  for (const hostage of hostages) {
    if (hostage.following) {
      const followX = player.x - 18 + (Math.sin((performance.now() / 400) + hostage.x) * 18);
      const followY = player.y + (hostage.y < player.y ? 18 : 0);

      hostage.x += (followX - hostage.x) * 0.08;
      hostage.y += (followY - hostage.y) * 0.08;
      hostage.x = clamp(hostage.x, 18, world.width - 18);
      hostage.y = clamp(hostage.y, 18, world.height - 18);
    } else {
      const dist = Math.hypot(player.x - hostage.x, player.y - hostage.y);
      if (dist < 30) {
        hostage.following = true;
        state.score += 10;
        state.message = 'Hostage on board';
      }
    }
  }
}

function updatePolice(dt) {
  for (const unit of police) {
    const playerCenterX = player.x + player.w / 2;
    const playerCenterY = player.y + player.h / 2;
    const unitCenterX = unit.x + unit.w / 2;
    const unitCenterY = unit.y + unit.h / 2;
    const dist = Math.hypot(playerCenterX - unitCenterX, playerCenterY - unitCenterY);

    if (dist < 190) {
      unit.aggro = true;
    }

    if (unit.aggro) {
      const angle = Math.atan2(playerCenterY - unitCenterY, playerCenterX - unitCenterX);
      const speed = unit.speed * dt * 60;
      const nx = Math.cos(angle) * speed;
      const ny = Math.sin(angle) * speed;
      moveEntity(unit, nx, ny);
    } else {
      const patrolRange = unit.patrolMax - unit.patrolMin;
      unit.x += unit.direction * unit.speed * dt * 60;
      if (unit.x < unit.patrolMin || unit.x > unit.patrolMax) {
        unit.direction *= -1;
        unit.x = clamp(unit.x, unit.patrolMin, unit.patrolMax);
      }
      unit.y += Math.sin((performance.now() / 250) + unit.x * 0.03) * 0.2;
    }

    const hitBoxPlayer = { x: player.x, y: player.y, w: player.w, h: player.h };
    const hitBoxUnit = { x: unit.x, y: unit.y, w: unit.w, h: unit.h };
    if (rectsIntersect(hitBoxPlayer, hitBoxUnit)) {
      player.health = Math.max(0, player.health - 35 * dt * 60);
      state.message = 'You were spotted!';
    }
  }
}

function updateWinCondition() {
  const complete = state.cash >= 6 && hostages.filter((h) => h.following).length >= 1;
  const exitRect = { x: exitDoor.x, y: exitDoor.y, w: exitDoor.w, h: exitDoor.h };
  const playerRect = { x: player.x, y: player.y, w: player.w, h: player.h };

  if (complete && rectsIntersect(playerRect, exitRect)) {
    state.running = false;
    state.win = true;
    state.score += 200;
    state.message = 'Heist complete';
    overlay.classList.remove('visible');
    overlay.innerHTML = `
      <div class="panel">
        <h1>Win!</h1>
        <p>The getaway is clean. ${state.score} in the bag and the crowd is talking.</p>
        <button id="restartBtn">Play Again</button>
      </div>
    `;
    document.getElementById('restartBtn').addEventListener('click', () => {
      overlay.classList.add('visible');
      resetGame();
      overlay.innerHTML = `
        <div class="panel">
          <h1>Noon Panic</h1>
          <p>A tense bank-heist romp in a pixel-art neighborhood, inspired by late-night hostage drama and a desperate rush to escape.</p>
          <ul>
            <li>Move with WASD or arrow keys</li>
            <li>Collect cash bags</li>
            <li>Keep the hostages close</li>
            <li>Reach the getaway car before the timer hits zero</li>
          </ul>
          <button id="startBtn">Start Heist</button>
        </div>
      `;
      document.getElementById('startBtn').addEventListener('click', () => {
        overlay.classList.remove('visible');
        resetGame();
      });
    });
  }
}

function updateGame(dt) {
  if (!state.running) return;

  state.timer -= dt;
  if (state.timer <= 0) {
    state.running = false;
    state.lose = true;
    state.message = 'The police closed in';
    overlay.classList.remove('visible');
    overlay.innerHTML = `
      <div class="panel">
        <h1>Game Over</h1>
        <p>Too slow. The money is still on the floor and the sirens are closing in.</p>
        <button id="restartBtn">Try Again</button>
      </div>
    `;
    document.getElementById('restartBtn').addEventListener('click', () => {
      overlay.classList.add('visible');
      resetGame();
      overlay.innerHTML = `
        <div class="panel">
          <h1>Noon Panic</h1>
          <p>A tense bank-heist romp in a pixel-art neighborhood, inspired by late-night hostage drama and a desperate rush to escape.</p>
          <ul>
            <li>Move with WASD or arrow keys</li>
            <li>Collect cash bags</li>
            <li>Keep the hostages close</li>
            <li>Reach the getaway car before the timer hits zero</li>
          </ul>
          <button id="startBtn">Start Heist</button>
        </div>
      `;
      document.getElementById('startBtn').addEventListener('click', () => {
        overlay.classList.remove('visible');
        resetGame();
      });
    });
    return;
  }

  if (player.health <= 0) {
    state.running = false;
    state.lose = true;
    state.message = 'The getaway turned into a chase';
    overlay.classList.remove('visible');
    overlay.innerHTML = `
      <div class="panel">
        <h1>Game Over</h1>
        <p>You were stopped before the exit. The sirens won this round.</p>
        <button id="restartBtn">Try Again</button>
      </div>
    `;
    document.getElementById('restartBtn').addEventListener('click', () => {
      overlay.classList.add('visible');
      resetGame();
      overlay.innerHTML = `
        <div class="panel">
          <h1>Noon Panic</h1>
          <p>A tense bank-heist romp in a pixel-art neighborhood, inspired by late-night hostage drama and a desperate rush to escape.</p>
          <ul>
            <li>Move with WASD or arrow keys</li>
            <li>Collect cash bags</li>
            <li>Keep the hostages close</li>
            <li>Reach the getaway car before the timer hits zero</li>
          </ul>
          <button id="startBtn">Start Heist</button>
        </div>
      `;
      document.getElementById('startBtn').addEventListener('click', () => {
        overlay.classList.remove('visible');
        resetGame();
      });
    });
    return;
  }

  handleInput(dt);
  updateCashBags();
  updateHostages();
  updatePolice(dt);
  updateWinCondition();
  updateHud();
}

function drawBackground() {
  ctx.fillStyle = '#0b1420';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#122530';
  for (let x = 0; x < canvas.width; x += 24) {
    for (let y = 0; y < canvas.height; y += 24) {
      ctx.fillRect(x, y, 1, 1);
    }
  }

  ctx.fillStyle = '#d7b36f';
  ctx.fillRect(0, 0, canvas.width, 18);
  ctx.fillRect(0, 0, 18, canvas.height);
  ctx.fillRect(canvas.width - 18, 0, 18, canvas.height);
  ctx.fillRect(0, canvas.height - 18, canvas.width, 18);

  ctx.fillStyle = '#7a5f37';
  ctx.fillRect(40, 50, 170, 120);
  ctx.fillRect(80, 260, 240, 90);
  ctx.fillRect(530, 70, 220, 120);
  ctx.fillRect(630, 320, 150, 120);
  ctx.fillRect(250, 420, 300, 70);

  ctx.fillStyle = '#9a6e2d';
  ctx.fillRect(65, 220, 80, 18);
  ctx.fillRect(650, 220, 80, 18);

  ctx.fillStyle = '#d9f0ff';
  ctx.fillRect(exitDoor.x, exitDoor.y, exitDoor.w, exitDoor.h);
  ctx.fillStyle = '#f1c04d';
  ctx.fillRect(exitDoor.x + 7, exitDoor.y + 8, 42, 48);
}

function drawWalls() {
  ctx.fillStyle = '#dfeef9';
  for (const wall of walls) {
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  }
}

function drawCash() {
  for (const bag of cashBags) {
    if (bag.collected) continue;
    ctx.fillStyle = '#f0d55b';
    ctx.fillRect(bag.x, bag.y, bag.size, bag.size);
    ctx.fillStyle = '#9e7d1d';
    ctx.fillRect(bag.x + 5, bag.y + 3, 4, 8);
    ctx.fillRect(bag.x + 9, bag.y + 3, 4, 8);
  }
}

function drawHostages() {
  for (const hostage of hostages) {
    ctx.fillStyle = hostage.following ? '#79d6a7' : '#caa58f';
    ctx.fillRect(hostage.x, hostage.y, hostage.w, hostage.h);
    ctx.fillStyle = '#1b0c0c';
    ctx.fillRect(hostage.x + 4, hostage.y + 4, 4, 4);
    ctx.fillRect(hostage.x + 9, hostage.y + 4, 4, 4);
  }
}

function drawPolice() {
  for (const unit of police) {
    ctx.fillStyle = unit.aggro ? '#ff726d' : '#78a9ff';
    ctx.fillRect(unit.x, unit.y, unit.w, unit.h);
    ctx.fillStyle = '#0d1830';
    ctx.fillRect(unit.x + 5, unit.y + 5, 3, 3);
    ctx.fillRect(unit.x + 11, unit.y + 5, 3, 3);
  }
}

function drawPlayer() {
  ctx.fillStyle = '#e6f7ff';
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(player.x + 4, player.y + 4, 3, 3);
  ctx.fillRect(player.x + 11, player.y + 4, 3, 3);

  ctx.fillStyle = '#ff6a45';
  ctx.fillRect(player.x + 5, player.y + 12, 8, 3);

  ctx.fillStyle = '#ffc875';
  const healthWidth = 80;
  const healthX = 20;
  const healthY = 26;
  ctx.fillRect(healthX, healthY, healthWidth, 10);
  ctx.fillStyle = '#ff6a45';
  ctx.fillRect(healthX, healthY, (player.health / 100) * healthWidth, 10);
}

function drawHudPrompt() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(15, 500, 480, 24);
  ctx.fillStyle = '#edf7ff';
  ctx.font = '16px sans-serif';
  ctx.fillText(state.message, 25, 518);
}

function render() {
  drawBackground();
  drawWalls();
  drawCash();
  drawHostages();
  drawPolice();
  drawPlayer();
  drawHudPrompt();
}

let lastFrame = performance.now();
function loop(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.033);
  lastFrame = now;

  updateGame(dt);
  render();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  keys[event.key.toLowerCase()] = true;
  keys[event.key] = true;
});

window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
  keys[event.key] = false;
});

startBtn.addEventListener('click', () => {
  overlay.classList.remove('visible');
  resetGame();
});

resetGame();
overlay.classList.add('visible');
requestAnimationFrame(loop);

updateHud();
render();

