'use strict';

/* ═══════════════════════════════════════════════════════════════════
   CV PAC-MAN — Pac-Man eats individual CV letters while avoiding
   three ghosts. Clear the whole CV to win.
   Controls: Arrow keys or WASD to change direction
   Mobile:   Swipe to change direction
   ═══════════════════════════════════════════════════════════════════ */

/* ── Shared globals from game.js / layout.js ─────────────────────────
   canvas, ctx, W, H, initCanvas(), FONT, buildLayoutData()
   ─────────────────────────────────────────────────────────────────── */

/* ── Constants ───────────────────────────────────────────────────── */
const P_BG           = '#f5f1ea';
const P_DIV_COLOR    = 'rgba(0,0,0,0.1)';
const P_PAC_COLOR    = '#f72585';
const P_GHOST_COLORS = ['#1e1a18', '#5a5149', '#8a8178'];

const P_SPEED        = 2.2;
const P_GHOST_SPEED  = 1.35;
const P_PAC_RADIUS   = 12;
const P_GHOST_RADIUS = 13;
const P_EAT_RADIUS   = P_PAC_RADIUS + 6;   // eat at reflow boundary
const P_INVINCIBLE_F = 150;
const P_DEAD_DELAY   = 100;

const P_DIRS = {
  right: { dx:  1, dy:  0 },
  left:  { dx: -1, dy:  0 },
  down:  { dx:  0, dy:  1 },
  up:    { dx:  0, dy: -1 },
};

/* ── State ────────────────────────────────────────────────────────── */
let pChars        = [];
let pDividers     = [];
let pContentLeft  = 0;
let pContentRight = 0;
let pEaten     = [];    // fading-out eaten chars
let pParticles = [];
let pPac       = null;
let pGhosts    = [];
let pLives     = 3;
let pDeadTimer = 0;
let pPhase     = 'playing';
let pAnimId    = null;
let pStartTime = 0;
let pScore     = 0;
let pKeys      = {};
let pTouchStart = null;

/* ═══════════════════════════════════════════════════════════════════
   LAYOUT
   ═══════════════════════════════════════════════════════════════════ */
