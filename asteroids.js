'use strict';

/* ═══════════════════════════════════════════════════════════════════
   CV ASTEROIDS — the CV is displayed as static text.
   A ship flies freely around the screen; bullets destroy individual
   letters which fly off with spin physics.
   Controls: A/D or ←/→ rotate · W or ↑ thrust · Space shoot
   Mobile:   drag to aim & thrust · tap to shoot
   ═══════════════════════════════════════════════════════════════════ */

/* ── Shared canvas globals from game.js ──────────────────────────────
   canvas, ctx, W, H, initCanvas()
   FONT, S, makeFont(), buildLayoutData()  — from layout.js
   ─────────────────────────────────────────────────────────────────── */

/* ── Constants ───────────────────────────────────────────────────── */
const A_BG           = '#f7f6f3';
const A_DIV_COLOR    = 'rgba(0,0,0,0.1)';
const A_SHIP_COLOR   = '#1a1a1a';
const A_BULLET_COLOR = '#f72585';

const A_SHIP_SIZE    = 14;
const A_ROT_SPEED    = 0.055;
const A_THRUST       = 0.18;
const A_DRAG         = 0.988;
const A_MAX_SPEED    = 6;
const A_BULLET_SPEED = 9;
const A_BULLET_LIFE  = 55;
const A_INVINCIBLE_F = 180;
const A_DEAD_DELAY   = 90;

/* ── State ────────────────────────────────────────────────────────── */
let aChars     = [];
let aDividers  = [];
let aDeadChars = [];
let aParticles = [];
let aBullets   = [];
let aShip      = null;
let aLives     = 3;
let aDeadTimer = 0;
let aPhase     = 'playing';
let aAnimId    = null;
let aKeys      = {};
let aCanShoot  = true;

// Touch state
let aTouchStart   = null;
let aTouchCurrent = null;

/* ═══════════════════════════════════════════════════════════════════
   LAYOUT
   ═══════════════════════════════════════════════════════════════════ */
