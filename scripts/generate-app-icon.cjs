#!/usr/bin/env node
/**
 * Generate MATCH Golf app icon at all required sizes.
 * Design: "MATCH" wordmark — Inter Black, chartreuse A, gold underline accent.
 *
 * Uses @napi-rs/canvas for PNG generation.
 */

const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const SIZES = [
  { size: 1024, name: 'AppIcon-1024.png' },
  { size: 180,  name: 'AppIcon-180.png' },
  { size: 167,  name: 'AppIcon-167.png' },
  { size: 152,  name: 'AppIcon-152.png' },
  { size: 120,  name: 'AppIcon-120.png' },
  { size: 87,   name: 'AppIcon-87.png' },
  { size: 80,   name: 'AppIcon-80.png' },
  { size: 76,   name: 'AppIcon-76.png' },
  { size: 60,   name: 'AppIcon-60.png' },
  { size: 58,   name: 'AppIcon-58.png' },
  { size: 40,   name: 'AppIcon-40.png' },
  { size: 29,   name: 'AppIcon-29.png' },
  { size: 20,   name: 'AppIcon-20.png' },
];

const EXTRA = [
  { size: 1024, name: 'app-icon-1024.png' },
  { size: 512,  name: 'logo-icon-512.png' },
  { size: 192,  name: 'logo-icon-192.png' },
  { size: 512,  name: 'favicon-512.png' },
];

const BG = '#0A0A0A';
const WHITE = '#FFFFFF';
const GOLD = '#F0EE3A';

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size / 1024;

  // Background with subtle gradient
  const bgGrad = ctx.createLinearGradient(0, 0, size * 0.5, size);
  bgGrad.addColorStop(0, '#151515');
  bgGrad.addColorStop(1, BG);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Wordmark
  const fontSize = Math.round(200 * s);
  const tracking = -7 * s;
  const word = 'MATCH';
  const yOffset = -10 * s;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${fontSize}px Inter, -apple-system, "SF Pro Display", system-ui, sans-serif`;

  const letters = word.split('');
  const widths = letters.map(l => ctx.measureText(l).width);
  const totalW = widths.reduce((sum, w) => sum + w, 0) + tracking * (letters.length - 1);

  let x = (size - totalW) / 2;
  const y = size / 2 + yOffset;

  for (let i = 0; i < letters.length; i++) {
    ctx.fillStyle = letters[i] === 'A' ? GOLD : WHITE;
    ctx.fillText(letters[i], x + widths[i] / 2, y);
    x += widths[i] + tracking;
  }

  // Gold underline accent
  const lineW = 140 * s;
  const lineH = 8 * s;
  const lineY = y + fontSize * 0.45;
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.roundRect(size / 2 - lineW / 2, lineY, lineW, lineH, lineH / 2);
  ctx.fill();

  return canvas;
}

async function main() {
  const brandDir = path.join(__dirname, '..', 'brand');
  const brandAllDir = path.join(brandDir, 'app-icons-all-sizes');
  const brandIconsDir = path.join(brandDir, 'app-brand-icons');
  const xcassetDir = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
  const publicDir = path.join(__dirname, '..', 'public');
  const srcAssetsDir = path.join(__dirname, '..', 'src', 'assets');
  const iosPublicDir = path.join(__dirname, '..', 'ios', 'App', 'App', 'public');

  for (const dir of [brandDir, brandAllDir, brandIconsDir, xcassetDir, publicDir, srcAssetsDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log('Generating MATCH wordmark icons...\n');

  for (const { size, name } of SIZES) {
    const canvas = drawIcon(size);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(brandAllDir, name), buffer);
    fs.writeFileSync(path.join(xcassetDir, name), buffer);
    fs.writeFileSync(path.join(brandIconsDir, name), buffer);
    console.log(`  \u2713 ${name} (${size}x${size})`);
  }

  for (const { size, name } of EXTRA) {
    const canvas = drawIcon(size);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(brandDir, name), buffer);
    fs.writeFileSync(path.join(brandIconsDir, name), buffer);
    console.log(`  \u2713 brand/${name} (${size}x${size})`);
  }

  const appIcon512 = drawIcon(512);
  fs.writeFileSync(path.join(publicDir, 'app-icon.png'), appIcon512.toBuffer('image/png'));
  console.log('  \u2713 public/app-icon.png (512x512)');

  const fav192 = drawIcon(192);
  fs.writeFileSync(path.join(publicDir, 'favicon-192.png'), fav192.toBuffer('image/png'));
  console.log('  \u2713 public/favicon-192.png (192x192)');

  const fav512 = drawIcon(512);
  fs.writeFileSync(path.join(publicDir, 'favicon-512.png'), fav512.toBuffer('image/png'));
  console.log('  \u2713 public/favicon-512.png (512x512)');

  const srcIcon = drawIcon(1024);
  fs.writeFileSync(path.join(srcAssetsDir, 'app-icon-1024.png'), srcIcon.toBuffer('image/png'));
  console.log('  \u2713 src/assets/app-icon-1024.png (1024x1024)');

  if (fs.existsSync(iosPublicDir)) {
    fs.writeFileSync(path.join(iosPublicDir, 'app-icon.png'), appIcon512.toBuffer('image/png'));
    console.log('  \u2713 ios/App/App/public/app-icon.png (512x512)');
  }

  console.log('\n\u2705 All MATCH wordmark icons generated successfully!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
