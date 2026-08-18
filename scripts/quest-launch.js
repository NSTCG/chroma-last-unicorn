#!/usr/bin/env node

/**
 * Meta Quest USB ADB Fast-Launch & Reverse Proxy
 * Usage:
 *   npm run quest          (starts Vite dev server & opens tab on Quest)
 *   npm run quest:preview  (starts Vite preview server & opens tab on Quest)
 *   npm run quest:open     (opens Quest browser tab without starting server)
 */

import { execSync, spawn } from 'child_process';

const isPreview = process.argv.includes('--preview');
const isOpenOnly = process.argv.includes('--open-only');
const port = isPreview ? 4173 : 5173;
const url = `http://localhost:${port}`;

function run(cmd, ignoreError = false) {
  try {
    return execSync(cmd, { stdio: 'pipe', encoding: 'utf-8' }).trim();
  } catch (err) {
    if (!ignoreError) {
      console.warn(`[ADB Warning] ${cmd}: ${err.message}`);
    }
    return null;
  }
}

console.log('\n🥽 ═══════════════════════════════════════════════════');
console.log('   META QUEST USB ADB DEV & BROWSER LAUNCHER');
console.log('═══════════════════════════════════════════════════════\n');

// 1. Check for connected ADB devices
const devicesOutput = run('adb devices') || '';
const lines = devicesOutput.split('\n').filter(l => l.trim().length > 0);
const devices = lines.slice(1).map(l => l.split('\t')).filter(parts => parts.length >= 2);

const activeDevice = devices.find(d => d[1] === 'device');
const unauthorizedDevice = devices.find(d => d[1] === 'unauthorized');

if (!activeDevice) {
  if (unauthorizedDevice) {
    console.error(`⚠️ Device ${unauthorizedDevice[0]} is connected but unauthorized.`);
    console.error(`👉 Put on your Quest headset and click "Always allow from this computer" in the popup!\n`);
  } else {
    console.error(`⚠️ No ADB devices detected over USB.`);
    console.error(`👉 Ensure Quest is connected via USB-C cable and Developer Mode is enabled in the Meta Quest app.\n`);
  }
} else {
  console.log(`✅ Detected Quest device: ${activeDevice[0]}`);
  
  // 2. Set up ADB reverse port forwarding
  console.log(`🔌 Setting up USB reverse proxy for port ${port}...`);
  run(`adb -s ${activeDevice[0]} reverse tcp:${port} tcp:${port}`);
  console.log(`🌐 Quest can now access ${url} directly via USB cable!\n`);
}

function launchBrowserTab() {
  if (!activeDevice) {
    console.log(`⏭️ Skipping Quest browser launch (no authorized device).`);
    return;
  }

  console.log(`🚀 Launching new browser tab on Quest (${url})...`);
  
  // Method 1: Target Oculus Browser directly
  const res = run(
    `adb -s ${activeDevice[0]} shell am start -a android.intent.action.VIEW -d "${url}" -n com.oculus.browser/.MainActivity`,
    true
  );

  // Method 2: Generic VIEW Intent fallback if component name differs
  if (!res || res.includes('Error')) {
    run(`adb -s ${activeDevice[0]} shell am start -a android.intent.action.VIEW -d "${url}"`, true);
  }

  console.log(`🎉 Quest Browser opened to ${url}!\n`);
}

if (isOpenOnly) {
  launchBrowserTab();
  process.exit(0);
}

// 3. Start the local server
const serverCmd = isPreview ? 'preview' : 'dev';
console.log(`⚡ Starting Vite ${serverCmd} server on port ${port}...`);

const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';
const serverProcess = spawn(npxCmd, ['vite', serverCmd, '--port', String(port), '--host'], {
  stdio: 'inherit',
  shell: true
});

// Wait 1.5 seconds for Vite to bind port, then throw URL to Quest
setTimeout(() => {
  launchBrowserTab();
}, 1500);

// Clean up ADB reverse on exit
const cleanup = () => {
  if (activeDevice) {
    run(`adb -s ${activeDevice[0]} reverse --remove tcp:${port}`, true);
  }
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
