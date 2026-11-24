import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../public/icons');
mkdirSync(outDir, { recursive: true });

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = crcTable[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function renderIcon(size, { maskable = false, rounded = true } = {}) {
  const ss = 4;
  const S = size * ss;
  const rgba = Buffer.alloc(S * S * 4); // transparent

  const setPixel = (x, y, r, g, b, a = 1) => {
    const i = (y * S + x) * 4;
    const srcA = a;
    const dstA = rgba[i + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA <= 0) return;
    rgba[i] = Math.round((r * srcA + rgba[i] * dstA * (1 - srcA)) / outA);
    rgba[i + 1] = Math.round((g * srcA + rgba[i + 1] * dstA * (1 - srcA)) / outA);
    rgba[i + 2] = Math.round((b * srcA + rgba[i + 2] * dstA * (1 - srcA)) / outA);
    rgba[i + 3] = Math.round(outA * 255);
  };

  const radius = rounded && !maskable ? size * 0.225 : 0;
  const r = radius * ss;
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      let inside = true;
      if (r > 0) {
        const cx = Math.min(Math.max(px, r), S - r);
        const cy = Math.min(Math.max(py, r), S - r);
        inside = (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
      }
      if (!inside) continue;
      const t = py / S;
      const cr = mix(23, 11, t); // #172554 -> #0B1736
      const cg = mix(37, 23, t);
      const cb = mix(84, 54, t);
      setPixel(x, y, cr, cg, cb, 1);
    }
  }

  // Barcode mark geometry (relative to 512 design grid)
  const design = 512;
  const unit = (maskable ? 0.72 : 1) * (S / design);
  const offset = (S - design * unit) / 2;
  const bars = [
    { x: 168, w: 28 },
    { x: 208, w: 14 },
    { x: 236, w: 40, accent: true },
    { x: 290, w: 14 },
    { x: 318, w: 26 },
  ];
  const barTop = 172;
  const barHeight = 168;
  for (const bar of bars) {
    const bx = Math.round(offset + bar.x * unit);
    const bw = Math.round(bar.w * unit);
    const by = Math.round(offset + barTop * unit);
    const bh = Math.round(barHeight * unit);
    const [cr, cg, cb] = bar.accent ? [59, 130, 246] : [255, 255, 255];
    for (let y = by; y < by + bh; y += 1) {
      for (let x = bx; x < bx + bw; x += 1) {
        if (x >= 0 && x < S && y >= 0 && y < S) setPixel(x, y, cr, cg, cb, 1);
      }
    }
  }

  // Downsample (box filter) to target size.
  const out = Buffer.alloc(size * size * 4);
  const factor = ss * ss;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < ss; sy += 1) {
        for (let sx = 0; sx < ss; sx += 1) {
          const i = ((y * ss + sy) * S + (x * ss + sx)) * 4;
          const alpha = rgba[i + 3] / 255;
          r += rgba[i] * alpha;
          g += rgba[i + 1] * alpha;
          b += rgba[i + 2] * alpha;
          a += alpha;
        }
      }
      const i = (y * size + x) * 4;
      if (a > 0) {
        out[i] = Math.round(r / a);
        out[i + 1] = Math.round(g / a);
        out[i + 2] = Math.round(b / a);
      }
      out[i + 3] = Math.round((a / factor) * 255);
    }
  }
  return encodePng(size, size, out);
}

const files = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['icon-maskable-192.png', 192, { maskable: true }],
  ['icon-maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, { rounded: false }],
];

for (const [name, size, options] of files) {
  writeFileSync(resolve(outDir, name), renderIcon(size, options));
  console.log('wrote', name);
}

writeFileSync(
  resolve(__dirname, '../public/favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Vantage Inventory">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#172554"/>
      <stop offset="1" stop-color="#0B1736"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14.4" fill="url(#g)"/>
  <rect x="21" y="21.5" width="3.5" height="21" fill="#FFFFFF"/>
  <rect x="26" y="21.5" width="1.75" height="21" fill="#FFFFFF"/>
  <rect x="29.5" y="21.5" width="5" height="21" fill="#3B82F6"/>
  <rect x="36.25" y="21.5" width="1.75" height="21" fill="#FFFFFF"/>
  <rect x="39.75" y="21.5" width="3.25" height="21" fill="#FFFFFF"/>
</svg>
`,
);
console.log('wrote favicon.svg');
