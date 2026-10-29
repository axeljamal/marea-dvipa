// App features for the combined Marea Dvīpa: offline service worker with an update prompt, and the install button.
import { useEffect, useState } from 'react';

export function toast(msg, btnLabel, onBtn) {
  const box = document.getElementById('toast'); if (!box) return;
  document.getElementById('toastText').textContent = msg;
  const b = document.getElementById('toastBtn');
  b.hidden = !btnLabel; b.textContent = btnLabel || ''; b.onclick = onBtn || null; box.hidden = false;
  clearTimeout(toast.tm); if (!btnLabel) toast.tm = setTimeout(() => { box.hidden = true; }, 4000);
}

let deferred = null;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(!!deferred));
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; emit(); });
  window.addEventListener('appinstalled', () => { deferred = null; emit(); toast('Marea Dvīpa is installed.'); });
  const dev = import.meta.env.DEV; // Vite sets this; build-single defines it as false
  if (!dev && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        const ask = (w) => toast('A new version is ready.', 'Reload', () => w.postMessage('skip'));
        const waitFor = (w) => w.addEventListener('statechange', () => {
          if (w.state === 'installed') { if (navigator.serviceWorker.controller) ask(w); else toast('Ready to work offline.'); }
        });
        if (reg.waiting && navigator.serviceWorker.controller) ask(reg.waiting);
        reg.addEventListener('updatefound', () => { if (reg.installing) waitFor(reg.installing); });
      }).catch(() => {});
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded && navigator.serviceWorker.controller) { reloaded = true; location.reload(); } });
    });
  }
}

export function usePwa() {
  const [canInstall, setCan] = useState(!!deferred);
  useEffect(() => { listeners.add(setCan); return () => listeners.delete(setCan); }, []);
  const install = () => {
    if (!deferred) return;
    deferred.prompt();
    deferred.userChoice.finally(() => { deferred = null; emit(); });
  };
  return { canInstall, install };
}
