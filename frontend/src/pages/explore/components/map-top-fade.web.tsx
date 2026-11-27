import type { PropsWithChildren } from 'react';

// Capas de desenfoque creciente: cada una aparece más arriba que la anterior, así que la
// intensidad sube poco a poco desde el borde inferior de la franja hasta el superior.
const PROGRESSIVE_BLURS = [1, 2, 4, 8, 14, 22];

export function MapTopFade({ height, progressive = false, children }: PropsWithChildren<{ height: number; progressive?: boolean }>) {
  if (progressive) {
    return <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, height, pointerEvents: 'none' }}>
      {PROGRESSIVE_BLURS.map((blur, index) => {
        const from = (index / PROGRESSIVE_BLURS.length) * 100;
        const to = ((index + 1) / PROGRESSIVE_BLURS.length) * 100;
        const mask = `linear-gradient(to top, transparent ${from}%, black ${to}%)`;
        return <div key={blur} className="incident-map-progressive-blur" style={{
          position: 'absolute', inset: 0,
          backdropFilter: `blur(${blur}px)`, WebkitBackdropFilter: `blur(${blur}px)`,
          maskImage: mask, WebkitMaskImage: mask,
        }} />;
      })}
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
    </div>;
  }
  return <div aria-hidden="true" className="incident-map-top-fade" style={{
    position: 'absolute', top: 0, left: 0, right: 0, height, pointerEvents: 'none',
    backdropFilter: 'var(--map-edge-blur, blur(20px))',
    WebkitBackdropFilter: 'var(--map-edge-blur, blur(20px))',
  }}>
    {children}
  </div>;
}