function pBuildLayout() {
  const data    = buildLayoutData(ctx, W, H);
  pChars        = data.chars;
  pDividers     = data.dividers;
  pContentLeft  = data.contentLeft;
  pContentRight = data.contentRight;
}

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */
function pCircleAABB(cx, cy, r, rx, ry, rw, rh) {
  const nx = Math.max(rx, Math.min(cx, rx + rw));
  const ny = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

function pWrap(obj, r) {
  const pad = r + 4;
  if (obj.x < -pad)    obj.x = W + pad;
  if (obj.x > W + pad) obj.x = -pad;
  if (obj.y < -pad)    obj.y = H + pad;
  if (obj.y > H + pad) obj.y = -pad;
}

/* ═══════════════════════════════════════════════════════════════════
   SPAWN
   ═══════════════════════════════════════════════════════════════════ */
function pSpawnPac() {
  pPac = {
    x:               W / 2,
    y:               H / 2,
    dir:             'right',
    nextDir:         null,
    mouthAngle:      0.05,
    mouthDir:        1,
    invincible:      true,
    invincibleTimer: P_INVINCIBLE_F,
  };
}

function pSpawnGhosts() {
  // Place ghosts at corners of the content area, well away from center
  const positions = [
    { x: W * 0.15, y: H * 0.35 },
    { x: W * 0.85, y: H * 0.35 },
    { x: W * 0.5,  y: H * 0.75 },
  ];
  pGhosts = positions.map((pos, i) => ({
    x:         pos.x,
    y:         pos.y,
    dir:       ['right', 'left', 'up'][i],
    speed:     P_GHOST_SPEED * (1 + i * 0.08),
    mode:      'scatter',
    modeTimer: 80 + i * 40,
    color:     P_GHOST_COLORS[i],
  }));
}

/* ═══════════════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════════════ */
function pInit() {
  pChars     = [];
  pDividers  = [];
  pEaten     = [];
  pParticles = [];
  pLives     = 3;
  pDeadTimer = 0;
  pPhase     = 'playing';
  pStartTime = Date.now();
  pScore     = 0;
  pKeys      = {};
  pTouchStart = null;
  pBuildLayout();
  pSpawnPac();
  pSpawnGhosts();
}

/* ═══════════════════════════════════════════════════════════════════
   UPDATE
   ═══════════════════════════════════════════════════════════════════ */
function pUpdate() {
  if (pPhase === 'cleared' || pPhase === 'gameover') return;

  // ── Dead phase: wait then respawn
  if (pPhase === 'dead') {
    pDeadTimer--;
    if (pDeadTimer <= 0) {
      pSpawnPac();
      pPhase = 'playing';
      pParticles = [];
    }
    for (let i = pParticles.length - 1; i >= 0; i--) {
      const p = pParticles[i];
      p.x += p.vx; p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) pParticles.splice(i, 1);
    }
    for (let i = pEaten.length - 1; i >= 0; i--) {
      pEaten[i].alpha -= 0.06;
      if (pEaten[i].alpha <= 0) pEaten.splice(i, 1);
    }
    return;
  }

  const pac = pPac;

  // ── Apply queued direction (no walls, so always applies)
  if (pac.nextDir) { pac.dir = pac.nextDir; pac.nextDir = null; }

  // ── Keyboard direction
  if      (pKeys.right) { pac.dir = 'right'; pKeys.right = false; }
  else if (pKeys.left)  { pac.dir = 'left';  pKeys.left  = false; }
  else if (pKeys.down)  { pac.dir = 'down';  pKeys.down  = false; }
  else if (pKeys.up)    { pac.dir = 'up';    pKeys.up    = false; }

  // ── Move Pac-Man
  const d = P_DIRS[pac.dir];
  pac.x += d.dx * P_SPEED;
  pac.y += d.dy * P_SPEED;
  pWrap(pac, P_PAC_RADIUS);

  // ── Mouth animation
  pac.mouthAngle += pac.mouthDir * 0.04;
  if (pac.mouthAngle > 0.22) { pac.mouthAngle = 0.22; pac.mouthDir = -1; }
  if (pac.mouthAngle < 0.02) { pac.mouthAngle = 0.02; pac.mouthDir =  1; }

  // ── Invincibility countdown
  if (pac.invincible) {
    pac.invincibleTimer--;
    if (pac.invincibleTimer <= 0) pac.invincible = false;
  }

  // ── Eat characters
  for (const ch of pChars) {
    if (!ch.alive) continue;
    if (pCircleAABB(pac.x, pac.y, P_EAT_RADIUS, ch.x, ch.y - ch.h, ch.w, ch.h)) {
      ch.alive = false;
      pScore  += 100;
      pEaten.push({ char: ch.char, font: ch.font, color: ch.color, x: ch.x, y: ch.y, w: ch.w, h: ch.h, alpha: 1 });
      // Small burst of particles
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1 + Math.random() * 3;
        pParticles.push({
          x:     ch.x + ch.w * 0.5,
          y:     ch.y - ch.h * 0.5,
          vx:    Math.cos(a) * s,
          vy:    Math.sin(a) * s,
          life:  1,
          decay: 0.07 + Math.random() * 0.06,
          r:     1 + Math.random() * 1.5,
          color: P_PAC_COLOR,
        });
      }
    }
  }

  // ── Win condition
  if (pPhase === 'playing' && pChars.length > 0 && pChars.every(c => !c.alive)) {
    pPhase = 'cleared';
    showScoreModal(pScore, 'pacman', null);
    return;
  }

  // ── Ghost update
  for (const g of pGhosts) {
    g.modeTimer--;
    if (g.modeTimer <= 0) {
      // Decide mode: chase if within 220px of Pac-Man, else scatter
      const dist = Math.hypot(g.x - pac.x, g.y - pac.y);
      if (dist < 220) {
        g.mode      = 'chase';
        g.modeTimer = 50 + Math.floor(Math.random() * 40);
      } else {
        g.mode      = 'scatter';
        g.modeTimer = 90 + Math.floor(Math.random() * 60);
        // Random direction change
        const dirs  = Object.keys(P_DIRS);
        g.dir       = dirs[Math.floor(Math.random() * dirs.length)];
      }
    }

    if (g.mode === 'chase') {
      // Move toward Pac-Man: pick dominant axis
      const dx = pac.x - g.x;
      const dy = pac.y - g.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        g.dir = dx > 0 ? 'right' : 'left';
      } else {
        g.dir = dy > 0 ? 'down' : 'up';
      }
    } else {
      // Scatter: continue direction, randomly turn 30% of the time
      if (Math.random() < 0.012) {
        const dirs = Object.keys(P_DIRS);
        g.dir = dirs[Math.floor(Math.random() * dirs.length)];
      }
    }

    const gd = P_DIRS[g.dir];
    g.x += gd.dx * g.speed;
    g.y += gd.dy * g.speed;
    pWrap(g, P_GHOST_RADIUS);

    // ── Ghost-Pac collision
    if (!pac.invincible) {
      const dist = Math.hypot(g.x - pac.x, g.y - pac.y);
      if (dist < P_GHOST_RADIUS + P_PAC_RADIUS - 4) {
        // Spawn particles at Pac-Man position
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * Math.PI * 2;
          const s = 2 + Math.random() * 4;
          pParticles.push({
            x:     pac.x,
            y:     pac.y,
            vx:    Math.cos(a) * s,
            vy:    Math.sin(a) * s,
            life:  1,
            decay: 0.03 + Math.random() * 0.04,
            r:     2 + Math.random() * 2,
            color: P_PAC_COLOR,
          });
        }
        pLives--;
        if (pLives <= 0) {
          pPhase = 'gameover';
          showScoreModal(pScore, 'pacman', null);
        } else {
          pPhase     = 'dead';
          pDeadTimer = P_DEAD_DELAY;
        }
        return;
      }
    }
  }

  // ── Particles
  for (let i = pParticles.length - 1; i >= 0; i--) {
    const p = pParticles[i];
    p.x    += p.vx;
    p.y    += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) pParticles.splice(i, 1);
  }

  // ── Eaten chars fade out
  for (let i = pEaten.length - 1; i >= 0; i--) {
    pEaten[i].alpha -= 0.06;
    if (pEaten[i].alpha <= 0) pEaten.splice(i, 1);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   DRAW
   ═══════════════════════════════════════════════════════════════════ */
function pDraw() {
  ctx.fillStyle = P_BG;
  ctx.fillRect(0, 0, W, H);

  // ── Dividers
  ctx.strokeStyle = P_DIV_COLOR;
  ctx.lineWidth   = 1;
  for (const d of pDividers) {
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x + d.w, d.y);
    ctx.stroke();
  }

  // ── Alive chars
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign    = 'left';
  let lastFont = null, lastColor = null;
  for (const ch of pChars) {
    if (!ch.alive) continue;
    if (ch.font  !== lastFont)  { ctx.font      = ch.font;  lastFont  = ch.font;  }
    if (ch.color !== lastColor) { ctx.fillStyle = ch.color; lastColor = ch.color; }
    ctx.fillText(ch.char, ch.x, ch.y);
  }

  // ── Eaten chars (fade out)
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  for (const e of pEaten) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, e.alpha);
    ctx.font        = e.font;
    ctx.fillStyle   = P_PAC_COLOR;
    ctx.fillText(e.char, e.x + e.w * 0.5, e.y - e.h * 0.5);
    ctx.restore();
  }

  // ── Particles
  for (const p of pParticles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Ghosts
  for (const g of pGhosts) {
    _pDrawGhost(g.x, g.y, P_GHOST_RADIUS, g.color);
  }

  // ── Pac-Man
  if (pPac && pPhase === 'playing') {
    const pac     = pPac;
    const visible = true;
    if (visible) {
      const dirAngles = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
      const baseAngle = dirAngles[pac.dir] || 0;
      const mouth     = pac.mouthAngle;
      ctx.save();
      ctx.fillStyle = P_PAC_COLOR;
      ctx.beginPath();
      ctx.moveTo(pac.x, pac.y);
      ctx.arc(pac.x, pac.y, P_PAC_RADIUS, baseAngle + mouth, baseAngle + Math.PI * 2 - mouth);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // ── HUD: lives + score — top-left
  const _pHudY = 50;
  for (let i = 0; i < 3; i++) {
    const lx = 26 + i * 24;
    const r  = 8;
    ctx.save();
    if (i < pLives) {
      ctx.fillStyle = P_PAC_COLOR;
      ctx.beginPath();
      ctx.moveTo(lx, _pHudY);
      ctx.arc(lx, _pHudY, r, 0.25, Math.PI * 2 - 0.25);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(247,37,133,0.2)';
      ctx.lineWidth   = 1.2;
      ctx.beginPath();
      ctx.arc(lx, _pHudY, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (pPhase === 'playing' || pPhase === 'dead') {
    ctx.save();
    ctx.font         = `600 12px ${FONT}`;
    ctx.fillStyle    = 'rgba(0,0,0,0.25)';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(pScore.toLocaleString(), 26 + 3 * 24 + 10, _pHudY);
    ctx.restore();
  }

  // ── Overlays
  if (pPhase === 'cleared' || pPhase === 'gameover') {
    ctx.save();
    ctx.fillStyle    = 'rgba(245,241,234,0.94)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    if (pPhase === 'cleared') {
      ctx.fillStyle = '#1e1a18';
      ctx.font      = `700 28px ${FONT}`;
      ctx.fillText('All cleared. Hire me anyway?', W / 2, H / 2 - 20);
      ctx.fillStyle = '#8a8178';
      ctx.font      = `400 13px ${FONT}`;
      ctx.fillText('benjamin.m.stern@gmail.com', W / 2, H / 2 + 14);
      ctx.fillStyle = '#bfb5aa';
      ctx.font      = `400 11px ${FONT}`;
      ctx.fillText('click to play again', W / 2, H / 2 + 38);
    } else {
      ctx.fillStyle = '#1e1a18';
      ctx.font      = `700 28px ${FONT}`;
      ctx.fillText('Game over.', W / 2, H / 2 - 20);
      ctx.fillStyle = '#8a8178';
      ctx.font      = `400 13px ${FONT}`;
      ctx.fillText(`Score: ${pScore.toLocaleString()}`, W / 2, H / 2 + 14);
      ctx.fillStyle = '#bfb5aa';
      ctx.font      = `400 11px ${FONT}`;
      ctx.fillText('click to play again', W / 2, H / 2 + 38);
    }

    ctx.restore();
  }
}

/* ── Ghost silhouette ────────────────────────────────────────────── */
function _pDrawGhost(x, y, r, color) {
  ctx.save();
  ctx.fillStyle = color;

  ctx.beginPath();
  // Top half-circle
  ctx.arc(x, y, r, Math.PI, 0);
  // Right side straight down
  ctx.lineTo(x + r, y + r * 1.15);
  // Three wavy bumps across the bottom (drawn right-to-left)
  const bumpR = r / 3;
  ctx.arc(x + r - bumpR,         y + r * 1.15, bumpR, 0,       Math.PI, false);
  ctx.arc(x,                     y + r * 1.15, bumpR, 0,       Math.PI, false);
  ctx.arc(x - r + bumpR,         y + r * 1.15, bumpR, 0,       Math.PI, false);
  // Left side straight up back to start
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fill();

  // Eyes
  const eyeOffX = r * 0.32;
  const eyeOffY = r * 0.1;
  const eyeRX   = r * 0.22;
  const eyeRY   = r * 0.28;

  // White of eyes
  ctx.fillStyle = 'rgba(245,241,234,0.9)';
  ctx.beginPath();
  ctx.ellipse(x - eyeOffX, y - eyeOffY, eyeRX, eyeRY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + eyeOffX, y - eyeOffY, eyeRX, eyeRY, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pupils
  ctx.fillStyle = '#1e1a18';
  const pupilR = r * 0.1;
  ctx.beginPath();
  ctx.arc(x - eyeOffX + eyeRX * 0.25, y - eyeOffY, pupilR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + eyeOffX + eyeRX * 0.25, y - eyeOffY, pupilR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════════
   LOOP
   ═══════════════════════════════════════════════════════════════════ */
function pLoop() {
  const newW = window.innerWidth, newH = window.innerHeight;
  if (newW !== W || newH !== H) {
    W = newW; H = newH;
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  // Reflow CV text around Pac-Man and ghosts each frame
  const pObstacles = [];
  if (pPac && pPhase === 'playing') {
    pObstacles.push({ cx: pPac.x, cy: pPac.y, r: P_PAC_RADIUS + 8, hPad: 5, vPad: 2 });
    for (const g of pGhosts) {
      pObstacles.push({ cx: g.x, cy: g.y, r: P_GHOST_RADIUS + 6, hPad: 4, vPad: 2 });
    }
  }
  reflowChars(pChars, pObstacles, pContentLeft, pContentRight);

  pUpdate();
  pDraw();
  pAnimId = requestAnimationFrame(pLoop);
}

/* ═══════════════════════════════════════════════════════════════════
   INPUT HANDLERS
   ═══════════════════════════════════════════════════════════════════ */
function _pOnKeyDown(e) {
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') pKeys.right = true;
  if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') pKeys.left  = true;
  if (e.key === 'ArrowDown'  || e.key === 's' || e.key === 'S') pKeys.down  = true;
  if (e.key === 'ArrowUp'    || e.key === 'w' || e.key === 'W') pKeys.up    = true;
  // Prevent arrow keys scrolling the page
  if (e.key.startsWith('Arrow')) e.preventDefault();
}

function _pOnTouchStart(e) {
  e.preventDefault();
  const t = e.touches[0];
  pTouchStart = { x: t.clientX, y: t.clientY };
}

function _pOnTouchMove(e) {
  e.preventDefault();
  if (!pTouchStart || !pPac) return;
  const t  = e.touches[0];
  const dx = t.clientX - pTouchStart.x;
  const dy = t.clientY - pTouchStart.y;
  if (Math.hypot(dx, dy) < 28) return; // threshold before committing
  // Whichever axis dominates
  if (Math.abs(dx) > Math.abs(dy)) {
    pPac.nextDir = dx > 0 ? 'right' : 'left';
  } else {
    pPac.nextDir = dy > 0 ? 'down' : 'up';
  }
  // Reset so continued dragging can update direction
  pTouchStart = { x: t.clientX, y: t.clientY };
}

function _pOnTouchEnd(e) {
  e.preventDefault();
  pTouchStart = null;
}

function _pOnClick() {
  if ((pPhase === 'cleared' || pPhase === 'gameover') && !window.scoreModalOpen) pInit();
}

/* ═══════════════════════════════════════════════════════════════════
   START / STOP
   ═══════════════════════════════════════════════════════════════════ */
function startPacman() {
  initCanvas();
  pInit();
  document.addEventListener('keydown', _pOnKeyDown);
  canvas.addEventListener('touchstart', _pOnTouchStart, { passive: false });
  canvas.addEventListener('touchmove',  _pOnTouchMove,  { passive: false });
  canvas.addEventListener('touchend',   _pOnTouchEnd,   { passive: false });
  canvas.addEventListener('click',      _pOnClick);
  pLoop();
}

function stopPacman() {
  cancelAnimationFrame(pAnimId);
  pAnimId     = null;
  pKeys       = {};
  pTouchStart = null;
  document.removeEventListener('keydown', _pOnKeyDown);
  canvas.removeEventListener('touchstart', _pOnTouchStart);
  canvas.removeEventListener('touchmove',  _pOnTouchMove);
  canvas.removeEventListener('touchend',   _pOnTouchEnd);
  canvas.removeEventListener('click',      _pOnClick);
}
