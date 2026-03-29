'use strict';

/* ═══════════════════════════════════════════════════════════════════
   CV BREAKER — the entire page is a canvas-rendered CV.
   Each character is a collideable object. A ball bounces from the
   bottom and knocks letters off the page.
   ═══════════════════════════════════════════════════════════════════ */

/* ── Canvas ───────────────────────────────────────────────────────── */
const canvas = document.getElementById('cv-canvas');
const ctx    = canvas.getContext('2d');
const DPR    = window.devicePixelRatio || 1;

let W = window.innerWidth;
let H = window.innerHeight;

/* ── Design tokens ────────────────────────────────────────────────── */
const BG        = '#f5f1ea';
const DIV_COLOR = 'rgba(0,0,0,0.1)';
// FONT, S, makeFont defined in layout.js (loaded first)

/* ── Physics constants ────────────────────────────────────────────── */
const BALL_R       = 7;
const BALL_SPEED   = 4.6;
const MIN_VY       = 2.2;
const PADDLE_W     = 120;
const PADDLE_H     = 5;
const B_LIVES_MAX  = 3;
const B_PTS        = 100;   // points per letter

/* ── State ────────────────────────────────────────────────────────── */
let chars     = [];
let dead      = [];
let particles = [];
let ripples   = [];
let dividers  = [];

let ball       = {};
let paddle     = {};
let bPhase     = 'playing';   // 'playing' | 'cleared' | 'gameover'
let bLives     = B_LIVES_MAX;
let bScore     = 0;
let bLaunched  = false;       // false = ball sitting on paddle waiting for click
let animId     = null;
let bStartTime = 0;

const keys    = { left: false, right: false };
let mouseX    = null;

/* ═══════════════════════════════════════════════════════════════════
   CANVAS INIT
   ═══════════════════════════════════════════════════════════════════ */
function initCanvas() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

/* ═══════════════════════════════════════════════════════════════════
   LAYOUT
   ═══════════════════════════════════════════════════════════════════ */
function buildLayout() {
  const data = buildLayoutData(ctx, W, H);
  chars    = data.chars;
  dividers = data.dividers;
}

// Paddle Y: high enough to clear the bottom switcher pill (bottom:20px, ~37px tall)
// and leave room for the ball + "click to launch" label above the paddle.
function bPaddleY() {
  return H - 120;
}

/* ═══════════════════════════════════════════════════════════════════
   PHYSICS INIT
   ═══════════════════════════════════════════════════════════════════ */
function initPhysics() {
  paddle = {
    x: W / 2 - PADDLE_W / 2,
    y: bPaddleY(),
    w: PADDLE_W,
    h: PADDLE_H,
  };

  const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 3);
  ball = {
    x:     W / 2,
    y:     H - 80,
    vx:    Math.cos(angle) * BALL_SPEED,
    vy:    Math.sin(angle) * BALL_SPEED,
    r:     BALL_R,
    trail: [],
  };

  dead      = [];
  particles = [];
  ripples   = [];
  bPhase    = 'playing';
  bLives    = B_LIVES_MAX;
  bScore    = 0;
  bLaunched = false;
  bStartTime = Date.now();
}

/* ── Launch ball from paddle ────────────────────────────────────── */
function bLaunch() {
  const a = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 3);
  ball.vx   = Math.cos(a) * BALL_SPEED;
  ball.vy   = Math.sin(a) * BALL_SPEED;
  enforceMinVY();
  bLaunched = true;
}

/* ═══════════════════════════════════════════════════════════════════
   COLLISION — circle vs axis-aligned rect
   ═══════════════════════════════════════════════════════════════════ */
