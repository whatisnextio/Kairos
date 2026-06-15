// Generates Kairos source icon (1024x1024) and splash (2732x2732) then calls
// @capacitor/assets to resize them to all Android mipmap and iOS AppIcon sizes.
// Run: node scripts/gen-icons.js

import { createRequire } from 'module';
import { execSync } from 'child_process';
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dir, '..');

// Use sharp bundled with @capacitor/assets so we don't need a separate install.
const require = createRequire(import.meta.url);
const sharp = require(path.join(root, 'node_modules', 'sharp'));

const ICON_SIZE  = 1024;
const SPLASH_W   = 2732;
const SPLASH_H   = 2732;
const ORANGE     = '#ff5a00';
const BLACK      = '#000000';

// K letterform SVG — same vector as ic_stat_kairos.xml but on a full black square
function iconSvg(size) {
  const pad = size * 0.2;
  const inner = size - pad * 2;
  const r = size * 0.12; // corner radius for the background square (icon shape)
  // Scale the K path from a 24×24 viewBox to inner dimensions
  const scale = inner / 24;
  const tx = pad;
  const ty = pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="${BLACK}"/>
  <g transform="translate(${tx}, ${ty}) scale(${scale})">
    <path fill="${ORANGE}" d="M6,4 L6,20 L9,20 L9,13.5 L15,20 L19,20 L12,12 L18.5,4 L14.5,4 L9,11 L9,4 Z"/>
  </g>
</svg>`;
}

function splashSvg(w, h) {
  // Splash: black background, centred K at 1/3 of the shorter dimension
  const iconSize = Math.min(w, h) / 3;
  const tx = (w - iconSize) / 2;
  const ty = (h - iconSize) / 2;
  const scale = iconSize / 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${BLACK}"/>
  <g transform="translate(${tx}, ${ty}) scale(${scale})">
    <path fill="${ORANGE}" d="M6,4 L6,20 L9,20 L9,13.5 L15,20 L19,20 L12,12 L18.5,4 L14.5,4 L9,11 L9,4 Z"/>
  </g>
</svg>`;
}

async function run() {
  const assetsDir = path.join(root, 'assets');
  mkdirSync(assetsDir, { recursive: true });

  console.log('Generating icon 1024x1024…');
  await sharp(Buffer.from(iconSvg(ICON_SIZE)))
    .resize(ICON_SIZE, ICON_SIZE)
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));

  console.log('Generating icon foreground (transparent bg) 1024x1024…');
  // Foreground: just the K path on transparent — used for adaptive icons on Android 8+
  const fgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 ${ICON_SIZE} ${ICON_SIZE}">
    <g transform="translate(${ICON_SIZE * 0.2}, ${ICON_SIZE * 0.2}) scale(${(ICON_SIZE * 0.6) / 24})">
      <path fill="${ORANGE}" d="M6,4 L6,20 L9,20 L9,13.5 L15,20 L19,20 L12,12 L18.5,4 L14.5,4 L9,11 L9,4 Z"/>
    </g>
  </svg>`;
  await sharp(Buffer.from(fgSvg))
    .resize(ICON_SIZE, ICON_SIZE)
    .png()
    .toFile(path.join(assetsDir, 'icon-foreground.png'));

  console.log('Generating splash 2732x2732…');
  await sharp(Buffer.from(splashSvg(SPLASH_W, SPLASH_H)))
    .resize(SPLASH_W, SPLASH_H)
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));

  console.log('Running @capacitor/assets generate…');
  execSync('npx @capacitor/assets generate --assetPath assets --android --ios', {
    cwd: root,
    stdio: 'inherit',
  });

  console.log('Done. All platform icons and splash screens regenerated.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
