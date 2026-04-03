#!/usr/bin/env node
/**
 * Generate MATCH Golf splash screens with new branding.
 */

const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const SIZES = [
  { width: 2732, height: 2732, name: 'splash-screen-2732.png' },
  { width: 1024, height: 1024, name: 'splash-screen.png' },
];

function drawSplash(width, height) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const s = Math.min(width, height) / 512;

  // Background
  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height / 2 - 20 * s;

  // MATCH text
  const mainFontSize = Math.round(118 * s);
  const mainFont = `900 ${mainFontSize}px "Inter", "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;
  ctx.font = mainFont;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const letters = ['M', 'A', 'T', 'C', 'H'];
  const colors = ['#FFFFFF', '#F0EE3A', '#FFFFFF', '#FFFFFF', '#FFFFFF'];
  const letterSpacing = -3 * s;

  let totalWidth = 0;
  const widths = [];
  for (const letter of letters) {
    const w = ctx.measureText(letter).width;
    widths.push(w);
    totalWidth += w;
  }
  totalWidth += letterSpacing * (letters.length - 1);

  let x = centerX - totalWidth / 2;
  for (let i = 0; i < letters.length; i++) {
    ctx.fillStyle = colors[i];
    ctx.font = mainFont;
    ctx.fillText(letters[i], x + widths[i] / 2, centerY);
    x += widths[i] + letterSpacing;
  }

  // Subtitle
  const subFontSize = Math.round(24 * s);
  const subFont = `600 ${subFontSize}px "Inter", "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;
  ctx.font = subFont;

  const subtitle = 'SCORE. BET. WIN.';
  const charSpacing = 6 * s;
  let subTotalWidth = 0;
  const subWidths = [];
  for (const ch of subtitle) {
    const w = ctx.measureText(ch).width;
    subWidths.push(w);
    subTotalWidth += w;
  }
  subTotalWidth += charSpacing * (subtitle.length - 1);

  const subY = centerY + 60 * s;
  let subX = centerX - subTotalWidth / 2;
  for (let i = 0; i < subtitle.length; i++) {
    ctx.fillStyle = i === subtitle.length - 1 ? '#F0EE3A' : '#555555';
    ctx.fillText(subtitle[i], subX + subWidths[i] / 2, subY);
    subX += subWidths[i] + charSpacing;
  }

  return canvas;
}

const brandDir = path.join(__dirname, '..', 'brand');
const splashDir = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');

for (const { width, height, name } of SIZES) {
  const canvas = drawSplash(width, height);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(brandDir, name), buffer);
  console.log(`  ✓ brand/${name} (${width}x${height})`);

  if (fs.existsSync(splashDir)) {
    fs.writeFileSync(path.join(splashDir, name), buffer);
    console.log(`  ✓ Splash.imageset/${name}`);
  }
}

console.log('\n✅ Splash screens generated!');
