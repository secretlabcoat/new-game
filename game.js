const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const $ = (id) => document.getElementById(id);
const scoreEl = $('score');
const cashEl = $('cash');
const timerEl = $('timer');
const livesEl = $('lives');
const crewEl = $('hostages');
const overlay = $('overlay');
const keys = Object.create(null);
const W = canvas.width;
const H = canvas.height;

const walls = [
  { x: 0, y: 0, w: W, h: 14 }, { x: 0, y: 0, w: 14, h: H },
  { x: 0, y: H - 14, w: W, h: 14 }, { x: W - 14, y: 0, w: 14, h: H },
  { x: 104, y: 90, w: 110, h: 16 }, { x: 270, y: 90, w: 150, h: 16 },
  { x: 100, y: 206, w: 160, h: 16 }, { x: 400, y: 170, w: 150, h: 16 },
  { x: 190, y: 290, w: 240, h: 16 }, { x: 490, y: 230, w: 16, h: 70 },
  { x: 520, y: 80, w: 16, h: 120 },
];
const exit = { x: 560, y: 26, w: 38, h: 44 };
const player = { x: 26, y: 28, w: 14, h: 14, speed: 110, invulnerable: 0 };
const bags = [[54,80],[190,50],[310,150],[540,140],[120,260],[430,250],[560,280],[250,320]]
  .map(([x,y]) => ({ x, y, size: 12, collected: false }));
const crew = [[210,245],[445,110],[535,250]].map(([x,y]) => ({ x,y,w:12,h:12,rescued:false }));
const cops = [
  { x:130,y:140,w:14,h:14,min:88,max:200,dir:1,aggro:false },
  { x:355,y:230,w:14,h:14,min:310,max:520,dir:1,aggro:false },
  { x:480,y:70,w:14,h:14,min:430,max:560,dir:1,aggro:false },
];
const state = { running:false, score:0, cash:0, timer:90, lives:3, rescued:0 };