function aBuildLayout() {
  const data = buildLayoutData(ctx, W, H);
  aChars    = data.chars;
  aDividers = data.dividers;
}

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */
function aCircleAABB(cx, cy, r, rx, ry, rw, rh) {
  const nx = Math.max(rx, Math.min(cx, rx + rw));
  const ny = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

function aWrapShip(ship) {
  const pad = A_SHIP_SIZE + 4;
  if (ship.x < -pad)     ship.x = W + pad;
  if (ship.x > W + pad)  ship.x = -pad;
  if (ship.y < -pad)     ship.y = H + pad;
  if (ship.y > H + pad)  ship.y = -pad;
}

function aWrapBullet(b) {
  if (b.x < 0)  b.x = W;
  if (b.x > W)  b.x = 0;
  if (b.y < 0)  b.y = H;
  if (b.y > H)  b.y = 0;
}

/* ═══════════════════════════════════════════════════════════════════
   KILL CHAR — eject letter with spin + spawn sparks
   ═══════════════════════════════════════════════════════════════════ */
function aKillChar(ch, bvx, bvy) {
  ch.alive = false;

  const speed = 3 + Math.random() * 7;
  const angle = Math.atan2(bvy, bvx) + (Math.random() - 0.5) * 1.4;

  aDeadChars.push({
    char:   ch.char,
    font:   ch.font,
    color:  ch.color,
    w:      ch.w,
    h:      ch.h,
    ex:     ch.x,
    ey:     ch.y,
    evx:    Math.cos(angle) * speed,
    evy:    Math.sin(angle) * speed - 2,
    erot:   0,
    espin:  (Math.random() - 0.5) * 0.28,
    ealpha: 1,
  });

  for (let i = 0; i < 5; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1 + Math.random() * 3.5;
    aParticles.push({
      x:     ch.x + ch.w * 0.5,
      y:     ch.y - ch.h * 0.4,
      vx:    Math.cos(a) * s,
      vy:    Math.sin(a) * s,
      life:  1,
      decay: 0.05 + Math.random() * 0.05,
      r:     1 + Math.random() * 2,
      color: ch.color,
    });
  }
}

/* ═══════════════════════════════════════════════════════════════════
   SHIP SPAWN
   ═══════════════════════════════════════════════════════════════════ */
function aSpawnShip() {
  aShip = {
    x:               W / 2,
    y:               H / 2,
    angle:           -Math.PI / 2,
    vx:              0,
    vy:              0,
    thrusting:       false,
    invincible:      true,
    invincibleTimer: A_INVINCIBLE_F,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════════════ */
function aInit() {
  aChars     = [];
  aDividers  = [];
  aDeadChars = [];
  aParticles = [];
  aBullets   = [];
  aLives     = 3;
  aDeadTimer = 0;
  aPhase     = 'playing';
  aCanShoot  = true;
  aKeys      = {};
  aTouchStart   = null;
  aTouchCurrent = null;
  aBuildLayout();
  aSpawnShip();
}

/* ═══════════════════════════════════════════════════════════════════
   SHOOT BULLET — fired from ship nose
   ═══════════════════════════════════════════════════════════════════ */
function aFireBullet() {
  if (!aShip || aPhase !== 'playing') return;
  aBullets.push({
    x:    aShip.x + Math.cos(aShip.angle) * (A_SHIP_SIZE + 2),
    y:    aShip.y + Math.sin(aShip.angle) * (A_SHIP_SIZE + 2),
    vx:   Math.cos(aShip.angle) * A_BULLET_SPEED + aShip.vx,
    vy:   Math.sin(aShip.angle) * A_BULLET_SPEED + aShip.vy,
    life: A_BULLET_LIFE,
  });
}

/* ═══════════════════════════════════════════════════════════════════
   UPDATE
   ═══════════════════════════════════════════════════════════════════ */
function aUpdate() {
  if (aPhase === 'cleared' || aPhase === 'gameover') return;

  // ── Dead phase: ship exploded, count down to respawn
  if (aPhase === 'dead') {
    aDeadTimer--;
    if (aDeadTimer <= 0) {
      aSpawnShip();
      aPhase     = 'playing';
      aParticles = [];
    }
    // Decay particles and dead chars while waiting
    for (let i = aParticles.length - 1; i >= 0; i--) {
      const p = aParticles[i];
      p.x += p.vx; p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) aParticles.splice(i, 1);
    }
    return;
  }

  const ship = aShip;

  // ── Touch-based steering (point ship toward touch, thrust if far)
  if (aTouchCurrent) {
    const dx          = aTouchCurrent.x - ship.x;
    const dy          = aTouchCurrent.y - ship.y;
    const targetAngle = Math.atan2(dy, dx);
    let   angleDiff   = targetAngle - ship.angle;
    while (angleDiff >  Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    if (Math.abs(angleDiff) > 0.04) {
      ship.angle += Math.sign(angleDiff) * A_ROT_SPEED * 2.2;
    }
    aKeys.up = Math.hypot(dx, dy) > 50;
  }

  // ── Keyboard rotation
  if (aKeys.left)  ship.angle -= A_ROT_SPEED;
  if (aKeys.right) ship.angle += A_ROT_SPEED;
  ship.thrusting = !!aKeys.up;

  if (ship.thrusting) {
    ship.vx += Math.cos(ship.angle) * A_THRUST;
    ship.vy += Math.sin(ship.angle) * A_THRUST;
    const spd = Math.hypot(ship.vx, ship.vy);
    if (spd > A_MAX_SPEED) {
      ship.vx = (ship.vx / spd) * A_MAX_SPEED;
      ship.vy = (ship.vy / spd) * A_MAX_SPEED;
    }
  }

  ship.vx *= A_DRAG;
  ship.vy *= A_DRAG;
  ship.x  += ship.vx;
  ship.y  += ship.vy;
  aWrapShip(ship);

  if (ship.invincible) {
    ship.invincibleTimer--;
    if (ship.invincibleTimer <= 0) ship.invincible = false;
  }

  // ── Bullets: move, expire, collide with chars
  for (let i = aBullets.length - 1; i >= 0; i--) {
    const b = aBullets[i];
    b.x += b.vx;
    b.y += b.vy;
    b.life--;
    aWrapBullet(b);
    if (b.life <= 0) { aBullets.splice(i, 1); continue; }

    let hit = false;
    for (const ch of aChars) {
      if (!ch.alive) continue;
      if (aCircleAABB(b.x, b.y, 3, ch.x, ch.y - ch.h, ch.w, ch.h)) {
        aKillChar(ch, b.vx, b.vy);
        aBullets.splice(i, 1);
        hit = true;
        break;
      }
    }
    if (hit) continue;
  }

  // ── Win condition
  if (aChars.length > 0 && aChars.every(c => !c.alive)) aPhase = 'cleared';

  // ── Dead chars physics
  for (let i = aDeadChars.length - 1; i >= 0; i--) {
    const d = aDeadChars[i];
    d.ex    += d.evx;
    d.ey    += d.evy;
    d.evy   += 0.38;
    d.evx   *= 0.985;
    d.erot  += d.espin;
    d.ealpha -= 0.014;
    if (d.ealpha <= 0) aDeadChars.splice(i, 1);
  }

  // ── Particles
  for (let i = aParticles.length - 1; i >= 0; i--) {
    const p = aParticles[i];
    p.x    += p.vx;
    p.y    += p.vy;
    p.vy   += 0.18;
    p.life -= p.decay;
    if (p.life <= 0) aParticles.splice(i, 1);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   DRAW
   ═══════════════════════════════════════════════════════════════════ */
function aDraw() {
  ctx.fillStyle = A_BG;
  ctx.fillRect(0, 0, W, H);

  // ── Dividers
  ctx.strokeStyle = A_DIV_COLOR;
  ctx.lineWidth   = 1;
  for (const d of aDividers) {
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x + d.w, d.y);
    ctx.stroke();
  }

  // ── Dead chars (flying off)
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  for (const d of aDeadChars) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, d.ealpha);
    ctx.font        = d.font;
    ctx.fillStyle   = d.color;
    ctx.translate(d.ex + d.w * 0.5, d.ey - d.h * 0.5);
    ctx.rotate(d.erot);
    ctx.fillText(d.char, 0, 0);
    ctx.restore();
  }

  // ── Spark particles
  for (const p of aParticles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Alive chars
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign    = 'left';
  let lastFont = null, lastColor = null;
  for (const ch of aChars) {
    if (!ch.alive) continue;
    if (ch.font  !== lastFont)  { ctx.font      = ch.font;  lastFont  = ch.font;  }
    if (ch.color !== lastColor) { ctx.fillStyle = ch.color; lastColor = ch.color; }
    ctx.fillText(ch.char, ch.x, ch.y);
  }

  // ── Bullets
  for (const b of aBullets) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = A_BULLET_COLOR;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = A_BULLET_COLOR;
    ctx.fill();
  }

  // ── Ship
  if (aShip && aPhase === 'playing') {
    const ship    = aShip;
    const visible = !ship.invincible || Math.floor(Date.now() / 80) % 2 === 0;
    if (visible) {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);

      ctx.beginPath();
      ctx.moveTo( A_SHIP_SIZE,            0);
      ctx.lineTo(-A_SHIP_SIZE * 0.6,  A_SHIP_SIZE * 0.65);
      ctx.lineTo(-A_SHIP_SIZE * 0.6, -A_SHIP_SIZE * 0.65);
      ctx.closePath();
      ctx.fillStyle = A_SHIP_COLOR;
      ctx.fill();

      if (ship.thrusting) {
        const fl = 8 + Math.random() * 8;
        ctx.beginPath();
        ctx.moveTo(-A_SHIP_SIZE * 0.55,  A_SHIP_SIZE * 0.28);
        ctx.lineTo(-A_SHIP_SIZE * 0.55 - fl, 0);
        ctx.lineTo(-A_SHIP_SIZE * 0.55, -A_SHIP_SIZE * 0.28);
        ctx.closePath();
        ctx.fillStyle = A_BULLET_COLOR;
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // ── HUD: lives
  for (let i = 0; i < 3; i++) {
    const lx = 26 + i * 22;
    const ly = 26;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(-Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(9,  0);
    ctx.lineTo(-6,  5);
    ctx.lineTo(-6, -5);
    ctx.closePath();
    if (i < aLives) {
      ctx.fillStyle = A_SHIP_COLOR;
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(26,26,26,0.2)';
      ctx.lineWidth   = 1.2;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Overlays
  if (aPhase === 'cleared' || aPhase === 'gameover') {
    ctx.save();
    ctx.fillStyle    = 'rgba(247,246,243,0.94)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    if (aPhase === 'cleared') {
      ctx.fillStyle = '#0a0a0a';
      ctx.font      = `700 28px ${FONT}`;
      ctx.fillText('All cleared. Hire me anyway?', W / 2, H / 2 - 20);
      ctx.fillStyle = '#9a9a9a';
      ctx.font      = `400 13px ${FONT}`;
      ctx.fillText('benjamin.m.stern@gmail.com', W / 2, H / 2 + 14);
      ctx.fillStyle = '#c5c5c5';
      ctx.font      = `400 11px ${FONT}`;
      ctx.fillText('click to play again', W / 2, H / 2 + 38);
    } else {
      ctx.fillStyle = '#0a0a0a';
      ctx.font      = `700 28px ${FONT}`;
      ctx.fillText('Game over.', W / 2, H / 2 - 20);
      ctx.fillStyle = '#c5c5c5';
      ctx.font      = `400 11px ${FONT}`;
      ctx.fillText('click to play again', W / 2, H / 2 + 14);
    }

    ctx.restore();
  }
}

/* ═══════════════════════════════════════════════════════════════════
   LOOP
   ═══════════════════════════════════════════════════════════════════ */
function aLoop() {
  aUpdate();
  aDraw();
  aAnimId = requestAnimationFrame(aLoop);
}

/* ═══════════════════════════════════════════════════════════════════
   INPUT HANDLERS
   ═══════════════════════════════════════════════════════════════════ */
function _aOnKeyDown(e) {
  if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') aKeys.left  = true;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') aKeys.right = true;
  if (e.key === 'ArrowUp'    || e.key === 'w' || e.key === 'W') aKeys.up    = true;
  if (e.key === ' ' && aCanShoot) {
    e.preventDefault();
    aCanShoot = false;
    aFireBullet();
  }
}

function _aOnKeyUp(e) {
  if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') aKeys.left  = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') aKeys.right = false;
  if (e.key === 'ArrowUp'    || e.key === 'w' || e.key === 'W') aKeys.up    = false;
  if (e.key === ' ') aCanShoot = true;
}

function _aOnTouchStart(e) {
  e.preventDefault();
  const t = e.touches[0];
  aTouchStart   = { x: t.clientX, y: t.clientY, time: Date.now() };
  aTouchCurrent = { x: t.clientX, y: t.clientY };
}

function _aOnTouchMove(e) {
  e.preventDefault();
  const t = e.touches[0];
  aTouchCurrent = { x: t.clientX, y: t.clientY };
}

function _aOnTouchEnd(e) {
  e.preventDefault();
  if (aTouchStart) {
    const dx  = (aTouchCurrent ? aTouchCurrent.x : aTouchStart.x) - aTouchStart.x;
    const dy  = (aTouchCurrent ? aTouchCurrent.y : aTouchStart.y) - aTouchStart.y;
    const dur = Date.now() - aTouchStart.time;
    // Tap: short duration + minimal movement → shoot
    if (Math.hypot(dx, dy) < 12 && dur < 220) aFireBullet();
  }
  aTouchStart   = null;
  aTouchCurrent = null;
  aKeys.up      = false;
}

function _aOnClick() {
  if (aPhase === 'cleared' || aPhase === 'gameover') aInit();
}

/* ═══════════════════════════════════════════════════════════════════
   START / STOP
   ═══════════════════════════════════════════════════════════════════ */
function startAsteroids() {
  initCanvas();
  aInit();
  document.addEventListener('keydown', _aOnKeyDown);
  document.addEventListener('keyup',   _aOnKeyUp);
  canvas.addEventListener('touchstart', _aOnTouchStart, { passive: false });
  canvas.addEventListener('touchmove',  _aOnTouchMove,  { passive: false });
  canvas.addEventListener('touchend',   _aOnTouchEnd,   { passive: false });
  canvas.addEventListener('click',      _aOnClick);
  aLoop();
}

function stopAsteroids() {
  cancelAnimationFrame(aAnimId);
  aAnimId       = null;
  aKeys         = {};
  aCanShoot     = true;
  aTouchStart   = null;
  aTouchCurrent = null;
  document.removeEventListener('keydown', _aOnKeyDown);
  document.removeEventListener('keyup',   _aOnKeyUp);
  canvas.removeEventListener('touchstart', _aOnTouchStart);
  canvas.removeEventListener('touchmove',  _aOnTouchMove);
  canvas.removeEventListener('touchend',   _aOnTouchEnd);
  canvas.removeEventListener('click',      _aOnClick);
}
