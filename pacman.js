'use strict';

/* ═══════════════════════════════════════════════════════════════════
   CV PAC-MAN
   Pac-Man slides rows of CV text left/right as he moves horizontally
   through them (and column lanes up/down when moving vertically).
   Each letter hides a dot at its original position. Push the letters
   away to reveal the dots, then eat them for points.
   Controls: Arrow keys / WASD — Mobile: swipe to change direction
   ═══════════════════════════════════════════════════════════════════ */

/* Shared globals: canvas, ctx, W, H, DPR, initCanvas(), FONT, buildLayoutData() */

/* ── Constants ───────────────────────────────────────────────────── */
const P_BG           = '#f5f1ea';
const P_DIV_COLOR    = 'rgba(0,0,0,0.06)';
const P_PAC_COLOR    = '#f72585';
const P_DOT_COLOR    = '#955f3b';
const P_GHOST_COLORS = ['#1e1a18', '#5a5149', '#8a8178'];

const P_SPEED        = 2.5;
const P_GHOST_SPEED  = 1.35;
const P_PAC_RADIUS   = 12;
const P_GHOST_RADIUS = 13;
const P_EAT_RADIUS   = 10;     // px to eat a revealed dot
const P_DOT_RADIUS   = 2.5;    // drawn dot size
const P_DOT_MIN_DISP = 14;     // px a char must travel before its dot is exposed
const P_ROW_BAND     = 22;     // Y half-range to detect "on this row"
const P_COL_BAND     = 26;     // X half-range for column-lane push
const P_INVINCIBLE_F = 150;
const P_DEAD_DELAY   = 90;

const P_DIRS = {
  right: { dx:  1, dy:  0 },
  left:  { dx: -1, dy:  0 },
  down:  { dx:  0, dy:  1 },
  up:    { dx:  0, dy: -1 },
};

/* ── State ───────────────────────────────────────────────────────── */
let pChars      = [];   // layout chars, each extended with offsetX / offsetY
let pDots       = [];   // parallel to pChars: { x, y, eaten }
let pDividers   = [];
let pParticles  = [];
let pPac        = null;
let pGhosts     = [];
let pLives      = 3;
let pDeadTimer  = 0;
let pPhase      = 'playing';
let pAnimId     = null;
let pScore      = 0;
let pKeys       = {};
let pTouchStart = null;

/* ── Helpers ─────────────────────────────────────────────────────── */
// Shortest signed displacement on a wrapped axis (handles offsetX that grew past W)
function pWrappedDisp(offset, span) {
  let d = ((offset % span) + span) % span;
  if (d > span / 2) d -= span;
  return d;
}

function pWrap(obj, r) {
  const pad = r + 4;
  if (obj.x < -pad)    obj.x = W + pad;
  if (obj.x > W + pad) obj.x = -pad;
  if (obj.y < -pad)    obj.y = H + pad;
  if (obj.y > H + pad) obj.y = -pad;
}

/* ═══════════════════════════════════════════════════════════════════
   LAYOUT
   ═══════════════════════════════════════════════════════════════════ */
