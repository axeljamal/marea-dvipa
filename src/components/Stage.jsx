// The live pattern: isen texture, construction lines, rebung ribbons and the placed motifs.
import React, { useEffect, useMemo } from 'react';
import { LINE_HEX } from '../data/catalog';
import { srcOf, texSrc, ribbonMarkup } from '../lib/compute';

export function Stage({ stageRef, state, res, size, badge, badgeChanged, flashKey, label }) {
  // a short brighten confirms that a control changed the pattern
  useEffect(() => {
    const el = stageRef.current;
    if (!flashKey || !el || !el.animate) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.animate([{ filter: 'brightness(1.18)' }, { filter: 'none' }], { duration: 350, easing: 'ease' });
  }, [flashKey]);
  const ribbons = useMemo(() => (res ? ribbonMarkup(res.bands, state.sigInk) : ''), [res, state.sigInk]);
  const tx = texSrc(state);
  const showLines = res && res.lines.length > 0 && state.lines !== 'off';
  return (
    <div className="stage-col">
      <div ref={stageRef} className="stage" style={{ '--ground': state.ground }} role="img" aria-label={label}>
        {res && tx && <div className="texture" style={{ backgroundImage: `url("${tx}")`, backgroundSize: Math.round(120 * state.scale) + 'px' }} />}
        {res && (showLines || ribbons) && (
          <svg className="lines" viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true">
            {showLines && res.lines.map((l, i) => (
              <path key={i} d={l.d} fill="none" stroke={LINE_HEX[state.lines]} strokeWidth={l.w} strokeOpacity={Math.max(0, l.o)} strokeLinecap="round" />
            ))}
            {ribbons && <g dangerouslySetInnerHTML={{ __html: ribbons }} />}
          </svg>
        )}
        {res && res.items.map((it, i) => {
          const tf = (it.rot ? 'rotate(' + it.rot.toFixed(1) + 'deg) ' : '') + (it.flip ? 'scaleX(-1)' : '');
          return <img key={i} src={srcOf(it.m, state)} alt="" style={{ left: it.x, top: it.y, width: it.w, height: it.h, transform: tf || undefined }} />;
        })}
        <div className={'stage-badge' + (badgeChanged ? ' changed' : '')}>{badge}</div>
      </div>
    </div>
  );
}
