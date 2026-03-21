'use strict';

/* ── CV data ─────────────────────────────────────────────────────────
   Each entry becomes one brick.
   category → colour family; label → short brick text; detail → tooltip
───────────────────────────────────────────────────────────────────── */
const CV_DATA = [
  // ── Experience: Figma ───────────────────────────────────────────────
  { category: 'exp',   label: 'VP of Product',      detail: 'VP of Product, Growth & Monetization @ Figma (Oct 2025–Present)' },
  { category: 'exp',   label: 'Sr. Dir Monetiz.',   detail: 'Sr. Director of Product, Monetization @ Figma (Apr–Oct 2025)' },
  { category: 'exp',   label: 'Dir Monetization',   detail: 'Director of Product, Monetization @ Figma (Aug 2024–Apr 2025)' },
  { category: 'exp',   label: 'Dir Teamwork',       detail: 'Director of Product, Teamwork @ Figma (Oct 2022–Aug 2024) · Greater Philadelphia' },
  { category: 'exp',   label: 'Group PM',           detail: 'Group PM @ Figma (Sep 2021–Oct 2022) · Enterprise team: admin, billing & permissions' },
  { category: 'exp',   label: 'PM Lead',            detail: 'PM Lead @ Figma (Mar 2020–Sep 2021) · Manager & IC for Enterprise team in SF' },
  { category: 'exp',   label: 'Senior PM',          detail: 'Senior PM @ Figma (Sep 2019–Mar 2020) · Enterprise: admin, billing & permissions' },

  // ── Experience: Dropbox ─────────────────────────────────────────────
  { category: 'exp',   label: 'PM @ Dropbox',       detail: 'Product Manager @ Dropbox (Jun 2017–Aug 2019) · Core sharing, Dropbox Transfer, Showcase & collaboration' },
  { category: 'exp',   label: 'Solutions Arch.',    detail: 'Enterprise Solutions Architect @ Dropbox (Nov 2015–Jun 2017) · Led Higher Ed SA team; bridged customers & engineering' },
  { category: 'exp',   label: 'Account Exec',       detail: 'Account Executive @ Dropbox (Apr–Nov 2015) · K-12 go-to-market; Hack Week project led to two patents (pending)' },

  // ── Experience: Earlier ─────────────────────────────────────────────
  { category: 'exp',   label: 'Dir Ed. Partner.',   detail: 'Director of Educational Partnerships @ TeachBoost (May 2014–Apr 2015) · Closed first school district deals; co-built product roadmap with CEO' },
  { category: 'exp',   label: 'EdSurge Writer',     detail: 'Contributor @ EdSurge (2012–Mar 2015) · Thought leadership on edtech trends; top-3 most-read article in 2013' },
  { category: 'exp',   label: 'Ponder Labs',        detail: 'Advisor @ Ponder Labs (May 2013–2015) · Product & GTM advice for early-stage edtech startup · Brooklyn, NY' },
  { category: 'exp',   label: 'CFR Consultant',     detail: 'Edtech Consultant @ Council on Foreign Relations (Jun 2013–Jul 2014) · Advised on blended-learning initiative' },
  { category: 'exp',   label: 'Trinity Edtech',     detail: 'Edtech Coordinator @ Trinity School NYC (Jun 2012–Jun 2014) · Built vision for technology transformation in education' },
  { category: 'exp',   label: 'Teacher & Coach',    detail: 'Teacher & Edtech Coordinator @ Emery/Weiner School, Houston (Jun 2009–Jun 2012) · Overhauled curriculum & tech infrastructure; won Rav Preida Award' },

  // ── Education ───────────────────────────────────────────────────────
  { category: 'edu',   label: 'Bowdoin College',    detail: 'B.A. Government & Legal Studies · Bowdoin College (2005–2009)' },

  // ── Skills ──────────────────────────────────────────────────────────
  { category: 'skill', label: 'Curriculum Design',  detail: 'Top Skill: Curriculum Design — from classroom teacher to curriculum architect' },
  { category: 'skill', label: 'Edtech',             detail: 'Top Skill: Educational Technology — spanning classroom, startup, and enterprise' },
  { category: 'skill', label: 'Teaching',           detail: 'Top Skill: Teaching — started as a teacher, still explains things clearly' },
  { category: 'skill', label: 'Cybersecurity',      detail: 'Cert: Cybersecurity and the X-Factor · Cybersecurity & IoT · Cybersecurity & Mobility' },
  { category: 'skill', label: 'Front-End Dev',      detail: 'Cert: Build Front-End Web Apps from Scratch — and apparently that includes brick-breaker games' },

  // ── Publications ────────────────────────────────────────────────────
  { category: 'proj',  label: 'Leap to Edtech',     detail: '"Five Tips for Making the Leap from Teaching to Edtech" — published on EdSurge' },
  { category: 'proj',  label: 'Teachers in Edtech', detail: '"A Role for Teachers in Every Edtech Startup" — published on EdSurge' },
  { category: 'proj',  label: 'Best Unit Ever',     detail: '"The Best Unit I\'ve Ever Taught (By Accident)" — published on EdSurge' },
  { category: 'proj',  label: 'Textbook Obstacle?', detail: '"Part II: Are textbooks an obstacle to learning?" — published on EdSurge' },
  { category: 'proj',  label: 'IT Calling Shots',   detail: '"Your School\'s IT Department Is Calling the Big Shots Now" — published on EdSurge' },

  // ── Awards & Volunteering ───────────────────────────────────────────
  { category: 'misc',  label: 'Rav Preida Award',   detail: 'Rav Preida Award for Teaching Excellence — Emery/Weiner School' },
  { category: 'misc',  label: 'Code/Interactive',   detail: 'Associate Board Member @ C/I - Code/Interactive (2018) · Youth digital literacy nonprofit' },
  { category: 'misc',  label: 'Mouse Volunteer',    detail: 'Associate Board Member @ Mouse (2018) · Nonprofit expanding CS education access' },
];

