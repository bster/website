'use strict';

/* ═══════════════════════════════════════════════════════════════════
   CV ASTEROIDS — Asteroids-style game where CV phrases are the rocks.
   Destroy all asteroids to clear the board.
   Controls: A/D or ←/→ to rotate, W or ↑ to thrust, Space to shoot.
   ═══════════════════════════════════════════════════════════════════ */

/* ── Shared canvas globals (defined in game.js) ───────────────────
   canvas, ctx, W, H, initCanvas()  — accessible as page-level globals
   ─────────────────────────────────────────────────────────────────── */

/* ── Constants ───────────────────────────────────────────────────── */
const A_BG           = '#f7f6f3';
const A_SHIP_COLOR   = '#1a1a1a';
const A_BULLET_COLOR = '#f72585';
const A_AST_COLOR    = '#1a1a1a';
const A_FONT         = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

const A_SHIP_SIZE    = 14;      // nose-to-tail half-length
const A_ROT_SPEED    = 0.055;   // radians per frame
const A_THRUST       = 0.18;
const A_DRAG         = 0.988;
const A_MAX_SPEED    = 6;
const A_BULLET_SPEED = 9;
const A_BULLET_LIFE  = 55;      // frames before bullet disappears
const A_INVINCIBLE_F = 180;     // frames of invincibility after respawn
const A_DEAD_DELAY   = 90;      // frames before auto-respawn after death

const A_RADII  = { large: 52, medium: 26, small: 13 };
const A_SPEEDS = { large: 0.8, medium: 1.4, small: 2.2 };

/* ── CV labels for the 10 initial large asteroids ────────────────── */
const A_LABELS = [
  'BEN STERN', 'VP OF PRODUCT', 'FIGMA', 'DROPBOX', 'TEACHBOOST',
  'BRIDGESPAN', 'BOWDOIN', 'EXPERIENCE', 'EDUCATION', 'SKILLS',
];

/* ── State ────────────────────────────────────────────────────────── */
let aAsteroids  = [];
let aBullets    = [];
let aParticles  = [];
let aShip       = null;
let aLives      = 3;
let aDeadTimer  = 0;
let aPhase      = 'playing'; // 'playing' | 'dead' | 'cleared' | 'gameover'
let aAnimId     = null;
let aKeys       = {};
let aCanShoot   = true;

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */
function aWrap(obj) {
  const r = obj.r || 0;
  if (obj.x < -r)     obj.x = W + r;
  if (obj.x > W + r)  obj.x = -r;
  if (obj.y < -r)     obj.y = H + r;
  if (obj.y > H + r)  obj.y = -r;
}

function aCircleHit(ax, ay, ar, bx, by, br) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy < (ar + br) * (ar + br);
}

function aGenerateVertices(r) {
  const count = 8 + Math.floor(Math.random() * 5); // 8–12 vertices
  const verts = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const dist  = r * (0.72 + Math.random() * 0.5);
    verts.push({ a: angle, d: dist });
  }
  return verts;
}

function aSpawnParticles(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.5 + Math.random() * 4;
    aParticles.push({
      x, y,
      vx:    Math.cos(a) * s,
      vy:    Math.sin(a) * s,
      life:  1,
      decay: 0.03 + Math.random() * 0.04,
      r:     1.5 + Math.random() * 2,
      color,
    });
  }
}

/* ═══════════════════════════════════════════════════════════════════
   ASTEROID CREATION
   ═══════════════════════════════════════════════════════════════════ */
function aCreateAsteroid(x, y, size, label) {
  const r   = A_RADII[size];
  const spd = A_SPEEDS[size] * (0.7 + Math.random() * 0.6);
  const ang = Math.random() * Math.PI * 2;
  return {
    x, y,
    vx:       Math.cos(ang) * spd,
    vy:       Math.sin(ang) * spd,
    r,
    size,
    label:    label || null,
    vertices: aGenerateVertices(r),
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.018,
  };
}

function aSpawnInitialAsteroids() {
  const cx = W / 2, cy = H / 2;
  const safeR = 150;
  for (let i = 0; i < A_LABELS.length; i++) {
    let x, y, attempts = 0;
    do {
      x = Math.random() * W;
      y = Math.random() * H;
      attempts++;
    } while (Math.hypot(x - cx, y - cy) < safeR && attempts < 60);
    aAsteroids.push(aCreateAsteroid(x, y, 'large', A_LABELS[i]));
  }
}

/* ═══════════════════════════════════════════════════════════════════
   KILL ASTEROID — split or destroy, check win
   ═══════════════════════════════════════════════════════════════════ */
