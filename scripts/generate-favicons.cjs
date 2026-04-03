#!/usr/bin/env node
/**
 * Generate favicon PNGs for PWA / web.
 */

const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size / 512;

  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(0, 0, size, size);

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

  const baseY = Math.round(280 * s);
  let x = (size - totalWidth) / 2;
  for (let i = 0; i < letters.length; i++) {
    ctx.fillStyle = colors[i];
    ctx.font = mainFont;
    ctx.fillText(letters[i], x + widths[i] / 2, baseY);
    x += widths[i] + letterSpacing;
  }

  if (size >= 60) {
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
    const subY = Math.round(340 * s);
    let subX = (size - subTotalWidth) / 2;
    for (let i = 0; i < subtitle.length; i++) {
      ctx.fillStyle = i === subtitle.length - 1 ? '#F0EE3A' : '#555555';
      ctx.fillText(subtitle[i], subX + subWidths[i] / 2, subY);
      subX += subWidths[i] + charSpacing;
    }
  }

  return canvas;
}

const publicDir = path.join(__dirname, '..', 'public');

const sizes = [
  { size: 512, name: 'favicon-512.png' },
  { size: 192, name: 'favicon-192.png' },
];

for (const { size, name } of sizes) {
  const canvas = drawIcon(size);
  fs.writeFileSync(path.join(publicDir, name), canvas.toBuffer('image/png'));
  console.log(`  ✓ public/${name} (${size}x${size})`);
}

console.log('\n✅ Favicons generated!');
