'use strict';

/* ═══════════════════════════════════════════════════════════════════
   SHARED LAYOUT — CV content, typography tokens, and layout builder.
   Used by all three games so the CV text is identical across them.
   ═══════════════════════════════════════════════════════════════════ */

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

// Each style: { weight, size (px), color }
const S = {
  name:    { weight: 700, size: 44,  color: '#1e1a18' },
  title:   { weight: 400, size: 16,  color: '#2a241f' },
  meta:    { weight: 400, size: 12,  color: '#8a8178' },
  section: { weight: 700, size: 10,  color: '#b4a99e' },
  org:     { weight: 600, size: 14,  color: '#1e1a18' },
  role:    { weight: 400, size: 13,  color: '#4f463b' },
  detail:  { weight: 400, size: 11,  color: '#7d756c' },
  period:  { weight: 400, size: 12,  color: '#bfb5aa' },
};

function makeFont(s) { return `${s.weight} ${s.size}px ${FONT}`; }

/* ── CV data loaded from cv.md ────────────────────────────────────── */

let CV_DATA = null;

/*
 * parseCV(md)
 *   Parses the cv.md markdown into a structured object:
 *   {
 *     name: string,
 *     title: string,
 *     meta: string,
 *     sections: [
 *       {
 *         heading: string,
 *         entries: [
 *           { org: string, period: string, role: string, details: string[] }
 *           | { text: string, detail: bool }
 *         ]
 *       }
 *     ]
 *   }
 */
