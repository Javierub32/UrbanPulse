import { useEffect, useState } from 'react';
import type { StyleSpecification } from 'maplibre-gl';

const baseStyleUrl = 'https://tiles.openfreemap.org/styles/liberty';
const fallbackStyleUrl = 'https://tiles.openfreemap.org/styles/positron';

const palette = {
  mainRoad: '#bfc3c2',
  minorRoad: '#e2e4e2',
  roadCasing: '#b3b8b6',
  water: '#c6dfe6',
};

let cachedStyle: StyleSpecification | undefined;
let inFlightStyle: Promise<StyleSpecification | string> | undefined;

function withPastelPalette(style: StyleSpecification): StyleSpecification {
  return {
    ...style,
    layers: style.layers.map(layer => {
      if (!('source-layer' in layer)) return layer;
      const sourceLayer = layer['source-layer'];
      if (sourceLayer === 'water' && layer.type === 'fill') {
        return { ...layer, paint: { ...layer.paint, 'fill-color': palette.water } };
      }
      if (layer.type !== 'line') return layer;
      if (sourceLayer === 'waterway') {
        return { ...layer, paint: { ...layer.paint, 'line-color': palette.water } };
      }
      if (sourceLayer !== 'transportation' || /rail|ferry/.test(layer.id)) return layer;
      const color = /cas(e|ing)/.test(layer.id)
        ? palette.roadCasing
        : /motorway|trunk|primary|secondary/.test(layer.id) ? palette.mainRoad : palette.minorRoad;
      return { ...layer, paint: { ...layer.paint, 'line-color': color } };
    }),
  };
}

function loadIncidentMapStyle(): Promise<StyleSpecification | string> {
  if (cachedStyle) return Promise.resolve(cachedStyle);
  if (!inFlightStyle) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    inFlightStyle = fetch(baseStyleUrl, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error(`Map style: HTTP ${response.status}`);
        return response.json() as Promise<StyleSpecification>;
      })
      .then(base => {
        cachedStyle = withPastelPalette(base);
        return cachedStyle;
      })
      .catch(() => fallbackStyleUrl)
      .finally(() => {
        clearTimeout(timeout);
        inFlightStyle = undefined;
      });
  }
  return inFlightStyle;
}

// Shared cartography for every UrbanPulse map, including ticket previews.
export function useIncidentMapStyle() {
  const [style, setStyle] = useState<StyleSpecification | string | null>(() => cachedStyle ?? null);

  useEffect(() => {
    let active = true;
    void loadIncidentMapStyle().then(result => { if (active) setStyle(result); });
    return () => { active = false; };
  }, []);

  return style;
}
