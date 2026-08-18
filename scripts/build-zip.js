import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { Packer } from 'roadroller';
import { minify } from 'terser';

const MAX_BYTES = 13312; // 13KB limit for JS13k

async function runBuildPipeline() {
  console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════');
  console.log('\x1b[35m%s\x1b[0m', '  🌟 JS13K WebXR: CHROMA - Fast Build & Compression Pipeline');
  console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════');

  const distDir = path.resolve('dist');
  const htmlPath = path.join(distDir, 'index.html');

  if (!fs.existsSync(htmlPath)) {
    console.error('\x1b[31mError: dist/index.html not found! Run "vite build" first.\x1b[0m');
    process.exit(1);
  }

  let html = fs.readFileSync(htmlPath, 'utf-8');
  const rawHtmlSize = Buffer.byteLength(html, 'utf-8');
  console.log(`\x1b[33mOriginal HTML bundle size: ${rawHtmlSize.toLocaleString()} bytes\x1b[0m`);

  // Find inline scripts with code > 100 chars
  const inlineScriptRegex = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let scriptFound = null;

  while ((match = inlineScriptRegex.exec(html)) !== null) {
    if (match[1] && match[1].trim().length > 100 && !match[1].startsWith("M='")) {
      scriptFound = {
        fullMatch: match[0],
        code: match[1].trim()
      };
      break;
    }
  }

  if (scriptFound) {
    console.log(`\x1b[34mRunning Roadroller quick optimization on JavaScript (${Buffer.byteLength(scriptFound.code, 'utf-8').toLocaleString()} bytes)...\x1b[0m`);

    try {
      const minified = await minify(scriptFound.code, {
        ecma: 2020,
        module: true,
        toplevel: true,
        compress: {
          passes: 5,
          unsafe: true,
          unsafe_arrows: true,
          unsafe_comps: true,
          unsafe_math: true,
          unsafe_methods: true,
          hoist_funs: true,
          hoist_vars: true,
          reduce_vars: true,
          drop_console: true,
          pure_getters: true
        },
        mangle: { toplevel: true }
      });
      const codeToPack = minified.code || scriptFound.code;

      const packer = new Packer(
        [
          {
            data: codeToPack,
            type: 'js',
            action: 'eval'
          }
        ],
        {
          numAbbreviations: 128,
          allowFreeVars: true
        }
      );

      // Deep Level 2 optimization for JS13k competition budget
      await packer.optimize(2);
      const { firstLine, secondLine } = packer.makeDecoder();
      const packedJs = `${firstLine}\n${secondLine}`;

      console.log(`\x1b[32mRoadroller packed JS size: ${Buffer.byteLength(packedJs, 'utf-8').toLocaleString()} bytes\x1b[0m`);

      // Replace with packed script
      html = html.replace(scriptFound.fullMatch, `<script>${packedJs}</script>`);
      
      // Minify HTML structure
      html = html
        .replace(/\n\s*/g, '')
        .replace(/>\s+</g, '><')
        .trim();

      fs.writeFileSync(htmlPath, html, 'utf-8');
    } catch (e) {
      console.warn('\x1b[33mRoadroller step encountered warning, continuing with terser bundle:\x1b[0m', e.message);
    }
  }

  // Create ZIP archive
  console.log('\x1b[34mGenerating final JS13k ZIP archive...\x1b[0m');
  const zip = new JSZip();
  zip.file('index.html', html, {
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  const zipPath = path.join(distDir, 'game.zip');
  fs.writeFileSync(zipPath, zipBuffer);

  const zipSize = zipBuffer.length;
  const remaining = MAX_BYTES - zipSize;
  const percentage = ((zipSize / MAX_BYTES) * 100).toFixed(1);

  console.log('\n\x1b[36m%s\x1b[0m', '───────────────────────────────────────────────────────');
  console.log('\x1b[1m\x1b[37m  📦 FINAL JS13K PACKAGE SIZE REPORT:\x1b[0m');
  console.log(`  File:        ${zipPath}`);
  console.log(`  Zip Size:    \x1b[1m\x1b[33m${zipSize.toLocaleString()} bytes\x1b[0m / ${MAX_BYTES.toLocaleString()} bytes`);
  console.log(`  Capacity:    \x1b[1m\x1b[36m${percentage}%\x1b[0m used`);

  const barLength = 30;
  const filled = Math.round((zipSize / MAX_BYTES) * barLength);
  const empty = Math.max(0, barLength - filled);
  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  if (zipSize <= MAX_BYTES) {
    console.log(`  Status:      \x1b[42m\x1b[30m  SUCCESS - UNDER 13KB!  \x1b[0m (${remaining.toLocaleString()} bytes remaining)`);
    console.log(`  Progress:    \x1b[32m[${bar}]\x1b[0m`);
  } else {
    console.log(`  Status:      \x1b[41m\x1b[37m  OVER BUDGET BY ${(zipSize - MAX_BYTES).toLocaleString()} BYTES  \x1b[0m`);
    console.log(`  Progress:    \x1b[31m[${bar}]\x1b[0m`);
  }
  console.log('\x1b[36m%s\x1b[0m\n', '───────────────────────────────────────────────────────');
}

runBuildPipeline().catch(console.error);
