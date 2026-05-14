/**
 * Biz!Go! 用アプリアイコン（PNG）を public に出力します。
 * 再生成: npm run icons:generate
 */
const path = require("node:path");
const sharp = require("sharp");

const publicDir = path.join(__dirname, "..", "public");

function svgStandard() {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="18%" y1="0%" x2="82%" y2="100%">
      <stop offset="0%" stop-color="#64748b"/>
      <stop offset="45%" stop-color="#475569"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="em" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#059669"/>
      <stop offset="50%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#6ee7b7"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="108" fill="url(#bg)"/>
  <text x="256" y="332" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-weight="900" font-size="196" fill="url(#em)">B!</text>
</svg>`;
}

/** maskable 用（中央にロゴを寄せ、端のトリミングに耐える） */
function svgMaskable() {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="mb" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#525c6e"/>
      <stop offset="100%" stop-color="#2d3344"/>
    </linearGradient>
    <linearGradient id="mE" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#34d399"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="256" fill="url(#mb)"/>
  <text x="256" y="298" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-weight="900" font-size="132" fill="url(#mE)">B!</text>
</svg>`;
}

async function main() {
  const jobs = [
    { file: "icon-32.png", size: 32, svg: svgStandard() },
    { file: "icon-192.png", size: 192, svg: svgStandard() },
    { file: "icon-512.png", size: 512, svg: svgStandard() },
    { file: "icon-maskable-512.png", size: 512, svg: svgMaskable() },
    { file: "apple-touch-icon.png", size: 180, svg: svgStandard() },
  ];

  for (const { file, size, svg } of jobs) {
    const out = path.join(publicDir, file);
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log("wrote", out);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
