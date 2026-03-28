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
const BG        = '#f7f6f3';
const DIV_COLOR = 'rgba(0,0,0,0.1)';
const FONT      = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

// Each style: { weight, size (px), color }
const S = {
  name:    { weight: 700, size: 44,  color: '#0a0a0a' },
  title:   { weight: 400, size: 16,  color: '#2d2d2d' },
  meta:    { weight: 400, size: 12,  color: '#9a9a9a' },
  section: { weight: 700, size: 10,  color: '#b8b8b8' },  // uppercase labels
  org:     { weight: 600, size: 14,  color: '#111111' },
  role:    { weight: 400, size: 13,  color: '#4a4a4a' },
  detail:  { weight: 400, size: 11,  color: '#8a8a8a' },
  period:  { weight: 400, size: 12,  color: '#c5c5c5' },
};

function makeFont(s) { return `${s.weight} ${s.size}px ${FONT}`; }

/* ── Physics constants ────────────────────────────────────────────── */
const BALL_R       = 7;
const BALL_SPEED   = 4.6;
const MIN_VY       = 2.2;
const PADDLE_W     = 120;
const PADDLE_H     = 5;

/* ── State ────────────────────────────────────────────────────────── */
let chars     = [];   // alive character objects
let dead      = [];   // exploding character objects
let particles = [];   // small dot sparks
let dividers  = [];   // horizontal rule positions

let ball      = {};
let paddle    = {};
let cleared   = false;
let animId    = null;

const keys    = { left: false, right: false };
let mouseX    = null;

/* ═══════════════════════════════════════════════════════════════════
   CANVAS INIT
   ═══════════════════════════════════════════════════════════════════ */
function initCanvas() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width        = W * DPR;
  canvas.height       = H * DPR;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

/* ═══════════════════════════════════════════════════════════════════
   LAYOUT — measures and places every character
   ═══════════════════════════════════════════════════════════════════ */
function buildLayout() {
  chars    = [];
  dividers = [];

  const contentW = Math.min(680, W - 80);
  const lx       = (W - contentW) / 2;
  const rx       = lx + contentW;

  let y = 0; // we'll shift everything to center vertically at the end

  /*
   * addText — add collideable characters for a string.
   *   align:   'left' | 'right'
   *   spacing: extra px between characters (for tracked section labels)
   */
  function addText(text, baseX, baseY, style, align = 'left', spacing = 0) {
    const fnt = makeFont(style);
    ctx.font  = fnt;
    const str = (style === S.section) ? text.toUpperCase() : text;

    let curX = baseX;
    if (align === 'right') {
      let total = 0;
      for (const c of str) total += ctx.measureText(c).width + spacing;
      total -= spacing;
      curX = baseX - total;
    }

    for (const c of str) {
      const cw = ctx.measureText(c).width;
      if (c.trim() !== '') {
        chars.push({
          char:  c,
          x:     curX,
          y:     baseY,     // canvas baseline (fillText y)
          w:     cw,
          h:     style.size, // approximate cap height — used for collision
          font:  fnt,
          color: style.color,
          alive: true,
        });
      }
      curX += cw + spacing;
    }
  }

  // ── Name
  addText('Ben Stern', lx, y, S.name);
  y += 54;

  // ── Current title
  addText('VP of Product, Growth & Monetization', lx, y, S.title);
  y += 22;

  // ── Meta line
  addText('Figma  ·  Greater Philadelphia  ·  benjamin.m.stern@gmail.com', lx, y, S.meta);
  y += 30;

  // ── Divider
  dividers.push({ x: lx, y, w: contentW });
  y += 22;

  // ── EXPERIENCE ──────────────────────────────────────────────────
  addText('Experience', lx, y, S.section, 'left', 1.5);
  y += 26;

  // Figma
  addText('Figma', lx, y, S.org);
  addText('2019 – Present', rx, y, S.period, 'right');
  y += 20;
  addText('VP of Product  ·  Director, Monetization  ·  Director, Teamwork', lx, y, S.role);
  y += 17;
  addText('Group PM  ·  PM Lead  ·  Senior PM', lx, y, S.detail);
  y += 26;

  // Dropbox
  addText('Dropbox', lx, y, S.org);
  addText('2015 – 2019', rx, y, S.period, 'right');
  y += 20;
  addText('Product Manager  ·  Enterprise Solutions Architect  ·  Account Executive', lx, y, S.role);
  y += 26;

  // TeachBoost
  addText('TeachBoost', lx, y, S.org);
  addText('2014 – 2015', rx, y, S.period, 'right');
  y += 20;
  addText('Director of Educational Partnerships', lx, y, S.role);
  y += 26;

  // EdSurge etc.
  addText('EdSurge  ·  Ponder Labs  ·  Council on Foreign Relations', lx, y, S.org);
  addText('2012 – 2015', rx, y, S.period, 'right');
  y += 20;
  addText('Contributor  ·  Advisor  ·  Edtech Consultant', lx, y, S.role);
  y += 26;

  // Teaching
  addText('Trinity School NYC  ·  Emery/Weiner School', lx, y, S.org);
  addText('2009 – 2014', rx, y, S.period, 'right');
  y += 20;
  addText('Teacher  ·  Edtech Coordinator', lx, y, S.role);
  y += 30;

  // ── Divider
  dividers.push({ x: lx, y, w: contentW });
  y += 22;

  // ── EDUCATION ───────────────────────────────────────────────────
  addText('Education', lx, y, S.section, 'left', 1.5);
  y += 26;

  addText('Bowdoin College', lx, y, S.org);
  addText('2005 – 2009', rx, y, S.period, 'right');
  y += 20;
  addText('B.A. Government & Legal Studies', lx, y, S.role);
  y += 30;

  // ── Divider
  dividers.push({ x: lx, y, w: contentW });
  y += 22;

  // ── SKILLS ──────────────────────────────────────────────────────
  addText('Skills & Recognition', lx, y, S.section, 'left', 1.5);
  y += 26;

  addText('Curriculum Design  ·  Educational Technology  ·  Teaching  ·  Product Strategy', lx, y, S.role);
  y += 18;
  addText('Rav Preida Award for Teaching Excellence  ·  Dropbox Assignments (2 patents pending)', lx, y, S.detail);
  y += 16;
  addText('Published on EdSurge  ·  Board Member: Mouse, Code/Interactive', lx, y, S.detail);

  const contentH = y + 20;

  // Center content vertically
  const offsetY = Math.max(54, (H - contentH) / 2);
  for (const ch of chars)    ch.y += offsetY;
  for (const d  of dividers) d.y  += offsetY;
}

