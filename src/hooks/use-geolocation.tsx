import { useEffect, useState } from "react";

export type Coords = { lat: number; lng: number };

export function haversineKm(a: Coords, b: Coords): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

type State = {
  coords: Coords | null;
  status: "idle" | "prompt" | "granted" | "denied" | "unavailable";
  error: string | null;
};

const STORAGE_KEY = "nlbb:geo";

export function useGeolocation(options: { auto?: boolean } = {}) {
  const { auto = false } = options;
  const [state, setState] = useState<State>({
    coords: null,
    status: "idle",
    error: null,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cached = localStorage.getItem(STORAGE_KEY);
    let hasCached = false;
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { coords: Coords; ts: number };
        // accept cached for 1 hour
        if (Date.now() - parsed.ts < 60 * 60 * 1000) {
          setState({ coords: parsed.coords, status: "granted", error: null });
          hasCached = true;
        }
      } catch {
        // ignore
      }
    }
    if (auto && !hasCached && navigator?.geolocation) {
      // Auto-request location silently; browser shows native permission prompt
      setState((s) => ({ ...s, status: "prompt" }));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ coords, ts: Date.now() }));
          setState({ coords, status: "granted", error: null });
        },
        (err) => {
          setState({
            coords: null,
            status: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable",
            error: err.message,
          });
        },
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
      );
    }
  }, [auto]);

  const request = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ coords: null, status: "unavailable", error: "Geolocation unsupported" });
      return;
    }
    setState((s) => ({ ...s, status: "prompt" }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ coords, ts: Date.now() }));
        setState({ coords, status: "granted", error: null });
      },
      (err) => {
        setState({
          coords: null,
          status: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable",
          error: err.message,
        });
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    );
  };

  const clear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ coords: null, status: "idle", error: null });
  };

  return { ...state, request, clear };
}
