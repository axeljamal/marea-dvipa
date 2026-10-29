// Marea Dvīpa: one installable app with a welcome film and two rooms. The Pattern Studio builds repeats and
// Fibonacci flows from the motifs; the Media Lab plays the reels that show how the Ntina mark and the Bomba Rose
// were made. Everything stays mounted, so switching keeps your pattern and your place in the reel.
import React, { useEffect, useRef, useState } from 'react';
import StudioApp from '../App';
import { LabView } from '../lab/LabView';
import { Welcome } from '../welcome/Welcome';
import { usePwa } from './pwa';

const VIEWS = [
  { id: 'welcome', label: 'Welcome', short: 'Welcome', title: 'Marea Dvīpa', theme: '#0E0C09' },
  { id: 'studio', label: 'Pattern Studio', short: 'Studio', title: 'Pattern Studio · Marea Dvīpa', theme: '#02213D' },
  { id: 'lab', label: 'Media Lab', short: 'Lab', title: 'Media Lab · Marea Dvīpa', theme: '#0E0C09' },
];
const LAB_HASHES = ['lab', 'ntina', 'bomba'];

function viewFromHash() {
  const h = (typeof location !== 'undefined' ? location.hash : '').slice(1);
  if (h === 'studio' || h === 'welcome') return h;
  if (LAB_HASHES.indexOf(h) >= 0) return 'lab';
  return null;
}
// the app opens on the welcome film; #studio, #lab, #ntina and #bomba open a room directly
const initialView = () => viewFromHash() || 'welcome';

export default function Shell() {
  const [view, setView] = useState(initialView);
  const labApi = useRef(null);
  const { canInstall, install } = usePwa();

  useEffect(() => {
    const v = VIEWS.find((x) => x.id === view);
    document.body.dataset.view = view;
    document.title = v.title;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', v.theme);
    const h = location.hash.slice(1);
    const want = view !== 'lab' ? view : (LAB_HASHES.indexOf(h) >= 0 ? h : 'lab');
    if (h !== want) { try { history.replaceState(null, '', '#' + want); } catch (e) { /* fine */ } }
  }, [view]);

  useEffect(() => {
    const onHash = () => { const v = viewFromHash(); if (v) setView(v); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function pick(id) {
    if (id === view) return;
    if (labApi.current && labApi.current.isRecording()) return; // finish the recording first
    setView(id);
    window.scrollTo(0, 0);
  }
  function onTabKey(e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault(); e.stopPropagation();
    const i = VIEWS.findIndex((x) => x.id === view), n = VIEWS[(i + (e.key === 'ArrowRight' ? 1 : VIEWS.length - 1)) % VIEWS.length];
    pick(n.id);
    const el = document.getElementById('tab-' + n.id); if (el) el.focus();
  }

  return (
    <>
      <nav className="shell-nav" aria-label="Marea Dvīpa">
        <a className="shell-brand" href="#welcome" onClick={(e) => { e.preventDefault(); pick('welcome'); }}>
          <img src="icons/icon-192.png" alt="" width="32" height="32" />
          <span className="shell-name">Marea Dvīpa</span>
        </a>
        <div className="shell-tabs" role="tablist" aria-label="Rooms" onKeyDown={onTabKey}>
          {VIEWS.map((v) => (
            <button key={v.id} id={'tab-' + v.id} role="tab" type="button" aria-selected={view === v.id} aria-controls={'view-' + v.id}
              tabIndex={view === v.id ? 0 : -1} onClick={() => pick(v.id)}><span className="l">{v.label}</span><span className="s">{v.short}</span></button>
          ))}
        </div>
        {canInstall && <button className="shell-install" type="button" onClick={install}>Install app</button>}
      </nav>
      <div id="view-welcome" role="tabpanel" aria-labelledby="tab-welcome" hidden={view !== 'welcome'}>
        <Welcome active={view === 'welcome'} getLab={() => labApi.current} onGo={pick} />
      </div>
      <div id="view-studio" role="tabpanel" aria-labelledby="tab-studio" className="studio-view" hidden={view !== 'studio'}>
        <StudioApp />
      </div>
      <div id="view-lab" role="tabpanel" aria-labelledby="tab-lab">
        <LabView active={view === 'lab'} onApi={(a) => { labApi.current = a; }} />
      </div>
    </>
  );
}