/* ═══════════════════════════════════════════════════════════════════
   PHYSICS INIT
   ═══════════════════════════════════════════════════════════════════ */
function initPhysics() {
  paddle = {
    x: W / 2 - PADDLE_W / 2,
    y: H - 44,
    w: PADDLE_W,
    h: PADDLE_H,
  };

  // Launch ball upward with a random slight angle
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 3);
  ball = {
    x:  W / 2,
    y:  H - 80,
    vx: Math.cos(angle) * BALL_SPEED,
    vy: Math.sin(angle) * BALL_SPEED,
    r:  BALL_R,
    // Trail
    trail: [],
  };

  dead      = [];
  particles = [];
  cleared   = false;
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

  // Spark particles
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
  if (cleared) return;

  // ── Paddle
  if (mouseX !== null) {
    paddle.x = mouseX - paddle.w / 2;
  } else {
    if (keys.left)  paddle.x -= 6;
    if (keys.right) paddle.x += 6;
  }
  paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

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

  // ── Out of bottom — relaunch from paddle
  if (ball.y - ball.r > H) {
    ball.x      = paddle.x + paddle.w / 2;
    ball.y      = paddle.y - ball.r - 2;
    ball.trail  = [];
    const a     = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 4);
    ball.vx     = Math.cos(a) * BALL_SPEED;
    ball.vy     = Math.sin(a) * BALL_SPEED;
    enforceMinVY();
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
    const hitPos   = (ball.x - paddle.x) / paddle.w; // 0..1
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
    // Character rect: top = y - h (y is baseline, h ≈ cap height)
    if (!circleAABB(ball.x, ball.y, ball.r, ch.x, ch.y - ch.h, ch.w, ch.h)) continue;

    killChar(ch);

    if (!reflectDone) {
      reflectDone = true;
      // Use pre-move position to determine which face was hit
      const wasOverX = prevX + ball.r > ch.x          && prevX - ball.r < ch.x + ch.w;
      const wasOverY = prevY + ball.r > ch.y - ch.h   && prevY - ball.r < ch.y;
      if      (wasOverX && !wasOverY) ball.vy = -ball.vy;
      else if (!wasOverX && wasOverY) ball.vx = -ball.vx;
      else { ball.vx = -ball.vx; ball.vy = -ball.vy; }
      enforceMinVY();
    }
  }

  // ── Win condition
  if (chars.every(c => !c.alive)) cleared = true;

  // ── Dead chars physics
  for (let i = dead.length - 1; i >= 0; i--) {
    const d = dead[i];
    d.ex    += d.evx;
    d.ey    += d.evy;
    d.evy   += 0.38;   // gravity
    d.evx   *= 0.985;  // drag
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
}

/* ═══════════════════════════════════════════════════════════════════
   DRAW
   ═══════════════════════════════════════════════════════════════════ */
function draw() {
  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // ── Dividers
  ctx.strokeStyle = DIV_COLOR;
  ctx.lineWidth   = 1;
  for (const d of dividers) {
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x + d.w, d.y);
    ctx.stroke();
  }

  // ── Dead chars (flying off with spin)
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

  // ── Alive characters (batch by font+color to minimise state changes)
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
  // Soft glow
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r + 6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(247,37,133,0.1)';
  ctx.fill();
  // Body
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle   = '#f72585';
  ctx.shadowColor = '#f72585';
  ctx.shadowBlur  = 14;
  ctx.fill();
  ctx.restore();

  // ── Paddle — thin rounded bar
  ctx.save();
  ctx.fillStyle = '#1a1a1a';
  pillRect(paddle.x, paddle.y, paddle.w, paddle.h);
  ctx.fill();
  ctx.restore();

  // ── Cleared screen
  if (cleared) {
    ctx.save();
    // Fade-in white wash
    ctx.fillStyle = 'rgba(247,246,243,0.94)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle    = '#0a0a0a';
    ctx.font         = `700 28px ${FONT}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Hire me anyway?', W / 2, H / 2 - 20);
    ctx.font      = `400 13px ${FONT}`;
    ctx.fillStyle = '#9a9a9a';
    ctx.fillText('benjamin.m.stern@gmail.com', W / 2, H / 2 + 14);
    ctx.font      = `400 11px ${FONT}`;
    ctx.fillStyle = '#c5c5c5';
    ctx.fillText('click to restore', W / 2, H / 2 + 38);
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
function _bOnTouchEnd() { mouseX = null; }
function _bOnClick() {
  if (cleared) { buildLayout(); initPhysics(); }
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
