import { useEffect, useRef } from "react";
import { Map as MapLibreMap } from "maplibre-gl";

export default function ExploreScreen() {
  const mapContainer = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mapContainer.current;
    if (!container) return;

    const map = new MapLibreMap({
      container,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [-4.4214, 36.7213],
      zoom: 12.5,
    });

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div
      style={{
        height: "100%",
        position: "absolute",
        width: "100%",
      }}
    >
      <div
        ref={mapContainer}
        style={{
          bottom: 0,
          left: 0,
          position: "absolute",
          right: 0,
          top: 0,
        }}
      />
    </div>
  );
}
