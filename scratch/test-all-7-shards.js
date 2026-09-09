import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Start tiny static server for dist/index.html
const server = http.createServer((req, res) => {
  const file = path.resolve('dist/index.html');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(fs.readFileSync(file));
});

await new Promise(r => server.listen(5678, r));
console.log('Serving dist/index.html on http://localhost:5678/');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  'http://localhost:5678/'
]);

await new Promise(r => setTimeout(r, 1500));

try {
  const res = await fetch('http://127.0.0.1:9222/json');
  const tabs = await res.json();
  const targetTab = tabs.find(t => t.url.includes('5678'));
  if (!targetTab) {
    console.error('Target tab not found in tabs:', tabs);
    chromeProc.kill();
    server.close();
    process.exit(1);
  }

  const ws = new WebSocket(targetTab.webSocketDebuggerUrl);
  let id = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const curId = id++;
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === curId) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  await new Promise(r => ws.addEventListener('open', r));
  await send('Runtime.enable');
  await send('Console.enable');

  const consoleLogs = [];
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Console.messageAdded') {
      consoleLogs.push(msg.params.message.text);
      if (msg.params.message.level === 'error') {
        console.error('Browser ERROR:', msg.params.message.text);
      }
    }
  });

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      console.error('JS Exception:', res.exceptionDetails);
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result ? res.result.value : res;
  };

  console.log('--- Testing CHROMA Game & All 7 Shard Levels ---');

  // Start game and slide
  await evaluate('document.getElementById("p")?.click()');
  await new Promise(r => setTimeout(r, 800));
  await evaluate('window.game?.narrative?.triggerSlide()');
  await new Promise(r => setTimeout(r, 4200));

  const initialTest = await evaluate(`(() => {
    const g = window.game;
    return {
      act: g.narrative?.act,
      shardsCount: g.shards?.shards?.length,
      allLocked: g.shards?.shards?.every(s => !s.unlocked && !s.collected)
    };
  })()`);
  console.log('Game initialized on island:', initialTest);

  // LEVEL 0: RED (ART) - Trace 3 creative spark nodes
  console.log('\n[1/7] Testing Level 0 (Red - Art)...');
  const l0 = await evaluate(`(() => {
    const g = window.game;
    const s0 = g.shards.shards[0];
    g.shards.collect(s0.shell); // start task
    const interactive1 = g.shards.getInteractiveMeshes();
    const taskNodes = interactive1.filter(m => m.userData?.isTaskNode);
    // interact with 3 nodes
    taskNodes.forEach(node => g.shards.collect(node));
    const unlocked = s0.unlocked;
    g.shards.collect(s0.core); // collect core
    return { taskNodesFound: taskNodes.length, unlocked, collected: s0.collected };
  })()`);
  console.log('Level 0 result:', l0);
  if (!l0.unlocked || !l0.collected || l0.taskNodesFound !== 3) throw new Error('Level 0 failed!');

  // LEVEL 1: ORANGE (PLAY) - Catch hopping spark 3 times
  console.log('\n[2/7] Testing Level 1 (Orange - Play)...');
  const l1 = await evaluate(`(() => {
    const g = window.game;
    const s1 = g.shards.shards[1];
    g.shards.collect(s1.shell); // start task
    let hops = 0;
    for (let i = 0; i < 3; i++) {
      const node = g.shards.getInteractiveMeshes().find(m => m.userData?.isTaskNode);
      if (node) { hops++; g.shards.collect(node); }
    }
    const unlocked = s1.unlocked;
    g.shards.collect(s1.core);
    return { hops, unlocked, collected: s1.collected };
  })()`);
  console.log('Level 1 result:', l1);
  if (!l1.unlocked || !l1.collected || l1.hops !== 3) throw new Error('Level 1 failed!');

  // LEVEL 2: YELLOW (WARMTH) - Maya phone call
  console.log('\n[3/7] Testing Level 2 (Yellow - Warmth)...');
  await evaluate(`(() => {
    const g = window.game;
    const s2 = g.shards.shards[2];
    g.shards.collect(s2.shell); // trigger call task
  })()`);
  
  // Advance call steps (offer -> accepted -> ringing -> talking x 4 -> complete)
  for (let i = 0; i < 7; i++) {
    await new Promise(r => setTimeout(r, 380));
    await evaluate('window.game.vrHud.triggerCallAction()');
  }

  const l2 = await evaluate(`(() => {
    const g = window.game;
    const s2 = g.shards.shards[2];
    const unlocked = s2.unlocked;
    g.shards.collect(s2.core);
    return { unlocked, collected: s2.collected };
  })()`);
  console.log('Level 2 result:', l2);
  if (!l2.unlocked || !l2.collected) throw new Error('Level 2 failed!');

  // LEVEL 3: GREEN (WONDER) - Celestial sky gaze
  console.log('\n[4/7] Testing Level 3 (Green - Wonder)...');
  const l3 = await evaluate(`(() => {
    const g = window.game;
    const s3 = g.shards.shards[3];
    g.shards.collect(s3.shell); // start sky gaze
    // Look up at zenith
    g.camera.lookAt(g.camera.position.x, g.camera.position.y + 100, g.camera.position.z);
    // Update shards system by 2.2 seconds
    for (let t = 0; t < 22; t++) {
      g.shards.update(0.1);
    }
    const unlocked = s3.unlocked;
    g.shards.collect(s3.core);
    return { unlocked, collected: s3.collected };
  })()`);
  console.log('Level 3 result:', l3);
  if (!l3.unlocked || !l3.collected) throw new Error('Level 3 failed!');

  // LEVEL 4: BLUE (PEACE) - Mindful stillness
  console.log('\n[5/7] Testing Level 4 (Blue - Peace)...');
  const l4 = await evaluate(`(() => {
    const g = window.game;
    const s4 = g.shards.shards[4];
    g.shards.collect(s4.shell); // start stillness
    // Update shards system by 2.7 seconds
    for (let t = 0; t < 27; t++) {
      g.shards.update(0.1);
    }
    const unlocked = s4.unlocked;
    g.shards.collect(s4.core);
    return { unlocked, collected: s4.collected };
  })()`);
  console.log('Level 4 result:', l4);
  if (!l4.unlocked || !l4.collected) throw new Error('Level 4 failed!');

  // LEVEL 5: INDIGO (MYSTERY) - 3 Orbiting story runes
  console.log('\n[6/7] Testing Level 5 (Indigo - Mystery)...');
  const l5 = await evaluate(`(() => {
    const g = window.game;
    const s5 = g.shards.shards[5];
    g.shards.collect(s5.shell); // start task
    const interactive = g.shards.getInteractiveMeshes();
    const runes = interactive.filter(m => m.userData?.isTaskNode);
    runes.forEach(r => g.shards.collect(r));
    const unlocked = s5.unlocked;
    g.shards.collect(s5.core);
    return { runesFound: runes.length, unlocked, collected: s5.collected };
  })()`);
  console.log('Level 5 result:', l5);
  if (!l5.unlocked || !l5.collected || l5.runesFound !== 3) throw new Error('Level 5 failed!');

  // LEVEL 6: VIOLET (DREAMS) - Unicorn mount requirement
  console.log('\n[7/7] Testing Level 6 (Violet - Dreams)...');
  const l6 = await evaluate(`(() => {
    const g = window.game;
    const s6 = g.shards.shards[6];
    // Attempt collect without mounting
    g.shards.collect(s6.shell);
    const lockedBefore = !s6.unlocked;
    // Now mount unicorn
    g.toggleMount();
    // Attempt collect with mounting
    g.shards.collect(s6.shell);
    const unlockedAfter = s6.unlocked;
    g.shards.collect(s6.core);
    return { lockedBefore, unlockedAfter, collected: s6.collected };
  })()`);
  console.log('Level 6 result:', l6);
  if (!l6.lockedBefore || !l6.unlockedAfter || !l6.collected) throw new Error('Level 6 failed!');

  // VERIFY FINAL AWAKENING (ALL 7 RESTORED)
  const finalState = await evaluate(`(() => {
    const g = window.game;
    return {
      allCollected: g.shards.shards.every(s => s.collected),
      narrativeCompleted: g.narrative.collectedCount === 7,
      isMounted: g.getUState().isMounted
    };
  })()`);
  console.log('\n🌟 Final Game State after All 7 Levels:', finalState);

  if (finalState.allCollected && finalState.narrativeCompleted) {
    console.log('\n✅ ALL 7 SHARD LEVELS VERIFIED SUCCESSFULLY AND WORKING FLAWLESSLY!');
  } else {
    throw new Error('Final game state verification failed!');
  }

  chromeProc.kill();
  process.exit(0);
} catch (err) {
  console.error('Test execution error:', err);
  chromeProc.kill();
  process.exit(1);
}
