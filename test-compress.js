import fs from 'fs';
import JSZip from 'jszip';
import { Packer } from 'roadroller';
import { minify } from 'terser';

async function test() {
  const html = fs.readFileSync('dist/index.html', 'utf-8');
  const inlineScriptRegex = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let match, scriptFound = null;
  while ((match = inlineScriptRegex.exec(html)) !== null) {
    if (match[1] && match[1].trim().length > 100 && !match[1].startsWith("M='")) {
      scriptFound = match[1].trim();
      break;
    }
  }
  if (!scriptFound) {
    console.log('No raw script found in dist/index.html, building vite first...');
    return;
  }

  const minified = await minify(scriptFound, {
    ecma: 2020, module: true, toplevel: true,
    compress: {
      passes: 10, unsafe: true, unsafe_arrows: true, unsafe_comps: true, unsafe_math: true,
      unsafe_methods: true, unsafe_proto: true, hoist_funs: true, hoist_vars: true,
      reduce_vars: true, drop_console: true, drop_debugger: true, pure_getters: true
    },
    mangle: { toplevel: true }
  });

  console.log(`Minified JS: ${Buffer.byteLength(minified.code, 'utf-8')} bytes`);

  for (const abbrev of [32, 64, 128]) {
    for (const level of [1, 2]) {
      const packer = new Packer([{ data: minified.code, type: 'js', action: 'eval' }], {
        numAbbreviations: abbrev,
        allowFreeVars: true
      });
      await packer.optimize(level);
      const { firstLine, secondLine } = packer.makeDecoder();
      const packedJs = `${firstLine}\n${secondLine}`;
      const newHtml = html.replace(/<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i, () => `<script>${packedJs}</script>`).replace(/\n\s*/g, '').replace(/>\s+</g, '><').trim();

      const zip = new JSZip();
      zip.file('index.html', newHtml, { compression: 'DEFLATE', compressionOptions: { level: 9 } });
      const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
      console.log(`Abbrev: ${abbrev}, Level: ${level} -> Packed JS: ${Buffer.byteLength(packedJs, 'utf-8')}, Zip: ${buf.length} bytes`);
    }
  }
}
test().catch(console.error);