function pBuildLayout() {
  const data = buildLayoutData(ctx, W, H);
  pDividers  = data.dividers;
  pChars     = data.chars;
  pDots      = pChars.map(ch => {
    ch.offsetX = 0;
    ch.offsetY = 0;
    return { x: ch._baseX + ch.w * 0.5, y: ch._baseY - ch.h * 0.5, eaten: false };
  });
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
  pChars      = [];
  pDots       = [];
  pDividers   = [];
  pParticles  = [];
  pLives      = 3;
  pDeadTimer  = 0;
  pPhase      = 'playing';
  pScore      = 0;
  pKeys       = {};
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
      pPhase     = 'playing';
      pParticles = [];
    }
    _pTickParticles();
    return;
  }

  const pac = pPac;

  // ── Apply queued / held direction (no walls, always succeeds immediately)
  if (pac.nextDir)       { pac.dir = pac.nextDir; pac.nextDir = null; }
  if      (pKeys.right)  { pac.dir = 'right'; pKeys.right = false; }
  else if (pKeys.left)   { pac.dir = 'left';  pKeys.left  = false; }
  else if (pKeys.down)   { pac.dir = 'down';  pKeys.down  = false; }
  else if (pKeys.up)     { pac.dir = 'up';    pKeys.up    = false; }

  // ── Move Pac-Man and wrap
  const d = P_DIRS[pac.dir];
  pac.x += d.dx * P_SPEED;
  pac.y += d.dy * P_SPEED;
  pWrap(pac, P_PAC_RADIUS);

  // ── Mouth animation
  pac.mouthAngle += pac.mouthDir * 0.04;
  if (pac.mouthAngle > 0.22) { pac.mouthAngle = 0.22; pac.mouthDir = -1; }
  if (pac.mouthAngle < 0.02) { pac.mouthAngle = 0.02; pac.mouthDir =  1; }

  // ── Invincibility countdown
  if (pac.invincible && --pac.invincibleTimer <= 0) pac.invincible = false;

  // ── Push row (horizontal) or column lane (vertical)
  if (d.dx !== 0) {
    // Moving horizontally: slide every char on the row Pac-Man is passing through
    for (const ch of pChars) {
      if (Math.abs(ch._baseY - pac.y) < P_ROW_BAND) {
        ch.offsetX += d.dx * P_SPEED;
      }
    }
  } else {
    // Moving vertically: slide chars whose horizontal center is near Pac-Man's X
    for (const ch of pChars) {
      if (Math.abs(ch._baseX + ch.w * 0.5 - pac.x) < P_COL_BAND) {
        ch.offsetY += d.dy * P_SPEED;
      }
    }
  }

  // ── Eat revealed dots
  for (let i = 0; i < pChars.length; i++) {
    const ch  = pChars[i];
    const dot = pDots[i];
    if (dot.eaten) continue;
    // A dot is hidden while its char still sits on top of it
    if (Math.abs(pWrappedDisp(ch.offsetX, W)) < P_DOT_MIN_DISP &&
        Math.abs(pWrappedDisp(ch.offsetY, H)) < P_DOT_MIN_DISP) continue;
    if (Math.hypot(pac.x - dot.x, pac.y - dot.y) < P_EAT_RADIUS) {
      dot.eaten = true;
      pScore   += 10;
      for (let j = 0; j < 4; j++) {
        const a = Math.random() * Math.PI * 2;
        const s = 0.8 + Math.random() * 2;
        pParticles.push({
          x: dot.x, y: dot.y,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: 1, decay: 0.07 + Math.random() * 0.06,
          r: 1 + Math.random(),
          color: P_DOT_COLOR,
        });
      }
    }
  }

  // ── Win
  if (pDots.length > 0 && pDots.every(dot => dot.eaten)) {
    pPhase = 'cleared';
    showScoreModal(pScore, 'pacman', null);
    return;
  }

  // ── Ghost update
  for (const g of pGhosts) {
    g.modeTimer--;
    if (g.modeTimer <= 0) {
      if (Math.hypot(g.x - pac.x, g.y - pac.y) < 220) {
        g.mode      = 'chase';
        g.modeTimer = 50 + Math.floor(Math.random() * 40);
      } else {
        g.mode      = 'scatter';
        g.modeTimer = 90 + Math.floor(Math.random() * 60);
        const dirs  = Object.keys(P_DIRS);
        g.dir       = dirs[Math.floor(Math.random() * dirs.length)];
      }
    }

    if (g.mode === 'chase') {
      const gdx = pac.x - g.x, gdy = pac.y - g.y;
      g.dir = Math.abs(gdx) > Math.abs(gdy)
        ? (gdx > 0 ? 'right' : 'left')
        : (gdy > 0 ? 'down'  : 'up');
    } else if (Math.random() < 0.012) {
      const dirs = Object.keys(P_DIRS);
      g.dir = dirs[Math.floor(Math.random() * dirs.length)];
    }

    const gd = P_DIRS[g.dir];
    g.x += gd.dx * g.speed;
    g.y += gd.dy * g.speed;
    pWrap(g, P_GHOST_RADIUS);

    if (!pac.invincible && Math.hypot(g.x - pac.x, g.y - pac.y) < P_GHOST_RADIUS + P_PAC_RADIUS - 4) {
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 2 + Math.random() * 4;
        pParticles.push({
          x: pac.x, y: pac.y,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: 1, decay: 0.03 + Math.random() * 0.04,
          r: 2 + Math.random() * 2,
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

  _pTickParticles();
}

function _pTickParticles() {
  for (let i = pParticles.length - 1; i >= 0; i--) {
    const p = pParticles[i];
    p.x    += p.vx;
    p.y    += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) pParticles.splice(i, 1);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   DRAW
   ═══════════════════════════════════════════════════════════════════ */
function pDraw() {
  ctx.fillStyle = P_BG;
  ctx.fillRect(0, 0, W, H);

  // ── Dividers (static structural guides, drawn faintly)
  ctx.strokeStyle = P_DIV_COLOR;
  ctx.lineWidth   = 1;
  for (const dv of pDividers) {
    ctx.beginPath();
    ctx.moveTo(dv.x, dv.y);
    ctx.lineTo(dv.x + dv.w, dv.y);
    ctx.stroke();
  }

  // ── Revealed uneaten dots
  ctx.fillStyle = P_DOT_COLOR;
  for (let i = 0; i < pChars.length; i++) {
    const ch  = pChars[i];
    const dot = pDots[i];
    if (dot.eaten) continue;
    if (Math.abs(pWrappedDisp(ch.offsetX, W)) < P_DOT_MIN_DISP &&
        Math.abs(pWrappedDisp(ch.offsetY, H)) < P_DOT_MIN_DISP) continue;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, P_DOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── CV chars at displaced (wrapped) positions
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign    = 'left';
  let lastFont = null, lastColor = null;
  for (const ch of pChars) {
    if (ch.font  !== lastFont)  { ctx.font      = ch.font;  lastFont  = ch.font;  }
    if (ch.color !== lastColor) { ctx.fillStyle = ch.color; lastColor = ch.color; }
    const drawX = ((ch._baseX + ch.offsetX) % W + W) % W;
    const drawY = ((ch._baseY + ch.offsetY) % H + H) % H;
    ctx.fillText(ch.char, drawX, drawY);
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

  // ── Pac-Man (blinks when invincible)
  if (pPac && pPhase !== 'dead') {
    const pac   = pPac;
    const blink = pac.invincible && Math.floor(Date.now() / 80) % 2 === 0;
    if (!blink) {
      const dirAngles = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
      const base      = dirAngles[pac.dir] || 0;
      ctx.save();
      ctx.fillStyle = P_PAC_COLOR;
      ctx.beginPath();
      ctx.moveTo(pac.x, pac.y);
      ctx.arc(pac.x, pac.y, P_PAC_RADIUS, base + pac.mouthAngle, base + Math.PI * 2 - pac.mouthAngle);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // ── HUD: lives + score
  const _pHudY = 50;
  for (let i = 0; i < 3; i++) {
    const lx = 26 + i * 24;
    ctx.save();
    if (i < pLives) {
      ctx.fillStyle = P_PAC_COLOR;
      ctx.beginPath();
      ctx.moveTo(lx, _pHudY);
      ctx.arc(lx, _pHudY, 8, 0.25, Math.PI * 2 - 0.25);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(247,37,133,0.2)';
      ctx.lineWidth   = 1.2;
      ctx.beginPath();
      ctx.arc(lx, _pHudY, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.save();
  ctx.font         = `600 12px ${FONT}`;
  ctx.fillStyle    = 'rgba(0,0,0,0.25)';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(pScore.toLocaleString(), 26 + 3 * 24 + 10, _pHudY);
  ctx.restore();

  // ── Overlays
  if (pPhase === 'cleared' || pPhase === 'gameover') {
    ctx.save();
    ctx.fillStyle = 'rgba(245,241,234,0.94)';
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
    } else {
      ctx.fillStyle = '#1e1a18';
      ctx.font      = `700 28px ${FONT}`;
      ctx.fillText('Game over.', W / 2, H / 2 - 20);
      ctx.fillStyle = '#8a8178';
      ctx.font      = `400 13px ${FONT}`;
      ctx.fillText(`Score: ${pScore.toLocaleString()}`, W / 2, H / 2 + 14);
    }
    ctx.fillStyle = '#bfb5aa';
    ctx.font      = `400 11px ${FONT}`;
    ctx.fillText('click to play again', W / 2, H / 2 + 38);
    ctx.restore();
  }
}

/* ── Ghost silhouette ────────────────────────────────────────────── */
function _pDrawGhost(x, y, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI, 0);
  ctx.lineTo(x + r, y + r * 1.15);
  const br = r / 3;
  ctx.arc(x + r - br, y + r * 1.15, br, 0, Math.PI, false);
  ctx.arc(x,          y + r * 1.15, br, 0, Math.PI, false);
  ctx.arc(x - r + br, y + r * 1.15, br, 0, Math.PI, false);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fill();
  // Eyes
  const ex = r * 0.32, ey = r * 0.1, erx = r * 0.22, ery = r * 0.28;
  ctx.fillStyle = 'rgba(245,241,234,0.9)';
  ctx.beginPath(); ctx.ellipse(x - ex, y - ey, erx, ery, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + ex, y - ey, erx, ery, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1e1a18';
  const pr = r * 0.1;
  ctx.beginPath(); ctx.arc(x - ex + erx * 0.25, y - ey, pr, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + ex + erx * 0.25, y - ey, pr, 0, Math.PI * 2); ctx.fill();
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
  pUpdate();
  pDraw();
  pAnimId = requestAnimationFrame(pLoop);
}

/* ═══════════════════════════════════════════════════════════════════
   INPUT
   ═══════════════════════════════════════════════════════════════════ */
function _pOnKeyDown(e) {
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') pKeys.right = true;
  if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') pKeys.left  = true;
  if (e.key === 'ArrowDown'  || e.key === 's' || e.key === 'S') pKeys.down  = true;
  if (e.key === 'ArrowUp'    || e.key === 'w' || e.key === 'W') pKeys.up    = true;
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
  if (Math.hypot(dx, dy) < 28) return;
  pPac.nextDir    = Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? 'right' : 'left')
    : (dy > 0 ? 'down'  : 'up');
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
  document.addEventListener('keydown',    _pOnKeyDown);
  canvas.addEventListener('touchstart',   _pOnTouchStart, { passive: false });
  canvas.addEventListener('touchmove',    _pOnTouchMove,  { passive: false });
  canvas.addEventListener('touchend',     _pOnTouchEnd,   { passive: false });
  canvas.addEventListener('click',        _pOnClick);
  pLoop();
}

function stopPacman() {
  cancelAnimationFrame(pAnimId);
  pAnimId     = null;
  pKeys       = {};
  pTouchStart = null;
  document.removeEventListener('keydown',    _pOnKeyDown);
  canvas.removeEventListener('touchstart',   _pOnTouchStart);
  canvas.removeEventListener('touchmove',    _pOnTouchMove);
  canvas.removeEventListener('touchend',     _pOnTouchEnd);
  canvas.removeEventListener('click',        _pOnClick);
}
