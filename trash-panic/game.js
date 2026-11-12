(() => {
  "use strict";

  const { Engine, Bodies, Body, Composite, Events, Vector } = Matter;

  const W = 480;
  const H = 720;
  const BIN = { left: 100, right: 380, bottom: 690, rim: 540, wall: 16 };
  const OVERFLOW_Y = 505;
  const OVERFLOW_LIMIT_MS = 3000;
  const MAX_HAMMER = 3;
  const HAMMER_RECHARGE_MS = 5000;

  const TRASH = [
    { id: "banana", emoji: "🍌", w: 46, h: 26, organic: 5, pts: 100, minLevel: 1, weight: 10, smash: [2, 0.55] },
    { id: "apple", emoji: "🍎", w: 34, h: 34, organic: 4.5, pts: 120, minLevel: 1, weight: 10, smash: [2, 0.55] },
    { id: "fish", emoji: "🐟", w: 54, h: 24, organic: 6, pts: 150, minLevel: 1, weight: 8, smash: [2, 0.55] },
    { id: "can", emoji: "🥫", w: 30, h: 44, organic: 0, pts: 200, minLevel: 1, weight: 9, smash: [2, 0.55] },
    { id: "bottle", emoji: "🍾", w: 30, h: 58, organic: 0, pts: 250, minLevel: 1, weight: 7, smash: [2, 0.5] },
    { id: "boot", emoji: "👢", w: 46, h: 46, organic: 0, pts: 300, minLevel: 2, weight: 7, smash: [3, 0.5] },
    { id: "tire", emoji: "⭕", w: 58, h: 58, circle: true, organic: 0, pts: 350, minLevel: 2, weight: 5, smash: [2, 0.6] },
    { id: "tv", emoji: "📺", w: 78, h: 62, organic: 0, pts: 500, minLevel: 3, weight: 5, smash: [3, 0.5] },
    { id: "safe", emoji: "🧰", w: 66, h: 66, organic: 0, pts: 900, minLevel: 4, weight: 3, smash: null },
    { id: "bomb", emoji: "💣", w: 38, h: 38, circle: true, bomb: true, organic: 0, pts: 400, minLevel: 1, weight: 4, smash: null }
  ];

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const el = {
    score: document.getElementById("score"),
    best: document.getElementById("best"),
    level: document.getElementById("level"),
    next: document.getElementById("next"),
    hammer: document.getElementById("hammer"),
    overlay: document.getElementById("overlay"),
    overlayText: document.getElementById("overlayText"),
    overlayHelp: document.getElementById("overlayHelp"),
    startBtn: document.getElementById("startBtn")
  };

  let engine = null;
  let state = null;
  let bestScore = Number(localStorage.getItem("trashpanic.best") || 0);
  el.best.textContent = bestScore;

  let audioCtx = null;
  function audio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, endFreq, dur, type, vol) {
    const ac = audio();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), ac.currentTime + dur);
    gain.gain.setValueAtTime(vol, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur + 0.02);
  }

  const sfx = {
    thud: () => tone(150, 45, 0.09, "triangle", 0.25),
    crack: () => tone(320, 70, 0.13, "square", 0.18),
    clang: () => { tone(900, 700, 0.07, "square", 0.15); tone(520, 400, 0.12, "square", 0.1); },
    boom: () => { tone(120, 25, 0.5, "sawtooth", 0.4); tone(70, 20, 0.6, "triangle", 0.35); },
    chime: () => { tone(660, 660, 0.09, "sine", 0.2); setTimeout(() => tone(880, 880, 0.14, "sine", 0.2), 90); },
    fuse: () => tone(1300, 1300, 0.04, "sine", 0.12),
    levelup: () => { tone(520, 520, 0.09, "sine", 0.2); setTimeout(() => tone(660, 660, 0.09, "sine", 0.2), 90); setTimeout(() => tone(990, 990, 0.18, "sine", 0.22), 180); },
    over: () => { tone(300, 60, 0.7, "sawtooth", 0.3); }
  };

  const keys = { left: false, right: false, down: false };

  function freshState() {
    return {
      playing: false,
      over: false,
      paused: false,
      score: 0,
      spawned: 0,
      level: 1,
      active: null,
      nextDef: null,
      nextSpawnAt: 0,
      hammer: MAX_HAMMER,
      hammerTimer: 0,
      dangerMs: 0,
      combo: 0,
      comboUntil: 0,
      clock: 0,
      shake: 0,
      particles: [],
      floats: [],
      lastTs: 0,
      acc: 0
    };
  }

  function buildWorld() {
    engine = Engine.create();
    engine.gravity.y = 1;
    const opts = { isStatic: true, friction: 0.6, restitution: 0.02, label: "bin" };
    const midY = (BIN.rim + BIN.bottom) / 2;
    Composite.add(engine.world, [
      Bodies.rectangle(BIN.left - BIN.wall / 2, midY, BIN.wall, BIN.bottom - BIN.rim, opts),
      Bodies.rectangle(BIN.right + BIN.wall / 2, midY, BIN.wall, BIN.bottom - BIN.rim, opts),
      Bodies.rectangle((BIN.left + BIN.right) / 2, BIN.bottom + BIN.wall / 2, BIN.right - BIN.left + BIN.wall * 2, BIN.wall, opts),
      Bodies.rectangle(-20, H / 2, 40, H * 2, opts),
      Bodies.rectangle(W + 20, H / 2, 40, H * 2, opts)
    ]);

    Events.on(engine, "collisionStart", (evt) => {
      for (const pair of evt.pairs) {
        const a = pair.bodyA;
        const b = pair.bodyB;
        const rel = Vector.magnitude(Vector.sub(a.velocity, b.velocity));
        if (rel > 3) sfx.thud();
        for (const body of [a, b]) {
          const t = body.plugin && body.plugin.trash;
          if (t && !t.landed) {
            t.landed = true;
            if (t.bomb && !t.fuse) {
              t.fuse = 1400;
              t.fuseBeep = 0;
            }
          }
        }
      }
    });
  }

  function trashBodies() {
    return Composite.allBodies(engine.world).filter((b) => b.plugin && b.plugin.trash);
  }

  function pickDef() {
    const pool = TRASH.filter((d) => d.minLevel <= state.level);
    let total = 0;
    for (const d of pool) total += d.weight;
    let roll = Math.random() * total;
    for (const d of pool) {
      roll -= d.weight;
      if (roll <= 0) return d;
    }
    return pool[0];
  }

  function spawnItem(def, x, y) {
    const opts = {
      friction: 0.5,
      frictionStatic: 0.6,
      restitution: 0.05,
      density: 0.0016 + (def.w * def.h) / 900000
    };
    const body = def.circle
      ? Bodies.circle(x, y, def.w / 2, opts)
      : Bodies.rectangle(x, y, def.w, def.h, { ...opts, chamfer: { radius: 4 } });
    body.plugin.trash = {
      def,
      gen: 0,
      landed: false,
      still: 0,
      settled: false,
      decayLeft: def.organic,
      lastFrac: 1,
      crumbleLeft: 0,
      fuse: 0,
      fuseBeep: 0
    };
    Composite.add(engine.world, body);
    return body;
  }

  function spawnNext() {
    const def = state.nextDef || pickDef();
    state.nextDef = pickDef();
    el.next.textContent = state.nextDef.emoji;
    state.active = spawnItem(def, 240, 70);
    state.spawned += 1;
    const newLevel = 1 + Math.floor(state.spawned / 10);
    if (newLevel > state.level) {
      state.level = newLevel;
      el.level.textContent = state.level;
      banner("LEVEL " + state.level, "#6fe08a");
      sfx.levelup();
    }
  }

  function addScore(pts, x, y, color) {
    let mult = 1;
    if (state.clock < state.comboUntil) {
      state.combo += 1;
      mult = Math.min(state.combo, 5);
    } else {
      state.combo = 1;
    }
    state.comboUntil = state.clock + 2500;
    const gained = Math.round(pts * mult);
    state.score += gained;
    el.score.textContent = state.score;
    if (state.score > bestScore) {
      bestScore = state.score;
      localStorage.setItem("trashpanic.best", String(bestScore));
      el.best.textContent = bestScore;
    }
    if (x !== undefined) {
      state.floats.push({
        x,
        y,
        text: "+" + gained + (mult > 1 ? " x" + mult : ""),
        life: 1100,
        color: color || "#ffd166"
      });
    }
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (0.3 + Math.random() * 0.7) * (speed || 3);
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 1,
        life: 500 + Math.random() * 400,
        color,
        r: 2 + Math.random() * 3
      });
    }
  }

  function banner(text, color) {
    state.floats.push({ x: W / 2, y: 240, text, life: 1600, color: color || "#ffffff", big: true });
  }

  function removeBody(body) {
    if (state.active === body) state.active = null;
    Composite.remove(engine.world, body);
  }

  function disposeBody(body, factor, color) {
    const t = body.plugin.trash;
    const pts = Math.round(t.def.pts * (factor === undefined ? 1 : factor));
    addScore(pts, body.position.x, body.position.y, color);
    burst(body.position.x, body.position.y, color || "#6fe08a", 10, 3);
    removeBody(body);
  }

  function makeDebris(src, def, n, scale) {
    const gen = src.plugin.trash.gen + 1;
    const pos = { ...src.position };
    removeBody(src);
    for (let i = 0; i < n; i++) {
      const w = def.w * scale * (0.75 + Math.random() * 0.5);
      const h = def.h * scale * (0.75 + Math.random() * 0.5);
      const body = Bodies.rectangle(
        pos.x + (i - (n - 1) / 2) * def.w * scale * 0.7,
        pos.y - 6,
        Math.max(10, w),
        Math.max(10, h),
        { friction: 0.5, restitution: 0.15, density: 0.0014, chamfer: { radius: 3 } }
      );
      body.plugin.trash = {
        def,
        gen,
        debris: true,
        landed: false,
        still: 0,
        settled: false,
        decayLeft: 0,
        lastFrac: 1,
        crumbleLeft: Math.min(w, h) < 20 ? 1200 : 2400,
        fuse: 0,
        fuseBeep: 0
      };
      Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 6,
        y: -2 - Math.random() * 3
      });
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.3);
      Composite.add(engine.world, body);
    }
  }

  function trySmash(body) {
    const t = body.plugin.trash;
    if (t.bomb) {
      explode(body);
      return true;
    }
    if (!t.def.smash) {
      sfx.clang();
      state.floats.push({ x: body.position.x, y: body.position.y - 20, text: "CLANG!", life: 700, color: "#b8c4bd" });
      return false;
    }
    sfx.crack();
    burst(body.position.x, body.position.y, "#c9d1cc", 8, 4);
    makeDebris(body, t.def, t.def.smash[0], t.def.smash[1]);
    return true;
  }

  function smashAction() {
    if (!state.playing || state.paused || state.over) return;
    if (state.hammer <= 0) {
      state.floats.push({ x: W / 2, y: 300, text: "HAMMER EMPTY", life: 700, color: "#ff5d5d" });
      return;
    }
    let target = null;
    if (state.active && !state.active.plugin.trash.landed) {
      target = state.active;
    } else {
      const candidates = trashBodies().filter(
        (b) => b.plugin.trash.landed && b.bounds.min.y < BIN.bottom
      );
      candidates.sort((a, b) => a.bounds.min.y - b.bounds.min.y);
      target = candidates[0] || null;
    }
    if (!target) return;
    const used = trySmash(target);
    if (used) {
      state.hammer -= 1;
      updateHammerHud();
    }
  }

  function explode(bomb) {
    const pos = { ...bomb.position };
    removeBody(bomb);
    sfx.boom();
    state.shake = 18;
    burst(pos.x, pos.y, "#ffb347", 26, 6);
    burst(pos.x, pos.y, "#ff5d5d", 18, 4);
    let destroyed = 0;
    for (const body of trashBodies()) {
      const dist = Vector.magnitude(Vector.sub(body.position, pos));
      if (dist < 125) {
        disposeBody(body, 0.6, "#ffb347");
        destroyed += 1;
      } else if (dist < 230) {
        const dir = Vector.normalise(Vector.sub(body.position, pos));
        Body.applyForce(body, body.position, Vector.mult(dir, 0.012 * body.mass));
      }
    }
    addScore(150 + destroyed * 40, pos.x, pos.y, "#ffb347");
  }

  function updateHammerHud() {
    el.hammer.textContent = "●".repeat(state.hammer) + "○".repeat(MAX_HAMMER - state.hammer);
  }

  function step(dt) {
    if (!state.playing || state.paused || state.over) return;

    if (state.hammer < MAX_HAMMER) {
      state.hammerTimer += dt;
      if (state.hammerTimer >= HAMMER_RECHARGE_MS) {
        state.hammerTimer = 0;
        state.hammer += 1;
        updateHammerHud();
      }
    }

    const active = state.active;
    if (active && active.plugin.trash && !active.plugin.trash.landed) {
      const vx = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
      const capY = keys.down ? 13 : 7;
      Body.setVelocity(active, { x: vx * 4.4, y: Math.min(active.velocity.y, capY) });
      const minX = BIN.left + 24;
      const maxX = BIN.right - 24;
      if (active.position.x < minX) Body.setPosition(active, { x: minX, y: active.position.y });
      if (active.position.x > maxX) Body.setPosition(active, { x: maxX, y: active.position.y });
    }

    const bodies = trashBodies();
    let danger = false;
    for (const body of bodies) {
      const t = body.plugin.trash;
      const speed = Vector.magnitude(body.velocity);
      if (t.landed && speed < 0.3) t.still += 1;
      else t.still = 0;
      t.settled = t.still > 35;

      if (t.bomb && t.fuse !== 0) {
        t.fuse -= dt;
        t.fuseBeep -= dt;
        if (t.fuseBeep <= 0) {
          sfx.fuse();
          t.fuseBeep = 220;
        }
        if (t.fuse <= 0) {
          explode(body);
          continue;
        }
      }

      if (t.debris && t.landed) {
        t.crumbleLeft -= dt;
        if (t.crumbleLeft <= 0) {
          disposeBody(body, 0.15, "#c9d1cc");
          continue;
        }
      }

      if (t.def.organic > 0 && t.landed && !t.debris) {
        t.decayLeft -= dt / 1000;
        const frac = Math.max(0, t.decayLeft / t.def.organic);
        if (frac < t.lastFrac - 0.05) {
          Body.scale(body, frac / t.lastFrac, frac / t.lastFrac);
          t.lastFrac = frac;
        }
        if (t.decayLeft <= 0) {
          disposeBody(body, 1, "#6fe08a");
          continue;
        }
      }

      if (t.settled && body.bounds.min.y < OVERFLOW_Y) danger = true;

      if (body.position.y > H + 80) {
        removeBody(body);
        state.floats.push({ x: body.position.x, y: 400, text: "MISS", life: 800, color: "#ff5d5d" });
      }
    }

    if (danger) {
      state.dangerMs += dt;
      if (state.dangerMs >= OVERFLOW_LIMIT_MS) {
        gameOver();
        return;
      }
    } else {
      state.dangerMs = Math.max(0, state.dangerMs - dt * 1.6);
    }

    if (!state.active && state.clock >= state.nextSpawnAt) {
      spawnNext();
      state.nextSpawnAt = state.clock + 600;
    }
    if (state.active && state.active.plugin.trash.settled) {
      state.active = null;
      state.nextSpawnAt = state.clock + 500;
    }

    for (const p of state.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.life -= dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);

    for (const f of state.floats) {
      f.y -= f.big ? 0.2 : 0.5;
      f.life -= dt;
    }
    state.floats = state.floats.filter((f) => f.life > 0);

    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 0.04);

    Engine.update(engine, Math.min(dt, 33));
  }

  function gameOver() {
    state.over = true;
    state.playing = false;
    sfx.over();
    el.overlayHelp.style.display = "none";
    el.overlayText.textContent = "The can overflowed! Final score: " + state.score + " · Best: " + bestScore;
    el.startBtn.textContent = "Play Again";
    el.overlay.classList.add("visible");
  }

  function startGame() {
    audio();
    if (engine) {
      Events.off(engine);
    }
    buildWorld();
    state = freshState();
    el.score.textContent = "0";
    el.level.textContent = "1";
    el.next.textContent = "❓";
    updateHammerHud();
    el.overlay.classList.remove("visible");
    el.overlayHelp.style.display = "";
    state.playing = true;
    state.nextSpawnAt = state.clock + 400;
  }

  function drawBin() {
    const x0 = BIN.left - BIN.wall;
    const x1 = BIN.right + BIN.wall;
    const grad = ctx.createLinearGradient(x0, 0, x1, 0);
    grad.addColorStop(0, "#4a5b52");
    grad.addColorStop(0.5, "#66796e");
    grad.addColorStop(1, "#3d4c44");
    ctx.fillStyle = grad;
    ctx.fillRect(x0, BIN.rim, x1 - x0, BIN.bottom - BIN.rim + BIN.wall);
    ctx.fillStyle = "#1a241e";
    ctx.fillRect(BIN.left, BIN.rim, BIN.right - BIN.left, BIN.bottom - BIN.rim + BIN.wall);
    ctx.fillStyle = "#7e948a";
    ctx.fillRect(x0 - 4, BIN.rim - 8, x1 - x0 + 8, 10);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 2;
    for (let y = BIN.rim + 24; y < BIN.bottom; y += 28) {
      ctx.beginPath();
      ctx.moveTo(x0 + 4, y);
      ctx.lineTo(x1 - 4, y);
      ctx.stroke();
    }
  }

  function draw() {
    ctx.save();
    if (state && state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#17251d");
    bg.addColorStop(1, "#0b130f");
    ctx.fillStyle = bg;
    ctx.fillRect(-20, -20, W + 40, H + 40);

    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    if (!engine) {
      ctx.restore();
      return;
    }

    drawBin();

    const dangerRatio = state.dangerMs / OVERFLOW_LIMIT_MS;
    if (dangerRatio > 0.02) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 120);
      ctx.strokeStyle = "rgba(255,93,93," + (0.35 + pulse * 0.5) + ")";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(BIN.left, OVERFLOW_Y);
      ctx.lineTo(BIN.right, OVERFLOW_Y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,93,93,0.9)";
      ctx.font = "bold 15px 'Trebuchet MS', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("OVERFLOW!", W / 2, OVERFLOW_Y - 10);
      ctx.fillStyle = "rgba(255,93,93,0.35)";
      ctx.fillRect(BIN.left, OVERFLOW_Y - 34, (BIN.right - BIN.left) * dangerRatio, 6);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const body of trashBodies()) {
      const t = body.plugin.trash;
      if (t.debris) {
        ctx.beginPath();
        const verts = body.vertices;
        ctx.moveTo(verts[0].x, verts[0].y);
        for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
        ctx.closePath();
        ctx.fillStyle = t.gen >= 2 ? "#6d766f" : "#8a938c";
        ctx.fill();
        ctx.strokeStyle = "#4d554f";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        continue;
      }
      const bw = body.bounds.max.x - body.bounds.min.x;
      const bh = body.bounds.max.y - body.bounds.min.y;
      const size = Math.max(bw, bh) * 1.05;
      ctx.save();
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.angle);
      ctx.font = size + "px 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif";
      if (t.bomb && t.fuse !== 0 && Math.floor(performance.now() / 90) % 2 === 0) {
        ctx.globalAlpha = 0.35;
      }
      ctx.fillText(t.def.emoji, 0, 0);
      ctx.restore();
    }

    for (const p of state.particles) {
      ctx.globalAlpha = Math.min(1, p.life / 400);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const f of state.floats) {
      ctx.globalAlpha = Math.min(1, f.life / 500);
      ctx.fillStyle = f.color;
      ctx.font = (f.big ? "bold 34px" : "bold 16px") + " 'Trebuchet MS', sans-serif";
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    if (dangerRatio > 0.02) {
      ctx.fillStyle = "rgba(255,60,60," + dangerRatio * 0.18 + ")";
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    if (!state) return;
    const dt = Math.min(50, ts - (state.lastTs || ts));
    state.lastTs = ts;
    state.clock += dt;
    step(dt);
    draw();
  }

  document.addEventListener("keydown", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
    else if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
    else if (e.code === "ArrowDown") keys.down = true;
    else if (e.code === "KeyS" || e.code === "KeyX") {
      e.preventDefault();
      smashAction();
    } else if (e.code === "KeyP" || e.code === "Escape") {
      if (state && state.playing) {
        state.paused = !state.paused;
        banner(state.paused ? "PAUSED" : "GO!", "#8fb3a0");
      }
    } else return;
    if (e.code.startsWith("Arrow")) e.preventDefault();
  });

  document.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
    else if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
    else if (e.code === "ArrowDown") keys.down = false;
  });

  for (const btn of document.querySelectorAll(".touch-key")) {
    const key = btn.dataset.key;
    const press = (e) => {
      e.preventDefault();
      if (key === "KeyS") smashAction();
      else if (key === "ArrowLeft") keys.left = true;
      else if (key === "ArrowRight") keys.right = true;
      else if (key === "ArrowDown") keys.down = true;
    };
    const release = (e) => {
      e.preventDefault();
      if (key === "ArrowLeft") keys.left = false;
      else if (key === "ArrowRight") keys.right = false;
      else if (key === "ArrowDown") keys.down = false;
    };
    btn.addEventListener("pointerdown", press);
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointerleave", release);
    btn.addEventListener("pointercancel", release);
  }

  el.startBtn.addEventListener("click", startGame);

  state = freshState();
  requestAnimationFrame(loop);

  window.__tp = { getState: () => state, startGame, smashAction };
})();
