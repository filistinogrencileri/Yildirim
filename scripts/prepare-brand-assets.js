// Prepares brand assets from the designer lockups (2.png LTR, 3.png RTL).
// The source PNGs have NO alpha channel — the "transparency" checkerboard is
// baked into the pixels. This script only clears that near-white neutral
// background to real transparency; the artwork itself is untouched.
// Outputs:
//   apps/web/public/brand/logo-full.png      (RTL lockup, transparent bg)
//   apps/web/public/brand/logo-full-ltr.png  (LTR lockup, transparent bg)
//   apps/web/public/brand/logo-mark.png      (square emblem crop, from RTL)
//   apps/web/src/app/icon.png                (favicon, emblem on white)
const { createRequire } = require('module');
const path = require('path');
const root = path.resolve(__dirname, '..');
const sharp = createRequire(path.join(root, 'apps/api/package.json'))('sharp');

async function clearCheckerboard(file) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const spread = Math.max(r, g, b) - Math.min(r, g, b);
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const isCheckerBg = spread < 14 && lum > 228;
      const o = (y * width + x) * 4;
      out[o] = r; out[o + 1] = g; out[o + 2] = b;
      out[o + 3] = isCheckerBg ? 0 : 255;
    }
  }
  return { buf: out, width, height };
}

function bbox(buf, width, height, xMin = 0) {
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = xMin; x < width; x++) {
      if (buf[(y * width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, minY, maxX, maxY };
}

(async () => {
  // RTL lockup (emblem right) — primary for the Arabic UI
  const rtl = await clearCheckerboard(path.join(root, '3.png'));
  const rtlImg = () => sharp(rtl.buf, { raw: { width: rtl.width, height: rtl.height, channels: 4 } });
  const rb = bbox(rtl.buf, rtl.width, rtl.height);
  await rtlImg()
    .extract({ left: rb.minX, top: rb.minY, width: rb.maxX - rb.minX + 1, height: rb.maxY - rb.minY + 1 })
    .png()
    .toFile(path.join(root, 'apps/web/public/brand/logo-full.png'));
  console.log('wrote logo-full.png');

  // LTR lockup (emblem left) — kept for future non-Arabic locales
  const ltr = await clearCheckerboard(path.join(root, '2.png'));
  const lb = bbox(ltr.buf, ltr.width, ltr.height);
  await sharp(ltr.buf, { raw: { width: ltr.width, height: ltr.height, channels: 4 } })
    .extract({ left: lb.minX, top: lb.minY, width: lb.maxX - lb.minX + 1, height: lb.maxY - lb.minY + 1 })
    .png()
    .toFile(path.join(root, 'apps/web/public/brand/logo-full-ltr.png'));
  console.log('wrote logo-full-ltr.png');

  // Emblem-only crop from the RTL lockup: walk left from the right edge and
  // find the empty-column gap that separates the emblem from the wordmark.
  const colHasInk = new Array(rtl.width).fill(false);
  for (let x = 0; x < rtl.width; x++) {
    for (let y = 0; y < rtl.height; y++) {
      if (rtl.buf[(y * rtl.width + x) * 4 + 3] > 0) { colHasInk[x] = true; break; }
    }
  }
  let seen = 0, emptyRun = 0, boundary = Math.round(rtl.width * 0.6);
  for (let x = rtl.width - 1; x >= 0; x--) {
    if (colHasInk[x]) { seen++; emptyRun = 0; }
    else if (seen > 50 && ++emptyRun >= 25) { boundary = x + emptyRun; break; }
  }
  const eb = bbox(rtl.buf, rtl.width, rtl.height, boundary);
  const pad = 20;
  const left = Math.max(0, eb.minX - pad);
  const top = Math.max(0, eb.minY - pad);
  const w = Math.min(rtl.width - 1, eb.maxX + pad) - left + 1;
  const h = Math.min(rtl.height - 1, eb.maxY + pad) - top + 1;
  const side = Math.max(w, h);
  await rtlImg()
    .extract({ left, top, width: w, height: h })
    .resize(side, side, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(512, 512)
    .png()
    .toFile(path.join(root, 'apps/web/public/brand/logo-mark.png'));
  console.log('wrote logo-mark.png');

  await rtlImg()
    .extract({ left, top, width: w, height: h })
    .resize(side, side, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: '#ffffff' })
    .resize(192, 192)
    .png()
    .toFile(path.join(root, 'apps/web/src/app/icon.png'));
  console.log('wrote icon.png');

  // sanity: report how much of the RTL lockup became transparent
  let clear = 0;
  for (let i = 3; i < rtl.buf.length; i += 4) if (rtl.buf[i] === 0) clear++;
  console.log('transparent px in RTL lockup:', Math.round((clear / (rtl.width * rtl.height)) * 100) + '%');
})().catch((e) => { console.error(e); process.exit(1); });
