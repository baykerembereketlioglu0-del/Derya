// Uygulama ikonlarını SVG'den PNG'ye çizer (Playwright + Chromium).
// Kullanım: node tools/make-icons.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RES = path.join(__dirname, '..', 'app', 'res');

const defs = `
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ffc2d4"/>
    <stop offset="0.5" stop-color="#ff7aa6"/>
    <stop offset="1" stop-color="#e83f7c"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.3" cy="0.25" r="0.6">
    <stop offset="0" stop-color="#fff" stop-opacity="0.55"/>
    <stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="drop" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff"/>
    <stop offset="1" stop-color="#ffe3ec"/>
  </linearGradient>
  <linearGradient id="heart" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ff7aa6"/>
    <stop offset="1" stop-color="#e83f7c"/>
  </linearGradient>
  <filter id="sh" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="2.2" stdDeviation="2.4" flood-color="#9c1f52" flood-opacity="0.35"/>
  </filter>
</defs>`;

const sparkle = (x, y, s, o) =>
  `<path transform="translate(${x} ${y}) scale(${s})" fill="#fff" fill-opacity="${o}"
     d="M0,-6 C0.8,-1.2 1.2,-0.8 6,0 C1.2,0.8 0.8,1.2 0,6 C-0.8,1.2 -1.2,0.8 -6,0 C-1.2,-0.8 -0.8,-1.2 0,-6Z"/>`;

const background = `
  <rect width="108" height="108" fill="url(#bg)"/>
  <rect width="108" height="108" fill="url(#glow)"/>
  ${sparkle(30, 32, 0.7, 0.85)}${sparkle(79, 30, 0.5, 0.7)}${sparkle(80, 76, 0.65, 0.8)}
  ${sparkle(27, 74, 0.4, 0.6)}`;

const foreground = `
  <g filter="url(#sh)">
    <path fill="url(#drop)" d="M54,27C54,27 36.5,46.5 36.5,58.5C36.5,68.4 44.3,76 54,76C63.7,76 71.5,68.4 71.5,58.5C71.5,46.5 54,27 54,27Z"/>
  </g>
  <path fill="url(#heart)" d="M54,69.5C54,69.5 44.2,63.2 44.2,56.6C44.2,53.3 46.7,51 49.5,51C51.5,51 53.1,52.1 54,53.7C54.9,52.1 56.5,51 58.5,51C61.3,51 63.8,53.3 63.8,56.6C63.8,63.2 54,69.5 54,69.5Z"/>
  <ellipse cx="47" cy="47" rx="2.6" ry="4.2" fill="#fff" transform="rotate(30 47 47)"/>`;

const svg = (vb, body, size) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${vb}">${defs}${body}</svg>`;

const legacy = (size) =>
  svg('18 18 72 72', `<clipPath id="c"><rect x="18" y="18" width="72" height="72" rx="17"/></clipPath>
     <g clip-path="url(#c)">${background}${foreground}</g>`, size);

const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  async function render(markup, size, file) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${markup}</body></html>`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await page.locator('svg').screenshot({ path: file, omitBackground: true });
  }
  for (const [d, k] of Object.entries(densities)) {
    const dir = path.join(RES, `mipmap-${d}`);
    await render(legacy(48 * k), 48 * k, path.join(dir, 'ic_launcher.png'));
    await render(svg('0 0 108 108', background, 108 * k), 108 * k, path.join(dir, 'ic_launcher_bg.png'));
    await render(svg('0 0 108 108', foreground, 108 * k), 108 * k, path.join(dir, 'ic_launcher_fg.png'));
  }
  // README / önizleme için büyük ikon
  await render(legacy(512), 512, path.join(__dirname, '..', 'docs', 'icon.png'));
  await browser.close();
  console.log('ikonlar hazır');
})();
