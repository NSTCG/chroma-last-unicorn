export function createVRHUD() {
  let timer = null;

  return {
    show: (title, sub = '', act = '', dur = 6000) => {
      const el = document.getElementById('subtitle-text');
      if (el) {
        el.innerHTML = `<strong>${title}</strong><br>${sub ? `<span style="color:#a0d8ef">${sub}</span><br>` : ''}${act ? `<span style="color:#ffea79;font-weight:600">${act}</span>` : ''}`;
        el.style.opacity = '1';
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { if (el) el.style.opacity = '0.35'; }, dur);
    },
    update: () => {}
  };
}
