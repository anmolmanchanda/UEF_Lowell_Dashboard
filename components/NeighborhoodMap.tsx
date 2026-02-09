"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";

import { Neighborhood } from "@/lib/types";

const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE ??
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const LAYER_ID = "neighborhood-circles";
const GLOW_LAYER_ID = "neighborhood-glow";
const HEAT_LAYER_ID = "neighborhood-heat";
const LABEL_LAYER_ID = "neighborhood-labels";
const PULSE_LAYER_ID = "neighborhood-pulse";
const FOCUS_LAYER_ID = "neighborhood-focus";
const SOURCE_ID = "neighborhoods";
const MAX_LABELS = 5;

function buildGeojson(neighborhoods: Neighborhood[], indicatorKey: string) {
  const ranked = neighborhoods
    .map((hood) => ({ id: hood.id, value: hood.metrics[indicatorKey] }))
    .filter((item): item is { id: string; value: number } => typeof item.value === "number")
    .sort((a, b) => b.value - a.value);

  const rankMap = new Map<string, number>();
  ranked.forEach((item, index) => rankMap.set(item.id, index + 1));

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
        rank: rankMap.get(hood.id) ?? 999,
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

  const valueExpr = ["coalesce", ["get", indicatorKey], min];

  return {
    "circle-color": ["interpolate", ["linear"], valueExpr, min, "#cfd8ec", max, "#0b3d91"],
    "circle-radius": ["interpolate", ["linear"], valueExpr, min, 7, max, 22],
    "circle-opacity": 0.82,
    "circle-stroke-width": 1,
    "circle-stroke-color": "#0b0f1a"
  };
}

function buildGlowPaint(indicatorKey: string, neighborhoods: Neighborhood[]) {
  const values = neighborhoods
    .map((hood) => hood.metrics[indicatorKey])
    .filter((value): value is number => typeof value === "number");
  const { min, max } = computeRange(values);
  const valueExpr = ["coalesce", ["get", indicatorKey], min];

  return {
    "circle-color": ["interpolate", ["linear"], valueExpr, min, "#6ea8ff", max, "#00c2c7"],
    "circle-radius": ["interpolate", ["linear"], valueExpr, min, 14, max, 38],
    "circle-opacity": 0.25
  };
}

function buildHeatPaint(indicatorKey: string, neighborhoods: Neighborhood[]) {
  const values = neighborhoods
    .map((hood) => hood.metrics[indicatorKey])
    .filter((value): value is number => typeof value === "number");
  const { min, max } = computeRange(values);
  const valueExpr = ["coalesce", ["get", indicatorKey], min];

  return {
    "heatmap-weight": ["interpolate", ["linear"], valueExpr, min, 0, max, 1],
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 9, 0.6, 13, 1.1],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 9, 14, 13, 34],
    "heatmap-opacity": 0.85,
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      "rgba(11, 61, 145, 0)",
      0.2,
      "rgba(11, 61, 145, 0.25)",
      0.45,
      "rgba(11, 61, 145, 0.55)",
      0.7,
      "rgba(0, 141, 143, 0.65)",
      1,
      "rgba(214, 69, 69, 0.75)"
    ]
  };
}

function applyVisibility(map: maplibregl.Map, viewMode: "bubbles" | "heatmap") {
  const bubblesVisible = viewMode === "bubbles" ? "visible" : "none";
  const heatVisible = viewMode === "heatmap" ? "visible" : "none";
  [LAYER_ID, GLOW_LAYER_ID].forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", bubblesVisible);
    }
  });
  if (map.getLayer(HEAT_LAYER_ID)) {
    map.setLayoutProperty(HEAT_LAYER_ID, "visibility", heatVisible);
  }
  [LABEL_LAYER_ID, PULSE_LAYER_ID].forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", "visible");
    }
  });
}

