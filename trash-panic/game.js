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
  const GRAVITY = 0.65;
  const FALL_CAP = 3.4;
  const SLAM_CAP = 8;
  const SQUISH_SPEED = 3;
  const SLAM_VELOCITY = 12;
  const COMPACT_INTERVAL = 1200;
  const BIN_UPGRADES = [4000, 12000, 25000, 45000];

  const TRASH = [
    { id: "banana", emoji: "🍌", w: 46, h: 26, food: true, mat: "food", hp: 1, pts: 80, minLevel: 1, weight: 8, smash: [2, 0.55], tint: "#e8d44d" },
    { id: "apple", emoji: "🍎", w: 34, h: 34, food: true, mat: "food", hp: 1, pts: 90, minLevel: 1, weight: 8, smash: [2, 0.55], tint: "#d9584a" },
    { id: "egg", emoji: "🥚", w: 28, h: 34, food: true, mat: "food", fragile: true, hp: 1, pts: 70, minLevel: 1, weight: 7, smash: [2, 0.5], tint: "#f2e9d8" },
    { id: "fish", emoji: "🐟", w: 54, h: 24, food: true, mat: "food", hp: 1, pts: 100, minLevel: 1, weight: 6, smash: [2, 0.55], tint: "#8fb8c9" },
    { id: "donut", emoji: "🍩", w: 36, h: 36, food: true, mat: "food", hp: 1, pts: 90, minLevel: 1, weight: 6, smash: [2, 0.5], tint: "#d9a066" },
    { id: "cabbage", emoji: "🥬", w: 44, h: 40, food: true, mat: "food", hp: 1, pts: 110, minLevel: 1, weight: 5, smash: [3, 0.5], tint: "#9cc069" },
    { id: "chicken", emoji: "🍗", w: 44, h: 32, food: true, mat: "food", hp: 1, pts: 110, minLevel: 2, weight: 6, smash: [2, 0.5], tint: "#c98a4b" },
    { id: "pizza", emoji: "🍕", w: 50, h: 34, food: true, mat: "food", hp: 1, pts: 120, minLevel: 2, weight: 5, smash: [3, 0.5], tint: "#e0b04a" },
    { id: "watermelon", emoji: "🍉", w: 52, h: 44, food: true, mat: "food", hp: 2, pts: 180, minLevel: 2, weight: 5, smash: [3, 0.5], tint: "#5fae5f" },
    { id: "pumpkin", emoji: "🎃", w: 48, h: 44, food: true, mat: "food", hp: 2, pts: 200, minLevel: 3, weight: 4, smash: [3, 0.5], tint: "#e0862f" },
    { id: "can", emoji: "🥫", w: 30, h: 44, mat: "metal", hp: 1, pts: 150, minLevel: 1, weight: 8, smash: [2, 0.55], tint: "#9aa3ab" },
    { id: "bottle", emoji: "🍾", w: 30, h: 58, mat: "glass", hp: 2, pts: 200, minLevel: 1, weight: 7, smash: [2, 0.5], tint: "#7ba088" },
    { id: "boot", emoji: "👢", w: 46, h: 46, mat: "leather", hp: 2, pts: 250, minLevel: 2, weight: 6, smash: [3, 0.5], tint: "#a8623f" },
    { id: "battery", emoji: "🔋", w: 34, h: 48, mat: "metal", hp: 2, pts: 220, minLevel: 2, weight: 5, smash: [2, 0.5], tint: "#5f8a5f" },
    { id: "tire", emoji: "⭕", w: 58, h: 58, circle: true, mat: "rubber", hp: 3, pts: 300, minLevel: 2, weight: 5, smash: [2, 0.6], tint: "#4d5459" },
    { id: "radio", emoji: "📻", w: 58, h: 42, mat: "elec", hp: 3, pts: 350, minLevel: 3, weight: 4, smash: [3, 0.5], tint: "#a06b52" },
    { id: "chair", emoji: "🪑", w: 50, h: 62, mat: "wood", hp: 3, pts: 400, minLevel: 3, weight: 4, smash: [3, 0.5], tint: "#b0885a" },
    { id: "tv", emoji: "📺", w: 78, h: 62, mat: "elec", hp: 4, pts: 550, minLevel: 3, weight: 4, smash: [3, 0.5], tint: "#6d757c" },
    { id: "safe", emoji: "🧰", w: 66, h: 66, mat: "metal", hp: 6, pts: 900, minLevel: 4, weight: 3, smash: [4, 0.45], tint: "#5c666e" },
    { id: "piano", emoji: "🎹", w: 82, h: 50, mat: "piano", hp: 5, pts: 800, minLevel: 4, weight: 2, smash: [4, 0.45], tint: "#3d4147" },
    { id: "bomb", emoji: "💣", w: 38, h: 38, circle: true, bomb: true, mat: "metal", hp: 1, pts: 400, minLevel: 1, weight: 4, smash: null, tint: "#3d4147" }
  ];

  const CLOUDS = [
    { x: 70, y: 74, s: 1.15, v: 0.010 },
    { x: 250, y: 128, s: 0.8, v: 0.007 },
    { x: 400, y: 52, s: 0.65, v: 0.009 }
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
    startBtn: document.getElementById("startBtn"),
    lives: document.getElementById("lives")
  };

  let engine = null;
  let state = null;
  let bgCanvas = null;
  let bgImage = null;
  let binWalls = [];
  let musicGain = null;
  const music = { on: true, nextTime: 0, chordIdx: 0, stepIdx: 0, birdAt: 0 };

  function musicBus() {
    if (!audioCtx) return null;
    if (!musicGain) {
      musicGain = audioCtx.createGain();
      musicGain.gain.setValueAtTime(music.on ? 1.6 : 0, audioCtx.currentTime);
      musicGain.connect(audioCtx.destination);
    }
    return musicGain;
  }
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
    gain.gain.setValueAtTime(Math.min(0.5, vol * 2.2), ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur + 0.02);
  }

  const sfx = {
    thud: () => tone(150, 45, 0.09, "triangle", 0.22),
    hit: () => { tone(320, 70, 0.1, "square", 0.16); tone(160, 60, 0.14, "triangle", 0.14); },
    break: () => { tone(420, 90, 0.16, "square", 0.18); tone(210, 50, 0.2, "sawtooth", 0.14); },
    squish: () => { tone(260, 60, 0.18, "sine", 0.24); tone(130, 45, 0.22, "triangle", 0.16); },
    clang: () => { tone(900, 700, 0.07, "square", 0.15); tone(520, 400, 0.12, "square", 0.1); },
    boom: () => { tone(120, 25, 0.5, "sawtooth", 0.4); tone(70, 20, 0.6, "triangle", 0.35); },
    fuse: () => tone(1300, 1300, 0.04, "sine", 0.12),
    levelup: () => { tone(520, 520, 0.09, "sine", 0.2); setTimeout(() => tone(660, 660, 0.09, "sine", 0.2), 90); setTimeout(() => tone(990, 990, 0.18, "sine", 0.22), 180); },
    over: () => { tone(300, 60, 0.7, "sawtooth", 0.3); },
    whoosh: () => tone(600, 140, 0.18, "sawtooth", 0.08),
    splat: () => { tone(320, 60, 0.12, "sine", 0.25); tone(700, 120, 0.08, "triangle", 0.15); },
    sad: () => { tone(240, 70, 0.45, "sawtooth", 0.2); tone(120, 50, 0.5, "triangle", 0.15); }
  };

  function pianoChord(vol) {
    const freqs = [261.63, 329.63, 392.0, 523.25];
    for (const f of freqs) {
      const ac = audio();
      if (!ac) return;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(Math.min(0.2, (vol || 0.05) * 2), ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.9);
      osc.connect(gain).connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 1);
    }
  }

  function matHit(def, strength) {
    const vol = Math.min(0.28, 0.07 + strength * 0.018);
    switch (def.mat) {
      case "metal": tone(650 + Math.random() * 350, 280, 0.13, "square", vol * 0.8); break;
      case "glass": tone(1350, 900, 0.09, "sine", vol * 0.7); tone(1750, 1150, 0.07, "sine", vol * 0.5); break;
      case "wood": tone(195, 110, 0.08, "triangle", vol); break;
      case "rubber": tone(175, 85, 0.16, "sine", vol); break;
      case "elec": tone(115, 95, 0.1, "sawtooth", vol * 0.5); break;
      case "leather": tone(125, 60, 0.09, "triangle", vol * 0.9); break;
      case "piano": pianoChord(Math.min(0.09, vol * 0.5)); break;
      case "food": tone(230 + Math.random() * 90, 70, 0.14, "sine", vol); break;
      default: tone(150, 45, 0.09, "triangle", vol);
    }
  }

  function matBreak(def) {
    switch (def.mat) {
      case "glass":
        for (let i = 0; i < 5; i++) {
          setTimeout(() => tone(2300 - i * 260 + Math.random() * 200, 900, 0.06, "sine", 0.12), i * 35);
        }
        break;
      case "metal":
        tone(820, 200, 0.2, "square", 0.2);
        tone(410, 90, 0.28, "triangle", 0.16);
        break;
      case "wood":
        tone(260, 90, 0.1, "square", 0.18);
        setTimeout(() => tone(180, 70, 0.14, "triangle", 0.16), 60);
        break;
      case "elec":
        tone(240, 28, 0.4, "sawtooth", 0.16);
        break;
      case "rubber":
        tone(320, 70, 0.18, "sine", 0.2);
        break;
      case "piano":
        pianoChord(0.08);
        setTimeout(() => tone(90, 40, 0.3, "sawtooth", 0.14), 40);
        break;
      case "food":
        sfx.squish();
        break;
      default:
        sfx.break();
    }
  }

  const CHORDS = [
    [261.63, 329.63, 392.0, 493.88],
    [220.0, 261.63, 329.63, 392.0],
    [174.61, 220.0, 261.63, 329.63],
    [196.0, 246.94, 293.66, 349.23]
  ];

  function padNote(freq, at, dur) {
    const ac = audioCtx;
    const bus = musicBus();
    if (!ac || !bus) return;
    for (const [type, detune, vol] of [["sine", 0, 0.05], ["triangle", 4, 0.028]]) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.linearRampToValueAtTime(vol, at + 1.1);
      gain.gain.setValueAtTime(vol, at + dur - 1.2);
      gain.gain.linearRampToValueAtTime(0.0001, at + dur);
      osc.connect(gain).connect(bus);
      osc.start(at);
      osc.stop(at + dur + 0.1);
    }
  }

  function pluck(freq, at) {
    const ac = audioCtx;
    const bus = musicBus();
    if (!ac || !bus) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.08, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.9);
    osc.connect(gain).connect(bus);
    osc.start(at);
    osc.stop(at + 1);
  }

  function birdChirp(at) {
    const ac = audioCtx;
    const bus = musicBus();
    if (!ac || !bus) return;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const t0 = at + i * 0.12;
      const f = 2200 + Math.random() * 1400;
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, t0);
      osc.frequency.exponentialRampToValueAtTime(f * 0.7, t0 + 0.09);
      gain.gain.setValueAtTime(0.04, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1);
      osc.connect(gain).connect(bus);
      osc.start(t0);
      osc.stop(t0 + 0.12);
    }
  }

  function scheduleMusic() {
    const ac = audioCtx;
    if (!ac || !music.on || state.over || ac.state !== "running") return;
    if (music.nextTime < ac.currentTime) music.nextTime = ac.currentTime + 0.1;
    const ahead = ac.currentTime + 0.6;
    while (music.nextTime < ahead) {
      const at = music.nextTime;
      const chord = CHORDS[music.chordIdx % CHORDS.length];
      if (music.stepIdx % 8 === 0) {
        for (const f of chord) padNote(f, at, 4.4);
      }
      if (music.stepIdx % 2 === 0) {
        pluck(chord[(Math.floor(music.stepIdx / 2) % chord.length)] * 2, at);
      }
      if (at > music.birdAt) {
        birdChirp(at + 0.3);
        music.birdAt = at + 7000 + Math.random() * 9000;
      }
      music.nextTime = at + 0.5;
      music.stepIdx++;
      if (music.stepIdx % 8 === 0) music.chordIdx++;
    }
  }

  const keys = { left: false, right: false };

  const garb = { cheerT: 0, worryT: 0, bubble: null, bubbleT: 0 };
  const birds = [];
  let birdTimer = 4000;
  const hobo = { peekT: 0, nextPeek: 8000 };

  const CHEERS = ["NICE!", "ECO!", "GET IN THERE!", "SMASH IT!", "CLEAN SWEEP!", "THAT'S THE STUFF!"];

  function updateLivesHud() {
    el.lives.textContent = "♥".repeat(state.lives) + "♡".repeat(Math.max(0, 3 - state.lives));
    el.lives.style.color = state.lives <= 1 ? "#d84343" : "";
  }

  function groundDrop(body) {
    const t = body.plugin.trash;
    const x = body.position.x;
    removeBody(body);
    state.lives -= 1;
    updateLivesHud();
    sfx.sad();
    state.shake = 8;
    burst(x, 688, "#8d6e63", 12, 3);
    state.floats.push({ x, y: 630, text: "DROPPED!", life: 1100, color: "#d84343" });
    garb.worryT = 2000;
    garb.bubble = state.lives > 0 ? "WATCH IT!" : "WE'RE DONE...";
    garb.bubbleT = 2000;
    if (state.lives <= 0) {
      gameOver("Three items dropped on the ground!");
    }
  }

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
      lives: 3,
      dangerMs: 0,
      combo: 0,
      comboUntil: 0,
      clock: 0,
      binTier: 0,
      compactTimer: 0,
      shake: 0,
      particles: [],
      floats: [],
      lastTs: 0
    };
  }

  function buildWorld() {
    engine = Engine.create();
    engine.gravity.y = GRAVITY;
    const opts = { isStatic: true, friction: 0.6, restitution: 0.02, label: "bin" };
    const midY = (BIN.rim + BIN.bottom) / 2;
    const groundOpts = { isStatic: true, friction: 0.8, restitution: 0.01, label: "ground" };
    binWalls = [
      Bodies.rectangle(BIN.left - BIN.wall / 2, midY, BIN.wall, BIN.bottom - BIN.rim, opts),
      Bodies.rectangle(BIN.right + BIN.wall / 2, midY, BIN.wall, BIN.bottom - BIN.rim, opts),
      Bodies.rectangle((BIN.left + BIN.right) / 2, BIN.bottom + BIN.wall / 2, BIN.right - BIN.left + BIN.wall * 2, BIN.wall, opts),
      Bodies.rectangle((BIN.left - BIN.wall - 20) / 2, 710, BIN.left - BIN.wall + 20, 40, groundOpts),
      Bodies.rectangle((BIN.right + BIN.wall + W + 20) / 2, 710, W + 20 - (BIN.right + BIN.wall), 40, groundOpts)
    ];
    Composite.add(engine.world, [
      ...binWalls,
      Bodies.rectangle(-20, H / 2, 40, H * 2, opts),
      Bodies.rectangle(W + 20, H / 2, 40, H * 2, opts)
    ]);

    Events.on(engine, "collisionStart", (evt) => {
      for (const pair of evt.pairs) {
        const a = pair.bodyA;
        const b = pair.bodyB;
        const rel = Vector.magnitude(Vector.sub(a.velocity, b.velocity));
        const trashA = a.plugin && a.plugin.trash;
        const trashB = b.plugin && b.plugin.trash;
        const striker = rel > 3 ? (trashA && trashB ? (Vector.magnitude(a.velocity) > Vector.magnitude(b.velocity) ? trashA : trashB) : (trashA || trashB)) : null;
        if (rel > 3) {
          if (striker) matHit(striker.def, rel);
          else sfx.thud();
        }
        for (const body of [a, b]) {
          const t = body.plugin && body.plugin.trash;
          const other = body === a ? b : a;
          if (t && other.label === "ground" && !t.groundTouched) {
            t.groundTouched = state.clock;
          }
          if (!t) continue;
          if (!t.landed) {
            t.landed = true;
            t.landTime = state.clock;
            if (t.bomb && !t.fuse) {
              t.fuse = 1400;
              t.fuseBeep = 0;
            }
          }
          if (t.def.fragile && !t.squished) {
            squishFood(body, 1.7, 0.32, "SPLAT!");
          } else if (t.def.food && !t.squished && rel >= SQUISH_SPEED) {
            squishFood(body, 1.4, 0.55, "SPLAT!");
          }
        }
      }
    });
  }

  function trashBodies() {
    return Composite.allBodies(engine.world).filter((b) => b.plugin && b.plugin.trash);
  }

  function rebuildBinWalls() {
    const opts = { isStatic: true, friction: 0.6, restitution: 0.02, label: "bin" };
    const groundOpts = { isStatic: true, friction: 0.8, restitution: 0.01, label: "ground" };
    const midY = (BIN.rim + BIN.bottom) / 2;
    for (const wall of binWalls) Composite.remove(engine.world, wall);
    binWalls = [
      Bodies.rectangle(BIN.left - BIN.wall / 2, midY, BIN.wall, BIN.bottom - BIN.rim, opts),
      Bodies.rectangle(BIN.right + BIN.wall / 2, midY, BIN.wall, BIN.bottom - BIN.rim, opts),
      Bodies.rectangle((BIN.left + BIN.right) / 2, BIN.bottom + BIN.wall / 2, BIN.right - BIN.left + BIN.wall * 2, BIN.wall, opts),
      Bodies.rectangle((BIN.left - BIN.wall - 20) / 2, 710, BIN.left - BIN.wall + 20, 40, groundOpts),
      Bodies.rectangle((BIN.right + BIN.wall + W + 20) / 2, 710, W + 20 - (BIN.right + BIN.wall), 40, groundOpts)
    ];
    Composite.add(engine.world, binWalls);
  }

  function checkBinUpgrade() {
    if (state.binTier >= BIN_UPGRADES.length) return;
    if (state.score < BIN_UPGRADES[state.binTier]) return;
    state.binTier += 1;
    BIN.left -= 12;
    BIN.right += 12;
    rebuildBinWalls();
    banner("BIN UPGRADED!", "#ff8f00");
    sfx.levelup();
    burst(W / 2, BIN.rim, "#ffd166", 22, 5);
  }

  function slamActive() {
    if (!state || !state.playing || state.paused || state.over) return;
    const a = state.active;
    if (!a || !a.plugin.trash || a.plugin.trash.landed) return;
    a.plugin.trash.slammed = true;
    Body.setVelocity(a, { x: a.velocity.x, y: SLAM_VELOCITY });
    sfx.whoosh();
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
      hp: def.hp,
      landed: false,
      still: 0,
      settled: false,
      squished: false,
      slammed: false,
      compaction: 1,
      hitFlash: 0,
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
      banner("LEVEL " + state.level, "#2e7d32");
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
        color: color || "#e07b00"
      });
    }
    if (gained >= 100 && Math.random() < 0.45) {
      garb.cheerT = 1300;
      if (!garb.bubbleT && Math.random() < 0.6) {
        garb.bubble = CHEERS[Math.floor(Math.random() * CHEERS.length)];
        garb.bubbleT = 1600;
      }
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
    burst(body.position.x, body.position.y, color || t.def.tint, 10, 3);
    removeBody(body);
  }

  function makeDebris(src, def, n, scale) {
    const t = src.plugin.trash;
    const gen = t.gen + 1;
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
        hp: 1,
        landed: false,
        still: 0,
        settled: false,
        squished: t.squished,
        slammed: false,
        compaction: 1,
        hitFlash: 0,
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

  function squishFood(body, sx, sy, label) {
    const t = body.plugin.trash;
    t.squished = true;
    Body.scale(body, sx || 1.4, sy || 0.55);
    sfx.splat();
    burst(body.position.x, body.position.y + 8, t.def.tint, 12, 3.5);
    if (t.def.fragile) burst(body.position.x, body.position.y, "#ffd166", 8, 3);
    addScore(25, body.position.x, body.position.y - 14, t.def.tint);
    state.floats.push({ x: body.position.x, y: body.position.y - 30, text: label || "SPLAT!", life: 700, color: t.def.tint });
  }

  function breakBody(body) {
    const t = body.plugin.trash;
    matBreak(t.def);
    state.shake = Math.max(state.shake, 6);
    burst(body.position.x, body.position.y, t.def.tint, 14, 4.5);
    addScore(Math.round(t.def.pts * 0.4), body.position.x, body.position.y - 16, t.def.tint);
    makeDebris(body, t.def, t.def.smash[0], t.def.smash[1]);
  }

  function trySmash(body) {
    const t = body.plugin.trash;
    if (t.bomb) {
      explode(body);
      return true;
    }
    t.hp -= 1;
    t.hitFlash = 220;
    if (t.hp <= 0) {
      breakBody(body);
    } else {
      sfx.hit();
      burst(body.position.x, body.position.y, t.def.tint, 6, 3);
      state.floats.push({ x: body.position.x, y: body.position.y - 22, text: "CRACK!", life: 600, color: "#8d6e63" });
    }
    return true;
  }

  function smashAction() {
    if (!state || !state.playing || state.paused || state.over) return;
    if (state.hammer <= 0) {
      state.floats.push({ x: W / 2, y: 300, text: "HAMMER EMPTY", life: 700, color: "#d84343" });
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
    trySmash(target);
    state.hammer -= 1;
    updateHammerHud();
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
      const t = active.plugin.trash;
      const vx = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
      if (t.slammed) {
        Body.setVelocity(active, { x: vx * 2, y: Math.max(active.velocity.y, SLAM_VELOCITY * 0.8) });
      } else {
        Body.setVelocity(active, { x: vx * 4.4, y: Math.min(active.velocity.y, FALL_CAP) });
      }
      if (active.position.x < 26) Body.setPosition(active, { x: 26, y: active.position.y });
      if (active.position.x > W - 26) Body.setPosition(active, { x: W - 26, y: active.position.y });
    }

    const bodies = trashBodies();
    let danger = false;
    for (const body of bodies) {
      const t = body.plugin.trash;
      const speed = Vector.magnitude(body.velocity);
      if (t.landed && speed < 0.3) t.still += 1;
      else t.still = 0;
      t.settled = t.still > 35;

      if (t.hitFlash > 0) t.hitFlash -= dt;

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
          disposeBody(body, 0.12, t.def.tint);
          continue;
        }
      }

      if (t.landed && speed < 1.2 && body.bounds.min.y < OVERFLOW_Y) danger = true;

      if (t.groundTouched && state.clock - t.groundTouched > 700) {
        groundDrop(body);
        continue;
      }

      if (body.position.y > H + 80) {
        removeBody(body);
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

    checkBinUpgrade();

    state.compactTimer += dt;
    if (state.compactTimer >= COMPACT_INTERVAL) {
      state.compactTimer = 0;
      const list = trashBodies();
      for (const body of list) {
        const t = body.plugin.trash;
        if (!t.settled || body === state.active) continue;
        let pressure = 0;
        for (const other of list) {
          if (other === body || !other.plugin.trash.settled) continue;
          if (
            other.bounds.max.y < body.bounds.min.y + 6 &&
            other.bounds.max.x > body.bounds.min.x &&
            other.bounds.min.x < body.bounds.max.x
          ) pressure += 1;
        }
        if (pressure === 0) continue;
        const k = Math.min(pressure, 4) * (t.def.food || t.debris ? 0.011 : 0.004);
        if (t.compaction - k < 0.55) continue;
        t.compaction -= k;
        Body.scale(body, 1 + k * 0.55, 1 - k);
      }
    }

    if (!state.active && state.clock >= state.nextSpawnAt) {
      spawnNext();
      state.nextSpawnAt = state.clock + 600;
    }
    if (state.active && state.active.plugin.trash.landed) {
      const at = state.active.plugin.trash;
      if (!at.landHandled) {
        at.landHandled = true;
        state.nextSpawnAt = Math.min(state.nextSpawnAt, at.landTime + 550);
      }
      if (state.clock > at.landTime + 500) state.active = null;
    }

    garb.cheerT = Math.max(0, garb.cheerT - dt);
    garb.worryT = Math.max(0, garb.worryT - dt);
    garb.bubbleT = Math.max(0, garb.bubbleT - dt);
    hobo.peekT = Math.max(0, hobo.peekT - dt);
    if (hobo.peekT === 0) {
      hobo.nextPeek -= dt;
      if (hobo.nextPeek <= 0) {
        hobo.peekT = 2600;
        hobo.nextPeek = 9000 + Math.random() * 8000;
      }
    }

    birdTimer -= dt;
    if (birdTimer <= 0) {
      birdTimer = 7000 + Math.random() * 8000;
      const dir = Math.random() < 0.5 ? 1 : -1;
      birds.push({
        x: dir > 0 ? -30 : W + 30,
        y: 50 + Math.random() * 170,
        vx: dir * (1.3 + Math.random() * 0.9),
        ph: Math.random() * 10
      });
      const ac = audioCtx;
      if (ac && ac.state === "running" && music.on) birdChirp(ac.currentTime + 0.05);
    }
    for (const bird of birds) {
      bird.x += bird.vx;
      bird.y += Math.sin(state.clock / 400 + bird.ph) * 0.35;
    }
    for (let i = birds.length - 1; i >= 0; i--) {
      if (birds[i].x < -60 || birds[i].x > W + 60) birds.splice(i, 1);
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

  function gameOver(reason) {
    state.over = true;
    state.playing = false;
    sfx.over();
    el.overlayHelp.style.display = "none";
    el.overlayText.textContent = (reason || "The can overflowed!") + " Final score: " + state.score + " · Best: " + bestScore;
    el.startBtn.textContent = "Play Again";
    el.overlay.classList.add("visible");
  }

  function startGame() {
    audio();
    if (engine) {
      Events.off(engine);
    }
    BIN.left = 100;
    BIN.right = 380;
    buildWorld();
    state = freshState();
    el.score.textContent = "0";
    el.level.textContent = "1";
    el.next.textContent = "❓";
    updateLivesHud();
    updateHammerHud();
    birds.length = 0;
    garb.cheerT = 0;
    garb.worryT = 0;
    garb.bubbleT = 0;
    garb.bubble = null;
    hobo.peekT = 0;
    hobo.nextPeek = 8000;
    birdTimer = 4000;
    el.overlay.classList.remove("visible");
    el.overlayHelp.style.display = "";
    state.playing = true;
    state.nextSpawnAt = state.clock + 400;
    sfx.chime();
  }

  function srand(seed) {
    let s = seed % 233280;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  function buildBackground() {
    bgCanvas = document.createElement("canvas");
    bgCanvas.width = W;
    bgCanvas.height = H;
    const g = bgCanvas.getContext("2d");

    const sky = g.createLinearGradient(0, 0, 0, H * 0.75);
    sky.addColorStop(0, "#6ec3f5");
    sky.addColorStop(0.7, "#a8ddf9");
    sky.addColorStop(1, "#d8f0fd");
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);

    const glow = g.createRadialGradient(398, 92, 10, 398, 92, 90);
    glow.addColorStop(0, "rgba(255,246,190,0.95)");
    glow.addColorStop(1, "rgba(255,246,190,0)");
    g.fillStyle = glow;
    g.fillRect(280, 0, 200, 200);
    g.fillStyle = "#ffee8f";
    g.beginPath();
    g.arc(398, 92, 34, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff7c9";
    g.beginPath();
    g.arc(398, 92, 26, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = "#b3c6dd";
    g.beginPath();
    g.moveTo(-10, 360);
    g.lineTo(60, 250);
    g.lineTo(120, 330);
    g.lineTo(190, 220);
    g.lineTo(260, 320);
    g.lineTo(330, 240);
    g.lineTo(400, 330);
    g.lineTo(490, 260);
    g.lineTo(490, 370);
    g.lineTo(-10, 370);
    g.closePath();
    g.fill();

    g.fillStyle = "#ffffff";
    const caps = [[60, 250, 16], [190, 220, 18], [330, 240, 15]];
    for (const [cx, cy, r] of caps) {
      g.beginPath();
      g.moveTo(cx - r, cy + r * 0.9);
      g.lineTo(cx, cy);
      g.lineTo(cx + r, cy + r * 0.9);
      g.closePath();
      g.fill();
    }

    g.fillStyle = "#9ccf6d";
    g.beginPath();
    g.moveTo(-10, 400);
    g.quadraticCurveTo(120, 340, 250, 395);
    g.quadraticCurveTo(370, 445, 490, 385);
    g.lineTo(490, 480);
    g.lineTo(-10, 480);
    g.closePath();
    g.fill();

    const drawTree = (x, y, s, color) => {
      g.fillStyle = "#7a5230";
      g.fillRect(x - 3 * s, y - 8 * s, 6 * s, 14 * s);
      g.fillStyle = color;
      g.beginPath();
      g.arc(x, y - 16 * s, 11 * s, 0, Math.PI * 2);
      g.arc(x - 8 * s, y - 10 * s, 8 * s, 0, Math.PI * 2);
      g.arc(x + 8 * s, y - 10 * s, 8 * s, 0, Math.PI * 2);
      g.fill();
    };
    const foliage = ["#e8863a", "#d95f3b", "#f0b429", "#7fb069", "#c9563c"];
    const spots = [
      [26, 452, 1.1], [66, 470, 0.8], [110, 440, 1.2], [150, 468, 0.7],
      [330, 452, 0.9], [378, 470, 0.7], [420, 445, 1.15], [462, 466, 0.9],
      [200, 415, 0.6], [290, 420, 0.6]
    ];
    for (let i = 0; i < spots.length; i++) {
      const [x, y, s] = spots[i];
      drawTree(x, y, s, foliage[i % foliage.length]);
    }

    g.fillStyle = "#85c25a";
    g.beginPath();
    g.moveTo(-10, 500);
    g.quadraticCurveTo(140, 455, 300, 498);
    g.quadraticCurveTo(400, 522, 490, 492);
    g.lineTo(490, 560);
    g.lineTo(-10, 560);
    g.closePath();
    g.fill();

    g.fillStyle = "#7ab648";
    g.fillRect(-10, 552, W + 20, H - 542);
    g.fillStyle = "#6aa63c";
    g.fillRect(-10, 552, W + 20, 8);
    g.strokeStyle = "#639a38";
    g.lineWidth = 2;
    const rand = srand(42);
    for (let i = 0; i < 40; i++) {
      const gx = rand() * W;
      const gy = 566 + rand() * 140;
      if (gx > BIN.left - 20 && gx < BIN.right + 20 && gy > BIN.rim - 10) continue;
      g.beginPath();
      g.moveTo(gx, gy);
      g.lineTo(gx + 2, gy - 6);
      g.stroke();
    }
  }

  function drawCloud(x, y, s) {
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.arc(x, y, 16 * s, 0, Math.PI * 2);
    ctx.arc(x + 18 * s, y - 8 * s, 20 * s, 0, Math.PI * 2);
    ctx.arc(x + 40 * s, y, 15 * s, 0, Math.PI * 2);
    ctx.arc(x + 20 * s, y + 8 * s, 17 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFence() {
    ctx.fillStyle = "#9a958c";
    ctx.fillRect(4, 598, 86, 56);
    ctx.strokeStyle = "#7b766d";
    ctx.lineWidth = 2;
    for (let row = 0; row < 3; row++) {
      const y = 612 + row * 15;
      ctx.beginPath();
      ctx.moveTo(4, y);
      ctx.lineTo(90, y);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const x = 14 + i * 20 + (row % 2 ? 10 : 0);
        if (x > 86) continue;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - 15);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "#8a857c";
    ctx.fillRect(2, 592, 90, 8);
  }

  function drawHobo() {
    drawFence();
    if (hobo.peekT <= 0) return;
    const p = 1 - hobo.peekT / 2600;
    const rise = p < 0.18 ? p / 0.18 : p > 0.82 ? (1 - p) / 0.18 : 1;
    const hx = 46;
    const hy = 640 - rise * 46;
    ctx.fillStyle = "#f0c8a0";
    ctx.beginPath();
    ctx.arc(hx, hy, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8d6e63";
    ctx.beginPath();
    ctx.arc(hx, hy + 7, 9, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = "#5d4037";
    ctx.beginPath();
    ctx.ellipse(hx, hy - 9, 14, 6, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(hx - 18, hy - 11, 10, 4);
    ctx.fillStyle = "#3e2723";
    ctx.beginPath();
    ctx.arc(hx - 4.5, hy - 1, 1.6, 0, Math.PI * 2);
    ctx.arc(hx + 4.5, hy - 1, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f0c8a0";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(hx - 16, 606);
    ctx.lineTo(hx - 10, 596 + (1 - rise) * 10);
    ctx.moveTo(hx + 16, 606);
    ctx.lineTo(hx + 10, 596 + (1 - rise) * 10);
    ctx.stroke();
  }

  function drawGarb() {
    const cheering = garb.cheerT > 0;
    const worried = garb.worryT > 0;
    const bob = Math.sin(state.clock / 320) * 2;
    const jump = cheering ? -Math.abs(Math.sin(state.clock / 110)) * 12 : 0;
    const gx = 448;
    const gy = 718 + bob * 0.4 + jump;
    ctx.fillStyle = "#3e5771";
    ctx.fillRect(gx - 11, gy - 28, 9, 28);
    ctx.fillRect(gx + 2, gy - 28, 9, 28);
    ctx.fillStyle = "#2b2b2b";
    ctx.fillRect(gx - 14, gy - 6, 14, 6);
    ctx.fillRect(gx + 1, gy - 6, 14, 6);
    ctx.fillStyle = "#4a6d9b";
    ctx.beginPath();
    ctx.roundRect(gx - 19, gy - 60, 38, 34, 9);
    ctx.fill();
    ctx.fillStyle = "#f0c8a0";
    ctx.beginPath();
    ctx.arc(gx, gy - 69, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a7d44";
    ctx.beginPath();
    ctx.arc(gx, gy - 74, 12, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(gx - 16, gy - 76, 20, 4);
    ctx.fillStyle = "#3e2723";
    ctx.beginPath();
    ctx.arc(gx - 4.5, gy - 69, 1.7, 0, Math.PI * 2);
    ctx.arc(gx + 4.5, gy - 69, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = cheering || worried ? "#f0c8a0" : "#f0c8a0";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (cheering) {
      ctx.moveTo(gx - 16, gy - 52);
      ctx.lineTo(gx - 26, gy - 84);
      ctx.moveTo(gx + 16, gy - 52);
      ctx.lineTo(gx + 26, gy - 84);
    } else if (worried) {
      ctx.moveTo(gx - 16, gy - 52);
      ctx.lineTo(gx - 10, gy - 80);
      ctx.moveTo(gx + 16, gy - 52);
      ctx.lineTo(gx + 10, gy - 80);
    } else {
      const sway = Math.sin(state.clock / 320) * 3;
      ctx.moveTo(gx - 16, gy - 52);
      ctx.lineTo(gx - 22, gy - 30 + sway);
      ctx.moveTo(gx + 16, gy - 52);
      ctx.lineTo(gx + 22, gy - 30 - sway);
    }
    ctx.stroke();
    ctx.lineCap = "butt";
    if (garb.bubbleT > 0 && garb.bubble) {
      const a = Math.min(1, garb.bubbleT / 300);
      ctx.globalAlpha = a;
      ctx.font = "bold 13px 'Trebuchet MS', sans-serif";
      const tw = ctx.measureText(garb.bubble).width;
      const bx = Math.min(gx + 14, W - tw - 26);
      const by = gy - 118;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(bx, by, tw + 18, 24, 8);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bx + 8, by + 24);
      ctx.lineTo(bx + 2, by + 34);
      ctx.lineTo(bx + 18, by + 24);
      ctx.fill();
      ctx.fillStyle = "#263238";
      ctx.textAlign = "left";
      ctx.fillText(garb.bubble, bx + 9, by + 16);
      ctx.textAlign = "center";
      ctx.globalAlpha = 1;
    }
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

  function drawCracks(body, t) {
    const damage = 1 - t.hp / t.def.hp;
    if (damage <= 0) return;
    const n = Math.ceil(damage * 4);
    const rand = srand(body.id * 7 + 13);
    const bw = (body.bounds.max.x - body.bounds.min.x) / 2;
    const bh = (body.bounds.max.y - body.bounds.min.y) / 2;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.strokeStyle = "rgba(30,25,20,0.65)";
    ctx.lineWidth = 1.6;
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const len = 0.45 + rand() * 0.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      let px = 0;
      let py = 0;
      for (let j = 0; j < 3; j++) {
        px += Math.cos(a + (rand() - 0.5)) * bw * len * 0.4;
        py += Math.sin(a + (rand() - 0.5)) * bh * len * 0.4;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw() {
    ctx.save();
    if (state && state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    if (bgImage) {
      const scale = Math.max(W / bgImage.width, H / bgImage.height);
      const dw = bgImage.width * scale;
      const dh = bgImage.height * scale;
      ctx.drawImage(bgImage, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } else if (bgCanvas) {
      ctx.drawImage(bgCanvas, 0, 0);
    } else {
      ctx.fillStyle = "#a8ddf9";
      ctx.fillRect(0, 0, W, H);
    }

    if (state && !bgImage) {
      for (const c of CLOUDS) {
        c.x += c.v * 16.7;
        if (c.x > W + 80) c.x = -90;
        drawCloud(c.x, c.y, c.s);
      }
    }

    for (const bird of birds) {
      const flap = Math.sin(state.clock / 85 + bird.ph);
      ctx.strokeStyle = "#37474f";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bird.x - 9, bird.y - flap * 6);
      ctx.quadraticCurveTo(bird.x - 3, bird.y + 3, bird.x, bird.y);
      ctx.quadraticCurveTo(bird.x + 3, bird.y + 3, bird.x + 9, bird.y - flap * 6);
      ctx.stroke();
    }

    drawHobo();

    if (!engine) {
      ctx.restore();
      return;
    }

    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(W / 2, BIN.bottom + 12, (BIN.right - BIN.left) / 2 + 30, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    drawBin();

    const dangerRatio = state.dangerMs / OVERFLOW_LIMIT_MS;
    if (dangerRatio > 0.02) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 120);
      ctx.strokeStyle = "rgba(216,67,67," + (0.35 + pulse * 0.5) + ")";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(BIN.left, OVERFLOW_Y);
      ctx.lineTo(BIN.right, OVERFLOW_Y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(216,67,67,0.95)";
      ctx.font = "bold 15px 'Trebuchet MS', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("OVERFLOW!", W / 2, OVERFLOW_Y - 10);
      ctx.fillStyle = "rgba(216,67,67,0.4)";
      ctx.fillRect(BIN.left, OVERFLOW_Y - 34, (BIN.right - BIN.left) * dangerRatio, 6);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const act = state.active;
    if (act && act.plugin.trash.slammed && !act.plugin.trash.landed) {
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 3;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(act.position.x + i * 12, act.position.y - 30);
        ctx.lineTo(act.position.x + i * 12, act.position.y - 85);
        ctx.stroke();
      }
    }

    for (const body of trashBodies()) {
      const t = body.plugin.trash;
      if (t.debris) {
        ctx.beginPath();
        const verts = body.vertices;
        ctx.moveTo(verts[0].x, verts[0].y);
        for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
        ctx.closePath();
        ctx.fillStyle = t.def.tint;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(40,35,30,0.5)";
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
      ctx.globalAlpha = 1;
      ctx.restore();
      if (t.squished) {
        ctx.fillStyle = t.def.tint;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.ellipse(body.position.x, body.position.y + bh * 0.32, bw * 0.62, bh * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      drawCracks(body, t);
      if (t.hitFlash > 0) {
        ctx.globalAlpha = Math.min(0.7, t.hitFlash / 220);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(body.position.x, body.position.y, Math.max(bw, bh) * 0.62, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
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
      ctx.fillStyle = "rgba(216,67,67," + dangerRatio * 0.16 + ")";
      ctx.fillRect(0, 0, W, H);
    }

    drawGarb();

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
    scheduleMusic();
  }

  document.addEventListener("keydown", (e) => {
    audio();
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
    else if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
    else if (e.code === "ArrowDown") {
      e.preventDefault();
      if (!e.repeat) slamActive();
      return;
    } else if (e.code === "KeyS" || e.code === "KeyX") {
      e.preventDefault();
      smashAction();
    } else if (e.code === "KeyM") {
      music.on = !music.on;
      const ac = audio();
      const bus = musicBus();
      if (ac && bus) bus.gain.setValueAtTime(music.on ? 1.6 : 0, ac.currentTime);
      banner(music.on ? "♫ MUSIC ON" : "MUSIC OFF", "#5c8bd6");
    } else if (e.code === "KeyP" || e.code === "Escape") {
      if (state && state.playing) {
        state.paused = !state.paused;
        banner(state.paused ? "PAUSED" : "GO!", "#33691e");
      }
    } else return;
    if (e.code.startsWith("Arrow")) e.preventDefault();
  });

  document.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
    else if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
  });

  for (const btn of document.querySelectorAll(".touch-key")) {
    const key = btn.dataset.key;
    const press = (e) => {
      e.preventDefault();
      audio();
      if (key === "KeyS") smashAction();
      else if (key === "ArrowDown") slamActive();
      else if (key === "ArrowLeft") keys.left = true;
      else if (key === "ArrowRight") keys.right = true;
    };
    const release = (e) => {
      e.preventDefault();
      if (key === "ArrowLeft") keys.left = false;
      else if (key === "ArrowRight") keys.right = false;
    };
    btn.addEventListener("pointerdown", press);
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointerleave", release);
    btn.addEventListener("pointercancel", release);
  }

  el.startBtn.addEventListener("click", startGame);

  buildBackground();
  state = freshState();
  requestAnimationFrame(loop);

  const bgLoader = new Image();
  bgLoader.onload = () => {
    bgImage = bgLoader;
  };
  bgLoader.src = "assets/bg.jpg";

  window.__tp = { getState: () => state, startGame, smashAction, bodies: () => trashBodies(), defs: TRASH, spawn: spawnItem, hit: trySmash, bin: BIN, _sfx: sfx, _matHit: matHit, _matBreak: matBreak };
})();
