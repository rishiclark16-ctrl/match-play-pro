#!/usr/bin/env node
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 1024;
const OUT_DIR = path.join(__dirname, '..', 'brand', 'previews');
fs.mkdirSync(OUT_DIR, { recursive: true });

const BG = '#0A0A0A';
const WHITE = '#FFFFFF';
const GOLD = '#F0EE3A';
const GOLD_DEEP = '#EBE422';

function drawWordmark(opts) {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  // Background
  if (opts.bgGradient) {
    const g = ctx.createLinearGradient(0, 0, SIZE * 0.5, SIZE);
    g.addColorStop(0, '#151515');
    g.addColorStop(1, BG);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = BG;
  }
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Optional subtle texture dots
  if (opts.dots) {
    ctx.fillStyle = 'rgba(240,238,58,0.03)';
    for (let x = 0; x < SIZE; x += 40) {
      for (let y = 0; y < SIZE; y += 40) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const fontSize = opts.fontSize || 220;
  const tracking = opts.tracking || -8;
  const word = 'MATCH';
  const yOffset = opts.yOffset || 0;

  // Measure total width with tracking
  ctx.font = `900 ${fontSize}px Inter, -apple-system, "SF Pro Display", sans-serif`;
  const letters = word.split('');
  const widths = letters.map(l => ctx.measureText(l).width);
  const totalW = widths.reduce((s, w) => s + w, 0) + tracking * (letters.length - 1);

  let x = (SIZE - totalW) / 2;
  const y = SIZE / 2 + yOffset;

  // Optional gold glow behind the A
  if (opts.glow) {
    const aIdx = 1;
    let ax = (SIZE - totalW) / 2;
    for (let i = 0; i < aIdx; i++) ax += widths[i] + tracking;
    const aCenterX = ax + widths[aIdx] / 2;
    const glowGrad = ctx.createRadialGradient(aCenterX, y, 0, aCenterX, y, fontSize * 0.7);
    glowGrad.addColorStop(0, 'rgba(240,238,58,0.08)');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  // Draw each letter
  for (let i = 0; i < letters.length; i++) {
    const isA = letters[i] === 'A';
    ctx.fillStyle = isA ? (opts.goldColor || GOLD) : WHITE;
    ctx.font = `900 ${fontSize}px Inter, -apple-system, "SF Pro Display", sans-serif`;
    ctx.fillText(letters[i], x + widths[i] / 2, y);
    x += widths[i] + tracking;
  }

  // Optional underline accent
  if (opts.underline) {
    const lineW = opts.underlineWidth || 120;
    const lineH = opts.underlineHeight || 8;
    const lineY = y + fontSize * 0.45;
    ctx.fillStyle = opts.goldColor || GOLD;
    ctx.beginPath();
    ctx.roundRect(SIZE / 2 - lineW / 2, lineY, lineW, lineH, lineH / 2);
    ctx.fill();
  }

  return canvas;
}

const variants = [
  {
    name: '01-clean',
    label: 'Clean — large centered wordmark',
    fontSize: 210,
    tracking: -7,
    bgGradient: true,
  },
  {
    name: '02-tight',
    label: 'Tight — tighter tracking, gold glow',
    fontSize: 230,
    tracking: -12,
    bgGradient: true,
    glow: true,
  },
  {
    name: '03-underline',
    label: 'Underline — gold accent bar below',
    fontSize: 200,
    tracking: -7,
    bgGradient: true,
    underline: true,
    underlineWidth: 140,
    underlineHeight: 8,
    yOffset: -10,
  },
  {
    name: '04-dots-glow',
    label: 'Textured — dot grid + glow',
    fontSize: 220,
    tracking: -9,
    bgGradient: true,
    dots: true,
    glow: true,
    goldColor: GOLD_DEEP,
  },
];

console.log('Generating logo previews...\n');

for (const v of variants) {
  const canvas = drawWordmark(v);
  const buf = canvas.toBuffer('image/png');
  const file = path.join(OUT_DIR, `${v.name}.png`);
  fs.writeFileSync(file, buf);
  console.log(`  ${v.name}.png — ${v.label}`);
}

console.log(`\nPreviews saved to brand/previews/`);
