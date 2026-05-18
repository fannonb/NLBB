import { useEffect, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Provider } from "@/data/mockProviders";

// Fix Leaflet's default icon paths (Vite breaks them)
const icon = L.divIcon({
  className: "",
  html: `<div style="
    width:28px;height:28px;border-radius:9999px;
    background:hsl(var(--primary,222 47% 11%));
    border:3px solid white;
    box-shadow:0 2px 8px rgba(0,0,0,.3);
    display:grid;place-items:center;color:white;font-size:14px;
  ">📍</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [map, points]);
  return null;
}

export function ProvidersMap({ providers }: { providers: Provider[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const points = useMemo<[number, number][]>(
    () => providers.map((p) => [p.lat, p.lng]),
    [providers],
  );
  const center = points[0] ?? ([-1.2921, 36.8219] as [number, number]); // Nairobi

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-2xl border border-border"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        className="h-full w-full"
        style={{ background: "hsl(var(--secondary))" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {providers.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={icon}>
            <Popup>
              <div className="min-w-[160px]">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {p.category}
                </p>
                <p className="font-serif text-base text-foreground">{p.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  ★ {p.rating} · {p.distanceKm} km
                </p>
                <Link
                  to="/providers/$id"
                  params={{ id: p.id }}
                  className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                >
                  View profile →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
}
