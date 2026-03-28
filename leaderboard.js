'use strict';

/* ═══════════════════════════════════════════════════════════════════
   LEADERBOARD — Supabase-backed global scores with localStorage fallback.

   SETUP (one-time):
   1. Create a free project at https://supabase.com
   2. Run this SQL in the Supabase SQL editor:

      create table scores (
        id         bigint generated always as identity primary key,
        game       text   not null check (game in ('breaker','asteroids','pacman')),
        player     text   not null,
        score      int    not null check (score >= 0),
        created_at timestamptz default now()
      );

      -- Allow anyone to read scores
      create policy "public read" on scores for select using (true);

      -- Allow anyone to insert (score must be positive, player name non-empty)
      create policy "public insert" on scores for insert
        with check (score > 0 and length(trim(player)) > 0);

      alter table scores enable row level security;

   3. Replace the placeholder values below with your project URL and anon key.
      The anon key is safe to expose in client-side JS when RLS is enabled.
   ═══════════════════════════════════════════════════════════════════ */

const SUPABASE_URL = 'https://fhoaxqgwkpomkdbmmkhn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rAcuBV-cPeigvOfPnummDQ_qg4-4sJL';

const LB_CONFIGURED = (
  SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
  SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY'
);

const LS_KEY = 'cv_scores';

/* ── Score calculation ─────────────────────────────────────────────
   Points = time bonus + lives bonus
   Time bonus: starts at 60 000, drops 50 pts per second elapsed
   Lives bonus: 10 000 per life remaining
*/
function calcScore(startTime, livesRemaining) {
  const elapsed = Math.max(0, Date.now() - startTime);
  const timeBonus = Math.max(0, 60000 - Math.floor(elapsed / 1000) * 50);
  return timeBonus + livesRemaining * 10000;
}

/* ── Local storage helpers ─────────────────────────────────────────── */
function lsRead() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch { return []; }
}

function lsSave(rows) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(rows)); } catch {}
}

function lsInsert(name, score, game) {
  const rows = lsRead();
  rows.push({ game, player: name, score, created_at: new Date().toISOString() });
  lsSave(rows);
}

function lsTop(game) {
  return lsRead()
    .filter(r => r.game === game)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

/* ── Supabase REST helpers ─────────────────────────────────────────── */
async function lbFetch(game) {
  if (LB_CONFIGURED) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/scores?game=eq.${game}&order=score.desc&limit=10`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Leaderboard fetch failed, using local scores', e);
    }
  }
  return lsTop(game);
}

async function lbSubmit(name, score, game) {
  // Always save locally as backup
  lsInsert(name, score, game);

  if (LB_CONFIGURED) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ game, player: name, score }),
      });
    } catch (e) {
      console.warn('Score submit failed (saved locally)', e);
    }
  }
}

/* ── Score modal ───────────────────────────────────────────────────── */
let _scoreModalCallback = null;

function showScoreModal(score, game, onClose) {
  _scoreModalCallback = onClose || null;
  window.scoreModalOpen = true;

  document.getElementById('modal-score-val').textContent = score.toLocaleString();
  document.getElementById('modal-game-name').textContent =
    ({ breaker: 'CV Breaker', asteroids: 'CV Asteroids', pacman: 'CV Pac-Man' })[game] || game;
  document.getElementById('player-name').value = '';
  document.getElementById('score-modal').classList.add('visible');
  document.getElementById('player-name').focus();

  // Store game/score for submission
  document.getElementById('score-modal').dataset.game  = game;
  document.getElementById('score-modal').dataset.score = score;
}

function hideScoreModal() {
  window.scoreModalOpen = false;
  document.getElementById('score-modal').classList.remove('visible');
  const cb = _scoreModalCallback;
  _scoreModalCallback = null;
  if (cb) cb();
}

// Submit button
document.getElementById('modal-submit').addEventListener('click', async () => {
  const name  = document.getElementById('player-name').value.trim();
  if (!name) { document.getElementById('player-name').focus(); return; }
  const modal = document.getElementById('score-modal');
  const score = parseInt(modal.dataset.score, 10);
  const game  = modal.dataset.game;
  document.getElementById('modal-submit').disabled = true;
  await lbSubmit(name, score, game);
  document.getElementById('modal-submit').disabled = false;
  hideScoreModal();
});

// Skip button
document.getElementById('modal-skip').addEventListener('click', () => {
  hideScoreModal();
});

// Clicking the backdrop (outside the box) also dismisses
document.getElementById('score-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('score-modal')) hideScoreModal();
});

// Submit on Enter key in name field
document.getElementById('player-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('modal-submit').click();
});

/* ── Leaderboard view ─────────────────────────────────────────────── */
let lbCurrentGame = 'breaker';

function showLeaderboard() {
  document.getElementById('leaderboard-view').classList.add('visible');
  lbRender(lbCurrentGame);
}

function hideLeaderboard() {
  document.getElementById('leaderboard-view').classList.remove('visible');
}

async function lbRender(game) {
  lbCurrentGame = game;

  // Update tab active states
  document.querySelectorAll('.lb-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.game === game));

  const tbody = document.getElementById('lb-tbody');
  tbody.innerHTML = '<tr><td colspan="3" class="lb-loading">Loading…</td></tr>';

  const rows = await lbFetch(game);

  if (!rows || rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="lb-loading">No scores yet.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((r, i) => `
    <tr>
      <td class="lb-rank">${i + 1}</td>
      <td class="lb-player">${escapeHtml(r.player)}</td>
      <td class="lb-score">${Number(r.score).toLocaleString()}</td>
    </tr>
  `).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Tab delegation
document.querySelector('.lb-game-tabs').addEventListener('click', e => {
  const tab = e.target.closest('.lb-tab');
  if (tab) lbRender(tab.dataset.game);
});

// Close button
document.getElementById('lb-close').addEventListener('click', () => {
  hideLeaderboard();
});