/* ── Colour palette per category ──────────────────────────────────── */
const CATEGORY_COLORS = {
  exp:   { fill: '#c9184a', stroke: '#ff4d6d', glow: '#ff4d6d' },
  edu:   { fill: '#7209b7', stroke: '#b44fe8', glow: '#b44fe8' },
  skill: { fill: '#3a0ca3', stroke: '#7b5ef8', glow: '#7b5ef8' },
  proj:  { fill: '#1d4ed8', stroke: '#60a5fa', glow: '#60a5fa' },
  misc:  { fill: '#0e7490', stroke: '#22d3ee', glow: '#22d3ee' },
};

/* ── DOM refs ─────────────────────────────────────────────────────── */
const canvas     = document.getElementById('game-canvas');
const ctx        = canvas.getContext('2d');
const overlay    = document.getElementById('game-overlay');
const overlayBtn = document.getElementById('overlay-btn');
const titleEl    = document.getElementById('overlay-title');
const msgEl      = document.getElementById('overlay-msg');
const scoreEl    = document.getElementById('score');
const livesEl    = document.getElementById('lives');
const tooltip    = document.getElementById('brick-tooltip');

/* ── Game constants ───────────────────────────────────────────────── */
const W = 780;
const H = 585;

const ROWS            = 5;
const COLS            = 8;
const BRICK_PAD       = 6;
const BRICK_TOP       = 52;   // y offset for first row (clears score bar)
const BRICK_H         = 28;

const PADDLE_W        = 110;
const PADDLE_H        = 12;
const PADDLE_Y        = H - 38;
const PADDLE_SPEED    = 7;

const BALL_R          = 8;
const BALL_SPEED_INIT = 5.5;
const BALL_SPEED_MAX  = 10;
const SPEED_UP_EVERY  = 5;    // speed bump every N bricks broken
const SPEED_INCREMENT = 0.2;
const MIN_VY          = 2.8;  // prevent near-horizontal ball

