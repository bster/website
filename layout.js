'use strict';

/* ═══════════════════════════════════════════════════════════════════
   SHARED LAYOUT — CV content, typography tokens, and layout builder.
   Used by all three games so the CV text is identical across them.
   ═══════════════════════════════════════════════════════════════════ */

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

// Each style: { weight, size (px), color }
const S = {
  name:    { weight: 700, size: 44,  color: '#0a0a0a' },
  title:   { weight: 400, size: 16,  color: '#2d2d2d' },
  meta:    { weight: 400, size: 12,  color: '#9a9a9a' },
  section: { weight: 700, size: 10,  color: '#b8b8b8' },
  org:     { weight: 600, size: 14,  color: '#111111' },
  role:    { weight: 400, size: 13,  color: '#4a4a4a' },
  detail:  { weight: 400, size: 11,  color: '#8a8a8a' },
  period:  { weight: 400, size: 12,  color: '#c5c5c5' },
};

function makeFont(s) { return `${s.weight} ${s.size}px ${FONT}`; }

/*
 * buildLayoutData(ctx, W, H)
 *   Measures and places every CV character using ctx for text measurement.
 *   Returns { chars: [...], dividers: [...] } — does NOT set any globals.
 *
 *   Each char: { char, x, y, w, h, font, color, alive }
 *   Each divider: { x, y, w }
 */
function buildLayoutData(ctx, W, H) {
  const chars    = [];
  const dividers = [];

  const contentW = Math.min(680, W - 80);
  const lx       = (W - contentW) / 2;
  const rx       = lx + contentW;

  let y = 0;

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
          y:     baseY,
          w:     cw,
          h:     style.size,
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

  addText('Figma', lx, y, S.org);
  addText('2019 – Present', rx, y, S.period, 'right');
  y += 20;
  addText('VP of Product  ·  Director, Monetization  ·  Director, Teamwork', lx, y, S.role);
  y += 17;
  addText('Group PM  ·  PM Lead  ·  Senior PM', lx, y, S.detail);
  y += 26;

  addText('Dropbox', lx, y, S.org);
  addText('2015 – 2019', rx, y, S.period, 'right');
  y += 20;
  addText('Product Manager  ·  Enterprise Solutions Architect  ·  Account Executive', lx, y, S.role);
  y += 26;

  addText('TeachBoost', lx, y, S.org);
  addText('2014 – 2015', rx, y, S.period, 'right');
  y += 20;
  addText('Director of Educational Partnerships', lx, y, S.role);
  y += 26;

  addText('EdSurge  ·  Ponder Labs  ·  Council on Foreign Relations', lx, y, S.org);
  addText('2012 – 2015', rx, y, S.period, 'right');
  y += 20;
  addText('Contributor  ·  Advisor  ·  Edtech Consultant', lx, y, S.role);
  y += 26;

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

  return { chars, dividers };
}