function intersects(a,b) {
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}
function clamp(v,min,max) { return Math.max(min, Math.min(max,v)); }
function move(entity, dx, dy) {
  // Separate axis checks let the player slide along walls instead of getting stuck.
  for (const [axis, delta] of [['x',dx],['y',dy]]) {
    if (!delta) continue;
    const next = { ...entity, [axis]: entity[axis] + delta };
    if (!walls.some((wall) => intersects(next, wall))) {
      const limit = axis === 'x' ? W - entity.w - 14 : H - entity.h - 14;
      entity[axis] = clamp(next[axis], 14, limit);
    }
  }
}
function updateHud() {
  scoreEl.textContent = String(state.score);
  cashEl.textContent = `${state.cash}/4`;
  timerEl.textContent = String(Math.max(0, Math.ceil(state.timer)));
  livesEl.textContent = String(state.lives);
  crewEl.textContent = String(state.rescued);
}
function setOverlay(title, text, buttonText, action) {
  overlay.innerHTML = `<section class="panel"><div class="panel-tag">8-BIT ARCADE CAPER</div><h1>${title}</h1><p>${text}</p><button id="actionBtn">${buttonText}</button></section>`;
  overlay.classList.add('visible');
  $('actionBtn').addEventListener('click', action);
}
function resetGame() {
  state.running = true; state.score = 0; state.cash = 0; state.timer = 90; state.lives = 3; state.rescued = 0;
  player.x = 26; player.y = 28; player.invulnerable = 1.2;
  bags.forEach((bag) => { bag.collected = false; });
  crew.forEach((person) => { person.rescued = false; });
  cops.forEach((cop) => { cop.aggro = false; });
  Object.keys(keys).forEach((key) => { keys[key] = false; });
  updateHud();
}
function finish(won) {
  state.running = false;
  if (won) {
    state.score += 200;
    setOverlay('You made it!', `Clean getaway! Final score: ${state.score}.`, 'Play Again', () => { resetGame(); overlay.classList.remove('visible'); });
  } else {
    setOverlay('Game Over', 'The clock ran out or you lost all your lives. Try another route!', 'Try Again', () => { resetGame(); overlay.classList.remove('visible'); });
  }
  updateHud();
}
function update(dt) {
  if (!state.running) return;
  state.timer -= dt;
  if (player.invulnerable > 0) player.invulnerable -= dt;
  if (state.timer <= 0) { state.timer = 0; finish(false); return; }

  let dx = Number(!!(keys.ArrowRight || keys.d)) - Number(!!(keys.ArrowLeft || keys.a));
  let dy = Number(!!(keys.ArrowDown || keys.s)) - Number(!!(keys.ArrowUp || keys.w));
  if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
  move(player, dx * player.speed * dt, dy * player.speed * dt);

  for (const bag of bags) {
    if (!bag.collected && intersects(player, {x:bag.x,y:bag.y,w:bag.size,h:bag.size})) {
      bag.collected = true; state.cash++; state.score += 25;
    }
  }
  for (const person of crew) {
    if (!person.rescued && intersects(player, person)) { person.rescued = true; state.rescued++; state.score += 50; }
    if (person.rescued) {
      // Small, decorative follow movement; rescue stays counted once.
      const tx = player.x - 16;
      const ty = player.y + 16;
      person.x += (tx - person.x) * Math.min(1, dt * 2.5);
      person.y += (ty - person.y) * Math.min(1, dt * 2.5);
    }
  }

  for (const cop of cops) {
    const distance = Math.hypot(player.x - cop.x, player.y - cop.y);
    if (distance < 105) cop.aggro = true;
    if (cop.aggro) {
      const angle = Math.atan2(player.y - cop.y, player.x - cop.x);
      move(cop, Math.cos(angle) * 55 * dt, Math.sin(angle) * 55 * dt);
    } else {
      cop.x += cop.dir * 45 * dt;
      if (cop.x < cop.min || cop.x > cop.max) { cop.dir *= -1; cop.x = clamp(cop.x,cop.min,cop.max); }
    }
    if (player.invulnerable <= 0 && intersects(player,cop)) {
      state.lives--;
      player.x = 26; player.y = 28; player.invulnerable = 1.5;
      if (state.lives <= 0) { finish(false); return; }
    }
  }
  if (state.cash >= 4 && state.rescued >= 1 && intersects(player,exit)) { finish(true); return; }
  updateHud();
}
function drawBackground() {
  ctx.fillStyle = '#62b1ff'; ctx.fillRect(0,0,W,150);
  ctx.fillStyle = '#a7dbff';
  for (let x=0; x<W; x+=64) { ctx.fillRect(x+12,18,18,10); ctx.fillRect(x+28,12,12,14); ctx.fillRect(x+44,18,16,10); }
  ctx.fillStyle = '#1a2a40'; ctx.fillRect(0,150,W,24);
  ctx.fillStyle = '#d8b36a'; ctx.fillRect(0,174,W,26);
  ctx.fillStyle = '#7a5f3a';
  ctx.fillRect(35,200,86,120); ctx.fillRect(150,180,110,140); ctx.fillRect(290,200,120,120); ctx.fillRect(440,180,90,140);
  ctx.fillStyle = '#529e61'; ctx.fillRect(0,332,W,H-332);
  ctx.fillStyle = '#3b3b3b'; ctx.fillRect(0,300,W,6);
  ctx.fillStyle = '#dfeffc'; walls.forEach((wall) => ctx.fillRect(wall.x,wall.y,wall.w,wall.h));
}
function render() {
  ctx.clearRect(0,0,W,H); drawBackground();
  ctx.fillStyle = '#eaf5ff'; ctx.fillRect(exit.x,exit.y,exit.w,exit.h);
  ctx.fillStyle = '#ffb800'; ctx.fillRect(exit.x+8,exit.y+8,20,22);
  for (const bag of bags) if (!bag.collected) {
    ctx.fillStyle='#f6d454'; ctx.fillRect(bag.x,bag.y,bag.size,bag.size);
    ctx.fillStyle='#9c7720'; ctx.fillRect(bag.x+3,bag.y+2,2,8); ctx.fillRect(bag.x+7,bag.y+2,2,8);
  }
  for (const person of crew) {
    ctx.fillStyle=person.rescued?'#7ee0a5':'#d6b29b'; ctx.fillRect(person.x,person.y,person.w,person.h);
    ctx.fillStyle='#1d1d1d'; ctx.fillRect(person.x+3,person.y+3,2,2); ctx.fillRect(person.x+7,person.y+3,2,2);
  }
  for (const cop of cops) {
    ctx.fillStyle=cop.aggro?'#ff615f':'#7ab4ff'; ctx.fillRect(cop.x,cop.y,cop.w,cop.h);
    ctx.fillStyle='#111827'; ctx.fillRect(cop.x+3,cop.y+3,2,2); ctx.fillRect(cop.x+9,cop.y+3,2,2);
  }
  if (player.invulnerable <= 0 || Math.floor(performance.now()/90)%2===0) {
    ctx.fillStyle='#f3f7ff'; ctx.fillRect(player.x,player.y,player.w,player.h);
    ctx.fillStyle='#1c2635'; ctx.fillRect(player.x+3,player.y+3,2,2); ctx.fillRect(player.x+9,player.y+3,2,2);
    ctx.fillStyle='#efb94f'; ctx.fillRect(player.x+4,player.y+8,6,3);
    ctx.fillStyle='#ff6575'; ctx.fillRect(player.x+4,player.y+12,6,2);
  }
  ctx.fillStyle='rgba(0,0,0,.45)'; ctx.fillRect(12,12,190,20);
  ctx.fillStyle='#fff'; ctx.font='bold 12px monospace'; ctx.fillText(`CASH ${state.cash}/4   CREW ${state.rescued}/3`,18,26);
}
let last = performance.now();
function loop(now) {
  const dt = Math.min((now-last)/1000,0.04); last=now;
  update(dt); render(); requestAnimationFrame(loop);
}
function normalizeKey(key) { return key.length === 1 ? key.toLowerCase() : key; }
window.addEventListener('keydown',(event)=>{
  const key=normalizeKey(event.key);
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(event.key)) event.preventDefault();
  keys[key]=true;
});
window.addEventListener('keyup',(event)=>{ keys[normalizeKey(event.key)]=false; });
window.addEventListener('blur',()=>Object.keys(keys).forEach((key)=>{ keys[key]=false; }));

document.querySelectorAll('.touch-key').forEach((button)=>{
  const key=button.dataset.key;
  const release=()=>{ keys[key]=false; button.classList.remove('pressed'); };
  button.addEventListener('pointerdown',(event)=>{
    event.preventDefault(); keys[key]=true; button.classList.add('pressed');
    if (button.setPointerCapture) button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointerup',(event)=>{ event.preventDefault(); release(); });
  button.addEventListener('pointercancel',release);
  button.addEventListener('lostpointercapture',release);
});
$('startBtn').addEventListener('click',()=>{ resetGame(); overlay.classList.remove('visible'); });
updateHud(); render(); requestAnimationFrame(loop);