const TRAIL_LEN       = 7;
const PARTICLES_N     = 12;

/* ── Mutable state ────────────────────────────────────────────────── */
let bricks    = [];
let particles = [];
let trail     = [];

let ball    = {};
let paddle  = {};

let score          = 0;
let lives          = 3;
let bricksDestroyed = 0;
let currentSpeed   = BALL_SPEED_INIT;

let running   = false;
let launching = true;   // ball is resting on the paddle, not yet launched
let animId    = null;

const keys = { left: false, right: false };
let mouseX = null;

/* ─────────────────────────────────────────────────────────────────── */
/* ── Canvas                                                         ── */
/* ─────────────────────────────────────────────────────────────────── */
function resizeCanvas() {
  canvas.width  = W;
  canvas.height = H;
}

/* ─────────────────────────────────────────────────────────────────── */
/* ── Brick grid                                                     ── */
/* ─────────────────────────────────────────────────────────────────── */
function buildBricks() {
  bricks = [];
  // Shuffle so categories are mixed across the grid
  const pool = [...CV_DATA].sort(() => Math.random() - 0.5);
  const brickW = (W - BRICK_PAD * (COLS + 1)) / COLS;

  let idx = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const entry = pool[idx % pool.length]; idx++;
      bricks.push({
        x: BRICK_PAD + c * (brickW + BRICK_PAD),
        y: BRICK_TOP  + r * (BRICK_H  + BRICK_PAD),
        w: brickW,
        h: BRICK_H,
        label:  entry.label,
        detail: entry.detail,
        color:  CATEGORY_COLORS[entry.category] ?? CATEGORY_COLORS.misc,
        alive:  true,
      });
    }
  }
}

/* ─────────────────────────────────────────────────────────────────── */
/* ── Ball & paddle                                                  ── */
/* ─────────────────────────────────────────────────────────────────── */
function initPaddle() {
  paddle = { x: W / 2 - PADDLE_W / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
  mouseX = null;
}

function initBall() {
  ball = {
    x: paddle.x + paddle.w / 2,
    y: paddle.y - BALL_R - 1,
    vx: 0,
    vy: 0,
    r:  BALL_R,
  };
  trail     = [];
  launching = true;
}

function launchBall() {
  if (!launching || !running) return;
  launching = false;
  // Random angle between -75° and -105° (upward, slightly left or right)
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 4);
  ball.vx = Math.cos(angle) * currentSpeed;
  ball.vy = Math.sin(angle) * currentSpeed;
  enforceMinVY();
}

/* ─────────────────────────────────────────────────────────────────── */
/* ── Physics helpers                                                ── */
/* ─────────────────────────────────────────────────────────────────── */

// Circle vs AABB test — returns true if colliding
function circleAABB(cx, cy, r, rx, ry, rw, rh) {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy < r * r;
}

// Ensure |vy| is always meaningful (prevents horizontal skating)
function enforceMinVY() {
  if (Math.abs(ball.vy) < MIN_VY) {
    ball.vy = MIN_VY * (ball.vy <= 0 ? -1 : 1);
    // Re-normalise to current speed
    const mag = Math.hypot(ball.vx, ball.vy);
    if (mag > 0) {
      ball.vx = (ball.vx / mag) * currentSpeed;
      ball.vy = (ball.vy / mag) * currentSpeed;
    }
  }
}

// Scale ball velocity to currentSpeed without changing direction
function applyCurrentSpeed() {
  const mag = Math.hypot(ball.vx, ball.vy);
  if (mag > 0) {
    ball.vx = (ball.vx / mag) * currentSpeed;
    ball.vy = (ball.vy / mag) * currentSpeed;
  }
}

