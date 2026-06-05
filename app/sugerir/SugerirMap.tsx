'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    background:#15803d;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -32],
})

function ClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onSelect(e.latlng.lat, e.latlng.lng) })
  return null
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng], 14) }, [lat, lng])
  return null
}

interface Props {
  center: [number, number]
  zoom: number
  selected: { lat: number; lng: number } | null
  onSelect: (lat: number, lng: number) => void
}

export default function SugerirMap({ center, zoom, selected, onSelect }: Props) {
  return (
    <div className="relative">
      <MapContainer center={center} zoom={zoom} className="w-full rounded-xl" style={{ height: 260 }} zoomControl>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
        <ClickHandler onSelect={onSelect} />
        {selected && <Marker position={[selected.lat, selected.lng]} icon={pinIcon} />}
        {selected && <Recenter lat={selected.lat} lng={selected.lng} />}
      </MapContainer>
      <div className="absolute bottom-2 left-0 right-0 flex justify-center z-[1000] pointer-events-none">
        <span className="bg-black/50 text-white text-xs rounded-full px-3 py-1 font-medium">
          {selected ? `📍 ${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}` : 'Toque no mapa para marcar o local'}
        </span>
      </div>
    </div>
  )
}
