#!/usr/bin/env node
/**
 * Generate cinematic golf course images for the Auth page Ken Burns slideshow.
 *
 * Usage:
 *   GEMINI_API_KEY=your_key node scripts/generate-auth-images.js
 *
 * Output: src/assets/videos/golf-1.jpg, golf-2.jpg, golf-3.jpg, golf-4.jpg
 *
 * If rate-limited (429), wait a few minutes and re-run.
 * Already-existing images are skipped — delete them to regenerate.
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Set GEMINI_API_KEY env var first.');
  process.exit(1);
}

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-2.5-flash-image';
const OUT = path.resolve(__dirname, '../src/assets/videos');

const prompts = [
  {
    file: 'golf-1.png',
    prompt:
      'Generate an image: Cinematic photograph of a pristine golf course fairway at golden hour. ' +
      'Warm amber sunlight streaming through mature oak trees, long dramatic shadows across emerald ' +
      'green grass. Morning dew glistening. Shot on 35mm film, shallow depth of field, anamorphic ' +
      'lens flare. No people. Vertical portrait 9:16. Rich greens and warm golden tones.',
  },
  {
    file: 'golf-2.png',
    prompt:
      'Generate an image: Cinematic photograph of a golf putting green shrouded in thin morning mist ' +
      'at dawn. A single flag pin in the center. Dramatic warm light breaking through low clouds, ' +
      'dew drops on pristine grass. Medium format film, dreamy atmosphere. No people. Vertical ' +
      'portrait 9:16. Ethereal fog, deep greens, soft warm light.',
  },
  {
    file: 'golf-3.png',
    prompt:
      'Generate an image: Cinematic photograph of a coastal links golf course at golden sunset. ' +
      'Ocean in the distant background. Dramatic orange and purple sky. Wild dune grass swaying ' +
      'along fairway edges. A flagstick on a distant green. No people. Vertical portrait 9:16. ' +
      'Epic dramatic landscape, warm golden light, deep shadows. 35mm film.',
  },
  {
    file: 'golf-4.png',
    prompt:
      'Generate an image: Cinematic overhead angled photograph looking down a lush golf fairway ' +
      'towards a green with bunkers. Early morning light creating long shadows. Perfectly striped ' +
      'mowing pattern. Mature trees lining both sides. Small water feature reflecting the sky. ' +
      'No people. Vertical portrait 9:16. Rich saturated greens, warm golden light.',
  },
];

async function generate(p) {
  const outPath = path.join(OUT, p.file);
  if (fs.existsSync(outPath)) {
    console.log(`   ⏭  ${p.file} already exists — skipping`);
    return outPath;
  }

  const resp = await fetch(`${BASE}/models/${MODEL}:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: p.prompt }] }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    if (resp.status === 429) {
      console.log(`   ⚠️  Rate limited — wait a few minutes and re-run`);
    } else {
      console.log(`   ❌ ${resp.status}: ${err.substring(0, 200)}`);
    }
    return null;
  }

  const data = await resp.json();
  const parts = data.candidates?.[0]?.content?.parts || [];

  for (const part of parts) {
    if (part.inlineData?.mimeType?.startsWith('image/')) {
      const buf = Buffer.from(part.inlineData.data, 'base64');
      fs.writeFileSync(outPath, buf);
      console.log(`   ✅ ${p.file} (${(buf.length / 1024).toFixed(0)} KB)`);
      return outPath;
    }
  }

  console.log('   ⚠️  No image returned');
  return null;
}

async function main() {
  console.log('🎨 MATCH Golf — Auth Image Generator');
  console.log(`   Output: ${OUT}\n`);

  fs.mkdirSync(OUT, { recursive: true });

  let ok = 0;
  for (let i = 0; i < prompts.length; i++) {
    console.log(`[${i + 1}/${prompts.length}] ${prompts[i].file}`);
    const result = await generate(prompts[i]);
    if (result) ok++;
    // Delay between requests to avoid rate limits
    if (i < prompts.length - 1) await new Promise((r) => setTimeout(r, 5000));
  }

  console.log(`\n✅ ${ok}/${prompts.length} images generated`);
  if (ok > 0) console.log('   Run `bun run build` to include them in the bundle.');
}

main().catch(console.error);