function parseCV(md) {
  const lines = md.split('\n').map(l => l.trimEnd());
  let i = 0;

  // Skip blank lines helper
  function skipBlanks() { while (i < lines.length && lines[i].trim() === '') i++; }

  skipBlanks();

  // # Name
  const name = lines[i++].replace(/^#\s*/, '').trim();
  skipBlanks();

  // title line (no prefix)
  const title = lines[i++].trim();
  skipBlanks();

  // meta line (no prefix)
  const meta = lines[i++].trim();

  const sections = [];

  while (i < lines.length) {
    skipBlanks();
    if (i >= lines.length) break;

    const line = lines[i];

    // ## Section heading
    if (line.startsWith('## ')) {
      const heading = line.replace(/^##\s*/, '').trim();
      i++;
      const entries = [];

      while (i < lines.length) {
        skipBlanks();
        if (i >= lines.length) break;
        const el = lines[i];

        // Stop at next ## section
        if (el.startsWith('## ')) break;

        // ### Org | Period  (or ### Org | Period\nRole\n- Detail)
        if (el.startsWith('### ')) {
          const header = el.replace(/^###\s*/, '').trim();
          i++;

          // Split on last ' | ' to get org and period
          const sepIdx = header.lastIndexOf(' | ');
          const org    = sepIdx >= 0 ? header.slice(0, sepIdx).trim() : header;
          const period = sepIdx >= 0 ? header.slice(sepIdx + 3).trim() : '';

          // Next non-blank, non-heading, non-bullet line = role
          skipBlanks();
          let role = '';
          const details = [];

          while (i < lines.length) {
            const rl = lines[i];
            if (rl.trim() === '' || rl.startsWith('## ') || rl.startsWith('### ')) break;
            if (rl.startsWith('- ')) {
              details.push(rl.replace(/^-\s*/, '').trim());
              i++;
            } else {
              if (role === '') role = rl.trim();
              else details.push(rl.trim());
              i++;
            }
          }

          entries.push({ org, period, role, details });
        } else if (el.startsWith('- ')) {
          // Bullet = detail line
          entries.push({ text: el.replace(/^-\s*/, '').trim(), detail: true });
          i++;
        } else if (el.trim() !== '') {
          // Plain line = role-style
          entries.push({ text: el.trim(), detail: false });
          i++;
        } else {
          i++;
        }
      }

      sections.push({ heading, entries });
    } else {
      i++;
    }
  }

  return { name, title, meta, sections };
}

/*
 * loadCV()
 *   Fetches cv.md and parses it into CV_DATA.
 *   Falls back to hardcoded data if fetch fails.
 */
async function loadCV() {
  try {
    const res = await fetch('cv.md');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const md = await res.text();
    CV_DATA = parseCV(md);
  } catch (e) {
    console.warn('Could not load cv.md, using fallback data.', e);
    CV_DATA = {
      name:  'Ben Stern',
      title: 'VP of Product, Growth & Monetization',
      meta:  'Figma  ·  Greater Philadelphia  ·  benjamin.m.stern@gmail.com',
      sections: [
        {
          heading: 'Experience',
          entries: [
            { org: 'Figma',       period: '2019 – Present', role: 'VP of Product  ·  Director, Monetization  ·  Director, Teamwork', details: ['Group PM  ·  PM Lead  ·  Senior PM'] },
            { org: 'Dropbox',     period: '2015 – 2019',    role: 'Product Manager  ·  Enterprise Solutions Architect  ·  Account Executive', details: [] },
            { org: 'TeachBoost',  period: '2014 – 2015',    role: 'Director of Educational Partnerships', details: [] },
            { org: 'EdSurge  ·  Ponder Labs  ·  Council on Foreign Relations', period: '2012 – 2015', role: 'Contributor  ·  Advisor  ·  Edtech Consultant', details: [] },
            { org: 'Trinity School NYC  ·  Emery/Weiner School', period: '2009 – 2014', role: 'Teacher  ·  Edtech Coordinator', details: [] },
          ],
        },
        {
          heading: 'Education',
          entries: [
            { org: 'Bowdoin College', period: '2005 – 2009', role: 'B.A. Government & Legal Studies', details: [] },
          ],
        },
        {
          heading: 'Skills & Recognition',
          entries: [
            { text: 'Curriculum Design  ·  Educational Technology  ·  Teaching  ·  Product Strategy', detail: false },
            { text: 'Rav Preida Award for Teaching Excellence  ·  Dropbox Assignments (2 patents pending)', detail: true },
            { text: 'Published on EdSurge  ·  Board Member: Mouse, Code/Interactive', detail: true },
          ],
        },
      ],
    };
  }
}

/*
 * buildLayoutData(ctx, W, H)
 *   Measures and places every CV character using ctx for text measurement.
 *   Returns { chars: [...], dividers: [...] } — does NOT set any globals.
 *
 *   Each char: { char, x, y, w, h, font, color, alive }
 *   Each divider: { x, y, w }
 *
 *   Requires CV_DATA to be loaded (call loadCV() first).
 */
function buildLayoutData(ctx, W, H) {
  const chars    = [];
  const dividers = [];

  // Proportional scaling for narrow screens so fonts and spacing shrink together
  const SCALE = Math.min(1, Math.max(0.72, W / 900));
  const sc    = n => Math.round(n * SCALE);

  // Return a scaled copy of a style token
  function ss(style) { return { ...style, size: sc(style.size) }; }

  const contentW = Math.min(680, W - 48);
  const lx       = (W - contentW) / 2;
  const rx       = lx + contentW;

  let y = 0;

  function addText(text, baseX, baseY, style, align, spacing, uppercase) {
    align   = align   || 'left';
    spacing = spacing || 0;
    const str = uppercase ? text.toUpperCase() : text;
    const fnt = makeFont(style);
    ctx.font  = fnt;

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
          char:   c,
          x:      curX,
          y:      baseY,
          _baseX: curX,
          _baseY: baseY,
          _align: align === 'right' ? 'right' : 'left',
          w:      cw,
          h:      style.size,
          font:   fnt,
          color:  style.color,
          alive:  true,
        });
      }
      curX += cw + spacing;
    }
  }

  const d = CV_DATA;

  // ── Name
  addText(d.name, lx, y, ss(S.name));
  y += sc(54);

  // ── Current title
  addText(d.title, lx, y, ss(S.title));
  y += sc(22);

  // ── Meta line
  addText(d.meta, lx, y, ss(S.meta));
  y += sc(30);

  // ── Divider
  dividers.push({ x: lx, y, w: contentW });
  y += sc(22);

  for (const section of d.sections) {
    // ── Section heading
    addText(section.heading, lx, y, ss(S.section), 'left', 1.5, true);
    y += sc(26);

    for (const entry of section.entries) {
      if ('org' in entry) {
        addText(entry.org, lx, y, ss(S.org));
        if (entry.period) addText(entry.period, rx, y, ss(S.period), 'right');
        y += sc(20);
        if (entry.role) {
          addText(entry.role, lx, y, ss(S.role));
          y += sc(17);
        }
        for (const det of entry.details) {
          addText(det, lx, y, ss(S.detail));
          y += sc(17);
        }
        if (entry.role || entry.details.length) y += sc(9);
        else y += sc(6);
      } else {
        addText(entry.text, lx, y, ss(entry.detail ? S.detail : S.role));
        y += entry.detail ? sc(16) : sc(18);
      }
    }

    y += sc(4);

    dividers.push({ x: lx, y, w: contentW });
    y += sc(22);
  }

  // Remove the trailing divider (added after last section)
  dividers.pop();

  const contentH = y + sc(20);

  // Center content vertically; minimum offset must clear the switcher pill
  const switcherEl = document.querySelector('.game-switcher');
  const switcherBottom = switcherEl ? switcherEl.getBoundingClientRect().bottom : 60;
  const minOffsetY = switcherBottom + 28;
  const offsetY = Math.max(minOffsetY, (H - contentH) / 2);
  for (const ch of chars) {
    ch.y     += offsetY;
    ch._baseY += offsetY;  // must match ch.y — reflowChars resets ch.y = ch._baseY each frame
  }
  for (const dv of dividers) dv.y += offsetY;

  return { chars, dividers, contentLeft: lx, contentRight: rx };
}
