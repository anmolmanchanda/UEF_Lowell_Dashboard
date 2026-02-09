"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";

import { Neighborhood } from "@/lib/types";

const MAP_STYLE = "https://demotiles.maplibre.org/style.json";

type Props = {
  neighborhoods: Neighborhood[];
  className?: string;
  height?: number | string;
};

export default function NeighborhoodMap({ neighborhoods, className, height = 420 }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;

    let map: maplibregl.Map | null = null;
    try {
      map = new maplibregl.Map({
        container: mapRef.current,
        style: MAP_STYLE,
        center: [-71.3162, 42.6334],
        zoom: 12
      });

      neighborhoods.forEach((hood) => {
        const popup = new maplibregl.Popup({ offset: 18 }).setHTML(
          `<strong>${hood.name}</strong><br/>Median rent: $${hood.metrics.median_rent.toFixed(0)}`
        );
        new maplibregl.Marker({ color: "#0b3d91" })
          .setLngLat([hood.lon, hood.lat])
          .setPopup(popup)
          .addTo(map as maplibregl.Map);
      });

      map.on("error", () => setFailed(true));
    } catch (error) {
      setFailed(true);
    }

    return () => {
      map?.remove();
    };
  }, [neighborhoods]);

  return (
    <div
      className={`map-shell ${className ?? ""}`}
      ref={mapRef}
      style={{ height }}
    >
      {failed ? (
        <div style={{ padding: 16, color: "var(--muted)" }}>
          Map tiles unavailable. Showing neighborhood table below.
        </div>
      ) : null}
    </div>
  );
}