export default function NeighborhoodMap({
  neighborhoods,
  className,
  height = 420,
  indicatorKey = "median_rent",
  viewMode = "bubbles",
  focus
}: {
  neighborhoods: Neighborhood[];
  className?: string;
  height?: number | string;
  indicatorKey?: string;
  viewMode?: "bubbles" | "heatmap";
  focus?: { id: string; lat: number; lon: number; zoom?: number } | null;
}) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef(indicatorKey);
  const pulseFrameRef = useRef<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    indicatorRef.current = indicatorKey;
  }, [indicatorKey]);

  const geojson = useMemo(
    () => buildGeojson(neighborhoods, indicatorKey),
    [neighborhoods, indicatorKey]
  );

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
          id: HEAT_LAYER_ID,
          type: "heatmap",
          source: SOURCE_ID,
          paint: buildHeatPaint(indicatorKey, neighborhoods) as any
        } as any);
        map.addLayer({
          id: GLOW_LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          paint: buildGlowPaint(indicatorKey, neighborhoods) as any
        } as any);
        map.addLayer({
          id: PULSE_LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          filter: ["==", ["get", "rank"], 1],
          paint: {
            "circle-color": "rgba(11, 61, 145, 0.35)",
            "circle-radius": 18,
            "circle-opacity": 0.45
          }
        } as any);
        map.addLayer({
          id: LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          paint: buildPaint(indicatorKey, neighborhoods) as any
        } as any);
        map.addLayer({
          id: FOCUS_LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          filter: ["==", ["get", "id"], ""],
          paint: {
            "circle-color": "rgba(0, 0, 0, 0)",
            "circle-radius": 26,
            "circle-stroke-width": 2.4,
            "circle-stroke-color": "rgba(0, 141, 143, 0.9)"
          }
        } as any);
        map.addLayer({
          id: LABEL_LAYER_ID,
          type: "symbol",
          source: SOURCE_ID,
          filter: ["<=", ["get", "rank"], MAX_LABELS],
          layout: {
            "text-field": ["get", "name"],
            "text-size": 12,
            "text-offset": [0, 1.2],
            "text-anchor": "top"
          },
          paint: {
            "text-color": "#0b0f1a",
            "text-halo-color": "rgba(255, 255, 255, 0.85)",
            "text-halo-width": 1
          }
        } as any);

        map.setPaintProperty(LAYER_ID, "circle-color-transition", { duration: 650 });
        map.setPaintProperty(LAYER_ID, "circle-radius-transition", { duration: 650 });
        map.setPaintProperty(GLOW_LAYER_ID, "circle-color-transition", { duration: 650 });
        map.setPaintProperty(GLOW_LAYER_ID, "circle-radius-transition", { duration: 650 });

        const animatePulse = (time: number) => {
          if (!map || !map.getLayer(PULSE_LAYER_ID)) return;
          const pulse = (Math.sin(time / 600) + 1) / 2;
          const radius = 18 + pulse * 12;
          const opacity = 0.25 + (1 - pulse) * 0.35;
          map.setPaintProperty(PULSE_LAYER_ID, "circle-radius", radius);
          map.setPaintProperty(PULSE_LAYER_ID, "circle-opacity", opacity);
          pulseFrameRef.current = requestAnimationFrame(animatePulse);
        };
        pulseFrameRef.current = requestAnimationFrame(animatePulse);

        map.on("mouseenter", LAYER_ID, () => {
          map?.getCanvas().style.setProperty("cursor", "pointer");
        });
        map.on("mouseleave", LAYER_ID, () => {
          map?.getCanvas().style.setProperty("cursor", "");
        });
        map.on("click", LAYER_ID, (event) => {
          const feature = event.features?.[0];
          if (!feature) return;
          const currentIndicator = indicatorRef.current;
          const name = feature.properties?.name ?? "Neighborhood";
          const value = feature.properties?.[currentIndicator];
          const popup = new maplibregl.Popup({ offset: 12 })
            .setLngLat(event.lngLat)
            .setHTML(`<strong>${name}</strong><br/>${currentIndicator}: ${value ?? "n/a"}`);
          popup.addTo(map!);
        });

        applyVisibility(map, viewMode);
      });

      map.on("error", () => setFailed(true));
    } catch (error) {
      setFailed(true);
    }

    mapRef.current = map;

    return () => {
      if (pulseFrameRef.current) {
        cancelAnimationFrame(pulseFrameRef.current);
      }
      map?.remove();
      mapRef.current = null;
    };
  }, [geojson, indicatorKey, neighborhoods, viewMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson);
    }
    if (map.getLayer(LAYER_ID)) {
      const paint = buildPaint(indicatorKey, neighborhoods) as any;
      map.setPaintProperty(LAYER_ID, "circle-color", paint["circle-color"]);
      map.setPaintProperty(LAYER_ID, "circle-radius", paint["circle-radius"]);
    }
    if (map.getLayer(GLOW_LAYER_ID)) {
      const glow = buildGlowPaint(indicatorKey, neighborhoods) as any;
      map.setPaintProperty(GLOW_LAYER_ID, "circle-color", glow["circle-color"]);
      map.setPaintProperty(GLOW_LAYER_ID, "circle-radius", glow["circle-radius"]);
    }
    if (map.getLayer(HEAT_LAYER_ID)) {
      const heat = buildHeatPaint(indicatorKey, neighborhoods) as any;
      map.setPaintProperty(HEAT_LAYER_ID, "heatmap-weight", heat["heatmap-weight"]);
      map.setPaintProperty(HEAT_LAYER_ID, "heatmap-color", heat["heatmap-color"]);
      map.setPaintProperty(HEAT_LAYER_ID, "heatmap-radius", heat["heatmap-radius"]);
    }
  }, [geojson, indicatorKey, neighborhoods]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(FOCUS_LAYER_ID)) return;
    if (!focus?.id) {
      map.setLayoutProperty(FOCUS_LAYER_ID, "visibility", "none");
      return;
    }
    map.setLayoutProperty(FOCUS_LAYER_ID, "visibility", "visible");
    map.setFilter(FOCUS_LAYER_ID, ["==", ["get", "id"], focus.id]);
  }, [focus?.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus?.id) return;
    map.flyTo({
      center: [focus.lon, focus.lat],
      zoom: focus.zoom ?? 13.6,
      speed: 0.7,
      essential: true
    });
  }, [focus?.id, focus?.lat, focus?.lon, focus?.zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    applyVisibility(map, viewMode);
  }, [viewMode]);

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
