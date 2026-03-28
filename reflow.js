'use strict';

/* ═══════════════════════════════════════════════════════════════════
   REFLOW ENGINE
   Characters flow around circular obstacles in real time.

   Core algorithm from chenglou/pretext's editorial engine:
     For each line of text, compute which horizontal intervals are
     blocked by obstacles (circle-band intersection geometry), carve
     the remaining available slots, then place characters left-to-right
     (or right-to-left for right-aligned text) into those slots.

   This is the same technique used in the editorial engine to make
   body text flow around animated orbs — zero DOM reads, pure math.
   ═══════════════════════════════════════════════════════════════════ */

const REFLOW_MIN_SLOT = 16; // minimum slot width (px) worth filling

/* ── Circle-band intersection ───────────────────────────────────── */
// Returns the horizontal { left, right } interval blocked by a circle
// at the given Y band, expanded by hPad/vPad, or null if no overlap.
function circleIntervalForBand(cx, cy, r, bandTop, bandBottom, hPad, vPad) {
  const top    = bandTop    - vPad;
  const bottom = bandBottom + vPad;
  if (top >= cy + r || bottom <= cy - r) return null;
  const minDy = (cy >= top && cy <= bottom) ? 0
              : (cy < top  ? top - cy : cy - bottom);
  if (minDy >= r) return null;
  const maxDx = Math.sqrt(r * r - minDy * minDy);
  return { left: cx - maxDx - hPad, right: cx + maxDx + hPad };
}

/* ── Slot carving ───────────────────────────────────────────────── */
// Subtract blocked intervals from a base { left, right } interval.
// Returns the remaining contiguous slots wide enough to be useful.
function carveSlots(base, blocked) {
  let slots = [{ left: base.left, right: base.right }];
  for (const b of blocked) {
    const next = [];
    for (const s of slots) {
      if (b.right <= s.left || b.left >= s.right) { next.push(s); continue; }
      if (b.left  >  s.left)  next.push({ left: s.left,  right: b.left  });
      if (b.right <  s.right) next.push({ left: b.right, right: s.right });
    }
    slots = next;
  }
  return slots.filter(s => s.right - s.left >= REFLOW_MIN_SLOT);
}

/* ── Main entry point ───────────────────────────────────────────── */
/*
 * reflowChars(chars, obstacles, contentLeft, contentRight)
 *
 * Reflows character positions around circular obstacles.
 * Updates ch.x and ch.y in place. Resets to base positions first
 * so moving the obstacle away restores the original layout.
 *
 * chars        — array of { _baseX, _baseY, _align, x, y, w, h, alive }
 * obstacles    — array of { cx, cy, r, hPad, vPad }
 * contentLeft  — left edge of the content column
 * contentRight — right edge of the content column
 */
function reflowChars(chars, obstacles, contentLeft, contentRight) {
  // Reset every alive char to its base position
  for (const ch of chars) {
    if (!ch.alive) continue;
    ch.x = ch._baseX;
    ch.y = ch._baseY;
  }

  if (!obstacles || obstacles.length === 0) return;

  // Group alive chars by their base Y baseline
  const lineMap = new Map();
  for (const ch of chars) {
    if (!ch.alive) continue;
    const key = Math.round(ch._baseY);
    if (!lineMap.has(key)) {
      lineMap.set(key, {
        baseY: ch._baseY,
        h:     ch.h,
        left:  [],   // left-aligned chars on this line
        right: [],   // right-aligned chars on this line
      });
    }
    const line = lineMap.get(key);
    (ch._align === 'right' ? line.right : line.left).push(ch);
  }

  for (const line of lineMap.values()) {
    const bandTop    = line.baseY - line.h;
    const bandBottom = line.baseY;

    // Compute blocked intervals for this Y band
    const blocked = [];
    for (const obs of obstacles) {
      const iv = circleIntervalForBand(
        obs.cx, obs.cy, obs.r,
        bandTop, bandBottom,
        obs.hPad || 0, obs.vPad || 0
      );
      if (iv) blocked.push(iv);
    }

    if (blocked.length === 0) continue; // no change needed for this line

    const base = { left: contentLeft, right: contentRight };

    // ── Left-aligned chars — flow left-to-right into available slots,
    //    preserving inter-word gaps from the base layout
    if (line.left.length > 0) {
      line.left.sort((a, b) => a._baseX - b._baseX);
      const slots = carveSlots(base, blocked);

      if (slots.length > 0) {
        // Group consecutive chars into words, recording the gap before each word
        const words = [];
        let prevRight = -Infinity;
        let cur = [];
        for (const ch of line.left) {
          const gap = ch._baseX - prevRight;
          if (gap > 0.5 && cur.length > 0) {
            words.push({ chars: cur, gapBefore: Math.max(0, gap) });
            cur = [];
          }
          cur.push(ch);
          prevRight = ch._baseX + ch.w;
        }
        if (cur.length > 0) words.push({ chars: cur, gapBefore: 0 });

        let sIdx = 0;
        let curX = slots[0].left;
        let firstInSlot = true;

        for (const word of words) {
          const wordW = word.chars.reduce((s, c) => s + c.w, 0);
          const gap   = firstInSlot ? 0 : word.gapBefore;

          // Advance slot if word doesn't fit
          while (sIdx < slots.length && curX + gap + wordW > slots[sIdx].right + 0.5) {
            sIdx++;
            if (sIdx < slots.length) { curX = slots[sIdx].left; firstInSlot = true; }
          }
          if (sIdx >= slots.length) break;

          curX += firstInSlot ? 0 : gap;
          firstInSlot = false;

          for (const ch of word.chars) {
            ch.x = curX;
            curX += ch.w;
          }
        }
      }
    }

    // ── Right-aligned chars — flow right-to-left from rightmost slot
    if (line.right.length > 0) {
      line.right.sort((a, b) => b._baseX - a._baseX);
      const slots = carveSlots(base, blocked);

      if (slots.length > 0) {
        let sIdx = slots.length - 1;
        let curX = slots[sIdx].right;
        for (const ch of line.right) {
          while (sIdx >= 0 && curX - ch.w < slots[sIdx].left - 0.5) {
            sIdx--;
            if (sIdx >= 0) curX = slots[sIdx].right;
          }
          if (sIdx < 0) break;
          ch.x = curX - ch.w;
          curX -= ch.w;
        }
      }
    }
  }
}
