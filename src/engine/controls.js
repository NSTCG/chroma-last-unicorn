import { T } from './three.js';

export const getHit = (hits) => {
  let h = hits[0]?.object;
  while (h && !h.userData?.data && h.parent) h = h.parent;
  return h?.userData?.data ? h : null;
};


export function setupPCControls(camera, domElement, getInteractiveObjects, onSelectObject, getUnicornState, renderer) {
  let isDown = false, px = 0, py = 0;
  const euler = new T.Euler(0, 0, 0, 'YXZ'), raycaster = new T.Raycaster(), mouse = new T.Vector2();

  const interact = (cx, cy) => {
    if (renderer?.xr?.isPresenting) return;
    mouse.set(cx != null ? (cx / innerWidth) * 2 - 1 : 0, cy != null ? -(cy / innerHeight) * 2 + 1 : 0);
    raycaster.setFromCamera(mouse, camera);
    onSelectObject(getHit(raycaster.intersectObjects(getInteractiveObjects(), true)));
  };

  domElement.addEventListener('pointerdown', (e) => {
    if (renderer?.xr?.isPresenting) return;
    isDown = true; px = e.clientX; py = e.clientY;
    interact(e.clientX, e.clientY);
  });
  window.addEventListener('pointerup', () => { isDown = false; });
  window.addEventListener('pointermove', (e) => {
    if (!isDown || renderer?.xr?.isPresenting) return;
    euler.setFromQuaternion(camera.quaternion);
    euler.y -= (e.clientX - px) * 0.003;
    euler.x = Math.max(-1.5, Math.min(1.5, euler.x - (e.clientY - py) * 0.003));
    camera.quaternion.setFromEuler(euler);
    px = e.clientX; py = e.clientY;
  });

  window.addEventListener('keydown', e => {
    if (e.code === 'KeyX' || e.code === 'Space') onSelectObject(null, true);
  });

  return { update: () => {} };
}

