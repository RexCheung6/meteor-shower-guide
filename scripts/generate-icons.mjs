import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

function blend(png, x, y, color) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const idx = (png.width * Math.floor(y) + Math.floor(x)) << 2;
  const a = color[3] / 255;
  png.data[idx] = Math.round(color[0] * a + png.data[idx] * (1 - a));
  png.data[idx + 1] = Math.round(color[1] * a + png.data[idx + 1] * (1 - a));
  png.data[idx + 2] = Math.round(color[2] * a + png.data[idx + 2] * (1 - a));
  png.data[idx + 3] = Math.min(255, png.data[idx + 3] + Math.round(color[3] * (1 - png.data[idx + 3] / 255)));
}

function drawCircle(png, cx, cy, r, color) {
  const x0 = Math.floor(cx - r), x1 = Math.ceil(cx + r);
  const y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r) {
        const edge = Math.max(0, Math.min(1, r - d));
        blend(png, x, y, [color[0], color[1], color[2], Math.round(color[3] * edge)]);
      }
    }
  }
}

function makeIcon(size, safe) {
  const png = new PNG({ width: size, height: size });
  const cx = size / 2, cy = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      const dx = (x - cx) / (size / 2), dy = (y - cy) / (size / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      const vign = Math.max(0, 1 - d * 0.38);
      png.data[idx] = Math.round(11 + vign * 9);
      png.data[idx + 1] = Math.round(16 + vign * 11);
      png.data[idx + 2] = Math.round(32 + vign * 20);
      png.data[idx + 3] = 255;
    }
  }
  let seed = 20260811;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const starCount = Math.round((size * size) / 800);
  for (let i = 0; i < starCount; i++) {
    const sx = rnd() * size, sy = rnd() * size, sr = 0.8 + rnd() * 1.5;
    drawCircle(png, sx, sy, sr, [255, 255, 255, Math.round((0.35 + rnd() * 0.55) * 255)]);
  }
  const scale = safe ? 0.9 : 1;
  const hx = size * 0.68 * scale, hy = size * 0.34 * scale;
  const tx = size * 0.28 * scale, ty = size * 0.72 * scale;
  const steps = Math.max(24, Math.round(size * 0.6));
  for (let i = 0; i < steps; i++) {
    const f = i / steps;
    const px = tx + (hx - tx) * f, py = ty + (hy - ty) * f;
    const w = size * 0.075 * (1 - f) * 0.8;
    const alpha = Math.round(150 * (1 - f));
    drawCircle(png, px, py, w, [255, 190, 90, alpha]);
  }
  drawCircle(png, hx, hy, size * 0.085, [255, 205, 110, 255]);
  drawCircle(png, hx, hy, size * 0.05, [255, 246, 220, 255]);
  return PNG.sync.write(png);
}

fs.writeFileSync(path.join(outDir, "icon-192.png"), makeIcon(192, false));
fs.writeFileSync(path.join(outDir, "icon-512.png"), makeIcon(512, false));
fs.writeFileSync(path.join(outDir, "maskable-512.png"), makeIcon(512, true));
console.log("icons generated");
