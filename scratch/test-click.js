import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(fs.readFileSync(path.resolve('dist/index.html')));
});
await new Promise(r => server.listen(5680, r));

const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9225',
  '--disable-gpu',
  '--no-first-run',
  'http://localhost:5680/'
]);
await new Promise(r => setTimeout(r, 1500));

try {
  const tabs = await (await fetch('http://127.0.0.1:9225/json')).json();
  const target = tabs.find(t => t.url.includes('5680'));
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const curId = id++;
    const h = (e) => {
      const m = JSON.parse(e.data);
      if (m.id === curId) { ws.removeEventListener('message', h); if (m.error) reject(m.error); else resolve(m.result); }
    };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });
  await new Promise(r => ws.addEventListener('open', r));
  await send('Runtime.enable');
  const evalCode = async (code) => {
    const res = await send('Runtime.evaluate', { expression: code, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) console.error('Eval error:', res.exceptionDetails);
    return res.result ? res.result.value : res;
  };

  // Start game & slide
  await evalCode('document.getElementById("p")?.click()');
  await new Promise(r => setTimeout(r, 800));
  await evalCode('window.game.narrative.triggerSlide()');
  await new Promise(r => setTimeout(r, 4200));

  // Approach Red Shard
  const approachRes = await evalCode(`(() => {
    const g = window.game;
    const s0 = g.shards.shards[0];
    g.camera.position.set(s0.data.pos[0], s0.data.pos[1] + 0.5, s0.data.pos[2] + 4);
    g.camera.lookAt(s0.data.pos[0], s0.data.pos[1], s0.data.pos[2]);
    g.shards.collect(s0.shell);
    const taskNodes = g.shards.getInteractiveMeshes().filter(m => m.userData?.isTaskNode);
    return { taskNodesCount: taskNodes.length, callState: g.vrHud.callState };
  })()`);
  console.log('After touching Red Shard:', approachRes);

  // Project spark node to screen and test raycast
  const clickRes = await evalCode(`(() => {
    const g = window.game;
    const node = g.shards.getInteractiveMeshes().find(m => m.userData?.isTaskNode);
    g.camera.updateMatrixWorld(true);
    node.updateMatrixWorld(true);
    const screenPos = node.position.clone().project(g.camera);
    const px = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const py = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
    
    // Direct raycast check
    const ray = new window.THREE.Raycaster();
    const m = new window.THREE.Vector2((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1);
    ray.setFromCamera(m, g.camera);
    const hits = ray.intersectObjects(g.shards.getInteractiveMeshes(), true);
    
    // Now canvas dispatchEvent
    const canvas = g.renderer.domElement;
    canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: px, clientY: py, bubbles: true }));
    const remaining = g.shards.getInteractiveMeshes().filter(m => m.userData?.isTaskNode).length;
    return { px, py, hitsCount: hits.length, firstHit: hits[0]?.object?.userData, remainingNodes: remaining };
  })()`);
  console.log('After simulated click on spark node:', clickRes);

  chromeProc.kill();
  server.close();
  process.exit(0);
} catch(err) {
  console.error(err);
  chromeProc.kill();
  server.close();
  process.exit(1);
}
