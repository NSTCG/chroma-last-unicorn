import { T } from './three.js';

export const getHit = (hits) => {
  let h = hits[0]?.object;
  while (h && h.userData?.index == null && !h.userData?.isTaskNode && !h.userData?.isUnicorn && h.parent) h = h.parent;
  return (h?.userData?.index != null || h?.userData?.isTaskNode || h?.userData?.isUnicorn) ? h : null;
};

export function setupPCControls(camera, domElement, getInteractiveObjects, onSelectObject) {
  const raycaster = new T.Raycaster(), mouse = new T.Vector2();
  domElement?.addEventListener('pointerdown', (e) => {
    raycaster.setFromCamera(mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
    onSelectObject(getHit(raycaster.intersectObjects(getInteractiveObjects(), true)), false);
  });
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyX' || e.code === 'Space') onSelectObject(null, true);
  });
  return { update: () => {} };
}


