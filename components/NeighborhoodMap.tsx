"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";

import { Neighborhood } from "@/lib/types";

const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE ??
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const LAYER_ID = "neighborhood-circles";
const SOURCE_ID = "neighborhoods";

function buildGeojson(neighborhoods: Neighborhood[]) {
  return {
    type: "FeatureCollection",
    features: neighborhoods.map((hood) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [hood.lon, hood.lat]
      },
      properties: {
        id: hood.id,
        name: hood.name,
        ...hood.metrics
      }
    }))
  } as GeoJSON.FeatureCollection;
}

function computeRange(values: number[]) {
  if (!values.length) return { min: 0, max: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return { min: min - 1, max: max + 1 };
  return { min, max };
}

function buildPaint(indicatorKey: string, neighborhoods: Neighborhood[]) {
  const values = neighborhoods
    .map((hood) => hood.metrics[indicatorKey])
    .filter((value): value is number => typeof value === "number");
  const { min, max } = computeRange(values);

  return {
    "circle-color": ["interpolate", ["linear"], ["get", indicatorKey], min, "#cfd8ec", max, "#0b3d91"],
    "circle-radius": ["interpolate", ["linear"], ["get", indicatorKey], min, 6, max, 18],
    "circle-opacity": 0.82,
    "circle-stroke-width": 1,
    "circle-stroke-color": "#0b0f1a"
  } as maplibregl.CirclePaint;
}

export default function NeighborhoodMap({
  neighborhoods,
  className,
  height = 420,
  indicatorKey = "median_rent"
}: {
  neighborhoods: Neighborhood[];
  className?: string;
  height?: number | string;
  indicatorKey?: string;
}) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);

  const geojson = useMemo(() => buildGeojson(neighborhoods), [neighborhoods]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let map: maplibregl.Map | null = null;
    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLE,
        center: [-71.3162, 42.6334],
        zoom: 12
      });

      map.on("load", () => {
        if (!map) return;
        map.addSource(SOURCE_ID, { type: "geojson", data: geojson });
        map.addLayer({
          id: LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          paint: buildPaint(indicatorKey, neighborhoods)
        });

        map.setPaintProperty(LAYER_ID, "circle-color-transition", { duration: 650 });
        map.setPaintProperty(LAYER_ID, "circle-radius-transition", { duration: 650 });

        map.on("mouseenter", LAYER_ID, () => {
          map?.getCanvas().style.setProperty("cursor", "pointer");
        });
        map.on("mouseleave", LAYER_ID, () => {
          map?.getCanvas().style.setProperty("cursor", "");
        });
        map.on("click", LAYER_ID, (event) => {
          const feature = event.features?.[0];
          if (!feature) return;
          const name = feature.properties?.name ?? "Neighborhood";
          const value = feature.properties?.[indicatorKey];
          const popup = new maplibregl.Popup({ offset: 12 })
            .setLngLat(event.lngLat)
            .setHTML(`<strong>${name}</strong><br/>${indicatorKey}: ${value ?? "n/a"}`);
          popup.addTo(map!);
        });
      });

      map.on("error", () => setFailed(true));
    } catch (error) {
      setFailed(true);
    }

    mapRef.current = map;

    return () => {
      map?.remove();
      mapRef.current = null;
    };
  }, [geojson, indicatorKey, neighborhoods]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson);
    }
    if (map.getLayer(LAYER_ID)) {
      map.setPaintProperty(LAYER_ID, "circle-color", buildPaint(indicatorKey, neighborhoods)["circle-color"]);
      map.setPaintProperty(LAYER_ID, "circle-radius", buildPaint(indicatorKey, neighborhoods)["circle-radius"]);
    }
  }, [geojson, indicatorKey, neighborhoods]);

  return (
    <div className={`map-shell ${className ?? ""}`} ref={mapContainerRef} style={{ height }}>
      {failed ? (
        <div style={{ padding: 16, color: "var(--muted)" }}>
          Map tiles unavailable. Showing neighborhood table below.
        </div>
      ) : null}
    </div>
  );
}