/* ─────────────────────────────────────────────────────────────────── */
/* ── Particles                                                      ── */
/* ─────────────────────────────────────────────────────────────────── */
function spawnParticles(brick) {
  const cx = brick.x + brick.w / 2;
  const cy = brick.y + brick.h / 2;
  for (let i = 0; i < PARTICLES_N; i++) {
    const angle = (Math.PI * 2 * i) / PARTICLES_N + Math.random() * 0.6;
    const speed = 1.5 + Math.random() * 4.5;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life:  1.0,
      decay: 0.035 + Math.random() * 0.04,
      r:     2 + Math.random() * 3,
      color: brick.color.glow,
    });
  }
}

/* ─────────────────────────────────────────────────────────────────── */
/* ── Tooltip                                                        ── */
/* ─────────────────────────────────────────────────────────────────── */
let tooltipTimer = null;
function showTooltip(text) {
  tooltip.textContent = text;
  tooltip.classList.add('show');
  clearTimeout(tooltipTimer);
  tooltipTimer = setTimeout(() => tooltip.classList.remove('show'), 3200);
}

/* ─────────────────────────────────────────────────────────────────── */
/* ── Update                                                         ── */
/* ─────────────────────────────────────────────────────────────────── */
function update() {

  /* Paddle movement ─────────────────────────────────────────────── */
  if (mouseX !== null) {
    paddle.x = mouseX - paddle.w / 2;
  } else {
    if (keys.left)  paddle.x -= PADDLE_SPEED;
    if (keys.right) paddle.x += PADDLE_SPEED;
  }
  paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

  /* Ball glued to paddle while launching ────────────────────────── */
  if (launching) {
    ball.x = paddle.x + paddle.w / 2;
    ball.y = paddle.y - ball.r - 1;
    return; // skip physics
  }

  /* Record pre-move position for reflection logic ───────────────── */
  const prevX = ball.x;
  const prevY = ball.y;

  /* Trail ───────────────────────────────────────────────────────── */
  trail.unshift({ x: ball.x, y: ball.y });
  if (trail.length > TRAIL_LEN) trail.pop();

  /* Move ────────────────────────────────────────────────────────── */
  ball.x += ball.vx;
  ball.y += ball.vy;

  /* Wall collisions ─────────────────────────────────────────────── */
  if (ball.x - ball.r < 0)  { ball.x = ball.r;      ball.vx =  Math.abs(ball.vx); }
  if (ball.x + ball.r > W)  { ball.x = W - ball.r;  ball.vx = -Math.abs(ball.vx); }
  if (ball.y - ball.r < 0)  { ball.y = ball.r;       ball.vy =  Math.abs(ball.vy); }

  /* Bottom — lose a life ────────────────────────────────────────── */
  if (ball.y - ball.r > H) {
    lives--;
    livesEl.textContent = lives;
    if (lives <= 0) { endGame(false); return; }
    initBall(); // resets launching = true
    return;
  }

  /* Paddle collision ────────────────────────────────────────────── */
  const paddleTop = paddle.y;
  if (
    ball.vy > 0 &&
    ball.y + ball.r >= paddleTop &&
    ball.y + ball.r <= paddleTop + paddle.h + Math.abs(ball.vy) + 1 &&
    ball.x + ball.r > paddle.x &&
    ball.x - ball.r < paddle.x + paddle.w
  ) {
    // Clamp ball above paddle surface
    ball.y = paddleTop - ball.r;
    ball.vy = -Math.abs(ball.vy);

    // Angle based on where it hit (centre → straight up; edge → steep angle)
    const hitPos  = (ball.x - paddle.x) / paddle.w;        // 0..1
    const maxAngle = Math.PI * 0.33;                         // ±60° from vertical
    const angle   = -Math.PI / 2 + (hitPos - 0.5) * 2 * maxAngle;
    ball.vx = Math.cos(angle) * currentSpeed;
    ball.vy = Math.sin(angle) * currentSpeed;
    enforceMinVY();
  }

  /* Brick collisions ────────────────────────────────────────────── */
  let reflectDone = false; // only one reflection per frame

  for (const brick of bricks) {
    if (!brick.alive) continue;
    if (!circleAABB(ball.x, ball.y, ball.r, brick.x, brick.y, brick.w, brick.h)) continue;

    // Destroy brick
    brick.alive = false;
    score += 10;
    scoreEl.textContent = score;
    bricksDestroyed++;
    showTooltip(brick.detail);
    spawnParticles(brick);

    // Speed up every N bricks
    if (bricksDestroyed % SPEED_UP_EVERY === 0) {
      currentSpeed = Math.min(currentSpeed + SPEED_INCREMENT, BALL_SPEED_MAX);
      applyCurrentSpeed();
    }

    // Reflect — only once per frame to avoid double-flips on simultaneous hits
    if (!reflectDone) {
      reflectDone = true;

      // Determine which face was hit using the ball's pre-move position:
      // If the ball was already overlapping the brick horizontally before the
      // move, it came from top/bottom (flip vy). Otherwise it came from the
      // side (flip vx). Corner hits flip both.
      const wasOverX = prevX + ball.r > brick.x && prevX - ball.r < brick.x + brick.w;
      const wasOverY = prevY + ball.r > brick.y && prevY - ball.r < brick.y + brick.h;

      if (wasOverX && !wasOverY) {
        ball.vy = -ball.vy;
      } else if (!wasOverX && wasOverY) {
        ball.vx = -ball.vx;
      } else {
        // Corner — flip both
        ball.vx = -ball.vx;
        ball.vy = -ball.vy;
      }

      enforceMinVY();
    }
  }

  /* Win condition ───────────────────────────────────────────────── */
  if (bricks.every(b => !b.alive)) { endGame(true); return; }

  /* Update particles ────────────────────────────────────────────── */
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += 0.22;   // gravity
    p.vx *= 0.97;   // horizontal drag
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

/* ─────────────────────────────────────────────────────────────────── */
/* ── Draw                                                           ── */
/* ─────────────────────────────────────────────────────────────────── */
function draw() {

  /* Background ──────────────────────────────────────────────────── */
  ctx.fillStyle = '#16161a';
  ctx.fillRect(0, 0, W, H);

  // Subtle dot grid
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let x = 20; x < W; x += 40) {
    for (let y = 20; y < H; y += 40) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* Particles ───────────────────────────────────────────────────── */
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle   = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* Ball trail ──────────────────────────────────────────────────── */
  if (!launching) {
    for (let i = trail.length - 1; i >= 0; i--) {
      const t     = 1 - i / trail.length;
      const alpha = t * 0.3;
      const r     = ball.r * (0.3 + t * 0.7);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(trail[i].x, trail[i].y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#f72585';
      ctx.fill();
      ctx.restore();
    }
  }

  /* Bricks ──────────────────────────────────────────────────────── */
  for (const brick of bricks) {
    if (!brick.alive) continue;

    ctx.save();

    // Body
    ctx.fillStyle   = brick.color.fill;
    ctx.strokeStyle = brick.color.stroke;
    ctx.lineWidth   = 1.5;
    roundRect(ctx, brick.x, brick.y, brick.w, brick.h, 4);
    ctx.fill();
    ctx.stroke();

    // Top gloss stripe
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, brick.x + 2, brick.y + 2, brick.w - 4, 6, 2);
    ctx.fill();

    // Label — clip to brick bounds to prevent text overflow
    ctx.beginPath();
    ctx.rect(brick.x + 3, brick.y, brick.w - 6, brick.h);
    ctx.clip();
    ctx.fillStyle    = 'rgba(255,255,255,0.92)';
    ctx.font         = 'bold 11px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(brick.label, brick.x + brick.w / 2, brick.y + brick.h / 2);

    ctx.restore();
  }

  /* Paddle ──────────────────────────────────────────────────────── */
  ctx.save();
  const pg = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.h);
  pg.addColorStop(0, '#ff4fa0');
  pg.addColorStop(1, '#b5124d');
  ctx.fillStyle   = pg;
  ctx.shadowColor = '#f72585';
  ctx.shadowBlur  = 14;
  roundRect(ctx, paddle.x, paddle.y, paddle.w, paddle.h, 6);
  ctx.fill();
  // Gloss stripe
  ctx.shadowBlur  = 0;
  ctx.fillStyle   = 'rgba(255,255,255,0.28)';
  roundRect(ctx, paddle.x + 6, paddle.y + 2, paddle.w - 12, 4, 2);
  ctx.fill();
  ctx.restore();

  /* Ball ────────────────────────────────────────────────────────── */
  ctx.save();
  // Outer glow
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r + 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(247,37,133,0.15)';
  ctx.fill();
  // Main body
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle   = '#ffffff';
  ctx.shadowColor = '#f72585';
  ctx.shadowBlur  = 18;
  ctx.fill();
  // Pink core dot
  ctx.shadowBlur  = 0;
  ctx.fillStyle   = '#f72585';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  /* Launch hint ─────────────────────────────────────────────────── */
  if (launching && running) {
    ctx.save();
    ctx.font      = '13px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('Click or press SPACE to launch', W / 2, paddle.y - 18);
    ctx.restore();
  }
}

