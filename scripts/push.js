#!/usr/bin/env node

/**
 * Chroma / JS13k Push & Deploy Helper Script
 * Usage:
 *   npm run push
 *   npm run push -- "Your custom commit message"
 *   node scripts/push.js "Your custom commit message"
 */

import { execSync } from 'child_process';

function run(command, options = {}) {
  try {
    return execSync(command, { stdio: 'pipe', encoding: 'utf-8', ...options }).trim();
  } catch (error) {
    if (options.ignoreError) return null;
    console.error(`\n❌ Command failed: ${command}`);
    if (error.stdout) console.error(error.stdout);
    if (error.stderr) console.error(error.stderr);
    process.exit(1);
  }
}

function runInherit(command) {
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`\n❌ Command failed: ${command}`);
    process.exit(1);
  }
}

console.log('\n🚀 Starting automated build & git push pipeline...\n');

// 1. Build the production dist bundle so dist/ is always up-to-date
console.log('📦 Step 1: Building production bundle (vite build)...');
runInherit('npm run build');

// 2. Stage all files including dist/
console.log('\n📁 Step 2: Staging files (including dist)...');
runInherit('git add -A');

// 3. Check if there are changes to commit
const status = run('git status --porcelain', { ignoreError: true });
if (!status) {
  console.log('\n✨ No changes detected in working tree. Everything is already up-to-date!');
  process.exit(0);
}

// 4. Determine commit message
const userArgs = process.argv.slice(2).join(' ').trim();
const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
const commitMessage = userArgs || `Update game build - ${timestamp}`;

console.log(`\n📝 Step 3: Committing changes with message: "${commitMessage}"`);
runInherit(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`);

// 5. Get current branch name
let branch = 'main';
try {
  branch = run('git rev-parse --abbrev-ref HEAD');
} catch (e) {
  branch = 'main';
}

// 6. Push to remote
console.log(`\n🌐 Step 4: Pushing to remote (origin ${branch})...`);
try {
  runInherit(`git push origin ${branch}`);
} catch (e) {
  console.log(`Setting upstream and pushing to origin ${branch}...`);
  runInherit(`git push -u origin ${branch}`);
}

console.log('\n🎉 Successfully built and pushed all changes to GitHub/Netlify!\n');
