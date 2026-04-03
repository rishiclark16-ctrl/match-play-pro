#!/usr/bin/env node
/**
 * Generate MATCH Golf app icon at all required sizes.
 * Design: "Plush Flag" — soft 3D golf flag, chartreuse body, white pole, no text.
 *
 * Uses @napi-rs/canvas for PNG generation.
 */

const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// Icon sizes needed
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

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size / 512; // scale factor (design at 512)

  // Background — subtle gradient from #111 to #0A0A0A
  const bgGrad = ctx.createLinearGradient(0, 0, size * 0.6, size);
  bgGrad.addColorStop(0, '#111111');
  bgGrad.addColorStop(1, '#0A0A0A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // ---- POLE ----
  const poleX = 200 * s;       // left edge of pole
  const poleW = 12 * s;        // pole width
  const poleTop = 72 * s;      // top of pole
  const poleBot = 430 * s;     // bottom of pole

  // Pole cylinder gradient (left to right)
  const poleGrad = ctx.createLinearGradient(poleX, 0, poleX + poleW, 0);
  poleGrad.addColorStop(0, '#CCCCCC');
  poleGrad.addColorStop(0.25, '#FFFFFF');
  poleGrad.addColorStop(0.55, '#EEEEEE');
  poleGrad.addColorStop(1, '#AAAAAA');

  // Pole shadow
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.roundRect(poleX + 3 * s, poleTop + 4 * s, poleW, poleBot - poleTop, poleW / 2);
  ctx.fill();
  ctx.restore();

  // Pole body
  ctx.fillStyle = poleGrad;
  ctx.beginPath();
  ctx.roundRect(poleX, poleTop, poleW, poleBot - poleTop, poleW / 2);
  ctx.fill();

  // ---- POLE CAP (ball on top) ----
  const capR = 9 * s;
  const capCX = poleX + poleW / 2;
  const capCY = poleTop - capR * 0.3;

  const capGrad = ctx.createRadialGradient(
    capCX - capR * 0.3, capCY - capR * 0.3, capR * 0.1,
    capCX, capCY, capR
  );
  capGrad.addColorStop(0, '#FFFFFF');
  capGrad.addColorStop(0.5, '#EEEEEE');
  capGrad.addColorStop(1, '#BBBBBB');

  ctx.fillStyle = capGrad;
  ctx.beginPath();
  ctx.arc(capCX, capCY, capR, 0, Math.PI * 2);
  ctx.fill();

  // Cap shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.arc(capCX + 1 * s, capCY + 2 * s, capR, 0, Math.PI * 2);
  ctx.fill();

  // Redraw cap on top of shadow
  ctx.fillStyle = capGrad;
  ctx.beginPath();
  ctx.arc(capCX, capCY, capR, 0, Math.PI * 2);
  ctx.fill();

  // ---- FLAG BODY (pennant) ----
  const flagLeft = poleX + poleW - 1 * s;
  const flagTop = poleTop + 2 * s;
  const flagW = 200 * s;
  const flagH = 140 * s;

  // Flag shape using bezier curves (pennant with wave)
  ctx.save();

  // Drop shadow for flag
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.moveTo(flagLeft + 4 * s, flagTop + 6 * s);
  ctx.lineTo(flagLeft + flagW * 0.85 + 4 * s, flagTop + flagH * 0.12 + 6 * s);
  ctx.quadraticCurveTo(flagLeft + flagW + 4 * s, flagTop + flagH * 0.5 + 6 * s, flagLeft + flagW * 0.85 + 4 * s, flagTop + flagH * 0.88 + 6 * s);
  ctx.lineTo(flagLeft + 4 * s, flagTop + flagH + 6 * s);
  ctx.closePath();
  ctx.fill();

  // Main flag gradient
  const flagGrad = ctx.createLinearGradient(flagLeft, flagTop, flagLeft + flagW * 0.7, flagTop + flagH);
  flagGrad.addColorStop(0, '#F7F540');
  flagGrad.addColorStop(0.3, '#F0EE3A');
  flagGrad.addColorStop(0.6, '#D4D230');
  flagGrad.addColorStop(1, '#B8B625');

  ctx.fillStyle = flagGrad;
  ctx.beginPath();
  ctx.moveTo(flagLeft, flagTop);
  ctx.lineTo(flagLeft + flagW * 0.85, flagTop + flagH * 0.12);
  ctx.quadraticCurveTo(flagLeft + flagW, flagTop + flagH * 0.5, flagLeft + flagW * 0.85, flagTop + flagH * 0.88);
  ctx.lineTo(flagLeft, flagTop + flagH);
  ctx.closePath();
  ctx.fill();

  // Highlight on top portion of flag
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(flagLeft, flagTop);
  ctx.lineTo(flagLeft + flagW * 0.85, flagTop + flagH * 0.12);
  ctx.quadraticCurveTo(flagLeft + flagW, flagTop + flagH * 0.5, flagLeft + flagW * 0.85, flagTop + flagH * 0.88);
  ctx.lineTo(flagLeft, flagTop + flagH);
  ctx.closePath();
  ctx.clip();

  const hlGrad = ctx.createLinearGradient(flagLeft, flagTop, flagLeft, flagTop + flagH);
  hlGrad.addColorStop(0, 'rgba(255,255,255,0.25)');
  hlGrad.addColorStop(0.25, 'rgba(255,255,255,0.08)');
  hlGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
  hlGrad.addColorStop(0.75, 'rgba(0,0,0,0.06)');
  hlGrad.addColorStop(1, 'rgba(255,255,255,0.12)');
  ctx.fillStyle = hlGrad;
  ctx.fillRect(flagLeft, flagTop, flagW, flagH);
  ctx.restore();

  // Inner shadow on flag (soft plush feel)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(flagLeft, flagTop);
  ctx.lineTo(flagLeft + flagW * 0.85, flagTop + flagH * 0.12);
  ctx.quadraticCurveTo(flagLeft + flagW, flagTop + flagH * 0.5, flagLeft + flagW * 0.85, flagTop + flagH * 0.88);
  ctx.lineTo(flagLeft, flagTop + flagH);
  ctx.closePath();
  ctx.clip();

  const innerShadow = ctx.createLinearGradient(flagLeft + flagW * 0.6, flagTop, flagLeft + flagW, flagTop + flagH * 0.5);
  innerShadow.addColorStop(0, 'rgba(0,0,0,0)');
  innerShadow.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = innerShadow;
  ctx.fillRect(flagLeft, flagTop, flagW, flagH);
  ctx.restore();

  ctx.restore();

  // ---- GROUND GLOW ----
  // Green ambient glow
  const glowGrad = ctx.createRadialGradient(
    size * 0.5, poleBot - 5 * s, 0,
    size * 0.5, poleBot - 5 * s, 80 * s
  );
  glowGrad.addColorStop(0, 'rgba(27,120,50,0.35)');
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.ellipse(size * 0.5, poleBot - 2 * s, 80 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dark ground shadow
  const shadowGrad = ctx.createRadialGradient(
    poleX + poleW / 2 + 10 * s, poleBot + 2 * s, 0,
    poleX + poleW / 2 + 10 * s, poleBot + 2 * s, 55 * s
  );
  shadowGrad.addColorStop(0, 'rgba(0,0,0,0.35)');
  shadowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(poleX + poleW / 2 + 10 * s, poleBot + 4 * s, 55 * s, 10 * s, 0, 0, Math.PI * 2);
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

  // Ensure dirs exist
  for (const dir of [brandDir, brandAllDir, brandIconsDir, xcassetDir, publicDir, srcAssetsDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log('Generating Plush Flag icons...\n');

  // Generate all standard sizes
  for (const { size, name } of SIZES) {
    const canvas = drawIcon(size);
    const buffer = canvas.toBuffer('image/png');

    fs.writeFileSync(path.join(brandAllDir, name), buffer);
    fs.writeFileSync(path.join(xcassetDir, name), buffer);
    fs.writeFileSync(path.join(brandIconsDir, name), buffer);

    console.log(`  \u2713 ${name} (${size}x${size})`);
  }

  // Generate extra named variants
  for (const { size, name } of EXTRA) {
    const canvas = drawIcon(size);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(brandDir, name), buffer);
    fs.writeFileSync(path.join(brandIconsDir, name), buffer);
    console.log(`  \u2713 brand/${name} (${size}x${size})`);
  }

  // public/app-icon.png
  const appIcon512 = drawIcon(512);
  fs.writeFileSync(path.join(publicDir, 'app-icon.png'), appIcon512.toBuffer('image/png'));
  console.log('  \u2713 public/app-icon.png (512x512)');

  // public/favicon-192.png & favicon-512.png
  const fav192 = drawIcon(192);
  fs.writeFileSync(path.join(publicDir, 'favicon-192.png'), fav192.toBuffer('image/png'));
  console.log('  \u2713 public/favicon-192.png (192x192)');

  const fav512 = drawIcon(512);
  fs.writeFileSync(path.join(publicDir, 'favicon-512.png'), fav512.toBuffer('image/png'));
  console.log('  \u2713 public/favicon-512.png (512x512)');

  // src/assets/app-icon-1024.png
  const srcIcon = drawIcon(1024);
  fs.writeFileSync(path.join(srcAssetsDir, 'app-icon-1024.png'), srcIcon.toBuffer('image/png'));
  console.log('  \u2713 src/assets/app-icon-1024.png (1024x1024)');

  // ios/App/App/public/app-icon.png
  if (fs.existsSync(iosPublicDir)) {
    fs.writeFileSync(path.join(iosPublicDir, 'app-icon.png'), appIcon512.toBuffer('image/png'));
    console.log('  \u2713 ios/App/App/public/app-icon.png (512x512)');
  }

  console.log('\n\u2705 All Plush Flag icons generated successfully!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
