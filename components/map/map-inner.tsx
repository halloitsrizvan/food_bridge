"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  color: string;
  label?: string;
  popup?: string;
  pulse?: boolean;
  size?: number;
};
export type MapCircle = { lat: number; lng: number; radiusM: number; color: string };
export type MapProps = {
  markers?: MapMarker[];
  circles?: MapCircle[];
  line?: [[number, number], [number, number]] | null;
  center?: [number, number];
  zoom?: number;
  fit?: boolean;
  onPick?: (p: { lat: number; lng: number }) => void;
  className?: string;
  height?: number | string;
};

const KOZHIKODE: [number, number] = [11.2588, 75.7804];

function icon(m: MapMarker) {
  const s = m.size ?? 18;
  return L.divIcon({
    className: "",
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
    html: `<span style="display:block;width:${s}px;height:${s}px;border-radius:999px;background:${m.color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)" class="${m.pulse ? "pulse-red" : ""}"></span>`,
  });
}

function Fit({ markers, line }: { markers: MapMarker[]; line?: MapProps["line"] }) {
  const map = useMap();
  useEffect(() => {
    const pts: [number, number][] = markers.map((m) => [m.lat, m.lng]);
    if (line) pts.push(...line);
    if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 15 });
    else if (pts.length === 1) map.setView(pts[0], Math.max(map.getZoom(), 14));
  }, [map, markers, line]);
  return null;
}

function Picker({ onPick }: { onPick: NonNullable<MapProps["onPick"]> }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

export default function MapInner({ markers = [], circles = [], line, center, zoom = 13, fit, onPick, className, height = 320 }: MapProps) {
  return (
    <div className={className} style={{ height, borderRadius: 16, overflow: "hidden" }}>
      <MapContainer center={center ?? (markers[0] ? [markers[0].lat, markers[0].lng] : KOZHIKODE)} zoom={zoom} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {circles.map((c, i) => (
          <Circle key={i} center={[c.lat, c.lng]} radius={c.radiusM} pathOptions={{ color: c.color, fillColor: c.color, fillOpacity: 0.16, weight: 1 }} />
        ))}
        {line && <Polyline positions={line} pathOptions={{ color: "#088178", weight: 3, dashArray: "8 8" }} />}
        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={icon(m)} title={m.label}>
            {(m.popup || m.label) && <Popup>{m.popup ?? m.label}</Popup>}
          </Marker>
        ))}
        {fit && <Fit markers={markers} line={line} />}
        {onPick && <Picker onPick={onPick} />}
      </MapContainer>
    </div>
  );
}