/* ─────────────────────────────────────────────────────────────────── */
/* ── Utility: rounded rect path                                     ── */
/* ─────────────────────────────────────────────────────────────────── */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ─────────────────────────────────────────────────────────────────── */
/* ── Game loop                                                      ── */
/* ─────────────────────────────────────────────────────────────────── */
function loop() {
  if (!running) return;
  update();
  draw();
  animId = requestAnimationFrame(loop);
}

/* ─────────────────────────────────────────────────────────────────── */
/* ── Lifecycle                                                      ── */
/* ─────────────────────────────────────────────────────────────────── */
function startGame() {
  score          = 0;
  lives          = 3;
  bricksDestroyed = 0;
  currentSpeed   = BALL_SPEED_INIT;
  particles      = [];
  trail          = [];

  scoreEl.textContent = score;
  livesEl.textContent = lives;

  buildBricks();
  initPaddle();
  initBall();

  overlay.classList.remove('visible');
  running = true;
  cancelAnimationFrame(animId);
  loop();
}

function endGame(won) {
  running = false;
  cancelAnimationFrame(animId);

  titleEl.textContent  = won ? 'You win!' : 'Game over';
  msgEl.textContent    = won
    ? `You destroyed my entire CV. Score: ${score}. I'm impressed.`
    : `Score: ${score}. Hire me anyway?`;
  overlayBtn.textContent = 'Play again';
  overlay.classList.add('visible');
}

/* ─────────────────────────────────────────────────────────────────── */
/* ── Input                                                          ── */
/* ─────────────────────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') keys.left  = true;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
  if ((e.key === ' ' || e.key === 'Enter') && running) {
    e.preventDefault();
    launchBall();
  }
});
document.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') keys.left  = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});

// Mouse — track position for paddle; click to launch
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouseX = (e.clientX - rect.left) * (W / rect.width);
});
canvas.addEventListener('mouseleave', () => { mouseX = null; });
canvas.addEventListener('click', launchBall);

// Touch — track finger for paddle; lift to launch
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  mouseX = (e.touches[0].clientX - rect.left) * (W / rect.width);
}, { passive: false });
canvas.addEventListener('touchend', () => {
  mouseX = null;
  launchBall();
});

/* ─────────────────────────────────────────────────────────────────── */
/* ── Boot — draw a static preview before the player hits Play      ── */
/* ─────────────────────────────────────────────────────────────────── */
resizeCanvas();
buildBricks();
initPaddle();
initBall();
draw();