function circleAABB(cx, cy, r, rx, ry, rw, rh) {
  const nx = Math.max(rx, Math.min(cx, rx + rw));
  const ny = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

/* ═══════════════════════════════════════════════════════════════════
   KILL CHAR — eject with physics and spawn sparks
   ═══════════════════════════════════════════════════════════════════ */
function killChar(ch) {
  ch.alive = false;
  bScore  += B_PTS;

  const speed = 3 + Math.random() * 7;
  const angle = Math.atan2(ball.vy, ball.vx) + (Math.random() - 0.5) * 1.4;

  dead.push({
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
    particles.push({
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

  // Water ripple — two concentric rings expanding from the letter's center
  const rx = ch.x + ch.w * 0.5;
  const ry = ch.y - ch.h * 0.5;
  for (let i = 0; i < 2; i++) {
    ripples.push({ x: rx, y: ry, r: 4, maxR: 40 + i * 22, alpha: 0.55 - i * 0.12, delay: i * 5 });
  }
}

/* ── Prevent nearly-horizontal ball ──────────────────────────────── */
function enforceMinVY() {
  if (Math.abs(ball.vy) < MIN_VY) {
    ball.vy = MIN_VY * (ball.vy <= 0 ? -1 : 1);
    const mag = Math.hypot(ball.vx, ball.vy);
    ball.vx = (ball.vx / mag) * BALL_SPEED;
    ball.vy = (ball.vy / mag) * BALL_SPEED;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   UPDATE
   ═══════════════════════════════════════════════════════════════════ */
function update() {
  if (bPhase !== 'playing') return;

  // ── Paddle
  if (mouseX !== null) {
    paddle.x = mouseX - paddle.w / 2;
  } else {
    if (keys.left)  paddle.x -= 6;
    if (keys.right) paddle.x += 6;
  }
  paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

  // ── Ball sits on paddle until launched
  if (!bLaunched) {
    ball.x     = paddle.x + paddle.w / 2;
    ball.y     = paddle.y - ball.r - 2;
    ball.trail = [];
    return;
  }

  // ── Ball trail
  ball.trail.unshift({ x: ball.x, y: ball.y });
  if (ball.trail.length > 8) ball.trail.pop();

  // ── Move ball
  const prevX = ball.x, prevY = ball.y;
  ball.x += ball.vx;
  ball.y += ball.vy;

  // ── Wall collisions
  if (ball.x - ball.r < 0)  { ball.x = ball.r;     ball.vx =  Math.abs(ball.vx); }
  if (ball.x + ball.r > W)  { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
  if (ball.y - ball.r < 0)  { ball.y = ball.r;      ball.vy =  Math.abs(ball.vy); }

  // ── Out of bottom — lose a life
  if (ball.y - ball.r > H) {
    bLives--;
    if (bLives <= 0) {
      bPhase = 'gameover';
      showScoreModal(bScore, 'breaker', null);
      return;
    }
    bLaunched  = false;
    ball.trail = [];
  }

  // ── Paddle collision
  if (
    ball.vy > 0 &&
    ball.y + ball.r >= paddle.y &&
    ball.y + ball.r <= paddle.y + paddle.h + Math.abs(ball.vy) + 1 &&
    ball.x + ball.r > paddle.x &&
    ball.x - ball.r < paddle.x + paddle.w
  ) {
    ball.y = paddle.y - ball.r;
    const hitPos   = (ball.x - paddle.x) / paddle.w;
    const maxAngle = Math.PI * 0.33;
    const angle    = -Math.PI / 2 + (hitPos - 0.5) * 2 * maxAngle;
    ball.vx = Math.cos(angle) * BALL_SPEED;
    ball.vy = Math.sin(angle) * BALL_SPEED;
    enforceMinVY();
  }

  // ── Character collisions
  let reflectDone = false;

  for (const ch of chars) {
    if (!ch.alive) continue;
    if (!circleAABB(ball.x, ball.y, ball.r, ch.x, ch.y - ch.h, ch.w, ch.h)) continue;

    killChar(ch);

    if (!reflectDone) {
      reflectDone = true;
      const wasOverX = prevX + ball.r > ch.x        && prevX - ball.r < ch.x + ch.w;
      const wasOverY = prevY + ball.r > ch.y - ch.h && prevY - ball.r < ch.y;
      if      (wasOverX && !wasOverY) ball.vy = -ball.vy;
      else if (!wasOverX && wasOverY) ball.vx = -ball.vx;
      else { ball.vx = -ball.vx; ball.vy = -ball.vy; }
      enforceMinVY();
    }
  }

  // ── Win condition
  if (chars.every(c => !c.alive)) {
    bPhase = 'cleared';
    showScoreModal(bScore, 'breaker', null);
  }

  // ── Dead chars physics
  for (let i = dead.length - 1; i >= 0; i--) {
    const d = dead[i];
    d.ex    += d.evx;
    d.ey    += d.evy;
    d.evy   += 0.38;
    d.evx   *= 0.985;
    d.erot  += d.espin;
    d.ealpha -= 0.014;
    if (d.ealpha <= 0) dead.splice(i, 1);
  }

  // ── Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x    += p.vx;
    p.y    += p.vy;
    p.vy   += 0.18;
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // ── Ripples
  for (let i = ripples.length - 1; i >= 0; i--) {
    const rp = ripples[i];
    if (rp.delay > 0) { rp.delay--; continue; }
    rp.r     += (rp.maxR - rp.r) * 0.12;
    rp.alpha -= 0.022;
    if (rp.alpha <= 0) ripples.splice(i, 1);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   DRAW
   ═══════════════════════════════════════════════════════════════════ */
function draw() {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // ── Ripples
  for (const rp of ripples) {
    if (rp.delay > 0) continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, rp.alpha);
    ctx.strokeStyle = '#f72585';
    ctx.lineWidth   = 1.2;
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ── Dividers
  ctx.strokeStyle = DIV_COLOR;
  ctx.lineWidth   = 1;
  for (const d of dividers) {
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x + d.w, d.y);
    ctx.stroke();
  }

  // ── Dead chars
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  for (const d of dead) {
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
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Alive characters
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign    = 'left';
  let lastFont = null, lastColor = null;
  for (const ch of chars) {
    if (!ch.alive) continue;
    if (ch.font  !== lastFont)  { ctx.font      = ch.font;  lastFont  = ch.font;  }
    if (ch.color !== lastColor) { ctx.fillStyle = ch.color; lastColor = ch.color; }
    ctx.fillText(ch.char, ch.x, ch.y);
  }

  // ── Ball trail
  for (let i = ball.trail.length - 1; i >= 0; i--) {
    const t = 1 - i / ball.trail.length;
    ctx.save();
    ctx.globalAlpha = t * 0.18;
    ctx.fillStyle   = '#f72585';
    ctx.beginPath();
    ctx.arc(ball.trail[i].x, ball.trail[i].y, ball.r * (0.4 + t * 0.6), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Ball
  ctx.save();
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r + 6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(247,37,133,0.1)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle   = '#f72585';
  ctx.shadowColor = '#f72585';
  ctx.shadowBlur  = 14;
  ctx.fill();
  ctx.restore();

  // ── Paddle
  ctx.save();
  ctx.fillStyle = '#1e1a18';
  pillRect(paddle.x, paddle.y, paddle.w, paddle.h);
  ctx.fill();
  ctx.restore();

  // ── Launch hint
  if (!bLaunched && bPhase === 'playing') {
    ctx.save();
    ctx.font         = `400 12px ${FONT}`;
    ctx.fillStyle    = 'rgba(0,0,0,0.28)';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('click to launch', W / 2, paddle.y - 22);
    ctx.restore();
  }

  // ── HUD: lives (small balls) + score — top-left
  if (bPhase === 'playing') {
    const ly = 50;
    for (let i = 0; i < B_LIVES_MAX; i++) {
      ctx.save();
      ctx.globalAlpha = i < bLives ? 0.7 : 0.15;
      ctx.beginPath();
      ctx.arc(22 + i * 18, ly, 5, 0, Math.PI * 2);
      ctx.fillStyle   = '#f72585';
      ctx.shadowColor = '#f72585';
      ctx.shadowBlur  = i < bLives ? 8 : 0;
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.font         = `600 12px ${FONT}`;
    ctx.fillStyle    = 'rgba(0,0,0,0.25)';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(bScore.toLocaleString(), 22 + B_LIVES_MAX * 18 + 10, ly);
    ctx.restore();
  }

  // ── End screen
  if (bPhase === 'cleared' || bPhase === 'gameover') {
    ctx.save();
    ctx.fillStyle = 'rgba(245,241,234,0.94)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    if (bPhase === 'cleared') {
      ctx.fillStyle = '#1e1a18';
      ctx.font      = `700 28px ${FONT}`;
      ctx.fillText('Hire me anyway?', W / 2, H / 2 - 20);
      ctx.font      = `400 13px ${FONT}`;
      ctx.fillStyle = '#8a8178';
      ctx.fillText('benjamin.m.stern@gmail.com', W / 2, H / 2 + 14);
    } else {
      ctx.fillStyle = '#1e1a18';
      ctx.font      = `700 28px ${FONT}`;
      ctx.fillText('Game Over', W / 2, H / 2 - 20);
      ctx.font      = `400 13px ${FONT}`;
      ctx.fillStyle = '#8a8178';
      ctx.fillText(`Score: ${bScore.toLocaleString()}`, W / 2, H / 2 + 14);
    }
    ctx.font      = `400 11px ${FONT}`;
    ctx.fillStyle = '#bfb5aa';
    ctx.fillText('click to play again', W / 2, H / 2 + 38);
    ctx.restore();
  }
}

/* ── Pill-shaped rect path ───────────────────────────────────────── */
function pillRect(x, y, w, h) {
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + r, r, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
}

/* ═══════════════════════════════════════════════════════════════════
   LOOP
   ═══════════════════════════════════════════════════════════════════ */
function loop() {
  // Smooth canvas resize — runs inline each frame so there's no debounce delay
  const newW = window.innerWidth, newH = window.innerHeight;
  if (newW !== W || newH !== H) {
    W = newW; H = newH;
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    paddle.y = bPaddleY();
    paddle.x = Math.min(paddle.x, W - paddle.w);
    if (!bLaunched) {
      ball.x = paddle.x + paddle.w / 2;
      ball.y = paddle.y - ball.r - 2;
    } else {
      ball.x = Math.max(ball.r, Math.min(W - ball.r, ball.x));
      ball.y = Math.max(ball.r, Math.min(H - ball.r, ball.y));
    }
  }
  update();
  draw();
  animId = requestAnimationFrame(loop);
}

/* ═══════════════════════════════════════════════════════════════════
   INPUT HANDLERS
   ═══════════════════════════════════════════════════════════════════ */
function _bOnKeyDown(e) {
  if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') keys.left  = true;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
}
function _bOnKeyUp(e) {
  if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') keys.left  = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
}
function _bOnMouseMove(e) { mouseX = e.clientX; }
function _bOnTouchMove(e) {
  e.preventDefault();
  mouseX = e.touches[0].clientX;
}
function _bOnTouchEnd() {
  if (!bLaunched && bPhase === 'playing') {
    bLaunch();
  }
  mouseX = null;
}
function _bOnClick() {
  if (!bLaunched && bPhase === 'playing') {
    bLaunch();
    return;
  }
  if ((bPhase === 'cleared' || bPhase === 'gameover') && !window.scoreModalOpen) {
    buildLayout();
    initPhysics();
  }
}

/* ═══════════════════════════════════════════════════════════════════
   START / STOP
   ═══════════════════════════════════════════════════════════════════ */
function startBreaker() {
  initCanvas();
  buildLayout();
  initPhysics();
  document.addEventListener('keydown',   _bOnKeyDown);
  document.addEventListener('keyup',     _bOnKeyUp);
  document.addEventListener('mousemove', _bOnMouseMove);
  canvas.addEventListener('touchmove',   _bOnTouchMove, { passive: false });
  canvas.addEventListener('touchend',    _bOnTouchEnd);
  canvas.addEventListener('click',       _bOnClick);
  loop();
}

function stopBreaker() {
  cancelAnimationFrame(animId);
  animId     = null;
  keys.left  = false;
  keys.right = false;
  mouseX     = null;
  document.removeEventListener('keydown',   _bOnKeyDown);
  document.removeEventListener('keyup',     _bOnKeyUp);
  document.removeEventListener('mousemove', _bOnMouseMove);
  canvas.removeEventListener('touchmove',   _bOnTouchMove);
  canvas.removeEventListener('touchend',    _bOnTouchEnd);
  canvas.removeEventListener('click',       _bOnClick);
}
