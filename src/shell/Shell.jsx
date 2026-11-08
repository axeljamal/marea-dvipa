// Marea Dvīpa: one installable app with a welcome film and two rooms. The Pattern Studio builds repeats and
// Fibonacci flows from the motifs; the Media Lab plays the reels that show how the Ntina mark and the Bomba Rose
// were made. Everything stays mounted, so switching keeps your pattern and your place in the reel.
import React, { useEffect, useRef, useState } from 'react';
import StudioApp from '../App';
import { LabView } from '../lab/LabView';
import { Welcome } from '../welcome/Welcome';
import { usePwa } from './pwa';

const VIEWS = [
  { id: 'welcome', label: 'Welcome', short: 'Welcome', title: 'Marea Dvīpa', theme: '#0E0C09', light: '#FAF7F2' },
  { id: 'studio', label: 'Pattern Studio', short: 'Studio', title: 'Pattern Studio · Marea Dvīpa', theme: '#02213D', light: '#FAF7F2' },
  { id: 'lab', label: 'Media Lab', short: 'Lab', title: 'Media Lab · Marea Dvīpa', theme: '#0E0C09', light: '#F4EEE3' },
];
// dark or light: the saved choice, else the phone's or the system's setting
const THEME_KEY = 'marea-theme';
const systemTheme = () => (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
const initialTheme = () => { try { const t = localStorage.getItem(THEME_KEY); if (t === 'light' || t === 'dark') return t; } catch (e) { /* fine */ } return systemTheme(); };
const Sun = <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
const Moon = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
const LAB_HASHES = ['lab', 'ntina', 'bomba', 'marea', 'rebung'];

function viewFromHash() {
  const h = (typeof location !== 'undefined' ? location.hash : '').slice(1);
  if (h === 'studio' || h === 'welcome') return h;
  if (LAB_HASHES.indexOf(h) >= 0) return 'lab';
  return null;
}
// the app opens on the welcome film; #studio, #lab, #ntina, #bomba, #marea and #rebung open a room directly
const initialView = () => viewFromHash() || 'welcome';

export default function Shell() {
  const [view, setView] = useState(initialView);
  const [theme, setTheme] = useState(initialTheme);
  const labApi = useRef(null);
  useEffect(() => { // follow the system until a choice is made
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: light)'), on = () => { try { if (localStorage.getItem(THEME_KEY)) return; } catch (e) { /* fine */ } setTheme(mq.matches ? 'light' : 'dark'); };
    if (mq.addEventListener) mq.addEventListener('change', on); else mq.addListener(on);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', on); else mq.removeListener(on); };
  }, []);
  function pickTheme(t) { setTheme(t); try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* fine */ } }
  const { canInstall, install } = usePwa();

  useEffect(() => {
    const v = VIEWS.find((x) => x.id === view);
    document.body.dataset.view = view;
    document.documentElement.dataset.theme = theme;
    document.title = v.title;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? v.light : v.theme);
    const h = location.hash.slice(1);
    const want = view !== 'lab' ? view : (LAB_HASHES.indexOf(h) >= 0 ? h : 'lab');
    if (h !== want) { try { history.replaceState(null, '', '#' + want); } catch (e) { /* fine */ } }
  }, [view, theme]);

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
        <button className="shell-theme" type="button" onClick={() => pickTheme(theme === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} title={theme === 'light' ? 'Dark mode' : 'Light mode'}>{theme === 'light' ? Moon : Sun}</button>
        {canInstall && <button className="shell-install" type="button" onClick={install}>Install app</button>}
      </nav>
      <div id="view-welcome" role="tabpanel" aria-labelledby="tab-welcome" hidden={view !== 'welcome'}>
        <Welcome active={view === 'welcome'} theme={theme} getLab={() => labApi.current} onGo={pick} />
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
