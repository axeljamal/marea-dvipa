// Hosts the Media Lab inside the shell. The lab is plain DOM + canvas code, so its markup is put in once and
// startLab() wires it up; afterwards React never touches what is inside this element.
import React, { useEffect, useRef } from 'react';
import { LAB_MARKUP } from './markup';
import { startLab } from './lab';

const html = { __html: LAB_MARKUP };

export function LabView({ active, onApi }) {
  const activeRef = useRef(active);
  const api = useRef(null);
  activeRef.current = active;

  useEffect(() => {
    if (api.current) return;
    api.current = startLab({ isActive: () => activeRef.current });
    if (onApi) onApi(api.current);
    if (activeRef.current) api.current.activate();
  }, []);

  useEffect(() => {
    if (!api.current) return;
    if (active) api.current.activate(); else api.current.deactivate();
  }, [active]);

  return <div className="lab-view" hidden={!active} dangerouslySetInnerHTML={html} />;
}
