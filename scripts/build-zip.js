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
          passes: 10,
          unsafe: true,
          unsafe_arrows: true,
          unsafe_comps: true,
          unsafe_math: true,
          unsafe_methods: true,
          unsafe_proto: true,
          unsafe_undefined: true,
          booleans_as_integers: false,
          hoist_funs: true,
          hoist_vars: true,
          reduce_vars: true,
          drop_console: true,
          drop_debugger: true,
          pure_getters: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
        },
        mangle: { toplevel: true }
      });
      const codeToPack = minified.code || scriptFound.code;

      // Match any existing Three.js script tags
      const threeRegex = /<script\b[^>]*>(?:import\*as T from["']\/2026\/webxr\/three\.js["'][^<]*|[^<]*src=[^>]*three[^>]*)<\/script>/i;
      const threeMatch = html.match(threeRegex);

      let bestPacked = null, minZipLen = Infinity;
      for (const abbr of [0, 32]) {
        const packer = new Packer(
          [{ data: codeToPack, type: 'js', action: 'eval' }],
          { numAbbreviations: abbr, allowFreeVars: true }
        );
        await packer.optimize(1);
        const { firstLine, secondLine } = packer.makeDecoder();
        let packedJs = `${firstLine}\n${secondLine}`;
        // Ensure ES module strict mode compatibility (transform `with` statements)
        packedJs = packedJs.replace(/with\(([^.]+)\.split\(([^)]+)\)\)\s*\1\s*=\s*join\(shift\(\)\)/g, '$1=(_r=$1.split($2)).join(_r.shift())');

        let testHtml = html;
        if (threeMatch) {
          testHtml = testHtml.replace(threeRegex, '');
        }
        testHtml = testHtml.replace(scriptFound.fullMatch, () => `<script type="module">import*as T from"/2026/webxr/three.js";window.THREE=T;${packedJs}</script>`);
        testHtml = testHtml.replace(/\n\s*/g, '').replace(/>\s+</g, '><').trim();

        const testZip = new JSZip();
        testZip.file('index.html', testHtml, { compression: 'DEFLATE', compressionOptions: { level: 9 } });
        const testBuf = await testZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });

        if (testBuf.length < minZipLen) {
          minZipLen = testBuf.length;
          bestPacked = packedJs;
        }
      }
      const packedJs = bestPacked;

      console.log(`\x1b[32mRoadroller best packed JS size: ${Buffer.byteLength(packedJs, 'utf-8').toLocaleString()} bytes\x1b[0m`);

      if (threeMatch) {
        html = html.replace(threeRegex, '');
      }
      html = html.replace(scriptFound.fullMatch, () => `<script type="module">import*as T from"/2026/webxr/three.js";window.THREE=T;${packedJs}</script>`);
      
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