function aKillAsteroid(idx) {
  const ast = aAsteroids[idx];
  aAsteroids.splice(idx, 1);

  aSpawnParticles(ast.x, ast.y, ast.size === 'small' ? 6 : 10, A_AST_COLOR);

  if (ast.size === 'large') {
    aAsteroids.push(aCreateAsteroid(ast.x, ast.y, 'medium'));
    aAsteroids.push(aCreateAsteroid(ast.x, ast.y, 'medium'));
  } else if (ast.size === 'medium') {
    aAsteroids.push(aCreateAsteroid(ast.x, ast.y, 'small'));
    aAsteroids.push(aCreateAsteroid(ast.x, ast.y, 'small'));
  }

  if (aAsteroids.length === 0) aPhase = 'cleared';
}

/* ═══════════════════════════════════════════════════════════════════
   SHIP SPAWN
   ═══════════════════════════════════════════════════════════════════ */
function aSpawnShip() {
  aShip = {
    x:               W / 2,
    y:               H / 2,
    angle:           -Math.PI / 2,  // pointing up
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
  aAsteroids = [];
  aBullets   = [];
  aParticles = [];
  aLives     = 3;
  aDeadTimer = 0;
  aPhase     = 'playing';
  aCanShoot  = true;
  aKeys      = {};
  aSpawnShip();
  aSpawnInitialAsteroids();
}

/* ═══════════════════════════════════════════════════════════════════
   UPDATE
   ═══════════════════════════════════════════════════════════════════ */
function aUpdate() {
  if (aPhase === 'cleared' || aPhase === 'gameover') return;

  // ── Dead phase: game world continues, wait then respawn
  if (aPhase === 'dead') {
    aDeadTimer--;
    if (aDeadTimer <= 0) {
      aSpawnShip();
      aPhase = 'playing';
      aParticles = [];
    }
    // Asteroids still drift while ship is dead
    for (const ast of aAsteroids) {
      ast.x        += ast.vx;
      ast.y        += ast.vy;
      ast.rotation += ast.rotSpeed;
      aWrap(ast);
    }
    for (let i = aParticles.length - 1; i >= 0; i--) {
      const p = aParticles[i];
      p.x    += p.vx;
      p.y    += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) aParticles.splice(i, 1);
    }
    return;
  }

  const ship = aShip;

  // ── Ship rotation & thrust
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
  aWrap(ship);

  if (ship.invincible) {
    ship.invincibleTimer--;
    if (ship.invincibleTimer <= 0) ship.invincible = false;
  }

  // ── Bullets: move, expire, and check asteroid collisions
  for (let i = aBullets.length - 1; i >= 0; i--) {
    const b = aBullets[i];
    b.x += b.vx;
    b.y += b.vy;
    b.life--;
    aWrap(b);
    if (b.life <= 0) { aBullets.splice(i, 1); continue; }

    let hit = false;
    for (let j = aAsteroids.length - 1; j >= 0; j--) {
      if (aCircleHit(b.x, b.y, 3, aAsteroids[j].x, aAsteroids[j].y, aAsteroids[j].r)) {
        aBullets.splice(i, 1);
        aKillAsteroid(j);
        hit = true;
        break;
      }
    }
    if (hit) continue;
  }

  // ── Asteroids: drift and rotate
  for (const ast of aAsteroids) {
    ast.x        += ast.vx;
    ast.y        += ast.vy;
    ast.rotation += ast.rotSpeed;
    aWrap(ast);
  }

  // ── Ship-asteroid collision (skip if invincible)
  if (!ship.invincible) {
    for (const ast of aAsteroids) {
      if (aCircleHit(ship.x, ship.y, A_SHIP_SIZE * 0.65, ast.x, ast.y, ast.r * 0.82)) {
        aSpawnParticles(ship.x, ship.y, 14, A_SHIP_COLOR);
        aLives--;
        if (aLives <= 0) {
          aPhase = 'gameover';
        } else {
          aPhase     = 'dead';
          aDeadTimer = A_DEAD_DELAY;
        }
        return;
      }
    }
  }

  // ── Particles
  for (let i = aParticles.length - 1; i >= 0; i--) {
    const p = aParticles[i];
    p.x    += p.vx;
    p.y    += p.vy;
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

  // ── Asteroids
  for (const ast of aAsteroids) {
    ctx.save();
    ctx.translate(ast.x, ast.y);
    ctx.rotate(ast.rotation);
    ctx.beginPath();
    ctx.moveTo(
      Math.cos(ast.vertices[0].a) * ast.vertices[0].d,
      Math.sin(ast.vertices[0].a) * ast.vertices[0].d
    );
    for (let i = 1; i < ast.vertices.length; i++) {
      ctx.lineTo(
        Math.cos(ast.vertices[i].a) * ast.vertices[i].d,
        Math.sin(ast.vertices[i].a) * ast.vertices[i].d
      );
    }
    ctx.closePath();
    ctx.strokeStyle = A_AST_COLOR;
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.restore();

    // Label drawn upright (not rotated) so it's always readable
    if (ast.label) {
      ctx.save();
      ctx.font         = `600 9px ${A_FONT}`;
      ctx.fillStyle    = 'rgba(26,26,26,0.5)';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ast.label, ast.x, ast.y);
      ctx.restore();
    }
  }

  // ── Bullets
  for (const b of aBullets) {
    // Glow
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = A_BULLET_COLOR;
    ctx.fill();
    ctx.restore();
    // Body
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = A_BULLET_COLOR;
    ctx.fill();
  }

  // ── Particles
  for (const p of aParticles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Ship (only when playing; flickers when invincible)
  if (aShip && aPhase === 'playing') {
    const ship    = aShip;
    const visible = !ship.invincible || Math.floor(Date.now() / 80) % 2 === 0;
    if (visible) {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);

      // Body
      ctx.beginPath();
      ctx.moveTo(A_SHIP_SIZE,            0);
      ctx.lineTo(-A_SHIP_SIZE * 0.6,  A_SHIP_SIZE * 0.65);
      ctx.lineTo(-A_SHIP_SIZE * 0.6, -A_SHIP_SIZE * 0.65);
      ctx.closePath();
      ctx.fillStyle = A_SHIP_COLOR;
      ctx.fill();

      // Thrust flame
      if (ship.thrusting) {
        const flameLen = 8 + Math.random() * 8;
        ctx.beginPath();
        ctx.moveTo(-A_SHIP_SIZE * 0.55,  A_SHIP_SIZE * 0.28);
        ctx.lineTo(-A_SHIP_SIZE * 0.55 - flameLen, 0);
        ctx.lineTo(-A_SHIP_SIZE * 0.55, -A_SHIP_SIZE * 0.28);
        ctx.closePath();
        ctx.fillStyle = A_BULLET_COLOR;
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // ── HUD: lives as small ship icons, top-left
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

  // ── Overlays for cleared / gameover
  if (aPhase === 'cleared' || aPhase === 'gameover') {
    ctx.save();
    ctx.fillStyle    = 'rgba(247,246,243,0.94)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    if (aPhase === 'cleared') {
      ctx.fillStyle = '#0a0a0a';
      ctx.font      = `700 28px ${A_FONT}`;
      ctx.fillText('All cleared. Hire me anyway?', W / 2, H / 2 - 20);
      ctx.fillStyle = '#9a9a9a';
      ctx.font      = `400 13px ${A_FONT}`;
      ctx.fillText('benjamin.m.stern@gmail.com', W / 2, H / 2 + 14);
      ctx.fillStyle = '#c5c5c5';
      ctx.font      = `400 11px ${A_FONT}`;
      ctx.fillText('click to play again', W / 2, H / 2 + 38);
    } else {
      ctx.fillStyle = '#0a0a0a';
      ctx.font      = `700 28px ${A_FONT}`;
      ctx.fillText('Game over.', W / 2, H / 2 - 20);
      ctx.fillStyle = '#c5c5c5';
      ctx.font      = `400 11px ${A_FONT}`;
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
  if (e.key === ' ' && aCanShoot && aPhase === 'playing') {
    e.preventDefault();
    aCanShoot = false;
    aBullets.push({
      x:    aShip.x + Math.cos(aShip.angle) * (A_SHIP_SIZE + 2),
      y:    aShip.y + Math.sin(aShip.angle) * (A_SHIP_SIZE + 2),
      vx:   Math.cos(aShip.angle) * A_BULLET_SPEED + aShip.vx,
      vy:   Math.sin(aShip.angle) * A_BULLET_SPEED + aShip.vy,
      life: A_BULLET_LIFE,
    });
  }
}

function _aOnKeyUp(e) {
  if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') aKeys.left  = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') aKeys.right = false;
  if (e.key === 'ArrowUp'    || e.key === 'w' || e.key === 'W') aKeys.up    = false;
  if (e.key === ' ') aCanShoot = true;
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
  canvas.addEventListener('click',     _aOnClick);
  aLoop();
}

function stopAsteroids() {
  cancelAnimationFrame(aAnimId);
  aAnimId   = null;
  aKeys     = {};
  aCanShoot = true;
  document.removeEventListener('keydown', _aOnKeyDown);
  document.removeEventListener('keyup',   _aOnKeyUp);
  canvas.removeEventListener('click',     _aOnClick);
}
