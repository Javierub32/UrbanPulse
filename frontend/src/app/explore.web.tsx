import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  type GeoJSONSource,
} from "maplibre-gl";

type GeoJSONData = Parameters<GeoJSONSource["setData"]>[0];

const MALAGA: [number, number] = [-4.4214, 36.7213];

const ubicaciones = {
  type: "FeatureCollection",
  features: [],
} satisfies GeoJSONData;

export default function ExploreWeb() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let userPosition: [number, number] | null = null;

    const map = new MapLibreMap({
      container,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: MALAGA,
      zoom: 13,
    });

    const applyUserPosition = (position: [number, number]) => {
      map.easeTo({ center: position, zoom: 14 });

      const source = map.getSource("ubicaciones") as GeoJSONSource | undefined;
      source?.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: position,
        },
      });
    };

    map.on("load", () => {
      map.addSource("ubicaciones", {
        type: "geojson",
        data: ubicaciones,
      });

      map.addLayer({
        id: "ubicacion-punto",
        type: "circle",
        source: "ubicaciones",
        paint: {
          "circle-radius": 7,
          "circle-color": "#e8762d",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // The permission request starts immediately; apply its result once the source exists.
      if (userPosition) applyUserPosition(userPosition);
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (disposed) return;

          userPosition = [coords.longitude, coords.latitude];

          if (map.getSource("ubicaciones")) {
            applyUserPosition(userPosition);
          }
        },
        () => {
          // If permission is denied or location is unavailable, keep Málaga as the fallback.
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    }

    return () => {
      disposed = true;
      map.remove();
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100vh" }} />;
}
