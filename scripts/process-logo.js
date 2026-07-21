// Brand logo processing for 1.png (source master).
// The gray gradient background is re-colored per target surface (the gold glow
// is too saturated to alpha-key cleanly, so we blend the background instead):
//   - logo.png       -> ink #0B1026 (dark badges, favicon)
//   - logo-light.png -> white (light UI surfaces)
// Run: node scripts/process-logo.js  (needs sharp from apps/api)
const { createRequire } = require('module');
const path = require('path');
const root = path.resolve(__dirname, '..');
const sharp = createRequire(path.join(root, 'apps/api/package.json'))('sharp');

// `slope` controls how fast partially-saturated pixels keep their color;
// light surfaces need a steeper curve (plus a darkness boost) or the navy
// mark washes toward gray.
const VARIANTS = [
  { bg: { r: 11, g: 16, b: 38 }, slope: 90, out: 'apps/web/public/brand/logo.png', sizes: [512] },
  { bg: { r: 255, g: 255, b: 255 }, slope: 50, out: 'apps/web/public/brand/logo-light.png', sizes: [512] },
  { bg: { r: 11, g: 16, b: 38 }, slope: 90, out: 'apps/web/src/app/icon.png', sizes: [192] },
];

(async () => {
  const src = path.join(root, '1.png');
  const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  for (const variant of VARIANTS) {
    let minX = width, minY = height, maxX = 0, maxY = 0;
    const out = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * channels;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const spread = Math.max(r, g, b) - Math.min(r, g, b);
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        // 0 = pure gray bg -> becomes surface color; 1 = saturated mark/glow.
        // Very dark pixels are always mark (the bg gradient never gets dark).
        const t = Math.max(
          Math.min(1, Math.max(0, (spread - 8) / variant.slope)),
          Math.min(1, Math.max(0, (60 - lum) / 25)),
        );
        const o = (y * width + x) * 4;
        out[o] = Math.round(variant.bg.r + (r - variant.bg.r) * t);
        out[o + 1] = Math.round(variant.bg.g + (g - variant.bg.g) * t);
        out[o + 2] = Math.round(variant.bg.b + (b - variant.bg.b) * t);
        out[o + 3] = 255;
        if (t > 0.35) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const pad = 40;
    const left = Math.max(0, minX - pad);
    const top = Math.max(0, minY - pad);
    const w = Math.min(width - 1, maxX + pad) - left + 1;
    const h = Math.min(height - 1, maxY + pad) - top + 1;

    for (const size of variant.sizes) {
      await sharp(out, { raw: { width, height, channels: 4 } })
        .extract({ left, top, width: w, height: h })
        .resize(size, size, { fit: 'contain', background: { ...variant.bg, alpha: 1 } })
        .png()
        .toFile(path.join(root, variant.out));
    }
    console.log('wrote', variant.out);
  }
})().catch((e) => { console.error(e); process.exit(1); });
