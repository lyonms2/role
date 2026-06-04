'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { SavedRoteiro } from '@/lib/firestore'

function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (coords.length === 0) return
    if (coords.length === 1) {
      map.setView(coords[0], 13)
    } else {
      map.fitBounds(L.latLngBounds(coords), { padding: [48, 48] })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

function makeIcon(color: string, emoji: string) {
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};width:34px;height:34px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;line-height:1;">${emoji}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
  })
}

type StopType = 'destination' | 'event' | 'eat' | 'stay'

interface Stop {
  lat: number
  lng: number
  name: string
  type: StopType
  sub: string
}

const ICON: Record<StopType, () => L.DivIcon> = {
  destination: () => makeIcon('#FF6B35', '📍'),
  event:       () => makeIcon('#9333ea', '🎭'),
  eat:         () => makeIcon('#f97316', '🍽️'),
  stay:        () => makeIcon('#16a34a', '🏡'),
}

const TYPE_LABEL: Record<StopType, string> = {
  destination: 'Destino',
  event: 'Evento',
  eat: 'Onde comer',
  stay: 'Onde dormir',
}

interface Props {
  roteiro: SavedRoteiro
  onClose: () => void
}

export default function RoteiroMapModal({ roteiro, onClose }: Props) {
  const stops: Stop[] = []

  stops.push({
    lat: roteiro.destination.lat,
    lng: roteiro.destination.lng,
    name: roteiro.destination.name,
    type: 'destination',
    sub: `${roteiro.destination.city || roteiro.destination.name}, ${roteiro.destination.state}`,
  })

  roteiro.events.forEach((ev) => {
    if (ev.lat && ev.lng) {
      stops.push({
        lat: ev.lat,
        lng: ev.lng,
        name: ev.name,
        type: 'event',
        sub: ev.venue ? `📍 ${ev.venue}` : ev.city,
      })
    }
  })

  roteiro.eats.forEach((e) => {
    if (e.lat && e.lng) {
      stops.push({
        lat: e.lat,
        lng: e.lng,
        name: e.name,
        type: 'eat',
        sub: `${e.category} · ${e.priceRange}`,
      })
    }
  })

  roteiro.stays.forEach((s) => {
    if (s.lat && s.lng) {
      stops.push({
        lat: s.lat,
        lng: s.lng,
        name: s.name,
        type: 'stay',
        sub: s.category + (s.priceFrom ? ` · R$${s.priceFrom}/noite` : ''),
      })
    }
  })

  const coords: [number, number][] = stops.map((s) => [s.lat, s.lng])
  const unmapped =
    roteiro.events.filter((ev) => !ev.lat || !ev.lng).length +
    roteiro.eats.filter((e) => !e.lat || !e.lng).length +
    roteiro.stays.filter((s) => !s.lat || !s.lng).length

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 truncate">{roteiro.name}</h3>
          <p className="text-xs text-gray-400">
            {stops.length} parada{stops.length !== 1 ? 's' : ''} no mapa
            {unmapped > 0 && ` · ${unmapped} sem coordenadas`}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 flex-shrink-0 ml-3"
        >✕</button>
      </div>

      {/* Legenda */}
      <div className="flex gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100 flex-shrink-0">
        {([
          { type: 'destination', color: '#FF6B35', icon: '📍', label: 'Destino' },
          { type: 'event',       color: '#9333ea', icon: '🎭', label: 'Evento' },
          { type: 'eat',         color: '#f97316', icon: '🍽️', label: 'Comer' },
          { type: 'stay',        color: '#16a34a', icon: '🏡', label: 'Dormir' },
        ] as const).map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 flex-shrink-0">
            <div
              className="w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center"
              style={{ background: item.color, fontSize: 9 }}
            >
              {item.icon}
            </div>
            <span className="text-xs text-gray-500">{item.label}</span>
          </div>
        ))}
        {coords.length > 1 && (
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
            <div className="w-8 h-0.5 border-t-2 border-dashed border-orange-400" />
            <span className="text-xs text-gray-400">Rota</span>
          </div>
        )}
      </div>

      {/* Mapa */}
      <div className="flex-1 min-h-0">
        <MapContainer
          center={coords[0] ?? [-14.235, -51.925]}
          zoom={10}
          className="w-full h-full"
          style={{ zIndex: 0 }}
        >
          <TileLayer
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds coords={coords} />

          {coords.length > 1 && (
            <Polyline
              positions={coords}
              pathOptions={{ color: '#FF6B35', weight: 2.5, dashArray: '7 5', opacity: 0.65 }}
            />
          )}

          {stops.map((stop, i) => (
            <Marker
              key={i}
              position={[stop.lat, stop.lng]}
              icon={ICON[stop.type]()}
              zIndexOffset={stop.type === 'destination' ? 1000 : 0}
            >
              <Popup>
                <div style={{ fontSize: 13, lineHeight: 1.6, minWidth: 140 }}>
                  <span style={{ fontSize: 10, color: '#9ca3af', display: 'block', marginBottom: 1 }}>
                    {TYPE_LABEL[stop.type]}
                  </span>
                  <strong style={{ display: 'block', marginBottom: 2 }}>{stop.name}</strong>
                  <span style={{ color: '#6b7280', fontSize: 12 }}>{stop.sub}</span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
