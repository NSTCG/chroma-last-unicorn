
export const getHit = (hits) => {
  let h = hits[0]?.object;
  while (h && !h.userData?.data && h.parent) h = h.parent;
  return h?.userData?.data ? h : null;
};


export function setupPCControls(_, domElement, __, onSelectObject) {
  domElement?.addEventListener('click', () => onSelectObject(null, true));
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyX' || e.code === 'Space') onSelectObject(null, true);
  });
  return { update: () => {} };
}


