import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(rootDir, "public");
const iconsDir = path.join(publicDir, "icons");

const GREEN_DARK = "#14532d";
const GREEN_LIGHT = "#22c55e";

function walletSvg(size, { maskable = false } = {}) {
  const pad = maskable ? size * 0.18 : size * 0.12;
  const r = maskable ? 0 : size * 0.18;
  const w = size - pad * 2;
  const h = w * 0.78;
  const x = pad;
  const y = (size - h) / 2;

  // Bentuk dompet sederhana + ikon "DK" agar mudah dikenali.
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${GREEN_DARK}"/>
      <stop offset="100%" stop-color="#166534"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#g)"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#ffffff" opacity="0.12"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="${GREEN_LIGHT}" stroke-width="${size * 0.03}"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="${size * 0.3}" font-weight="700" fill="#ffffff">DK</text>
  <circle cx="${size * 0.72}" cy="${size * 0.5}" r="${size * 0.055}" fill="${GREEN_LIGHT}"/>
</svg>`.trim();
}

function faviconSvg() {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${GREEN_DARK}"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="28" font-weight="700" fill="#ffffff">DK</text>
  <circle cx="46" cy="32" r="4" fill="${GREEN_LIGHT}"/>
</svg>`.trim();
}

async function main() {
  await mkdir(iconsDir, { recursive: true });

  const jobs = [
    { name: "icon-192.png", size: 192, maskable: false },
    { name: "icon-512.png", size: 512, maskable: false },
    { name: "icon-maskable-512.png", size: 512, maskable: true },
  ];

  for (const job of jobs) {
    const svg = walletSvg(job.size, { maskable: job.maskable });
    const out = path.join(iconsDir, job.name);
    await sharp(Buffer.from(svg)).png().toFile(out);
    console.log("✓", path.relative(rootDir, out));
  }

  // Ikon Apple touch (180x180, tanpa transparansi).
  const appleSvg = walletSvg(180, { maskable: false });
  const appleOut = path.join(publicDir, "apple-touch-icon.png");
  await sharp(Buffer.from(appleSvg)).flatten({ background: GREEN_DARK }).png().toFile(appleOut);
  console.log("✓", path.relative(rootDir, appleOut));

  const favOut = path.join(publicDir, "favicon.svg");
  await writeFile(favOut, faviconSvg(), "utf8");
  console.log("✓", path.relative(rootDir, favOut));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
