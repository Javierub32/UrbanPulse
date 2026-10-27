import { useEffect, useRef, useState } from "react";
import { Map, GeoJSONSource, Layer, type GeoJSONSourceProps } from "@maplibre/maplibre-react-native";
import * as Location from "expo-location";

//Ubicación de ejemplo centrado en Málaga
const Malaga: [number, number] = [-4.4214, 36.7213];
type Coordinates = [number, number];



export function Mapa() {

  const [location, setLocation] = useState<Coordinates | null>(null);

  useEffect(() => {
  async function getUserLocation() {
      const {status} = await Location.requestBackgroundPermissionsAsync();
      if(status !== 'granted'){
         return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setLocation([location.coords.longitude, location.coords.latitude]);
}
  }, []);

  const ubicacion = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { id: 2 },
        geometry: {
          type: "Point",
          coordinates: location || Malaga,
        }
      }
    ]
  } satisfies GeoJSONSourceProps["data"];

  return (
    <Map
      style={{ flex: 1 }}
      mapStyle="https://tiles.openfreemap.org/styles/liberty"
    >
      <GeoJSONSource id="ubicaciones" data={ubicacion}>
        <Layer
          id='ubicacion-puntos'
          type='circle'
          paint={{
            "circle-radius": 7,
            "circle-color": "#e8762d",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          }}
        />
      </GeoJSONSource>
    </Map>
  )
}
