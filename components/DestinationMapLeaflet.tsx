'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet'
import type { PlaceWithDistance } from '@/types'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png'
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png'
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'

function getOrangeIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:#FF6B35;
      width:28px;height:28px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  })
}

function getOriginIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:#2563eb;
      width:34px;height:34px;
      border-radius:50%;
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
      font-size:16px;line-height:1;
    ">🏠</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}

function MapClickHandler({ onOriginChange }: { onOriginChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onOriginChange(e.latlng.lat, e.latlng.lng) },
  })
  return null
}

function FlyToCenter({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 1.0 })
  }, [lat, lng])
  return null
}

interface Props {
  places: PlaceWithDistance[]
  centerLat?: number
  centerLng?: number
  onOriginChange?: (lat: number, lng: number) => void
  originLat?: number
  originLng?: number
  radiusKm?: number
  mapClassName?: string
}

export default function DestinationMapLeaflet({ places, centerLat, centerLng, onOriginChange, originLat, originLng, radiusKm, mapClassName }: Props) {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })
  }, [])

  const hasCenter = !!(centerLat && centerLng)
  const initialCenter: [number, number] = hasCenter
    ? [centerLat!, centerLng!]
    : places.length > 0
    ? [places[0].lat, places[0].lng]
    : [-14.235, -51.925]

  const initialZoom = hasCenter ? 9 : places.length > 0 ? 7 : 4

  const cls = mapClassName ?? 'w-full h-72 rounded-xl overflow-hidden border border-gray-200'

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      className={cls}
      style={{ zIndex: 0, cursor: onOriginChange ? 'crosshair' : 'grab' }}
    >
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {hasCenter && <FlyToCenter lat={centerLat!} lng={centerLng!} zoom={9} />}
      {onOriginChange && <MapClickHandler onOriginChange={onOriginChange} />}
      {originLat !== undefined && originLng !== undefined && radiusKm && (
        <Circle
          center={[originLat, originLng]}
          radius={radiusKm * 1000}
          pathOptions={{
            color: '#FF6B35',
            fillColor: '#FF6B35',
            fillOpacity: 0.07,
            weight: 1.5,
            dashArray: '6 4',
          }}
        />
      )}
      {originLat !== undefined && originLng !== undefined && (
        <Marker position={[originLat, originLng]} icon={getOriginIcon()}>
          <Popup><span className="text-sm font-semibold">📍 Seu ponto de partida</span></Popup>
        </Marker>
      )}
      {places.map((place) => {
        if (!place.lat || !place.lng) return null
        const href = place.source === 'event'
          ? `/evento/${place.id}`
          : place.source === 'external' && place.googlePlaceId
          ? `/destino/google/${place.googlePlaceId}`
          : `/destino/${place.id}`
        return (
          <Marker key={place.id} position={[place.lat, place.lng]} icon={getOrangeIcon()}>
            <Popup>
              <div style={{ fontSize: 13, lineHeight: 1.5, minWidth: 140 }}>
                <strong style={{ display: 'block', marginBottom: 4 }}>{place.name}</strong>
                {place.subtitle && (
                  <span style={{ display: 'block', color: '#374151', marginBottom: 4 }}>{place.subtitle}</span>
                )}
                {!place.subtitle && place.durationMin != null && (
                  <span style={{ display: 'block', color: '#374151', marginBottom: 4 }}>
                    🚗 (~{place.durationMin >= 60
                      ? `${Math.floor(place.durationMin / 60)}h${place.durationMin % 60 > 0 ? `${place.durationMin % 60}min` : ''}`
                      : `${place.durationMin} min`})
                  </span>
                )}
                <a href={href} style={{ display: 'inline-block', color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}>
                  Ver detalhes →
                </a>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
